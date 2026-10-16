// Écran « Course aux likes » : une course en couloirs. Chaque personne a sa ligne (classées du
// premier au dernier) ; sa photo avance vers la ligne d'arrivée, l'objectif (paliers par
// personne : 10 000 likes, puis les suivants), avec son nombre de likes. Graduations discrètes
// en haut. Tant que personne n'a atteint l'objectif, l'écran s'arrête là (la piste continue un
// peu au-delà) ; dès qu'il est atteint, la vue recule et l'objectif suivant apparaît.
// Utilisé sur la tablette, la page Broadcast et les téléphones des viewers.

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmt = (n) => Math.round(n).toLocaleString('fr-FR');

// Limite de la vue : le premier objectif que le premier n'a pas encore atteint. Après les
// paliers réglés, la course continue : 20 000, 50 000, 100 000, 200 000…
export function raceScale(leader, goals) {
  const list = [...new Set((goals || []).map(Number).filter((g) => g > 0))].sort((a, b) => a - b);
  if (!list.length) list.push(10000);
  while (list[list.length - 1] <= leader) list.push(nextRound(list[list.length - 1]));
  const target = list.find((g) => g > leader);
  return { max: target, goals: list.filter((g) => g <= target) };
}

// Objectif rond suivant : 1, 2, 5, 10, 20, 50…
function nextRound(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10, 20].map((k) => k * p).find((k) => k > v);
}

function niceStep(max) {
  const raw = max / 10;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= raw);
}

export class Race {
  constructor(root) {
    this.root = root;
    root.classList.add('race');
    root.innerHTML = `<header class="race-head"><h2 class="race-title"></h2><p class="race-sub"></p></header>
      <div class="race-board"><div class="race-scale"></div><div class="race-lanes"><div class="race-marks"></div></div></div>`;
    this.board = root.querySelector('.race-board');
    this.scale = root.querySelector('.race-scale');
    this.lanes = root.querySelector('.race-lanes');
    this.marks = root.querySelector('.race-marks');
    this.rows = new Map();
    this.lastMax = 0;
    window.addEventListener('resize', () => { if (this.data && root.offsetParent) this.update(this.data, this.opts); });
  }

  // data : { top: [{ id, name, value, avatar }], goals: [10000…] } ; opts : { title }
  update(data, opts = {}) {
    this.data = data;
    this.opts = opts;
    const top = (data.top || []).filter((u) => u.value > 0);
    const leader = top.length ? top[0].value : 0;
    const sc = raceScale(leader, data.goals);
    // La piste va jusqu'à 90 % de la largeur : l'objectif, puis un bout de piste au-delà.
    const END = 90;
    const pos = (v) => (Math.min(1, Math.max(0, v / sc.max)) * END).toFixed(2);
    this.root.querySelector('.race-title').textContent = opts.title || 'Course aux likes';
    this.root.querySelector('.race-sub').innerHTML = `Objectif : <strong>${fmt(sc.max)}</strong> likes`;
    if (this.lastMax && sc.max > this.lastMax) {
      // La vue recule : l'objectif suivant apparaît.
      this.board.classList.remove('dezoom');
      void this.board.offsetWidth;
      this.board.classList.add('dezoom');
    }
    this.lastMax = sc.max;

    // Graduations (en haut) et lignes des objectifs (sur toute la hauteur).
    const step = niceStep(sc.max);
    let scale = '';
    let marks = '';
    // Assez de place entre deux nombres : un sur deux (un sur quatre sur téléphone), et jamais
    // collé à un objectif.
    const every = this.scale.clientWidth && this.scale.clientWidth < 600 ? 4 : 2;
    const nearGoal = (v) => sc.goals.some((g) => Math.abs(v - g) / sc.max < (every === 4 ? 0.2 : 0.12));
    for (let v = step; v < sc.max - step / 2; v += step) {
      const major = Math.round(v / step) % 2 === 0;
      if (Math.round(v / step) % every === 0 && !nearGoal(v)) scale += `<span class="race-tick" style="--x:${pos(v)}%">${fmt(v)}</span>`;
      marks += `<span class="race-grid${major ? ' major' : ''}" style="--x:${pos(v)}%"></span>`;
    }
    sc.goals.forEach((g) => {
      const final = g === sc.max;
      scale += `<span class="race-goal-label${final ? ' final' : ''}" style="--x:${pos(g)}%">${final ? '🏁 ' : '✓ '}${fmt(g)}</span>`;
      marks += `<span class="race-goal-line${final ? ' final' : ''}" style="--x:${pos(g)}%"></span>`;
    });
    this.scale.innerHTML = scale;
    this.marks.innerHTML = marks;

    // Une ligne par personne, du premier au dernier ; elles glissent quand on se dépasse.
    const n = Math.max(top.length, 1);
    this.root.style.setProperty('--race-n', n);
    const seen = new Set();
    top.forEach((u, i) => {
      const id = String(u.id || u.name);
      seen.add(id);
      let row = this.rows.get(id);
      if (!row) {
        row = document.createElement('div');
        row.className = 'race-row';
        row.innerHTML = `<span class="race-rank"></span><span class="race-name"></span>
          <span class="race-track"><span class="race-fill"></span><span class="race-runner"><span class="race-face"></span><span class="race-likes"></span></span></span>`;
        row.style.setProperty('--i', i);
        row.style.setProperty('--p', '0%');
        this.lanes.appendChild(row);
        this.rows.set(id, row);
        void row.offsetWidth;
      }
      row.className = `race-row rank-${i < 3 ? i + 1 : 'n'}${u.value / sc.max > 0.72 ? ' flip' : ''}`;
      row.style.setProperty('--i', i);
      row.style.setProperty('--p', `${pos(u.value)}%`);
      row.querySelector('.race-rank').textContent = ['🥇', '🥈', '🥉'][i] || String(i + 1);
      row.querySelector('.race-name').textContent = u.name || '';
      row.querySelector('.race-likes').textContent = fmt(u.value);
      const face = row.querySelector('.race-face');
      const key = u.avatar || u.name;
      if (face.dataset.src !== key) {
        face.dataset.src = key;
        const initial = esc((u.name || '?').slice(0, 1).toUpperCase());
        face.innerHTML = u.avatar
          ? `<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode('${initial}'))">`
          : initial;
      }
    });
    this.rows.forEach((row, id) => {
      if (!seen.has(id)) { row.remove(); this.rows.delete(id); }
    });
    this.root.classList.toggle('race-empty', !top.length);
  }
}
