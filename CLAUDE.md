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

### Latest — spec 03: auth and family onboarding (2026-07-17)

Implemented: Auth.js v5 (`next-auth@beta`) in `src/auth.ts` with a Credentials (email/password, bcryptjs) provider — no OAuth, see deviations — JWT sessions, a hand-rolled Drizzle adapter (`src/lib/auth-adapter.ts` — see deviations); `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`, must live under `src/`) protecting all `(app)` routes; `src/lib/session.ts` (`requireUser`/`requireFamily`); sign-in (`(auth)/signin`), sign-up (`(auth)/signup`), onboarding — create/join family (`(auth)/onboarding`); settings page with family name, invite code (copy button), members list, sign-out; top-bar avatar shows the session image if ever set, else a fallback initial. New env vars `AUTH_SECRET`, `AUTH_ALLOWED_EMAILS` in `.env.example` and `src/lib/env.ts`. `src/lib/auth-allowlist.ts` (`isEmailAllowlisted`, unit-tested).

Deviations from spec worth knowing: no Google/OAuth provider — Credentials only (the user explicitly dropped Google mid-session; spec 03 and the other docs that mentioned it — 00-overview.md, 02-database-schema.md, 10-launch.md, README.md — were rewritten to match, `accounts` table kept unused for a possible future OAuth provider); custom Auth.js adapter instead of `@auth/drizzle-adapter` (the official one expects JS property names like `emailVerified`/`userId` that don't match our spec-02 snake_case schema); `AUTH_ALLOWED_EMAILS` gates **both** sign-up (`registerWithPassword`) and `createFamily` — not just family creation as the spec originally described — because the user wants a fully closed instance where the public can see a future landing page but can't register at all (`joinFamily` is still never gated directly, but since joining needs an account first, every invitee's email must also be on the allowlist); route-protection file is `src/proxy.ts`, not `middleware.ts` (Next 16 rename, discovered by actually running the dev server — see AGENTS.md for the node:crypto/Edge-runtime angle).

Not yet implemented: everything in specs 04–10. `(app)` pages beyond `/settings` don't call `requireFamily()` yet (still spec 01 placeholders).

### Previous — spec 02: database schema, encryption, migrations, seed (2026-07-17)

Implemented: complete Drizzle schema in `src/db/schema.ts` (15 tables: Auth.js `users`/`accounts` + 13 domain tables — families, family_members, assets, deadlines, transactions, inbox_messages, medications, therapies, therapy_intakes, telegram_links, telegram_link_codes, push_subscriptions, notifications_log), all enums/indexes/inferred types per spec · `src/lib/crypto.ts` AES-256-GCM field encryption (`encryptField`/`decryptField`/`isEncrypted`) with `ENCRYPTION_KEY` env var · `src/lib/asset-metadata.ts` Zod schemas for the vehicle/person/home/other metadata JSON shapes · migration generated and applied to the dev Turso DB (`family-sherpa-dev`) · `src/db/seed.ts` (`pnpm db:seed`), idempotent "Famiglia Demo" dataset (1 user, 1 family, 3 assets, 8 deadlines, 10 transactions, 2 medications, 1 therapy + 6 intakes). Drive-by fix: `eslint.config.mjs` now ignores the generated Serwist service-worker files (see AGENTS.md).

Deviations from spec worth knowing: `src/lib/asset-metadata.ts` was added even though not in spec 02's top-level Scope bullets (it's named directly in §2, needed to validate the `metadata` JSON column); table `const` names are camelCase (`familyMembers`, `inboxMessages`) while all SQL table/column names and row-object keys stay snake_case exactly as spec'd; `accounts.type` has no enum yet (left for spec 03 to decide).

Not yet implemented: Auth.js runtime wiring and `requireUser`/`requireFamily` (spec 03), everything in specs 03–10.
