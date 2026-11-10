// Portada: crear una sala o unirse con un código.
import { PERSONAJES, avatar } from '../personajes.js';
import { esc, aviso } from '../ui.js';

const POSICIONES = [[8, 30], [58, 18], [34, 52], [70, 56], [14, 66]];

function nombreGuardado(valor) {
  try {
    if (valor === undefined) return localStorage.getItem('entre-voces-nombre') ?? '';
    localStorage.setItem('entre-voces-nombre', valor);
  } catch {}
  return '';
}

export function montar(el, { mensaje } = {}, ctx) {
  el.innerHTML = `<section class="hero">
    <div>
      <p class="kicker">EXPERIMENTO DE AULA / COLOMBIA</p>
      <h1 tabindex="-1">Entre<br><em>voces.</em></h1>
      <p class="lede">Una palabra. Varias voces. Una la escribió una IA. ¿Puedes descubrir al impostor?</p>
      ${mensaje ? `<p class="nota" role="alert">${esc(mensaje)}</p>` : ''}
      <form class="panel acceso" novalidate>
        <label>Tu nombre<input name="nombre" maxlength="18" autocomplete="nickname" placeholder="Ej. Laura" value="${esc(nombreGuardado())}"></label>
        <button type="button" class="primary" data-accion="crear">Crear sala</button>
        <p class="divisor"><span>o únete con un código</span></p>
        <div class="unirse">
          <label>Código de sala<input name="codigo" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD"></label>
          <button type="submit" data-accion="unirse">Unirse →</button>
        </div>
      </form>
      <div class="strip"><span>5 RONDAS</span><span>DESDE 3 JUGADORES</span><span>1 IMPOSTOR CON IA</span></div>
    </div>
    <div class="art" aria-hidden="true">
      <span class="meta">¿QUIÉN USÓ IA?</span>
      <div class="orbit"></div><div class="orbit second"></div>
      ${PERSONAJES.slice(0, 5).map((p, i) => `<div class="flotante" style="--i:${i};left:${POSICIONES[i][0]}%;top:${POSICIONES[i][1]}%">${avatar(p.id)}</div>`).join('')}
      <small>CARICATURAS · FINES EDUCATIVOS</small>
    </div>
  </section>`;

  const form = el.querySelector('form');
  const codigo = form.elements.codigo;
  codigo.oninput = () => { codigo.value = codigo.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };

  async function enviar(accion, boton) {
    const nombre = form.elements.nombre.value.trim();
    if (!nombre) {
      aviso('Escribe tu nombre primero.');
      return form.elements.nombre.focus();
    }
    if (accion === 'unirse' && codigo.value.length !== 4) {
      aviso('El código tiene 4 caracteres.');
      return codigo.focus();
    }
    nombreGuardado(nombre);
    boton.disabled = true;
    const ok = await ctx.entrar(accion, { nombre, codigo: codigo.value });
    if (!ok) boton.disabled = false;
  }
  const crear = form.querySelector('[data-accion="crear"]');
  const unirse = form.querySelector('[data-accion="unirse"]');
  crear.onclick = () => enviar('crear', crear);
  form.onsubmit = e => {
    e.preventDefault();
    if (document.activeElement === form.elements.nombre && !codigo.value) enviar('crear', crear);
    else enviar('unirse', unirse);
  };
}
