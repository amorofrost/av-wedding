import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../src/lib/store.js';

test('an invite written before the lang field existed reports Russian', () => {
  assert.equal(normalize({}).lang, 'ru');
  assert.equal(normalize({ code: 'abc', names: 'Гость' }).lang, 'ru');
});

test('an unsupported stored language falls back to Russian', () => {
  assert.equal(normalize({ lang: 'de' }).lang, 'ru');
  assert.equal(normalize({ lang: '' }).lang, 'ru');
  assert.equal(normalize({ lang: null }).lang, 'ru');
});

test('a supported stored language is preserved', () => {
  assert.equal(normalize({ lang: 'ru' }).lang, 'ru');
  assert.equal(normalize({ lang: 'uk' }).lang, 'uk');
  assert.equal(normalize({ lang: 'en' }).lang, 'en');
});
