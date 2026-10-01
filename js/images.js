// Images fournies (logos des cadeaux, illustrations des animations). Ordre de priorité :
// 1. image déposée dans les Réglages (gardée dans la tablette),
// 2. fichier du dossier images/ (essayé sous ses extensions possibles),
// 3. sinon, les dessins intégrés.

import { IMAGES, IMAGE_EXTENSIONS } from './config.js';
import { getMedia } from './media.js';

let found = {};
let blobUrls = [];

function probe(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function findOne(key, base, out, urls) {
  const blob = await getMedia(`img:${key}`);
  if (blob) {
    const url = URL.createObjectURL(blob);
    urls.push(url);
    out[key] = url;
    return;
  }
  const ok = await Promise.all(IMAGE_EXTENSIONS.map((ext) => probe(`${base}.${ext}`)));
  const i = ok.indexOf(true);
  if (i >= 0) out[key] = `${base}.${IMAGE_EXTENSIONS[i]}`;
}

// Cherche (ou recherche après un dépôt dans les Réglages) toutes les images.
export async function refreshImages() {
  const out = {};
  const urls = [];
  await Promise.all(Object.entries(IMAGES).map(([k, base]) => findOne(k, base, out, urls)));
  const old = blobUrls;
  found = out;
  blobUrls = urls;
  setTimeout(() => old.forEach((u) => URL.revokeObjectURL(u)), 10000);
  return found;
}

// Promesse tenue quand toutes les images ont été cherchées.
export const imagesReady = refreshImages();

// Adresse de l'image si elle existe, sinon null.
export function image(key) {
  return found[key] || null;
}

// Logo de la liste selon le rôle du cadeau.
export const LOGO_OF_ROLE = { cat: 'logoChat', galaxy: 'logoGalaxie', donut: 'logoEnveloppe' };
