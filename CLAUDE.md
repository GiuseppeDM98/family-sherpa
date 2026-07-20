# FamilySherpa — instructions for AI coding sessions

This file is the source of truth for working in this repo: architecture, conventions, and what exists today. Read it — and `AGENTS.md` for environment/tooling gotchas — before making changes.

## Design Context

Product/design strategy lives in `PRODUCT.md` (root): register (**product**), platform (**web** PWA), the two-partner shared-household audience, positioning ("carries your family's mental load" — capture-and-forget, not track-and-manage), and the design principles that guide UI work — *offload never add*, *warm without childish*, *capture then disappear*, *foresight over history*, *reassure don't alarm*. Anti-references: cold gov/bank portals, childish clip-art family apps, loud SaaS dashboards, cluttered do-everything apps. Read `PRODUCT.md` before design decisions; the visual system (tokens, type, components) is captured in `DESIGN.md`.

## Rules

1. **Before writing any code, read this file and the surrounding code you're about to touch.** Existing code, its comments, and its tests are the source of truth for how things actually work — prefer them over assumptions.
2. Stay inside the scope of what was asked. If you notice something missing or broken elsewhere, note it at the end of the session — do not implement it unprompted.
3. If a requirement is ambiguous, or something you're asked to build turns out to be technically wrong (e.g. an API changed), stop and tell the user before improvising.
4. Follow the user's explicit requirements literally — they are the definition of done.
5. **At the end of every session**, tell the user (a) what was implemented, (b) exactly what to test manually and how, step by step (commands, URLs, example messages to send), and (c) which env vars/external setup they must configure themselves.

## Project conventions

- Package manager: **pnpm**. TypeScript strict. Path alias `@/*` → `src/*`.
- UI copy and LLM prompts in **Italian**; code, comments, commit messages in **English**.
- Money is always integer cents (`amount_cents`). Dates: `YYYY-MM-DD` strings for due dates, ISO 8601 UTC for timestamps. User timezone is `Europe/Rome`.
- DB access only through Drizzle (`src/db/`). Sensitive fields are encrypted via `src/lib/crypto.ts` and end with `_enc`.
- Never commit secrets. Every new env var must be added to `.env.example` with a comment.
- Every server action/page under `(app)` must start with `requireUser()`/`requireFamily()` from `src/lib/session.ts`. A missing family scope is a security bug.
- Windows-specific tooling gotchas (pnpm not preinstalled, Turso CLI has no Windows binary, Next 16 needs `--webpack` for Serwist, shadcn CLI v4 preset system, etc.) are tracked in `AGENTS.md`, not here — check it before re-debugging something already solved.

## What exists today

The durable map of the codebase. Per-session detail lives in `git log`; this section is what is *true now*.

- **App shell** — Next.js 16 App Router, PWA via Serwist, Tailwind v4 + shadcn/ui (`@base-ui` based). Route groups: `(app)` authenticated shell, `(auth)` sign-in/onboarding. Route protection is `src/proxy.ts` (**not** `middleware.ts` — see `AGENTS.md`).
- **DB** — Turso/libSQL + Drizzle. All tables in `src/db/schema.ts`; the enum value arrays live in `src/db/enums.ts` (importable from client components) and are re-exported by `schema.ts`. Field encryption in `src/lib/crypto.ts` (`_enc` columns). Dev seed: `pnpm db:seed`.
- **Auth** — Auth.js v5, Credentials provider, JWT sessions, hand-rolled Drizzle adapter (`src/lib/auth-adapter.ts` — the official one drops snake_case fields). Scoping helpers `requireUser()`/`requireFamily()` in `src/lib/session.ts`.
- **Telegram channel** — grammY in webhook mode (`src/lib/telegram/bot.ts`, route `api/telegram/webhook`, `maxDuration = 60`, secret header via `timingSafeEqual`, always 200 on unhandled errors). Commands `/start`, `/collega <codice>`, `/aiuto`. Account linking via a 6-digit, 10-minute code (`link-code.ts`) generated from Settings. `classify.ts` (pure) maps voice/audio → voice, photo → photo, PDF → document, image → photo, text → text, rejecting unsupported types and >10 MB. `media.ts` downloads, `outbound.ts` sends/edits. `pnpm telegram:setup` registers webhook + commands.
- **AI pipeline** — `src/lib/ai/` (STT, Claude client, prompt, parse schema) + `src/lib/inbound/` (channel types, ingest, materialize, reply, therapy times, upload classifier).
- **Inbox** — `(app)/inbox`: list, detail with per-item edit form, in-app upload/record.
- **Channel abstraction** — `src/lib/inbound/types.ts` (`InboundMessage`, `OutboundChannel`). Telegram is the only implementation; WhatsApp must fit this seam without touching the pipeline.
- **Assets & deadlines** — `(app)/assets` (+ `[id]` detail) and `(app)/deadlines`: CRUD for all four asset types, deadline timelines, mark-as-paid/done with recurrence roll-over. Recurrence math in `src/lib/reminders/recurrence.ts` (`nextDueDate`/`completeDeadline`), codice fiscale decode/validate in `src/lib/cf.ts`.
- **Reminders & cron** — `src/lib/reminders/`: `time.ts` (DST-aware `romeTimeToUtcIso`/`daysBetween`; `todayInRome` re-exported from `src/lib/date.ts`), `messages.ts` (pure Italian copy), `send.ts` (`notifyUser` fan-out: web push to all devices + Telegram, per-channel dedupe on `notifications_log`, dead-subscription cleanup on 404/410), `cron-auth.ts` (bearer check), `intakes.ts` (`generateIntakesForDate`/`intakeTimesForDate`, shared by the daily cron and manual/AI-parsed therapy creation). Two idempotent, bearer-gated endpoints under `api/cron/`: `daily` (deadline reminders at 30/7/1/0 days + "scaduta ieri"; generates today's therapy intakes) and `therapy` (dose-time reminders in a −20/+5 min window). They sweep **every** family — the sanctioned exception to `requireFamily`, being system jobs. web-push subscription flow: SW `push`/`notificationclick` in `src/app/sw.ts`, upsert route `api/push/subscribe`, `PushPermission` component (Settings card + self-hiding Home banner, iOS install hint). Scheduling is external (cron-job.org, or a `vercel.json` on Vercel Pro) — no `vercel.json` in the repo; `SETUP.md` §9 covers it.
- **Expense dashboard** — `src/lib/analytics.ts` (`getCashFlowForecast`, `getAssetTco`, `getFamilySpendSummary`, plus the pure/unit-tested `projectRecurrences`/`groupByMonth`). Home (`/`) is now the dashboard: greeting, "Prossime scadenze" (reuses `DeadlineRow`), a today's-meds strip, a 12-month Recharts cash-flow bar chart (peak month highlighted, tap-to-expand month detail, Italian peak callout), and a per-asset spend list. `(app)/assets/[id]` gained a "Costi" tab (`?tab=costi` deep-linkable): period selector, by-category bar chart, transaction list, manual "Aggiungi spesa" (`createTransaction` action). Fresh/empty families see an onboarding card instead of empty charts. Chart colors: a CVD-validated categorical palette fills `--chart-1..8` in `src/app/globals.css` (was grayscale shadcn placeholders); fixed category→color map in `src/lib/deadline-labels.ts`.
- **Medicine cabinet** — `(app)/meds`: Armadietto (medication list, expiring-first, search-as-you-filter, expiry badges) and Terapie (today's intake checklist with taken/skipped, active therapy cards with a 7-day adherence strip, manual therapy creation) tabs. "Fotografa la scatola" reuses the in-app upload pipeline as-is (`InboxUpload`'s photo path), redirecting to the Inbox confirm screen. `src/lib/meds.ts` (`syncMedicationExpiryDeadline`, server-only) keeps a medication's expiry in sync with a linked `farmaco` deadline — insert/update/delete depending on what already exists — called from the manual cabinet form and from box-photo confirmations alike. `src/lib/meds-labels.ts` holds the client-safe expiry badge tier (`medicationExpiryStatus`) separately, since it must be importable from client components without pulling `src/db`'s `node:crypto` dependency into the browser bundle. Creating a therapy that starts today (manually, or via the AI parser) generates its intakes immediately through the shared `generateIntakesForDate` helper instead of waiting for the next cron run.

Not implemented: conversational editing, WhatsApp channel, AIC barcode/AIFA lookup (post-MVP roadmap).

## Current status

### Latest — Medicine cabinet, end-of-implementation cleanup, and app branding (2026-07-20)

Closes out the MVP feature set with the medicine cabinet UI, then does the
end-of-implementation housekeeping: removes the spec-driven scaffolding now
that specs 01–09 are all implemented, and refreshes the app's public face.

- **Medicine cabinet** (`/meds`) — see "What exists today" above for the full
  feature description.
- **Deviation**: the medication expiry → deadline sync runs on box-photo
  confirmations too (not just the manual cabinet form), and AI-parsed
  therapies created via Telegram/text now get today's intakes generated
  immediately after the confirming transaction commits, same as the manual
  "crea terapia" action — otherwise those paths silently lagged a cron cycle
  behind the manual ones.
- **Deviation**: no "resume" action for a paused therapy — only "pause" was
  requested; resuming would just be flipping `active` back to `true`.
- Verified: throwaway-DB scripts for the expiry bridge (create/update-in-place/
  delete-on-clear) and `generateIntakesForDate`'s idempotency; the `/meds` UI
  and the box-photo → confirm → cabinet flow verified live via the Telegram
  dev bot with the user. `pnpm lint/typecheck/test/build` all pass.
- **Repo housekeeping**: `docs/specs/*.md` deleted; every spec citation in
  source comments, this file, `AGENTS.md`, `README.md`, and `SETUP.md`
  rewritten to keep the WHY reasoning without the dangling pointer — the
  project no longer works spec-by-spec (see the Rules above).
- **Branding**: app icon/favicon redesigned (two peaks + a rising sun, using
  the app's existing navy/orange colors, not new ones); demo screenshots
  added to `docs/assets/` and the README, captured from a throwaway seeded
  DB — never real family data.
- No new env vars.

### Known limits carried forward

- A message can still get stuck at `status='received'` if the function dies mid-run (e.g. the 60 s Vercel limit): the Inbox card stays on "In elaborazione…" forever. Recovering orphans needs a dedicated recovery cron (not built).
- Manually untested: **PDF** ingestion (text, voice, and photo are verified end-to-end).
- Web push is testable only in a production build (`pnpm build && pnpm start`) — the SW is disabled in `next dev`. `pnpm start` locally also needs `AUTH_TRUST_HOST=true` (see `AGENTS.md`).
- Packaging/launch polish (CONTRIBUTING.md, SECURITY.md, issue/PR templates, a dedicated self-hosting rewrite, the LinkedIn launch post) is intentionally not done — the user chose to keep `SETUP.md` as the self-hosting guide and skip the other community files; the launch post is deferred to a later session.
