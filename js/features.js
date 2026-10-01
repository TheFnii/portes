// Modules du tableau de bord activables dans les Réglages, et réglages des cadeaux.

import { STORAGE } from './config.js';
import { load, save } from './prefs.js';
import { DEFAULT_GIFT_NAMES } from './gifts.js';

export const FEATURES = {
  pinned: { label: 'Message épinglé du live', on: true },
  donuts: { label: 'Message de l’univers (enveloppes des Donuts)', on: true },
  likes: { label: 'Top Likes', on: true },
  gifters: { label: 'Top Gifters', on: true },
  board: { label: 'Case centrale (messages qui défilent)', on: true },
  list: { label: 'Liste à traiter', on: true },
  game: { label: 'Jeu des Portes', on: true },
  radio: { label: 'Radio', on: true },
};

function readJSON(key, fallback) {
  try {
    const raw = load(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function loadFeatures() {
  const saved = readJSON(STORAGE.features, {});
  const out = {};
  Object.keys(FEATURES).forEach((k) => { out[k] = typeof saved[k] === 'boolean' ? saved[k] : FEATURES[k].on; });
  return out;
}

export function saveFeatures(f) {
  save(STORAGE.features, JSON.stringify(f));
}

export function loadGiftConfig() {
  const saved = readJSON(STORAGE.gifts, {});
  return {
    names: { ...DEFAULT_GIFT_NAMES, ...(saved.names || {}) },
    byId: saved.byId || {},
  };
}

export function saveGiftConfig(cfg) {
  save(STORAGE.gifts, JSON.stringify(cfg));
}

// Journal des cadeaux reçus (pour les associer à un rôle dans les Réglages).
export function loadGiftLog() {
  return readJSON(STORAGE.giftLog, []);
}

export function logGift(g, n) {
  const log = loadGiftLog();
  const key = g.giftId || g.giftName;
  let item = log.find((x) => (x.giftId || x.giftName) === key);
  if (!item) {
    item = { giftId: g.giftId, giftName: g.giftName, giftImage: g.giftImage, count: 0 };
    log.unshift(item);
  }
  item.count += n;
  item.last = Date.now();
  item.giftName = g.giftName || item.giftName;
  item.giftImage = g.giftImage || item.giftImage;
  log.sort((a, b) => b.last - a.last);
  save(STORAGE.giftLog, JSON.stringify(log.slice(0, 40)));
}

export { readJSON };
