// Una ronda: rol → escritura de la definición → votación.
import { avatar, ficha } from '../personajes.js';
import { esc, dos, fase, reloj, jugador } from '../ui.js';

const chipRol = v => {
  const votando = v.fase === 'votacion';
  return v.yo.rol === 'impostor'
    ? `<p class="chip-rol impostor">Eres el impostor · ${votando ? 'no votas esta ronda' : 'usa IA sin que se note'}</p>`
    : `<p class="chip-rol humano">Sin IA · ${votando ? 'descubre al impostor' : 'escribe con tus propias palabras'}</p>`;
};

const progreso = (v, verbo) => {
  if (v.votos) return `<h3 class="kicker">${v.votos.hechos} de ${v.votos.total} ${verbo}</h3>`;
  const lista = v.jugadores.filter(j => j.hecho !== null);
  const hechos = lista.filter(j => j.hecho).length;
  return `<h3 class="kicker">${hechos} de ${lista.length} ${verbo}</h3><ul class="jugadores mini">${lista.map(j => ficha(j, `<span class="check ${j.hecho ? 'ok' : ''}">${j.hecho ? '✓' : '…'}</span>`)).join('')}</ul>`;
};

export function montar(el, v, ctx) {
  if (v.fase === 'rol') return montarRol(el, v);
  if (v.fase === 'escritura') return montarEscritura(el, v, ctx);
  return montarVotacion(el, v, ctx);
}

export function actualizar(el, v, ctx) {
  const zona = el.querySelector('#progreso');
  if (zona) zona.innerHTML = progreso(v, v.fase === 'escritura' ? 'ya enviaron' : 'ya votaron');
  if (v.fase === 'escritura' && v.yo.envio && el.querySelector('form')) pintarEnviado(el);
  if (v.fase === 'votacion' && v.yo.voto !== null && !el.querySelector('.votado')) pintarVotado(el, v);
}

function montarRol(el, v) {
  const yo = jugador(v, v.yo.pid);
  el.innerHTML = `<section class="stage centro">
    <p class="kicker">${fase(v, 'ROLES')}</p>
    <div class="tarjeta-rol ${v.yo.rol}">
      ${avatar(yo.personaje)}
      <h2 tabindex="-1">${v.yo.rol === 'impostor' ? 'Eres el impostor' : 'No puedes usar IA'}</h2>
      <p>${v.yo.rol === 'impostor' ? 'En esta ronda te toca escribir con ayuda de una IA. Que suene humano.' : 'Escribe con tus palabras y luego descubre cuál definición hizo la IA.'}</p>
    </div>
    <p class="estado">La palabra aparece en unos segundos…</p>
  </section>`;
}

function montarEscritura(el, v, ctx) {
  const { palabra, contexto } = v.caso;
  const instruccion = v.yo.rol === 'impostor'
    ? `Pídele a una IA una definición de «${esc(palabra)}» para este caso. Pégala o ajústala para que parezca escrita por una persona.`
    : `Escribe con tus propias palabras qué significa «${esc(palabra)}» en este caso. Nada de IA.`;
  el.innerHTML = `<section class="stage">
    <p class="kicker">${fase(v, 'ESCRITURA')}</p>
    ${chipRol(v)}
    <h2 tabindex="-1">${esc(palabra)}</h2>
    <blockquote><span class="meta">CASO FICTICIO / COLOMBIA</span><br>${esc(contexto)}</blockquote>
    ${reloj}
    <div id="zona">
      <form class="panel">
        <label>Tu definición<textarea name="texto" rows="4" maxlength="500" required placeholder="Escribe aquí…"></textarea></label>
        <p class="ayuda">${instruccion}</p>
        <div class="row"><button class="primary">Enviar definición</button><span class="contador" aria-live="polite">0 / 500</span></div>
      </form>
    </div>
    <div id="progreso"></div>
  </section>`;
  const form = el.querySelector('form');
  const contador = form.querySelector('.contador');
  form.elements.texto.oninput = () => { contador.textContent = `${form.elements.texto.value.length} / 500`; };
  form.onsubmit = async e => {
    e.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    if (!(await ctx.accion('definir', { texto: form.elements.texto.value }))) boton.disabled = false;
  };
  if (v.yo.envio) pintarEnviado(el);
  actualizar(el, v, ctx);
}

function pintarEnviado(el) {
  el.querySelector('#zona').innerHTML = '<div class="panel enviado"><strong>✓ Definición enviada</strong>Espera a que los demás terminen. Cuando todos envíen o se acabe el tiempo, empieza la votación.</div>';
}

function montarVotacion(el, v, ctx) {
  const impostor = v.yo.rol === 'impostor';
  el.innerHTML = `<section class="stage">
    <p class="kicker">${fase(v, 'VOTACIÓN')}</p>
    ${chipRol(v)}
    <h2 tabindex="-1">¿Cuál escribió la IA?</h2>
    <p>${impostor ? 'Tú no votas en esta ronda. Mira las definiciones y espera a ver si te descubren.' : `Lee las definiciones de «${esc(v.caso.palabra)}» y toca la que creas que escribió el impostor.`}</p>
    ${reloj}
    <div class="grid opciones">${v.entradas.map(e => {
      const contenido = `<strong>Definición ${dos(e.n + 1)}</strong><span class="texto">${esc(e.texto)}</span>${e.mia ? '<em class="mia">Tu definición</em>' : ''}`;
      return impostor || e.mia
        ? `<div class="panel opcion ${e.mia ? 'propia' : ''}">${contenido}</div>`
        : `<button type="button" class="panel opcion" data-n="${e.n}" aria-pressed="false">${contenido}</button>`;
    }).join('')}</div>
    ${impostor ? '' : '<div class="row" id="accion-voto"><button type="button" class="primary" id="votar" disabled>Confirmar voto</button></div>'}
    <div id="progreso"></div>
  </section>`;
  let elegida = null;
  el.querySelector('.opciones').onclick = e => {
    const opcion = e.target.closest('[data-n]');
    if (!opcion || el.querySelector('.votado')) return;
    elegida = Number(opcion.dataset.n);
    el.querySelectorAll('[data-n]').forEach(b => b.setAttribute('aria-pressed', String(b === opcion)));
    el.querySelector('#votar').disabled = false;
  };
  el.querySelector('#votar')?.addEventListener('click', async e => {
    e.currentTarget.disabled = true;
    if (!(await ctx.accion('votar', { n: elegida }))) e.currentTarget.disabled = false;
  });
  actualizar(el, v, ctx);
}

function pintarVotado(el, v) {
  el.querySelectorAll('[data-n]').forEach(b => {
    b.disabled = true;
    b.setAttribute('aria-pressed', String(Number(b.dataset.n) === v.yo.voto));
  });
  el.querySelector('#accion-voto').innerHTML = `<p class="votado">✓ Votaste por la definición ${dos(v.yo.voto + 1)}. Esperando a los demás…</p>`;
}
