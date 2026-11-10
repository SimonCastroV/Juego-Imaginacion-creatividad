// Orquesta el juego: pregunta el estado cada 1.5 s y muestra la pantalla de la fase actual.
// Si la fase no cambió, solo actualiza las partes vivas (lista de jugadores, progreso) sin borrar lo que escribes.
import { llamar, sesion } from './api.js';
import { animarEntrada } from './ambiente.js';
import { mostrarRol, mostrarExpulsion } from './animaciones.js';
import { aviso, dos } from './ui.js';
import * as inicio from './pantallas/inicio.js';
import * as lobby from './pantallas/lobby.js';
import * as ronda from './pantallas/ronda.js';
import * as resultado from './pantallas/resultado.js';

const PANTALLAS = { lobby, rol: ronda, escritura: ronda, votacion: ronda, revelacion: resultado, fin: resultado };
const pantalla = document.querySelector('#screen');
let vista = null, clave = null, actual = null, desfase = 0, sondeo = null;

const ctx = {
  vista: () => vista,
  async accion(nombre, datos) {
    try {
      pintar(await llamar(nombre, datos));
      return true;
    } catch (error) {
      manejarError(error);
      return false;
    }
  },
  async entrar(nombre, datos) {
    try {
      sesion.set(await llamar(nombre, datos));
      await sondear();
      return true;
    } catch (error) {
      aviso(error.message);
      return false;
    }
  },
  async salir() {
    if (vista?.fase === 'lobby') await llamar('salir').catch(() => {});
    irAlInicio();
  },
};

function montar(modulo, datos) {
  actual = modulo;
  pantalla.innerHTML = '';
  modulo.montar(pantalla, datos, ctx);
  pantalla.className = 'enter';
  animarEntrada(pantalla);
  pantalla.querySelector('h1, h2')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function pintar(v) {
  if (v.salio) return irAlInicio();
  desfase = v.ahora - Date.now();
  vista = v;
  const nueva = `${v.fase}:${v.ronda}`;
  if (nueva !== clave) {
    clave = nueva;
    montar(PANTALLAS[v.fase], v);
    if (v.fase === 'rol') mostrarRol(v);
    if (v.fase === 'revelacion') mostrarExpulsion(v);
  } else {
    actual.actualizar?.(pantalla, v, ctx);
  }
  marcarRelojes();
}

function irAlInicio(mensaje) {
  clearTimeout(sondeo);
  sesion.borrar();
  vista = null;
  clave = 'inicio';
  document.querySelector('.efecto')?.remove();
  montar(inicio, { mensaje });
}

function manejarError(error) {
  if (error.estado === 404 || error.estado === 403) irAlInicio(error.message);
  else aviso(error.message);
}

async function sondear() {
  clearTimeout(sondeo);
  if (!sesion.get()) return;
  try {
    pintar(await llamar('estado'));
  } catch (error) {
    manejarError(error);
    if (!sesion.get()) return;
  }
  sondeo = setTimeout(sondear, document.hidden ? 4000 : 1500);
}

function marcarRelojes() {
  const quedan = vista?.hasta ? Math.max(0, Math.ceil((vista.hasta - Date.now() - desfase) / 1000)) : null;
  pantalla.querySelectorAll('[data-hasta]').forEach(el => {
    el.textContent = quedan === null ? '--:--' : `${dos(Math.floor(quedan / 60))}:${dos(quedan % 60)}`;
    el.classList.toggle('urgente', quedan !== null && quedan <= 15);
  });
}
setInterval(marcarRelojes, 250);

document.addEventListener('visibilitychange', () => { if (!document.hidden) sondear(); });
document.querySelector('#rules').onclick = () => document.querySelector('#help').showModal();
document.querySelector('#fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    aviso('El navegador no pudo activar la pantalla completa.');
  }
};

if (sesion.get()) sondear();
else irAlInicio();
