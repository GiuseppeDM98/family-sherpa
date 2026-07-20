# Session notes — spec 07 (Reminders: web push + Telegram + cron)

Working notes for the implementation session. Deleted/folded into the permanent
docs at the end of the session.

## Goal

Deadline reminders (30/7/1/0 days + "scaduta ieri") and therapy-intake reminders
delivered via **web push** and **Telegram**, driven by idempotent
bearer-protected cron endpoints.

## Plan / checklist

- [ ] Deps: `web-push` (+ `@types/web-push`)
- [ ] Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `CRON_SECRET` → `.env.example`, `env.ts`,
      `env-fixture.ts`
- [ ] `src/lib/reminders/time.ts`: `todayInRome` (re-export), `romeTimeToUtcIso`,
      `daysBetween` + DST unit tests
- [ ] `src/lib/reminders/messages.ts`: pure notification copy (Italian) + tests
- [ ] `src/lib/reminders/send.ts`: `notifyUser` fan-out (push + Telegram, per-channel dedupe)
- [ ] `src/lib/reminders/cron-auth.ts`: shared bearer check
- [ ] `src/app/api/cron/daily/route.ts`: deadline reminders + intake generation
- [ ] `src/app/api/cron/therapy/route.ts`: dose-time reminders
- [ ] `src/app/sw.ts`: `push` + `notificationclick` handlers
- [ ] `src/app/api/push/subscribe/route.ts`: upsert subscription
- [ ] Push subscription delete (settings action)
- [ ] `src/components/push-permission.tsx`: permission + subscribe (iOS hint)
- [ ] Settings "Notifiche" card + device list
- [ ] Home soft banner
- [ ] `vercel.json` with two cron entries + deploy note
- [ ] lint / typecheck / test / build all green

## Decisions / notes

- `todayInRome` already lives in `src/lib/date.ts`; `time.ts` re-exports it so the
  spec's three-function surface is honored without duplicating the Rome-date math.
- Per-channel dedupe: `notifications_log.dedupe_key` gets a `:push` / `:tg` suffix,
  one log row per channel actually attempted (spec §1).
- Cron routes query across *all* families on purpose (system job, bearer-gated) —
  the usual `requireFamily` scoping rule is for user-facing actions.

## Deviations from spec

(to be filled in at the end)
