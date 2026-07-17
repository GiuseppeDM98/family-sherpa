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

## What exists today (specs 01–06)

The durable map of the codebase. Per-session detail lives in `git log`; this section is what is *true now*.

- **App shell** — Next.js 16 App Router, PWA via Serwist, Tailwind v4 + shadcn/ui (`@base-ui` based). Route groups: `(app)` authenticated shell, `(auth)` sign-in/onboarding. Route protection is `src/proxy.ts` (**not** `middleware.ts` — see `AGENTS.md`).
- **DB** — Turso/libSQL + Drizzle. All tables in `src/db/schema.ts`; the enum value arrays live in `src/db/enums.ts` (importable from client components) and are re-exported by `schema.ts`. Field encryption in `src/lib/crypto.ts` (`_enc` columns). Dev seed: `pnpm db:seed`.
- **Auth** — Auth.js v5, Credentials provider, JWT sessions, hand-rolled Drizzle adapter (`src/lib/auth-adapter.ts` — the official one drops snake_case fields). Scoping helpers `requireUser()`/`requireFamily()` in `src/lib/session.ts`.
- **Telegram channel** — grammY in webhook mode (`src/lib/telegram/bot.ts`, route `api/telegram/webhook`, `maxDuration = 60`, secret header via `timingSafeEqual`, always 200 on unhandled errors). Commands `/start`, `/collega <codice>`, `/aiuto`. Account linking via a 6-digit, 10-minute code (`link-code.ts`) generated from Settings. `classify.ts` (pure) maps voice/audio → voice, photo → photo, PDF → document, image → photo, text → text, rejecting unsupported types and >10 MB. `media.ts` downloads, `outbound.ts` sends/edits. `pnpm telegram:setup` registers webhook + commands.
- **AI pipeline** — `src/lib/ai/` (STT, Claude client, prompt, parse schema) + `src/lib/inbound/` (channel types, ingest, materialize, reply, therapy times, upload classifier).
- **Inbox** — `(app)/inbox`: list, detail with per-item edit form, in-app upload/record.
- **Channel abstraction** — `src/lib/inbound/types.ts` (`InboundMessage`, `OutboundChannel`). Telegram is the only implementation; WhatsApp must fit this seam without touching the pipeline.
- **Assets & deadlines** — `(app)/assets` (+ `[id]` detail) and `(app)/deadlines`: CRUD for all four asset types, deadline timelines, mark-as-paid/done with recurrence roll-over. Recurrence math in `src/lib/reminders/recurrence.ts` (`nextDueDate`/`completeDeadline`, the signatures spec 07 depends on), codice fiscale decode/validate in `src/lib/cf.ts`. See the status entry below.

Placeholder screens (spec-only so far): Home, Medicine cabinet. Not implemented: reminders/cron (07), dashboard (08), medicine-box enrichment (09), conversational editing and WhatsApp (post-MVP).

## Current status

### Latest — spec 06: Assets hub and deadlines UI (2026-07-17)

The manual counterpart to spec 05's bot pipeline: browse and manage assets and deadlines by hand instead of only through Telegram.

- **Codice fiscale** (`src/lib/cf.ts`): `decodeCodiceFiscale()` returns birth date + sex from the standard 16-char format (no document-expiry data — the CF doesn't carry that); `isValidCodiceFiscale()` implements the official odd/even check-character table. Omocodia (letter-for-digit substitution) isn't decoded — such a CF is treated as unparseable rather than guessed at.
- **Recurrence** (`src/lib/reminders/recurrence.ts`): `nextDueDate()` does end-of-month-clamped month math (31 gen + 1 mese → 28/29 feb, never 3 mar) via `addMonthsToYmd()` — which actually lives in `src/lib/date.ts` so client components can use the same math without pulling in `db` (see `AGENTS.md`). `completeDeadline()` is one transaction: flips status to paid/done, inserts a `transactions` row when money changed hands, and inserts the next pending deadline when the recurrence isn't `none`.
- **`/assets`** (replaces placeholder): sections by type (🚗 Veicoli/👤 Persone/🏠 Casa/📦 Altro), a pending-deadline count badge (red if any overdue). "Aggiungi asset" is a type picker → the matching create form. `/assets/[id]`: edit/archive, masked codice fiscale with a reveal toggle (decrypted server-side, never sent to the client otherwise), the deadline timeline (pending + collapsed "Completate"), a rolling 12-month TCO teaser (vehicle + home), and Italian smart defaults on "Aggiungi scadenza" for vehicles (bollo/rca → annual, revisione → biennial + matriculation date + 4 years on a fresh vehicle, tagliando → none) — always a suggestion, never enforced.
- **`/deadlines`** (replaces placeholder): all pending deadlines grouped by month, filter chips (Tutte/Veicoli/Casa/Persone/Altro). "Segna pagata/fatta" opens a dialog (importo effettivo, data) and reports the next occurrence's due date in a toast when the recurrence rolls over.
- Shared components (`src/components/deadlines/`, `src/components/form-fields.tsx`, `src/components/confirm-dialog.tsx`) are reused by both `/deadlines` and the asset detail timeline, per the spec's requirement that the two share their server actions.

No new env vars.

Verified: `pnpm test`/`typecheck`/`lint`/`build` (webpack) all pass. Signed in as the seeded demo user via Auth.js's REST endpoints (see `AGENTS.md`) and fetched `/assets`, `/assets/[id]` (vehicle and person), `/deadlines` — all render real seed data correctly (category chips, overdue/due-soon highlighting, masked CF) with no server errors. Not click-tested through the dialogs/forms in an actual browser (no browser automation available in this environment) — flagged explicitly rather than claimed as done.

### Known limits carried forward

- A message can still get stuck at `status='received'` if the function dies mid-run (e.g. the 60 s Vercel limit): the Inbox card stays on "In elaborazione…" forever. Recovering orphans needs a cron → spec 07.
- Manually untested: **PDF and photo** ingestion (text and voice are verified end-to-end).
- No proactive reminders yet: a deadline just sits in the app until spec 07 (cron + push/Telegram notifications) ships.
