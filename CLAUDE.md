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
npm test         # node --test test/ — a handful of test files covering the pure modules, no build step
```

Requires Node >= 20 (Docker image is node:22-alpine). Two setup copies are needed before the app will
run: `.env.example` → `.env` (at minimum `ADMIN_PASSWORD` and `SESSION_SECRET`) and
`src/config/content.example.js` → `src/config/content.local.js`. Without
`AZURE_STORAGE_CONNECTION_STRING` the app falls back to `data/invites.json`, so local dev needs no
Azure account.

Docker: `docker compose up -d --build`, then `docker compose logs -f`. Health endpoint: `GET /healthz`.

**There is a test suite: `npm test` (`node --test test/`), a handful of test files covering the pure
modules, no new dependencies.** It covers pure logic — language resolution, map collapsing,
pluralization, the completeness of `content.js`/`i18n.js`, and `normalize()`'s language fallback in
the storage layer — but not views, routes, or the rest of storage. It cannot catch a broken template
or a wrong route. Verify changes by *also* running `npm run dev` and
exercising the affected page: `/` (home), `/invite/<code>` (invite + RSVP), `/admin` (login,
create/delete invite, `/admin/export.csv`). Do not claim a change works without doing both — there is
nothing else to catch regressions. If you add tooling, wire it into `package.json` scripts and update
this file.

**`npm run seed` targets whatever storage backend the environment resolves to.** Run bare in a shell
that has a real `AZURE_STORAGE_CONNECTION_STRING` exported, it writes sample invites straight into
the couple's live Azure table — this happened during development and needed manual cleanup in
production data. Always run it scoped to a throwaway file store:
`DATA_FILE=/tmp/x.json AZURE_STORAGE_CONNECTION_STRING= npm run seed`.

**A production Docker container may already be running on this host**, with `node src/server.js` as
its main process. Never stop a dev server with a pattern-matching kill (`pkill`, `killall`) — it
reaches inside container PID namespaces and has taken the live site down before. Capture the PID
of the process you started and `kill` that PID specifically, and run dev servers on a port other
than 3000 (that's the production container's port).

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
`public/js/countdown.js`) and is a single value shared by every language; `dateHuman` is what guests
read and is now three strings (`{ ru, uk, en }`), one per language. All four values — the ISO date and
the three human strings — describe the same day and must be kept in agreement by hand; nothing
checks that "15 июня 2030", "15 червня 2030" and "June 15, 2030" still match `dateISO`.

### Localization

The site is trilingual (Russian / Ukrainian / English). Everything below lives in `src/lib/lang.js`,
`src/lib/localize.js`, `src/lib/plural.js`, `src/lib/locals.js`, `src/config/i18n.js`, plus the
locale middleware in `server.js` — read those before touching any of this.

**The language-map convention.** A translatable value is written in place, inline in the content or
UI tree, as `{ ru, uk, en }`. A bare string means "the same in every language" and passes through
untouched — `venue.name`, hex colors, URLs. `localize(tree, lang)` (`src/lib/localize.js`) walks a
tree and collapses every such map to the one string for `lang`, leaving bare strings alone.
`getContent(lang)` (`content.js`) and `getUi(lang)` (`i18n.js`) each memoize one collapsed object per
language, built the first time that language is actually requested and reused for every later
request — not precomputed for all three at startup. In practice `ru` gets forced early as a side
effect of `admin.js`'s top-level `const adminContent = getContent(DEFAULT_LANG)`, which runs at
module load because `server.js` imports the admin router, while `uk` and `en` are only built on the
first guest request in that language — which may be much later, or never. The point is that the
walk is per-language, not per-request.

**`src/config/content.js` has no default export, on purpose.** Before collapsing, every translatable
field is a `{ ru, uk, en }` object, not a string. A bare `import content from './content.js'` would
hand templates that raw, uncollapsed tree, and `content.venue.kicker` would render as
`[object Object]` instead of failing loudly. Only `getContent(lang)` is exported, so every consumer
is forced to name a language — a missing import breaks at the `import` statement, not in front of a
guest.

**The switcher's language names live in `lang.js`, not `i18n.js`.** `i18n.js` holds translatable
*content* — a language map that collapses to one string per request. The switcher instead needs the
three endonyms (Русский / Українська / English) simultaneously, in every render, regardless of which
language is active — that can't live inside the localized tree, so `LANG_NAMES` and `LANG_SHORT` sit
in `lang.js` alongside `SUPPORTED`. Anything that needs all three languages at once, not just the
current one, belongs outside the localized tree the same way.

**Precedence and the two cookies.** `resolveLang()` (`src/lib/lang.js`) picks a language in this
order: explicit guest choice (`av_lang` cookie) > the invite's own language (invite pages only,
passed in as `inviteLang`) > the language of the last invite this guest opened (`av_lang_invite`
cookie) > browser `Accept-Language` > `ru`. The two cookies are kept deliberately separate: `av_lang`
is set only by the switcher and represents a choice the guest made on purpose, while
`av_lang_invite` is set automatically whenever an invite page loads, to carry that invite's language
to the rest of the site (`applyInviteLang()` in `locals.js`). Folding them into one cookie would mean
opening an invite could silently overwrite a language the guest already picked deliberately. Neither
cookie carries `Secure`: unlike the session cookie (see the cookie gotcha below), they hold nothing
sensitive, and *not* setting `Secure` is what keeps the switcher working over plain `http://<ip>:3000`
before TLS is set up — the same trap `SESSION_COOKIE_SECURE` exists to work around, avoided here by
just not opting in.

**`?lang=` is intercepted for GET requests only.** The locale middleware in `server.js` reads
`req.query.lang` and, on a match, sets the `av_lang` cookie and 302-redirects to the same URL with
`lang` stripped (other query params survive). This only happens for `GET` — a non-GET request (the
RSVP form `POST`) that happened to carry `?lang=` would otherwise be redirected and its body dropped.

**`src/config/i18n.js` holds UI chrome strings and is public** — nav labels, button text, error
messages, the countdown units. None of it identifies the couple, so unlike `content.local.js` it is
committed to git. Identifying copy (names, dates, venue, schedule, contacts) still lives only in the
gitignored `content.local.js`.

**New user-facing strings must be added in all three languages.** `test/i18n.test.js` and
`test/content.test.js` each walk their tree with a `findIncomplete()` helper and fail, naming the
exact missing path (e.g. `hero.eyebrow.uk`), if any language map is short a language. Comments,
per the rule at the top of this file, stay Russian regardless. **Known blind spot:** both walkers
identify a language map by "every key is a supported language code," so `rsvp.guests` (in
`i18n.js`'s tree — `content.js`'s own `rsvp` object has no `guests` field) — an object whose
top-level keys already are `ru`/`uk`/`en` — is treated as a terminal map and never recursed
into. Its values are themselves plural-form objects (`{ one, few, many }` for ru/uk, `{ one, other }`
for en), and a dropped form inside one of those (e.g. a missing `few` in `uk`) would pass both test
files silently.

**The admin panel is deliberately untranslated.** `routes/admin.js` pins `getContent(DEFAULT_LANG)`
once at module load and renders Russian throughout; it has no `<%- include('partials/lang-switcher') %>`
anywhere. Its `LANG_NAMES_RU` (`{ ru: 'Русский', uk: 'Украинский', en: 'Английский' }` — Russian
*names of* the three languages, for the admin's own language-badge column and CSV export) is a
distinct table from `lang.js`'s `LANG_NAMES` (the endonyms used by the guest-facing switcher) —
don't conflate them.

**`invite.lang`** joins the invite record next to `names`/`maxGuests`/`note`. It's handled once in
`normalize()` (`src/lib/store.js`) — `lang: SUPPORTED.includes(entity.lang) ? entity.lang :
DEFAULT_LANG` — so both `AzureStore` and `FileStore` inherit the same fallback for free. Records
written before the field existed simply have no `lang` property and normalize to `ru`, the same
pattern `overnight` already used; no migration was needed, and the couple's real, already-created
invites verify this in practice, not just in test.

**EJS escaping.** `<%= %>` HTML-escapes and is correct for ordinary text and for the *value* of an
attribute. It is wrong for emitting a whole attribute, though: `views/partials/lang-switcher.ejs`
needs to conditionally emit `aria-current="true"` on the active language link, and doing that with
`<%=` produced literal `aria-current=&#34;true&#34;` — broken markup, invisible to `assert` calls
because the unit tests never render a template, and only caught by eyeballing rendered HTML. The
fix is `<%-` (unescaped) for that one fragment: `<%- l.active ? ' aria-current="true"' : '' %>`.

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
through EJS's `with(locals)`. Pages with no title of their own (`home.ejs`) correctly fall back.

`<html lang="…">` is dynamic — every guest-facing layout (`home.ejs`, `invite.ejs`, `error.ejs`,
`invite-not-found.ejs`) writes `res.locals.lang`, set once per request by the locale middleware. The
same pages `include('partials/lang-switcher')` to render the three-language nav (see the Localization
section above); the admin views (`admin/login.ejs`, `admin/dashboard.ejs`) hardcode `lang="ru"`
instead and never include the switcher, matching the admin panel being deliberately untranslated.
Static assets are served from `public/` at `/static` with a 7-day
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
