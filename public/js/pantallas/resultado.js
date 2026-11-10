// Revelación de cada ronda y podio final.
import { avatar, marcador } from '../personajes.js';
import { esc, dos, fase, jugador } from '../ui.js';

export function montar(el, v, ctx) {
  if (v.fase === 'fin') return montarFin(el, v, ctx);
  const r = v.resultado;
  const imp = jugador(v, r.impostor);
  const ultima = v.ronda + 1 >= v.rondas;
  const anfitrion = v.jugadores.find(j => j.anfitrion);
  const ganancias = Object.entries(r.ganancias);

  el.innerHTML = `<section class="stage">
    <p class="kicker">${fase(v, 'REVELACIÓN')}</p>
    <div class="revelado">
      ${avatar(imp.personaje)}
      <div>
        <h2 tabindex="-1">${esc(imp.nombre)} era el impostor</h2>
        <p>Usó IA en la definición ${dos(r.n + 1)}. ${r.aciertos} de ${r.votantes} lo descubrieron${r.bono ? ` · el impostor suma ${r.bono} puntos` : ''}.</p>
      </div>
    </div>
    <h3 class="kicker">Las definiciones de «${esc(v.caso.palabra)}»</h3>
    <div class="grid">${v.entradas.map(e => {
      const autor = jugador(v, e.autor);
      return `<article class="panel opcion ${e.n === r.n ? 'winner' : ''}">
        <strong>Definición ${dos(e.n + 1)}${e.n === r.n ? ' · IA' : ''}</strong>
        <span class="texto">${esc(e.texto)}</span>
        <span class="autor">${autor ? avatar(autor.personaje) + esc(autor.nombre) : ''}<em>${e.votos} voto${e.votos === 1 ? '' : 's'}</em></span>
      </article>`;
    }).join('')}</div>
    <h3 class="kicker">Puntos de esta ronda</h3>
    ${ganancias.length
      ? `<ul class="ganancias">${ganancias.map(([pid, p]) => `<li>+${p} <span>${esc(jugador(v, pid)?.nombre)}</span></li>`).join('')}</ul>`
      : '<p>Nadie sumó puntos en esta ronda.</p>'}
    <blockquote><span class="meta">PARA CONVERSAR</span><br>${esc(v.caso.pregunta)}</blockquote>
    <h3 class="kicker">Marcador</h3>
    ${marcador(v)}
    <div class="row">${v.yo.anfitrion
      ? `<button type="button" class="primary" id="siguiente">${ultima ? 'Ver resultados finales →' : 'Siguiente ronda →'}</button>`
      : `<p class="estado">Esperando a que ${esc(anfitrion?.nombre ?? 'el anfitrión')} continúe…</p>`}</div>
  </section>`;
  el.querySelector('#siguiente')?.addEventListener('click', e => {
    e.currentTarget.disabled = true;
    ctx.accion('siguiente').then(ok => { if (!ok) e.currentTarget.disabled = false; });
  });
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
    <blockquote>¿Qué pistas parecían pruebas? ¿Cómo verificarían un mensaje que les da rabia y que coincide con lo que ya creen?</blockquote>
    <p>El estilo de un texto por sí solo no permite saber quién lo escribió ni si es cierto. Antes de compartir contenido sobre un tema que divide opiniones, revisen la fuente, contrasten versiones y busquen el contexto completo.</p>
    <div class="row"><button type="button" class="primary" id="salir">Volver al inicio</button></div>
  </section>`;
  el.querySelector('#salir').onclick = () => ctx.salir();
}
