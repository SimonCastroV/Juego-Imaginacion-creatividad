// Tarjeta privada, turnos de pistas, votación y último intento del impostor.
import { avatar, ficha } from '../personajes.js';
import { esc, fase, reloj, jugador } from '../ui.js';

const esImpostor = v => v.yo.rol === 'impostor';

export function montar(el, v, ctx) {
  if (v.fase === 'rol') return montarRol(el, v);
  if (v.fase === 'pistas') return montarPistas(el, v, ctx);
  if (v.fase === 'votacion') return montarVotacion(el, v, ctx);
  montarIntento(el, v, ctx);
}

export function actualizar(el, v, ctx) {
  if (v.fase === 'pistas') actualizarTurno(el, v, ctx);
  if (v.fase !== 'votacion') return;

  const progreso = el.querySelector('#progreso');
  const texto = `${v.votos.hechos} de ${v.votos.total} ya votaron.`;
  if (progreso.textContent !== texto) progreso.textContent = texto;
  el.querySelector('.avance-votos').style.setProperty('--avance', v.votos.hechos / v.votos.total);
  const form = el.querySelector('form');
  if (form && v.yo.voto) {
    const mensaje = document.createElement('p');
    mensaje.className = 'votado';
    mensaje.setAttribute('role', 'status');
    mensaje.textContent = `Votaste por ${jugador(v, v.yo.voto).nombre}. Espera el resultado.`;
    form.replaceWith(mensaje);
  }
}

function montarRol(el, v) {
  const yo = jugador(v, v.yo.pid);
  const impostor = esImpostor(v);
  el.innerHTML = `<section class="stage centro">
    <p class="kicker">${fase(v, 'ROLES')}</p>
    <div class="tarjeta-rol ${impostor ? 'impostor' : ''}">
      ${avatar(yo.personaje)}
      <h2 tabindex="-1">${impostor ? 'Eres el impostor' : 'Conoces el caso'}</h2>
      <p>${impostor ? 'Recibirás una pista general. Escucha a los demás e improvisa la tuya.' : 'Recibirás el caso completo. Da una pista que deje algo por descubrir.'}</p>
    </div>
    <p class="estado">En unos segundos aparece tu tarjeta privada.</p>
  </section>`;
}

function montarPistas(el, v, ctx) {
  const impostor = esImpostor(v);
  el.innerHTML = `<section class="stage">
    <p class="kicker">${fase(v, 'PISTAS')}</p>
    <h2 tabindex="-1">Una pista por persona</h2>
    <p>Cuando llegue tu turno, di una frase en voz alta. Evita los nombres propios y el título del caso.</p>
    <article class="tarjeta-caso ${impostor ? 'impostor' : ''}">
      <p class="meta">Tarjeta privada · ${impostor ? 'Impostor' : 'Conoces el caso'}</p>
      ${v.tarjeta.titulo ? `<h3>${esc(v.tarjeta.titulo)}</h3>` : ''}
      <p>${esc(v.tarjeta.texto)}</p>
    </article>
    <div class="panel zona-turno">
      <div>
        <p class="meta" id="numero-turno"></p>
        <p id="turno-actual" role="status"></p>
      </div>
      ${reloj}
      <button type="button" class="primary" id="pista" hidden>Ya di mi pista</button>
    </div>
    <h3 class="kicker">Orden de pistas</h3>
    <ol class="jugadores mini orden-turnos"></ol>
  </section>`;
  actualizarTurno(el, v, ctx);
}

function actualizarTurno(el, v, ctx) {
  const lista = el.querySelector('.orden-turnos');
  const { orden, actual } = v.turnos;
  if (lista.dataset.turno === String(actual)) return;
  lista.dataset.turno = actual;
  const turno = jugador(v, orden[actual]);
  const mio = turno.pid === v.yo.pid;
  el.querySelector('#numero-turno').textContent = `Turno ${actual + 1} de ${orden.length}`;
  el.querySelector('#turno-actual').textContent = mio ? 'Te toca hablar' : `Es el turno de ${turno.nombre}`;
  el.querySelector('.zona-turno').classList.toggle('turno-propio', mio);
  const boton = el.querySelector('#pista');
  boton.hidden = !mio;
  boton.disabled = false;
  boton.onclick = async () => {
    boton.disabled = true;
    if (!(await ctx.accion('pista', { turno: actual }))) boton.disabled = false;
  };
  lista.innerHTML = orden.map((pid, i) =>
    ficha(jugador(v, pid), `<span class="check">${i < actual ? 'Pasó' : i === actual ? 'En turno' : 'Espera'}</span>`, i === actual ? 'en-turno' : ''),
  ).join('');
}

function montarVotacion(el, v, ctx) {
  const candidatos = v.jugadores.filter(j => j.pid !== v.yo.pid);
  el.innerHTML = `<section class="stage">
    <p class="kicker">${fase(v, 'VOTACIÓN')}</p>
    <h2 tabindex="-1">¿Quién improvisó?</h2>
    <p>Vota en secreto por quien crees que recibió solo la pista general. Se necesitan ${v.votos.mayoria} votos para descubrir al impostor.</p>
    ${reloj}
    <p id="progreso" class="estado" role="status"></p>
    <div class="avance-votos" aria-hidden="true"></div>
    <form>
      <fieldset class="opciones-juego">
        <legend class="kicker">Elige a un jugador</legend>
        <div class="grid">${candidatos.map(j => opcion(j.pid, avatar(j.personaje) + esc(j.nombre))).join('')}</div>
      </fieldset>
      <div class="row"><button class="primary">Confirmar voto</button></div>
    </form>
  </section>`;
  vincularSeleccion(el, ctx, 'votar', valor => ({ pid: valor }));
  actualizar(el, v, ctx);
}

function montarIntento(el, v, ctx) {
  const impostor = esImpostor(v);
  el.innerHTML = `<section class="stage">
    <p class="kicker">${fase(v, 'ÚLTIMA OPORTUNIDAD')}</p>
    <h2 tabindex="-1">${impostor ? 'Adivina el caso' : 'Encontraron al impostor'}</h2>
    <p>${impostor ? 'El grupo te descubrió. Si aciertas el caso, ganas 2 puntos.' : `${esc(jugador(v, v.impostor).nombre)} puede ganar 2 puntos si adivina el caso.`}</p>
    ${reloj}
    ${impostor ? `<form>
      <fieldset class="opciones-juego">
        <legend class="kicker">Elige un caso</legend>
        <div class="grid">${v.opciones.map((nombre, i) => opcion(i, esc(nombre))).join('')}</div>
      </fieldset>
      <div class="row"><button class="primary">Confirmar respuesta</button></div>
    </form>` : '<p class="estado">La respuesta se revela cuando termine su intento.</p>'}
  </section>`;
  if (impostor) vincularSeleccion(el, ctx, 'adivinar', valor => ({ opcion: Number(valor) }));
}

function opcion(valor, contenido) {
  return `<label class="panel opcion-eleccion"><input type="radio" name="eleccion" value="${esc(valor)}" required>${contenido}</label>`;
}

function vincularSeleccion(el, ctx, accion, preparar) {
  const form = el.querySelector('form');
  form.onsubmit = async event => {
    event.preventDefault();
    const boton = form.querySelector('button');
    boton.disabled = true;
    if (!(await ctx.accion(accion, preparar(new FormData(form).get('eleccion'))))) boton.disabled = false;
  };
}
