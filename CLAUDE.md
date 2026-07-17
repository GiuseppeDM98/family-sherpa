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

Not yet implemented: LLM/STT parsing (spec 05 — the bot only acknowledges with a canned reply today), confirmation buttons, WhatsApp.

### Previous — spec 03: auth and family onboarding (2026-07-17)

Implemented: Auth.js v5 (`next-auth@beta`) in `src/auth.ts` with a Credentials-only (email/password, bcryptjs) provider — no OAuth — JWT sessions, and a hand-rolled Drizzle adapter (`src/lib/auth-adapter.ts`, needed because `@auth/drizzle-adapter` expects camelCase JS property names that don't match this repo's snake_case schema). `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`, lives under `src/`) protects all `(app)` routes. `src/lib/session.ts` exports `requireUser`/`requireFamily`. Pages: sign-in (`(auth)/signin`), sign-up (`(auth)/signup`), onboarding — create/join family (`(auth)/onboarding`), settings (`(app)/settings` — family name, invite code with copy button, members list, sign-out). Top-bar avatar shows the session image if ever set, else a fallback initial.

`AUTH_ALLOWED_EMAILS` (optional, comma-separated) gates **both** sign-up (`registerWithPassword`) and family creation (`createFamily`) — a fully closed instance where the public can see a landing page but can't register at all. `joinFamily` is never gated directly, but joining needs an account first, so every invitee's email must also be on the allowlist before they can sign up and use their invite code. Pure predicate: `src/lib/auth-allowlist.ts` (`isEmailAllowlisted`, unit-tested). New env vars `AUTH_SECRET` (required), `AUTH_ALLOWED_EMAILS` (optional) in `.env.example` and `src/lib/env.ts`.

Specs 01, 02 and 03 are now marked `status: implemented` in their frontmatter.

Not yet implemented: everything in specs 04–10. `(app)` pages beyond `/settings` don't call `requireFamily()` yet (still spec 01 placeholders). No OAuth provider, no password reset, no account deletion, no multi-family support (all explicitly non-scope for spec 03).
