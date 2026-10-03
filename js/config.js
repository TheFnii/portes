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
  chat: 'sounds/chat.mp3',        // Chat porte-bonheur
  galaxie: 'sounds/galaxie.mp3',  // Galaxie
  enveloppe: 'sounds/enveloppe.mp3', // Donut : l'enveloppe arrive
  palier: 'sounds/palier.mp3',    // palier de likes
  sceau: 'sounds/sceau.mp3',      // le cachet de cire se brise
  lettre: 'sounds/lettre.mp3',    // la lettre de l'univers apparaît
};

// Images fournies (voir images/LISEZMOI.md). Sans fichier, l'application garde ses dessins.
// Indiquer le chemin SANS extension : .png, .webp, .jpg, .jpeg, .gif et .svg sont essayés.
export const IMAGES = {
  logoChat: 'images/logos/chat',               // liste à traiter : Chat porte-bonheur
  logoGalaxie: 'images/logos/galaxie',         // liste à traiter : Galaxie
  logoEnveloppe: 'images/logos/enveloppe',     // case « Message de l'univers »
  animChat: 'images/animations/chat',          // animation du Chat porte-bonheur
  animGalaxie: 'images/animations/galaxie',    // animation de la Galaxie
  animEnveloppe: 'images/animations/enveloppe', // enveloppe (Donut) : côté destinataire, le pseudo est écrit dessus
  animEnveloppeDos: 'images/animations/enveloppe-dos', // enveloppe (Donut) : côté du sceau de cire
};
export const IMAGE_EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg', 'gif', 'svg'];

// Page des viewers (live.html) : relais publics gratuits utilisés pour la diffusion.
// La tablette publie sur tous ; chaque téléphone se connecte au premier qui répond.
export const LIVE_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];
export const LIVE_TOPIC = 'portes-du-destin/v1';
// Taille maximale des fichiers envoyés aux viewers : une image plus lourde part réduite,
// un son plus lourd n'est pas envoyé (les viewers entendent le son d'origine).
export const CAST_MAX = { image: 3 * 1024 * 1024, sound: 1.5 * 1024 * 1024 };

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
  settings: 'portes.settings',
  board: 'portes.board',
  gifters: 'portes.gifters',
  milestone: 'portes.milestone',
  radioVolume: 'portes.radio.volume',
  media: 'portes.media',          // change quand une image ou un son est déposé dans les Réglages
  cast: 'portes.cast',            // diffusion vers la page des viewers (on/off)
  castKey: 'portes.cast.key',     // clé de signature de la diffusion (reste sur la tablette)
  viewerSound: 'portes.viewer.sound', // son coupé ou non sur la page des viewers
  univDeck: 'portes.univ.deck',    // messages de l'univers supprimés / ajoutés
  univGrimoire: 'portes.univ.grimoire', // copie des messages du Grimoire
  likeTiers: 'portes.liketiers',   // paliers de likes par personne
  likeTiersReached: 'portes.liketiers.reached',
  radioMine: 'portes.radio.mine',  // musiques ajoutées à la radio
  radioGrimoire: 'portes.radio.grimoire', // garder la playlist du Grimoire
};

// Messages de la case centrale (règles du live), modifiables comme ceux du ruban.
export const BOARD_FILE = 'regles.json';

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
