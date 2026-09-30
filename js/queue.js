// Liste centrale des personnes à traiter pendant le live.
//
// Ordre d'affichage :
//   1. Priorités (Chat porte-bonheur, Galaxie), dans l'ordre d'envoi des cadeaux
//   2. Gagnants du Jeu des Portes
//   3. Cœurs ballon
// Les Donuts vont dans une liste à part.
//
// Cœurs ballon :
//   - envoyés avant le premier jeu, ou pendant un jeu → mis en attente, puis ajoutés
//     quand le jeu se ferme (après ses gagnants) ;
//   - envoyés entre deux jeux → ajoutés tout de suite.

import { ROLES } from './gifts.js';

let seq = 0;
const newId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

export class LiveQueue {
  constructor(data = null) {
    this.priorities = [];
    this.winners = [];
    this.hearts = [];
    this.pendingHearts = [];
    this.donuts = [];
    this.history = [];
    this.gamesClosed = 0;
    this.gameRunning = false;
    if (data) Object.assign(this, JSON.parse(JSON.stringify(data)));
    this.gameRunning = false; // une session de jeu ne survit pas à un rechargement
  }

  toJSON() {
    const { priorities, winners, hearts, pendingHearts, donuts, history, gamesClosed } = this;
    return { priorities, winners, hearts, pendingHearts, donuts, history: history.slice(-20), gamesClosed };
  }

  list() {
    return [...this.priorities, ...this.winners, ...this.hearts];
  }

  get current() {
    return this.list()[0] || null;
  }

  // Un cadeau reçu (n = nombre de cadeaux).
  addGift(role, user, n = 1) {
    if (!role || n <= 0) return null;
    if (role === 'cat' || role === 'galaxy') return this.addPriority(user, role, n * ROLES[role].questions);
    if (role === 'heart') {
      if (this.gameRunning || this.gamesClosed === 0) return this.merge(this.pendingHearts, user, 'heart', n);
      return this.merge(this.hearts, user, 'heart', n);
    }
    if (role === 'donut') return this.merge(this.donuts, user, 'donut', n);
    return null;
  }

  // Ordre strict d'envoi : une personne qui renvoie un cadeau juste après le sien
  // voit son compteur augmenter ; si quelqu'un est passé entre-temps, elle repasse en fin de file.
  addPriority(user, gift, questions) {
    const last = this.priorities[this.priorities.length - 1];
    if (last && last.key === user.key && last.gift === gift) {
      last.count += questions;
      return last;
    }
    const e = this.entry(user, 'priority', gift, questions);
    this.priorities.push(e);
    return e;
  }

  // Une même personne n'apparaît qu'une fois par liste : son compteur augmente.
  merge(list, user, gift, n) {
    const found = list.find((e) => e.key === user.key);
    if (found) {
      found.count += n;
      return found;
    }
    const e = this.entry(user, gift, gift, n);
    list.push(e);
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

  startGame() {
    this.gameRunning = true;
  }

  // Fin du jeu : les gagnants rejoignent la liste, puis les cœurs en attente.
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
    this.gameRunning = false;
    this.gamesClosed += 1;
    this.flushPending();
    return added;
  }

  flushPending() {
    const pending = this.pendingHearts;
    this.pendingHearts = [];
    pending.forEach((p) => {
      const found = this.hearts.find((e) => e.key === p.key);
      if (found) found.count += p.count;
      else this.hearts.push(p);
    });
  }

  listOf(e) {
    return e.type === 'priority' ? this.priorities : e.type === 'winner' ? this.winners : this.hearts;
  }

  // « Personne suivante » : retire la personne en cours.
  next() {
    const e = this.current;
    if (!e) return null;
    this.listOf(e).shift();
    this.history.push(e);
    return e;
  }

  // Annule le dernier « Personne suivante » (ou la dernière suppression).
  undo() {
    const e = this.history.pop();
    if (!e) return null;
    const list = this.listOf(e);
    list.unshift(e);
    return e;
  }

  remove(id) {
    for (const list of [this.priorities, this.winners, this.hearts, this.pendingHearts]) {
      const i = list.findIndex((e) => e.id === id);
      if (i >= 0) {
        const [e] = list.splice(i, 1);
        if (list !== this.pendingHearts) this.history.push(e);
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
    this.hearts = [];
    this.pendingHearts = [];
    this.donuts = [];
    this.history = [];
    this.gamesClosed = 0;
  }
}

// Classement des likes (par personne) et total du live.
export class Likes {
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
    const u = this.users[user.key] || (this.users[user.key] = { name: user.name, handle: user.handle, avatar: user.avatar, likes: 0 });
    u.likes += n;
    u.name = user.name || u.name;
    u.avatar = user.avatar || u.avatar;
    this.total = Math.max(this.total + n, Number(liveTotal) || 0);
  }

  top(n = 5) {
    return Object.values(this.users).sort((a, b) => b.likes - a.likes).slice(0, n);
  }

  toJSON() {
    // On ne garde que les 300 plus gros likeurs pour limiter la taille sauvegardée.
    const users = {};
    Object.entries(this.users).sort((a, b) => b[1].likes - a[1].likes).slice(0, 300)
      .forEach(([k, v]) => { users[k] = v; });
    return { total: this.total, users };
  }
}
