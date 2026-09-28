// Tests des règles du jeu : node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractNumbers, Round } from '../js/game.js';

test('extrait les chiffres valides', () => {
  assert.deepEqual(extractNumbers('7'), [7]);
  assert.deepEqual(extractNumbers('je prends la 12 !'), [12]);
  assert.deepEqual(extractNumbers('porte 3 stp'), [3]);
  assert.deepEqual(extractNumbers('07'), [7]);
  assert.deepEqual(extractNumbers('5 5 5'), [5]);
  assert.deepEqual(extractNumbers('7️⃣'), [7]);
  assert.deepEqual(extractNumbers('1️⃣2️⃣'), [12]);
  assert.deepEqual(extractNumbers('🔟'), [10]);
  assert.deepEqual(extractNumbers('８'), [8]);
  assert.deepEqual(extractNumbers('porte7'), [7]);
});

test('ignore ce qui n’est pas un choix de porte', () => {
  assert.deepEqual(extractNumbers('bonsoir'), []);
  assert.deepEqual(extractNumbers('0'), []);
  assert.deepEqual(extractNumbers('13'), []);
  assert.deepEqual(extractNumbers('2025'), []);
  assert.deepEqual(extractNumbers("c'est ma 1ère fois"), []);
  assert.deepEqual(extractNumbers('à 3h du matin'), []);
  assert.deepEqual(extractNumbers(''), []);
  assert.deepEqual(extractNumbers(null), []);
});

test('plusieurs chiffres différents dans un message', () => {
  assert.deepEqual(extractNumbers('entre 3 et 7'), [3, 7]);
});

const msg = (handle, text, extra = {}) => ({ handle, name: handle.toUpperCase(), text, ...extra });

test('une participation par personne', () => {
  const r = new Round();
  r.start();
  assert.equal(r.handle(msg('alice', '4')).type, 'join');
  assert.equal(r.handle(msg('alice', 'encore la 4 !')).type, 'same');
  assert.equal(r.handle(msg('alice', 'hello')).type, 'ignored');
  assert.equal(r.players.size, 1);
  assert.equal(r.players.get('alice').choice, 4);
});

test('changer de chiffre élimine', () => {
  const r = new Round();
  r.start();
  r.handle(msg('bob', '2'));
  const res = r.handle(msg('bob', 'non la 9'));
  assert.equal(res.type, 'out');
  assert.equal(r.players.has('bob'), false);
  assert.deepEqual(r.out.get('bob').choices, [2, 9]);
  // reste éliminé ensuite
  assert.equal(r.handle(msg('bob', '2')).type, 'ignored');
  assert.equal(r.players.has('bob'), false);
});

test('deux chiffres différents dès le premier message élimine', () => {
  const r = new Round();
  r.start();
  assert.equal(r.handle(msg('carla', '3 ou 5')).type, 'out');
  assert.deepEqual(r.out.get('carla').choices, [3, 5]);
});

test('le compte du live est ignoré', () => {
  const r = new Round();
  r.setHost('@Voyante');
  r.start();
  assert.equal(r.handle(msg('voyante', 'tapez un chiffre entre 1 et 12')).type, 'ignored');
  assert.equal(r.out.size, 0);
});

test('rien n’est compté hors participation', () => {
  const r = new Round();
  assert.equal(r.handle(msg('dan', '6')).type, 'ignored');
  r.start();
  r.handle(msg('dan', '6'));
  r.close();
  assert.equal(r.handle(msg('eve', '6')).type, 'ignored');
  assert.equal(r.players.size, 1);
});

test('gagnants et compteurs', () => {
  const r = new Round();
  r.start();
  r.handle(msg('a', '6'));
  r.handle(msg('b', '6'));
  r.handle(msg('c', '11'));
  r.handle(msg('d', '6 puis 11'));
  assert.deepEqual(r.winners(6).map((p) => p.handle), ['a', 'b']);
  assert.equal(r.counts()[6], 2);
  assert.equal(r.counts()[11], 1);
  assert.equal(r.out.size, 1);
});

test('pseudo insensible à la casse et au @', () => {
  const r = new Round();
  r.start();
  r.handle(msg('@Zoé', '1'));
  assert.equal(r.handle(msg('zoé', '1')).type, 'same');
});
