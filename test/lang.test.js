import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPPORTED,
  DEFAULT_LANG,
  normalizeLang,
  parseAcceptLanguage,
  resolveLang,
  buildLangHref,
} from '../src/lib/lang.js';

test('SUPPORTED lists the three languages in display order', () => {
  assert.deepEqual(SUPPORTED, ['ru', 'uk', 'en']);
  assert.equal(DEFAULT_LANG, 'ru');
});

test('normalizeLang accepts supported codes and rejects everything else', () => {
  assert.equal(normalizeLang('ru'), 'ru');
  assert.equal(normalizeLang('EN'), 'en');
  assert.equal(normalizeLang(' uk '), 'uk');
  assert.equal(normalizeLang('de'), null);
  assert.equal(normalizeLang(''), null);
  assert.equal(normalizeLang(undefined), null);
  assert.equal(normalizeLang({}), null);
});

test('parseAcceptLanguage picks the highest-q supported primary subtag', () => {
  assert.equal(parseAcceptLanguage('uk-UA,ru;q=0.9,en;q=0.8'), 'uk');
  assert.equal(parseAcceptLanguage('en-US,en;q=0.9'), 'en');
  assert.equal(parseAcceptLanguage('ru-RU,ru;q=0.9'), 'ru');
});

test('parseAcceptLanguage sorts by q rather than by position', () => {
  assert.equal(parseAcceptLanguage('de;q=0.2,en;q=0.9'), 'en');
  assert.equal(parseAcceptLanguage('en;q=0.3,uk;q=0.7'), 'uk');
});

test('parseAcceptLanguage skips unsupported tags', () => {
  assert.equal(parseAcceptLanguage('de-DE,fr;q=0.9,en;q=0.1'), 'en');
});

test('parseAcceptLanguage returns null when nothing matches', () => {
  assert.equal(parseAcceptLanguage('de-DE,fr;q=0.9'), null);
  assert.equal(parseAcceptLanguage(''), null);
  assert.equal(parseAcceptLanguage(undefined), null);
  assert.equal(parseAcceptLanguage('!!! broken ;;;'), null);
});

test('resolveLang: explicit guest choice outranks everything', () => {
  const lang = resolveLang({
    cookies: { av_lang: 'uk', av_lang_invite: 'en' },
    acceptLanguage: 'ru',
    inviteLang: 'en',
  });
  assert.equal(lang, 'uk');
});

test('resolveLang: the invite language beats the invite cookie and the browser', () => {
  const lang = resolveLang({
    cookies: { av_lang_invite: 'uk' },
    acceptLanguage: 'ru-RU',
    inviteLang: 'en',
  });
  assert.equal(lang, 'en');
});

test('resolveLang: the invite cookie beats the browser', () => {
  const lang = resolveLang({
    cookies: { av_lang_invite: 'en' },
    acceptLanguage: 'ru-RU',
  });
  assert.equal(lang, 'en');
});

test('resolveLang: falls back to the browser, then to Russian', () => {
  assert.equal(resolveLang({ cookies: {}, acceptLanguage: 'uk-UA' }), 'uk');
  assert.equal(resolveLang({ cookies: {}, acceptLanguage: 'de-DE' }), 'ru');
  assert.equal(resolveLang({}), 'ru');
});

test('resolveLang ignores unsupported cookie values', () => {
  assert.equal(resolveLang({ cookies: { av_lang: 'de' }, acceptLanguage: 'en' }), 'en');
});

test('buildLangHref adds lang and preserves other query params', () => {
  assert.equal(buildLangHref('/invite/abc?saved=1', 'en'), '/invite/abc?saved=1&lang=en');
  assert.equal(buildLangHref('/', 'uk'), '/?lang=uk');
});

test('buildLangHref replaces an existing lang param rather than duplicating it', () => {
  assert.equal(buildLangHref('/?lang=ru', 'en'), '/?lang=en');
  assert.equal(buildLangHref('/invite/x?lang=ru&saved=1', 'uk'), '/invite/x?saved=1&lang=uk');
});
