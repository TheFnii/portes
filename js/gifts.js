// Cadeaux TikTok : reconnaître le rôle de chaque cadeau et compter les combos.
//
// Rôles :
//   cat    → Chat porte-bonheur : 1 question prioritaire par cadeau (réglable)
//   galaxy → Galaxie : 3 questions prioritaires par cadeau (réglable)
//   donut  → Donut : message de l'univers (case à part)
//
// Les noms envoyés par TikTok peuvent être en anglais ou changer : le rôle se reconnaît d'abord
// par l'identifiant du cadeau (réglé dans les Réglages), sinon par son nom.

export const ROLES = {
  cat: { label: 'Chat porte-bonheur', emoji: '🐱', effect: '1 question prioritaire', questions: 1 },
  galaxy: { label: 'Galaxie', emoji: '🌌', effect: '3 questions prioritaires', questions: 3 },
  donut: { label: 'Donut', emoji: '✉️', effect: 'Message de l’univers' },
};

export const DEFAULT_GIFT_NAMES = {
  cat: ['Chat porte-bonheur', 'Lucky Cat', 'Fortune Cat', 'Maneki Neko'],
  galaxy: ['Galaxie', 'Galaxy'],
  donut: ['Donut', 'Doughnut', 'Beignet'],
};

export function normalizeName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// config = { names: { role: [noms] }, byId: { idCadeau: role | 'none' } }
export function roleOf(gift, config = {}) {
  const byId = config.byId || {};
  const id = String(gift.giftId ?? '');
  if (id && byId[id]) return byId[id] === 'none' ? null : byId[id];
  const n = normalizeName(gift.giftName);
  if (!n) return null;
  const names = config.names || DEFAULT_GIFT_NAMES;
  for (const role of Object.keys(ROLES)) {
    if ((names[role] || []).some((x) => normalizeName(x) === n)) return role;
  }
  return null;
}

// Compte les cadeaux réellement envoyés.
// - Cadeau « combo » : TikTok envoie plusieurs messages pendant la série (1, 2, 3…) : on ne
//   compte que l'augmentation depuis le message précédent de la même série.
// - Autre cadeau : on compte le nombre indiqué ; un message reçu deux fois n'est compté qu'une fois.
export class GiftCounter {
  constructor() {
    this.streaks = new Map();
    this.seen = new Set();
    this.seenOrder = [];
  }

  count(g) {
    if (g.msgId) {
      if (this.seen.has(g.msgId)) return 0;
      this.seen.add(g.msgId);
      this.seenOrder.push(g.msgId);
      if (this.seenOrder.length > 2000) this.seen.delete(this.seenOrder.shift());
    }
    const total = Math.max(1, Number(g.repeatCount) || 1);
    if (!g.combo) return total;
    const key = `${g.userKey}|${g.giftId}|${g.groupId || ''}`;
    const prev = this.streaks.get(key) || 0;
    const n = Math.max(0, total - prev);
    if (g.repeatEnd) this.streaks.delete(key);
    else this.streaks.set(key, Math.max(prev, total));
    return n;
  }
}
