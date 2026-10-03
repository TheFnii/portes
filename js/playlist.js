// Musiques ajoutées à la radio depuis les Réglages : fichiers audio (gardés sur l'appareil)
// ou liens (Suno, MP3). Elles passent avant la playlist du Grimoire.

import { STORAGE, RADIO_AUDIO } from './config.js';
import { putMedia, getMedia, deleteMedia } from './media.js';

export function loadMyTracks() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE.radioMine) || '[]');
    return Array.isArray(list) ? list.filter((t) => t && t.id) : [];
  } catch (e) {
    return [];
  }
}

function saveMyTracks(list) {
  localStorage.setItem(STORAGE.radioMine, JSON.stringify(list));
}

const newId = () => `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function addFileTrack(file) {
  const id = newId();
  await putMedia(`music:${id}`, file);
  const list = loadMyTracks();
  list.push({ id, kind: 'file', title: file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim() || 'Ma musique' });
  saveMyTracks(list);
}

// Lien Suno (suno.com/song/<id>, cdn1.suno.ai/<id>.mp3) ou adresse directe d'un fichier audio.
export function parseMusicUrl(text) {
  const url = String(text || '').trim();
  const suno = url.match(/suno\.(?:com|ai)\/(?:song\/|embed\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (suno) return { src: RADIO_AUDIO(suno[1].toLowerCase()), title: 'Musique Suno' };
  if (/^https?:\/\/\S+$/i.test(url)) {
    const name = decodeURIComponent(url.split(/[?#]/)[0].split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '');
    return { src: url, title: name || 'Ma musique' };
  }
  return null;
}

export function addUrlTrack(text) {
  const parsed = parseMusicUrl(text);
  if (!parsed) return null;
  const t = { id: newId(), kind: 'url', ...parsed };
  const list = loadMyTracks();
  list.push(t);
  saveMyTracks(list);
  return t;
}

export async function removeTrack(id) {
  const list = loadMyTracks();
  const t = list.find((x) => x.id === id);
  saveMyTracks(list.filter((x) => x.id !== id));
  if (t && t.kind === 'file') await deleteMedia(`music:${id}`).catch(() => {});
}

export function moveTrack(id, delta) {
  const list = loadMyTracks();
  const i = list.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  saveMyTracks(list);
}

export function renameTrack(id, title) {
  const list = loadMyTracks();
  const t = list.find((x) => x.id === id);
  if (!t) return;
  t.title = String(title).trim() || t.title;
  saveMyTracks(list);
}

// Adresse jouable d'un morceau (fichier de l'appareil, lien, ou playlist du Grimoire).
// Les fichiers sont préparés à l'avance : sur iPad, la lecture doit démarrer tout de suite
// après le toucher.
const blobUrls = {};
export function sourceNow(t) {
  if (t.kind === 'file') return blobUrls[t.id] || null;
  return t.src || RADIO_AUDIO(t.id);
}
export function prepareTracks(list) {
  return Promise.all(list.filter((t) => t.kind === 'file').map((t) => trackSource(t).catch(() => null)));
}
export async function trackSource(t) {
  if (t.kind === 'file') {
    if (blobUrls[t.id]) return blobUrls[t.id];
    const blob = await getMedia(`music:${t.id}`);
    if (!blob) return null;
    blobUrls[t.id] = URL.createObjectURL(blob);
    return blobUrls[t.id];
  }
  return t.src || RADIO_AUDIO(t.id);
}
