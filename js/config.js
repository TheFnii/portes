// Réglages généraux de l'application.

export const APP_TITLE = 'Les Portes du Destin';
export const APP_SUBTITLE = 'Choisissez un chiffre de 1 à 12';
export const APP_TAGLINE = 'Si le dé ouvre votre porte, on répond à votre question';

export const DOOR_COUNT = 12;

// Fichier des messages défilants (modifiable directement sur GitHub).
export const MESSAGES_FILE = 'messages.json';
export const DEFAULT_SPEED = 80; // pixels par seconde

// Sons personnalisés : déposez un fichier portant exactement ce nom dans le dossier sounds/
// pour remplacer le son synthétisé correspondant. Sans fichier, le son synthétisé est joué.
export const SOUND_FILES = {
  de: 'sounds/de.mp3',            // le dé qui roule
  porte: 'sounds/porte.mp3',      // la porte qui s'ouvre
  resultat: 'sounds/resultat.mp3', // le résultat apparaît
  jeu: 'sounds/jeu.mp3',          // « Le jeu commence ! »
};

// Euler Stream (lecture du chat TikTok LIVE).
export const EULER_WS_URL = 'wss://ws.eulerstream.com';

// Clés du stockage local (navigateur de la tablette).
export const STORAGE = {
  ticker: 'portes.ticker',
  messages: 'portes.messages',
  sound: 'portes.sound',
  tiktokUser: 'portes.tiktok.user',
  tiktokKey: 'portes.tiktok.key',
  queue: 'portes.queue',
  likes: 'portes.likes',
  pinned: 'portes.pinned',
  features: 'portes.features',
  gifts: 'portes.gifts',
  giftLog: 'portes.giftlog',
  radio: 'portes.radio',
};

// Radio : lit la playlist du Grimoire (même site, donc toujours à jour).
export const RADIO_PLAYLIST_URL = '/Book/book.json';
export const RADIO_AUDIO = (id) => `https://cdn1.suno.ai/${id}.mp4`;
// Secours si la playlist du Grimoire est injoignable.
export const RADIO_FALLBACK = [
  { title: "Souvenirs", id: '5bcf0369-368f-4da4-b145-dbbeee7d2a84' },
  { title: "Promesse", id: 'b8a7d70d-e07a-4673-9d9f-0b5900f63c06' },
  { title: "Lumière du jour", id: '4fcac677-d6b7-4059-9555-29e090063531' },
  { title: "Derrière ton regard", id: 'df18042e-0ea8-4d78-ac76-b4b43eb84123' },
  { title: "Lune de miel", id: 'd512a1c3-bad7-403b-a203-fa272c3225f4' },
  { title: "Nuit", id: '2fae083e-ae58-4e79-b30b-9ad10c5f2fb4' },
  { title: "Lueur d’étoile", id: '67a1ea18-cece-4a6e-af48-a1f6b4faa25d' },
  { title: "Des rêves qui brûlent encore", id: '1ad4e739-2770-4180-a2b5-29ef654a8a06' },
  { title: "D’or et de miel", id: 'db531716-b89e-4412-8fdf-56ac52bc1818' },
  { title: "Lucioles", id: 'bbca1511-ee6e-448a-88ea-e1815488fd38' },
];
