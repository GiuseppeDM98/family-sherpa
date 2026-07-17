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

## Current status

### Latest — spec 04: Telegram channel (2026-07-17)

Implemented: grammY bot in webhook mode (`src/lib/telegram/bot.ts`, route at `src/app/api/telegram/webhook/route.ts`, `maxDuration = 60`, secret header checked with `crypto.timingSafeEqual`, always returns 200 on unhandled errors so Telegram doesn't retry-flood the function). Commands `/start`, `/collega <codice>`, `/aiuto`. Account linking: settings page gained a "Collega Telegram" card (`createTelegramLinkCode`/`unlinkTelegram` actions, `telegram-link-card.tsx`) generating a 6-digit code (`src/lib/telegram/link-code.ts`, 10-minute expiry) the user sends to the bot. Message classification (`src/lib/telegram/classify.ts`, pure/unit-tested) maps voice/audio → voice, photo → photo, PDF document → document, image document → photo, plain text → text, rejecting unsupported types and anything over 10 MB. Media download (`src/lib/telegram/media.ts`) and outbound send (`src/lib/telegram/outbound.ts`, HTML-escaped) wrap the raw Bot API. The channel abstraction (`src/lib/inbound/types.ts`: `InboundMessage`, `OutboundChannel`) and `ingestInboundMessage()` (`src/lib/inbound/ingest.ts`) insert the `inbox_messages` row and return a stub Italian reply — spec 05 replaces the body, keeping the signature. `scripts/telegram-setup.ts` (`pnpm telegram:setup`) registers the webhook + commands and prints `getWebhookInfo`.

New env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (server), `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (client — not in 00-overview's original registry, added because the settings UI needs the bot's `@handle` to tell the user who to message; the token alone doesn't reveal it).

Verified end-to-end manually with a real bot (`@familySherpa_bot`) and a `cloudflared` tunnel: webhook registration, `/collega` account linking, and a text message landing in `inbox_messages`. `SETUP.md` was added as the single consolidated setup guide (env vars, Turso, Telegram bot + tunnel, Windows gotchas); `README.md` now points there instead of duplicating the steps.

Not yet implemented: LLM/STT parsing (spec 05 — the bot only acknowledges with a canned reply today), confirmation buttons, WhatsApp.
