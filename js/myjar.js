// « Mon bocal de likes » : on cherche un pseudo et on voit son bocal se remplir (jamais de
// nombre). Bocal plein : le bouchon se pose dessus avec un bruit de victoire, puis le bocal
// repart de zéro. Sur la page des viewers (bouton sous le Top Likes) et sur la tablette
// (bouton 🫙 de la case Top Likes).

import { Jar, jarOf } from './jar.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export class MyJarPanel {
  // getAll() → [[id, pseudo, likes], …] ; getGoal() → likes pour un bocal ; sound : Sound
  // (jarClose) ; storageKey : pseudo choisi, gardé sur l'appareil (null = pas gardé).
  constructor(root, { getAll, getGoal, sound, storageKey = null, title = '🫙 Mon bocal de likes', hint = '' }) {
    this.root = root;
    this.getAll = getAll;
    this.getGoal = getGoal;
    this.sound = sound;
    this.storageKey = storageKey;
    root.classList.add('v-jar-full');
    root.innerHTML = `<button class="icon-btn v-jar-close" type="button" aria-label="Fermer">✕</button>
      <h2 class="v-jar-title">${esc(title)}</h2>
      <div class="v-jar-search">
        <p class="v-jar-hint">${esc(hint || 'Cherchez votre pseudo pour voir votre bocal se remplir.')}</p>
        <input type="search" placeholder="Chercher un pseudo…" autocomplete="off" aria-label="Chercher un pseudo">
        <ul></ul>
      </div>
      <div class="v-jar-view" hidden>
        <p class="v-jar-name"></p>
        <div class="v-jar-box"></div>
        <p class="v-jar-text">Les likes remplissent le bocal. Bocal plein : une question gratuite en priorité, et il se remplit à nouveau !</p>
        <button class="btn btn-ghost v-jar-change" type="button">Changer de pseudo</button>
      </div>`;
    this.q = root.querySelector('input');
    this.list = root.querySelector('ul');
    this.jar = new Jar(root.querySelector('.v-jar-box'));
    this.id = null;
    this.seen = null; // { id, n } : bocaux remplis déjà vus pour ce pseudo
    try { this.id = storageKey ? localStorage.getItem(storageKey) : null; } catch (e) { this.id = null; }
    root.querySelector('.v-jar-close').addEventListener('click', () => this.close());
    this.q.addEventListener('input', () => this.renderList());
    this.list.addEventListener('click', (e) => {
      const b = e.target.closest('[data-jar]');
      if (b) this.pick(b.dataset.jar);
    });
    root.querySelector('.v-jar-change').addEventListener('click', () => { this.pick(null); this.q.focus(); });
  }

  get isOpen() { return !this.root.hidden; }

  setHint(text) { if (text) this.root.querySelector('.v-jar-hint').textContent = text; }

  open() {
    this.root.hidden = false;
    this.q.value = '';
    this.update();
  }

  close() {
    this.root.hidden = true;
    clearInterval(this.demoTimer);
  }

  pick(id) {
    this.id = id;
    this.seen = null;
    try {
      if (this.storageKey) { if (id) localStorage.setItem(this.storageKey, id); else localStorage.removeItem(this.storageKey); }
    } catch (e) { /* stockage indisponible */ }
    this.update();
  }

  // À appeler à chaque nouvel état du live.
  update() {
    if (!this.isOpen) return;
    this.root.querySelector('.v-jar-search').hidden = !!this.id;
    this.root.querySelector('.v-jar-view').hidden = !this.id;
    if (!this.id) { this.renderList(); return; }
    const row = (this.getAll() || []).find(([id]) => String(id) === this.id);
    this.root.querySelector('.v-jar-name').textContent = row ? row[1] : this.id;
    const { p, n } = jarOf(row ? row[2] : 0, this.getGoal());
    this.jar.set(p);
    if (this.seen && this.seen.id === this.id && n > this.seen.n) {
      this.jar.close({ sound: () => { if (this.sound) { this.sound.unlock(); this.sound.jarClose(); } } });
    }
    this.seen = { id: this.id, n };
  }

  renderList() {
    const q = norm(this.q.value.trim());
    const list = (this.getAll() || []).filter(([id, name]) => !q || norm(name).includes(q) || norm(id).includes(q)).slice(0, 60);
    this.list.innerHTML = list.length
      ? list.map(([id, name]) => `<li><button type="button" data-jar="${esc(id)}"><span>${esc(name)}</span><b>🫙</b></button></li>`).join('')
      : `<li class="empty">${q ? 'Personne avec ce pseudo pour l’instant (il faut avoir envoyé des likes)' : 'Personne n’a encore envoyé de likes'}</li>`;
  }

  // Démonstration : un pseudo fictif dont le bocal se remplit tout seul, se ferme, recommence.
  demo(name = 'Votre pseudo') {
    let likes = 0;
    this.getAll = () => [['demo', name, likes]];
    this.open();
    this.pick('demo');
    clearInterval(this.demoTimer);
    this.demoTimer = setInterval(() => {
      likes += Math.round(this.getGoal() * (0.03 + Math.random() * 0.05));
      this.update();
    }, 500);
  }
}
