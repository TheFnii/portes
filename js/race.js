// Écran « Course aux likes » : un chemin gradué, un peu courbé, avec les objectifs (paliers par
// personne : 10 000 likes, puis les suivants). Les photos de profil avancent sur le chemin avec
// le nombre de likes de chacun. Tant que personne n'a atteint l'objectif, l'écran s'arrête là
// (le chemin continue hors de l'écran) ; dès qu'il est atteint, la vue recule et l'objectif
// suivant apparaît. Utilisé sur la tablette, la page Broadcast et les téléphones des viewers.

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SVG = 'http://www.w3.org/2000/svg';
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
      <div class="race-stage"><svg class="race-svg" aria-hidden="true"></svg><div class="race-people"></div></div>`;
    this.svg = root.querySelector('.race-svg');
    this.people = root.querySelector('.race-people');
    this.stage = root.querySelector('.race-stage');
    this.els = new Map();
    this.lastMax = 0;
    window.addEventListener('resize', () => { if (this.data && root.offsetParent) this.update(this.data, this.opts); });
  }

  // data : { top: [{ id, name, value, avatar }], goals: [10000…] } ; opts : { title }
  update(data, opts = {}) {
    this.data = data;
    this.opts = opts;
    const W = this.stage.clientWidth;
    const H = this.stage.clientHeight;
    if (!W || !H) return;
    const top = (data.top || []).filter((u) => u.value > 0);
    const leader = top.length ? top[0].value : 0;
    const sc = raceScale(leader, data.goals);
    const vertical = H > W * 1.1;
    this.root.querySelector('.race-title').textContent = opts.title || 'Course aux likes';
    this.root.querySelector('.race-sub').textContent = `Prochain objectif : ${fmt(sc.max)} likes`;
    if (this.lastMax && sc.max > this.lastMax) {
      // La vue recule : l'objectif suivant apparaît.
      this.stage.classList.remove('dezoom');
      void this.stage.offsetWidth;
      this.stage.classList.add('dezoom');
    }
    this.lastMax = sc.max;

    // Le chemin (il continue au-delà de l'écran).
    // Une douce vague (Catmull-Rom → courbes de Bézier), de gauche à droite (ou de bas en haut).
    const P = (along, across) => (vertical ? [across * W, (1 - along) * H] : [along * W, across * H]);
    const amp = vertical ? 0.22 : 0.13;
    const mid = vertical ? 0.5 : 0.58;
    const p = [0.07, 0.28, 0.5, 0.74, 0.98, 1.2].map((a, k) => P(a, mid + (k % 2 ? -amp : amp) * (k === 0 ? 0.5 : 1)));
    let d = `M${p[0]}`;
    for (let k = 0; k < p.length - 1; k++) {
      const a = p[k - 1] || p[k];
      const b = p[k];
      const c = p[k + 1];
      const e = p[k + 2] || c;
      d += ` C${b[0] + (c[0] - a[0]) / 6},${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6},${c[1] - (e[1] - b[1]) / 6} ${c[0]},${c[1]}`;
    }
    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.innerHTML = `<defs><linearGradient id="race-fade" gradientUnits="userSpaceOnUse" x1="${vertical ? 0 : W * 0.8}" y1="${vertical ? H * 0.2 : 0}" x2="${vertical ? 0 : W * 1.05}" y2="${vertical ? -H * 0.05 : 0}">
      <stop offset="0" stop-color="var(--gold)" stop-opacity="1"/><stop offset="1" stop-color="var(--gold)" stop-opacity="0"/></linearGradient></defs>
      <path class="race-road" d="${d}"/><path class="race-line" d="${d}" stroke="url(#race-fade)"/>`;
    const path = this.svg.querySelector('.race-line');
    const len = path.getTotalLength();
    // Position de l'objectif : le plus loin possible en restant dans l'écran.
    let fEnd = 0.95;
    const inside = (pt) => (vertical ? pt.y >= H * 0.12 : pt.x <= W * 0.9);
    while (fEnd > 0.5 && !inside(path.getPointAtLength(len * fEnd))) fEnd -= 0.01;
    const at = (v) => path.getPointAtLength(len * fEnd * Math.min(1, Math.max(0, v / sc.max)));

    // Graduations et objectifs.
    const step = niceStep(sc.max);
    let marks = '';
    for (let v = step; v < sc.max; v += step) {
      const q = at(v);
      const major = Math.round(v / step) % 2 === 0;
      marks += `<circle class="race-tick${major ? ' major' : ''}" cx="${q.x}" cy="${q.y}" r="${major ? 5 : 3}"/>`;
      if (major) marks += `<text class="race-tick-label" x="${q.x}" y="${q.y + (vertical ? 4 : 26)}" ${vertical ? `dx="${q.x > W / 2 ? -14 : 14}" text-anchor="${q.x > W / 2 ? 'end' : 'start'}"` : 'text-anchor="middle"'}>${fmt(v)}</text>`;
    }
    const start = at(0);
    marks += `<circle class="race-start" cx="${start.x}" cy="${start.y}" r="9"/>`;
    sc.goals.forEach((g) => {
      const q = at(g);
      const reached = leader >= g;
      marks += `<g class="race-goal${reached ? ' reached' : ''}" transform="translate(${q.x} ${q.y})">
        <circle r="22"/><text class="race-goal-icon" y="8" text-anchor="middle">${reached ? '✓' : '★'}</text>
        <text class="race-goal-label" y="${vertical ? 0 : 56}" ${vertical ? `x="${q.x > W / 2 ? -34 : 34}" text-anchor="${q.x > W / 2 ? 'end' : 'start'}" dy="8"` : 'text-anchor="middle"'}>${fmt(g)}</text></g>`;
    });
    this.svg.insertAdjacentHTML('beforeend', marks);

    // Les participants : une bulle par personne, au-dessus ou en dessous du chemin
    // (sur plusieurs rangs quand ils sont proches).
    const size = Math.max(40, Math.min(110, Math.min(W, H) * (vertical ? 0.1 : 0.085)));
    this.root.style.setProperty('--race-b', `${size}px`);
    const seen = new Set();
    const placed = [];
    const free = (x, y) => placed.every(([px, py]) => Math.hypot(px - x, py - y) > size * 1.25);
    const order = [...top].sort((a, b) => b.value - a.value);
    order.forEach((u) => {
      const q = at(u.value);
      // Autour de son point du chemin : d'abord juste à côté (perpendiculaire au chemin),
      // puis en éventail, de plus en plus loin : la première place libre dans l'écran.
      const q2 = path.getPointAtLength(Math.min(len, len * fEnd * Math.min(1, u.value / sc.max) + 2));
      let tx = q2.x - q.x;
      let ty = q2.y - q.y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const nx = -ty;
      const ny = tx;
      const inBounds = (x, y) => x > size * 0.55 && x < W - size * 0.55 && y > size * 0.55 && y < H - size * 1.05;
      let bx = q.x + nx * size * -1.1;
      let by = q.y + ny * size * -1.1;
      search: for (let ring = 1; ring <= 5; ring++) {
        for (const a of [0, 180, 35, 145, -35, -145, 70, 110, -70, -110]) {
          const r = ring * size * 1.1;
          const c = Math.cos((a * Math.PI) / 180);
          const sn = Math.sin((a * Math.PI) / 180);
          // a = 0 : du côté « gauche » du chemin ; 180 : de l'autre côté.
          const x = q.x + (-nx * c + tx * sn) * r;
          const y = q.y + (-ny * c + ty * sn) * r;
          if (inBounds(x, y) && free(x, y)) { bx = x; by = y; break search; }
        }
      }
      bx = Math.min(W - size * 0.55, Math.max(size * 0.55, bx));
      by = Math.min(H - size * 1.05, Math.max(size * 0.55, by));
      placed.push([bx, by]);
      const id = String(u.id || u.name);
      seen.add(id);
      let el = this.els.get(id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'race-p';
        el.innerHTML = '<span class="race-pin"></span><span class="race-face"></span><span class="race-name"></span><span class="race-likes"></span>';
        this.people.appendChild(el);
        this.els.set(id, el);
        el.style.left = `${start.x}px`;
        el.style.top = `${start.y}px`;
        void el.offsetWidth;
      }
      const rank = top.indexOf(u) + 1;
      el.className = `race-p rank-${rank <= 3 ? rank : 'n'}${vertical ? ' v' : ''}`;
      const face = u.avatar
        ? `<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode('${esc((u.name || '?').slice(0, 1).toUpperCase())}'))">`
        : esc((u.name || '?').slice(0, 1).toUpperCase());
      const f = el.querySelector('.race-face');
      if (f.dataset.src !== (u.avatar || u.name)) { f.dataset.src = u.avatar || u.name; f.innerHTML = face; }
      el.querySelector('.race-name').textContent = u.name || '';
      el.querySelector('.race-likes').textContent = fmt(u.value);
      el.style.left = `${bx}px`;
      el.style.top = `${by}px`;
      // Petit trait jusqu'au point du chemin.
      const pin = el.querySelector('.race-pin');
      pin.style.width = `${Math.hypot(q.x - bx, q.y - by)}px`;
      pin.style.transform = `rotate(${Math.atan2(q.y - by, q.x - bx)}rad)`;
      el.style.zIndex = String(100 - rank);
    });
    this.els.forEach((el, id) => {
      if (!seen.has(id)) { el.remove(); this.els.delete(id); }
    });
  }
}
