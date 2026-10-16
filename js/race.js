// Écran « Course aux likes » : une ligne de course ; les photos de profil sont les curseurs
// (elles peuvent se chevaucher) et avancent avec les likes de chacun. Sous la ligne, les
// paliers (10 000 likes, puis les suivants) avec le bonus expliqué (texte modifiable dans
// Réglages → Paliers de likes par personne). Tant que personne n'a atteint le palier, l'écran
// s'arrête là (la ligne continue un peu au-delà) ; dès qu'il est atteint, la vue recule et le
// palier suivant apparaît. Tablette, page Broadcast, téléphones des viewers.

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
  // render(texte) → HTML (autocollants) ; par défaut, texte simple.
  constructor(root, { render } = {}) {
    this.root = root;
    this.render = render || ((t) => esc(t).replace(/\n/g, '<br>'));
    root.classList.add('race');
    root.innerHTML = `<header class="race-head"><h2 class="race-title"></h2><p class="race-sub"></p></header>
      <div class="race-stage"><div class="race-wrap">
        <div class="race-line"></div><div class="race-fill"></div>
        <div class="race-ticks"></div><div class="race-flags"></div><div class="race-cursors"></div>
      </div><div class="race-goals"></div></div>`;
    this.stage = root.querySelector('.race-stage');
    this.wrap = root.querySelector('.race-wrap');
    this.cursors = new Map();
    this.lastMax = 0;
    window.addEventListener('resize', () => { if (this.data && root.offsetParent) this.update(this.data, this.opts); });
  }

  // data : { top: [{ id, name, value, avatar }], goals: [{ likes, text }] } ; opts : { title }
  update(data, opts = {}) {
    this.data = data;
    this.opts = opts;
    const top = (data.top || []).filter((u) => u.value > 0);
    const leader = top.length ? top[0].value : 0;
    const given = (data.goals || []).map((g) => (typeof g === 'object' ? g : { likes: g }));
    const texts = new Map(given.map((g) => [Number(g.likes), g.text || '']));
    const sc = raceScale(leader, given.map((g) => g.likes));
    // La ligne : de 0 à 88 % de la largeur pour le palier visé, puis elle continue.
    const END = 88;
    const at = (v) => Math.min(1, Math.max(0, v / sc.max)) * END;
    this.root.querySelector('.race-title').textContent = opts.title || 'Course aux likes';
    this.root.querySelector('.race-sub').innerHTML = `Prochain palier : <strong>${fmt(sc.max)}</strong> likes`;
    if (this.lastMax && sc.max > this.lastMax) {
      this.stage.classList.remove('dezoom');
      void this.stage.offsetWidth;
      this.stage.classList.add('dezoom');
    }
    this.lastMax = sc.max;
    this.wrap.style.setProperty('--lead', `${at(leader)}%`);

    // Graduations discrètes sur la ligne (des nombres espacés d'au moins 90 px).
    const wrapW = this.wrap.clientWidth || 1000;
    const step = niceStep(sc.max);
    const every = Math.max(1, Math.ceil(90 / ((step / sc.max) * (END / 100) * wrapW)));
    let ticks = '';
    for (let v = step; v < sc.max - step / 2; v += step) {
      const near = sc.goals.some((g) => Math.abs(v - g) / sc.max < 0.08);
      const label = !near && Math.round(v / step) % every === 0;
      ticks += `<span class="race-tick" style="--x:${at(v)}%">${label ? `<b>${fmt(v)}</b>` : ''}</span>`;
    }
    this.wrap.querySelector('.race-ticks').innerHTML = ticks;

    // Les paliers : un repère sur la ligne, et en dessous le palier et son bonus.
    const goals = sc.goals.map((g) => ({ v: g, x: at(g), reached: leader >= g, final: g === sc.max, text: texts.get(g) || '' }));
    this.wrap.querySelector('.race-flags').innerHTML = goals.map((g) => `<span class="race-flag${g.final ? ' final' : ''}${g.reached ? ' reached' : ''}" style="--x:${g.x}%">${g.reached ? '✓' : '🏁'}</span>`).join('');
    // Largeur de chaque carte : la place jusqu'au palier voisin ; trop serré → en liste.
    const W = this.stage.clientWidth || 1000;
    const widths = goals.map((g, i) => {
      const prev = i ? g.x - goals[i - 1].x : g.x * 2;
      const next = i < goals.length - 1 ? goals[i + 1].x - g.x : (100 - g.x) * 2;
      return Math.min(30, prev, next) * 0.96;
    });
    const asList = W < 640 || widths.some((w) => (w / 100) * W < 150);
    const box = this.root.querySelector('.race-goals');
    box.classList.toggle('as-list', asList);
    box.innerHTML = goals.map((g, i) => `<div class="race-goal${g.final ? ' final' : ''}${g.reached ? ' reached' : ''}" style="--x:${g.x}%;--w:${widths[i]}%">
      <span class="race-goal-v">${g.reached ? '✓ ' : g.final ? '🏁 ' : ''}${fmt(g.v)} likes</span>
      ${g.text ? `<span class="race-goal-t">${this.render(g.text)}</span>` : ''}</div>`).join('');

    // Les curseurs : la photo de chacun sur la ligne, likes et pseudo au-dessus (réglable).
    // Tous sur la ligne, au même niveau : ils se chevauchent quand ils se dépassent
    // (le mieux classé passe devant).
    const show = opts.label || 'both';
    this.root.classList.toggle('race-no-name', show === 'likes' || show === 'none');
    this.root.classList.toggle('race-no-likes', show === 'name' || show === 'none');
    const seen = new Set();
    [...top].sort((a, b2) => b2.value - a.value).forEach((u, rank) => {
      const x = at(u.value);
      const id = String(u.id || u.name);
      seen.add(id);
      let el = this.cursors.get(id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'race-c';
        el.innerHTML = '<span class="race-c-label"><span class="race-c-likes"></span><span class="race-c-name"></span></span><span class="race-face"></span><span class="race-c-stem"></span>';
        el.style.setProperty('--x', '0%');
        this.wrap.querySelector('.race-cursors').appendChild(el);
        this.cursors.set(id, el);
        void el.offsetWidth;
      }
      el.className = `race-c rank-${rank < 3 ? rank + 1 : 'n'}`;
      el.style.setProperty('--x', `${x}%`);
      el.style.zIndex = String(50 - rank);
      el.querySelector('.race-c-name').textContent = u.name || '';
      el.querySelector('.race-c-likes').textContent = fmt(u.value);
      const face = el.querySelector('.race-face');
      const key = u.avatar || u.name;
      if (face.dataset.src !== key) {
        face.dataset.src = key;
        const initial = esc((u.name || '?').slice(0, 1).toUpperCase());
        face.innerHTML = u.avatar
          ? `<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode('${initial}'))">`
          : initial;
      }
    });
    this.cursors.forEach((el, id) => {
      if (!seen.has(id)) { el.remove(); this.cursors.delete(id); }
    });
  }
}
