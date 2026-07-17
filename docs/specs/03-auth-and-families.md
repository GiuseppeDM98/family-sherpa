---
spec: 03
title: Authentication, family creation and membership
depends_on: [01, 02]
complexity: medium
---

# 03 — Auth (Google via Auth.js) and family onboarding

## Goal

Users sign in with Google, create or join a **family** (the tenant), and every subsequent request runs in that family's scope. This spec delivers the auth wiring, onboarding flow, and the scoping helpers all later specs use.

## Scope

- Auth.js v5 config with Google provider, Drizzle adapter, JWT sessions.
- Sign-in page, route protection, session availability in server components/actions.
- Family creation + join-by-invite-code onboarding.
- `requireUser()` / `requireFamily()` helpers — **the** canonical scoping utilities.
- Settings page: family info, invite code, members list, sign out.

**Non-scope:** roles beyond storage (no admin-only features yet), account deletion, multi-family.

## Steps

### 1. Auth.js setup

- Install `next-auth@beta` and `@auth/drizzle-adapter`.
- `src/auth.ts`: `NextAuth({ adapter: DrizzleAdapter(db, {...map to users/accounts tables from spec 02}), providers: [Google], session: { strategy: "jwt" }, pages: { signIn: "/signin" } })`.
  - In the `jwt` callback, on first sign-in persist `user.id` into the token; in `session` callback expose `session.user.id`. Type-augment `next-auth` module accordingly.
- `src/app/api/auth/[...nextauth]/route.ts` exporting the handlers.
- Env: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (append to `.env.example` with a comment pointing to Google Cloud Console → OAuth consent screen + credentials, redirect URI `<NEXT_PUBLIC_APP_URL>/api/auth/callback/google`); validate in `src/lib/env.ts`.

### 2. Route protection

- `middleware.ts` (Auth.js `auth` middleware): everything under `(app)` requires a session; `/signin` and `/api/*` webhook/cron routes are excluded (they have their own auth).
- `(auth)/signin/page.tsx`: centered card, app logo/name, tagline in Italian ("L'assistente che porta il carico mentale della tua famiglia"), a single "Continua con Google" button (server action → `signIn("google")`).

### 3. Scoping helpers — `src/lib/session.ts`

```ts
export async function requireUser(): Promise<{ userId: string }>            // throws redirect("/signin") if no session
export async function requireFamily(): Promise<{ userId: string; familyId: string; role: 'admin'|'member' }>
// redirect("/onboarding") if the user has no family_members row
```
Every server action and page in later specs starts with one of these. Document this rule in the module docstring.

### 4. Onboarding — `(auth)/onboarding/page.tsx`

Two cards:
- **"Crea la tua famiglia"**: input for family name → server action `createFamily(name)`: insert family (generate unique 8-char uppercase `invite_code`), insert `family_members` row with role `admin`, redirect to `/`.
- **"Unisciti con un codice"**: input for invite code → server action `joinFamily(code)`: uppercase/trim, look up family, insert membership with role `member`, redirect to `/`. Errors in Italian ("Codice non valido").
- If the user already has a family, `/onboarding` redirects to `/`.

### 5. Settings — `(app)/settings/page.tsx`

- Family name, invite code with a copy button and share hint ("Condividi questo codice con i familiari").
- Members list (name, email, role badge).
- "Esci" (sign out) button.
- Top-bar avatar (from spec 01 shell) now shows the Google profile image and links here.

## Acceptance criteria

1. Unauthenticated visit to `/` redirects to `/signin`; Google sign-in completes and lands on `/onboarding` for a fresh user.
2. Creating a family redirects to `/`; the invite code shows in settings.
3. A second Google account joining with that code appears in the first account's members list; both accounts see the same `familyId` scope.
4. Joining with a wrong code shows the Italian error without crashing.
5. `requireFamily()` used from a test page/action returns the correct ids; a user with no family hitting an `(app)` page is pushed through onboarding.
6. Seed user from spec 02 does not break auth flows (it has no account row — that's fine, it's for direct DB testing).

## Implementation prompt

```
Read docs/specs/00-overview.md first, then implement docs/specs/03-auth-and-families.md
in this repository, following CLAUDE.md.

Use the users/accounts/families/family_members tables exactly as defined in
spec 02 — do not add or rename columns. Follow the "Definition of done" in
00-overview.md §9. Commit in logical steps.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how —
including the precise Google Cloud Console steps I must do myself (OAuth
client, redirect URIs for localhost and production) and which env vars to set.
```
