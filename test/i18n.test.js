import test from 'node:test';
import assert from 'node:assert/strict';
import { getUi, rawUi } from '../src/config/i18n.js';
import { isLangMap } from '../src/lib/localize.js';
import { SUPPORTED } from '../src/lib/lang.js';

// Обходит дерево и собирает пути всех языковых карт, где не хватает языка.
function findIncomplete(node, path = '', missing = []) {
  if (isLangMap(node)) {
    for (const lang of SUPPORTED) {
      const value = node[lang];
      const empty = value === undefined || value === null || value === '';
      if (empty) missing.push(`${path}.${lang}`);
    }
    return missing;
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => findIncomplete(item, `${path}[${i}]`, missing));
    return missing;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      findIncomplete(value, path ? `${path}.${key}` : key, missing);
    }
  }
  return missing;
}

test('every UI string is present in all three languages', () => {
  assert.deepEqual(findIncomplete(rawUi), []);
});

test('getUi returns collapsed strings for the requested language', () => {
  assert.equal(getUi('ru').nav.venue, 'Где');
  assert.equal(getUi('uk').nav.venue, 'Де');
  assert.equal(getUi('en').nav.venue, 'Where');
});

test('getUi memoizes per language', () => {
  assert.equal(getUi('en'), getUi('en'));
  assert.notEqual(getUi('en'), getUi('ru'));
});

test('the guest plural forms survive collapsing', () => {
  assert.deepEqual(getUi('ru').rsvp.guests, {
    one: 'гость',
    few: 'гостя',
    many: 'гостей',
  });
  assert.deepEqual(getUi('en').rsvp.guests, { one: 'guest', other: 'guests' });
});
