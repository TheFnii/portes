// Les 12 portes sur la scène : disposition en arc, compteurs, mise en avant, zoom et ouverture.

import { DOORS } from './doors-data.js';
import { buildDoor, OPENING_BOX } from './doors-art.js';
import { doorSlots, buildPlaza } from './scene.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const MAX_FIGURES = 12;
const PERSON = '<svg viewBox="0 0 12 18" aria-hidden="true"><circle cx="6" cy="3.6" r="3.2"/><path d="M0.6,18 C0.6,10 11.4,10 11.4,18Z"/></svg>';

export class DoorStage {
  constructor({ doorsEl, plaza, focusEl, focusDoorEl }) {
    this.focusEl = focusEl;
    this.focusDoorEl = focusDoorEl;
    this.slots = doorSlots(DOORS.length);
    buildPlaza(plaza, this.slots);
    this.els = DOORS.map((d, i) => {
      const el = buildDoor(d);
      const s = this.slots[i];
      el.style.left = `${s.x}px`;
      el.style.top = `${s.y}px`;
      el.style.setProperty('--s', s.scale.toFixed(3));
      el.style.setProperty('--i', i);
      el.style.zIndex = Math.round(s.y);
      doorsEl.appendChild(el);
      // Les personnages sont sur un calque au-dessus des portes, pour ne jamais être cachés.
      const crowd = document.createElement('div');
      crowd.className = 'door-crowd';
      crowd.hidden = true;
      crowd.style.left = `${s.x}px`;
      crowd.style.top = `${s.y}px`;
      crowd.style.setProperty('--s', s.scale.toFixed(3));
      doorsEl.appendChild(crowd);
      el.crowd = crowd;
      return el;
    });
  }

  el(n) {
    return this.els[n - 1];
  }

  data(n) {
    return DOORS[n - 1];
  }

  // Un petit personnage par participant, devant la porte choisie.
  setCounts(counts) {
    this.els.forEach((el, i) => {
      const { crowd } = el;
      const c = counts ? counts[i + 1] : 0;
      crowd.hidden = !counts;
      if (!counts) {
        crowd.textContent = '';
        return;
      }
      const shown = Math.min(c, MAX_FIGURES);
      const figs = crowd.querySelectorAll('.person');
      for (let k = figs.length; k < shown; k++) {
        const p = document.createElement('span');
        p.className = 'person';
        p.style.setProperty('--h', `${(k * 47) % 360}`);
        p.innerHTML = PERSON;
        crowd.insertBefore(p, crowd.querySelector('.more'));
      }
      for (let k = figs.length - 1; k >= shown; k--) figs[k].remove();
      let more = crowd.querySelector('.more');
      if (c > MAX_FIGURES) {
        if (!more) {
          more = document.createElement('span');
          more.className = 'more';
          crowd.appendChild(more);
        }
        more.textContent = `+${c - MAX_FIGURES}`;
      } else if (more) {
        more.remove();
      }
    });
  }

  highlight(n) {
    this.els.forEach((el, i) => el.classList.toggle('chosen', i + 1 === n));
  }

  // Zoom : la porte quitte l'arc et vient se placer en grand au centre de l'écran.
  async focus(n) {
    const src = this.el(n);
    const from = src.getBoundingClientRect();
    const box = this.focusDoorEl;
    box.textContent = '';
    box.classList.remove('split');
    const h = Math.min(window.innerHeight * 0.8, window.innerWidth * 0.62 * (280 / 160));
    const w = h * (160 / 280);
    box.style.width = `${w}px`;
    box.style.height = `${h}px`;
    const big = buildDoor(this.data(n));
    big.style.setProperty('--w', `${w}px`);
    big.classList.add('chosen');
    box.appendChild(big);
    this.focusEl.hidden = false;
    this.focusEl.classList.remove('closing');

    const to = box.getBoundingClientRect();
    const k = from.width / to.width;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    box.style.transition = 'none';
    box.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`;
    void box.offsetWidth;
    src.style.visibility = 'hidden';
    document.body.classList.add('focusing');
    box.style.transition = '';
    box.style.transform = '';
    this.big = big;
    this.focused = n;
    await wait(1250);
  }

  open() {
    if (this.big) this.big.classList.add('open');
  }

  // Rectangle de l'ouverture (pour les particules).
  openingRect() {
    const r = this.big.getBoundingClientRect();
    return {
      left: r.left + r.width * OPENING_BOX.x,
      top: r.top + r.height * OPENING_BOX.y,
      width: r.width * OPENING_BOX.w,
      height: r.height * OPENING_BOX.h,
      get right() { return this.left + this.width; },
      get bottom() { return this.top + this.height; },
    };
  }

  split() {
    this.focusDoorEl.classList.add('split');
  }

  async close() {
    if (!this.focused) return;
    this.focusEl.classList.add('closing');
    document.body.classList.remove('focusing');
    await wait(550);
    this.focusEl.hidden = true;
    this.focusEl.classList.remove('closing');
    this.focusDoorEl.textContent = '';
    this.el(this.focused).style.visibility = '';
    this.highlight(0);
    this.big = null;
    this.focused = 0;
  }
}
