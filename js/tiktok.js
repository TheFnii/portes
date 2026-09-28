// Lecture du chat TikTok LIVE via Euler Stream (WebSocket).
// Documentation : https://www.eulerstream.com/docs
//
// Événements émis :
//   'status' → { state: 'off' | 'connecting' | 'live' | 'waiting' | 'error', message }
//   'chat'   → { userId, handle, name, avatar, text }

import { EULER_WS_URL } from './config.js';
import { normalizeHandle } from './game.js';

// Codes de fermeture renvoyés par Euler Stream.
const CLOSE = {
  4005: { msg: 'Le live est terminé.', retry: 0 },
  4006: { msg: 'Aucun message reçu depuis un moment, reconnexion…', retry: 2 },
  4400: { msg: 'Pseudo ou paramètres invalides. Vérifiez votre pseudo TikTok.', retry: 0 },
  4401: { msg: 'Clé API refusée. Vérifiez-la dans les réglages.', retry: 0 },
  4403: { msg: 'Votre formule Euler Stream ne permet pas cette connexion.', retry: 0 },
  4404: { msg: 'Vous n’êtes pas en live pour le moment. Nouvel essai automatique…', retry: 15, waiting: true },
  4429: { msg: 'Trop de connexions en même temps (fermez l’appli sur les autres appareils).', retry: 20 },
  4500: { msg: 'TikTok a coupé la connexion, reconnexion…', retry: 3 },
  4555: { msg: 'Reconnexion…', retry: 1 },
  4556: { msg: 'TikTok ne répond pas, reconnexion…', retry: 5 },
  4557: { msg: 'Impossible de lire les infos du live, reconnexion…', retry: 5 },
};

function avatarOf(user) {
  const pic = user && (user.profilePicture || user.profilePictureMedium || user.avatarThumb);
  if (!pic) return '';
  const list = pic.url || pic.urls || pic.mUrls || pic.urlList || [];
  return (Array.isArray(list) ? list.find((u) => /^https:/.test(u)) : '') || '';
}

export class TikTokLive extends EventTarget {
  constructor() {
    super();
    this.ws = null;
    this.state = 'off';
    this.wanted = false;
    this.backoff = 2;
  }

  get connected() {
    return this.state === 'live';
  }

  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  setState(state, message = '') {
    this.state = state;
    this.message = message;
    this.emit('status', { state, message });
  }

  connect(handle, apiKey) {
    this.disconnect(true);
    this.handle = normalizeHandle(handle);
    this.apiKey = String(apiKey || '').trim();
    if (!this.handle || !this.apiKey) {
      this.setState('error', 'Renseignez votre pseudo TikTok et votre clé API Euler Stream.');
      return;
    }
    this.wanted = true;
    this.backoff = 2;
    this.open();
  }

  open() {
    clearTimeout(this.retryTimer);
    const params = new URLSearchParams({ uniqueId: this.handle, apiKey: this.apiKey });
    this.setState('connecting', `Connexion au live de @${this.handle}…`);
    let ws;
    try {
      ws = new WebSocket(`${EULER_WS_URL}?${params}`);
    } catch (e) {
      this.setState('error', 'Connexion impossible.');
      return;
    }
    this.ws = ws;
    ws.addEventListener('open', () => {
      if (this.ws !== ws) return;
      this.backoff = 2;
      this.setState('live', `Connecté au live de @${this.handle}`);
    });
    ws.addEventListener('message', (ev) => {
      if (this.ws === ws) this.onMessage(ev.data);
    });
    ws.addEventListener('close', (ev) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.onClose(ev.code, ev.reason);
    });
  }

  onClose(code, reason) {
    if (!this.wanted) {
      this.setState('off', 'Déconnecté.');
      return;
    }
    const info = CLOSE[code];
    let retry;
    let msg;
    if (info) {
      msg = info.msg;
      retry = info.retry;
    } else {
      msg = 'Connexion perdue, reconnexion…';
      retry = this.backoff;
      this.backoff = Math.min(30, this.backoff * 2);
    }
    if (!retry) {
      this.wanted = false;
      this.setState('error', reason && !info ? `${msg} (${reason})` : msg);
      return;
    }
    this.setState(info && info.waiting ? 'waiting' : 'connecting', msg);
    this.retryTimer = setTimeout(() => { if (this.wanted) this.open(); }, retry * 1000);
  }

  disconnect(silent = false) {
    this.wanted = false;
    clearTimeout(this.retryTimer);
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      try { ws.close(1000); } catch (e) { /* déjà fermé */ }
    }
    if (!silent) this.setState('off', 'Déconnecté.');
  }

  onMessage(raw) {
    if (typeof raw !== 'string') return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return;
    }
    const list = Array.isArray(data.messages) ? data.messages : [data];
    for (const m of list) {
      if (!m || !m.type) continue;
      const d = m.data || {};
      if (m.type === 'WebcastChatMessage') {
        const user = d.user || {};
        this.emit('chat', {
          userId: user.userId || user.id || '',
          handle: user.uniqueId || user.displayId || '',
          name: user.nickname || user.uniqueId || '',
          avatar: avatarOf(user),
          text: d.comment ?? d.content ?? '',
        });
      } else if (m.type === 'room.status') {
        if (d.state === 'connected') this.setState('live', `Connecté au live de @${this.handle}`);
        else if (d.state === 'reconnecting' || d.state === 'connecting') this.setState('connecting', 'Reconnexion au live…');
        else if (d.state === 'offline') this.setState('waiting', 'Vous n’êtes pas en live pour le moment.');
      }
    }
  }
}
