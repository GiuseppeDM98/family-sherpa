---
spec: 03
title: Authentication, family creation and membership
depends_on: [01, 02]
complexity: medium
---

# 03 — Auth (Google + email/password via Auth.js) and family onboarding

## Goal

Users sign in with Google **or** with an email/password account they create themselves, create or join a **family** (the tenant), and every subsequent request runs in that family's scope. This spec delivers the auth wiring, onboarding flow, and the scoping helpers all later specs use.

## Scope

- Auth.js v5 config: Google provider **and** Credentials provider (email/password), Drizzle adapter, JWT sessions.
- Sign-in page (Google button + email/password form), sign-up page, route protection, session availability in server components/actions.
- Family creation + join-by-invite-code onboarding.
- Optional **allowlist** (`AUTH_ALLOWED_EMAILS`) gating who can *create* a new family — see §5.
- `requireUser()` / `requireFamily()` helpers — **the** canonical scoping utilities.
- Settings page: family info, invite code, members list, sign out.

**Non-scope:** roles beyond storage (no admin-only features yet), account deletion, multi-family, password reset ("dimenticata password" — post-MVP; document as a known gap).

## Why both auth methods

This app is meant to be self-hosted for one family, but Vercel gives every deployment a public URL that's trivially discoverable from the GitHub repo. Two things keep it from becoming an open sign-up page for strangers:

1. **Email/password as an alternative to Google** — lets you create a single set of credentials and either share them with your partner, or (preferred) have each family member sign up on their own and join your family with the invite code, without forcing everyone onto a Google account.
2. **`AUTH_ALLOWED_EMAILS` allowlist** (§5) — an opt-in gate so that on your own deployment, only email addresses you've pre-approved can *start* a new family at all. Anyone who somehow lands on the sign-up page without being on the list is refused, in Italian, before they get anywhere near the app.

## Steps

### 1. Auth.js setup

- Install `next-auth@beta`, `@auth/drizzle-adapter`, and `bcryptjs` (+ `@types/bcryptjs` dev). Use `bcryptjs` (pure JS) rather than native `bcrypt` — no native bindings to break in Vercel's serverless/edge runtimes.
- `src/auth.ts`: `NextAuth({ adapter: DrizzleAdapter(db, {...map to users/accounts tables from spec 02}), providers: [Google, Credentials({...})], session: { strategy: "jwt" }, pages: { signIn: "/signin" } })`.
  - Credentials provider `authorize({ email, password })`: look up the user by email; if no row, or `password_hash` is `null` (Google-only account), or `bcryptjs.compare(password, user.password_hash)` fails → return `null` (Auth.js surfaces a generic "credenziali non valide", never reveal *which* check failed). Otherwise return the user.
  - In the `jwt` callback, on first sign-in persist `user.id` into the token; in `session` callback expose `session.user.id`. Type-augment `next-auth` module accordingly.
- `src/app/api/auth/[...nextauth]/route.ts` exporting the handlers.
- Env: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` (append to `.env.example` with a comment pointing to Google Cloud Console → OAuth consent screen + credentials, redirect URI `<NEXT_PUBLIC_APP_URL>/api/auth/callback/google`); `AUTH_ALLOWED_EMAILS` (§5); validate in `src/lib/env.ts`.

### 2. Route protection

- `middleware.ts` (Auth.js `auth` middleware): everything under `(app)` requires a session; `/signin`, `/signup` and `/api/*` webhook/cron routes are excluded (they have their own auth).
- `(auth)/signin/page.tsx`: centered card, app logo/name, tagline in Italian ("L'assistente che porta il carico mentale della tua famiglia"), a "Continua con Google" button (server action → `signIn("google")`), a divider ("oppure"), and an email/password form (server action → `signIn("credentials", { email, password, redirect: false })`, show "Credenziali non valide" on failure). Link at the bottom to `/signup` ("Non hai un account? Registrati").

### 3. Sign-up — `(auth)/signup/page.tsx`

- Form: name, email, password, confirm password. Client + server-side Zod validation (password min 8 chars).
- Server action `registerWithPassword(name, email, password)`:
  1. Reject if a `users` row with that email already exists → Italian error "Email già registrata. Accedi invece."
  2. If `AUTH_ALLOWED_EMAILS` is set and the email isn't in it, reject → "Questa istanza non è aperta a nuove registrazioni. Chiedi un invito a chi la gestisce." (see §5 — this only gates *account creation*, not joining a family with a valid invite code, which by construction requires the code-holder to already be vetted by the family admin).
  3. Hash the password with `bcryptjs.hash(password, 12)`, insert the `users` row, then `signIn("credentials", { email, password, redirect: false })`, redirect to `/onboarding`.
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
- Top-bar avatar (from spec 01 shell) now shows the Google profile image (or a fallback initial for credentials accounts) and links here.

## Acceptance criteria

1. Unauthenticated visit to `/` redirects to `/signin`; Google sign-in completes and lands on `/onboarding` for a fresh user.
2. Signing up via `/signup` with email/password creates a `users` row with a bcrypt `password_hash`, logs the user in, and lands on `/onboarding`. Signing up twice with the same email shows the Italian "already registered" error. Signing back in later via the email/password form on `/signin` succeeds.
3. A user whose only account is Google (no `password_hash`) gets a generic invalid-credentials error if they try the email/password form with that email — never a hint that the account exists but has no password.
4. Creating a family redirects to `/`; the invite code shows in settings.
5. A second account (Google or credentials, doesn't matter which) joining with that code appears in the first account's members list; both accounts see the same `familyId` scope.
6. Joining with a wrong code shows the Italian error without crashing.
7. With `AUTH_ALLOWED_EMAILS` set to some other address, a signed-in user attempting `createFamily` gets the Italian refusal and no family is created; the same user can still `joinFamily` with a valid code. With `AUTH_ALLOWED_EMAILS` unset, `createFamily` is unrestricted.
8. `requireFamily()` used from a test page/action returns the correct ids; a user with no family hitting an `(app)` page is pushed through onboarding.
9. Seed user from spec 02 does not break auth flows (it has no account row and no `password_hash` — that's fine, it's for direct DB testing).

## Implementation prompt

> **Run with:** Sonnet 5 (`claude-sonnet-5`), reasoning effort **medium** — set via `/model` before pasting. (Well-trodden Auth.js patterns.)

```
Read docs/specs/00-overview.md first, then implement docs/specs/03-auth-and-families.md
in this repository, following CLAUDE.md.

Use the users/accounts/families/family_members tables exactly as defined in
spec 02 — do not add or rename columns. Implement both the Google and
Credentials (email/password) providers, the AUTH_ALLOWED_EMAILS gate on
family creation only (never on joining via invite code), and the sign-up
flow — these are load-bearing requirements, not optional extras. Follow the
"Definition of done" in 00-overview.md §9. Commit in logical steps.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how —
including the precise Google Cloud Console steps I must do myself (OAuth
client, redirect URIs for localhost and production), which env vars to set
(including whether/how to populate AUTH_ALLOWED_EMAILS for a private
instance), and how to verify the allowlist actually blocks family creation
for an email not on the list.
```
