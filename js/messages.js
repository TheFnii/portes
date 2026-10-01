// Messages défilants (ruban et case centrale) : ceux saisis dans les réglages (enregistrés sur
// cet appareil) ont priorité sur le fichier du dépôt GitHub (messages.json ou regles.json).

import { MESSAGES_FILE, BOARD_FILE, DEFAULT_SPEED, STORAGE } from './config.js';

// Deux listes de messages : le ruban du bas et la case centrale.
export const SOURCES = {
  ticker: { file: MESSAGES_FILE, key: STORAGE.messages },
  board: { file: BOARD_FILE, key: STORAGE.board },
};
import { load, save } from './prefs.js';

function clean(list) {
  return (Array.isArray(list) ? list : []).map((m) => String(m).trim()).filter(Boolean);
}

function speedOf(v) {
  const n = Number(v);
  return n > 5 && n < 1000 ? n : DEFAULT_SPEED;
}

export async function loadFileMessages(kind = 'ticker') {
  const { file } = SOURCES[kind];
  const res = await fetch(file, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${file} : ${res.status}`);
  const data = await res.json();
  return { messages: clean(Array.isArray(data) ? data : data.messages), speed: speedOf(data.vitesse) };
}

export function loadLocalMessages(kind = 'ticker') {
  try {
    const raw = load(SOURCES[kind].key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { messages: clean(data.messages), speed: speedOf(data.vitesse) };
  } catch (e) {
    return null;
  }
}

export function saveLocalMessages(messages, speed, kind = 'ticker') {
  save(SOURCES[kind].key, JSON.stringify({ messages: clean(messages), vitesse: speedOf(speed) }));
}

export function clearLocalMessages(kind = 'ticker') {
  save(SOURCES[kind].key, null);
}

// Renvoie { messages, speed, source: 'local' | 'file', error }
export async function loadMessages(kind = 'ticker') {
  const local = loadLocalMessages(kind);
  if (local) return { ...local, source: 'local', error: false };
  try {
    return { ...(await loadFileMessages(kind)), source: 'file', error: false };
  } catch (e) {
    console.warn(`${SOURCES[kind].file} illisible :`, e);
    return { messages: [], speed: DEFAULT_SPEED, source: 'file', error: true };
  }
}
