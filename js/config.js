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
  jeu: 'sounds/jeu.mp3',          // les participations s'ouvrent
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
};
