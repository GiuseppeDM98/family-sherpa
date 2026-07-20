# FamilySherpa — instructions for AI coding sessions

This project is built spec-by-spec. Each implementation session executes exactly one spec from `docs/specs/`.

## Rules

1. **Before writing any code, read `docs/specs/00-overview.md`** (architecture, conventions, glossary) **and the spec you were asked to implement.** The specs are the source of truth; if code and spec disagree, the spec wins unless the user says otherwise.
2. Stay inside the scope of the assigned spec. If you notice something missing that belongs to another spec, note it at the end of the session — do not implement it.
3. If a spec is ambiguous or turns out to be technically wrong (e.g. an API changed), stop and tell the user before improvising. Propose the fix, and update the spec file itself once agreed.
4. Follow the acceptance criteria of the spec literally: they are the definition of done.
5. **At the end of every session**, tell the user (a) what was implemented, (b) exactly what to test manually and how, step by step (commands, URLs, example messages to send), and (c) which env vars/external setup they must configure themselves.

## Project conventions (summary — full version in 00-overview.md)

- Package manager: **pnpm**. TypeScript strict. Path alias `@/*` → `src/*`.
- UI copy and LLM prompts in **Italian**; code, comments, commit messages in **English**.
- Money is always integer cents (`amount_cents`). Dates: `YYYY-MM-DD` strings for due dates, ISO 8601 UTC for timestamps. User timezone is `Europe/Rome`.
- DB access only through Drizzle (`src/db/`). Sensitive fields are encrypted via `src/lib/crypto.ts` and end with `_enc`.
- Never commit secrets. Every new env var must be added to `.env.example` with a comment.
- Every server action/page under `(app)` must start with `requireUser()`/`requireFamily()` from `src/lib/session.ts`. A missing family scope is a security bug.
- Windows-specific tooling gotchas (pnpm not preinstalled, Turso CLI has no Windows binary, Next 16 needs `--webpack` for Serwist, shadcn CLI v4 preset system, etc.) are tracked in `AGENTS.md`, not here — check it before re-debugging something already solved.

## What exists today (specs 01–08)

The durable map of the codebase. Per-session detail lives in `git log`; this section is what is *true now*.

- **App shell** — Next.js 16 App Router, PWA via Serwist, Tailwind v4 + shadcn/ui (`@base-ui` based). Route groups: `(app)` authenticated shell, `(auth)` sign-in/onboarding. Route protection is `src/proxy.ts` (**not** `middleware.ts` — see `AGENTS.md`).
- **DB** — Turso/libSQL + Drizzle. All tables in `src/db/schema.ts`; the enum value arrays live in `src/db/enums.ts` (importable from client components) and are re-exported by `schema.ts`. Field encryption in `src/lib/crypto.ts` (`_enc` columns). Dev seed: `pnpm db:seed`.
- **Auth** — Auth.js v5, Credentials provider, JWT sessions, hand-rolled Drizzle adapter (`src/lib/auth-adapter.ts` — the official one drops snake_case fields). Scoping helpers `requireUser()`/`requireFamily()` in `src/lib/session.ts`.
- **Telegram channel** — grammY in webhook mode (`src/lib/telegram/bot.ts`, route `api/telegram/webhook`, `maxDuration = 60`, secret header via `timingSafeEqual`, always 200 on unhandled errors). Commands `/start`, `/collega <codice>`, `/aiuto`. Account linking via a 6-digit, 10-minute code (`link-code.ts`) generated from Settings. `classify.ts` (pure) maps voice/audio → voice, photo → photo, PDF → document, image → photo, text → text, rejecting unsupported types and >10 MB. `media.ts` downloads, `outbound.ts` sends/edits. `pnpm telegram:setup` registers webhook + commands.
- **AI pipeline** — `src/lib/ai/` (STT, Claude client, prompt, parse schema) + `src/lib/inbound/` (channel types, ingest, materialize, reply, therapy times, upload classifier).
- **Inbox** — `(app)/inbox`: list, detail with per-item edit form, in-app upload/record.
- **Channel abstraction** — `src/lib/inbound/types.ts` (`InboundMessage`, `OutboundChannel`). Telegram is the only implementation; WhatsApp must fit this seam without touching the pipeline.
- **Assets & deadlines** — `(app)/assets` (+ `[id]` detail) and `(app)/deadlines`: CRUD for all four asset types, deadline timelines, mark-as-paid/done with recurrence roll-over. Recurrence math in `src/lib/reminders/recurrence.ts` (`nextDueDate`/`completeDeadline`), codice fiscale decode/validate in `src/lib/cf.ts`.
- **Reminders & cron** — `src/lib/reminders/`: `time.ts` (DST-aware `romeTimeToUtcIso`/`daysBetween`; `todayInRome` re-exported from `src/lib/date.ts`), `messages.ts` (pure Italian copy), `send.ts` (`notifyUser` fan-out: web push to all devices + Telegram, per-channel dedupe on `notifications_log`, dead-subscription cleanup on 404/410), `cron-auth.ts` (bearer check). Two idempotent, bearer-gated endpoints under `api/cron/`: `daily` (deadline reminders at 30/7/1/0 days + "scaduta ieri"; generates today's therapy intakes) and `therapy` (dose-time reminders in a −20/+5 min window). They sweep **every** family — the sanctioned exception to `requireFamily`, being system jobs. web-push subscription flow: SW `push`/`notificationclick` in `src/app/sw.ts`, upsert route `api/push/subscribe`, `PushPermission` component (Settings card + self-hiding Home banner, iOS install hint). Scheduling is external (cron-job.org, or a `vercel.json` on Vercel Pro) — no `vercel.json` in the repo; `SETUP.md` §9 covers it.
- **Expense dashboard** — `src/lib/analytics.ts` (`getCashFlowForecast`, `getAssetTco`, `getFamilySpendSummary`, plus the pure/unit-tested `projectRecurrences`/`groupByMonth`). Home (`/`) is now the dashboard: greeting, "Prossime scadenze" (reuses spec 06's `DeadlineRow`), a today's-meds strip, a 12-month Recharts cash-flow bar chart (peak month highlighted, tap-to-expand month detail, Italian peak callout), and a per-asset spend list. `(app)/assets/[id]` gained a "Costi" tab (`?tab=costi` deep-linkable): period selector, by-category bar chart, transaction list, manual "Aggiungi spesa" (`createTransaction` action). Fresh/empty families see an onboarding card instead of empty charts. Chart colors: a CVD-validated categorical palette (dataviz skill) fills `--chart-1..8` in `src/app/globals.css` (was grayscale shadcn placeholders); fixed category→color map in `src/lib/deadline-labels.ts`.

Placeholder screens (spec-only so far): Medicine cabinet. Not implemented: medicine-box enrichment (09), conversational editing and WhatsApp (post-MVP).

## Current status

### Latest — spec 08: Expense dashboard (predictive cash flow + asset TCO) (2026-07-20)

Turns the deadlines/transactions already collected by specs 06–07 into foresight: the Home screen shows upcoming money pressure and each asset's real yearly cost.

- **`projectRecurrences`/`groupByMonth`** (pure, unit-tested): expand pending deadlines into every real + rolled-forward occurrence inside a date window, skip deadlines with no amount, then sum by month. `getCashFlowForecast` zero-fills every month in the window so the chart X axis is always contiguous.
- **Deviation**: the "Costi" asset tab is available for every asset type, not just vehicle/home as literally scoped by the acceptance criteria — no reason to restrict it, any asset can have transactions.
- Verified end-to-end (throwaway SQLite DB + `pnpm build && pnpm start` + curl-authenticated fetch of the RSC payload, see `AGENTS.md`): peak month and callout amount, bimonthly/annual/biennial recurrence projection, and both TCO periods all matched manual computation against the seed data; empty-family onboarding card renders with no chart errors.
- No new env vars.

### Known limits carried forward

- A message can still get stuck at `status='received'` if the function dies mid-run (e.g. the 60 s Vercel limit): the Inbox card stays on "In elaborazione…" forever. Recovering orphans needs a dedicated recovery cron (not built).
- Manually untested: **PDF and photo** ingestion (text and voice are verified end-to-end).
- Web push is testable only in a production build (`pnpm build && pnpm start`) — the SW is disabled in `next dev`. `pnpm start` locally also needs `AUTH_TRUST_HOST=true` (see `AGENTS.md`).
