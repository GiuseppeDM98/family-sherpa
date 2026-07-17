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
- Windows-specific tooling gotchas (pnpm not preinstalled, Turso CLI has no Windows binary, Next 16 needs `--webpack` for Serwist, shadcn CLI v4 preset system, etc.) are tracked in `AGENTS.md`, not here — check it before re-debugging something already solved.

## Current status

### Latest — spec 01: scaffold (2026-07-17)

Implemented: Next.js 16 (App Router, TS strict + `noUncheckedIndexedAccess`) · Tailwind v4 + shadcn/ui (`base-nova` preset, neutral) · Zod-validated env accessor (`src/lib/env.ts`, server/client split) · Drizzle + `@libsql/client` wired to Turso, no domain tables yet · PWA via Serwist (manifest, icons, service worker) · app shell with bottom nav / side rail (Home, Scadenze, Inbox, Asset, Altro → Meds, Impostazioni placeholders) · GitHub Actions CI (lint/typecheck/test/build) · Vitest smoke test for env parsing.

Also this session (ahead of spec 02/03, doc-only):
- Created a real Turso dev database (`family-sherpa-dev`) and populated `.env` — verified with a live `select 1` roundtrip.
- Updated `docs/specs/00-overview.md`, `02-database-schema.md`, `03-auth-and-families.md`: spec 03 now also specs a **Credentials (email/password)** Auth.js provider alongside Google, plus an optional `AUTH_ALLOWED_EMAILS` allowlist that gates who can *create* a new family (never gates joining via invite code). Rationale: a Vercel deploy has a publicly discoverable URL; this keeps a self-hosted single-family instance from becoming an open sign-up page. `users.password_hash` (nullable) added to the spec 02 schema.

Not yet implemented: everything in specs 02–10 (DB schema/seed, auth, Telegram channel, AI parsing, assets hub, reminders, expense dashboard, medicine cabinet, launch packaging).
