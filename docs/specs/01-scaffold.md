---
spec: 01
title: Project scaffold, tooling, PWA shell, CI
depends_on: [00]
complexity: medium
---

# 01 — Scaffold: Next.js app, tooling, PWA shell, CI

## Goal

A running Next.js 15 app with the full toolchain configured (TypeScript strict, Tailwind v4, shadcn/ui, Drizzle+Turso wiring, Serwist PWA, Vitest, ESLint, GitHub Actions CI) and an empty-but-navigable app shell. After this spec, `pnpm dev` shows a branded shell and `pnpm build` succeeds.

## Scope

- Project initialization and all dev tooling.
- `src/lib/env.ts` validated env accessor.
- Drizzle client setup (no domain tables yet — schema comes in spec 02).
- PWA: manifest, icons, service worker registration via Serwist.
- App shell layout with bottom navigation (mobile-first).
- CI workflow.

**Non-scope:** any domain feature, auth (spec 03), DB schema (spec 02).

## Steps

### 1. Initialize

- In the repo root run `create-next-app` (latest) with: TypeScript, ESLint, Tailwind, `src/` directory, App Router, import alias `@/*`. Package manager **pnpm**.
- `tsconfig.json`: ensure `"strict": true` and add `"noUncheckedIndexedAccess": true`.
- `package.json`: set `"license": "AGPL-3.0-only"` and `"private": true`.
- Add scripts to `package.json`:
  ```json
  {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
  ```

### 2. Dependencies

Runtime: `drizzle-orm`, `@libsql/client`, `zod`, `@serwist/next`, `serwist`.
Dev: `drizzle-kit`, `vitest`, `@types/node`.
shadcn/ui: run `pnpm dlx shadcn@latest init` (style: default, base color: neutral, CSS variables: yes), then add starter components: `button card input label dialog dropdown-menu badge tabs sonner skeleton`.

### 3. Env plumbing

- Create `.env.example` with (comments included; values empty or dev defaults):
  ```
  # Turso — https://turso.tech (local dev: file:local.db with empty token)
  TURSO_DATABASE_URL=file:local.db
  TURSO_AUTH_TOKEN=
  # Canonical public URL of the deployment
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
  (Later specs append their variables — see registry in `00-overview.md` §7.)
- Create `src/lib/env.ts`: a Zod schema parsing `process.env` once, exporting a typed `env` object. Server-only vars must not leak to the client: split `env` (server) and `clientEnv` (only `NEXT_PUBLIC_*`). Throw a readable error at startup listing missing vars.

### 4. Drizzle client

- `drizzle.config.ts` at repo root: dialect `turso`, schema `./src/db/schema.ts`, out `./drizzle`, credentials from env.
- `src/db/index.ts`: create `@libsql/client` with `url: env.TURSO_DATABASE_URL`, `authToken` optional; export `db = drizzle(client)`. `src/db/schema.ts`: create the file with a comment "tables are defined in spec 02" (empty export so the build passes).

### 5. PWA

- `public/manifest.webmanifest`: name "FamilySherpa", short_name "Sherpa", lang `it`, display `standalone`, start_url `/`, theme/background color `#0f172a`, icons 192/512 (+ maskable).
- Icons: generate simple placeholder PNGs programmatically (e.g. a script with `sharp` or a solid-color PNG with the ⛰ emoji rendered as SVG→PNG); pixel-perfect branding is out of scope, valid files are required.
- Serwist per official `@serwist/next` docs: `src/app/sw.ts` with `defaultCache`, wire in `next.config.ts` (`swSrc: "src/app/sw.ts"`, `swDest: "public/sw.js"`, disable in dev). Add `<meta name="apple-mobile-web-app-capable">` and manifest link in the root layout metadata.

### 6. App shell

- Root layout: `lang="it"`, font via `next/font` (Inter), Tailwind body classes, `<Toaster />` (sonner).
- Route group `(app)` with a layout containing:
  - Top bar: app name + placeholder avatar button.
  - Bottom tab bar (mobile) / side rail (`md:` breakpoint) with 5 items: **Home** (`/`), **Scadenze** (`/deadlines`), **Inbox** (`/inbox`), **Asset** (`/assets`), **Altro** (`/more`).
- Each route: a page with the Italian title and an empty-state `Card` ("In arrivo…"). These are placeholders that later specs replace.
- `/more` links to future `/meds` and `/settings` (placeholder pages too).

### 7. CI

`.github/workflows/ci.yml`: on push/PR to `main`; pnpm setup with cache; `pnpm install --frozen-lockfile`; run `lint`, `typecheck`, `test`, `build`. Provide dummy env vars needed for build (e.g. `TURSO_DATABASE_URL=file:ci.db`).

### 8. Housekeeping

- Add a Vitest smoke test (e.g. env schema parses given a valid fixture) so `pnpm test` is green, config in `vitest.config.ts` with alias `@/*`.
- Verify `.gitignore` covers `local.db`, `.env`, `public/sw.js` (already in repo root — extend if needed).

## Acceptance criteria

1. `pnpm dev` starts; `/`, `/deadlines`, `/inbox`, `/assets`, `/more` render the shell with bottom navigation; active tab is highlighted.
2. `pnpm build` succeeds with no type or lint errors; `pnpm test` passes.
3. Lighthouse (or Chrome devtools > Application) recognizes the app as installable PWA in a production build (`pnpm build && pnpm start`).
4. `src/lib/env.ts` throws a clear error when a required var is missing (verify by unsetting one).
5. CI workflow file present and syntactically valid (`act` not required — review by eye).

## Implementation prompt

> **Run with:** Sonnet 5 (`claude-sonnet-5`), reasoning effort **medium** — set via `/model` before pasting. (Boilerplate-heavy, docs-driven setup.)

```
Read docs/specs/00-overview.md first, then implement docs/specs/01-scaffold.md
in this repository, following CLAUDE.md.

Stay strictly within the spec's scope (no auth, no DB tables). Follow the
"Definition of done" in 00-overview.md §9. Commit in logical steps with
conventional commit messages.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how
(commands to run, URLs to open, what I should see), plus any external setup
I must do myself.
```
