import { Router } from 'express';
import { getContent } from '../config/content.js';
import { DEFAULT_LANG } from '../lib/lang.js';
import { getStore } from '../lib/store.js';
import { applyInviteLang } from '../lib/locals.js';

const router = Router();

// Персональное приглашение по уникальной ссылке /invite/:code
router.get('/invite/:code', async (req, res, next) => {
  try {
    const store = await getStore();
    const invite = await store.getInvite(req.params.code);
    if (!invite) {
      return res.status(404).render('invite-not-found', { page: 'invite' });
    }
    applyInviteLang(req, res, invite);
    res.render('invite', {
      invite,
      page: 'invite',
      saved: req.query.saved === '1',
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

// Приём формы RSVP
router.post('/invite/:code/rsvp', async (req, res, next) => {
  try {
    const store = await getStore();
    const invite = await store.getInvite(req.params.code);
    if (!invite) {
      return res.status(404).render('invite-not-found', { page: 'invite' });
    }
    applyInviteLang(req, res, invite);

    const attendingRaw = req.body.attending;
    const attending = attendingRaw === 'yes' ? true : attendingRaw === 'no' ? false : null;

    if (attending === null) {
      return res.status(400).render('invite', {
        invite,
        page: 'invite',
        saved: false,
        error: res.locals.t.rsvp.errorNoChoice,
      });
    }

    let guestCount = 0;
    if (attending) {
      guestCount = parseInt(req.body.guestCount, 10);
      if (Number.isNaN(guestCount) || guestCount < 1) guestCount = 1;
      if (guestCount > invite.maxGuests) guestCount = invite.maxGuests;
    }

    // Ночёвка: принимаем только значения из списка в content, всё остальное —
    // «ответа нет». Отказавшимся гостям вопрос не задаётся вовсе.
    // Значения ночёвки от языка не зависят, поэтому берём их из русского набора.
    const allowedOvernight = getContent(DEFAULT_LANG).rsvp.overnightOptions.map((o) => o.value);
    const overnightRaw = String(req.body.overnight || '');
    const overnight =
      attending && allowedOvernight.includes(overnightRaw) ? overnightRaw : '';

    const rsvp = {
      attending,
      guestCount: attending ? guestCount : 0,
      dietary: attending ? String(req.body.dietary || '').slice(0, 500) : '',
      overnight,
      message: String(req.body.message || '').slice(0, 1000),
    };

    await store.saveRsvp(req.params.code, rsvp);
    res.redirect(`/invite/${encodeURIComponent(req.params.code)}?saved=1`);
  } catch (err) {
    next(err);
  }
});

export default router;
