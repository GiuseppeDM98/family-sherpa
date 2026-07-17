---
spec: 07
title: Reminders — web push, Telegram notifications, cron endpoints
depends_on: [04, 06]
complexity: medium-high
---

# 07 — Reminder e notifiche: web push + Telegram + cron

## Goal

The app pays the user back: deadline reminders at 30/7/1/0 days and therapy-intake reminders at dose time, delivered via **web push** (PWA) and **Telegram**, driven by idempotent secret-protected cron endpoints that any external scheduler can hit.

## Scope

- web-push setup (VAPID), subscription flow in the PWA, service-worker push handling.
- Notification fan-out helper (push to all user devices + Telegram when linked).
- `/api/cron/daily` (deadline reminders + intake generation) and `/api/cron/therapy` (dose-time reminders).
- Dedup via `notifications_log.dedupe_key`.
- Settings toggles for notification channels.

**Non-scope:** email, digest summaries (roadmap), snooze.

## 1. Web push

- Deps: `web-push`. Env (append + validate): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (comment: generate with `npx web-push generate-vapid-keys`), `VAPID_SUBJECT` (`mailto:` address), `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same value as public — needed client-side).
- Service worker (`src/app/sw.ts`, extend Serwist setup from spec 01): `push` event → `showNotification(title, { body, icon, data: { url } })`; `notificationclick` → focus/open `data.url`.
- Client: `src/components/push-permission.tsx` — on Settings (and a soft banner on Home): request `Notification` permission, `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, POST subscription to `/api/push/subscribe` (server action or route) storing into `push_subscriptions` (upsert by endpoint). Handle iOS: show hint "Su iPhone: installa prima l'app (Condividi → Aggiungi a Home)" when `Notification` is undefined and platform is iOS.
- Sender: `src/lib/reminders/send.ts`:
  ```ts
  export async function notifyUser(userId, payload: { title: string; body: string; url: string; kind; refId; dedupeKey; familyId }): Promise<void>
  ```
  Writes `notifications_log` first (unique `dedupe_key`; on conflict → skip silently = already sent), then sends: web push to every subscription of the user (on 404/410 responses delete the dead subscription) and Telegram text via spec 04's `sendTelegramText` when a `telegram_links` row exists. One log row per channel actually attempted (`dedupe_key` gets a `:push`/`:tg` suffix).

## 2. Cron endpoints

Both under `src/app/api/cron/`, GET or POST, require header `Authorization: Bearer ${CRON_SECRET}` (else 401). Env: `CRON_SECRET`. Return JSON `{ ok, processed, sent }`. **Idempotent**: re-running within the same window sends nothing new (dedupe keys).

### `/api/cron/daily` — run once a day, suggested 07:00 Europe/Rome
1. **Deadline reminders.** For each pending deadline of every family compute `daysLeft` (due_date − today in Europe/Rome). If `daysLeft ∈ {30, 7, 1, 0}` (and also if overdue exactly −1 → "scaduta ieri" message, once): for each family member → `notifyUser` with `dedupeKey = deadline:<id>:d:<daysLeft>:u:<userId>`. Copy (Italian): title `⏰ Scadenza tra 7 giorni` / `⏰ Scade oggi` / `⚠️ Scadenza superata`, body `<title> — <asset name> — €<amount> — <dd/MM>`, url `/deadlines`.
2. **Intake generation.** For each active therapy (start_date ≤ today ≤ end_date or end_date null): create `therapy_intakes` rows for today's `times` (Europe/Rome → UTC ISO in `scheduled_at`), relying on the unique (`therapy_id`,`scheduled_at`) index to skip existing. Deactivate therapies whose `end_date` has passed (`active=0`).

### `/api/cron/therapy` — run every 15 minutes
- Select pending intakes with `scheduled_at` within `[now − 20min, now + 5min]`. For each: notify all family members, `dedupeKey = intake:<id>:u:<userId>`, title `💊 Ora della medicina`, body `<medication_name> — <person name if any> (<dosage_text>)`, url `/meds`. (Intakes stay `pending` until ticked in the UI — spec 09.)

### Timezone helper — `src/lib/reminders/time.ts`
`todayInRome(): string (YYYY-MM-DD)`, `romeTimeToUtcIso(date: string, hhmm: string): string`, `daysBetween(fromYmd, toYmd): number`. Use `Intl.DateTimeFormat` with `timeZone: 'Europe/Rome'` — no heavy date library. **Unit-test across a DST boundary** (e.g. 2026-03-29 and 2026-10-25).

## 3. Scheduler wiring (document, don't build)

- `vercel.json` with two cron entries (`0 5 * * *` daily, `*/15 * * * *` therapy) **plus** a README-in-code note: Vercel Hobby caps cron granularity — document the free alternative (cron-job.org hitting the endpoints with the Authorization header) in `docs/specs/10-launch.md`'s deploy guide (leave a TODO pointer there if 10 not yet implemented). Vercel Cron sends its own auth — keep the bearer check as the single mechanism (configure the secret as query/header per current Vercel docs).

## 4. Settings additions

- "Notifiche" card: push permission status + subscribe button (per device), list of registered devices (user_agent, delete), toggle info text explaining Telegram reminders arrive automatically when linked (no toggle logic in MVP — presence of link = enabled).

## Acceptance criteria

1. Subscribing on desktop Chrome stores a `push_subscriptions` row; a manual `curl` to `/api/cron/daily` with a seeded deadline due in exactly 7 days delivers a visible push notification and a Telegram message; the log rows exist; re-running the curl sends nothing.
2. Wrong/missing bearer → 401 with no side effects.
3. `/api/cron/daily` creates today's intakes for the seeded therapy exactly once across repeated runs.
4. `/api/cron/therapy` within a dose window notifies once (dedupe verified by double-run).
5. Dead push subscriptions (unsubscribed browser) are cleaned up after a send attempt.
6. DST unit tests pass; a therapy `times` of `["08:00"]` maps to 06:00 UTC in summer and 07:00 UTC in winter.
7. Clicking the push notification opens the app at the target URL.

## Implementation prompt

> **Run with:** Opus 4.8 (`claude-opus-4-8`), reasoning effort **medium** — set via `/model` before pasting. (Timezone/DST and idempotency bugs are sneaky; the spec already pins the tricky parts, so medium effort suffices.)

```
Read docs/specs/00-overview.md first, then implement
docs/specs/07-reminders-notifications.md in this repository, following CLAUDE.md.

Reuse sendTelegramText from spec 04 and the recurrence/time conventions from
spec 06. Notification copy is in Italian exactly as specified. Follow the
"Definition of done" in 00-overview.md §9. Commit in logical steps.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how —
including the curl commands for both cron endpoints (with the bearer header),
how to seed/adjust a deadline to hit the 7-day window, how to test push on
desktop and on iPhone (installed PWA), and what I should see arrive on Telegram.
```
