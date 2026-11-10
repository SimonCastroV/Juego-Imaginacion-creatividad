// El servidor ordena los turnos, protege las tarjetas y resuelve la votación.
import { randomInt, randomUUID } from 'node:crypto';
import { CASOS } from './casos.js';
import * as db from './store.js';

export const REGLAS = {
  rondas: CASOS.length,
  minJugadores: 3,
  maxJugadores: 12,
  segRol: 7,
  segPista: 20,
  segVoto: 45,
  segAdivinar: 25,
};

export const PUNTOS = { acierto: 2, impostorEscapa: 3, impostorAdivina: 2 };

const PERSONAJES = ['petro', 'uribe', 'cepeda', 'espriella', 'vicky', 'claudia', 'fajardo', 'paloma'];
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

class ErrorJuego extends Error {
  constructor(mensaje, estado = 400) { super(mensaje); this.estado = estado; }
}
const azar = lista => lista[randomInt(lista.length)];

function mezclar(lista) {
  const orden = [...lista];
  for (let i = orden.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  return orden;
}

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

  const sala = await leerSala(codigo);
  const yo = autenticar(sala, secreto);

  if (accion === 'estado') {
    if (!pendiente(sala, Date.now())) return vista(codigo, sala, yo);
    const actual = await conBloqueo(codigo, async () => {
      const actual = await leerSala(codigo);
      const jugador = autenticar(actual, secreto);
      await avanzar(codigo, actual);
      return vista(codigo, actual, jugador);
    }, 1);
    return actual ?? vista(codigo, sala, yo);
  }

  return conBloqueo(codigo, async () => {
    const actual = await leerSala(codigo);
    const jugador = autenticar(actual, secreto);
    await avanzar(codigo, actual);
    const { meta } = actual;
    const fase = esperada => {
      if (meta.fase !== esperada || (esperada !== 'lobby' && datos.ronda !== meta.ronda)) {
        throw new ErrorJuego('La ronda avanzó. Espera a que se actualice tu pantalla.', 409);
      }
    };

    switch (accion) {
      case 'personaje':
        fase('lobby');
        if (!PERSONAJES.includes(datos.personaje)) throw new ErrorJuego('Personaje desconocido.');
        jugador.personaje = datos.personaje;
        await db.guardarJugador(codigo, jugador);
        break;
      case 'listo':
        fase('lobby');
        jugador.listo = Boolean(datos.listo);
        await db.guardarJugador(codigo, jugador);
        break;
      case 'salir':
        if (meta.fase === 'lobby') await db.borrarJugador(codigo, secreto);
        return { salio: true };
      case 'pista':
        fase('pistas');
        if (meta.orden[meta.turno] !== secreto || datos.turno !== meta.turno) {
          throw new ErrorJuego('Este turno ya no te corresponde.', 409);
        }
        pasarTurno(meta, Date.now());
        await db.guardarMeta(codigo, meta);
        break;
      case 'votar': {
        fase('votacion');
        const destino = actual.jugadores.find(j => j.pid === datos.pid);
        if (!destino || destino === jugador) throw new ErrorJuego('Elige a otro jugador.');
        if (jugador.voto?.ronda === meta.ronda) throw new ErrorJuego('Ya votaste.');
        jugador.voto = { ronda: meta.ronda, destino: destino.secreto };
        await db.guardarJugador(codigo, jugador);
        break;
      }
      case 'adivinar':
        fase('adivinar');
        if (secreto !== meta.impostor) throw new ErrorJuego('Solo el impostor puede responder.', 403);
        if (!Number.isInteger(datos.opcion) || !meta.opciones[datos.opcion]) {
          throw new ErrorJuego('Elige un caso de la lista.');
        }
        meta.resultado.adivino = meta.opciones[datos.opcion] === CASOS[meta.ronda].titulo;
        revelar(meta);
        await db.guardarMeta(codigo, meta);
        break;
      case 'siguiente':
        fase('revelacion');
        if (meta.anfitrion !== secreto) throw new ErrorJuego('Solo quien creó la sala puede continuar.', 403);
        if (meta.ronda + 1 >= REGLAS.rondas) meta.fase = 'fin';
        else iniciarRonda(actual, meta.ronda + 1, Date.now());
        await db.guardarMeta(codigo, meta);
        break;
      default:
        throw new ErrorJuego('Acción desconocida.');
    }
    await avanzar(codigo, actual);
    return vista(codigo, actual, jugador);
  });
}

async function leerSala(codigo) {
  const sala = await db.leerSala(codigo);
  if (!sala) throw new ErrorJuego('Esa sala no existe o ya terminó.', 404);
  return sala;
}

function autenticar(sala, secreto) {
  const jugador = sala.jugadores.find(j => j.secreto === secreto);
  if (!jugador) throw new ErrorJuego('Ya no estás en esta sala.', 403);
  return jugador;
}

async function crear(nombre) {
  const jugador = jugadorNuevo(nombre);
  for (let intento = 0; intento < 20; intento++) {
    const codigo = Array.from({ length: 4 }, () => azar(LETRAS)).join('');
    if (await db.crearSala(codigo, { fase: 'lobby', ronda: 0, anfitrion: jugador.secreto, puntos: {} })) {
      await db.guardarJugador(codigo, jugador);
      return { codigo, secreto: jugador.secreto };
    }
  }
  throw new ErrorJuego('No se pudo crear la sala. Intenta de nuevo.', 503);
}

async function unirse(codigo, nombre) {
  if (codigo.length !== 4) throw new ErrorJuego('El código tiene 4 caracteres.');
  return conBloqueo(codigo, async () => {
    const sala = await leerSala(codigo);
    if (sala.meta.fase !== 'lobby') throw new ErrorJuego('Esa partida ya empezó.', 409);
    if (sala.jugadores.length >= REGLAS.maxJugadores) throw new ErrorJuego('La sala está llena.', 409);
    if (sala.jugadores.some(j => j.nombre.toLowerCase() === nombre.toLowerCase())) {
      throw new ErrorJuego('Ya hay alguien con ese nombre en la sala.', 409);
    }
    const jugador = jugadorNuevo(nombre);
    await db.guardarJugador(codigo, jugador);
    return { codigo, secreto: jugador.secreto };
  });
}

function iniciarRonda({ meta, jugadores }, ronda, ahora) {
  const historial = meta.historial ?? [];
  const ya = historial.length === jugadores.length ? [] : historial;
  const candidatos = jugadores.filter(j => !ya.includes(j.secreto) && j.secreto !== meta.impostor);
  const impostor = azar(candidatos).secreto;
  Object.assign(meta, {
    ronda, impostor, historial: [...ya, impostor], fase: 'rol',
    hasta: ahora + REGLAS.segRol * 1000,
    orden: mezclar(jugadores.map(j => j.secreto)), turno: 0,
    resultado: null, opciones: null,
  });
}

function pasarTurno(meta, ahora) {
  meta.turno++;
  if (meta.turno === meta.orden.length) {
    Object.assign(meta, { fase: 'votacion', hasta: ahora + REGLAS.segVoto * 1000 });
  } else {
    meta.hasta = ahora + REGLAS.segPista * 1000;
  }
}

function cerrarVotacion({ meta, jugadores }, ahora) {
  const votos = Object.fromEntries(jugadores.map(j => [j.secreto, 0]));
  const ganancias = {};
  let aciertos = 0;
  let emitidos = 0;
  for (const j of jugadores) {
    if (j.voto?.ronda !== meta.ronda) continue;
    votos[j.voto.destino]++;
    emitidos++;
    if (j.voto.destino === meta.impostor) {
      aciertos++;
      ganancias[j.secreto] = PUNTOS.acierto;
    }
  }
  const descubierto = aciertos > 0 && jugadores.every(j => j.secreto === meta.impostor || aciertos > votos[j.secreto]);
  meta.resultado = { aciertos, emitidos, votos, ganancias, descubierto, adivino: null, bono: 0 };

  if (descubierto) {
    const caso = CASOS[meta.ronda];
    meta.opciones = mezclar([caso.titulo, ...caso.alternativas]);
    Object.assign(meta, { fase: 'adivinar', hasta: ahora + REGLAS.segAdivinar * 1000 });
  } else {
    revelar(meta);
  }
}

function revelar(meta) {
  const r = meta.resultado;
  if (r.adivino) r.bono = PUNTOS.impostorAdivina;
  else if (!r.descubierto && r.emitidos) r.bono = PUNTOS.impostorEscapa;
  if (r.bono) r.ganancias[meta.impostor] = r.bono;
  for (const [secreto, puntos] of Object.entries(r.ganancias)) {
    meta.puntos[secreto] = (meta.puntos[secreto] ?? 0) + puntos;
  }
  Object.assign(meta, { fase: 'revelacion', hasta: null });
}

function pendiente({ meta, jugadores }, ahora) {
  if (meta.fase === 'lobby') {
    return (jugadores.length > 0 && !jugadores.some(j => j.secreto === meta.anfitrion))
      || (jugadores.length >= REGLAS.minJugadores && jugadores.every(j => j.listo));
  }
  if (meta.fase === 'votacion' && jugadores.every(j => j.voto?.ronda === meta.ronda)) return true;
  return meta.hasta != null && ahora >= meta.hasta;
}

async function avanzar(codigo, sala) {
  const { meta, jugadores } = sala;
  const ahora = Date.now();
  if (!pendiente(sala, ahora)) return;
  if (meta.fase === 'lobby') {
    if (!jugadores.some(j => j.secreto === meta.anfitrion)) meta.anfitrion = jugadores[0].secreto;
    if (jugadores.length >= REGLAS.minJugadores && jugadores.every(j => j.listo)) iniciarRonda(sala, 0, ahora);
  } else if (meta.fase === 'rol') {
    Object.assign(meta, { fase: 'pistas', hasta: ahora + REGLAS.segPista * 1000 });
  } else if (meta.fase === 'pistas') {
    pasarTurno(meta, ahora);
  } else if (meta.fase === 'votacion') {
    cerrarVotacion(sala, ahora);
  } else if (meta.fase === 'adivinar') {
    revelar(meta);
  }
  await db.guardarMeta(codigo, meta);
}

async function conBloqueo(codigo, operar, intentos = 20) {
  const token = randomUUID();
  for (let i = 0; i < intentos; i++) {
    if (await db.bloquear(codigo, token)) {
      try {
        return await operar();
      } finally {
        await db.liberar(codigo, token);
      }
    }
    if (i + 1 < intentos) await new Promise(listo => setTimeout(listo, 100));
  }
  if (intentos > 1) throw new ErrorJuego('La sala está ocupada, intenta de nuevo.', 503);
  return null;
}

function vista(codigo, { meta, jugadores }, yo) {
  const pid = s => jugadores.find(j => j.secreto === s)?.pid ?? null;
  const { fase, ronda } = meta;
  const { titulo, tarjeta, pista, contexto, pregunta, fuente, url } = CASOS[ronda];
  const impostor = meta.impostor === yo.secreto;
  const v = {
    codigo, fase, ronda, rondas: REGLAS.rondas, minJugadores: REGLAS.minJugadores,
    ahora: Date.now(), hasta: meta.hasta ?? null,
    yo: {
      pid: yo.pid,
      anfitrion: meta.anfitrion === yo.secreto,
      rol: fase === 'lobby' ? null : impostor ? 'impostor' : 'conoce',
      listo: yo.listo,
      personaje: yo.personaje,
      voto: yo.voto?.ronda === ronda ? pid(yo.voto.destino) : null,
    },
    jugadores: jugadores.map(j => ({
      pid: j.pid, nombre: j.nombre, personaje: j.personaje, listo: j.listo,
      anfitrion: meta.anfitrion === j.secreto,
      puntos: meta.puntos[j.secreto] ?? 0,
    })),
  };
  if (fase === 'pistas') {
    v.tarjeta = impostor ? { texto: pista } : { titulo, texto: tarjeta };
    v.turnos = { orden: meta.orden.map(pid), actual: meta.turno };
  }
  if (fase === 'votacion') {
    v.votos = { hechos: jugadores.filter(j => j.voto?.ronda === ronda).length, total: jugadores.length };
  }
  if (fase === 'adivinar') {
    v.impostor = pid(meta.impostor);
    if (impostor) v.opciones = meta.opciones;
  }
  if (fase === 'revelacion') {
    const r = meta.resultado;
    v.caso = { titulo, contexto, pregunta, fuente, url };
    v.resultado = {
      impostor: pid(meta.impostor), aciertos: r.aciertos, emitidos: r.emitidos,
      descubierto: r.descubierto, adivino: r.adivino, bono: r.bono,
      ganancias: Object.fromEntries(Object.entries(r.ganancias).map(([s, p]) => [pid(s), p])),
      votos: Object.fromEntries(Object.entries(r.votos).map(([s, n]) => [pid(s), n])),
    };
  }
  return v;
}
