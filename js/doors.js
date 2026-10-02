// Les 12 portes sur la scène : disposition en arc, compteurs, mise en avant, zoom et ouverture.

import { DOORS } from './doors-data.js';
import { buildDoor, OPENING_BOX } from './doors-art.js';
import { doorSlots, buildPlaza, LAYOUT } from './scene.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const MAX_FIGURES = 8;
const PER_ROW = 4;
const FIG_W = 22; // largeur d'un personnage + espacement (unités de la scène, avant échelle)
const FIG_H = 30;
const MORE_W = 54; // place du « +N »
const TAG_W = 30; // petit médaillon avec le numéro de la porte
const DOOR_W = 156; // largeur d'une porte (voir .door dans doors.css)
const DOOR_H = DOOR_W * (280 / 160);

// Zones à ne jamais recouvrir (unités de la scène) : titre, dé, bouton, panneaux du mode TikTok.
const FIXED_OBSTACLES = [
  { x0: 440, x1: 1060, y0: 395, y1: 575 },
  { x0: 650, x1: 850, y0: 690, y1: 850 },
  { x0: 560, x1: 940, y0: 885, y1: 975 },
  { x0: 262, x1: 562, y0: 610, y1: 910 },
  { x0: 938, x1: 1238, y0: 610, y1: 910 },
];

const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
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
      crowd.style.setProperty('--s', s.scale.toFixed(3));
      doorsEl.appendChild(crowd);
      el.crowd = crowd;
      return el;
    });
    // Contour visible de chaque porte (cadre + médaillon), pour placer les personnages à côté.
    this.doorRects = this.slots.map((s) => {
      const w = DOOR_W * s.scale;
      const h = DOOR_H * s.scale;
      return { x0: s.x - w * 0.47, x1: s.x + w * 0.47, y0: s.y - h * 0.9, y1: s.y + h * 0.04 };
    });
  }

  // Place tous les groupes de personnages, un par un : chaque groupe prend la place libre
  // la plus proche du seuil de sa porte, sans toucher les portes, le titre, le dé,
  // les panneaux ni les groupes déjà placés. Les plus grands groupes sont placés d'abord.
  placeCrowds(counts) {
    const placed = [];
    const order = this.slots.map((_, i) => i).filter((i) => counts[i + 1] > 0)
      .sort((a, b) => counts[b + 1] - counts[a + 1]);
    for (const i of order) {
      const s = this.slots[i];
      const c = counts[i + 1];
      const n = Math.min(c, MAX_FIGURES);
      const cols = Math.min(n, PER_ROW);
      const rows = Math.ceil(n / PER_ROW);
      const unscaledW = TAG_W + cols * FIG_W + (c > MAX_FIGURES ? MORE_W : 0);
      const w = unscaledW * s.scale;
      const h = rows * FIG_H * s.scale;
      const crowd = this.els[i].crowd;
      crowd.querySelector('.figs').style.width = `${cols * FIG_W}px`;

      // Chevaucher un autre groupe, le titre, le dé ou un panneau coûte très cher ;
      // effleurer le bord fleuri d'une porte coûte peu. Rester près de sa porte compte aussi.
      const heavy = FIXED_OBSTACLES.concat(placed);
      const light = this.doorRects.filter((_, k) => k !== i);
      const own = this.doorRects[i];
      const rect = (cx, cy) => ({ x0: cx - w / 2 - 3, x1: cx + w / 2 + 3, y0: cy - h / 2 - 3, y1: cy + h / 2 + 3 });
      const inside = (r) => r.x0 > 8 && r.x1 < LAYOUT.W - 8 && r.y0 > 70 && r.y1 < LAYOUT.H - 8;
      const area = (r, o) => Math.max(0, Math.min(r.x1, o.x1) - Math.max(r.x0, o.x0))
        * Math.max(0, Math.min(r.y1, o.y1) - Math.max(r.y0, o.y0));
      const overlap = (r) => heavy.reduce((t, o) => t + area(r, o) * 8, 0)
        + light.reduce((t, o) => t + area(r, o), 0) + area(r, own) * 8;

      // On part du seuil de la porte et on s'en éloigne en spirale.
      const bx = s.x;
      const by = s.y + 6 + h / 2;
      const toDice = Math.atan2(LAYOUT.dice.y - by, LAYOUT.dice.x - bx);
      let best = [bx, by];
      let bestScore = Infinity;
      for (let r = 0; r <= 300; r += 8) {
        if (r * 4 >= bestScore) break; // plus loin ne peut plus être meilleur
        const steps = r ? 24 : 1;
        for (let k = 0; k < steps; k++) {
          const a = toDice + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * ((2 * Math.PI) / steps);
          const cx = bx + Math.cos(a) * r;
          const cy = by + Math.sin(a) * r * 0.8;
          const box = rect(cx, cy);
          if (!inside(box)) continue;
          const score = overlap(box) + r * 4;
          if (score < bestScore) {
            bestScore = score;
            best = [cx, cy];
          }
        }
      }
      placed.push(rect(best[0], best[1]));
      crowd.style.left = `${best[0].toFixed(1)}px`;
      crowd.style.top = `${best[1].toFixed(1)}px`;
    }
  }

  el(n) {
    return this.els[n - 1];
  }

  data(n) {
    return DOORS[n - 1];
  }

  // Un petit personnage par participant, près de la porte choisie.
  setCounts(counts) {
    this.els.forEach((el, i) => {
      const { crowd } = el;
      const c = counts ? counts[i + 1] : 0;
      crowd.hidden = !counts || !c;
      if (!counts) {
        crowd.textContent = '';
        return;
      }
      if (!crowd.firstChild) {
        crowd.innerHTML = `<span class="crowd-tag">${i + 1}</span><span class="figs"></span><span class="more" hidden></span>`;
      }
      const box = crowd.querySelector('.figs');
      const shown = Math.min(c, MAX_FIGURES);
      const figs = box.querySelectorAll('.person');
      for (let k = figs.length; k < shown; k++) {
        const p = document.createElement('span');
        p.className = 'person';
        p.style.setProperty('--h', `${(k * 47) % 360}`);
        p.innerHTML = PERSON;
        box.appendChild(p);
      }
      for (let k = figs.length - 1; k >= shown; k--) figs[k].remove();
      const more = crowd.querySelector('.more');
      more.hidden = c <= MAX_FIGURES;
      more.textContent = `+${c - MAX_FIGURES}`;
    });
    if (counts) this.placeCrowds(counts);
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

  // Deux fermetures en même temps n'en font qu'une (sinon la porte restait cachée dans l'arc).
  close() {
    if (!this.focused) return Promise.resolve();
    if (!this.closing) {
      const n = this.focused;
      this.closing = (async () => {
        this.focusEl.classList.add('closing');
        document.body.classList.remove('focusing');
        await wait(550);
        this.focusEl.hidden = true;
        this.focusEl.classList.remove('closing');
        this.focusDoorEl.textContent = '';
        this.els.forEach((el) => { el.style.visibility = ''; });
        this.highlight(0);
        this.big = null;
        if (this.focused === n) this.focused = 0;
      })().finally(() => { this.closing = null; });
    }
    return this.closing;
  }
}
