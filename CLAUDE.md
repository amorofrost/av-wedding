# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A wedding guest website: a public info page,
per-guest invite links (`/invite/<code>`), an RSVP form, and a password-protected admin panel at
`/admin`. Express + EJS server-side rendering, no build step, no client framework. Data lives in
Azure Table Storage in production, in a local JSON file in development. Deployed as a Docker
container on an Azure VM behind a reverse proxy.

**The entire UI is in Russian, and so are all code comments.** New user-facing strings and new
comments must be written in Russian to match. This CLAUDE.md and commit messages are in English.

## Commands

```bash
npm install
npm run dev      # node --watch src/server.js — restarts on file change
npm start        # production entrypoint
npm run seed     # inserts 3 sample invites, prints their /invite/<code> URLs
```

Requires Node >= 20 (Docker image is node:22-alpine). Two setup copies are needed before the app will
run: `.env.example` → `.env` (at minimum `ADMIN_PASSWORD` and `SESSION_SECRET`) and
`src/config/content.example.js` → `src/config/content.local.js`. Without
`AZURE_STORAGE_CONNECTION_STRING` the app falls back to `data/invites.json`, so local dev needs no
Azure account.

Docker: `docker compose up -d --build`, then `docker compose logs -f`. Health endpoint: `GET /healthz`.

**There is no test suite and no linter configured.** Verify changes by running `npm run dev` and
exercising the affected page: `/` (home), `/invite/<code>` (invite + RSVP), `/admin` (login,
create/delete invite, `/admin/export.csv`). Do not claim a change works without doing this — there is
nothing else to catch regressions. If you add tooling, wire it into `package.json` scripts and update
this file.

## Architecture

### Content is data, not markup

`src/config/content.js` is the single source of truth for every piece of site copy: couple names,
event date/time, the venue, the schedule, RSVP options, dress code + palette, story, FAQ, contacts,
footer. Templates only render it. Editing wedding details means editing that content — never hardcode
text into a `.ejs` view. Several sections are conditional on non-empty arrays (`story`, `faq`,
`venue.mapUrl`), so emptying an array is the supported way to hide a block.

**The content is split across two files because the repo is public.** `content.js` holds the
loader plus the non-identifying defaults; the identifying half — names, all dates, the venue,
the schedule, contact names — lives in gitignored `src/config/content.local.js`, with
`content.example.js` as the committed placeholder template. `content.js` ends with a top-level
`await import('./content.local.js')` and a **one-level-deep** merge: plain objects merge per key
(so local can set `couple: { bride }` alone), arrays and scalars replace wholesale. A missing local
file exits the process with instructions rather than silently serving "Имя невесты" to guests — but
a *syntax error* inside it is rethrown untouched, so don't collapse those two cases. Never move
identifying data back into `content.js`, and never let `.dockerignore` exclude the local file:
`COPY src ./src` is how it reaches the image, taken from the build machine.

The whole event happens at one place over two nights (9–11 Oct), so `content.venue` is a **single
object, not an array** — it renders once on the home page (`#venue` / "Где") and once on the invite.
`content.schedule` (`#when` / "Когда") is grouped by day: `[{ date, dayOfWeek, items: [{ time,
title, text }] }]`, with `text` optional. The date lives in the day heading, never repeated per row.

`content.rsvp.overnightOptions` is the closed set of answers to the overnight question — `none` /
`fri` / `sat` / `both`. It is the *only* place those values are listed: `routes/invite.js` validates
the submitted answer against it, so adding or renaming a value there is enough. Each option carries
`label` (guest-facing, also used in the CSV) and `short` (the admin chip).

Contact phone numbers deliberately come from `CONTACT_PHONE` / `CONTACT_PHONE2` env vars, not from
the file — the repo is public. Keep any future personal data out of `content.js` the same way. Two
photos follow the same rule and the same pattern: `HERO_PHOTO_URL` (plus optional
`HERO_PHOTO_POSITION` for the crop) → `content.couple.photoUrl` → `hero--split`, and
`VENUE_PHOTO_URL` → `content.venue.photoUrl` → `venue-block--split`. When either is empty the block
falls back to the single-column centred markup, so **both empty states are supported rendering paths
and must keep working**. Each has a matching client script (`hero-photo.js`, `venue-photo.js`) that
tears the figure back down to that fallback if the external image fails to load.

`content.event.dateISO` drives the client-side countdown (`data-target` attribute →
`public/js/countdown.js`), while `dateHuman` is what guests read; both must be kept in sync manually.

### Storage abstraction

`src/lib/store.js` exports `getStore()` (memoized singleton) and `usingAzure()`. Backend selection is
implicit: Azure if `AZURE_STORAGE_CONNECTION_STRING` or `AZURE_STORAGE_ACCOUNT`+`AZURE_STORAGE_KEY`
is set, otherwise `FileStore`. `AzureStore` and `FileStore` implement the same interface —
`init / listInvites / getInvite / createInvite / updateInvite / deleteInvite / saveRsvp` — and any
change to one must be mirrored in the other, or dev and prod silently diverge.

`normalize()` defines the canonical invite shape used everywhere downstream. It exists because Table
Storage cannot hold `null`: `toEntity()` writes `''` for absent `attending` / `guestCount` /
timestamps, and `normalize()` maps them back to `null` on read. `attending` is deliberately tri-state
(`true` / `false` / `null` = no answer yet) — code that treats it as a boolean will misreport guests
who haven't responded. Prefer `attending === true` over truthiness checks, as the routes do.
`overnight` is a plain string rather than tri-state, where `''` means "no answer" — that also covers
rows written before the field existed, so no migration is needed.

Azure layout: one table (`Invites` by default), fixed `partitionKey = 'invite'`, `rowKey` = the
invite code. The table is created on first run. `getStore()` is awaited in `start()` before
`listen()` so misconfiguration fails fast at boot rather than on first request.

### Routes and auth

Three routers mounted in `src/server.js`: `routes/public.js` (`/`, `/healthz`),
`routes/invite.js` (`/invite/:code`, `POST /invite/:code/rsvp`), `routes/admin.js` (mounted under
`/admin`). New routers must be registered in `server.js` before the 404 handler.

Security model is intentionally light: invite links are unguessable (`nanoid(10)`) and unlisted
rather than authenticated — anyone with the URL can view and re-submit that guest's RSVP, by design,
so guests can change their answer. Admin is a single shared password (`ADMIN_PASSWORD`, plain string
comparison in `middleware/auth.js`) guarding a session flag; `requireAdmin` redirects to
`/admin/login`. All pages are `noindex, nofollow` via `views/partials/head.ejs`.

RSVP input is clamped server-side, not trusted from the form: `guestCount` is bounded by the
invite's `maxGuests`, `dietary`/`message` are length-capped, and declining forces `guestCount = 0`.
Keep that clamping in the route if you touch the form.

### Session cookie gotcha

`SESSION_COOKIE_SECURE` exists because of a real failure: with `NODE_ENV=production` but no TLS in
front, the `Secure` cookie is never set and admin login silently bounces back to the login form with
no error. The env var overrides the `NODE_ENV`-derived default in either direction, and the startup
log prints the resolved value. `app.set('trust proxy', 1)` is required for the reverse-proxy setup.

In `docker-compose.yml`, `env_file: .env` passes the whole file through (so new vars don't need
adding in two places), and the explicit `PORT=3000` under `environment:` must stay *after* it — the
container always listens on 3000 and the host port is mapped via `ports`.

### Frontend

EJS templates in `views/` (`partials/head.ejs` and `footer.ejs` are shared). A page title **must** be
passed as include data — `include('partials/head', { pageTitle: '…' })` — never declared as
`<% var pageTitle = … %>` before the include: the partial compiles to its own function and won't see
that variable, so the title silently falls back to `siteTitle`. That bug shipped once and made every
page render the same title. It hid because `siteTitle` *does* exist in `res.locals`, so the admin
views' `var siteTitle = 'Админка'` appeared to work — it was mutating the shared locals object
through EJS's `with(locals)`. Pages with no title of their own (`home.ejs`) correctly fall back. Static assets are served from `public/` at `/static` with a 7-day
`maxAge`. Because HTML is not cached but assets are, a deploy would otherwise pair new markup with a
week-old stylesheet in returning visitors' browsers — which broke the hero layout once. `server.js`
therefore computes `ASSET_VERSION` at boot from the newest mtime under `public/` and exposes it as
`res.locals.assetVersion`; **every `/static/...` reference in a view must carry `?v=<%= assetVersion %>`**
or it will be served stale for up to 7 days. Docker `COPY` preserves mtimes, so the value is stable
across rebuilds and changes only when an asset actually changes.

`public/js/*.js` are self-contained ES5-style IIFEs with no imports, no bundler, and no framework —
keep new client scripts in that style and add the `<script>` tag to the relevant view. Design tokens
(colors, radius, shadow, `--serif`/`--sans`) live in the `:root` block of `public/css/styles.css`;
the accent green is duplicated in `content.dressCode.palette`, so change both together. Fonts are
loaded from Google Fonts — the site is not fully offline-capable.
