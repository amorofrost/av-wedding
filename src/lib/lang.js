// ─────────────────────────────────────────────────────────────────────────────
// Языки сайта: список, разбор Accept-Language и правило выбора языка.
//
// Модуль намеренно чистый — ничего не знает ни про Express, ни про контент,
// поэтому целиком покрывается юнит-тестами (test/lang.test.js).
// ─────────────────────────────────────────────────────────────────────────────

// Порядок важен: в таком виде языки показываются в переключателе.
export const SUPPORTED = ['ru', 'uk', 'en'];
export const DEFAULT_LANG = 'ru';

// Явный выбор гостя — ставится только переключателем и живёт дольше всего.
export const LANG_COOKIE = 'av_lang';
// Язык из приглашения — переносит язык персональной ссылки на остальные
// страницы сайта. Отдельная cookie нужна, чтобы открытие приглашения не
// затирало язык, который гость выбрал руками.
export const INVITE_LANG_COOKIE = 'av_lang_invite';

// Названия языков пишутся на самих себе и не переводятся, поэтому лежат здесь,
// а не в словаре интерфейса: языковая карта схлопывается до одной строки, а
// переключателю нужны все три названия сразу.
export const LANG_NAMES = {
  ru: 'Русский',
  uk: 'Українська',
  en: 'English',
};

export const LANG_SHORT = {
  ru: 'RU',
  uk: 'UA',
  en: 'EN',
};

// Приводит значение к коду поддерживаемого языка или к null.
export function normalizeLang(value) {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase();
  return SUPPORTED.includes(code) ? code : null;
}

// Разбирает заголовок Accept-Language и возвращает первый поддерживаемый язык
// в порядке убывания q. Сравнение идёт по основному субтегу: uk-UA → uk.
export function parseAcceptLanguage(header) {
  if (typeof header !== 'string' || !header.trim()) return null;

  const entries = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isNaN(q) ? 0 : q };
    })
    .filter((e) => e.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of entries) {
    const primary = normalizeLang(tag.split('-')[0]);
    if (primary) return primary;
  }
  return null;
}

// Правило выбора языка. Первое совпадение выигрывает:
//   1. явный выбор гостя (cookie av_lang)
//   2. язык приглашения (только на странице приглашения)
//   3. язык последнего открытого приглашения (cookie av_lang_invite)
//   4. Accept-Language браузера
//   5. русский
export function resolveLang({ cookies = {}, acceptLanguage = '', inviteLang = null } = {}) {
  return (
    normalizeLang(cookies[LANG_COOKIE]) ||
    normalizeLang(inviteLang) ||
    normalizeLang(cookies[INVITE_LANG_COOKIE]) ||
    parseAcceptLanguage(acceptLanguage) ||
    DEFAULT_LANG
  );
}

// Ссылка переключателя: текущий адрес плюс ?lang=<код>. Остальные параметры
// (например ?saved=1) сохраняются, старый lang заменяется, а не дублируется.
export function buildLangHref(originalUrl, code) {
  // База нужна только для разбора относительного адреса и в результат не идёт.
  const url = new URL(originalUrl || '/', 'http://placeholder');
  url.searchParams.delete('lang');
  url.searchParams.set('lang', code);
  return `${url.pathname}${url.search}`;
}
