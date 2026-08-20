import { Router } from 'express';

const router = Router();

// Главная страница: вся информация о свадьбе.
router.get('/', (req, res) => {
  // content, lang и t приходят из res.locals (middleware выбора языка).
  res.render('home', { invite: null, page: 'home' });
});

// Здоровье сервиса (для мониторинга / healthcheck контейнера).
router.get('/healthz', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default router;
