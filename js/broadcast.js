// Diffusion du live vers la page des viewers (live.html), en lecture seule.
//
// La tablette publie l'état du tableau de bord et les événements (animations, Jeu des Portes)
// sur un relais MQTT public. Chaque message est signé avec une clé gardée sur la tablette ;
// le lien des viewers contient la clé publique, donc personne d'autre ne peut publier à sa place.

import { LIVE_BROKERS, LIVE_TOPIC, STORAGE, IMAGES, SOUND_FILES, CAST_MAX } from './config.js';
import { MqttClient } from './mqtt.js';
import { getMedia, smallDataUrl } from './media.js';
import { loadStickers } from './stickers.js';

const ALGO = { name: 'ECDSA', namedCurve: 'P-256' };
const CHUNK = 48000; // caractères par morceau de fichier
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const newVersion = () => Math.random().toString(36).slice(2, 10);
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };
const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  new Uint8Array(bytes).forEach((b) => { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(text) {
  const s = atob(String(text).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// Canal du live : dérivé de la clé publique (court, et impossible à usurper).
async function channelOf(rawPublicKey) {
  const hash = await crypto.subtle.digest('SHA-256', rawPublicKey);
  return b64url(hash).slice(0, 22);
}

export function topics(channel) {
  const base = `${LIVE_TOPIC}/${channel}`;
  return { state: `${base}/state`, event: `${base}/event`, media: `${base}/media/`, need: `${base}/need` };
}

// Relais utilisés. Pour essayer un autre relais (tests, relais privé), on peut enregistrer
// une liste d'adresses dans le stockage local : portes.cast.brokers = ["wss://…/mqtt"].
function brokers() {
  try {
    const v = JSON.parse(localStorage.getItem('portes.cast.brokers') || 'null');
    if (Array.isArray(v) && v.length) return v;
  } catch (e) { /* liste illisible */ }
  return LIVE_BROKERS;
}

// ---------- Clé de la tablette ----------

export async function hostKey({ renew = false } = {}) {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE.castKey) || 'null'); } catch (e) { /* clé illisible */ }
  if (saved && !renew) {
    try {
      const priv = await crypto.subtle.importKey('jwk', saved.priv, ALGO, false, ['sign']);
      const pubRaw = unb64url(saved.pub);
      return { priv, pub: saved.pub, channel: await channelOf(pubRaw) };
    } catch (e) { /* on en recrée une */ }
  }
  const pair = await crypto.subtle.generateKey(ALGO, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const raw = await crypto.subtle.exportKey('raw', pair.publicKey);
  const pub = b64url(raw);
  try { localStorage.setItem(STORAGE.castKey, JSON.stringify({ priv: jwk, pub })); } catch (e) { /* ignore */ }
  return { priv: pair.privateKey, pub, channel: await channelOf(raw) };
}

// Lien à donner aux viewers.
export function viewerLink(pub, page = 'live.html') {
  const u = new URL(page, location.href);
  u.search = '';
  u.hash = pub;
  return u.href;
}

// ---------- Côté tablette : publication ----------

export class Broadcaster {
  // onNeed(ids) : des viewers signalent des fichiers manquants (le relais les a perdus…).
  constructor({ onStatus, onNeed } = {}) {
    this.onStatus = onStatus || (() => {});
    this.onNeed = onNeed || null;
    this.clients = [];
    this.waiters = [];
    this.lastState = null;
    this.ready = this.start();
  }

  async start() {
    this.key = await hostKey();
    this.t = topics(this.key.channel);
    // Publie sur chaque relais : les viewers se connectent au premier qui répond.
    this.clients = brokers().map((url) => new MqttClient(url, {
      onMessage: (topic, text) => {
        if (topic !== this.t.need || !this.onNeed) return;
        try {
          const ids = (JSON.parse(text).ids || []).filter((id) => typeof id === 'string' && /^(img|snd|stk)-\w+$/.test(id));
          if (ids.length) this.onNeed(ids.slice(0, 20));
        } catch (e) { /* demande illisible */ }
      },
      onStatus: (up) => {
        if (up) {
          // Après une (re)connexion, l'état est republié (images et sons restent gardés par le relais).
          if (this.lastState) this.send(this.t.state, this.lastState, true);
          this.waiters.splice(0).forEach((w) => w());
        }
        this.onStatus(this.connected);
      },
    }));
    if (this.onNeed) this.clients.forEach((c) => c.subscribe(this.t.need));
  }

  get connected() {
    return this.clients.some((c) => c.connected);
  }

  // Attend qu'au moins un relais réponde (ou abandonne après `ms`).
  async whenConnected(ms = 20000) {
    await this.ready;
    if (this.connected) return true;
    return new Promise((ok) => {
      const done = () => { clearTimeout(timer); ok(true); };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== done);
        ok(false);
      }, ms);
      this.waiters.push(done);
    });
  }

  async sign(obj) {
    const p = JSON.stringify({ ...obj, t: Date.now(), id: Math.random().toString(36).slice(2, 10) });
    const sig = await crypto.subtle.sign(SIGN, this.key.priv, enc.encode(p));
    return JSON.stringify({ p, s: b64url(sig) });
  }

  // Renvoie true si au moins un relais a reçu le message.
  async send(topic, obj, retain) {
    await this.ready;
    const text = await this.sign(obj);
    let sent = false;
    this.clients.forEach((c) => { if (c.publish(topic, text, retain)) sent = true; });
    return sent;
  }

  // État complet du tableau de bord (gardé par le relais pour les viewers qui arrivent).
  // Regroupé : au plus une publication toutes les 400 ms.
  state(obj) {
    this.lastState = obj;
    if (this.stateTimer) return;
    this.stateTimer = setTimeout(() => {
      this.stateTimer = null;
      this.send(this.t.state, this.lastState, true);
    }, 400);
  }

  // Événement ponctuel (animation, dé lancé…).
  event(kind, data = {}) {
    this.send(this.t.event, { kind, data }, false);
  }

  // Fichier (image ou son) gardé par le relais pour tous les viewers. Le relais limite la
  // taille des messages : le fichier part en morceaux signés. buffer null : on l'efface.
  async setFile(id, buffer, type = '', v = newVersion()) {
    await this.ready;
    const base = `${this.t.media}${id}`;
    if (!buffer) return this.send(base, { file: id, v, parts: 0 }, true);
    const data = b64url(buffer);
    const parts = Math.ceil(data.length / CHUNK);
    for (let i = 0; i < parts; i++) {
      const ok = await this.send(`${base}/${i}`, { file: id, v, part: i, data: data.slice(i * CHUNK, (i + 1) * CHUNK) }, true);
      if (!ok) return false;
      await wait(30); // sans précipitation : les relais gratuits limitent le débit
    }
    return this.send(base, { file: id, v, parts, type }, true);
  }

  close() {
    this.clients.forEach((c) => c.close());
  }
}

// ---------- Images et sons déposés dans les Réglages → viewers ----------

const SENT_KEY = 'portes.cast.sent';
const REFRESH = 12 * 3600 * 1000; // renvoyé au moins toutes les 12 h (le relais peut oublier)

async function fingerprint(blob) {
  if (!blob) return '';
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return b64url(hash).slice(0, 16);
}

function dataUrlBytes(url) {
  const [head, data] = url.split(',');
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return { buffer: out.buffer, type: (head.match(/data:([^;]+)/) || [])[1] || '' };
}

function readSent(channel) {
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem(SENT_KEY) || '{}') || {}; } catch (e) { /* ignore */ }
  return sent.channel === channel ? sent : { channel, items: {} };
}

// Liste des fichiers que les viewers doivent avoir (id → version), jointe à l'état du live :
// un téléphone qui en manque un le redemande.
export function castManifest(b) {
  if (!b || !b.key) return null;
  const out = {};
  Object.entries(readSent(b.key.channel).items).forEach(([key, it]) => {
    if (it.sig && it.v) out[key.replace(':', '-')] = it.v;
  });
  return out;
}

// Autocollant (data URL gardée sur l'appareil) → fichier.
function stickerBlob(id) {
  const url = loadStickers()[id];
  if (!url) return null;
  const { buffer, type } = dataUrlBytes(url);
  return new Blob([buffer], { type });
}

// Envoie aux viewers les images et les sons déposés (seulement ce qui a changé).
// only : 'img:animChat', 'snd:chat'… pour n'envoyer qu'un fichier ;
// force : ids ('img-animChat'…) à renvoyer même s'ils sont déjà partis.
export async function castMedia(b, { only, force = [] } = {}) {
  if (!(await b.whenConnected())) return false;
  const list = [
    ...Object.keys(IMAGES).map((k) => `img:${k}`),
    ...Object.keys(SOUND_FILES).map((k) => `snd:${k}`),
    ...Object.keys(loadStickers()).map((k) => `stk:${k}`),
  ];
  for (const key of list) {
    if (only && only !== key) continue;
    const id = key.replace(':', '-');
    const blob = key.startsWith('stk:') ? stickerBlob(key.slice(4)) : await getMedia(key);
    const sig = await fingerprint(blob);
    const sent = readSent(b.key.channel);
    const prev = sent.items[key];
    const same = prev && prev.sig === sig && prev.v;
    if (same && !force.includes(id) && Date.now() - prev.at < REFRESH) continue;
    if (force.length && !force.includes(id)) continue;
    let buffer = null;
    let type = '';
    if (blob && key.startsWith('stk:')) {
      buffer = await blob.arrayBuffer();
      type = blob.type;
    } else if (blob && key.startsWith('img:')) {
      if (blob.size <= CAST_MAX.image) {
        buffer = await blob.arrayBuffer();
        type = blob.type;
      } else {
        // Très grande image : envoyée réduite plutôt que pas du tout.
        const url = await smallDataUrl(blob, 1400, CAST_MAX.image * 1.3);
        if (url) ({ buffer, type } = dataUrlBytes(url));
      }
    } else if (blob && blob.size <= CAST_MAX.sound) {
      buffer = await blob.arrayBuffer();
      type = blob.type;
    }
    const v = same ? prev.v : newVersion();
    const ok = await b.setFile(id, buffer, type, v);
    if (!ok) return false;
    const now = readSent(b.key.channel);
    now.items[key] = { sig: buffer ? sig : '', v, at: Date.now() };
    try { localStorage.setItem(SENT_KEY, JSON.stringify(now)); } catch (e) { /* ignore */ }
  }
  return true;
}

// ---------- Côté viewers : réception ----------

// Les morceaux d'un fichier peuvent arriver dans n'importe quel ordre.
function fileAssembler(onFile) {
  const heads = {}; // id → { v, parts, type }
  const chunks = {}; // id:v → { i: data }
  const done = {}; // id → version déjà reconstituée
  const check = (id) => {
    const h = heads[id];
    if (!h || done[id] === h.v) return;
    if (!h.parts) {
      done[id] = h.v;
      onFile(id, null, '', h.v);
      return;
    }
    const c = chunks[`${id}:${h.v}`] || {};
    let data = '';
    for (let i = 0; i < h.parts; i++) {
      if (c[i] === undefined) return;
      data += c[i];
    }
    done[id] = h.v;
    delete chunks[`${id}:${h.v}`];
    onFile(id, unb64url(data).buffer, h.type || '', h.v);
  };
  return (msg) => {
    const id = String(msg.file);
    if (msg.parts !== undefined) heads[id] = { v: msg.v, parts: msg.parts, type: msg.type };
    else {
      const k = `${id}:${msg.v}`;
      (chunks[k] = chunks[k] || {})[msg.part] = msg.data;
    }
    check(id);
  };
}

export class Receiver {
  // pub : clé publique (dans le lien) ; handlers : onState(state), onEvent(kind, data),
  // onFile(id, buffer, type) pour les images et sons, onStatus(up)
  constructor(pub, handlers) {
    this.h = handlers;
    this.files = {}; // id → version reçue
    this.receiveFile = fileAssembler((id, buf, type, v) => {
      this.files[id] = v;
      if (this.h.onFile) this.h.onFile(id, buf, type);
    });
    this.seen = new Set();
    this.stateT = 0;
    this.ready = this.start(pub);
  }

  async start(pub) {
    const raw = unb64url(pub);
    this.key = await crypto.subtle.importKey('raw', raw, ALGO, false, ['verify']);
    this.t = topics(await channelOf(raw));
    this.brokerIndex = 0;
    this.connect();
  }

  // Un seul relais à la fois ; s'il ne répond pas, on essaie le suivant.
  connect() {
    if (this.client) this.client.close();
    const list = brokers();
    const url = list[this.brokerIndex % list.length];
    let up = false;
    this.client = new MqttClient(url, {
      onMessage: (topic, text) => this.receive(topic, text),
      onStatus: (ok) => {
        up = ok;
        this.h.onStatus(ok);
        if (!ok) this.failover();
      },
    });
    this.client.subscribe(this.t.state);
    this.client.subscribe(this.t.event);
    this.client.subscribe(`${this.t.media}#`);
    clearTimeout(this.giveUp);
    this.giveUp = setTimeout(() => { if (!up) this.failover(); }, 8000);
  }

  // Fichiers attendus (manifeste de la tablette) : renvoie ceux qui manquent encore.
  missing(manifest) {
    return Object.entries(manifest || {}).filter(([id, v]) => this.files[id] !== v).map(([id]) => id);
  }

  // Demande à la tablette de renvoyer des fichiers (message non signé : au pire, elle renvoie).
  need(ids) {
    if (this.client && ids.length) this.client.publish(this.t.need, JSON.stringify({ ids }), false);
  }

  failover() {
    if (brokers().length < 2) return;
    clearTimeout(this.giveUp);
    this.giveUp = setTimeout(() => {
      if (this.client && this.client.connected) return;
      this.brokerIndex++;
      this.connect();
    }, 3000);
  }

  async receive(topic, text) {
    if (!text) return;
    let msg;
    try {
      const { p, s } = JSON.parse(text);
      const ok = await crypto.subtle.verify(SIGN, this.key, unb64url(s), enc.encode(p));
      if (!ok) return;
      msg = JSON.parse(p);
    } catch (e) {
      return; // message illisible ou non signé : ignoré
    }
    if (this.seen.has(msg.id)) return;
    this.seen.add(msg.id);
    if (this.seen.size > 500) this.seen = new Set([...this.seen].slice(-200));
    if (topic === this.t.state) {
      if (msg.t < this.stateT) return;
      this.stateT = msg.t;
      this.h.onState(msg);
    } else if (topic === this.t.event) {
      // Un vieux message rejoué ne déclenche rien.
      if (this.stateT && msg.t < this.stateT - 60000) return;
      this.h.onEvent(msg.kind, msg.data || {});
    } else if (topic.startsWith(this.t.media)) {
      if (msg.file) this.receiveFile(msg);
    }
  }
}
