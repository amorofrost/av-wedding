import test from 'node:test';
import assert from 'node:assert/strict';
import { plural } from '../src/lib/plural.js';

const RU = { one: 'гость', few: 'гостя', many: 'гостей' };
const UK = { one: 'гість', few: 'гості', many: 'гостей' };
const EN = { one: 'guest', other: 'guests' };

test('Russian picks the one form for 1, 21, 101', () => {
  assert.equal(plural('ru', 1, RU), 'гость');
  assert.equal(plural('ru', 21, RU), 'гость');
  assert.equal(plural('ru', 101, RU), 'гость');
});

test('Russian picks the few form for 2-4, 22-24', () => {
  assert.equal(plural('ru', 2, RU), 'гостя');
  assert.equal(plural('ru', 3, RU), 'гостя');
  assert.equal(plural('ru', 4, RU), 'гостя');
  assert.equal(plural('ru', 22, RU), 'гостя');
});

test('Russian picks the many form for 0, 5-20, 11, 111', () => {
  assert.equal(plural('ru', 0, RU), 'гостей');
  assert.equal(plural('ru', 5, RU), 'гостей');
  assert.equal(plural('ru', 11, RU), 'гостей');
  assert.equal(plural('ru', 12, RU), 'гостей');
  assert.equal(plural('ru', 14, RU), 'гостей');
  assert.equal(plural('ru', 20, RU), 'гостей');
  assert.equal(plural('ru', 111, RU), 'гостей');
});

test('Ukrainian follows the same three-form rule', () => {
  assert.equal(plural('uk', 1, UK), 'гість');
  assert.equal(plural('uk', 3, UK), 'гості');
  assert.equal(plural('uk', 11, UK), 'гостей');
  assert.equal(plural('uk', 22, UK), 'гості');
});

test('English uses one for 1 and other for everything else', () => {
  assert.equal(plural('en', 1, EN), 'guest');
  assert.equal(plural('en', 0, EN), 'guests');
  assert.equal(plural('en', 2, EN), 'guests');
  assert.equal(plural('en', 21, EN), 'guests');
});

test('plural tolerates missing forms and non-numeric counts', () => {
  assert.equal(plural('ru', 2, { one: 'гость' }), 'гость');
  assert.equal(plural('en', 5, {}), '');
  assert.equal(plural('ru', NaN, RU), 'гостей');
});
