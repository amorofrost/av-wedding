import test from 'node:test';
import assert from 'node:assert/strict';
import { isLangMap, localize } from '../src/lib/localize.js';

test('isLangMap recognizes objects whose keys are all language codes', () => {
  assert.equal(isLangMap({ ru: 'а', uk: 'б', en: 'c' }), true);
  assert.equal(isLangMap({ ru: 'а' }), true);
  assert.equal(isLangMap({ ru: 'а', en: 'c' }), true);
});

test('isLangMap rejects ordinary content objects', () => {
  assert.equal(isLangMap({ bride: 'а', groom: 'б' }), false);
  assert.equal(isLangMap({ ru: 'а', title: 'б' }), false);
  assert.equal(isLangMap({}), false);
  assert.equal(isLangMap([]), false);
  assert.equal(isLangMap('ru'), false);
  assert.equal(isLangMap(null), false);
});

test('localize collapses a language map to the requested language', () => {
  const map = { ru: 'Где', uk: 'Де', en: 'Where' };
  assert.equal(localize(map, 'ru'), 'Где');
  assert.equal(localize(map, 'uk'), 'Де');
  assert.equal(localize(map, 'en'), 'Where');
});

test('localize falls back to Russian, then to any present value', () => {
  assert.equal(localize({ ru: 'Где', en: 'Where' }, 'uk'), 'Где');
  assert.equal(localize({ en: 'Where' }, 'uk'), 'Where');
});

test('localize passes bare values through untouched', () => {
  assert.equal(localize('The Casa Grande', 'en'), 'The Casa Grande');
  assert.equal(localize(42, 'ru'), 42);
  assert.equal(localize('', 'ru'), '');
  assert.equal(localize(null, 'ru'), null);
});

test('localize recurses into ordinary objects', () => {
  const input = {
    name: 'The Casa Grande',
    kicker: { ru: 'Место', uk: 'Місце', en: 'Venue' },
  };
  assert.deepEqual(localize(input, 'uk'), {
    name: 'The Casa Grande',
    kicker: 'Місце',
  });
});

test('localize recurses into arrays', () => {
  const input = [
    { q: { ru: 'Вопрос', uk: 'Питання', en: 'Question' }, a: 'same' },
  ];
  assert.deepEqual(localize(input, 'en'), [{ q: 'Question', a: 'same' }]);
});

test('localize handles maps whose values are objects (plural forms)', () => {
  const input = {
    ru: { one: 'гость', few: 'гостя', many: 'гостей' },
    uk: { one: 'гість', few: 'гості', many: 'гостей' },
    en: { one: 'guest', other: 'guests' },
  };
  assert.deepEqual(localize(input, 'en'), { one: 'guest', other: 'guests' });
});

test('localize handles deeply nested structures', () => {
  const input = {
    schedule: [
      {
        date: { ru: '9 октября', uk: '9 жовтня', en: 'October 9' },
        items: [{ time: { ru: 'вечер', uk: 'вечір', en: 'evening' } }],
      },
    ],
  };
  assert.deepEqual(localize(input, 'en'), {
    schedule: [{ date: 'October 9', items: [{ time: 'evening' }] }],
  });
});
