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

## shadcn/ui CLI v4

The CLI moved from `style` + `--base-color` flags to a **preset system** (Nova/Vega/Maia/Lyra/Mira/Luma/Sera/Rhea/Custom). There is no `--base-color` flag anymore. Use `-d` for `--template=next --preset=base-nova` (closest match to the old "default style, neutral base color"), or `--preset <name>` to pick explicitly. Check `pnpm dlx shadcn@latest init --help` before assuming old-CLI flags still exist — this ecosystem changes fast.

## Known non-issues (don't "fix" these)

- Next's metadata API emits `<meta name="mobile-web-app-capable">` rather than the older `apple-mobile-web-app-capable` when `appleWebApp.capable: true` is set. This is intentional (Apple now supports the standard tag) and has the same effect — not a bug.
