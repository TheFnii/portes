// Images fournies par l'utilisatrice ou l'utilisateur (logos des cadeaux, illustrations des
// animations). Au démarrage on cherche chaque image sous ses extensions possibles ;
// celles qui manquent sont remplacées par les dessins intégrés.

import { IMAGES, IMAGE_EXTENSIONS } from './config.js';

const found = {};

function probe(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > 0);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function findOne(key, base) {
  const ok = await Promise.all(IMAGE_EXTENSIONS.map((ext) => probe(`${base}.${ext}`)));
  const i = ok.indexOf(true);
  if (i >= 0) found[key] = `${base}.${IMAGE_EXTENSIONS[i]}`;
}

// Promesse tenue quand toutes les images ont été cherchées.
export const imagesReady = Promise.all(Object.entries(IMAGES).map(([k, base]) => findOne(k, base))).then(() => found);

// Adresse de l'image si elle existe, sinon null.
export function image(key) {
  return found[key] || null;
}

// Logo de la liste selon le rôle du cadeau.
export const LOGO_OF_ROLE = { cat: 'logoChat', galaxy: 'logoGalaxie', donut: 'logoEnveloppe' };
