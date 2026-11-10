// Guarda cada sala como un hash temporal: el campo "meta" (estado de la partida, solo lo escribe
// quien tiene el bloqueo) y un campo "j:<secreto>" por jugador.
// En Vercel usa Upstash Redis; en local (npm run dev) usa la memoria del proceso.
const TTL_SEG = 60 * 60 * 3;
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const clave = codigo => `sala:casos:${codigo}`;
const claveBloqueo = codigo => `bloqueo:${clave(codigo)}`;
const DURACION_BLOQUEO_MS = 8000;

let cliente;
const redis = () => (cliente ??= import('@upstash/redis').then(({ Redis }) => new Redis({ url, token, automaticDeserialization: false })));

const conRedis = {
  async crear(codigo, meta) {
    const r = await redis();
    const creada = await r.hsetnx(clave(codigo), 'meta', meta);
    if (creada) await r.expire(clave(codigo), TTL_SEG);
    return creada === 1;
  },
  async leer(codigo) {
    // Sin deserialización automática, Upstash devuelve HGETALL como lista plana [campo, valor, campo, valor…].
    const crudo = await (await redis()).hgetall(clave(codigo));
    if (!Array.isArray(crudo)) return crudo;
    const campos = {};
    for (let i = 0; i < crudo.length; i += 2) campos[crudo[i]] = crudo[i + 1];
    return crudo.length ? campos : null;
  },
  async escribir(codigo, campos) {
    const p = (await redis()).pipeline();
    p.hset(clave(codigo), campos);
    p.expire(clave(codigo), TTL_SEG);
    await p.exec();
  },
  async borrar(codigo, campo) { await (await redis()).hdel(clave(codigo), campo); },
  async bloquear(codigo, dueño) {
    return (await (await redis()).set(claveBloqueo(codigo), dueño, { nx: true, px: DURACION_BLOQUEO_MS })) === 'OK';
  },
  async liberar(codigo, dueño) {
    await (await redis()).eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
      [claveBloqueo(codigo)], [dueño],
    );
  },
};

const salas = new Map();
const bloqueos = new Map();
function hash(codigo) {
  const sala = salas.get(codigo);
  if (sala && sala.vence < Date.now()) salas.delete(codigo);
  return salas.get(codigo);
}
const enMemoria = {
  async crear(codigo, meta) {
    if (hash(codigo)) return false;
    salas.set(codigo, { campos: { meta }, vence: Date.now() + TTL_SEG * 1000 });
    return true;
  },
  async leer(codigo) { return hash(codigo) ? { ...hash(codigo).campos } : null; },
  async escribir(codigo, campos) {
    const sala = hash(codigo);
    if (!sala) return;
    Object.assign(sala.campos, campos);
    sala.vence = Date.now() + TTL_SEG * 1000;
  },
  async borrar(codigo, campo) { delete hash(codigo)?.campos[campo]; },
  async bloquear(codigo, dueño) {
    if (bloqueos.get(codigo)?.vence > Date.now()) return false;
    bloqueos.set(codigo, { dueño, vence: Date.now() + DURACION_BLOQUEO_MS });
    return true;
  },
  async liberar(codigo, dueño) {
    if (bloqueos.get(codigo)?.dueño === dueño) bloqueos.delete(codigo);
  },
};

const db = url && token ? conRedis : enMemoria;
export const configurado = db === conRedis || !process.env.VERCEL;

export const crearSala = (codigo, meta) => db.crear(codigo, JSON.stringify(meta));
export const guardarMeta = (codigo, meta) => db.escribir(codigo, { meta: JSON.stringify(meta) });
export const guardarJugador = (codigo, { secreto, ...datos }) => db.escribir(codigo, { [`j:${secreto}`]: JSON.stringify(datos) });
export const borrarJugador = (codigo, secreto) => db.borrar(codigo, `j:${secreto}`);
export const bloquear = (codigo, dueño) => db.bloquear(codigo, dueño);
export const liberar = (codigo, dueño) => db.liberar(codigo, dueño);

export async function leerSala(codigo) {
  const crudo = await db.leer(codigo);
  if (!crudo?.meta) return null;
  const jugadores = Object.entries(crudo)
    .filter(([campo]) => campo.startsWith('j:'))
    .map(([campo, valor]) => ({ ...JSON.parse(valor), secreto: campo.slice(2) }))
    .sort((a, b) => a.entro - b.entro);
  return { meta: JSON.parse(crudo.meta), jugadores };
}
