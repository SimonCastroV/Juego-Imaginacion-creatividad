const cases = [
  ['Confianza','En un chat familiar circula un audio anónimo sobre un supuesto cierre de vías. Unos lo reenvían porque viene de un familiar. Otros piden confirmar de dónde salió.','¿Cómo confirmarías el origen del audio antes de reenviarlo?'],
  ['Protesta','Dos cuentas comparten el mismo video recortado de una marcha en una ciudad colombiana. Cada una le atribuye una intención distinta a quienes marchan.','¿Qué buscarías para saber qué pasó antes y después del fragmento?'],
  ['Seguridad','En un barrio se comparte una imagen que supuestamente muestra un robo reciente. La conversación pasa del incidente a acusar a toda una comunidad.','¿Qué evidencia permitiría evaluar el incidente y qué parte de la conversación es una generalización?'],
  ['Justicia','Un mensaje viral acusa a una persona de desviar recursos de un municipio. Algunas personas la defienden por afinidad política y otras dan por hecha su culpabilidad.','¿Qué fuentes consultarías antes de emitir un juicio?'],
  ['Reconciliación','En un municipio colombiano se propone un encuentro entre vecinos que discrepan sobre cómo recordar el conflicto armado. Una publicación atribuye la misma intención a todas las personas de cada grupo.','¿Qué pregunta abriría una conversación que permita escuchar experiencias diferentes?']
];
const screen = document.querySelector('#screen');
const help = document.querySelector('#help');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const number = value => String(value).padStart(2, '0');
const button = (label, primary = false) => `<button type="button" id="next" class="${primary ? 'primary' : ''}">${label}</button>`;
const shuffle = values => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
let teams, points, order, round, minutes, infiltrator, entries, timer, deadline;
let busy = false;
function show(html, bind = () => {}) {
  if (busy) return;
  clearInterval(timer);
  function paint() {
    busy = false;
    screen.innerHTML = html;
    screen.className = 'enter';
    screen.querySelector('h1,h2')?.focus({preventScroll:true});
    window.scrollTo(0, 0);
    bind();
    animateScene();
  }
  if (!screen.innerHTML || reduced.matches) return paint();
  busy = true;
  screen.className = 'exit';
  setTimeout(paint, 180);
}
const onNext = action => document.querySelector('#next').onclick = action;
const stage = (tag, title, html) => `<section class="stage"><p class="kicker">${tag}</p><h2 tabindex="-1">${title}</h2>${html}</section>`;
const phase = label => `RONDA ${number(round + 1)} / 05 · ${label}`;
const piece = symbol => `<div class="piece">${Array.from({length:15}, (_, i) => `<div class="face" style="--z:${i * 2}px">${i === 14 ? symbol : ''}</div>`).join('')}</div>`;

function home() {
  show(`<section class="hero"><div><p class="kicker">EXPERIMENTO DE AULA / COLOMBIA</p><h1 tabindex="-1">Entre<br><em>voces.</em></h1><p class="lede">Una palabra. Varias perspectivas. Un equipo con IA. ¿Puedes descubrir cuál?</p><div class="row">${button('Preparar partida →', true)}</div><div class="strip"><span>5 RONDAS</span><span>6–10 MIN POR RONDA</span><span>DESDE 3 EQUIPOS</span></div></div><div class="art" aria-hidden="true"><span class="meta">FIG. 01 / VOCES EN ÓRBITA</span><div class="orbit"></div><div class="orbit second"></div><div class="rig"><div class="float">${piece('“')}</div><div class="float alt">${piece('?')}</div></div><small>HUMANO O IA</small></div></section>`, () => {
    onNext(setup);
    const art = document.querySelector('.art');
    art.onpointermove = event => {
      if (reduced.matches) return;
      const box = art.getBoundingClientRect();
      art.style.setProperty('--rx', `${(0.5 - (event.clientY - box.top) / box.height) * 16}deg`);
      art.style.setProperty('--ry', `${((event.clientX - box.left) / box.width - 0.5) * 16}deg`);
    };
    art.onpointerleave = () => { art.style.removeProperty('--rx'); art.style.removeProperty('--ry'); };
  });
}
function setup() {
  show(stage('ANTES DE EMPEZAR','Prepara el salón',`<p>Ten a mano papel para las definiciones y los votos. Pausa la proyección al consultar el rol o registrar votos.</p><form class="panel"><div class="grid"><label>Número de equipos<input name="teams" type="number" min="3" max="12" value="5" required></label><label>Tiempo de escritura<select name="minutes"><option>2</option><option selected>3</option></select></label></div><div class="row"><button class="primary">Abrir primera ronda →</button></div></form>`), () => {
    screen.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      teams = Array.from({length: Number(data.get('teams'))}, (_, i) => i);
      points = teams.map(() => 0);
      minutes = Number(data.get('minutes'));
      order = shuffle(teams);
      round = 0;
      assign();
    };
  });
}
function assign() {
  const slot = round % teams.length;
  if (round && slot === 0) {
    const previous = infiltrator;
    order = shuffle(teams);
    if (order[0] === previous) [order[0], order[1]] = [order[1], order[0]];
  }
  infiltrator = order[slot];
  show(stage(phase('ROLES'),'Reparte los roles',`<p>Pausa la proyección y consulta el equipo infiltrado en privado. Entrega las tarjetas físicas antes de volver a proyectar.</p><div class="row"><button id="role">Consultar rol en privado</button></div><dialog id="secret"><form method="dialog"><button class="close" aria-label="Cerrar">×</button></form><p class="kicker">SOLO FACILITACIÓN</p><h2>Equipo ${infiltrator + 1}</h2><p>Entrega a este equipo la tarjeta «USEN IA» y a los demás «SIN IA».</p><form method="dialog"><button class="primary">Ocultar rol</button></form></dialog><div class="row">${button('Mostrar palabra →', true)}</div>`), () => {
    document.querySelector('#role').onclick = () => document.querySelector('#secret').showModal();
    onNext(write);
  });
}
function write() {
  const [word, context] = cases[round];
  show(stage(phase('ESCRITURA'),word,`<blockquote><span class="meta">CASO FICTICIO / COLOMBIA</span><br>${context}</blockquote><p>Definan el término sin mencionarlo. Entreguen una definición en papel por equipo.</p><div class="clock" id="clock">${number(minutes)}:00</div><p id="timer-status" role="status"></p><div class="row"><button id="start">Iniciar reloj</button>${button('Recoger definiciones →', true)}</div>`), () => {
    const clock = document.querySelector('#clock');
    const start = document.querySelector('#start');
    start.onclick = () => {
      start.disabled = true;
      deadline = Date.now() + minutes * 60000;
      timer = setInterval(() => {
        const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        clock.textContent = `${number(Math.floor(left / 60))}:${number(left % 60)}`;
        if (!left) {
          clearInterval(timer);
          document.querySelector('#timer-status').textContent = 'Tiempo terminado. Entreguen sus definiciones.';
        }
      }, 200);
    };
    onNext(collect);
  });
}
function collect() {
  show(stage(phase('RECOGIDA'),'Recoge las definiciones',`<p>Pausa la proyección mientras transcribes las respuestas para conservar el anonimato.</p><form><div class="grid">${teams.map(team => `<label>Equipo ${team + 1}<textarea rows="3" required maxlength="700"></textarea></label>`).join('')}</div><div class="row"><button class="primary">Mezclar y proyectar →</button></div></form>`), () => {
    const fields = [...screen.querySelectorAll('textarea')];
    fields.forEach(field => field.oninput = () => field.setCustomValidity(field.value.trim() ? '' : 'Escribe una definición.'));
    screen.querySelector('form').onsubmit = event => {
      event.preventDefault();
      entries = shuffle(fields.map((field, team) => ({team, definition: field.value.trim()})));
      read();
    };
  });
}
function cards() {
  return `<div class="grid">${entries.map((_, i) => `<article class="panel" data-card="${i}"><strong>Definición ${number(i + 1)}</strong><span></span></article>`).join('')}</div>`;
}
function fillCards() {
  screen.querySelectorAll('[data-card]').forEach((card, i) => card.querySelector('span').textContent = entries[i].definition);
}
function read() {
  show(stage(phase('LECTURA'),'Escuchen las versiones',`<p>Lean las definiciones. Antes de votar, pueden pedir un ejemplo breve sobre alguna de ellas. Cada equipo sin IA escribe en secreto el número que sospecha.</p>${cards()}<div class="row">${button('Registrar votos en privado →', true)}</div>`), () => { fillCards(); onNext(voteGate); });
}
function voteGate() {
  show(stage(phase('VOTACIÓN'),'Pausa la proyección',`<p>Recoge los votos en papel. Abre el formulario cuando solo tú puedas ver la pantalla.</p><div class="row">${button('Abrir formulario privado', true)}</div><dialog id="votes"><p class="kicker">SOLO FACILITACIÓN</p><h2>Registra los votos</h2><form><div class="grid">${teams.filter(team => team !== infiltrator).map(team => `<label>Equipo ${team + 1}<select required><option value="">Seleccionar</option>${entries.map((entry, i) => entry.team !== team ? `<option value="${i}">Definición ${number(i + 1)}</option>` : '').join('')}</select></label>`).join('')}</div><div class="row"><button class="primary">Confirmar y ocultar</button><button type="button" id="cancel">Cancelar</button></div></form></dialog>`), () => {
    const dialog = screen.querySelector('dialog');
    onNext(() => dialog.showModal());
    document.querySelector('#cancel').onclick = () => dialog.close();
    dialog.querySelector('form').onsubmit = event => {
      event.preventDefault();
      const voters = teams.filter(team => team !== infiltrator);
      const correct = [...dialog.querySelectorAll('select')].filter((select, i) => {
        if (entries[Number(select.value)].team !== infiltrator) return false;
        points[voters[i]] += 2;
        return true;
      }).length;
      const bonus = (correct === 0 ? 3 : 0) + (voters.length - correct > voters.length / 2 ? 2 : 0);
      points[infiltrator] += bonus;
      dialog.close();
      show(stage(phase('LISTO'),'Reanuda la proyección',`<p>Los votos quedaron registrados. El resultado está listo para mostrar al salón.</p><div class="row">${button('Revelar al infiltrado →', true)}</div>`), () => onNext(() => reveal(correct, bonus)));
    };
  });
}
function scoreboard() {
  return `<div class="grid">${[...teams].sort((a,b) => points[b] - points[a]).map(team => `<div class="panel"><strong>Equipo ${team + 1}</strong>${points[team]} puntos</div>`).join('')}</div>`;
}
function reveal(correct, bonus) {
  const index = entries.findIndex(entry => entry.team === infiltrator);
  show(stage(phase('REVELACIÓN'),`Equipo ${infiltrator + 1} usó IA`,`<p>Definición ${number(index + 1)} · ${correct} de ${teams.length - 1} equipos acertaron · El infiltrado suma ${bonus} puntos.</p>${cards()}<blockquote><span class="meta">PREGUNTA PARA EL SALÓN</span><br>${cases[round][2]}</blockquote><p class="kicker">MARCADOR ACUMULADO</p>${scoreboard()}<div class="row">${button(round === 4 ? 'Cerrar partida →' : 'Siguiente ronda →', true)}</div>`), () => {
    fillCards();
    screen.querySelector(`[data-card="${index}"]`).classList.add('winner');
    onNext(() => { if (round === 4) finish(); else { round++; assign(); } });
  });
}
function finish() {
  const leaders = teams.filter(team => points[team] === Math.max(...points)).map(team => team + 1);
  show(stage('05 / 05 · CIERRE', 'Antes de compartir',`<p>${leaders.length === 1 ? 'Ganó el equipo ' + leaders[0] : 'Empate entre los equipos ' + leaders.join(', ')}.</p>${scoreboard()}<blockquote>¿Qué pistas parecían pruebas? ¿Cómo verificarían un mensaje que les da rabia y que coincide con lo que ya creen?</blockquote><p>El estilo de un texto por sí solo no permite determinar su origen ni su veracidad. Antes de compartir contenido sobre un tema que divide opiniones, revisen la fuente, contrasten versiones y busquen el contexto completo.</p><div class="row">${button('Volver al inicio', true)}</div>`), () => onNext(home));
}
document.querySelector('#rules').onclick = () => help.showModal();
document.querySelector('#fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    alert('El navegador no pudo activar la pantalla completa.');
  }
};
home();
