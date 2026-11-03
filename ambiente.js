/* The scene is decorative. Game controls and scoring live in game.js. */
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let motionPaused = motionPreference.matches;
const environment = document.createElement('div');
environment.className = 'environment';
environment.setAttribute('aria-hidden', 'true');
const cube = '<div class="cube">' + ['front','back','left','right','top','bottom'].map(side => '<i class="' + side + '"></i>').join('') + '</div>';
environment.innerHTML = '<div class="ambient-light"></div><div class="floor-grid"></div><div class="ambient-object ambient-one">' + cube + '</div><div class="ambient-object ambient-two"><div class="sphere"></div></div><div class="ambient-object ambient-three"><div class="sculpture-ring"></div></div>';
document.body.prepend(environment);
const motionButton = document.createElement('button');
motionButton.className = 'quiet motion-toggle';
motionButton.type = 'button';
document.querySelector('header > div').prepend(motionButton);
function updateMotion() {
  document.body.classList.toggle('motion-paused', motionPaused);
  motionButton.textContent = motionPaused ? 'Activar movimiento' : 'Pausar movimiento';
  motionButton.setAttribute('aria-pressed', String(motionPaused));
}
motionButton.onclick = () => {
  motionPaused = !motionPaused;
  updateMotion();
};
motionPreference.addEventListener('change', event => {
  motionPaused = event.matches;
  updateMotion();
});
updateMotion();

function animateScene() {
  const art = document.querySelector('.art');
  document.body.classList.toggle('in-game', !art);
  document.querySelectorAll('.stage > *, .hero > div:first-child > *, .grid > *').forEach((item, index) => {
    item.style.setProperty('--entry-delay', Math.min(index * 45, 270) + 'ms');
    item.classList.add('scene-entry');
  });
  if (!art) return;
  art.removeAttribute('aria-hidden');
  art.querySelector('.meta').textContent = 'UN ESPACIO PARA PENSAR JUNTOS';
  art.querySelector('small').textContent = 'Mueve el cursor y explora';
  const decor = document.createElement('div');
  decor.className = 'scene-props';
  decor.setAttribute('aria-hidden', 'true');
  decor.innerHTML = '<div class="stage-platform"></div><div class="prop prop-cube">' + cube + '</div><div class="prop prop-sphere"><div class="sphere"></div></div><div class="prop prop-ring"><div class="sculpture-ring"></div></div><span class="voice-label label-human">Una voz humana</span><span class="voice-label label-ai">¿O una IA?</span>' + Array.from({length:9}, (_, i) => '<i class="mote" style="--n:' + i + '"></i>').join('');
  art.prepend(decor);
  art.querySelector('.rig').setAttribute('aria-hidden', 'true');
  const spin = document.createElement('button');
  spin.className = 'scene-spin';
  spin.type = 'button';
  spin.textContent = '↻ Girar escena';
  spin.onclick = () => {
    if (motionPaused || motionPreference.matches || art.classList.contains('scene-turn')) return;
    art.classList.add('scene-turn');
    setTimeout(() => art.classList.remove('scene-turn'), 1100);
  };
  art.append(spin);
  art.onpointermove = event => {
    if (motionPaused || motionPreference.matches) return;
    const box = art.getBoundingClientRect();
    art.style.setProperty('--rx', ((0.5 - (event.clientY - box.top) / box.height) * 18) + 'deg');
    art.style.setProperty('--ry', (((event.clientX - box.left) / box.width - 0.5) * 22) + 'deg');
  };
  art.onpointerleave = () => {
    art.style.removeProperty('--rx');
    art.style.removeProperty('--ry');
  };
}
