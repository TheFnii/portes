// Écran « Course aux likes » : une ligne en forme de chemin ; les photos de profil sont les
// curseurs, toutes au même niveau (elles se chevauchent quand elles se dépassent), avec les
// likes de chacun. L'affichage suit le TOTAL des likes du live : tant qu'il n'a pas atteint le
// premier palier (10 000), la ligne va jusqu'à 10 000 ; ensuite jusqu'au palier suivant
// (50 000…), les paliers franchis restant à leur place. Sous chaque palier, son texte ; sous la
// ligne, un texte libre ; une image de fond au choix (Réglages). Tablette, Broadcast, viewers.

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Math.round(n).toLocaleString('fr-FR');

// Fin de la ligne. follow : le premier palier que le total des likes du live n'a pas encore
// atteint (une fois le dernier dépassé, on reste sur le dernier) ; sinon toujours le dernier
// palier réglé. Jamais d'autres paliers que ceux des Réglages.
export function raceScale(total, goals, follow = true) {
  const list = [...new Set((goals || []).map(Number).filter((g) => g > 0))].sort((a, b) => a - b);
  if (!list.length) list.push(10000);
  const last = list[list.length - 1];
  const max = follow ? (list.find((g) => g > total) || last) : last;
  return { max, goals: list.filter((g) => g <= max) };
}

// Paliers par défaut de la course (total des likes du live).
export const DEFAULT_RACE_GOALS = [{ likes: 10000, text: '' }, { likes: 50000, text: '' }, { likes: 100000, text: '' }];

// Réglages d'affichage (titre, étiquettes, texte sous la ligne) + image de fond.
export const raceOpts = (s = {}, bg = null) => ({
  title: s.raceTitle, label: s.raceLabel, text: s.raceText, bg,
  follow: s.raceView !== 'fixed', photo: s.racePhoto, size: s.raceTextSize,
});

export class Race {
  // render(texte) → HTML (autocollants) ; par défaut, texte simple.
  constructor(root, { render } = {}) {
    this.root = root;
    this.render = render || ((t) => esc(t).replace(/\n/g, '<br>'));
    root.classList.add('race');
    root.innerHTML = `<header class="race-head"><h2 class="race-title"></h2><p class="race-sub"></p></header>
      <div class="race-stage"><div class="race-wrap">
        <div class="race-path"></div><div class="race-fill"></div>
        <div class="race-flags"></div><div class="race-cursors"></div>
      </div><div class="race-note"></div></div>`;
    this.stage = root.querySelector('.race-stage');
    this.wrap = root.querySelector('.race-wrap');
    this.cursors = new Map();
    this.lastMax = 0;
  }

  // data : { total, top: [{ id, name, value, avatar }], goals: [{ likes, text }] }
  // opts : { title, label: 'both' | 'likes' | 'name' | 'none', text, bg }
  update(data, opts = {}) {
    this.data = data;
    this.opts = opts;
    const top = (data.top || []).filter((u) => u.value > 0);
    const total = Number(data.total) || (top.length ? top[0].value : 0);
    const given = (data.goals || []).map((g) => (typeof g === 'object' ? g : { likes: g }));
    const texts = new Map(given.map((g) => [Number(g.likes), g.text || '']));
    const sc = raceScale(total, given.map((g) => g.likes), opts.follow !== false);
    this.root.style.setProperty('--race-ph', ((Number(opts.photo) || 100) / 100).toFixed(2));
    this.root.style.setProperty('--race-tx', ((Number(opts.size) || 100) / 100).toFixed(2));
    // Le palier visé tout à droite ; le chemin continue un peu au-delà.
    const END = 92;
    const at = (v) => Math.min(1, Math.max(0, v / sc.max)) * END;
    this.root.querySelector('.race-title').textContent = opts.title || 'Course aux likes';
    // Ligne fixe (objectif de chacun) : la barre dorée et les ✓ suivent le premier de la course ;
    // sinon, le total du live.
    const follow = opts.follow !== false;
    const prog = follow ? total : (top.length ? top[0].value : 0);
    this.root.querySelector('.race-sub').innerHTML = !follow
      ? `Objectif : <strong>${fmt(sc.max)}</strong> likes`
      : total >= sc.max ? `<strong>${fmt(total)}</strong> likes` : `<strong>${fmt(total)}</strong> likes · prochain palier : <strong>${fmt(sc.max)}</strong>`;
    this.root.style.backgroundImage = opts.bg ? `linear-gradient(rgba(0, 0, 0, .35), rgba(0, 0, 0, .35)), url("${opts.bg}")` : '';
    this.root.classList.toggle('race-has-bg', !!opts.bg);
    if (this.lastMax && sc.max > this.lastMax) {
      // Palier franchi : la vue recule, le suivant apparaît tout à droite.
      this.stage.classList.remove('dezoom');
      void this.stage.offsetWidth;
      this.stage.classList.add('dezoom');
    }
    this.lastMax = sc.max;
    this.wrap.style.setProperty('--lead', `${at(prog)}%`);

    // Les paliers sur la ligne, avec leur texte juste en dessous.
    this.wrap.querySelector('.race-flags').innerHTML = sc.goals.map((g) => {
      const reached = prog >= g;
      const text = texts.get(g) || '';
      return `<div class="race-flag${g === sc.max ? ' final' : ''}${reached ? ' reached' : ''}${at(g) > 75 ? ' at-end' : ''}" style="--x:${at(g)}%">
        <span class="race-flag-dot">${reached ? '✓' : '🏁'}</span>
        <span class="race-flag-v">${fmt(g)}</span>${text ? `<span class="race-flag-t">${this.render(text)}</span>` : ''}</div>`;
    }).join('');
    const note = this.root.querySelector('.race-note');
    const noteHtml = opts.text ? this.render(opts.text) : '';
    if (note.dataset.html !== noteHtml) { note.dataset.html = noteHtml; note.innerHTML = noteHtml; }

    // Les curseurs : tous sur la ligne, au même niveau ; le mieux classé passe devant.
    const show = opts.label || 'both';
    this.root.classList.toggle('race-no-name', show === 'likes' || show === 'none');
    this.root.classList.toggle('race-no-likes', show === 'name' || show === 'none');
    const seen = new Set();
    [...top].sort((a, b) => b.value - a.value).forEach((u, rank) => {
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
      el.style.setProperty('--x', `${at(u.value)}%`);
      el.style.zIndex = String(500 - rank);
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
