// Messages de l'univers (cadeau Donut) : le deck vient du Grimoire (book.json → cartes
// « Messages de l'univers »). Dans les Réglages on peut en supprimer et en ajouter ;
// ces changements restent sur l'appareil.

import { RADIO_PLAYLIST_URL, STORAGE } from './config.js';

// Si le Grimoire est injoignable (et jamais chargé sur cet appareil).
export const FALLBACK = [
  'Ce qui doit venir à soi trouve toujours son chemin. Il suffit de laisser la porte entrouverte et de faire confiance au moment présent.',
  'Une graine plantée en silence finit toujours par fleurir. Les efforts invisibles d’aujourd’hui préparent la lumière de demain.',
  'Il est temps de déposer ce qui pèse. Alléger son cœur, c’est faire de la place pour la joie qui frappe déjà.',
  'Les signes sont là, discrets mais fidèles. Écouter son intuition, c’est suivre le fil d’or que l’Univers tend doucement.',
  'Chaque fin ouvre un passage. Ce qui se termine libère l’espace d’un renouveau plus juste et plus doux.',
];

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return v ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* stockage plein */ }
}

// Identifiant court et stable d'un message (pour retenir les suppressions).
export function messageId(text) {
  let h = 5381;
  const t = String(text);
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// Messages du Grimoire (gardés sur l'appareil pour les lives sans réseau).
export async function grimoireMessages() {
  try {
    const res = await fetch(RADIO_PLAYLIST_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const list = ((data.cards && data.cards.messages) || []).filter((m) => typeof m === 'string' && m.trim());
    if (list.length) {
      writeJSON(STORAGE.univGrimoire, list);
      return list;
    }
  } catch (e) { /* hors ligne : copie locale */ }
  const saved = readJSON(STORAGE.univGrimoire, []);
  return saved.length ? saved : FALLBACK;
}

export function loadEdits() {
  const e = readJSON(STORAGE.univDeck, {});
  return { removed: Array.isArray(e.removed) ? e.removed : [], added: Array.isArray(e.added) ? e.added : [] };
}

export function saveEdits(edits) {
  writeJSON(STORAGE.univDeck, { removed: edits.removed, added: edits.added });
}

// Deck complet : Grimoire − messages supprimés + messages ajoutés.
export function buildDeck(grimoire, edits = { removed: [], added: [] }) {
  const seen = new Set();
  const out = [];
  const push = (text, source) => {
    const t = String(text).trim();
    const id = messageId(t);
    if (!t || seen.has(id) || edits.removed.includes(id)) return;
    seen.add(id);
    out.push({ id, text: t, source });
  };
  edits.added.forEach((t) => push(t, 'added'));
  grimoire.forEach((t) => push(t, 'grimoire'));
  return out;
}

// Tire un message au hasard, sans répéter ceux déjà donnés pendant le live (tant qu'il en reste).
export function pickMessage(deck, used = [], rnd = Math.random) {
  if (!deck.length) return FALLBACK[Math.floor(rnd() * FALLBACK.length)];
  const usedSet = new Set(used);
  const fresh = deck.filter((m) => !usedSet.has(m.text));
  const pool = fresh.length ? fresh : deck;
  return pool[Math.floor(rnd() * pool.length)].text;
}
