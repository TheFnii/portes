// Liste des personnes à traiter pendant le live.
//
// Ordre d'affichage :
//   1. Priorités (Chat porte-bonheur, Galaxie), dans l'ordre d'envoi des cadeaux
//   2. Gagnants du Jeu des Portes
//   3. Paliers de likes (100k, 150k…)
// Les Donuts (messages de l'univers) vont dans une liste à part.

let seq = 0;
const newId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

export class LiveQueue {
  constructor(data = null) {
    this.priorities = [];
    this.winners = [];
    this.milestones = [];
    this.donuts = [];
    this.history = [];
    if (data) {
      ['priorities', 'winners', 'milestones', 'donuts', 'history'].forEach((k) => {
        if (Array.isArray(data[k])) this[k] = JSON.parse(JSON.stringify(data[k]));
      });
    }
  }

  toJSON() {
    const { priorities, winners, milestones, donuts, history } = this;
    return { priorities, winners, milestones, donuts, history: history.slice(-20) };
  }

  list() {
    return [...this.priorities, ...this.winners, ...this.milestones];
  }

  get current() {
    return this.list()[0] || null;
  }

  // Nombre de tirages en attente : une question prioritaire = un tirage,
  // un gagnant ou un palier = un tirage.
  get draws() {
    return this.list().reduce((t, e) => t + (e.type === 'priority' ? e.count : 1), 0);
  }

  // Cadeau prioritaire (Chat porte-bonheur, Galaxie) : questions = nombre de questions données.
  // Ordre strict d'envoi : une personne qui renvoie un cadeau juste après le sien
  // voit son compteur augmenter ; si quelqu'un est passé entre-temps, elle repasse en fin de file.
  addPriority(user, gift, questions) {
    if (!(questions > 0)) return null;
    const last = this.priorities[this.priorities.length - 1];
    if (last && last.key === user.key && last.gift === gift) {
      last.count += questions;
      return last;
    }
    const e = this.entry(user, 'priority', gift, questions);
    this.priorities.push(e);
    return e;
  }

  // Donut : une lettre de l'univers (pseudo + message du deck), la plus récente en haut.
  // La liste reste jusqu'à la fin du live.
  addDonut(user, n = 1, message = '') {
    const e = this.entry(user, 'donut', 'donut', n);
    e.message = message;
    e.at = Date.now();
    this.donuts.unshift(e);
    return e;
  }

  letter(id) {
    return this.donuts.find((e) => e.id === id) || null;
  }

  // Palier de likes : tout en bas de la liste.
  addMilestone(user, label) {
    const e = this.entry(user, 'milestone', 'milestone', 1);
    e.label = label;
    this.milestones.push(e);
    return e;
  }

  entry(user, type, gift, count) {
    return {
      id: newId(),
      key: user.key,
      name: user.name || user.handle || '?',
      handle: user.handle || '',
      avatar: user.avatar || '',
      giftImage: user.giftImage || '',
      type,
      gift,
      count,
      at: Date.now(),
    };
  }

  // Fin du Jeu des Portes : les gagnants rejoignent la liste (après les priorités).
  closeGame(winners = []) {
    const known = new Set(this.winners.map((w) => w.key));
    const added = [];
    winners.forEach((w) => {
      if (known.has(w.key)) return;
      known.add(w.key);
      const e = this.entry(w, 'winner', 'winner', 1);
      e.door = w.door;
      this.winners.push(e);
      added.push(e);
    });
    return added;
  }

  listOf(e) {
    return e.type === 'priority' ? this.priorities : e.type === 'winner' ? this.winners : this.milestones;
  }

  // « Personne suivante » : retire la personne en cours.
  next() {
    const e = this.current;
    if (!e) return null;
    this.listOf(e).shift();
    this.history.push(e);
    return e;
  }

  // « Retour en arrière » : annule le dernier « Personne suivante » (ou la dernière suppression).
  undo() {
    const e = this.history.pop();
    if (!e) return null;
    this.listOf(e).unshift(e);
    return e;
  }

  remove(id) {
    for (const list of [this.priorities, this.winners, this.milestones]) {
      const i = list.findIndex((e) => e.id === id);
      if (i >= 0) {
        const [e] = list.splice(i, 1);
        this.history.push(e);
        return e;
      }
    }
    return null;
  }

  removeDonut(id) {
    const i = this.donuts.findIndex((e) => e.id === id);
    return i >= 0 ? this.donuts.splice(i, 1)[0] : null;
  }

  clear() {
    this.priorities = [];
    this.winners = [];
    this.milestones = [];
    this.donuts = [];
    this.history = [];
  }
}

// Classement par personne (likes, ou pièces offertes pour le top gifters) et total du live.
export class Ranking {
  constructor(data = null) {
    this.total = 0;
    this.users = {};
    if (data) {
      this.total = data.total || 0;
      this.users = data.users || {};
    }
  }

  add(user, n, liveTotal) {
    if (!user.key || !(n > 0)) return;
    const u = this.users[user.key] || (this.users[user.key] = { name: user.name, handle: user.handle, avatar: user.avatar, value: 0 });
    u.value = (u.value ?? u.likes ?? 0) + n;
    u.name = user.name || u.name;
    u.avatar = user.avatar || u.avatar;
    this.total = Math.max(this.total + n, Number(liveTotal) || 0);
  }

  top(n = 5) {
    return Object.values(this.users).map((u) => ({ ...u, value: u.value ?? u.likes ?? 0 }))
      .sort((a, b) => b.value - a.value).slice(0, n);
  }

  toJSON() {
    // On ne garde que les 300 premiers pour limiter la taille sauvegardée.
    const users = {};
    Object.entries(this.users).sort((a, b) => (b[1].value ?? 0) - (a[1].value ?? 0)).slice(0, 300)
      .forEach(([k, v]) => { users[k] = v; });
    return { total: this.total, users };
  }
}

// Paliers de likes : 100k, puis tous les 50k (réglable).
// - à partir de « palier − alerte » likes (99 800), on se prépare ;
// - dès que le total atteint réellement le palier, la première personne qui l'écrit
//   dans le chat (« 100k », « 100 000 », « palier »…) le remporte.
export class Milestones {
  constructor({ first = 100000, step = 50000, alert = 200, words = ['palier'] } = {}) {
    this.configure({ first, step, alert, words });
    this.reached = 0; // dernier palier attribué
  }

  configure({ first, step, alert, words }) {
    this.first = Math.max(1, Number(first) || 100000);
    this.step = Math.max(1, Number(step) || 50000);
    this.alert = Math.max(0, Number(alert) || 0);
    this.words = (words || []).map((w) => String(w).trim().toLowerCase()).filter(Boolean);
  }

  // Prochain palier à attribuer.
  next() {
    if (this.reached < this.first) return this.first;
    return this.reached + this.step;
  }

  // 'idle' | 'alert' (bientôt) | 'open' (atteint, en attente d'une personne dans le chat)
  status(total) {
    const n = this.next();
    if (total >= n) return 'open';
    if (total >= n - this.alert) return 'alert';
    return 'idle';
  }

  static label(n) {
    return n % 1000 === 0 ? `${n / 1000}k` : n.toLocaleString('fr-FR');
  }

  // Le message cite-t-il le palier ? « 100k », « 100 k », « 100000 », « 100 000 », « 100.000 », ou un mot-clé.
  mentions(text, n) {
    const t = String(text || '').toLowerCase().normalize('NFKC');
    const k = n / 1000;
    const compact = t.replace(/(\d)[\s.,  ](?=\d{3}\b)/g, '$1');
    if (new RegExp(`(^|[^\\d])${n}([^\\d]|$)`).test(compact)) return true;
    if (Number.isInteger(k) && new RegExp(`(^|[^\\d])${k}\\s?k(?![a-z])`).test(t)) return true;
    return this.words.some((w) => t.includes(w));
  }

  // Un message du chat : renvoie le palier remporté (ou null).
  claim(text, total) {
    const n = this.next();
    if (total < n || !this.mentions(text, n)) return null;
    // Si plusieurs paliers ont été franchis d'un coup, on attribue le plus haut.
    let won = n;
    while (total >= won + this.step) won += this.step;
    this.reached = won;
    return won;
  }
}

// Paliers de likes par personne (10 000 likes…) : renvoie les paliers que cette personne
// vient de franchir. reached : paliers déjà fêtés pour elle.
export function crossedTiers(tiers, before, after, reached = []) {
  return (tiers || [])
    .filter((t) => t && t.likes > 0 && before < t.likes && after >= t.likes && !reached.includes(t.likes))
    .sort((a, b) => a.likes - b.likes);
}
