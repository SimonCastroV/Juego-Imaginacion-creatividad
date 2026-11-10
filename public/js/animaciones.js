// Animaciones a pantalla completa estilo "juego de impostor": revelar el rol y expulsar al impostor.
import { avatar } from './personajes.js';
import { esc, jugador } from './ui.js';
import { sinMovimiento } from './ambiente.js';

function abrirCapa(clase, etiqueta, html, duracion) {
  document.querySelector('.efecto')?.remove();
  const capa = document.createElement('div');
  capa.className = `efecto ${clase}`;
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-modal', 'true');
  capa.setAttribute('aria-label', etiqueta);
  capa.innerHTML = `<div class="estrellas" aria-hidden="true"></div>${html}<button type="button" class="saltar">Saltar</button>`;
  document.body.append(capa);
  const saltar = capa.querySelector('.saltar');
  saltar.focus({ preventScroll: true });
  return new Promise(listo => {
    let cerrado = false;
    const cerrar = () => {
      if (cerrado) return;
      cerrado = true;
      capa.classList.add('saliendo');
      setTimeout(() => { capa.remove(); listo(); }, 400);
    };
    saltar.onclick = cerrar;
    setTimeout(cerrar, sinMovimiento() ? Math.min(duracion, 3000) : duracion);
  });
}

export function mostrarRol(v) {
  const impostor = v.yo.rol === 'impostor';
  const grupo = impostor ? [jugador(v, v.yo.pid)] : v.jugadores;
  return abrirCapa(`efecto-rol ${impostor ? 'impostor' : 'humano'}`, 'Tu rol en esta ronda', `
    <div class="rol-anim">
      <p class="shh">Ronda ${v.ronda + 1} · Shhh…</p>
      <h2 class="rol-titulo">${impostor ? 'Impostor' : 'Sin IA'}</h2>
      <p class="rol-sub">${impostor ? 'Te toca usar IA. Que no te descubran.' : 'Hay <strong>1 impostor</strong> usando IA entre ustedes.'}</p>
      <div class="fila-personajes">${grupo.map((j, i) => `<figure style="--i:${i}" class="${j.pid === v.yo.pid ? 'yo' : ''}">${avatar(j.personaje)}<figcaption>${esc(j.nombre)}</figcaption></figure>`).join('')}</div>
    </div>`, 5600);
}

export function mostrarExpulsion(v) {
  const r = v.resultado;
  const imp = jugador(v, r.impostor);
  const texto = r.aciertos === 0
    ? `${imp.nombre} era el impostor… y nadie lo descubrió.`
    : `${imp.nombre} era el impostor. ${r.aciertos} de ${r.votantes} lo descubrieron.`;
  const promesa = abrirCapa('efecto-expulsion', 'Revelación del impostor', `
    <div class="expulsion ${r.aciertos === 0 ? 'escapo' : ''}">
      <div class="flotando">${avatar(imp.personaje)}</div>
      <p class="texto-expulsion" aria-live="polite"></p>
    </div>`, 6500);
  const linea = document.querySelector('.texto-expulsion');
  if (sinMovimiento()) linea.textContent = texto;
  else {
    let i = 0;
    setTimeout(function escribir() {
      if (!linea.isConnected) return;
      linea.textContent = texto.slice(0, ++i);
      if (i < texto.length) setTimeout(escribir, 45);
    }, 1400);
  }
  return promesa;
}
