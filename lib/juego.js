// Reglas, fases y puntos. El servidor decide el impostor y cuenta los puntos;
// cada celular solo recibe lo que su jugador puede ver.
import { randomInt, randomUUID } from 'node:crypto';
import { CASOS } from './palabras.js';
import * as db from './store.js';

export const REGLAS = { rondas: CASOS.length, minJugadores: 3, maxJugadores: 12, segRol: 7, segEscritura: 180, segVoto: 120 };

// ── Sistema de puntos (igual que la versión anterior) ──────────────────────
export const PUNTOS = {
  acierto: 2,               // cada jugador sin IA que vota por la definición del impostor
  impostorSinDescubrir: 3,  // el impostor, si nadie lo descubre
  impostorEnganaMayoria: 2, // el impostor, si más de la mitad vota mal
};

export function puntuar(meta, jugadores) {
  const votantes = jugadores.filter(j => j.secreto !== meta.impostor);
  const votos = meta.entradas.map(() => 0);
  const ganancias = {};
  let aciertos = 0;
  for (const j of votantes) {
    if (j.voto?.ronda !== meta.ronda) continue;
    votos[j.voto.n]++;
    if (meta.entradas[j.voto.n]?.autor === meta.impostor) {
      aciertos++;
      ganancias[j.secreto] = PUNTOS.acierto;
    }
  }
  let bono = 0;
  if (aciertos === 0) bono += PUNTOS.impostorSinDescubrir;
  if (votantes.length - aciertos > votantes.length / 2) bono += PUNTOS.impostorEnganaMayoria;
  if (bono) ganancias[meta.impostor] = bono;
  return { aciertos, votantes: votantes.length, bono, ganancias, votos };
}
// ───────────────────────────────────────────────────────────────────────────

const PERSONAJES = ['petro', 'uribe', 'cepeda', 'espriella', 'vicky', 'claudia', 'fajardo', 'paloma'];
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

class ErrorJuego extends Error {
  constructor(mensaje, estado = 400) { super(mensaje); this.estado = estado; }
}
const azar = lista => lista[randomInt(lista.length)];
const mezclar = lista => {
  const r = [...lista];
  for (let i = r.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};
const codigoNuevo = () => Array.from({ length: 4 }, () => azar(LETRAS)).join('');
const limpiarCodigo = codigo => String(codigo ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
function limpiarNombre(nombre) {
  const limpio = String(nombre ?? '').replace(/\s+/g, ' ').trim().slice(0, 18);
  if (!limpio) throw new ErrorJuego('Escribe tu nombre.');
  return limpio;
}
const jugadorNuevo = nombre => ({
  secreto: randomUUID(), pid: randomUUID().slice(0, 8), nombre, personaje: azar(PERSONAJES), listo: false, entro: Date.now(),
});

export async function manejar(cuerpo) {
  try {
    return { estado: 200, datos: await ejecutar(cuerpo ?? {}) };
  } catch (error) {
    if (error instanceof ErrorJuego) return { estado: error.estado, datos: { error: error.message } };
    console.error(error);
    return { estado: 500, datos: { error: 'Error del servidor. Intenta de nuevo.' } };
  }
}

async function ejecutar({ accion, codigo, secreto, ...datos }) {
  if (!db.configurado) throw new ErrorJuego('Falta conectar Upstash Redis en Vercel (ver README).', 500);
  if (accion === 'crear') return crear(limpiarNombre(datos.nombre));
  codigo = limpiarCodigo(codigo);
  if (accion === 'unirse') return unirse(codigo, limpiarNombre(datos.nombre));

  let sala = await db.leerSala(codigo);
  if (!sala) throw new ErrorJuego('Esa sala no existe o ya terminó.', 404);
  if (!sala.jugadores.some(j => j.secreto === secreto)) throw new ErrorJuego('Ya no estás en esta sala.', 403);
  sala = await avanzar(codigo, sala); // por si una fase ya venció y nadie la ha avanzado
  const yo = sala.jugadores.find(j => j.secreto === secreto);
  const { meta } = sala;
  const fase = (...validas) => { if (!validas.includes(meta.fase)) throw new ErrorJuego('Esa acción ya no está disponible.', 409); };

  switch (accion) {
    case 'estado': break;
    case 'personaje':
      fase('lobby');
      if (!PERSONAJES.includes(datos.personaje)) throw new ErrorJuego('Personaje desconocido.');
      yo.personaje = datos.personaje;
      await db.guardarJugador(codigo, yo);
      break;
    case 'listo':
      fase('lobby');
      yo.listo = Boolean(datos.listo);
      await db.guardarJugador(codigo, yo);
      break;
    case 'salir':
      if (meta.fase === 'lobby') await db.borrarJugador(codigo, secreto);
      return { salio: true };
    case 'definir': {
      fase('escritura');
      const texto = String(datos.texto ?? '').trim().slice(0, 500);
      if (texto.length < 3) throw new ErrorJuego('Escribe una definición un poco más larga.');
      if (yo.def?.ronda === meta.ronda) throw new ErrorJuego('Ya enviaste tu definición.');
      yo.def = { ronda: meta.ronda, texto };
      await db.guardarJugador(codigo, yo);
      break;
    }
    case 'votar': {
      fase('votacion');
      const n = Number(datos.n);
      if (secreto === meta.impostor) throw new ErrorJuego('El impostor no vota.');
      if (!Number.isInteger(n) || !meta.entradas[n]) throw new ErrorJuego('Elige una definición.');
      if (meta.entradas[n].autor === secreto) throw new ErrorJuego('No puedes votar por tu propia definición.');
      if (yo.voto?.ronda === meta.ronda) throw new ErrorJuego('Ya votaste.');
      yo.voto = { ronda: meta.ronda, n };
      await db.guardarJugador(codigo, yo);
      break;
    }
    case 'siguiente':
      fase('revelacion');
      if (meta.anfitrion !== secreto) throw new ErrorJuego('Solo quien creó la sala puede continuar.', 403);
      sala = (await conBloqueo(codigo, actual => {
        if (actual.meta.fase !== 'revelacion' || actual.meta.ronda !== meta.ronda) return false;
        if (actual.meta.ronda + 1 >= REGLAS.rondas) actual.meta.fase = 'fin';
        else iniciarRonda(actual, actual.meta.ronda + 1);
        return true;
      })) ?? sala;
      break;
    default:
      throw new ErrorJuego('Acción desconocida.');
  }
  return vista(codigo, await avanzar(codigo, sala), secreto);
}

async function crear(nombre) {
  const jugador = jugadorNuevo(nombre);
  for (let intento = 0; intento < 20; intento++) {
    const codigo = codigoNuevo();
    if (await db.crearSala(codigo, { fase: 'lobby', ronda: 0, anfitrion: jugador.secreto, puntos: {} })) {
      await db.guardarJugador(codigo, jugador);
      return { codigo, secreto: jugador.secreto };
    }
  }
  throw new ErrorJuego('No se pudo crear la sala. Intenta de nuevo.', 503);
}

async function unirse(codigo, nombre) {
  if (codigo.length !== 4) throw new ErrorJuego('El código tiene 4 caracteres.');
  const sala = await db.leerSala(codigo);
  if (!sala) throw new ErrorJuego('No encontramos esa sala. Revisa el código.', 404);
  if (sala.meta.fase !== 'lobby') throw new ErrorJuego('Esa partida ya empezó.', 409);
  if (sala.jugadores.length >= REGLAS.maxJugadores) throw new ErrorJuego('La sala está llena.', 409);
  if (sala.jugadores.some(j => j.nombre.toLowerCase() === nombre.toLowerCase())) throw new ErrorJuego('Ya hay alguien con ese nombre en la sala.', 409);
  const jugador = jugadorNuevo(nombre);
  await db.guardarJugador(codigo, jugador);
  return { codigo, secreto: jugador.secreto };
}

// ── Fases: lobby → rol → escritura → votacion → revelacion → (siguiente ronda | fin) ──
function iniciarRonda({ meta, jugadores }, ronda) {
  // Rota el impostor: nadie repite hasta que todos hayan pasado, y nunca dos rondas seguidas.
  if (jugadores.every(j => meta.historial?.includes(j.secreto))) meta.historial = [];
  const ya = new Set(meta.historial ?? []);
  let candidatos = jugadores.filter(j => !ya.has(j.secreto) && j.secreto !== meta.impostor);
  if (!candidatos.length) candidatos = jugadores.filter(j => !ya.has(j.secreto));
  meta.impostor = azar(candidatos).secreto;
  meta.historial = [...(meta.historial ?? []), meta.impostor];
  Object.assign(meta, { ronda, fase: 'rol', hasta: Date.now() + REGLAS.segRol * 1000, entradas: null, resultado: null });
}

const votantes = ({ meta, jugadores }) => jugadores.filter(j => j.secreto !== meta.impostor);

function pendiente(sala, ahora) {
  const { meta, jugadores } = sala;
  if (jugadores.length && !jugadores.some(j => j.secreto === meta.anfitrion)) return true;
  switch (meta.fase) {
    case 'lobby': return jugadores.length >= REGLAS.minJugadores && jugadores.every(j => j.listo);
    case 'rol': return ahora >= meta.hasta;
    case 'escritura': return ahora >= meta.hasta || jugadores.every(j => j.def?.ronda === meta.ronda);
    case 'votacion': return ahora >= meta.hasta || votantes(sala).every(j => j.voto?.ronda === meta.ronda);
    default: return false;
  }
}

function aplicar(sala, ahora) {
  const { meta, jugadores } = sala;
  if (!jugadores.some(j => j.secreto === meta.anfitrion)) {
    meta.anfitrion = jugadores[0].secreto;
    return;
  }
  switch (meta.fase) {
    case 'lobby':
      meta.puntos = Object.fromEntries(jugadores.map(j => [j.secreto, 0]));
      meta.historial = [];
      iniciarRonda(sala, 0);
      break;
    case 'rol':
      Object.assign(meta, { fase: 'escritura', hasta: ahora + REGLAS.segEscritura * 1000 });
      break;
    case 'escritura':
      meta.entradas = mezclar(jugadores.map(j => ({
        autor: j.secreto,
        texto: j.def?.ronda === meta.ronda ? j.def.texto : '— Sin respuesta —',
      })));
      Object.assign(meta, { fase: 'votacion', hasta: ahora + REGLAS.segVoto * 1000 });
      break;
    case 'votacion':
      meta.resultado = puntuar(meta, jugadores);
      for (const [secreto, puntos] of Object.entries(meta.resultado.ganancias)) meta.puntos[secreto] = (meta.puntos[secreto] ?? 0) + puntos;
      Object.assign(meta, { fase: 'revelacion', hasta: null });
      break;
  }
}

// Solo un pedido a la vez cambia la fase; los demás siguen mostrando el estado actual.
async function avanzar(codigo, sala) {
  if (!pendiente(sala, Date.now())) return sala;
  return (await conBloqueo(codigo, actual => {
    let cambio = false;
    for (let paso = 0; paso < 6 && pendiente(actual, Date.now()); paso++) {
      aplicar(actual, Date.now());
      cambio = true;
    }
    return cambio;
  }, 1)) ?? sala;
}

async function conBloqueo(codigo, cambiar, intentos = 15) {
  for (let i = 0; i < intentos; i++) {
    if (await db.bloquear(codigo)) {
      try {
        const sala = await db.leerSala(codigo);
        if (sala && cambiar(sala)) await db.guardarMeta(codigo, sala.meta);
        return sala;
      } finally {
        await db.liberar(codigo);
      }
    }
    await new Promise(listo => setTimeout(listo, 150));
  }
  if (intentos > 1) throw new ErrorJuego('La sala está ocupada, intenta de nuevo.', 503);
  return null;
}

function vista(codigo, { meta, jugadores }, secreto) {
  const yo = jugadores.find(j => j.secreto === secreto);
  if (!yo) return { salio: true };
  const pid = s => jugadores.find(j => j.secreto === s)?.pid ?? null;
  const { fase, ronda } = meta;
  const caso = CASOS[ronda];
  const v = {
    codigo, fase, ronda, rondas: REGLAS.rondas, minJugadores: REGLAS.minJugadores,
    ahora: Date.now(), hasta: meta.hasta ?? null,
    yo: {
      pid: yo.pid,
      anfitrion: meta.anfitrion === secreto,
      rol: fase === 'lobby' ? null : meta.impostor === secreto ? 'impostor' : 'humano',
      listo: yo.listo,
      personaje: yo.personaje,
      envio: yo.def?.ronda === ronda,
      voto: yo.voto?.ronda === ronda ? yo.voto.n : null,
    },
    jugadores: jugadores.map(j => ({
      pid: j.pid, nombre: j.nombre, personaje: j.personaje, listo: j.listo,
      anfitrion: meta.anfitrion === j.secreto,
      puntos: meta.puntos?.[j.secreto] ?? 0,
      hecho: fase === 'escritura' ? j.def?.ronda === ronda : null,
    })),
  };
  // En la votación solo se envía cuántos han votado: una lista por nombre dejaría ver
  // quién no vota, es decir, quién es el impostor.
  if (fase === 'votacion') {
    const vot = jugadores.filter(j => j.secreto !== meta.impostor);
    v.votos = { hechos: vot.filter(j => j.voto?.ronda === ronda).length, total: vot.length };
  }
  if (['escritura', 'votacion', 'revelacion'].includes(fase)) v.caso = { palabra: caso.palabra, contexto: caso.contexto };
  if (fase === 'revelacion') v.caso.pregunta = caso.pregunta;
  if (meta.entradas && ['votacion', 'revelacion'].includes(fase)) {
    v.entradas = meta.entradas.map((e, n) => ({
      n, texto: e.texto, mia: e.autor === secreto,
      ...(fase === 'revelacion' && { autor: pid(e.autor), votos: meta.resultado.votos[n] }),
    }));
  }
  if (fase === 'revelacion') {
    const r = meta.resultado;
    v.resultado = {
      impostor: pid(meta.impostor),
      n: meta.entradas.findIndex(e => e.autor === meta.impostor),
      aciertos: r.aciertos, votantes: r.votantes, bono: r.bono,
      ganancias: Object.fromEntries(Object.entries(r.ganancias).map(([s, p]) => [pid(s), p])),
    };
  }
  return v;
}

