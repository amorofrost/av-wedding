// ─────────────────────────────────────────────────────────────────────────────
// Раскладка языка по res.locals.
//
// Отдельный модуль, а не часть server.js: те же функции нужны маршруту
// приглашения, а server.js его уже импортирует — получился бы цикл.
// ─────────────────────────────────────────────────────────────────────────────

import { SUPPORTED, LANG_NAMES, LANG_SHORT, buildLangHref } from './lang.js';
import { plural } from './plural.js';
import { getContent } from '../config/content.js';
import { getUi } from '../config/i18n.js';

export const LANG_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 1000 * 60 * 60 * 24 * 365, // год
  // Флага Secure здесь намеренно нет. В отличие от сессионной cookie эта
  // ничего не защищает, поэтому не должна зависеть от наличия TLS —
  // переключатель обязан работать и на http://<ip>:3000.
};

// Кладёт в res.locals всё, что нужно шаблонам: язык, подписи интерфейса,
// контент на этом языке, заголовок сайта и ссылки переключателя.
export function setLocals(req, res, lang) {
  res.locals.lang = lang;
  res.locals.t = getUi(lang);
  res.locals.content = getContent(lang);
  // Порядок — как в монограмме: сначала жених, потом невеста.
  res.locals.siteTitle = `${res.locals.content.couple.groom} & ${res.locals.content.couple.bride}`;
  // Нужен шаблону приглашения: «2 гостя» против «5 гостей».
  res.locals.plural = (n, forms) => plural(lang, n, forms);
  res.locals.langLinks = SUPPORTED.map((code) => ({
    code,
    short: LANG_SHORT[code],
    name: LANG_NAMES[code],
    href: buildLangHref(req.originalUrl, code),
    active: code === lang,
  }));
}
