// Sala de espera: código, elección de personaje y botón "Listo".
import { PERSONAJES, avatar, ficha } from '../personajes.js';
import { aviso } from '../ui.js';

export function montar(el, v, ctx) {
  el.innerHTML = `<section class="stage lobby">
    <p class="kicker">SALA DE ESPERA</p>
    <div class="codigo-sala">
      <span>Código de la sala</span>
      <h2 tabindex="-1" class="codigo">${v.codigo}</h2>
      <button type="button" class="quiet" id="compartir">Compartir código</button>
    </div>
    <p>Elige tu personaje y oprime <strong>Listo</strong>. La partida empieza cuando todos estén listos (mínimo ${v.minJugadores} jugadores).</p>
    <h3 class="kicker">Elige tu personaje</h3>
    <div class="selector" role="radiogroup" aria-label="Personaje">
      ${PERSONAJES.map(p => `<button type="button" role="radio" class="opcion-personaje" data-p="${p.id}">${avatar(p.id)}<span>${p.nombre}</span></button>`).join('')}
    </div>
    <h3 class="kicker">Jugadores <span id="cuenta"></span></h3>
    <ul class="jugadores" id="jugadores"></ul>
    <p class="estado" id="estado" role="status"></p>
    <div class="row">
      <button type="button" class="primary" id="listo"></button>
      <button type="button" class="quiet" id="salir">Salir de la sala</button>
    </div>
  </section>`;

  el.querySelector('.selector').onclick = e => {
    const opcion = e.target.closest('[data-p]');
    if (opcion) ctx.accion('personaje', { personaje: opcion.dataset.p });
  };
  el.querySelector('#listo').onclick = () => ctx.accion('listo', { listo: !ctx.vista().yo.listo });
  el.querySelector('#salir').onclick = () => ctx.salir();
  el.querySelector('#compartir').onclick = async () => {
    const texto = `Únete a mi sala de Entre Voces con el código ${v.codigo}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Entre Voces', text: texto, url: location.origin });
      else {
        await navigator.clipboard.writeText(`${texto}: ${location.origin}`);
        aviso('Código copiado.');
      }
    } catch {}
  };
  actualizar(el, v);
}

export function actualizar(el, v) {
  el.querySelectorAll('[data-p]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.p === v.yo.personaje)));
  el.querySelector('#cuenta').textContent = `(${v.jugadores.length})`;
  el.querySelector('#jugadores').innerHTML = v.jugadores.map(j =>
    ficha(j, `${j.anfitrion ? '<small class="etiqueta">anfitrión</small>' : ''}<span class="check ${j.listo ? 'ok' : ''}">${j.listo ? '✓ Listo' : 'Esperando'}</span>`, j.pid === v.yo.pid ? 'yo' : ''),
  ).join('');
  const listos = v.jugadores.filter(j => j.listo).length;
  const faltan = v.minJugadores - v.jugadores.length;
  el.querySelector('#estado').textContent = faltan > 0
    ? `Faltan ${faltan} jugador${faltan === 1 ? '' : 'es'} para empezar.`
    : `${listos} de ${v.jugadores.length} listos. La partida empieza cuando todos estén listos.`;
  const listo = el.querySelector('#listo');
  listo.textContent = v.yo.listo ? 'Ya no estoy listo' : '¡Listo!';
  listo.classList.toggle('primary', !v.yo.listo);
}
