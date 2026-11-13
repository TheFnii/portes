// Écran « Bocaux de likes » (ancienne course aux likes) : les personnes qui envoient des likes,
// chacune avec sa photo, son pseudo et la jauge de son bocal (un petit cœur qui avance). Aucun
// nombre : l'objectif (Réglages → Bocal de likes) reste caché. Les pseudos suivis (loupe) sont
// mis en avant, en premier. Tablette, diaporama, Broadcast, viewers.

import { gauge, jarGoal } from './jar.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Réglages d'affichage (titre, texte sous les bocaux, tailles) + image de fond.
export const raceOpts = (s = {}, bg = null, focus = []) => ({
  focus,
  title: s.raceTitle, text: s.raceText, bg,
  photo: s.racePhoto, size: s.raceTextSize,
  goal: jarGoal(s),
});

export class Race {
  // render(texte) → HTML (autocollants) ; par défaut, texte simple.
  constructor(root, { render } = {}) {
    this.root = root;
    this.render = render || ((t) => esc(t).replace(/\n/g, '<br>'));
    root.classList.add('race');
    root.innerHTML = `<header class="race-head"><h2 class="race-title"></h2></header>
      <ol class="jar-grid"></ol><div class="race-note"></div>`;
    this.grid = root.querySelector('.jar-grid');
  }

  // data : { top: [{ id, name, value, avatar }], goal }
  // opts : { title, text, bg, focus, photo, size, goal }
  update(data, opts = {}) {
    this.data = data;
    this.opts = opts;
    const goal = opts.goal || (data && data.goal);
    const focus = new Set((opts.focus || []).map(String));
    const top = ((data && data.top) || []).filter((u) => u.value > 0)
      .sort((a, b) => (focus.has(String(b.id || b.name)) - focus.has(String(a.id || a.name))) || b.value - a.value);
    this.root.style.setProperty('--race-ph', ((Number(opts.photo) || 100) / 100).toFixed(2));
    this.root.style.setProperty('--race-tx', ((Number(opts.size) || 100) / 100).toFixed(2));
    this.root.querySelector('.race-title').innerHTML = this.render(opts.title || 'Bocaux de likes');
    this.root.style.backgroundImage = opts.bg ? `linear-gradient(rgba(0, 0, 0, .35), rgba(0, 0, 0, .35)), url("${opts.bg}")` : '';
    this.root.classList.toggle('race-has-bg', !!opts.bg);
    this.root.classList.toggle('jar-many', top.length > 12);

    const medals = ['🥇', '🥈', '🥉'];
    const html = top.length
      ? top.map((u, i) => {
        const id = String(u.id || u.name);
        const initial = esc((u.name || '?').slice(0, 1).toUpperCase());
        const face = u.avatar
          ? `<img src="${esc(u.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode('${initial}'))">`
          : initial;
        return `<li class="jar-card${focus.has(id) ? ' focus' : ''}${i < 3 ? ` rank-${i + 1}` : ''}">
          <span class="jar-rank">${medals[i] || i + 1}</span><span class="race-face">${face}</span>
          <span class="jar-who"><span class="jar-name">${esc(u.name || '')}</span><span class="gauge-row">${gauge(u.value, goal)}</span></span></li>`;
      }).join('')
      : '<li class="jar-empty">Envoyez des likes pour remplir votre bocal ❤</li>';
    if (this.grid.dataset.html !== html) { this.grid.dataset.html = html; this.grid.innerHTML = html; }
    const note = this.root.querySelector('.race-note');
    const noteHtml = opts.text ? this.render(opts.text) : '';
    if (note.dataset.html !== noteHtml) { note.dataset.html = noteHtml; note.innerHTML = noteHtml; }
  }
}
