# AGENTS.md — working notes for AI coding sessions

Environment/tooling patterns discovered while working on this repo. Read this *in addition to* `CLAUDE.md` (workflow rules and architecture). This file is about *how to get things done on this machine/repo*, not what to build.

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

## Server Actions can't be driven with `curl` — but pages can, once you're signed in

The action reference Next.js posts to (`Next-Action` header + body encoding) is a hash
baked into the built RSC payload — there's no stable URL/form-encoding to reconstruct by
hand. For manual/scripted verification of a feature built on Server Actions:
- Auth.js's own routes (`/api/auth/callback/credentials`, `/api/auth/session`,
  `/api/auth/providers`, …) are plain REST endpoints and *can* be curled — use them to
  get an authenticated session cookie, then `curl -b` any server-rendered page (not a
  Server Action) to check it renders real DB data without a 500, without ever opening a
  browser:
  ```bash
  jar=/tmp/cookies.txt
  csrf=$(curl -s -c "$jar" -b "$jar" http://localhost:3000/api/auth/csrf \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).csrfToken))")
  curl -s -c "$jar" -b "$jar" -X POST http://localhost:3000/api/auth/callback/credentials \
    --data-urlencode "email=you@example.com" --data-urlencode "password=..." \
    --data-urlencode "csrfToken=$csrf" --data-urlencode "json=true"
  curl -s -b "$jar" http://localhost:3000/assets   # now an authenticated GET
  ```
  The seed user (`demo@familysherpa.dev`) has no `password_hash` by design —
  to sign in as it this way, set one temporarily with a scratch script, then run
  `pnpm db:seed` again afterward, which wipes and recreates the demo family (and its
  user) from scratch, clearing the password back to `null`.
- For everything else (e.g. `createFamily`, `joinFamily`), either drive it through a real
  browser, or replicate the same Drizzle queries in a throwaway script to verify the
  underlying logic/DB state — that's not the same as testing the wiring, say so in the
  session summary.

**The dev `.env` may point at a real database with real personal data**, not just the
seed family — `TURSO_DATABASE_URL` isn't necessarily a throwaway. An unscoped query
(`select().from(assets)` with no `where`) can return rows from the owner's actual family
alongside the demo one. Always filter scratch verification queries by the family/user you
just created or seeded, never assume the DB only has demo data in it.

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

## Don't import `src/db/schema.ts` from a client component (watch the *transitive* case too)

`schema.ts` imports `node:crypto` (invite-code generation), so a `"use client"`
file that imports *anything* from it — even a plain `as const` enum array — drags
`node:crypto` into the browser bundle and fails `next build --webpack` with
`UnhandledSchemeError: Reading from "node:crypto" is not handled by plugins`.
Typecheck and lint both pass; only the build catches it. The domain enums
therefore live in **`src/db/enums.ts`** (no imports at all) and are re-exported by
`schema.ts` — import them from `@/db/enums` in client components, from
`@/db/schema` everywhere else.

This bites one hop further away than it looks: a module with no direct
`schema.ts` import can still be unsafe for a client component if *it* imports
something that imports `src/db` (e.g. `src/lib/reminders/recurrence.ts`, which
pulls in `db` for its DB-touching functions). A pure helper living in that file
(`addMonthsToYmd`) had to move to `src/lib/date.ts` before a client form could
use it. Rule of thumb: before calling a change to a `"use client"` file done,
run `pnpm build` (not just `lint`/`typecheck`) at least once — it's the only
thing that walks the real bundle graph.

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

## Recharts v3 Tooltip typing

The `content` render-prop on `<Tooltip>` wants the function itself
(`content={ChartTooltip}`), not a JSX element (`content={<ChartTooltip />}`) —
the element form fails to typecheck because `<Tooltip>`'s generic parameters
can't be inferred through a JSX child. And the render function's props type is
**`TooltipContentProps`**, not `TooltipProps` (that one is for the `<Tooltip>`
element itself and is missing `active`/`payload` — they're
`PropertiesReadFromContext` on that type). Leave `TooltipContentProps`
un-pinned (no `<number, string>`) — pinning the generic on the content
function's parameter type makes it structurally incompatible with the
generic `ContentType<ValueType, NameType>` the `<Tooltip>` prop actually
expects, and the resulting error chain is long and unhelpful.

## Chart color tokens are placeholders, not a real palette

The shadcn-generated `--chart-1..5` tokens in `src/app/globals.css` ship as
plain grayscale (`oklch(0.87 0 0)` etc.) — they're meant to be replaced, not
reused as-is. When a spec needs charts, run the `dataviz` skill's
`scripts/validate_palette.js` to get a CVD-safe categorical order, then fill
those tokens (extend to `--chart-6..8` if more than 5 series/categories are
possible) for both `:root` and `.dark`. Reference categories by a **fixed**
name→slot map (e.g. `CATEGORY_CHART_COLORS` in `src/lib/deadline-labels.ts`)
so the same category always gets the same color — never assign by array
index/rank, which repaints colors when a filtered set changes.

## Verifying a dashboard/RSC page without a browser

Beyond the curl-a-signed-in-page trick in "Server Actions can't be driven
with curl" above: a Server Component's props to a Client Component are
serialized into the RSC flight payload (the `self.__next_f.push([...])`
blocks in the HTML) even when nothing renders yet — so `curl`-ing a page and
grepping that payload for prop names (e.g. `grep -o 'forecast\\":\[.\{0,2000\}'`)
lets you check computed numbers (peak month, totals, category breakdowns)
against a manual calculation without opening a browser. One gotcha: a
**base-ui `Tabs` panel that isn't the active tab is not in the rendered
DOM** (its content still shows up in the flight payload as serialized props,
but the actual HTML text — e.g. a button label inside it — won't grep-match)
even though the *trigger* label always renders. Pass the tab's query param
(`?tab=costi`) to actually render that panel's content server-side.

## Testing web push locally

- **The service worker is disabled in `next dev`** (`next.config.ts` sets
  `disable: process.env.NODE_ENV === "development"` on `withSerwistInit`). Push
  cannot be tested with `pnpm dev` at all — `pushManager.subscribe()` has no SW to
  attach to. Use a production build: `pnpm build && pnpm start`, then subscribe
  from Settings → Notifiche. `localhost` counts as a secure context, so push works
  over plain HTTP there (no HTTPS/tunnel needed for the desktop test).
- **`pnpm start` (local prod) trips Auth.js `UntrustedHost`.** In a production
  build Auth.js v5 refuses to trust the `Host` header unless told to. On Vercel
  it's auto-detected; locally set `AUTH_TRUST_HOST=true` in `.env`. It's an
  auth/deploy concern — keep it in `.env` only, not in `src/auth.ts`.
- **`web-push` exports `generateVAPIDKeys`** (VAPID uppercase), not
  `generateVapidKeys`. The CLI form is `npx web-push generate-vapid-keys`.
- **Don't call `webpush.setVapidDetails()` at module top level.** It validates
  the key format synchronously, and `next build`'s "Collecting page data" phase
  imports the cron route modules (→ `src/lib/reminders/send.ts`) — so a module-top
  call fails the build under CI's dummy VAPID keys, even though no push is sent
  there. `send.ts` configures VAPID lazily on the first real send
  (`ensureVapidConfigured()`); keep it that way. General rule: route modules must
  be import-safe under the CI dummy env (`.github/workflows/ci.yml`) — no
  import-time work that needs a *valid* secret, only a *present* one.
- To exercise the cron endpoints without a browser, seed a throwaway `file:` DB
  (see "Verifying the AI pipeline…" above) and import the route's `GET`/`POST`
  directly in a scratch script, calling it with a `Request` carrying the
  `Authorization: Bearer $CRON_SECRET` header — the handlers are plain functions.

## Known non-issues (don't "fix" these)

- Next's metadata API emits `<meta name="mobile-web-app-capable">` rather than the older `apple-mobile-web-app-capable` when `appleWebApp.capable: true` is set. This is intentional (Apple now supports the standard tag) and has the same effect — not a bug.
