import { Router } from 'express';
import { nanoid } from 'nanoid';
import content from '../config/content.js';
import { getStore, usingAzure } from '../lib/store.js';
import { requireAdmin, checkPassword } from '../middleware/auth.js';

const router = Router();

const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '');

function inviteUrl(req, code) {
  const base = APP_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/invite/${code}`;
}

// ── Ночёвка ──────────────────────────────────────────────────────────────────
// Дом снят на две ночи, и кроватей на каждую нужно разное количество: часть
// гостей приезжает только в пятницу, часть — только на субботу. Поэтому считаем
// не «сколько человек ночует», а сколько ночует в каждую из ночей.
const STAYS_FRI = ['fri', 'both'];
const STAYS_SAT = ['sat', 'both'];

function countGuests(invites, values) {
  return invites
    .filter((i) => i.attending === true && values.includes(i.overnight))
    .reduce((sum, i) => sum + (i.guestCount || 0), 0);
}

function overnightLabel(value) {
  const option = content.rsvp.overnightOptions.find((o) => o.value === value);
  return option ? option.label : '';
}

function overnightShort(value) {
  const option = content.rsvp.overnightOptions.find((o) => o.value === value);
  return option ? option.short : '';
}

// ── Логин ────────────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session?.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
  if (checkPassword(req.body.password)) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.status(401).render('admin/login', { error: 'Неверный пароль.' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ── Дашборд ──────────────────────────────────────────────────────────────────
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const store = await getStore();
    const invites = await store.listInvites();

    const stats = {
      total: invites.length,
      responded: invites.filter((i) => i.responded).length,
      attending: invites.filter((i) => i.attending === true).length,
      declined: invites.filter((i) => i.attending === false).length,
      pending: invites.filter((i) => !i.responded).length,
      totalGuests: invites
        .filter((i) => i.attending === true)
        .reduce((sum, i) => sum + (i.guestCount || 0), 0),
      nightFri: countGuests(invites, STAYS_FRI),
      nightSat: countGuests(invites, STAYS_SAT),
    };

    res.render('admin/dashboard', {
      invites,
      stats,
      overnightShort,
      inviteUrl: (code) => inviteUrl(req, code),
      backend: usingAzure() ? 'Azure Table Storage' : 'Локальный файл (dev)',
      created: req.query.created || null,
      flash: req.query.flash || null,
    });
  } catch (err) {
    next(err);
  }
});

// ── Создание приглашения ─────────────────────────────────────────────────────
router.post('/invites', requireAdmin, async (req, res, next) => {
  try {
    const store = await getStore();
    const names = String(req.body.names || '').trim();
    if (!names) return res.redirect('/admin?flash=' + encodeURIComponent('Укажите имя гостя.'));

    let maxGuests = parseInt(req.body.maxGuests, 10);
    if (Number.isNaN(maxGuests) || maxGuests < 1) maxGuests = 1;

    const code = nanoid(10);
    await store.createInvite({
      code,
      names,
      maxGuests,
      note: String(req.body.note || '').trim(),
    });

    res.redirect('/admin?created=' + encodeURIComponent(code));
  } catch (err) {
    next(err);
  }
});

// ── Удаление приглашения ─────────────────────────────────────────────────────
router.post('/invites/:code/delete', requireAdmin, async (req, res, next) => {
  try {
    const store = await getStore();
    await store.deleteInvite(req.params.code);
    res.redirect('/admin?flash=' + encodeURIComponent('Приглашение удалено.'));
  } catch (err) {
    next(err);
  }
});

// ── Экспорт в CSV ────────────────────────────────────────────────────────────
router.get('/export.csv', requireAdmin, async (req, res, next) => {
  try {
    const store = await getStore();
    const invites = await store.listInvites();

    const esc = (v) => {
      const s = String(v ?? '');
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };

    const header = [
      'Имена',
      'Код',
      'Макс. гостей',
      'Ответ получен',
      'Придёт',
      'Кол-во гостей',
      'Ночёвка',
      'Ограничения в еде',
      'Сообщение',
      'Дата ответа',
      'Заметка организатора',
    ];

    const rows = invites.map((i) =>
      [
        i.names,
        i.code,
        i.maxGuests,
        i.responded ? 'да' : 'нет',
        i.attending === true ? 'да' : i.attending === false ? 'нет' : '',
        i.guestCount ?? '',
        overnightLabel(i.overnight),
        i.dietary,
        i.message,
        i.respondedAt || '',
        i.note,
      ]
        .map(esc)
        .join(','),
    );

    const csv = '﻿' + [header.join(','), ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="rsvp-export.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
