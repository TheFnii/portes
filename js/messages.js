// Messages défilants : ceux saisis dans les réglages (enregistrés sur cet appareil)
// ont priorité sur le fichier messages.json du dépôt GitHub.

import { MESSAGES_FILE, DEFAULT_SPEED, STORAGE } from './config.js';
import { load, save } from './prefs.js';

function clean(list) {
  return (Array.isArray(list) ? list : []).map((m) => String(m).trim()).filter(Boolean);
}

function speedOf(v) {
  const n = Number(v);
  return n > 5 && n < 1000 ? n : DEFAULT_SPEED;
}

export async function loadFileMessages() {
  const res = await fetch(MESSAGES_FILE, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`messages.json : ${res.status}`);
  const data = await res.json();
  return { messages: clean(Array.isArray(data) ? data : data.messages), speed: speedOf(data.vitesse) };
}

export function loadLocalMessages() {
  try {
    const raw = load(STORAGE.messages);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { messages: clean(data.messages), speed: speedOf(data.vitesse) };
  } catch (e) {
    return null;
  }
}

export function saveLocalMessages(messages, speed) {
  save(STORAGE.messages, JSON.stringify({ messages: clean(messages), vitesse: speedOf(speed) }));
}

export function clearLocalMessages() {
  save(STORAGE.messages, null);
}

// Renvoie { messages, speed, source: 'local' | 'file', error }
export async function loadMessages() {
  const local = loadLocalMessages();
  if (local) return { ...local, source: 'local', error: false };
  try {
    return { ...(await loadFileMessages()), source: 'file', error: false };
  } catch (e) {
    console.warn('messages.json illisible :', e);
    return { messages: [], speed: DEFAULT_SPEED, source: 'file', error: true };
  }
}
