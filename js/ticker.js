// Bandeau des messages défilants, lus dans messages.json (modifiable sur GitHub).

import { DEFAULT_SPEED } from './config.js';
import { loadMessages } from './messages.js';
import { rich } from './stickers.js';

export class Ticker {
  constructor(el, track, { speedFactor = 1 } = {}) {
    this.el = el;
    this.track = track;
    this.messages = [];
    this.speed = DEFAULT_SPEED;
    this.speedFactor = speedFactor;
    this.enabled = false;
    window.addEventListener('resize', () => this.layout());
  }

  async load() {
    const data = await loadMessages();
    this.error = data.error;
    this.source = data.source;
    this.setData(data.messages, data.speed);
  }

  setData(messages, speed) {
    this.messages = messages;
    this.speed = speed;
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
        item.innerHTML = rich(m);
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
    this.track.style.setProperty('--ticker-dur', `${(w / (this.speed * this.speedFactor)).toFixed(1)}s`);
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
