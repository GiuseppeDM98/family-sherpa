# AGENTS.md — working notes for AI coding sessions

Environment/tooling patterns discovered while working on this repo. Read this *in addition to* `CLAUDE.md` (workflow rules) and `docs/specs/00-overview.md` (architecture). This file is about *how to get things done on this machine/repo*, not what to build.

## Environment

- **OS**: Windows. Shells available: PowerShell (primary) and Git Bash. Use PowerShell for anything that needs a native Windows exe; Git Bash is fine for file/text operations.
- **pnpm is not preinstalled** on this machine. If `pnpm` is missing, install it with `npm install -g pnpm` (corepack's `enable`/`prepare` fails here with an `EPERM` on `C:\Program Files\nodejs\yarnpkg` — don't bother with corepack, go straight to the global npm install).
- **Turso CLI has no native Windows build** (only Linux/macOS binaries on GitHub releases, no winget package). Options: install WSL (requires reboot + admin — ask before doing this), or just use the **web dashboard** at `app.turso.tech` to create databases and generate tokens. The dashboard is faster for a single DB anyway. This only affects the `turso` CLI itself — `@libsql/client` (the driver `drizzle-kit`/the app use) is pure JS/HTTP and works fine on Windows against a cloud DB.
- **Git identity**: the global `~/.gitconfig` already has per-folder `includeIf` rules (`Documents/GitHub/Personale/` → personal email, `Documents/GitHub/Aziendale/` → work email). Don't assume a repo-local identity is needed — verify with `git config --show-origin --get user.email` from inside the repo before concluding anything is misconfigured.

## pnpm build-script approval gate

pnpm 10+ blocks native/postinstall build scripts by default. When `pnpm install`/`pnpm add` reports `[ERR_PNPM_IGNORED_BUILDS]`, it will auto-write a `pnpm-workspace.yaml` with an `allowBuilds` block listing the packages and a placeholder value (`set this to true or false`). Set each one to `true` (only for packages you recognize/trust — here: `sharp`, `unrs-resolver`, `esbuild`, all legitimate transitive deps of Next/ESLint/Vitest/drizzle-kit) and make sure the same names are listed under `onlyBuiltDependencies`, then re-run `pnpm install`. Setting `pnpm.onlyBuiltDependencies` inside `package.json` **does nothing** on this pnpm version — it must be in `pnpm-workspace.yaml`.

## Next.js 16 specifics

- **`next lint` was removed.** Use `eslint .` directly as the `lint` script (`next.config.ts`/`eslint.config.mjs` from `create-next-app` already work with plain `eslint`).
- **Turbopack is the default** for `next dev`/`next build`. `@serwist/next` (the PWA/service-worker plugin) only supports webpack — it injects a webpack config that Turbopack refuses to build with (`ERROR: This build is using Turbopack, with a webpack config and no turbopack config`). Fix: pass `--webpack` explicitly (`"dev": "next dev --webpack"`, `"build": "next build --webpack"`). Don't try to make Serwist coexist with Turbopack — `@serwist/turbopack` exists but is experimental and out of scope here.
- Service worker source files (`src/app/sw.ts`) need `/// <reference lib="webworker" />` at the top or `tsc` fails on `ServiceWorkerGlobalScope` — the app's `tsconfig.json` uses the `dom` lib, not `webworker`.
- `eslint.config.mjs`'s `globalIgnores` must list the Serwist-generated files by hand (`public/sw.js`, `public/sw.js.map`, `public/swe-worker*.js`) — ESLint 9 flat config does **not** read `.gitignore`, so a build artifact left over from a local `next build --webpack` gets linted and fails on generated code. Keep this list in sync with `.gitignore`'s own entries for the same files.

## Running standalone scripts with `tsx`

`tsx` (used for `db:seed` and any future one-off script) does **not** auto-load `.env` the way `next dev`/`next build` do. Pass `--env-file=.env` explicitly (already wired into the `db:seed` npm script) — otherwise `src/lib/env.ts` throws "Invalid or missing environment variables" even though `.env` exists on disk.

## Vitest: any test that touches `env` needs the shared fixture

`src/lib/env.ts` validates the **whole** environment at import time, and vitest
doesn't load `.env`. So a test file that imports anything pulling `env` in
transitively (`crypto.ts`, `stt.ts`, `db/index.ts`, …) fails at import with
"Invalid or missing environment variables" — even when the code under test never
reads an env var. Use `TEST_ENV` from `src/test/env-fixture.ts`, assigning it
*before* the module loads (dynamic `import()` inside `beforeAll`, as
`crypto.test.ts` and `stt.test.ts` do). **Adding a new required env var breaks
unrelated test files** until it's added to that fixture — that's the fixture's
whole reason to exist, so don't re-inline the variable list per test file.

## shadcn/ui CLI v4

The CLI moved from `style` + `--base-color` flags to a **preset system** (Nova/Vega/Maia/Lyra/Mira/Luma/Sera/Rhea/Custom). There is no `--base-color` flag anymore. Use `-d` for `--template=next --preset=base-nova` (closest match to the old "default style, neutral base color"), or `--preset <name>` to pick explicitly. Check `pnpm dlx shadcn@latest init --help` before assuming old-CLI flags still exist — this ecosystem changes fast.

## Route protection: `src/proxy.ts`, not `middleware.ts`

Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` (same shape, function
renamed `middleware` → `proxy`). Two things bit us discovering this:

- With this project's `src/` layout, the file **must** live at `src/proxy.ts` (or
  `src/middleware.ts`), not at the repo root — a root-level file is silently ignored (every
  route returns 200, no redirect, no error, no log).
- Classic `middleware.ts` runs on the **Edge runtime** by default, which cannot bundle
  `node:crypto` — and our `src/db/schema.ts` (invite code generation) and `src/auth.ts`
  (via `bcryptjs`) both pull it in transitively, causing a webpack
  `UnhandledSchemeError: node:crypto` build failure the moment `auth()` is used from
  middleware. `proxy.ts` defaults to the **Node.js runtime**, which has no such
  restriction — this is the actual reason to migrate, not just following the deprecation
  warning.

## Auth.js: write your own adapter if the schema uses snake_case

`@auth/drizzle-adapter` forwards Auth.js's own field names (`emailVerified`, `userId`,
`providerAccountId`) straight into Drizzle `.values()`/`.set()` calls — it only works if
your Drizzle schema's *JS property names* match those exactly (camelCase). This repo's
schema uses snake_case property names (`email_verified`, `user_id`,
`provider_account_id`) to keep DB columns and row-object keys consistent everywhere else
in the app, so the official adapter silently drops those fields instead of erroring.
Fix: write a small hand-rolled `Adapter` (see `src/lib/auth-adapter.ts`) that maps
between the two conventions, implementing only the methods your session strategy/
providers actually call (check `next-auth/adapters` — every method is optional; with JWT
sessions and no Email provider, `sessions`/`verificationToken` tables and their adapter
methods aren't needed at all).

## Server Actions can't be driven with `curl`

The action reference Next.js posts to (`Next-Action` header + body encoding) is a hash
baked into the built RSC payload — there's no stable URL/form-encoding to reconstruct by
hand. For manual/scripted verification of a feature built on Server Actions:
- Auth.js's own routes (`/api/auth/callback/credentials`, `/api/auth/session`,
  `/api/auth/providers`, …) are plain REST endpoints and *can* be curled — use them to
  verify sign-in/session end-to-end.
- For everything else (e.g. `createFamily`, `joinFamily`), either drive it through a real
  browser, or replicate the same Drizzle queries in a throwaway script to verify the
  underlying logic/DB state — that's not the same as testing the wiring, say so in the
  session summary.

## Running one-off scripts against the DB

A `tsx` script must live *inside* the project directory (e.g. a gitignored scratch
folder), not under the OS temp dir — Node's module resolution walks up from the script's
own path looking for `node_modules`, so a script outside the repo can't find any
dependency (`Cannot find module 'bcryptjs'` etc.) even with `--env-file`.

## Telegram bot: local webhook tunneling

- **Use cloudflared, not ngrok.** `ngrok` via `winget` installs an outdated build (3.3.1) that fails on some networks with a minimum-version/CRL-parsing error. Fix would be `ngrok update`, but `cloudflared` avoids the issue entirely — no account required, and it's more robust behind antivirus/VPN setups that do TLS inspection.
- **Quick tunnels get a new public URL on every restart** (both ngrok and cloudflared without an account). Each time the tunnel restarts, update `NEXT_PUBLIC_APP_URL` in `.env` and re-run `pnpm telegram:setup`.
- **A Telegram bot has only one active webhook at a time.** Reusing the same bot across dev and prod means re-running `pnpm telegram:setup` every time you switch environments — create separate dev/prod bots to avoid the friction.
- **Telegram links are per-user, not per-family.** `telegram_links` keys on `user_id`, so every family member links their own Telegram account independently (via their own code from their own Settings page), even though they'll all be talking to the same bot.

## Don't import `src/db/schema.ts` from a client component

`schema.ts` imports `node:crypto` (invite-code generation), so a `"use client"`
file that imports *anything* from it — even a plain `as const` enum array — drags
`node:crypto` into the browser bundle and fails `next build --webpack` with
`UnhandledSchemeError: Reading from "node:crypto" is not handled by plugins`.
Typecheck and lint both pass; only the build catches it. The domain enums
therefore live in **`src/db/enums.ts`** (no imports at all) and are re-exported by
`schema.ts` — import them from `@/db/enums` in client components, from
`@/db/schema` everywhere else.

## LLM prompts: keep example ids un-copyable

Few-shot examples that contain asset ids will occasionally have those ids copied
verbatim into a real extraction instead of the model matching against the real
asset list. Observed with uuid-shaped example ids: a "bolletta luce" came back
linked to a *person* whose real id happened to match the example's home id.
Placeholder ids in `src/lib/ai/prompts.ts` are deliberately **not** uuid-shaped
(`esempio-asset-casa`) so that a copied id can never collide with a real
`crypto.randomUUID()` and always gets nulled by `dropUnknownAssetIds`. Never
"tidy" them into uuids.

## Whisper (Groq/OpenAI) rejects Telegram's `.oga` extension

Telegram serves voice notes as `.oga` (mime `audio/ogg`) — that's why
`media.ts` maps `oga → audio/ogg`. But the Whisper endpoints validate the
**uploaded file's name**, and their accepted list is
`[flac mp3 mp4 mpeg mpga m4a ogg opus wav webm]` — no `oga`. Naming the upload
after Telegram's own extension gets a `400 invalid_request_error` on every
single voice note, even though the bytes are ordinary Ogg/Opus and the part's
content-type is right. `sttFileName()` in `src/lib/ai/stt.ts` derives the name
from the mime type instead, and a unit test pins that it can only ever emit an
extension from that list. Don't "simplify" it to reuse Telegram's filename.

## Verifying the AI pipeline without touching the real DB

`.env`'s `TURSO_DATABASE_URL` points at the cloud DB. To exercise
materialization against a throwaway SQLite file instead, override the env vars
*before* `--env-file` (Node does not overwrite variables already in the
environment):

```powershell
$env:TURSO_DATABASE_URL="file:verify.db"; $env:TURSO_AUTH_TOKEN="dummy"
pnpm drizzle-kit migrate
pnpm tsx --env-file=.env your-scratch-script.ts
```

`drizzle-kit` with `dialect: "turso"` rejects an **empty** auth token even for a
`file:` URL — any non-empty dummy string works. As always, the script must live
inside the repo (see "Running one-off scripts against the DB").

## Known non-issues (don't "fix" these)

- Next's metadata API emits `<meta name="mobile-web-app-capable">` rather than the older `apple-mobile-web-app-capable` when `appleWebApp.capable: true` is set. This is intentional (Apple now supports the standard tag) and has the same effect — not a bug.
