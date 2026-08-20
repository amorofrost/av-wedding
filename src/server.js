import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';

import publicRoutes from './routes/public.js';
import inviteRoutes from './routes/invite.js';
import adminRoutes from './routes/admin.js';
import { getContent } from './config/content.js';
import { getStore, usingAzure } from './lib/store.js';
import { DEFAULT_LANG, LANG_COOKIE, normalizeLang, resolveLang } from './lib/lang.js';
import { LANG_COOKIE_OPTIONS, setLocals } from './lib/locals.js';
import { getUi } from './config/i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Работа за reverse-proxy (nginx / Azure) — доверяем заголовкам X-Forwarded-*
app.set('trust proxy', 1);

// Шаблоны
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Статика
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use('/static', express.static(PUBLIC_DIR, { maxAge: '7d' }));

// Метка версии статики.
//
// Файлы отдаются с maxAge=7d, и браузер в течение недели берёт их из кэша, даже
// не спрашивая сервер. HTML при этом не кэшируется и обновляется сразу — то есть
// после выкладки гость получает новую разметку со старым CSS, и вёрстка едет.
// Поэтому в адрес статики добавляется ?v=<метка>: файл изменился — изменился
// адрес — браузер скачивает заново. Метка считается один раз при старте по
// самому свежему времени изменения файлов в public/.
function newestMtime(dir) {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const time = entry.isDirectory() ? newestMtime(full) : fs.statSync(full).mtimeMs;
    if (time > newest) newest = time;
  }
  return newest;
}

const ASSET_VERSION = Math.floor(newestMtime(PUBLIC_DIR)).toString(36);

// Парсеры
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Язык страницы ────────────────────────────────────────────────────────────
// Порядок выбора описан в src/lib/lang.js, раскладка по res.locals — в
// src/lib/locals.js. Здесь middleware только связывает одно с другим.
//
// Язык приглашения на этом этапе ещё неизвестен — за ним нужен поход в
// хранилище. Его подставляет routes/invite.js через applyInviteLang().
app.use((req, res, next) => {
  // Переключатель языка: ставим cookie и убираем ?lang= из адреса, чтобы
  // параметр не тянулся по всем последующим ссылкам. Прочие параметры
  // (например ?saved=1) сохраняем.
  //
  // Перехватываем только GET: у остальных методов ?lang= может сопровождать
  // тело запроса (например форму RSVP), и редирект 302 это тело потеряет.
  const requested = req.method === 'GET' ? normalizeLang(req.query.lang) : null;
  if (requested) {
    res.cookie(LANG_COOKIE, requested, LANG_COOKIE_OPTIONS);
    let url;
    try {
      url = new URL(req.originalUrl, 'http://placeholder');
    } catch {
      // Адрес неразбираем — уходим на главную, а не роняем запрос исключением.
      return res.redirect(302, '/');
    }
    url.searchParams.delete('lang');
    return res.redirect(302, `${url.pathname}${url.search}`);
  }

  setLocals(
    req,
    res,
    resolveLang({
      cookies: req.cookies || {},
      acceptLanguage: req.get('accept-language') || '',
    }),
  );
  next();
});

// Сессии (для админ-раздела)
const isProd = process.env.NODE_ENV === 'production';

// Cookie с флагом Secure браузер отдаёт только по HTTPS. За обратным прокси с TLS
// это правильно, но если сайт открыт напрямую по http:// — cookie не выставится
// вовсе и вход в админку будет молча возвращать на форму логина. Поэтому флаг
// можно задать явно, независимо от NODE_ENV.
const cookieSecure =
  process.env.SESSION_COOKIE_SECURE !== undefined
    ? process.env.SESSION_COOKIE_SECURE === 'true'
    : isProd;

app.use(
  session({
    name: 'av_sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookieSecure, // при HTTPS за прокси
      maxAge: 1000 * 60 * 60 * 12, // 12 часов
    },
  }),
);

// Общие переменные для всех шаблонов (язык, контент и siteTitle ставит
// middleware выбора языка).
app.use((req, res, next) => {
  res.locals.currentYear = new Date().getFullYear();
  res.locals.assetVersion = ASSET_VERSION;
  next();
});

// Маршруты
app.use('/', publicRoutes);
app.use('/', inviteRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
  if (!res.locals.t) setLocals(req, res, DEFAULT_LANG);
  res.status(404).render('error', {
    content: res.locals.content || getContent(DEFAULT_LANG),
    code: 404,
    message: (res.locals.t || getUi(DEFAULT_LANG)).errors.notFound,
  });
});

// Обработчик ошибок
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Ошибка:', err);
  if (!res.locals.t) setLocals(req, res, DEFAULT_LANG);
  res.status(500).render('error', {
    content: res.locals.content || getContent(DEFAULT_LANG),
    code: 500,
    message: (res.locals.t || getUi(DEFAULT_LANG)).errors.server,
  });
});

async function start() {
  // Инициализируем хранилище заранее, чтобы упасть быстро при ошибке конфигурации.
  await getStore();
  app.listen(PORT, () => {
    console.log(`♥ Свадебный сайт запущен на порту ${PORT}`);
    console.log(`  Хранилище: ${usingAzure() ? 'Azure Table Storage' : 'локальный файл (dev)'}`);
    console.log(`  Админка:   /admin`);
    console.log(
      `  Cookie:    Secure=${cookieSecure}` +
        (cookieSecure
          ? ' — вход в админку возможен только по HTTPS'
          : ' — вход работает и по HTTP'),
    );
  });
}

start().catch((err) => {
  console.error('Не удалось запустить приложение:', err);
  process.exit(1);
});

export default app;
