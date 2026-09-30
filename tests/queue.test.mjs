// Tests de la liste centrale et des cadeaux : node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveQueue, Likes } from '../js/queue.js';
import { roleOf, GiftCounter } from '../js/gifts.js';
import { Round } from '../js/game.js';

const u = (key) => ({ key, name: key.toUpperCase(), handle: key });
const names = (q) => q.list().map((e) => `${e.name}:${e.type}:${e.count}`);

test('les priorités passent avant les gagnants, dans l’ordre d’envoi', () => {
  const q = new LiveQueue();
  q.startGame();
  q.addGift('cat', u('ana'));
  q.addGift('galaxy', u('bob'));
  q.closeGame([{ ...u('zoe'), door: 3 }]);
  q.addGift('cat', u('carl'));
  assert.deepEqual(names(q), ['ANA:priority:1', 'BOB:priority:3', 'CARL:priority:1', 'ZOE:winner:1']);
});

test('chaque cadeau compte : 2 galaxies = 6 questions, 3 chats = 3 questions', () => {
  const q = new LiveQueue();
  q.addGift('galaxy', u('bob'), 2);
  q.addGift('cat', u('ana'), 3);
  assert.deepEqual(names(q), ['BOB:priority:6', 'ANA:priority:3']);
});

test('ordre strict : un cadeau renvoyé après quelqu’un d’autre repasse en fin de file', () => {
  const q = new LiveQueue();
  q.addGift('cat', u('ana'));
  q.addGift('cat', u('ana'));
  q.addGift('cat', u('bob'));
  q.addGift('cat', u('ana'));
  assert.deepEqual(names(q), ['ANA:priority:2', 'BOB:priority:1', 'ANA:priority:1']);
});

test('cœur ballon avant le premier jeu : en attente jusqu’à la fin du jeu', () => {
  const q = new LiveQueue();
  q.addGift('heart', u('hugo'));
  assert.equal(q.list().length, 0);
  assert.equal(q.pendingHearts.length, 1);
  q.startGame();
  q.closeGame([{ ...u('zoe'), door: 1 }]);
  assert.deepEqual(names(q), ['ZOE:winner:1', 'HUGO:heart:1']);
});

test('cœur ballon pendant un jeu : ajouté après les gagnants à la fermeture', () => {
  const q = new LiveQueue();
  q.startGame();
  q.closeGame([]);
  q.startGame();
  q.addGift('heart', u('hugo'));
  assert.equal(q.hearts.length, 0);
  q.closeGame([{ ...u('zoe'), door: 1 }]);
  assert.deepEqual(names(q), ['ZOE:winner:1', 'HUGO:heart:1']);
});

test('cœur ballon entre deux jeux : ajouté tout de suite', () => {
  const q = new LiveQueue();
  q.startGame();
  q.closeGame([{ ...u('zoe'), door: 1 }]);
  q.addGift('heart', u('hugo'));
  assert.deepEqual(names(q), ['ZOE:winner:1', 'HUGO:heart:1']);
});

test('donuts dans une liste à part, retirables', () => {
  const q = new LiveQueue();
  const d = q.addGift('donut', u('dina'), 2);
  assert.equal(q.list().length, 0);
  assert.equal(q.donuts[0].count, 2);
  q.removeDonut(d.id);
  assert.equal(q.donuts.length, 0);
});

test('personne suivante et annulation', () => {
  const q = new LiveQueue();
  q.addGift('cat', u('ana'));
  q.addGift('cat', u('bob'));
  assert.equal(q.next().key, 'ana');
  assert.equal(q.current.key, 'bob');
  q.undo();
  assert.equal(q.current.key, 'ana');
});

test('sauvegarde et rechargement', () => {
  const q = new LiveQueue();
  q.addGift('galaxy', u('bob'));
  q.addGift('heart', u('hugo'));
  const r = new LiveQueue(JSON.parse(JSON.stringify(q)));
  assert.deepEqual(names(r), names(q));
  assert.equal(r.pendingHearts.length, 1);
});

test('un gagnant déjà dans la liste n’est pas ajouté deux fois', () => {
  const q = new LiveQueue();
  q.startGame();
  q.closeGame([{ ...u('zoe'), door: 1 }, { ...u('zoe'), door: 4 }]);
  assert.equal(q.winners.length, 1);
});

test('rôle d’un cadeau : par identifiant, sinon par nom (accents et casse ignorés)', () => {
  assert.equal(roleOf({ giftName: 'Galaxy' }), 'galaxy');
  assert.equal(roleOf({ giftName: 'coeur BALLON' }), 'heart');
  assert.equal(roleOf({ giftName: 'Rose' }), null);
  assert.equal(roleOf({ giftId: 99, giftName: 'Rose' }, { byId: { 99: 'donut' } }), 'donut');
  assert.equal(roleOf({ giftId: 5, giftName: 'Donut' }, { byId: { 5: 'none' } }), null);
  assert.equal(roleOf({ giftName: 'Mon chat' }, { names: { cat: ['Mon chat'] } }), 'cat');
});

test('combos : seule l’augmentation compte, doublons ignorés', () => {
  const c = new GiftCounter();
  const g = (repeatCount, repeatEnd, msgId) => ({ userKey: 'ana', giftId: 1, groupId: 'g1', combo: true, repeatCount, repeatEnd, msgId });
  assert.equal(c.count(g(1, 0, 'a')), 1);
  assert.equal(c.count(g(2, 0, 'b')), 1);
  assert.equal(c.count(g(2, 0, 'b')), 0);
  assert.equal(c.count(g(5, 1, 'c')), 3);
  assert.equal(c.count({ userKey: 'bob', giftId: 2, combo: false, repeatCount: 1, msgId: 'd' }), 1);
  assert.equal(c.count({ userKey: 'bob', giftId: 2, combo: false, repeatCount: 1, msgId: 'e' }), 1);
});

test('classement des likes', () => {
  const l = new Likes();
  l.add(u('ana'), 10, 10);
  l.add(u('bob'), 30, 40);
  l.add(u('ana'), 25, 65);
  assert.deepEqual(l.top(2).map((x) => [x.handle, x.likes]), [['ana', 35], ['bob', 30]]);
  assert.equal(l.total, 65);
});

test('session : relances sur les portes non ouvertes, gagnants cumulés', () => {
  const r = new Round();
  r.start();
  r.handle({ handle: 'ana', name: 'Ana', text: '3' });
  r.handle({ handle: 'bob', name: 'Bob', text: '5' });
  r.close();
  r.openDoor(3);
  assert.equal(r.closedDoors().includes(3), false);
  assert.equal(r.closedDoors().length, 11);
  r.openDoor(5);
  assert.deepEqual(r.sessionWinners().map((w) => [w.key, w.door]), [['ana', 3], ['bob', 5]]);
});
