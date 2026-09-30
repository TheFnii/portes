// Règles du jeu des portes (mode TikTok).
//
// - Seuls les messages contenant un chiffre de 1 à 12 comptent (seul ou dans une phrase).
// - Une seule participation par personne : répéter le même chiffre ne change rien.
// - Donner un autre chiffre (ou deux chiffres différents dans un message) élimine la personne.
// - Les messages de l'animatrice ou de l'animateur (le compte du live) sont ignorés.

export const MIN = 1;
export const MAX = 12;

// Extrait les chiffres de 1 à 12 d'un message, sans doublon.
// « 7 », « la 7 stp », « porte 12 ! », « 7️⃣ », « 🔟 » comptent ;
// « 1ère », « 3h », « 25 » ou « 2025 » ne comptent pas.
export function extractNumbers(text) {
  if (!text) return [];
  const clean = String(text)
    .normalize('NFKC')
    .replace(/\u{1F51F}/gu, ' 10 ')
    .replace(/️?⃣/g, '');
  const found = [];
  const re = /(?<!\d)(\d{1,3})(?![\d\p{L}])/gu;
  let m;
  while ((m = re.exec(clean))) {
    const n = parseInt(m[1], 10);
    if (n >= MIN && n <= MAX && !found.includes(n)) found.push(n);
  }
  return found;
}

export function normalizeHandle(h) {
  return String(h || '').trim().replace(/^@/, '').toLowerCase();
}

export class Round {
  constructor() {
    this.host = '';
    this.reset();
  }

  reset() {
    this.open = false;
    this.players = new Map(); // clé → { name, handle, avatar, choice, at }
    this.out = new Map(); // clé → { name, handle, avatar, choices }
    this.opened = []; // portes déjà ouvertes pendant la session
    this.won = new Map(); // gagnants cumulés de la session : clé → joueur
  }

  setHost(handle) {
    this.host = normalizeHandle(handle);
  }

  start() {
    this.reset();
    this.open = true;
  }

  close() {
    this.open = false;
  }

  // Traite un message du chat. Renvoie ce qui s'est passé :
  // { type: 'join' | 'same' | 'out' | 'ignored', key, player }
  handle(msg) {
    if (!this.open) return { type: 'ignored' };
    const handle = normalizeHandle(msg.handle);
    const key = handle || String(msg.userId || '') || normalizeHandle(msg.name);
    if (!key) return { type: 'ignored' };
    if (this.host && handle === this.host) return { type: 'ignored' };
    const nums = extractNumbers(msg.text);
    if (!nums.length) return { type: 'ignored' };

    const who = { name: msg.name || handle, handle, avatar: msg.avatar || '' };

    if (this.out.has(key)) {
      const o = this.out.get(key);
      nums.forEach((n) => { if (!o.choices.includes(n)) o.choices.push(n); });
      return { type: 'ignored', key };
    }

    const p = this.players.get(key);
    if (!p) {
      if (nums.length === 1) {
        const player = { ...who, choice: nums[0], at: Date.now() };
        this.players.set(key, player);
        return { type: 'join', key, player };
      }
      const player = { ...who, choices: nums };
      this.out.set(key, player);
      return { type: 'out', key, player };
    }

    if (nums.length === 1 && nums[0] === p.choice) {
      return { type: 'same', key, player: p };
    }

    this.players.delete(key);
    const choices = [p.choice, ...nums.filter((n) => n !== p.choice)];
    const player = { ...who, avatar: who.avatar || p.avatar, choices };
    this.out.set(key, player);
    return { type: 'out', key, player };
  }

  counts() {
    const c = new Array(MAX + 1).fill(0);
    this.players.forEach((p) => { c[p.choice]++; });
    return c;
  }

  winners(n) {
    return [...this.players.entries()].filter(([, p]) => p.choice === n).map(([key, p]) => ({ ...p, key }));
  }

  // Portes que le dé peut encore ouvrir pendant cette session.
  closedDoors() {
    const doors = [];
    for (let n = MIN; n <= MAX; n++) if (!this.opened.includes(n)) doors.push(n);
    return doors;
  }

  // Ouvre une porte : ses gagnants s'ajoutent aux gagnants cumulés de la session.
  openDoor(n) {
    if (!this.opened.includes(n)) this.opened.push(n);
    const list = this.winners(n);
    list.forEach((w) => { if (!this.won.has(w.key)) this.won.set(w.key, { ...w, door: n }); });
    return list;
  }

  sessionWinners() {
    return [...this.won.values()];
  }
}
