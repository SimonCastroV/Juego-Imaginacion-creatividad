// Caricaturas propias en SVG (sin fotos). Cada personaje se arma con piezas: peinado, barba, gafas, ropa y accesorio.
import { esc } from './ui.js';

export const PERSONAJES = [
  { id: 'petro', nombre: 'Gustavo Petro', piel: '#d3a078', pelo: '#8d8984', ceja: '#55504b', peinado: 'corto', barba: 'corta', ropa: 'guayabera', color: '#f4f0e4', acento: '#c5b48a' },
  { id: 'uribe', nombre: 'Álvaro Uribe', piel: '#efc6a0', pelo: '#b9b3ab', ceja: '#77706a', peinado: 'entradas', gafas: 'finas', ropa: 'ruana', color: '#d8c49e', acento: '#7d6142', sombrero: true },
  { id: 'cepeda', nombre: 'Iván Cepeda', piel: '#e6bb95', pelo: '#cac6c0', ceja: '#77706a', peinado: 'entradas', barba: 'completa', gafas: 'finas', ropa: 'saco', color: '#2f3a55' },
  { id: 'espriella', nombre: 'Abelardo de la Espriella', piel: '#e0ad85', pelo: '#1d1a1f', ceja: '#1d1a1f', peinado: 'engominado', ropa: 'saco', color: '#17161b', corbata: '#8a1f2d' },
  { id: 'vicky', nombre: 'Vicky Dávila', piel: '#f2cda9', pelo: '#d6b066', ceja: '#8a6a3a', peinado: 'largo', ropa: 'blazer', color: '#b8323a' },
  { id: 'claudia', nombre: 'Claudia López', piel: '#d9a87f', pelo: '#2a2420', ceja: '#2a2420', peinado: 'corto', gafas: 'gruesas', ropa: 'chaqueta', color: '#3f8a4f' },
  { id: 'fajardo', nombre: 'Sergio Fajardo', piel: '#eec29b', pelo: '#d3d0cb', ceja: '#8a847d', peinado: 'ondulado', ropa: 'camisa', color: '#9cc3e6' },
  { id: 'paloma', nombre: 'Paloma Valencia', piel: '#f3d0b0', pelo: '#3b2618', ceja: '#3b2618', peinado: 'largo', ropa: 'blazer', color: '#27467a' },
];
const porId = Object.fromEntries(PERSONAJES.map(p => [p.id, p]));
export const personaje = id => porId[id] ?? PERSONAJES[0];

const PELO_ATRAS = {
  largo: 'M24 48C20 20 36 12 50 12S80 20 76 48L80 92C72 94 65 88 65 78H35C35 88 28 94 20 92Z',
};
const PELO = {
  corto: 'M28 44C26 22 40 15 52 16C66 17 75 26 72 44C70 34 62 27 50 27C40 27 31 33 28 44Z',
  entradas: 'M28 52C26 38 30 30 35 27C33 36 32 43 32 52ZM72 52C74 38 70 30 65 27C67 36 68 43 68 52ZM38 22C45 18 55 18 62 22C56 21 44 21 38 22Z',
  engominado: 'M27 46C24 22 40 13 54 15C68 17 76 28 73 46C71 36 66 30 58 28C50 26 40 30 33 34C30 38 28 42 27 46Z',
  largo: 'M28 44C28 24 40 17 52 17S73 26 72 44C66 31 56 27 46 30C38 32 32 37 28 44Z',
};
const BARBA = {
  corta: 'M29 50C30 66 40 72 50 72S70 66 71 50C68 60 62 64 50 64S32 60 29 50Z',
  completa: 'M28 46C27 69 38 77 50 77S73 69 72 46C69 58 62 62 50 62S31 58 28 46Z',
};

function pelo(p) {
  if (p.peinado === 'ondulado') {
    return [[31, 34, 7], [38, 25, 8], [50, 21, 9], [62, 25, 8], [69, 34, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.pelo}"/>`).join('');
  }
  const brillo = p.peinado === 'engominado' ? '<path d="M40 22Q50 18 60 22" stroke="#fff" stroke-opacity=".3" stroke-width="2" fill="none"/>' : '';
  return `<path d="${PELO[p.peinado]}" fill="${p.pelo}"/>${brillo}`;
}

function ropa(p) {
  const oscuro = 'stroke="#000" stroke-opacity=".22" stroke-width="1.5" fill="none"';
  switch (p.ropa) {
    case 'guayabera':
      return `<path d="M38 88V118M62 88V118" stroke="${p.acento}" stroke-width="2"/><path d="M42 77L50 87 58 77" stroke="${p.acento}" stroke-width="2" fill="none"/>${[93, 101, 109].map(y => `<circle cx="50" cy="${y}" r="1.4" fill="${p.acento}"/>`).join('')}`;
    case 'ruana':
      return `<path d="M42 77L50 89 58 77Z" fill="#fff"/><path d="M19 102H81M17 110H83" stroke="${p.acento}" stroke-width="3"/><path d="M50 89V120" ${oscuro}/>`;
    case 'saco':
      return `<path d="M42 77L50 98 58 77Z" fill="#fff"/>${p.corbata ? `<path d="M48.5 80H51.5L53 94 50 99 47 94Z" fill="${p.corbata}"/>` : ''}<path d="M42 77L50 98 38 90M58 77L50 98 62 90" ${oscuro}/>`;
    case 'blazer':
      return `<path d="M43 77L50 92 57 77Z" fill="#fff"/><path d="M43 77L50 92 39 88M57 77L50 92 61 88" ${oscuro}/>`;
    case 'chaqueta':
      return `<path d="M42 76L50 82 58 76" stroke="#000" stroke-opacity=".25" stroke-width="3" fill="none"/><path d="M50 82V120" ${oscuro}/>`;
    case 'camisa':
      return `<path d="M42 76L47 84 50 78 53 84 58 76Z" fill="#fff" fill-opacity=".7"/>${[90, 99, 108].map(y => `<circle cx="50" cy="${y}" r="1.3" fill="#fff"/>`).join('')}`;
    default:
      return '';
  }
}

function gafas(tipo) {
  if (!tipo) return '';
  const [color, grosor] = tipo === 'gruesas' ? ['#1b1b1f', 2.6] : ['#6d6a66', 1.2];
  return `<g stroke="${color}" stroke-width="${grosor}" fill="#fff" fill-opacity=".12"><rect x="35" y="41.5" width="13" height="9.5" rx="3"/><rect x="52" y="41.5" width="13" height="9.5" rx="3"/><path d="M48 45H52M35 45H29M65 45H71" fill="none"/></g>`;
}

const sombrero = '<path d="M33 24C33 8 40 4 50 4S67 8 67 24Z" fill="#efe6d0"/><rect x="33" y="16" width="34" height="5" fill="#1e1b18"/><ellipse cx="50" cy="24" rx="34" ry="6" fill="#f3ebd7" stroke="#c9bc9b"/>';

export function avatar(id, { decorativo = true } = {}) {
  const p = personaje(id);
  const etiqueta = decorativo ? 'aria-hidden="true"' : `role="img" aria-label="${esc(p.nombre)}"`;
  return `<svg class="avatar" viewBox="0 0 100 120" ${etiqueta}>
    ${PELO_ATRAS[p.peinado] ? `<path d="${PELO_ATRAS[p.peinado]}" fill="${p.pelo}"/>` : ''}
    <rect x="44" y="62" width="12" height="16" fill="${p.piel}"/>
    <path d="M16 120C16 92 28 76 50 76S84 92 84 120Z" fill="${p.color}"/>
    ${ropa(p)}
    <circle cx="28" cy="47" r="4" fill="${p.piel}"/><circle cx="72" cy="47" r="4" fill="${p.piel}"/>
    <ellipse cx="50" cy="44" rx="22" ry="25" fill="${p.piel}"/>
    ${pelo(p)}
    ${p.barba ? `<path d="${BARBA[p.barba]}" fill="${p.pelo}"/><path d="M43 55.5Q50 52.5 57 55.5Q50 57.5 43 55.5Z" fill="${p.pelo}"/>` : ''}
    <path d="M38 39Q42 37 46 39M54 39Q58 37 62 39" stroke="${p.ceja}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <circle cx="42" cy="46" r="2.4" fill="#231633"/><circle cx="58" cy="46" r="2.4" fill="#231633"/>
    <circle cx="37" cy="53" r="3" fill="#e98a7a" opacity=".3"/><circle cx="63" cy="53" r="3" fill="#e98a7a" opacity=".3"/>
    <path d="M50 47Q48 52 50.5 53" stroke="#000" stroke-opacity=".2" stroke-width="1.4" fill="none"/>
    <path d="M44 58Q50 62.5 56 58" stroke="${p.barba ? '#f4e1d6' : '#5a2d2a'}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${gafas(p.gafas)}
    ${p.sombrero ? sombrero : ''}
  </svg>`;
}

// Ficha de jugador para listas: muñeco + nombre + lo que se quiera agregar a la derecha.
export const ficha = (j, extra = '', clase = '') =>
  `<li class="jugador ${clase}">${avatar(j.personaje)}<span class="nombre">${esc(j.nombre)}</span>${extra}</li>`;

// Marcador ordenado por puntos.
export function marcador(v) {
  const orden = [...v.jugadores].sort((a, b) => b.puntos - a.puntos);
  return `<ol class="jugadores marcador">${orden.map(j => ficha(j, `<strong>${j.puntos} pts</strong>`, j.pid === v.yo.pid ? 'yo' : '')).join('')}</ol>`;
}
