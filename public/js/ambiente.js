// Fondo decorativo (objetos flotando) y botón para pausar el movimiento. No afecta el juego.
const preferencia = matchMedia('(prefers-reduced-motion: reduce)');
let pausado = preferencia.matches;

const cubo = '<div class="cube">' + ['front', 'back', 'left', 'right', 'top', 'bottom'].map(lado => `<i class="${lado}"></i>`).join('') + '</div>';
const fondo = document.createElement('div');
fondo.className = 'environment';
fondo.setAttribute('aria-hidden', 'true');
fondo.innerHTML = `<div class="ambient-light"></div><div class="floor-grid"></div><div class="ambient-object ambient-one">${cubo}</div><div class="ambient-object ambient-two"><div class="sphere"></div></div><div class="ambient-object ambient-three"><div class="sculpture-ring"></div></div>`;
document.body.prepend(fondo);

const boton = document.createElement('button');
boton.className = 'quiet motion-toggle';
boton.type = 'button';
document.querySelector('header > div').prepend(boton);

function actualizar() {
  document.body.classList.toggle('motion-paused', pausado);
  boton.textContent = pausado ? 'Activar movimiento' : 'Pausar movimiento';
  boton.setAttribute('aria-pressed', String(pausado));
}
boton.onclick = () => { pausado = !pausado; actualizar(); };
preferencia.addEventListener('change', e => { pausado = e.matches; actualizar(); });
actualizar();

export const sinMovimiento = () => pausado || preferencia.matches;

// Hace que los elementos de una pantalla nueva entren escalonados.
export function animarEntrada(raiz, vista) {
  document.body.classList.toggle('in-game', !raiz.querySelector('.hero'));
  const stage = raiz.querySelector('.stage');
  if (stage && vista.fase !== 'lobby') {
    const progreso = document.createElement('ol');
    progreso.className = 'rondas';
    progreso.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < vista.rondas; i++) {
      const segmento = document.createElement('li');
      segmento.classList.toggle('completa', i < vista.ronda || vista.fase === 'fin');
      segmento.classList.toggle('actual', i === vista.ronda && vista.fase !== 'fin');
      progreso.append(segmento);
    }
    stage.firstElementChild.after(progreso);
  }
  raiz.querySelectorAll('.stage > *, .hero > div:first-child > *').forEach((el, i) => {
    el.style.setProperty('--entry-delay', `${Math.min(i * 45, 270)}ms`);
    el.classList.add('scene-entry');
  });
}
