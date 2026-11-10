// Revelación de cada ronda y podio final.
import { avatar, ficha, marcador } from '../personajes.js';
import { esc, dos, fase, jugador } from '../ui.js';

export function montar(el, v, ctx) {
  if (v.fase === 'fin') return montarFin(el, v, ctx);
  const r = v.resultado;
  const ultima = v.ronda + 1 >= v.rondas;
  const anfitrion = v.jugadores.find(j => j.anfitrion);
  const ganancias = Object.entries(r.ganancias ?? {});

  el.innerHTML = `<section class="stage">
    <p class="kicker">${fase(v, 'RESULTADO')}</p>
    ${resumenRonda(v)}
    <article class="tarjeta-caso">
      <p class="meta">El caso de la ronda</p>
      <h3>${esc(v.caso.titulo)}</h3>
      <p>${esc(v.caso.contexto)}</p>
      <a href="${esc(v.caso.url)}" target="_blank" rel="noopener noreferrer">${esc(v.caso.fuente)}&nbsp;↗</a>
    </article>
    <blockquote><span class="meta">PARA CONVERSAR</span><br>${esc(v.caso.pregunta)}</blockquote>
    <h3 class="kicker">Resultado de la votación</h3>
    <ul class="jugadores">${v.jugadores.map(j => {
      const votos = r.votos[j.pid];
      return ficha(j, `<span class="check">${votos} voto${votos === 1 ? '' : 's'}</span>`, j.pid === r.impostor ? 'yo' : '');
    }).join('')}</ul>
    ${ganancias.length ? `<h3 class="kicker">Puntos de esta ronda</h3>
      <ul class="ganancias">${ganancias.map(([pid, p]) => `<li>+${p} <span>${esc(jugador(v, pid)?.nombre)}</span></li>`).join('')}</ul>` : ''}
    <h3 class="kicker">Marcador parcial</h3>
    <p class="estado">Los puntos de rondas sin expulsión se muestran al final.</p>
    ${marcador(v)}
    <div class="row">${v.yo.anfitrion
      ? `<button type="button" class="primary" id="siguiente">${ultima ? 'Ver resultados finales →' : 'Siguiente ronda →'}</button>`
      : `<p class="estado">Esperando a que ${esc(anfitrion?.nombre ?? 'el anfitrión')} continúe…</p>`}</div>
  </section>`;
  el.querySelector('#siguiente')?.addEventListener('click', async e => {
    const boton = e.currentTarget;
    boton.disabled = true;
    if (!(await ctx.accion('siguiente'))) boton.disabled = false;
  });
}

function resumenRonda(v) {
  const r = v.resultado;
  if (!r.descubierto) {
    const mensaje = r.emitidos ? 'La votación no alcanzó la mayoría necesaria para expulsar al impostor.' : 'La ronda terminó sin votos.';
    return `<div class="resultado-sin-expulsion">
      <span class="sello-continuar" aria-hidden="true">↻</span>
      <div><h2 tabindex="-1">Sin expulsión</h2><p>${mensaje} El rol queda en secreto.</p></div>
    </div>`;
  }
  const imp = jugador(v, r.impostor);
  const intento = r.adivino === null ? 'Se agotó el tiempo para adivinar el caso.'
    : r.adivino ? 'Acertó el caso en su última oportunidad.' : 'Eligió otro caso en su última oportunidad.';
  return `<div class="revelado">
    ${avatar(imp.personaje)}
    <div>
      <h2 tabindex="-1">${esc(imp.nombre)} era el impostor</h2>
      <p>Recibió ${r.aciertos} de ${v.jugadores.length} votos. ${intento}</p>
    </div>
  </div>`;
}

function montarFin(el, v, ctx) {
  const orden = [...v.jugadores].sort((a, b) => b.puntos - a.puntos);
  const max = orden[0]?.puntos ?? 0;
  const lideres = orden.filter(j => j.puntos === max);
  const podio = [orden[1], orden[0], orden[2]];
  el.innerHTML = `<section class="stage">
    <p class="kicker">${dos(v.rondas)} / ${dos(v.rondas)} · CIERRE</p>
    <h2 tabindex="-1">${lideres.length === 1 ? `¡Ganó ${esc(lideres[0].nombre)}!` : `Empate: ${lideres.map(j => esc(j.nombre)).join(', ')}`}</h2>
    <div class="podio" aria-hidden="true">
      ${podio.map((j, i) => j ? `<div class="escalon e${[2, 1, 3][i]}">${avatar(j.personaje)}<span>${esc(j.nombre)}</span><div class="bloque">${[2, 1, 3][i]}</div></div>` : '<div></div>').join('')}
      ${Array.from({ length: 18 }, (_, i) => `<i class="confeti" style="--n:${i}"></i>`).join('')}
    </div>
    ${marcador(v)}
    <blockquote>¿Qué pista interpretaste distinto de tus compañeros? ¿Qué información te haría cambiar de opinión sobre uno de los casos?</blockquote>
    <p>Antes de compartir un titular político, revisa quién lo publicó, qué hechos respalda la fuente y qué información hace falta.</p>
    <div class="row"><button type="button" class="primary" id="salir">Volver al inicio</button></div>
  </section>`;
  el.querySelector('#salir').onclick = () => ctx.salir();
}
