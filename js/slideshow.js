// Diaporama (bouton 🌙) : les écrans choisis dans les Réglages passent en plein écran, chacun
// pendant son temps (Top Likes, course aux likes, message central, Top Gifters, messages
// défilants, vos textes, images et vidéos…), avec une phrase sous chacun si on veut.
// La tablette le lance ; la page Broadcast le suit écran par écran.

import { STORAGE } from './config.js';
import { rich } from './stickers.js';
import { esc } from './shell.js';
import { renderBoard, stopBoard } from './board.js';
import { Ticker } from './ticker.js';
import { Race } from './race.js';
import { bigRanking, endMessages, entryDetail, COIN } from './dashboard.js';

export const SLIDE_KINDS = {
  likes: { label: 'Top Likes', seconds: 10 },
  race: { label: 'Course aux likes', seconds: 12 },
  board: { label: 'Message central (case centrale)', seconds: 15 },
  gifters: { label: 'Top Gifters', seconds: 10 },
  ticker: { label: 'Messages défilants (bandeau)', seconds: 14 },
  pinned: { label: 'Message épinglé', seconds: 8 },
  list: { label: 'Liste à traiter', seconds: 10 },
  univ: { label: 'Messages de l’univers', seconds: 10 },
  end: { label: 'Message de fin de live', seconds: 15 },
  text: { label: 'Texte', seconds: 10 },
  image: { label: 'Image', seconds: 8 },
  video: { label: 'Vidéo', seconds: 0 },
};

const newId = () => Math.random().toString(36).slice(2, 10);

export function defaultSlides() {
  const on = { likes: true, race: true, board: true, gifters: true, ticker: true };
  return ['likes', 'race', 'board', 'gifters', 'ticker', 'pinned', 'list', 'univ', 'end'].map((kind) => ({
    id: kind, kind, on: !!on[kind], seconds: SLIDE_KINDS[kind].seconds, caption: '',
  }));
}

export function loadSlides() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE.slides) || 'null');
    if (Array.isArray(v)) {
      const list = v.filter((s) => s && SLIDE_KINDS[s.kind]);
      // Un écran ajouté dans une nouvelle version apparaît (désactivé) dans la liste.
      defaultSlides().forEach((d) => { if (!list.some((s) => s.kind === d.kind)) list.push({ ...d, on: false }); });
      return list;
    }
  } catch (e) { /* liste illisible */ }
  return defaultSlides();
}

export function saveSlides(list) {
  localStorage.setItem(STORAGE.slides, JSON.stringify(list));
}

export function newSlide(kind) {
  const id = newId();
  return { id, kind, on: true, seconds: SLIDE_KINDS[kind].seconds, caption: '', title: '', text: '', media: kind === 'image' || kind === 'video' ? `sld:${id}` : '' };
}

// Le texte prend la plus grande taille qui tient dans l'écran.
function fit(el, box, max) {
  let fs = max;
  el.style.fontSize = `${fs}px`;
  while (fs > 16 && (el.scrollHeight > box.clientHeight * 0.92 || el.scrollWidth > box.clientWidth + 1)) {
    fs -= 3;
    el.style.fontSize = `${fs}px`;
  }
}

export class Slideshow {
  // data() : état du live (comme celui envoyé aux viewers) ; mediaUrl(key) : adresse d'une image
  // ou d'une vidéo déposée (ou null) ; onStep(list, i) : à chaque écran.
  constructor(root, { data, mediaUrl, onStep = () => {} }) {
    this.root = root;
    this.data = data;
    this.mediaUrl = mediaUrl;
    this.onStep = onStep;
    this.list = [];
    this.index = 0;
    this.auto = true;
    this.cur = null;
    window.addEventListener('resize', () => { if (this.cur && this.cur.refresh) this.cur.refresh(this.data()); });
  }

  get active() {
    return !this.root.hidden;
  }

  // Écrans à montrer (activés, avec quelque chose à montrer).
  usable(list, st) {
    const s = st.settings || {};
    return list.filter((it) => {
      if (!it.on) return false;
      if (it.kind === 'pinned') return !!st.pinned;
      if (it.kind === 'univ') return (st.letters || []).length > 0;
      if (it.kind === 'end') return endMessages(s).length > 0 || !!s.endTitle;
      if (it.kind === 'board') return ((st.board && st.board.messages) || []).length > 0;
      if (it.kind === 'ticker') return ((st.ticker && st.ticker.messages) || []).length > 0;
      if (it.kind === 'text') return !!(it.title || it.text);
      if (it.kind === 'image' || it.kind === 'video') return !!it.media;
      return true;
    });
  }

  open(list = loadSlides()) {
    this.list = this.usable(list, this.data());
    if (!this.list.length) return false;
    this.auto = true;
    this.root.hidden = false;
    this.show(0);
    return true;
  }

  // Page Broadcast : montre l'écran que la tablette montre.
  follow(list, i) {
    if (!list || !list[i]) { if (this.active) this.close(); return; }
    const same = this.active && this.cur && this.cur.item.id === list[i].id && this.index === i;
    this.auto = false;
    this.list = list;
    this.root.hidden = false;
    if (same) { if (this.cur.refresh) this.cur.refresh(this.data()); return; }
    this.show(i);
  }

  close() {
    clearTimeout(this.timer);
    this.root.hidden = true;
    this.root.querySelectorAll('.slide').forEach((el) => this.dispose(el));
    this.root.textContent = '';
    this.cur = null;
  }

  // L'état du live a changé : l'écran affiché se met à jour (classements, course…).
  refresh() {
    if (this.active && this.cur && this.cur.refresh) this.cur.refresh(this.data());
  }

  next() {
    if (!this.list.length) return;
    this.show((this.index + 1) % this.list.length);
  }

  dispose(el) {
    if (el._ticker) el._ticker.setEnabled(false);
    el.querySelectorAll('.board-track').forEach((t) => stopBoard(t));
    el.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
  }

  async show(i) {
    clearTimeout(this.timer);
    const token = (this.token = (this.token || 0) + 1);
    this.index = i;
    const item = this.list[i];
    const st = this.data();
    const el = document.createElement('div');
    el.className = 'slide';
    const built = await this.build(el, item, st);
    if (token !== this.token || !this.active) return;
    if (!built) {
      // Rien à montrer (image effacée…) : écran suivant.
      if (this.auto && this.list.length > 1) this.timer = setTimeout(() => this.next(), 50);
      return;
    }
    if (item.caption) {
      const cap = document.createElement('p');
      cap.className = 'slide-caption';
      cap.innerHTML = rich(item.caption).replace(/\n/g, '<br>');
      el.appendChild(cap);
    }
    const old = [...this.root.querySelectorAll('.slide')];
    this.root.appendChild(el);
    old.forEach((o) => {
      o.classList.add('out');
      setTimeout(() => { this.dispose(o); o.remove(); }, 900);
    });
    this.cur = { item, el, refresh: built.refresh };
    requestAnimationFrame(() => { if (built.refresh) built.refresh(st); if (built.start) built.start(); });
    this.onStep(this.list, i);
    if (!this.auto) return;
    const video = el.querySelector('video');
    const secs = Number(item.seconds) || 0;
    if (video && !secs) {
      // Vidéo sans durée choisie : elle passe en entier.
      video.addEventListener('ended', () => { if (this.cur && this.cur.el === el) this.next(); }, { once: true });
      this.timer = setTimeout(() => this.next(), 5 * 60 * 1000);
    } else if (this.list.length > 1) {
      this.timer = setTimeout(() => this.next(), Math.max(3, secs || SLIDE_KINDS[item.kind].seconds || 8) * 1000);
    }
  }

  // Construit l'écran ; renvoie { refresh(st), start() } ou false.
  async build(el, item, st) {
    const s = st.settings || {};
    const kind = item.kind;
    if (kind === 'likes' || kind === 'gifters' || kind === 'list' || kind === 'univ') {
      el.classList.add('rank-full');
      const icon = { likes: '❤', gifters: '🎁', list: '', univ: '✉️' }[kind];
      el.innerHTML = `<div class="rank-full-card"><h2>${icon} <span class="t"></span></h2><p class="rank-full-total"></p><ol class="rank-full-list"></ol></div>`;
      const refresh = (d) => {
        const ss = d.settings || {};
        let title = '';
        let total = '';
        let html = '';
        if (kind === 'likes' || kind === 'gifters') {
          const r = (kind === 'likes' ? d.likesFull || d.likes : d.giftersFull || d.gifters) || {};
          title = kind === 'likes' ? ss.likesTitle || 'Top Likes' : ss.giftersTitle || 'Top Gifters';
          total = `${Math.round(r.total || 0).toLocaleString('fr-FR')} ${kind === 'likes' ? 'likes' : COIN}`;
          html = bigRanking(r.top || [], kind === 'gifters' ? COIN : '');
        } else if (kind === 'list') {
          title = d.title || '';
          const l = (d.list || []).slice(0, 10);
          html = l.length
            ? l.map((e, k) => `<li${k ? '' : ' class="now"'}><span class="medal">${k ? k + 1 : '▶'}</span><span class="name">${esc(e.name)}</span><span class="value small">${esc(entryDetail(e))}</span></li>`).join('')
            : `<li class="empty">${rich(ss.listEmpty || '')}</li>`;
        } else {
          title = ss.univTitle || 'Message de l’univers';
          html = (d.letters || []).slice(0, 10).map((e) => `<li><span class="medal">✉️</span><span class="name">${esc(e.name)}</span>${e.count > 1 ? `<span class="value">×${e.count}</span>` : ''}</li>`).join('');
        }
        el.querySelector('.t').innerHTML = rich(title);
        el.querySelector('.rank-full-total').innerHTML = total;
        el.querySelector('.rank-full-total').hidden = !total;
        const ol = el.querySelector('.rank-full-list');
        if (ol.dataset.html !== html) { ol.dataset.html = html; ol.innerHTML = html; }
      };
      refresh(st);
      return { refresh };
    }
    if (kind === 'race') {
      el.classList.add('race-full');
      const box = document.createElement('div');
      box.className = 'race-box';
      el.appendChild(box);
      const race = new Race(box);
      return { refresh: (d) => race.update(d.race || {}, { title: (d.settings || {}).raceTitle }) };
    }
    if (kind === 'board' || kind === 'end') {
      el.classList.add('board-full');
      if (kind === 'end') el.classList.add('end');
      el.innerHTML = `${kind === 'end' && s.endTitle ? `<h2 class="end-live-title">${rich(s.endTitle)}</h2>` : ''}<div class="board-full-window"><div class="board-track"></div></div>`;
      return {
        start: () => {
          const track = el.querySelector('.board-track');
          if (kind === 'end') renderBoard(track, endMessages(s), { speed: (s.endSpeed || 30) * 1.8, mode: s.endMode, seconds: s.endSeconds });
          else renderBoard(track, st.board.messages, { speed: (st.board.speed || 30) * 1.8, mode: s.boardMode, seconds: s.boardSeconds });
        },
      };
    }
    if (kind === 'ticker') {
      el.classList.add('screensaver');
      el.innerHTML = '<div class="ss-band"><div class="ticker-track"></div></div>';
      const t = new Ticker(el, el.querySelector('.ticker-track'), { speedFactor: 2.4 });
      el._ticker = t;
      t.setEnabled(true);
      return { start: () => t.setData(st.ticker.messages, st.ticker.speed || 30) };
    }
    if (kind === 'pinned' || kind === 'text') {
      el.classList.add('slide-text');
      const title = kind === 'pinned' ? '📌' : item.title;
      const text = kind === 'pinned' ? st.pinned : item.text;
      el.innerHTML = `<div class="slide-text-box">${title ? `<h2>${rich(title)}</h2>` : ''}${text ? `<p>${rich(text).replace(/\n/g, '<br>')}</p>` : ''}</div>`;
      return {
        refresh: (d) => {
          if (kind === 'pinned') {
            const p = el.querySelector('p');
            if (p && p.textContent !== d.pinned && d.pinned) p.innerHTML = rich(d.pinned);
          }
          fit(el.querySelector('.slide-text-box'), el, Math.round(Math.min(el.clientWidth, el.clientHeight) * 0.11));
        },
      };
    }
    if (kind === 'image' || kind === 'video') {
      const url = await this.mediaUrl(item.media);
      if (!url) return false;
      el.classList.add('slide-media-box');
      if (kind === 'image') {
        el.innerHTML = `<img class="slide-media" src="${esc(url)}" alt="">`;
        return {};
      }
      const v = document.createElement('video');
      v.className = 'slide-media';
      v.muted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.autoplay = true;
      v.loop = Number(item.seconds) > 0;
      v.src = url;
      el.appendChild(v);
      return { start: () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); } };
    }
    return false;
  }
}
