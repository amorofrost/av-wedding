import { Router } from 'express';
import content from '../config/content.js';

const router = Router();

// Главная страница: вся информация о свадьбе.
router.get('/', (req, res) => {
  res.render('home', {
    content,
    invite: null,
    page: 'home',
  });
});

// Здоровье сервиса (для мониторинга / healthcheck контейнера).
router.get('/healthz', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default router;
