---
spec: 03
title: Authentication, family creation and membership
depends_on: [01, 02]
complexity: medium
---

# 03 — Auth (email/password via Auth.js) and family onboarding

## Goal

Users sign in with an email/password account they create themselves, create or join a **family** (the tenant), and every subsequent request runs in that family's scope. This spec delivers the auth wiring, onboarding flow, and the scoping helpers all later specs use.

## Scope

- Auth.js v5 config: Credentials provider (email/password), custom Drizzle adapter, JWT sessions.
- Sign-in page (email/password form), sign-up page, route protection, session availability in server components/actions.
- Family creation + join-by-invite-code onboarding.
- Optional **allowlist** (`AUTH_ALLOWED_EMAILS`) gating who can *create* a new family — see §5.
- `requireUser()` / `requireFamily()` helpers — **the** canonical scoping utilities.
- Settings page: family info, invite code, members list, sign out.

**Non-scope:** OAuth providers (deliberately dropped — see "Why email/password only"), roles beyond storage (no admin-only features yet), account deletion, multi-family, password reset ("dimenticata password" — post-MVP; document as a known gap).

## Why email/password only

This app is meant to be self-hosted for one family, but Vercel gives every deployment a public URL that's trivially discoverable from the GitHub repo. Two things keep it from becoming an open sign-up page for strangers:

1. **Email/password accounts** — lets you create a single set of credentials and either share them with your partner, or (preferred) have each family member sign up on their own and join your family with the invite code. No OAuth provider is configured for the MVP (no Google Cloud Console setup required to self-host); this can be revisited post-MVP if a specific deployment wants it.
2. **`AUTH_ALLOWED_EMAILS` allowlist** (§5) — an opt-in gate so that on your own deployment, only email addresses you've pre-approved can *start* a new family at all. Anyone who somehow lands on the sign-up page without being on the list is refused, in Italian, before they get anywhere near the app.

## Steps

### 1. Auth.js setup

- Install `next-auth@beta` and `bcryptjs`. Use `bcryptjs` (pure JS) rather than native `bcrypt` — no native bindings to break in Vercel's serverless runtime. `bcryptjs` ships its own TypeScript types, so no `@types/bcryptjs`.
- A hand-rolled Adapter (`src/lib/auth-adapter.ts`) rather than `@auth/drizzle-adapter`: the official adapter forwards Auth.js's own field names (`emailVerified`, `userId`, `providerAccountId`) straight into Drizzle `.values()`/`.set()`, which only works if the schema's JS property names match those exactly — and spec 02 fixed our schema to snake_case (`email_verified`, `user_id`, `provider_account_id`) for consistency with the rest of the app. Implement only what a JWT-strategy, Credentials-only config actually calls: `createUser`, `getUser`, `getUserByEmail`, `getUserByAccount`, `updateUser`, `linkAccount` (the last two exist for when an OAuth provider is added later; the `accounts` table is otherwise unused for now).
- `src/auth.ts`: `NextAuth({ adapter: DrizzleAuthAdapter(), providers: [Credentials({...})], session: { strategy: "jwt" }, pages: { signIn: "/signin" } })`.
  - Credentials provider `authorize({ email, password })`: look up the user by email; if no row, or `password_hash` is `null`, or `bcryptjs.compare(password, user.password_hash)` fails → return `null` (Auth.js surfaces a generic "credenziali non valide", never reveal *which* check failed). Otherwise return the user.
  - In the `jwt` callback, on first sign-in persist `user.id` into the token; in `session` callback expose `session.user.id`. Type-augment `next-auth` module accordingly.
- `src/app/api/auth/[...nextauth]/route.ts` exporting the handlers.
- Env: `AUTH_SECRET` (append to `.env.example` with a comment: generate with `npx auth secret` or `openssl rand -base64 32`); `AUTH_ALLOWED_EMAILS` (§5); validate in `src/lib/env.ts`.

### 2. Route protection

- Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (same shape). Use `src/proxy.ts` — it **must** live under `src/` given this project's layout, not the repo root. Wrap the Auth.js `auth()` helper: everything under `(app)` requires a session; `/signin`, `/signup` and `/api/*` webhook/cron routes are excluded (they have their own auth). Note: classic `middleware.ts` runs on the Edge runtime, which cannot bundle `node:crypto` (pulled in by `src/db/schema.ts` and `bcryptjs`) — `proxy.ts` defaults to the Node.js runtime, which avoids that failure entirely.
- `(auth)/signin/page.tsx`: centered card, app logo/name, tagline in Italian ("L'assistente che porta il carico mentale della tua famiglia"), and an email/password form (server action → `signIn("credentials", { email, password, redirect: false })`, show "Credenziali non valide" on failure). Link at the bottom to `/signup` ("Non hai un account? Registrati").

### 3. Sign-up — `(auth)/signup/page.tsx`

- Form: name, email, password, confirm password. Client + server-side Zod validation (password min 8 chars).
- Server action `registerWithPassword(name, email, password, confirmPassword)`:
  1. Reject if a `users` row with that email already exists → Italian error "Email già registrata. Accedi invece."
  2. Hash the password with `bcryptjs.hash(password, 12)`, insert the `users` row, then `signIn("credentials", { email, password, redirect: false })`, redirect to `/onboarding`.
- `AUTH_ALLOWED_EMAILS` does **not** gate sign-up — only `createFamily` (§5). Gating account creation itself would have no equivalent for a future OAuth provider and isn't what the env var's name/purpose describes.
- Never log the plaintext password; never return `password_hash` from any query used by the UI.

### 4. Scoping helpers — `src/lib/session.ts`

```ts
export async function requireUser(): Promise<{ userId: string }>            // throws redirect("/signin") if no session
export async function requireFamily(): Promise<{ userId: string; familyId: string; role: 'admin'|'member' }>
// redirect("/onboarding") if the user has no family_members row
```
Every server action and page in later specs starts with one of these. Document this rule in the module docstring.

### 5. Onboarding — `(auth)/onboarding/page.tsx`

Two cards:
- **"Crea la tua famiglia"**: input for family name → server action `createFamily(name)`. If `AUTH_ALLOWED_EMAILS` is set and the signed-in user's email isn't in it, refuse before touching the DB and show "Solo alcuni indirizzi email possono creare una nuova famiglia su questa istanza." Otherwise: insert family (generate unique 8-char uppercase `invite_code`), insert `family_members` row with role `admin`, redirect to `/`.
- **"Unisciti con un codice"**: input for invite code → server action `joinFamily(code)`: uppercase/trim, look up family, insert membership with role `member`, redirect to `/`. Errors in Italian ("Codice non valido"). **Never gated by `AUTH_ALLOWED_EMAILS`** — a valid invite code is itself the authorization; this is how you invite your partner or other family members regardless of their email address.
- If the user already has a family, `/onboarding` redirects to `/`.

Document `AUTH_ALLOWED_EMAILS` in `.env.example`: "Leave empty for an open instance (anyone who signs up can start a family). Set to a comma-separated list of emails (e.g. your own + your partner's) to restrict who can create a *new* family on this deployment — invited members always get in via the invite code above, regardless of this list."

### 6. Settings — `(app)/settings/page.tsx`

- Family name, invite code with a copy button and share hint ("Condividi questo codice con i familiari").
- Members list (name, email, role badge).
- "Esci" (sign out) button.
- Top-bar avatar (from spec 01 shell) shows `session.user.image` if ever set (e.g. by a future OAuth provider), otherwise falls back to the user's initial, and links here.

## Acceptance criteria

1. Unauthenticated visit to `/` redirects to `/signin`.
2. Signing up via `/signup` with email/password creates a `users` row with a bcrypt `password_hash`, logs the user in, and lands on `/onboarding`. Signing up twice with the same email shows the Italian "already registered" error. Signing back in later via the email/password form on `/signin` succeeds.
3. Creating a family redirects to `/`; the invite code shows in settings.
4. A second account joining with that code appears in the first account's members list; both accounts see the same `familyId` scope.
5. Joining with a wrong code shows the Italian error without crashing.
6. With `AUTH_ALLOWED_EMAILS` set to some other address, a signed-in user attempting `createFamily` gets the Italian refusal and no family is created; the same user can still `joinFamily` with a valid code. With `AUTH_ALLOWED_EMAILS` unset, `createFamily` is unrestricted.
7. `requireFamily()` used from a test page/action returns the correct ids; a user with no family hitting an `(app)` page is pushed through onboarding.
8. Seed user from spec 02 does not break auth flows (it has no account row and no `password_hash` — that's fine, it's for direct DB testing).

## Implementation prompt

> **Run with:** Sonnet 5 (`claude-sonnet-5`), reasoning effort **medium** — set via `/model` before pasting. (Well-trodden Auth.js patterns.)

```
Read docs/specs/00-overview.md first, then implement docs/specs/03-auth-and-families.md
in this repository, following CLAUDE.md.

Use the users/accounts/families/family_members tables exactly as defined in
spec 02 — do not add or rename columns. Implement the Credentials
(email/password) provider only (no OAuth), the AUTH_ALLOWED_EMAILS gate on
family creation only (never on joining via invite code, never on sign-up),
and the sign-up flow — these are load-bearing requirements, not optional
extras. Follow the "Definition of done" in 00-overview.md §9. Commit in
logical steps.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how —
including which env vars to set (including whether/how to populate
AUTH_ALLOWED_EMAILS for a private instance), and how to verify the
allowlist actually blocks family creation for an email not on the list.
```
