// Radio du tableau de bord : lit en continu la playlist Suno du Grimoire.
// Toucher le lecteur ouvre un mini-menu : volume et playlist (toucher un titre le joue).

import { RADIO_PLAYLIST_URL, RADIO_AUDIO, RADIO_FALLBACK, STORAGE } from './config.js';
import { load, save } from './prefs.js';
import { esc } from './shell.js';

export class Radio {
  constructor(el) {
    this.el = el;
    this.tracks = RADIO_FALLBACK;
    this.index = Number(load(STORAGE.radio, 0)) || 0;
    this.baseVolume = Math.min(1, Math.max(0, Number(load(STORAGE.radioVolume, 0.7))));
    this.ducked = false;
    this.audio = new Audio();
    this.audio.preload = 'none';
    this.audio.volume = this.baseVolume;
    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('error', () => { if (this.playing) setTimeout(() => this.next(), 800); });
    this.audio.addEventListener('playing', () => this.render());
    this.audio.addEventListener('pause', () => this.render());
    this.playing = false;

    el.innerHTML = `
      <button class="radio-open" type="button" aria-label="Volume et playlist" aria-expanded="false">
        <span class="radio-disc" aria-hidden="true"></span>
        <span class="radio-info"><small>Radio</small><strong class="radio-title"></strong></span>
      </button>
      <div class="radio-buttons">
        <button class="icon-btn small" data-radio="prev" type="button" aria-label="Morceau précédent">⏮</button>
        <button class="icon-btn radio-play" data-radio="play" type="button" aria-label="Lecture">▶</button>
        <button class="icon-btn small" data-radio="next" type="button" aria-label="Morceau suivant">⏭</button>
      </div>
      <div class="radio-menu" hidden>
        <header>
          <button class="icon-btn small" data-radio="close" type="button" aria-label="Fermer">←</button>
          <h3>Radio</h3>
        </header>
        <label class="radio-volume"><span aria-hidden="true">🔈</span>
          <input type="range" min="0" max="100" step="1" aria-label="Volume"><span aria-hidden="true">🔊</span></label>
        <ol class="radio-playlist"></ol>
      </div>`;
    this.menu = el.querySelector('.radio-menu');
    this.vol = el.querySelector('.radio-volume input');
    this.vol.value = Math.round(this.baseVolume * 100);
    this.vol.addEventListener('input', () => this.setVolume(this.vol.value / 100));

    el.addEventListener('click', (e) => {
      if (e.target.closest('.radio-open')) {
        this.toggleMenu();
        return;
      }
      const t = e.target.closest('[data-track]');
      if (t) {
        this.index = Number(t.dataset.track);
        save(STORAGE.radio, this.index);
        this.play();
        this.renderList();
        return;
      }
      const b = e.target.closest('[data-radio]');
      if (!b) return;
      const a = b.dataset.radio;
      if (a === 'play') this.toggle();
      else if (a === 'next') this.next();
      else if (a === 'prev') this.prev();
      else if (a === 'close') this.closeMenu();
    });
    // Toucher en dehors du menu le ferme.
    document.addEventListener('pointerdown', (e) => {
      if (!this.menu.hidden && !e.target.closest('.radio')) this.closeMenu();
    });
    this.render();
    this.loadPlaylist();
  }

  async loadPlaylist() {
    try {
      const res = await fetch(RADIO_PLAYLIST_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      const tracks = (data.radio && data.radio.tracks || []).filter((t) => t && t.id);
      if (tracks.length) this.tracks = tracks;
    } catch (e) { /* playlist de secours */ }
    this.index %= this.tracks.length;
    this.render();
  }

  get track() {
    return this.tracks[this.index % this.tracks.length];
  }

  play() {
    const t = this.track;
    if (!t) return;
    const src = RADIO_AUDIO(t.id);
    if (this.audio.src !== src) this.audio.src = src;
    this.playing = true;
    this.audio.play().catch(() => { this.playing = false; this.render(); });
    this.render();
  }

  pause() {
    this.playing = false;
    this.audio.pause();
    this.render();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  step(d) {
    this.index = (this.index + d + this.tracks.length) % this.tracks.length;
    save(STORAGE.radio, this.index);
    if (this.playing) this.play();
    else this.render();
  }

  next() { this.step(1); }

  prev() { this.step(-1); }

  setVolume(v) {
    this.baseVolume = v;
    save(STORAGE.radioVolume, v.toFixed(2));
    this.audio.volume = this.ducked ? v * 0.3 : v;
  }

  // Baisse le volume pendant le Jeu des Portes (les effets sonores restent audibles).
  duck(on) {
    this.ducked = on;
    this.audio.volume = on ? this.baseVolume * 0.3 : this.baseVolume;
  }

  toggleMenu() {
    if (this.menu.hidden) this.openMenu();
    else this.closeMenu();
  }

  openMenu() {
    this.renderList();
    this.menu.hidden = false;
    this.el.querySelector('.radio-open').setAttribute('aria-expanded', 'true');
    const cur = this.menu.querySelector('.current');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }

  closeMenu() {
    this.menu.hidden = true;
    this.el.querySelector('.radio-open').setAttribute('aria-expanded', 'false');
  }

  renderList() {
    this.menu.querySelector('.radio-playlist').innerHTML = this.tracks.map((t, i) =>
      `<li><button type="button" data-track="${i}" class="${i === this.index % this.tracks.length ? 'current' : ''}">
        <span class="num">${i + 1}</span><span>${esc(t.title)}</span></button></li>`).join('');
  }

  render() {
    this.el.classList.toggle('playing', this.playing);
    // Le titre s'affiche quand la radio est allumée.
    this.el.querySelector('.radio-title').textContent = this.playing && this.track ? this.track.title : 'Éteinte';
    const b = this.el.querySelector('.radio-play');
    b.textContent = this.playing ? '⏸' : '▶';
    b.setAttribute('aria-label', this.playing ? 'Pause' : 'Lecture');
    if (!this.menu.hidden) this.renderList();
  }
}
