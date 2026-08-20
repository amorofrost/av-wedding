import test from 'node:test';
import assert from 'node:assert/strict';
import { getContent, raw } from '../src/config/content.js';
import { isLangMap } from '../src/lib/localize.js';
import { SUPPORTED } from '../src/lib/lang.js';

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

test('every translated content string is present in all three languages', () => {
  assert.deepEqual(findIncomplete(raw), []);
});

test('getContent collapses maps and leaves bare strings alone', () => {
  const en = getContent('en');
  assert.equal(typeof en.couple.bride, 'string');
  assert.equal(typeof en.venue.description, 'string');
  assert.equal(typeof en.event.dateISO, 'string');
  assert.equal(en.event.dateISO, raw.event.dateISO);
});

test('getContent memoizes per language', () => {
  assert.equal(getContent('uk'), getContent('uk'));
  assert.notEqual(getContent('uk'), getContent('en'));
});

test('overnight option values are language-independent', () => {
  const values = (lang) => getContent(lang).rsvp.overnightOptions.map((o) => o.value);
  assert.deepEqual(values('ru'), values('en'));
  assert.deepEqual(values('ru'), ['none', 'fri', 'sat', 'both']);
});

test('overnight option labels differ by language', () => {
  const ru = getContent('ru').rsvp.overnightOptions[0].label;
  const en = getContent('en').rsvp.overnightOptions[0].label;
  assert.notEqual(ru, en);
  assert.equal(typeof en, 'string');
});
