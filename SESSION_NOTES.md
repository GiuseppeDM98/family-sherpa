# Session notes — spec 07 (Reminders: web push + Telegram + cron)

Working notes for the implementation session. Deleted/folded into the permanent
docs at the end of the session.

## Goal

Deadline reminders (30/7/1/0 days + "scaduta ieri") and therapy-intake reminders
delivered via **web push** and **Telegram**, driven by idempotent
bearer-protected cron endpoints.

## Plan / checklist

- [x] Deps: `web-push` (+ `@types/web-push`)
- [x] Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `CRON_SECRET` → `.env.example`, `env.ts`,
      `env-fixture.ts`
- [x] `src/lib/reminders/time.ts`: `todayInRome` (re-export), `romeTimeToUtcIso`,
      `daysBetween` + DST unit tests
- [x] `src/lib/reminders/messages.ts`: pure notification copy (Italian) + tests
- [x] `src/lib/reminders/send.ts`: `notifyUser` fan-out (push + Telegram, per-channel dedupe)
- [x] `src/lib/reminders/cron-auth.ts`: shared bearer check
- [x] `src/app/api/cron/daily/route.ts`: deadline reminders + intake generation
- [x] `src/app/api/cron/therapy/route.ts`: dose-time reminders
- [x] `src/app/sw.ts`: `push` + `notificationclick` handlers
- [x] `src/app/api/push/subscribe/route.ts`: upsert subscription
- [x] Push subscription delete (settings action)
- [x] `src/components/push-permission.tsx`: permission + subscribe (iOS hint)
- [x] Settings "Notifiche" card + device list
- [x] Home soft banner
- [x] `vercel.json` with two cron entries + deploy note (`docs/CRON_SETUP.md`)
- [x] lint / typecheck / test / build all green

## Offline verification (throwaway file DB, not the real Turso)

Exercised both route handlers against `file:verify.db` with a seeded family,
a deadline due in 7 days, a bogus push subscription and an active 08:00 therapy:

- 401 on missing/wrong bearer, 0 log rows written → no side effects.
- daily run1 → `{processed:1, sent:1, intakesCreated:1}`; one `:push` log row
  with key `deadline:<id>:d:7:u:<uid>:push`; intake at `2026-07-20T06:00:00Z`
  (08:00 Rome in CEST — DST correct).
- daily run2 → `{sent:0, intakesCreated:0}`, still one log row / one intake
  (idempotent).
- therapy run1 → `sent:2`; run2 → `sent:0` (idempotent). One `intake:<id>:…:push`
  log row.
- Dead-subscription cleanup (404/410 → delete) verified by inspection only — the
  bogus key raised a non-404 error, correctly leaving the row in place.

## Decisions / notes

- `todayInRome` already lives in `src/lib/date.ts`; `time.ts` re-exports it so the
  spec's three-function surface is honored without duplicating the Rome-date math.
- Per-channel dedupe: `notifications_log.dedupe_key` gets a `:push` / `:tg` suffix,
  one log row per channel actually attempted (spec §1).
- Cron routes query across *all* families on purpose (system job, bearer-gated) —
  the usual `requireFamily` scoping rule is for user-facing actions.

## Deviations from spec

- **`todayInRome` is re-exported from `src/lib/date.ts`, not re-implemented** in
  `time.ts`. The spec lists all three functions as living in `time.ts`; the
  Rome-date math already existed in date.ts (client-safe, no DST), so
  duplicating it would have been worse. `time.ts` re-exports it, keeping the
  spec's three-function surface.
- **`notifyUser` returns `number`** (channels dispatched) instead of `void`. The
  spec's signature is `Promise<void>`; returning the count lets the cron
  response's `sent` field truthfully read 0 on an idempotent re-run (acceptance
  criterion 1: "re-running sends nothing"). Behaviour is otherwise identical.
- **`vercel.json` carries no inline note** (JSON has no comments); the required
  scheduling note — Hobby's sub-daily cron limit + the cron-job.org alternative —
  lives in `docs/CRON_SETUP.md`, with a `TODO(spec-10)` pointer to fold it into
  the SELF_HOSTING deploy guide when spec 10 ships (spec 10 §2.8 already expects
  this).
- **Daily cron title for the 1-day case is `⏰ Scadenza domani`** and the 30-day
  case `⏰ Scadenza tra 30 giorni`. The spec only spelled out three example
  titles (`tra 7 giorni` / `Scade oggi` / `Scadenza superata`); the other two
  follow the same pattern.
