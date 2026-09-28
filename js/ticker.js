// Bandeau des messages défilants, lus dans messages.json (modifiable sur GitHub).

import { MESSAGES_FILE, DEFAULT_SPEED } from './config.js';

export class Ticker {
  constructor(el, track) {
    this.el = el;
    this.track = track;
    this.messages = [];
    this.speed = DEFAULT_SPEED;
    this.enabled = false;
    window.addEventListener('resize', () => this.layout());
  }

  async load() {
    this.error = false;
    try {
      const res = await fetch(MESSAGES_FILE, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.messages;
      this.messages = (list || []).map((m) => String(m).trim()).filter(Boolean);
      const v = Number(data.vitesse);
      if (v > 5 && v < 1000) this.speed = v;
    } catch (e) {
      console.warn('messages.json illisible :', e);
      this.error = true;
      this.messages = [];
    }
    this.render();
  }

  render() {
    this.track.textContent = '';
    if (!this.messages.length) {
      this.update();
      return;
    }
    // Deux copies à la suite pour une boucle sans couture.
    for (let copy = 0; copy < 2; copy++) {
      const group = document.createElement('div');
      group.className = 'ticker-group';
      if (copy) group.setAttribute('aria-hidden', 'true');
      this.messages.forEach((m) => {
        const item = document.createElement('span');
        item.className = 'ticker-item';
        item.textContent = m;
        const sep = document.createElement('span');
        sep.className = 'ticker-sep';
        sep.textContent = '✦';
        group.append(item, sep);
      });
      this.track.append(group);
    }
    this.update();
    if (document.fonts) document.fonts.ready.then(() => this.layout());
  }

  layout() {
    const group = this.track.firstElementChild;
    if (!group) return;
    const w = group.getBoundingClientRect().width;
    if (!w) return;
    this.track.style.setProperty('--ticker-dur', `${(w / this.speed).toFixed(1)}s`);
  }

  setEnabled(on) {
    this.enabled = on;
    this.update();
  }

  update() {
    const show = this.enabled && this.messages.length > 0;
    this.el.classList.toggle('off', !show);
    if (show) requestAnimationFrame(() => this.layout());
  }
}
