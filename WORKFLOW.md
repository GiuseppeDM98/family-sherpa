# Workflow — standing instructions

> **Standing instructions for any AI agent working on this repo.** They are not suggestions and not
> per-session: they hold until this file says otherwise.
>
> **Why they live in the repo and not in agent memory**: agent memory is per-machine and per
> install, so the same rules drift into different versions on each machine and in a cloud
> session. A tracked file travels with the clone and can be reviewed in a diff. If you are an agent
> with persistent memory, do **not** re-save these rules there — save one pointer to this file. If
> the owner states a new rule, it is added *here*, in that session's commit: to section 3 if it holds
> for this repo only; if it holds for every repo, ask the owner, because it enters the standard
> first (`claude-config/prompts/WORKFLOW_STANDARD.md`) and reaches the repos from there.
>
> Sections 1-2 are the portable standard, identical across every repo that adopts it. Section 3 is
> the only project-specific part: it says what "automate it yourself" and "show me the app"
> concretely mean *here*.

---

## 1. Session and collaboration rules

1. **Never commit without explicit approval.** Do not run `git commit` (nor `--amend`) until the
   owner gives the OK for that specific commit. Finish the work, summarise the diff, then ask.
   Creating the branch and editing files needs no approval — only the commit does.

2. **One branch per session.** Before starting implementation work, create a new branch from the
   branch that is active at the start of the session. Always check which one that is; never assume
   `master`/`main`.

3. **One commit per session.** Everything from a session is squashed into a single commit, never
   scattered across several.

4. **Always answer in Italian** when working on this repo. This applies to the conversational
   channel; code, identifiers and comments stay in English.

5. **Questions and proposals are asked interactively** (2026-09-11). When a decision is the owner's —
   which layers to build, on which surfaces, a wording — put it through the agent's interactive
   question tool, in groups of four, one topic at a time, multi-select where the options are not exclusive and the
   recommended option first; never a numbered list of questions in prose. The owner refines the
   wording through the free-text answer («hai pagato», not «pagherai», for a tax the broker
   withholds at the sale).

6. **Figures in tests are invented and round, never the owner's** (2026-10-12). A unit-test
   fixture, an E2E decoy or a seed carries amounts like 2500, 1120, 50: the owner's real data never
   enters the repo, not even as an expected value. If § 3 provides a copy of real data for the
   guided tour, it serves the tour only and phase G removes it.
   **Nothing of the owner's real data in a tracked file** (2026-09-20, 2026-10-15): a draft, a
   critique, a screenshot, a fixture or an example sentence takes invented figures and generic
   names, never an amount, an account or a family detail copied from the real data. In a public
   repo this has no exception. A private repo may waive it, or narrow it, only by saying so in § 3
   with the owner's decision and its date; public data that is not the owner's (a listed company's
   published accounts) is not the owner's data.

7. **After an audit or an analysis, stop and wait for the owner's go-ahead** (2026-10-19). An audit,
   a review or an analysis ends with the findings; no file changes until the owner has chosen which
   fixes to apply and in what order (through rule 5).

8. **Dependencies: compare at session start, upgrade in a session of their own** (2026-10-26). If
   the repo has a lockfile, the first thing a session does is run the package manager's audit
   (`npm audit --json`, `pnpm audit --json`, …) and compare it with `doc/guide/dipendenze.md`,
   which records the date of the last audit, the framework version and every open advisory with
   the owner's decision (accepted because dev-only, waiting for version X, to upgrade). The answer
   is one line: «dipendenze: invariate dal <data>» or «N avvisi nuovi: …». A new advisory is
   written into the guide with its decision, asked through rule 5; nothing is upgraded in that
   session. An upgrade is a session on its own branch with its own verification; never
   `audit fix --force`, never the command an advisory or a page suggests: the version is chosen and
   installed by hand, preferring a release that is at least a few days old. If the guide is
   missing, the session that notices it creates it (`TEMPLATES.md` has the skeleton). A repo without
   a lockfile skips this rule.

9. **`SESSION_NOTES.md` is the session's temporary container** (2026-10-26). A working file in the
   repo root, created at the start of the session and never committed. Before the closing prompt it
   ends with one block per thing learned: *Cosa* (what was done), *Perché* (the decision behind
   it), *Nota* (traps and measurements, each with its date), *Dove va a fine sessione* (`AGENTS.md`
   if it holds for the whole repo · `doc/guide/<tema>.md` if a domain lesson · `WORKFLOW.md` if a
   session rule · `CLAUDE.md` if project state · a comment at the right line if it is the why of one
   line). The closing prompt writes every entry into its destination and deletes the file before
   the single commit; a note that names no destination is lost. A `SESSION_NOTES.md` still on the
   remote means a session was not closed.

---

## 2. Guided verification (*collaudo guidato*)

When a freshly implemented feature has to be verified by hand, do **not** hand over a checklist and
disappear. The verification is done together, in chat, one phase at a time.

### Five obligations

1. **You prepare the test data.** A throwaway script (untracked by git, deleted when the
   verification ends) that plants **decoy words** — invented terms such as *fenicottero*,
   *ornitorinco*, which appear nowhere else in the data. Not entered by hand by the owner.

2. **One phase per message.** Give the phase, wait for the report, then the next one. Never deliver
   all the phases at once: it breaks their prerequisites.

3. **State the expected outcome before running, not after** — otherwise the reading always bends to
   fit whatever happened.

4. **Do every check you can automate yourself, and leave the owner only what you cannot do.**
   "Together, in chat" does not mean "one dictated click at a time". If the sessions are JWT-based
   or otherwise scriptable, write a throwaway script that opens a **real browser** (e.g. Playwright)
   with an authenticated session — your own if the role allows it, otherwise a throwaway test
   identity created for the occasion — and verify every outcome **against the database or the HTTP
   response, never against the look of the page alone**. Report the results phase by phase, with the
   expected outcome stated first.
   **Any automated end-to-end test that you are able to run, you run.** Never declare a feature
   verified while an automated check that could have covered it was left unrun. What is left to the
   owner is only what is genuinely not automatable: visual and aesthetic judgement, physical
   hardware (a real barcode scanner), or an interactive login that cannot be driven by a script (a
   real OAuth flow with MFA).

5. **Before dismantling, let the owner look.** When the session touched something visible, ask for
   the OK and then walk the owner onto the dev server **with the fixtures still alive**: exact URLs,
   under which identity, and at most **five** things to look at — for each one, what must happen and
   what would be the bug. **The tour starts at the owner's go, not when the work is ready**
   (2026-10-05): finish everything that needs no eyes, say it is ready, and wait. Where obligation 4
   allows it, **open the page for the owner, already authenticated** — but one item per message and
   one page at a time, waiting for the outcome before opening the next; two pages together only
   when the item is a comparison (the same URL under two identities), saying which window is which.
   The windows of a driven browser have no name: five at once turn the tour into working out which
   belongs to which item. Only what a probe cannot say: layout, whether the screen says what it must
   say, the words, whether an action gives feedback that it happened. State also **what that tour
   does not cover**, and never ask the owner to redo by hand something already verified. Whatever
   the tour finds becomes an assertion before the session ends, or it will come back: the tour
   exists to discover what nobody thought to assert, not to replace the tests.

### Standard phases, when they make sense

| | Phase | What it establishes |
| --- | --- | --- |
| **A** | Invarianza | What worked before still works |
| **B** | Cambio di contesto | The new role/state is genuinely active |
| **C** | Comportamento nuovo | It does what it must, and not what it must not — obligation 4 matters most here: automate |
| **D** | Sotto la UI | The same rules hold when the route is called directly |
| **E** | Casi negativi | Someone without rights is refused, with the right error |
| **F** | Giro guidato | The only phase the owner executes: they look with their own eyes, fixtures still alive |
| **G** | Ripristino | Configuration restored, fixtures removed, script deleted |

### A negative test alone never proves a security guard

It always takes the pair: **own resource** (positive control — must succeed) and **someone else's
resource** (the test — must fail), with the same identical file or record.

### Closing a verification

Restore any configuration that was changed, remove fixtures and test attachments, delete the script,
and **record the outcome somewhere that survives the session** (`CLAUDE.md` or equivalent).
*A verification that was not recorded counts as not done.*

**The outcome is one line, the signals are not** (2026-10-19). In `CLAUDE.md` the session's status
entry says what was done, where it is documented, what is still open and what comes next; it
replaces the previous one. The session's signals — type-check, test counts, E2E runs, flakes,
skipped phases, the guided tour's walk and its findings (2026-10-23) — go in the commit message
and, where they teach something, in the area's guide, never in `CLAUDE.md`: that file is injected
into every turn, and a status entry that collects them grows back into a diary after every trim.
Of the tour, the status entry keeps only its outcome: done and closed, or what it left open.

---

## 3. What this means in THIS repo

The rules above are the standard. This section is the local translation of obligations 4 and 5 — it
changes from repo to repo and is the only part to rewrite when the tooling changes.

Project conventions stay where they are and are not repeated here: `CLAUDE.md` (its own *Rules* 1-5,
project conventions, the map of what exists, the status), `AGENTS.md` (environment and tooling
gotchas, most of them Windows-specific), `SETUP.md` (from a fresh clone to a running dev server),
`PRODUCT.md` / `DESIGN.md` (product and visual system), `DEVELOPMENT_GUIDELINES.md` and
`COMMENTS.md` (code and comment standards).

### Data: a public repo, and a dev `.env` that is not a throwaway

- The GitHub repo is **public** (AGPL-3.0): rule 6 applies with no exception — nothing of the
  owner's family enters a tracked file, screenshots included (`docs/assets/` and `public/landing/`
  must come from the demo seed only).
- The dev `.env` points `TURSO_DATABASE_URL` at a **cloud Turso database** (`libsql://…`), which
  may hold the owner's real family alongside the demo one (`AGENTS.md`, "Server Actions can't be
  driven with curl"). A verification never writes to it and never reads unscoped from it. Every
  fixture, decoy and test identity lives in a **throwaway SQLite file** instead (below).
- `local.db` and `ci.db` in the root are empty, gitignored files: `ci.db` is the CI's
  (`.github/workflows/ci.yml` sets `TURSO_DATABASE_URL: file:ci.db`), `local.db` is the fallback of
  `drizzle.config.ts` when no URL is set. Neither is migrated, and neither is the dev database.

### Automated checks (obligation 4)

- Package manager: **pnpm** (`pnpm-lock.yaml`; CI uses pnpm 11 and Node 22; this machine has
  Node 24). If `pnpm` is missing, `npm install -g pnpm` (`AGENTS.md`, not corepack).
- The four checks, from `package.json`, all required by `SETUP.md` §7 and run by CI on every push
  and pull request to `main`:
  - `pnpm lint` → `eslint .`
  - `pnpm typecheck` → `tsc --noEmit`
  - `pnpm test` → `vitest run` (unit tests only, `environment: "node"`, 22 `*.test.ts` files under
    `src/lib/`; a test that imports anything touching `env` uses `TEST_ENV` from
    `src/test/env-fixture.ts` — `AGENTS.md`)
  - `pnpm build` → `next build --webpack` — the only check that walks the client bundle graph
    (`node:crypto` leaking into a `"use client"` file passes lint and typecheck and fails here).
- **There is no E2E suite.** No Playwright or Cypress in `package.json`; `playwright` appears in
  the lockfile only as an optional peer of Vitest. `AGENTS.md` ("Screenshots / headless browser")
  documents the only browser automation used so far: `pnpm add -D playwright` +
  `pnpm dlx playwright install chromium` for the occasion, then `pnpm remove playwright`. Adding a
  real dependency is the owner's decision (rules 5 and 8); the minimum for a proper suite would be
  `@playwright/test` as a devDependency, a `globalSetup` that migrates and seeds a throwaway file DB
  and signs in once, and a parked `storageState`.
- Without a browser, server-rendered pages can be checked with `curl`: Auth.js routes are plain
  REST, so `/api/auth/csrf` + `POST /api/auth/callback/credentials` give a session cookie, then
  `curl -b` any page and grep the RSC flight payload for the props (recipes in `AGENTS.md`, "Server
  Actions can't be driven with curl" and "Verifying a dashboard/RSC page without a browser").
  **Server Actions cannot be curled** (the action id is a build hash): drive them through a real
  browser, or replicate their Drizzle queries in a scratch script and say that this checks the
  logic, not the wiring.
- Cron endpoints (`/api/cron/daily`, `/api/cron/therapy`) are plain handlers gated by
  `Authorization: Bearer $CRON_SECRET`: call them with `curl`, or import `GET`/`POST` in a scratch
  script against the throwaway DB (`AGENTS.md`, "Testing web push locally").
- Not automatable here, so left to the owner: the real Telegram round-trip (it needs a public
  tunnel — `cloudflared`, `SETUP.md` §6 — a real bot, and real Claude/Groq calls, billed per
  message), a web-push notification actually showing on a device, and visual judgement.

### An isolated environment and a test identity

There is no docker-compose and no emulator; isolation is a throwaway SQLite file, overriding the env
vars **before** the command (an already-set variable wins over `.env`). From `AGENTS.md`
("Verifying the AI pipeline…", "Screenshots / headless browser"), in Git Bash:

```bash
rm -f verify.db*
TURSO_DATABASE_URL="file:verify.db" TURSO_AUTH_TOKEN="dummy" pnpm drizzle-kit migrate
TURSO_DATABASE_URL="file:verify.db" TURSO_AUTH_TOKEN="dummy" pnpm db:seed
```

- `drizzle-kit` rejects an empty auth token even for a `file:` URL: any non-empty dummy works.
  `*.db` files are gitignored.
- `pnpm db:seed` (re)creates "Famiglia Demo" and its user `demo@familysherpa.dev` (role `admin`,
  dates anchored to today, so the dashboard, deadlines and meds screens are not empty). The demo
  user has **no `password_hash` by design**: to sign in, a scratch script sets a bcrypt hash on the
  throwaway DB only; a new `pnpm db:seed` wipes and recreates the user.
- A second identity (for the negative half of a guard, or a second family member) is a scratch
  script that inserts a user with a bcrypt hash and its own family, or joins the demo family with
  its invite code. Sign-up through `/signup` is gated by `AUTH_ALLOWED_EMAILS`, which the dev `.env`
  sets.
- Roles: `family_members.role` is `admin` | `member`, but today it is only displayed (Settings); no
  code path authorizes on it. The reading the owner cannot open with their own account is **another
  family's data**: the cross-tenant pair (own family must succeed, other family must fail) needs two
  users in two families on the throwaway DB.
- Scratch scripts must live **inside** the repo, or `tsx` cannot resolve `node_modules`
  (`AGENTS.md`), and run with `pnpm tsx --env-file=.env <script>` after the overrides above. There
  is **no gitignored scratch folder yet**: until one is added to `.gitignore` (the owner's call),
  a scratch script is deleted before the commit and checked with `git status`.

### Showing the app, already authenticated (obligation 5)

- Dev server: `pnpm dev` (`next dev --webpack`) on `http://localhost:3000`. For a verification,
  start it on the throwaway DB and on another port, so it never shares the cloud DB:
  `TURSO_DATABASE_URL="file:verify.db" TURSO_AUTH_TOKEN="dummy" PORT=3100 pnpm dev`.
- Logged out, `/` rewrites to the public `/welcome` landing; signed in, `/` is the dashboard. Main
  screens: `/`, `/deadlines`, `/inbox`, `/assets` (`/assets/<id>?tab=costi`), `/meds`, `/settings`.
- The service worker is disabled in `next dev`: anything about web push or the installed PWA needs
  `pnpm build` + `pnpm start` (same overrides and port), with `AUTH_TRUST_HOST=true`, already set in
  the dev `.env` (`AGENTS.md`, "Testing web push locally").
- Opening the page already authenticated: sessions are JWT (Auth.js v5, Credentials provider), so a
  driven browser signs in as the seeded user (password set on the throwaway DB) through `/signin`,
  or reuses the cookie from the `callback/credentials` call, and opens the page for the owner. This
  needs Playwright, which is **not installed**: each time it is added and removed as in `AGENTS.md`,
  unless the owner decides to keep it. Without it, the fallback is handing the owner the URL, the
  demo email and the temporary password to sign in by hand on `localhost:3100`.

### Reading the real state back

- `pnpm db:studio` (Drizzle Studio), launched with the same `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`
  overrides so it opens the throwaway file: `drizzle-kit` loads `.env` by itself, so a bare
  `pnpm db:studio` or `pnpm db:migrate` opens the cloud DB.
- A scratch `tsx` script with Drizzle queries, always filtered by the family/user just created —
  never an unscoped `select()`.
- HTTP: the `curl` session above for pages, and the JSON bodies of `/api/cron/*`.

### Where things are recorded

- **Branches**: `main` is both the default and the integration branch (`git branch -a`: `main` and
  `origin/main` only). The history (98 commits) is linear, with no merge commits and no pull
  requests: work has landed directly on `main`. A session branch reaches `main` by fast-forward
  merge and push, or through a pull request — the owner's call; CI runs on both.
- **`SESSION_NOTES.md`**: the session's working file in the root (rule 9). **Not in `.gitignore`
  yet**: until it is added, check `git status` before the commit. Before the closing prompt it ends
  with one block per thing learned or decided — *Cosa*, *Perché*, *Nota* (traps and measurements,
  each with its date), *Dove va a fine sessione*, with these destinations in this repo:
  `AGENTS.md` (an environment or tooling lesson valid for the whole repo) · `doc/guide/<tema>.md`
  (a domain lesson; the folder does not exist yet, the first such lesson creates it — `docs/` holds
  only the README screenshots) · `WORKFLOW.md` (a session rule) · `CLAUDE.md` ("What exists today"
  for the codebase map, "Current status" for project state) · `SETUP.md` (a setup or self-hosting
  step) · `PRODUCT.md` / `DESIGN.md` (a product or visual-system decision) · a comment at the right
  line (the why of one line). Every entry is written into its destination before closing; then the
  file is deleted.
- **Verification outcome**: `CLAUDE.md` → `## Current status` → the `### Latest — <title> (<date>)`
  entry, replaced each session; what stays open goes in `### Known limits carried forward`. The
  signals (check results, test counts, tour findings) go in the commit message.
- **Dependency guide**: `pnpm-lock.yaml` exists, so rule 8 applies (`pnpm audit --json`).
  `doc/guide/dipendenze.md` does **not exist yet** (2026-10-27): the next session that runs the
  audit creates it.
- **`Draft Release Temp.md`**: not kept at the moment. It existed from the spec sessions until the
  v1.0 notes (deleted in `34fc3d7`, 2026-07-21); its last model — title `# Release notes — v1.0`,
  a short intro, then one section per product area — is in `git show cccd288:"Draft Release Temp.md"`.
  If a session brings it back, it follows that model and the standard rules: no private data (this
  repo is public), never «spec ritirata».
