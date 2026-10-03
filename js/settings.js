// Tous les réglages modifiables depuis la page Réglages : textes, disposition, paliers,
// animations. La page Réglages construit son formulaire à partir de cette liste.
//
// Dans les textes, les mots entre accolades sont remplacés automatiquement :
//   {n} nombre · {pseudo} pseudo · {q} questions · {palier} palier (100k…)

import { STORAGE } from './config.js';
import { load, save } from './prefs.js';

export const SETTINGS = [
  {
    group: 'Disposition du tableau de bord',
    items: [
      { key: 'listSide', label: 'Côté de la liste à traiter', type: 'select', def: 'right', options: [['right', 'À droite'], ['left', 'À gauche']] },
      { key: 'listWidth', label: 'Largeur de la liste', type: 'range', def: 34, min: 25, max: 50, unit: '%' },
      { key: 'sideWidth', label: 'Largeur de la colonne Top Likes / Top Gifters', type: 'range', def: 24, min: 16, max: 34, unit: '%' },
      { key: 'pinnedHeight', label: 'Hauteur de la case du message épinglé', type: 'range', def: 150, min: 90, max: 260, unit: 'px' },
      { key: 'textScale', label: 'Taille des textes', type: 'range', def: 100, min: 80, max: 130, unit: '%' },
      { key: 'topCount', label: 'Nombre de personnes dans les tops', type: 'range', def: 6, min: 3, max: 12, unit: '' },
    ],
  },
  {
    group: 'Textes du tableau de bord',
    items: [
      { key: 'listTitle', label: 'Titre de la liste ({n} = nombre de tirages)', type: 'text', def: '{n} tirages avant le prochain jeu' },
      { key: 'listTitleOne', label: 'Titre de la liste quand il reste 1 tirage', type: 'text', def: '1 tirage avant le prochain jeu' },
      { key: 'listTitleZero', label: 'Titre de la liste quand elle est vide', type: 'text', def: 'Place au jeu !' },
      { key: 'listEmpty', label: 'Texte quand la liste est vide', type: 'text', def: 'Personne à traiter pour l’instant' },
      { key: 'currentLabel', label: 'Étiquette de la personne en cours', type: 'text', def: 'En cours' },
      { key: 'nextButton', label: 'Bouton « Personne suivante »', type: 'text', def: 'Personne suivante' },
      { key: 'undoButton', label: 'Bouton « Retour en arrière »', type: 'text', def: 'Retour en arrière' },
      { key: 'gameButton', label: 'Bouton du jeu', type: 'text', def: 'Jeu des Portes' },
      { key: 'likesTitle', label: 'Titre du top likes', type: 'text', def: 'Top Likes' },
      { key: 'giftersTitle', label: 'Titre du top gifters', type: 'text', def: 'Top Gifters' },
      { key: 'univTitle', label: 'Titre de la case des Donuts', type: 'text', def: 'Message de l’univers' },
      { key: 'univEmpty', label: 'Case des Donuts vide', type: 'text', def: 'Aucune enveloppe pour l’instant' },
      { key: 'boardTitle', label: 'Titre de la case centrale (laisser vide pour aucun)', type: 'text', def: '' },
      { key: 'pinnedEmpty', label: 'Case du message épinglé vide', type: 'text', def: '' },
    ],
  },
  {
    group: 'Animations des cadeaux',
    items: [
      { key: 'animCat', label: 'Animation du Chat porte-bonheur', type: 'bool', def: true },
      { key: 'catText', label: 'Texte du Chat ({q} questions)', type: 'text', def: '{q} question en priorité pour :' },
      { key: 'catTextPlural', label: 'Texte du Chat, plusieurs questions', type: 'text', def: '{q} questions en priorité pour :' },
      { key: 'catQuestions', label: 'Questions par Chat porte-bonheur', type: 'number', def: 1, min: 1, max: 10 },
      { key: 'animGalaxy', label: 'Animation de la Galaxie', type: 'bool', def: true },
      { key: 'galaxyText', label: 'Texte de la Galaxie ({q} questions)', type: 'text', def: '{q} questions en priorité pour :' },
      { key: 'galaxyQuestions', label: 'Questions par Galaxie', type: 'number', def: 3, min: 1, max: 20 },
      { key: 'animDonut', label: 'Animation de l’enveloppe (Donut)', type: 'bool', def: true },
      { key: 'donutText', label: 'Texte de l’enveloppe', type: 'text', def: 'Un message de l’univers pour' },
      { key: 'envNameX', label: 'Enveloppe illustrée : position du pseudo, de gauche à droite', type: 'range', def: 50, min: 10, max: 90, unit: '%' },
      { key: 'envNameY', label: 'Enveloppe illustrée : position du pseudo, de haut en bas', type: 'range', def: 55, min: 10, max: 90, unit: '%' },
      { key: 'envNameSize', label: 'Enveloppe illustrée : taille du pseudo', type: 'range', def: 100, min: 50, max: 200, unit: '%' },
      { key: 'envNameColor', label: 'Enveloppe illustrée : couleur du pseudo', type: 'color', def: '#3a2412' },
      { key: 'envNameFont', label: 'Enveloppe illustrée : écriture du pseudo', type: 'select', def: 'script', options: [['script', 'Manuscrite (italique)'], ['cinzel', 'Majuscules gravées']] },
      { key: 'sealX', label: 'Enveloppe : position du cachet de cire, de gauche à droite', type: 'range', def: 50, min: 5, max: 95, unit: '%' },
      { key: 'sealY', label: 'Enveloppe : position du cachet de cire, de haut en bas', type: 'range', def: 56, min: 5, max: 95, unit: '%' },
      { key: 'sealSize', label: 'Enveloppe : taille du cachet de cire', type: 'range', def: 17, min: 6, max: 40, unit: '%' },
      { key: 'flapDepth', label: 'Enveloppe : hauteur de la pointe du rabat', type: 'range', def: 57, min: 20, max: 90, unit: '%' },
      { key: 'letterSeconds', label: 'Temps de lecture de la lettre (toucher la lettre la referme)', type: 'range', def: 14, min: 5, max: 40, unit: ' s' },
      { key: 'animSeconds', label: 'Durée des animations', type: 'range', def: 4, min: 2, max: 8, unit: ' s' },
    ],
  },
  {
    group: 'Paliers de likes',
    items: [
      { key: 'milestones', label: 'Paliers de likes activés', type: 'bool', def: true },
      { key: 'milestoneFirst', label: 'Premier palier', type: 'number', def: 100000, min: 1000, max: 100000000 },
      { key: 'milestoneStep', label: 'Puis tous les', type: 'number', def: 50000, min: 1000, max: 100000000 },
      { key: 'milestoneAlert', label: 'Se préparer combien de likes avant', type: 'number', def: 200, min: 0, max: 100000 },
      { key: 'milestoneWords', label: 'Mots acceptés dans le chat en plus du nombre (séparés par des virgules)', type: 'text', def: 'palier' },
      { key: 'milestoneTitle', label: 'Texte affiché en grand ({palier})', type: 'text', def: 'Palier {palier} likes !' },
      { key: 'milestoneLabel', label: 'Texte dans la liste ({palier})', type: 'text', def: '{palier} likes' },
      { key: 'milestoneAlertText', label: 'Annonce juste avant le palier ({palier})', type: 'text', def: 'Le palier {palier} approche : soyez le premier à l’écrire !' },
      { key: 'personalTiers', label: 'Paliers par personne (10 000 likes…) activés — les paliers se règlent dans « Paliers de likes par personne »', type: 'bool', def: true },
      { key: 'tierTitle', label: 'Palier par personne : texte affiché en grand ({n} = likes)', type: 'text', def: '{n} likes !' },
      { key: 'tierLabel', label: 'Palier par personne : texte dans la liste ({n} = likes)', type: 'text', def: '{n} likes' },
    ],
  },
  {
    group: 'Textes du Jeu des Portes',
    items: [
      { key: 'gameTitle', label: 'Titre au-dessus du dé', type: 'text', def: 'Choisissez un chiffre de 1 à 12' },
      { key: 'gameTagline', label: 'Sous-titre', type: 'text', def: 'Si le dé ouvre votre porte, on répond à votre question' },
      { key: 'gameCollectTitle', label: 'Titre pendant les participations', type: 'text', def: 'Écrivez un chiffre de 1 à 12 dans le chat' },
      { key: 'gameCollectTagline', label: 'Sous-titre pendant les participations', type: 'text', def: 'Une seule porte par personne : changer de chiffre élimine !' },
      { key: 'gameAgainTitle', label: 'Titre avant une relance', type: 'text', def: 'Une autre porte ?' },
      { key: 'startTitle', label: 'Écran de départ : titre', type: 'text', def: 'Une nouvelle partie commence' },
      { key: 'startText', label: 'Écran de départ : explication', type: 'textarea', def: 'Au signal, chacun écrit un chiffre de 1 à 12 dans le chat. Une seule porte par personne : changer de chiffre élimine. Vous pourrez relancer le dé autant de fois que vous voulez ; tous les gagnants sont gardés jusqu’à la fermeture du jeu.' },
      { key: 'countdownGo', label: 'Fin du compte à rebours', type: 'text', def: 'Le jeu commence !' },
      { key: 'countdown', label: 'Compte à rebours 3-2-1', type: 'bool', def: true },
      { key: 'resultSimple', label: 'Résultat sans le chat ({n} = chiffre)', type: 'text', def: 'Le chiffre {n} a été choisi' },
      { key: 'resultLive', label: 'Résultat avec le chat ({n} = chiffre)', type: 'text', def: 'La porte {n} s’ouvre' },
      { key: 'resultNobody', label: 'Personne derrière la porte', type: 'text', def: 'Personne n’avait choisi cette porte… Relancez le dé pour ouvrir une autre porte.' },
    ],
  },
];

export const DEFAULTS = Object.fromEntries(SETTINGS.flatMap((g) => g.items.map((i) => [i.key, i.def])));

export function loadSettings() {
  let saved = {};
  try {
    saved = JSON.parse(load(STORAGE.settings) || '{}') || {};
  } catch (e) { /* réglages illisibles : valeurs par défaut */ }
  const out = { ...DEFAULTS };
  Object.keys(DEFAULTS).forEach((k) => {
    if (saved[k] !== undefined && typeof saved[k] === typeof DEFAULTS[k]) out[k] = saved[k];
  });
  return out;
}

export function saveSettings(values) {
  // On n'enregistre que ce qui diffère des valeurs par défaut.
  const diff = {};
  Object.keys(DEFAULTS).forEach((k) => {
    if (values[k] !== undefined && values[k] !== DEFAULTS[k]) diff[k] = values[k];
  });
  save(STORAGE.settings, Object.keys(diff).length ? JSON.stringify(diff) : null);
}

// Remplace {n}, {pseudo}, {q}, {palier} dans un texte.
export function fill(text, vars = {}) {
  return String(text ?? '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
}
