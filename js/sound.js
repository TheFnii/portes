// Sons synthétisés en direct (Web Audio) : aucun fichier audio, aucun droit d'auteur.
// Un fichier déposé dans sounds/ (voir config.js) remplace le son synthétisé correspondant.

import { SOUND_FILES, STORAGE } from './config.js';
import { getMedia } from './media.js';

function readPref(key, defaultOn) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? defaultOn : v !== 'off';
  } catch (e) { return defaultOn; }
}

export class Sound {
  // key : préférence enregistrée (la page des viewers a la sienne, coupée par défaut).
  constructor({ key = STORAGE.sound, defaultOn = true } = {}) {
    this.key = key;
    this.enabled = readPref(key, defaultOn);
    this.ctx = null;
  }

  setEnabled(on) {
    this.enabled = on;
    try { localStorage.setItem(this.key, on ? 'on' : 'off'); } catch (e) { /* ignore */ }
  }

  // Doit être appelé pendant un geste de l'utilisateur (clic / toucher).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.impulse(2.8, 2.6);
      this.wet = this.ctx.createGain();
      this.wet.gain.value = 0.45;
      this.reverb.connect(this.wet).connect(this.master);
      this.noiseBuf = this.noise(2);
      this.loadFiles();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  // Charge les sons personnalisés : ceux déposés dans les Réglages, sinon ceux du dossier
  // sounds/ (les fichiers absents sont ignorés).
  loadFiles() {
    if (!this.ctx) return;
    this.files = {};
    Object.entries(SOUND_FILES).forEach(([name, url]) => {
      getMedia(`snd:${name}`)
        .then((blob) => (blob ? blob.arrayBuffer() : fetch(url, { cache: 'no-cache' }).then((r) => (r.ok ? r.arrayBuffer() : null))))
        .then((buf) => (buf ? new Promise((ok, ko) => this.ctx.decodeAudioData(buf, ok, ko)) : null))
        .then((audio) => { if (audio) this.files[name] = audio; })
        .catch(() => {});
    });
  }

  // Joue le fichier personnalisé s'il existe. Renvoie true si c'est le cas.
  file(name) {
    const buf = this.files && this.files[name];
    if (!buf) return false;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    src.start();
    return true;
  }

  get ready() {
    return this.enabled && this.ctx && this.ctx.state !== 'closed';
  }

  noise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  bell(freq, t, gain, dur = 2.2) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(gain, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(this.master);
    out.connect(this.reverb);
    [[1, 1], [2.76, 0.28], [5.4, 0.1], [0.5, 0.18]].forEach(([m, a]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * m;
      g.gain.value = a;
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
  }

  shimmer(t, dur, gain) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.Q.value = 6;
    hp.frequency.setValueAtTime(5000, t);
    hp.frequency.exponentialRampToValueAtTime(11000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(hp).connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  rustle(t, dur, gain, f0, f1, q = 0.9) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.85 + Math.random() * 0.3;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.12);
    g.gain.exponentialRampToValueAtTime(gain * 0.45, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.master);
    const send = ctx.createGain();
    send.gain.value = 0.15;
    g.connect(send).connect(this.reverb);
    src.start(t, Math.random() * 1.2);
    src.stop(t + dur + 0.05);
  }

  // Son de verre (partiels presque harmoniques, très purs).
  glass(freq, t, gain, dur = 2.5) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(gain, t + 0.02);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(this.master);
    out.connect(this.reverb);
    [[1, 1], [2.01, 0.25], [3.02, 0.08]].forEach(([m, a]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * m;
      g.gain.value = a;
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
  }

  pad(freqs, t, gain, attack, dur, type = 'sine') {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master);
    g.connect(this.reverb);
    freqs.forEach((f) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = (Math.random() - 0.5) * 12;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
  }

  // Clac du dé qui touche le sol (plusieurs petits chocs quand il culbute).
  diceHit(strength = 1) {
    if (!this.ready || this.files?.de) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.005;
    const n = 2 + Math.round(strength * 2);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (0.03 + Math.random() * 0.04);
      const g = Math.max(0.05, strength) * (i ? 0.45 : 1);
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + Math.random() * 2200;
      bp.Q.value = 4;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.9 * g, t + 0.002);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      src.connect(bp).connect(env).connect(this.master);
      src.start(t, Math.random());
      src.stop(t + 0.08);
      // résonance « bois / résine »
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(520 + Math.random() * 380, t);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.28 * g, t + 0.003);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(og).connect(this.master);
      o.start(t);
      o.stop(t + 0.1);
    }
  }

  // Le dé est lancé (souffle + scintillement).
  diceThrow() {
    if (!this.ready) return;
    if (this.file('de')) return;
    const t = this.ctx.currentTime + 0.01;
    this.rustle(t, 0.5, 0.18, 700, 2600, 0.8);
    this.shimmer(t + 0.05, 1.2, 0.035);
  }

  // Le chiffre sort : note claire.
  diceResult() {
    if (!this.ready) return;
    const t = this.ctx.currentTime + 0.01;
    [1318.5, 1975.5].forEach((f, i) => this.bell(f, t + i * 0.07, 0.06, 1.8));
  }

  // La porte choisie s'illumine (pendant le zoom).
  doorCall() {
    if (!this.ready) return;
    const t = this.ctx.currentTime + 0.02;
    this.pad([110, 164.8, 220], t, 0.07, 0.9, 2.6, 'triangle');
    this.shimmer(t + 0.2, 1.8, 0.04);
  }

  // La porte s'ouvre : déverrouillage, grincement, puis déferlante de lumière.
  doorOpen() {
    if (!this.ready) return;
    if (this.file('porte')) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.02;
    // déclic de la serrure
    this.bell(3136, t, 0.05, 0.25);
    this.rustle(t, 0.06, 0.35, 2500, 1500, 3);
    // grincement
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(95, t + 0.15);
    o.frequency.linearRampToValueAtTime(140, t + 0.7);
    o.frequency.linearRampToValueAtTime(105, t + 1.3);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 23;
    const lg = ctx.createGain();
    lg.gain.value = 9;
    lfo.connect(lg).connect(o.frequency);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.35);
    g.gain.linearRampToValueAtTime(0.05, t + 1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(bp).connect(g).connect(this.master);
    g.connect(this.reverb);
    o.start(t + 0.15); lfo.start(t + 0.15);
    o.stop(t + 1.6); lfo.stop(t + 1.6);
    // lumière
    this.pad([196, 293.7, 392, 587.3], t + 0.6, 0.08, 1, 4.2);
    this.shimmer(t + 0.7, 2.6, 0.07);
    [1318.5, 1568, 1975.5, 2349.3, 2637, 3136].forEach((n, i) => this.bell(n, t + 0.9 + i * 0.09, 0.07 - i * 0.007, 2.6));
  }

  // Le message ou la liste des gagnants apparaît.
  reveal() {
    if (!this.ready) return;
    if (this.file('resultat')) return;
    const t = this.ctx.currentTime + 0.02;
    [1318.5, 1661.2, 1975.5, 2637].forEach((f, i) => this.glass(f, t + i * 0.08, 0.07 - i * 0.01, 3.2));
    this.pad([164.8, 246.9, 329.6], t, 0.07, 0.05, 3.2, 'triangle');
  }

  // Les participations s'ouvrent.
  gameStart() {
    if (!this.ready) return;
    if (this.file('jeu')) return;
    const t = this.ctx.currentTime + 0.02;
    [784, 1046.5, 1318.5, 1568].forEach((f, i) => this.bell(f, t + i * 0.12, 0.07, 2.2));
    this.shimmer(t, 1.4, 0.04);
  }

  // Un joueur rejoint une porte (très discret, limité en fréquence).
  join() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (now - (this.lastJoin || 0) < 0.18) return;
    this.lastJoin = now;
    this.glass([1568, 1760, 2093, 2349.3][Math.floor(Math.random() * 4)], now + 0.01, 0.018, 0.8);
  }

  // Un joueur est éliminé.
  eliminated() {
    if (!this.ready) return;
    const t = this.ctx.currentTime + 0.01;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(330, t);
    o.frequency.exponentialRampToValueAtTime(165, t + 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.4);
  }

  // Chat porte-bonheur : un petit miaulement (voix glissée à travers deux formants).
  meow() {
    if (!this.ready) return;
    if (this.file('chat')) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.02;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, t);
    o.frequency.linearRampToValueAtTime(760, t + 0.22);
    o.frequency.linearRampToValueAtTime(640, t + 0.5);
    o.frequency.linearRampToValueAtTime(470, t + 0.75);
    const vib = ctx.createOscillator();
    vib.frequency.value = 7;
    const vg = ctx.createGain();
    vg.gain.value = 9;
    vib.connect(vg).connect(o.frequency);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 6;
    f1.frequency.setValueAtTime(700, t);
    f1.frequency.linearRampToValueAtTime(1500, t + 0.25);
    f1.frequency.linearRampToValueAtTime(900, t + 0.75);
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 8;
    f2.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.09);
    g.gain.setValueAtTime(0.45, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    o.connect(f1).connect(g);
    o.connect(f2).connect(g2).connect(g);
    g.connect(this.master);
    g.connect(this.reverb);
    o.start(t); vib.start(t);
    o.stop(t + 0.9); vib.stop(t + 0.9);
    [1568, 2093, 2637].forEach((f, i) => this.bell(f, t + 0.6 + i * 0.08, 0.04, 1.6));
  }

  // Galaxie : arpège de harpe cristallin et scintillement.
  harp() {
    if (!this.ready) return;
    if (this.file('galaxie')) return;
    const t = this.ctx.currentTime + 0.02;
    const notes = [261.6, 329.6, 392, 493.9, 587.3, 659.3, 784, 987.8, 1174.7, 1318.5, 1568, 1975.5];
    notes.forEach((f, i) => this.pluck(f, t + i * 0.075, 0.09 - i * 0.004));
    this.shimmer(t + 0.3, 2.4, 0.06);
    this.pad([130.8, 196, 261.6], t, 0.05, 0.4, 3.6);
  }

  // Corde pincée : partiels harmoniques qui s'éteignent vite.
  pluck(freq, t, gain) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    out.connect(this.master);
    out.connect(this.reverb);
    [[1, 1], [2, 0.35], [3, 0.15], [4, 0.06]].forEach(([m, a]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * m;
      g.gain.value = a;
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 2.5);
    });
  }

  // Donut : papier froissé pendant que l'enveloppe virevolte, petit tintement quand elle se pose.
  envelope(landAfter = 2.2) {
    if (!this.ready) return;
    if (this.file('enveloppe')) return;
    const t = this.ctx.currentTime + 0.02;
    this.crumple(t, landAfter + 0.2, 0.22);
    this.rustle(t, 0.9, 0.08, 500, 2400, 0.7);
    this.shimmer(t + 0.2, landAfter, 0.025);
    [1318.5, 1568, 2093].forEach((f, i) => this.glass(f, t + landAfter + i * 0.08, 0.04 - i * 0.008, 2.2));
  }

  // Papier froissé : une pluie irrégulière de petits craquements secs.
  crumple(t, dur, gain) {
    const ctx = this.ctx;
    let at = t;
    while (at < t + dur) {
      const len = 0.006 + Math.random() * 0.035;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + Math.random() * 4500;
      bp.Q.value = 0.8 + Math.random() * 1.5;
      const g = ctx.createGain();
      // Les craquements s'intensifient puis se calment, par vagues.
      const wave = 0.35 + 0.65 * Math.abs(Math.sin(((at - t) / dur) * Math.PI * 2.5));
      const peak = gain * wave * (0.3 + Math.random() * 0.7);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      src.connect(bp).connect(g).connect(this.master);
      src.start(at, Math.random() * 1.5);
      src.stop(at + len + 0.01);
      at += 0.012 + Math.random() * Math.random() * 0.09;
    }
  }

  // Palier de likes : fanfare et cloches.
  fanfare() {
    if (!this.ready) return;
    if (this.file('palier')) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.02;
    const chords = [[392, 493.9, 587.3], [392, 493.9, 587.3], [523.3, 659.3, 784]];
    const times = [0, 0.18, 0.42];
    chords.forEach((ch, i) => {
      const st = t + times[i];
      const dur = i === 2 ? 1.6 : 0.16;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1200, st);
      lp.frequency.linearRampToValueAtTime(3200, st + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.09, st + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
      lp.connect(g);
      g.connect(this.master);
      g.connect(this.reverb);
      ch.forEach((f) => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.connect(lp);
        o.start(st);
        o.stop(st + dur + 0.05);
      });
    });
    [1568, 2093, 2637, 3136].forEach((f, i) => this.bell(f, t + 0.5 + i * 0.07, 0.06, 2.2));
    this.shimmer(t + 0.4, 2, 0.06);
  }

  // Petit tintement (clic de bouton, sommaire…).
  tink() {
    if (!this.ready) return;
    this.bell(2637, this.ctx.currentTime + 0.01, 0.035, 0.9);
  }
}
