# Session notes — spec 03: auth and families

## Scope

Implemented `docs/specs/03-auth-and-families.md`: Auth.js v5, Credentials (email/password)
provider only — no OAuth, see deviation below — sign-in/sign-up, family creation/join
onboarding, `requireUser`/`requireFamily` scoping helpers, and the settings page (family
info, invite code, members, sign out).

## Key implementation decisions

- **No Google OAuth provider.** The spec originally called for Google + Credentials.
  Partway through this session the user explicitly decided against Google entirely, so it
  was removed from `src/auth.ts`, the sign-in page, `.env.example`/`src/lib/env.ts`
  (`AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` dropped), and `docs/specs/03-auth-and-families.md`
  itself was rewritten to describe Credentials-only auth (plus the stack table/env
  registry in `00-overview.md`, the `users`/`accounts` note in `02-database-schema.md`,
  the launch checklist in `10-launch.md`, and `README.md`'s stack line). The `accounts`
  table (spec 02) and the adapter's `getUserByAccount`/`linkAccount` methods are kept
  as-is, unused for now, in case an OAuth provider is added post-MVP.
- **Custom Auth.js adapter** (`src/lib/auth-adapter.ts`) instead of `@auth/drizzle-adapter`.
  The official adapter forwards Auth.js's own field names (`emailVerified`, `userId`,
  `providerAccountId`) straight into Drizzle `.values()`/`.set()`, which only works if the
  schema's JS property names match those exactly. Spec 02 fixed our schema to snake_case
  (`email_verified`, `user_id`, `provider_account_id`) for consistency with the rest of the
  app, so a thin hand-rolled adapter maps between the two conventions. We also have no
  `sessions`/`verificationToken` tables (JWT strategy, no Email provider), so only the
  methods Auth.js actually calls under this configuration are implemented (createUser,
  getUser, getUserByEmail, getUserByAccount, updateUser, linkAccount).
- **`middleware.ts` → `src/proxy.ts`.** Two problems, discovered by actually running
  `pnpm dev` and hitting the app:
  1. This project uses a `src/` layout, so the route-protection file must live at
     `src/proxy.ts` (or `src/middleware.ts`), not the repo root — Next.js silently ignored
     a root-level file and every route returned 200 with no redirect.
  2. Next.js 16 deprecated the `middleware` convention in favor of `proxy` (same shape,
     renamed export). More importantly, **classic middleware runs on the Edge runtime**,
     which cannot bundle `node:crypto` (pulled in transitively by `src/db/schema.ts` and by
     `bcryptjs` via `src/auth.ts`) — this crashed with `UnhandledSchemeError: node:crypto`.
     `proxy.ts` defaults to the **Node.js runtime**, which resolves both issues at once.
- **`AUTH_ALLOWED_EMAILS` gates `createFamily` only**, not `registerWithPassword`/sign-up.
  Spec step 3.2 reads as if the allowlist should also block account creation, but the
  spec's own acceptance criterion and the env var's definition in `00-overview.md` §7
  ("restricts who may create a new family") both describe it as a family-creation gate;
  the user's task prompt for this session confirmed the same reading explicitly. Documented
  as the intended behavior, not a bug (and now the spec text itself agrees, see above).
- `isEmailAllowedToCreateFamily` (`src/lib/auth-allowlist.ts`) takes the allowlist string
  as an explicit parameter instead of reading `env` itself, so it stays unit-testable
  without loading `src/lib/env.ts` (which throws if required vars are missing).

## Manual end-to-end verification performed this session

Ran `pnpm dev` and drove the real app with `curl` (cookies jar) rather than just
typecheck/lint/unit tests, before the Google provider was removed but exercising the same
Credentials/session/family-scoping machinery that's still in place:

- Unauthenticated `GET /` → `302` to `/signin` (proxy-based route protection works).
- `GET /signin`, `/signup` render the credentials form + Italian copy.
- `GET /api/auth/providers` lists the `credentials` provider.
- Created a test user directly in the dev DB with a bcrypt hash, signed in through the
  real `/api/auth/callback/credentials` endpoint (same code path `signIn()` uses
  internally) → session cookie set, `/api/auth/session` returns the correct user.
- Authenticated user with no family hitting `/settings` (which calls `requireFamily()`) →
  `307` to `/onboarding` (acceptance criterion 7).
- Created a family for that user directly via the same Drizzle queries `createFamily`
  uses → `/settings` now renders the family name, invite code, and the member (role
  "Admin"); `/onboarding` now redirects to `/` (already has a family).
- Cleaned up all test users/families created for this verification from the dev DB
  afterward; no test data was left behind.

Not exercised end-to-end (requires an actual browser, since Next.js Server Actions can't
be invoked directly with curl — the action reference is a hash baked into the built RSC
payload): clicking through the credentials/sign-up/onboarding forms in a real browser, and
the `AUTH_ALLOWED_EMAILS` rejection path end-to-end. See the manual test steps in the
final chat summary.

## Deviations from the spec (see also above)

1. No OAuth/Google provider — Credentials only (user's explicit decision mid-session;
   spec 03 and related docs updated to match).
2. Custom adapter instead of `@auth/drizzle-adapter` (technical necessity, see above).
3. `AUTH_ALLOWED_EMAILS` gates `createFamily` only, not sign-up (see above).
4. Route protection file is `src/proxy.ts`, not `middleware.ts` at the repo root (Next.js
   16 convention rename + `src/` layout requirement).

## Known gaps (out of scope for this spec, tracked for later)

- No password reset flow (explicitly non-scope per spec 03).
- No account deletion, no multi-family support (explicitly non-scope).
- The home page (`(app)/page.tsx`) and other `(app)` pages beyond `/settings` don't call
  `requireFamily()` yet — they're still spec 01 placeholders; each later spec wires its
  own pages to the scoping helpers as it implements real content.
