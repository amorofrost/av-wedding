import { Router } from 'express';
import { getContent } from '../config/content.js';
import { DEFAULT_LANG } from '../lib/lang.js';

const router = Router();

// Главная страница: вся информация о свадьбе.
router.get('/', (req, res) => {
  res.render('home', {
    content: getContent(DEFAULT_LANG),
    invite: null,
    page: 'home',
  });
});

// Здоровье сервиса (для мониторинга / healthcheck контейнера).
router.get('/healthz', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default router;
