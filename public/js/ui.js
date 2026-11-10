// Ayudas pequeñas compartidas por todas las pantallas.
export const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const dos = n => String(n).padStart(2, '0');
export const fase = (v, nombre) => `RONDA ${dos(v.ronda + 1)} / ${dos(v.rondas)} · ${nombre}`;
export const reloj = '<div class="clock" data-hasta aria-label="Tiempo restante">--:--</div>';
export const jugador = (v, pid) => v.jugadores.find(j => j.pid === pid);

let temporizador;
export function aviso(mensaje) {
  let caja = document.querySelector('#aviso');
  if (!caja) {
    caja = document.createElement('div');
    caja.id = 'aviso';
    caja.setAttribute('role', 'status');
    document.body.append(caja);
  }
  caja.textContent = mensaje;
  caja.classList.add('visible');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => caja.classList.remove('visible'), 3500);
}

