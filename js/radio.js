// Radio du tableau de bord : lit en continu la playlist Suno du Grimoire.

import { RADIO_PLAYLIST_URL, RADIO_AUDIO, RADIO_FALLBACK, STORAGE } from './config.js';
import { load, save } from './prefs.js';

export class Radio {
  constructor(el) {
    this.el = el;
    this.tracks = RADIO_FALLBACK;
    this.index = Number(load(STORAGE.radio, 0)) || 0;
    this.audio = new Audio();
    this.audio.preload = 'none';
    this.audio.volume = 0.7;
    this.baseVolume = 0.7;
    this.audio.addEventListener('ended', () => this.next());
    this.audio.addEventListener('error', () => { if (this.playing) setTimeout(() => this.next(), 800); });
    this.audio.addEventListener('playing', () => this.render());
    this.audio.addEventListener('pause', () => this.render());
    this.playing = false;

    el.innerHTML = `
      <div class="radio-disc" aria-hidden="true"><span></span></div>
      <div class="radio-info"><small>Radio</small><strong class="radio-title"></strong></div>
      <div class="radio-buttons">
        <button class="icon-btn small" data-radio="prev" type="button" aria-label="Morceau précédent">⏮</button>
        <button class="icon-btn radio-play" data-radio="play" type="button" aria-label="Lecture">▶</button>
        <button class="icon-btn small" data-radio="next" type="button" aria-label="Morceau suivant">⏭</button>
      </div>`;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-radio]');
      if (!b) return;
      if (b.dataset.radio === 'play') this.toggle();
      else if (b.dataset.radio === 'next') this.next();
      else this.prev();
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

  next() {
    this.index = (this.index + 1) % this.tracks.length;
    save(STORAGE.radio, this.index);
    if (this.playing) this.play();
    else this.render();
  }

  prev() {
    this.index = (this.index - 1 + this.tracks.length) % this.tracks.length;
    save(STORAGE.radio, this.index);
    if (this.playing) this.play();
    else this.render();
  }

  // Baisse le volume pendant le Jeu des Portes (les effets sonores restent audibles).
  duck(on) {
    this.audio.volume = on ? this.baseVolume * 0.3 : this.baseVolume;
  }

  render() {
    this.el.classList.toggle('playing', this.playing);
    this.el.querySelector('.radio-title').textContent = this.track ? this.track.title : '';
    const b = this.el.querySelector('.radio-play');
    b.textContent = this.playing ? '⏸' : '▶';
    b.setAttribute('aria-label', this.playing ? 'Pause' : 'Lecture');
  }
}
