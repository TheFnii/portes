// Tests de la liste à traiter, des cadeaux, des classements et des paliers : node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LiveQueue, Ranking, Milestones, crossedTiers } from '../js/queue.js';
import { buildDeck, pickMessage, messageId } from '../js/universe.js';
import { roleOf, GiftCounter } from '../js/gifts.js';
import { Round } from '../js/game.js';

const u = (key) => ({ key, name: key.toUpperCase(), handle: key });
const names = (q) => q.list().map((e) => `${e.name}:${e.type}:${e.count}`);

test('ordre : priorités, puis gagnants, puis paliers', () => {
  const q = new LiveQueue();
  q.addMilestone(u('max'), '100k likes');
  q.addPriority(u('ana'), 'cat', 1);
  q.closeGame([{ ...u('zoe'), door: 3 }]);
  q.addPriority(u('bob'), 'galaxy', 3);
  assert.deepEqual(names(q), ['ANA:priority:1', 'BOB:priority:3', 'ZOE:winner:1', 'MAX:milestone:1']);
});

test('nombre de tirages en attente', () => {
  const q = new LiveQueue();
  q.addPriority(u('ana'), 'cat', 1);
  q.addPriority(u('bob'), 'galaxy', 6);
  q.closeGame([{ ...u('zoe'), door: 3 }]);
  q.addMilestone(u('max'), '100k likes');
  assert.equal(q.draws, 9);
});

test('ordre strict : un cadeau renvoyé après quelqu’un d’autre repasse en fin de file', () => {
  const q = new LiveQueue();
  q.addPriority(u('ana'), 'cat', 1);
  q.addPriority(u('ana'), 'cat', 1);
  q.addPriority(u('bob'), 'cat', 1);
  q.addPriority(u('ana'), 'cat', 1);
  assert.deepEqual(names(q), ['ANA:priority:2', 'BOB:priority:1', 'ANA:priority:1']);
});

test('lettres de l’univers : une par Donut, la plus récente en haut, retrouvables', () => {
  const q = new LiveQueue();
  const a = q.addDonut(u('dina'), 1, 'Message A');
  const b = q.addDonut(u('eva'), 1, 'Message B');
  assert.equal(q.list().length, 0);
  assert.deepEqual(q.donuts.map((e) => e.name), ['EVA', 'DINA']);
  assert.equal(q.letter(a.id).message, 'Message A');
  assert.equal(q.letter(b.id).name, 'EVA');
  const back = new LiveQueue(JSON.parse(JSON.stringify(q)));
  assert.equal(back.donuts[1].message, 'Message A');
});

test('paliers de likes par personne', () => {
  const tiers = [{ likes: 10000 }, { likes: 5000 }, { likes: 20000 }];
  assert.deepEqual(crossedTiers(tiers, 4000, 12000).map((t) => t.likes), [5000, 10000]);
  assert.deepEqual(crossedTiers(tiers, 4000, 12000, [5000]).map((t) => t.likes), [10000]);
  assert.deepEqual(crossedTiers(tiers, 10000, 10500), []);
  assert.deepEqual(crossedTiers(tiers, 9999, 10000).map((t) => t.likes), [10000]);
});

test('deck des messages de l’univers : suppressions, ajouts, sans répétition', () => {
  const g = ['Un', 'Deux', 'Trois', 'Deux'];
  const deck = buildDeck(g, { removed: [messageId('Trois')], added: ['Mon message'] });
  assert.deepEqual(deck.map((m) => m.text), ['Mon message', 'Un', 'Deux']);
  assert.equal(deck[0].source, 'added');
  const used = ['Mon message', 'Un'];
  for (let i = 0; i < 20; i++) assert.equal(pickMessage(deck, used), 'Deux');
  // Tout a déjà été donné : on recommence.
  assert.ok(deck.map((m) => m.text).includes(pickMessage(deck, ['Mon message', 'Un', 'Deux'])));
});

test('personne suivante et retour en arrière', () => {
  const q = new LiveQueue();
  q.addPriority(u('ana'), 'cat', 1);
  q.addPriority(u('bob'), 'cat', 1);
  assert.equal(q.next().key, 'ana');
  assert.equal(q.current.key, 'bob');
  q.undo();
  assert.equal(q.current.key, 'ana');
});

test('sauvegarde et rechargement (les anciennes données de cœurs sont ignorées)', () => {
  const q = new LiveQueue();
  q.addPriority(u('bob'), 'galaxy', 3);
  q.addMilestone(u('max'), '150k likes');
  const r = new LiveQueue({ ...JSON.parse(JSON.stringify(q)), hearts: [{ key: 'x' }] });
  assert.deepEqual(names(r), names(q));
});

test('un gagnant déjà dans la liste n’est pas ajouté deux fois', () => {
  const q = new LiveQueue();
  q.closeGame([{ ...u('zoe'), door: 1 }, { ...u('zoe'), door: 4 }]);
  assert.equal(q.winners.length, 1);
});

test('rôle d’un cadeau : par identifiant, sinon par nom (accents et casse ignorés)', () => {
  assert.equal(roleOf({ giftName: 'Galaxy' }), 'galaxy');
  assert.equal(roleOf({ giftName: 'chat PORTE-bonheur' }), 'cat');
  assert.equal(roleOf({ giftName: 'Heart Balloon' }), null);
  assert.equal(roleOf({ giftId: 99, giftName: 'Rose' }, { byId: { 99: 'donut' } }), 'donut');
  assert.equal(roleOf({ giftId: 5, giftName: 'Donut' }, { byId: { 5: 'none' } }), null);
});

test('combos : seule l’augmentation compte, doublons ignorés', () => {
  const c = new GiftCounter();
  const g = (repeatCount, repeatEnd, msgId) => ({ userKey: 'ana', giftId: 1, groupId: 'g1', combo: true, repeatCount, repeatEnd, msgId });
  assert.equal(c.count(g(1, 0, 'a')), 1);
  assert.equal(c.count(g(2, 0, 'b')), 1);
  assert.equal(c.count(g(2, 0, 'b')), 0);
  assert.equal(c.count(g(5, 1, 'c')), 3);
  assert.equal(c.count({ userKey: 'bob', giftId: 2, combo: false, repeatCount: 1, msgId: 'd' }), 1);
});

test('classements : likes et pièces offertes', () => {
  const l = new Ranking();
  l.add(u('ana'), 10, 10);
  l.add(u('bob'), 30, 40);
  l.add(u('ana'), 25, 65);
  assert.deepEqual(l.top(2).map((x) => [x.handle, x.value]), [['ana', 35], ['bob', 30]]);
  assert.equal(l.total, 65);
  // ancien format sauvegardé (likes)
  const old = new Ranking({ total: 5, users: { ana: { name: 'Ana', likes: 5 } } });
  assert.equal(old.top(1)[0].value, 5);
});

test('paliers : seul le bon nombre compte, le plus proche du franchissement gagne', () => {
  const m = new Milestones();
  const u = (name) => ({ name });
  assert.equal(m.status(99000), 'idle');
  m.observeTotal(99000, 0);
  assert.equal(m.observeChat({ text: '100k !', t: 1, user: u('trop tôt') }), false); // on n'écoute pas encore
  m.observeTotal(99850, 1000);
  assert.equal(m.status(), 'alert');
  m.observeChat({ text: '100k', t: 8000, user: u('Ana') }); // 2 s avant : ne compte pas
  m.observeChat({ text: 'allez les 150k', t: 9300, user: u('Faux') }); // mauvais nombre
  m.observeChat({ text: 'on y est presque 100 000 ✨', t: 9400, user: u('Bea') }); // 0,6 s avant
  m.observeTotal(100020, 10000); // franchissement à t = 10 000
  assert.equal(m.resolve(), null); // on attend un message d'après (ou la fin de la seconde)
  m.observeChat({ text: 'PALIER 100K', t: 10700, user: u('Cid') }); // 0,7 s après
  const r = m.resolve();
  assert.equal(r.palier, 100000);
  assert.equal(r.user.name, 'Bea'); // 0,6 s avant est plus proche que 0,7 s après
  assert.equal(m.next(), 150000);
});

test('paliers : un message juste après gagne ; sans message après, on tranche après 1 s', () => {
  const m = new Milestones();
  m.observeTotal(99900, 0);
  m.observeChat({ text: '100k', t: 9200, user: { name: 'Avant' } }); // 0,8 s avant
  m.observeTotal(100001, 10000);
  m.observeChat({ text: 'yes 100k', t: 10300, user: { name: 'Apres' } }); // 0,3 s après
  assert.equal(m.resolve().user.name, 'Apres');

  const m2 = new Milestones();
  m2.observeTotal(99900, 0);
  m2.observeChat({ text: '100k', t: 9500, user: { name: 'Seul' } });
  m2.observeTotal(100001, 10000);
  assert.equal(m2.resolve(), null);
  assert.equal(m2.resolve(true).user.name, 'Seul');

  // Personne avant : le premier message d'après gagne, même tard.
  const m3 = new Milestones();
  m3.observeTotal(100500, 10000);
  m3.observeChat({ text: '100k', t: 25000, user: { name: 'Tard' } });
  assert.equal(m3.resolve().user.name, 'Tard');
  // Le palier suivant (150k) demande « 150k ».
  m3.observeTotal(149900, 30000);
  assert.equal(m3.observeChat({ text: '100k', t: 30100, user: { name: 'X' } }), false);
  assert.equal(m3.observeChat({ text: '150k', t: 30200, user: { name: 'Y' } }), true);
});

test('paliers : formes acceptées', () => {
  const m = new Milestones();
  ['100k', '100 k', '100K', '100000', '100 000', '100.000', '100,000', 'bravo pour les 100k !!'].forEach((t) => assert.ok(m.mentions(t, 100000), t));
  ['10k', '1000', '100kg', '150k', '1100k', 'palier'].forEach((t) => assert.ok(!m.mentions(t, 100000), t));
  assert.ok(m.mentions('150k', 150000));
  assert.equal(Milestones.label(150000), '150k');
});

test('session : relances sur les portes non ouvertes, gagnants cumulés', () => {
  const r = new Round();
  r.start();
  r.handle({ handle: 'ana', name: 'Ana', text: '3' });
  r.handle({ handle: 'bob', name: 'Bob', text: '5' });
  r.close();
  r.openDoor(3);
  assert.equal(r.closedDoors().length, 11);
  r.openDoor(5);
  assert.deepEqual(r.sessionWinners().map((w) => [w.key, w.door]), [['ana', 3], ['bob', 5]]);
});
