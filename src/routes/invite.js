import { Router } from 'express';
import content from '../config/content.js';
import { getStore } from '../lib/store.js';

const router = Router();

// Персональное приглашение по уникальной ссылке /invite/:code
router.get('/invite/:code', async (req, res, next) => {
  try {
    const store = await getStore();
    const invite = await store.getInvite(req.params.code);
    if (!invite) {
      return res.status(404).render('invite-not-found', { content, page: 'invite' });
    }
    res.render('invite', {
      content,
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
      return res.status(404).render('invite-not-found', { content, page: 'invite' });
    }

    const attendingRaw = req.body.attending;
    const attending = attendingRaw === 'yes' ? true : attendingRaw === 'no' ? false : null;

    if (attending === null) {
      return res.status(400).render('invite', {
        content,
        invite,
        page: 'invite',
        saved: false,
        error: 'Пожалуйста, выберите, сможете ли вы присутствовать.',
      });
    }

    let guestCount = 0;
    if (attending) {
      guestCount = parseInt(req.body.guestCount, 10);
      if (Number.isNaN(guestCount) || guestCount < 1) guestCount = 1;
      if (guestCount > invite.maxGuests) guestCount = invite.maxGuests;
    }

    const rsvp = {
      attending,
      guestCount: attending ? guestCount : 0,
      dietary: attending ? String(req.body.dietary || '').slice(0, 500) : '',
      message: String(req.body.message || '').slice(0, 1000),
    };

    await store.saveRsvp(req.params.code, rsvp);
    res.redirect(`/invite/${encodeURIComponent(req.params.code)}?saved=1`);
  } catch (err) {
    next(err);
  }
});

export default router;
