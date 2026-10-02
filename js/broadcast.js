// Diffusion du live vers la page des viewers (live.html), en lecture seule.
//
// La tablette publie l'état du tableau de bord et les événements (animations, Jeu des Portes)
// sur un relais MQTT public. Chaque message est signé avec une clé gardée sur la tablette ;
// le lien des viewers contient la clé publique, donc personne d'autre ne peut publier à sa place.

import { LIVE_BROKERS, LIVE_TOPIC, STORAGE } from './config.js';
import { MqttClient } from './mqtt.js';

const ALGO = { name: 'ECDSA', namedCurve: 'P-256' };
const SOUND_CHUNK = 48000; // caractères par morceau de son
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
  return { state: `${base}/state`, event: `${base}/event`, media: `${base}/media/` };
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
export function viewerLink(pub) {
  const u = new URL('live.html', location.href);
  u.search = '';
  u.hash = pub;
  return u.href;
}

// ---------- Côté tablette : publication ----------

export class Broadcaster {
  constructor({ onStatus } = {}) {
    this.onStatus = onStatus || (() => {});
    this.clients = [];
    this.ready = this.start();
    this.lastState = null;
    this.retained = {}; // sujet → message gardé par le relais (images, sons)
  }

  async start() {
    this.key = await hostKey();
    this.t = topics(this.key.channel);
    // Publie sur chaque relais : les viewers se connectent au premier qui répond.
    this.clients = brokers().map((url) => new MqttClient(url, {
      onStatus: (up) => {
        if (up) this.resend();
        this.onStatus(this.connected);
      },
    }));
  }

  get connected() {
    return this.clients.some((c) => c.connected);
  }

  async sign(obj) {
    const p = JSON.stringify({ ...obj, t: Date.now(), id: Math.random().toString(36).slice(2, 10) });
    const sig = await crypto.subtle.sign(SIGN, this.key.priv, enc.encode(p));
    return JSON.stringify({ p, s: b64url(sig) });
  }

  async send(topic, obj, retain) {
    await this.ready;
    const text = await this.sign(obj);
    this.clients.forEach((c) => c.publish(topic, text, retain));
    return text;
  }

  // Après une (re)connexion : l'état et les images sont republiés.
  resend() {
    if (this.lastState) this.send(this.t.state, this.lastState, true);
    Object.entries(this.retained).forEach(([topic, obj]) => this.send(topic, obj, true));
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

  async retain(topic, obj) {
    await this.ready;
    this.retained[topic] = obj;
    return this.send(topic, obj, true);
  }

  // Image déposée dans les Réglages (data URL), ou null pour l'effacer.
  setMedia(key, url) {
    return this.ready.then(() => this.retain(this.t.media + key, { media: key, url: url || '' }));
  }

  // Son déposé dans les Réglages (ArrayBuffer), ou null pour revenir au son d'origine.
  // Le relais limite la taille des messages : le fichier part en morceaux.
  async setSound(name, buffer) {
    await this.ready;
    const base = `${this.t.media}snd-${name}`;
    const v = Math.random().toString(36).slice(2, 10);
    if (!buffer) {
      await this.retain(base, { sound: name, v, parts: 0 });
      return;
    }
    const data = b64url(buffer);
    const size = SOUND_CHUNK;
    const parts = Math.ceil(data.length / size);
    for (let i = 0; i < parts; i++) {
      await this.retain(`${base}/${i}`, { sound: name, v, part: i, data: data.slice(i * size, (i + 1) * size) });
    }
    await this.retain(base, { sound: name, v, parts });
  }

  close() {
    this.clients.forEach((c) => c.close());
  }
}

// ---------- Côté viewers : réception ----------

// Les morceaux d'un son peuvent arriver dans n'importe quel ordre.
function soundAssembler(onSound) {
  const heads = {}; // nom → { v, parts }
  const chunks = {}; // nom:v → { i: data }
  const done = {}; // nom → version déjà décodée
  const check = (name) => {
    const h = heads[name];
    if (!h) return;
    if (!h.parts) {
      if (done[name] !== h.v) { done[name] = h.v; onSound(name, null); }
      return;
    }
    const c = chunks[`${name}:${h.v}`] || {};
    if (Object.keys(c).length < h.parts || done[name] === h.v) return;
    let data = '';
    for (let i = 0; i < h.parts; i++) {
      if (c[i] === undefined) return;
      data += c[i];
    }
    done[name] = h.v;
    onSound(name, unb64url(data).buffer);
  };
  return (msg) => {
    const name = String(msg.sound);
    if (msg.parts !== undefined) heads[name] = { v: msg.v, parts: msg.parts };
    else {
      const k = `${name}:${msg.v}`;
      (chunks[k] = chunks[k] || {})[msg.part] = msg.data;
    }
    check(name);
  };
}

export class Receiver {
  // pub : clé publique (dans le lien) ; handlers : onState(state), onEvent(kind, data), onMedia(key, url), onStatus(up)
  constructor(pub, handlers) {
    this.h = handlers;
    this.receiveSound = soundAssembler((name, buf) => this.h.onSound && this.h.onSound(name, buf));
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
      if (msg.sound) this.receiveSound(msg);
      else this.h.onMedia(msg.media, msg.url);
    }
  }
}
