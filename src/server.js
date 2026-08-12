import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';

import publicRoutes from './routes/public.js';
import inviteRoutes from './routes/invite.js';
import adminRoutes from './routes/admin.js';
import content from './config/content.js';
import { getStore, usingAzure } from './lib/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Работа за reverse-proxy (nginx / Azure) — доверяем заголовкам X-Forwarded-*
app.set('trust proxy', 1);

// Шаблоны
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// Статика
app.use(
  '/static',
  express.static(path.join(__dirname, '..', 'public'), { maxAge: '7d' }),
);

// Парсеры
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// Общие переменные для всех шаблонов
app.use((req, res, next) => {
  res.locals.siteTitle = `${content.couple.bride} & ${content.couple.groom}`;
  res.locals.currentYear = new Date().getFullYear();
  next();
});

// Маршруты
app.use('/', publicRoutes);
app.use('/', inviteRoutes);
app.use('/admin', adminRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    content,
    code: 404,
    message: 'Страница не найдена',
  });
});

// Обработчик ошибок
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Ошибка:', err);
  res.status(500).render('error', {
    content,
    code: 500,
    message: 'Что-то пошло не так. Попробуйте позже.',
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
