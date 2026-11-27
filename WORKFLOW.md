# Workflow — standing instructions

> **Standing instructions for any AI agent working on this repo.** They are not suggestions and not
> per-session: they hold until this file says otherwise.
>
> **They live in the repo, not in agent memory**: memory is per machine and per install, so the
> rules drift apart; a tracked file travels with the clone. An agent with persistent memory saves
> one pointer to this file, not the rules. If the owner states a new rule, it is added *here*, in that session's commit: to section 3 if it holds
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
   Branches and edits need no approval — only the commit does.

2. **One branch per session.** Before starting implementation work, create a new branch from the
   branch that is active at the start of the session. Check which one that is; never assume `master`/`main`.

3. **One commit per session.** Everything from a session is squashed into a single commit.

4. **Always answer in Italian** when working on this repo. This applies to the conversational
   channel; code, identifiers and comments stay in English. **Every tracked document is written in
   the repo's documentation language** (2026-11-01): English in the open repos, Italian where the
   repo's documentation is Italian (its WORKFLOW.md says which). In an English-language repo, Italian
   is reserved for the UI text a document quotes, page and feature names and the owner's own words, quoted as such. A guide still in the
   other language is rewritten when a session rewrites it anyway, never in a session of its own.

5. **Questions and proposals are asked interactively** (2026-09-11). A decision that is the owner's —
   which layers to build, on which surfaces, a wording — goes through the agent's interactive
   question tool, in groups of four, one topic at a time, multi-select where the options are not
   exclusive, the recommended option first; never a numbered list of questions in prose.

6. **Figures in tests are invented and round, never the owner's** (2026-10-12). A unit-test
   fixture, an E2E decoy or a seed carries amounts like 2500, 1120, 50: the owner's real data never
   enters the repo, not even as an expected value. A copy of real data that § 3 provides for the
   guided tour serves the tour only, and phase G removes it.
   **Nothing of the owner's real data in a tracked file** (2026-09-20, 2026-10-15; code comments
   too since 2026-11-15): a draft, comment, critique, screenshot, fixture or example sentence takes
   invented figures and generic names, never an amount, holding, account, start date or family
   detail from the real data. A public repo has no exception; a private one may waive or narrow it
   only in § 3, with the owner's decision and its date. Public data that is not the owner's (a
   listed company's published accounts) is not the owner's data.

7. **After an audit or an analysis, stop and wait for the owner's go-ahead** (2026-10-19). An audit,
   a review or an analysis ends with the findings; no file changes until the owner has chosen which
   fixes to apply and in what order (through rule 5).

8. **Dependencies: compare at session start, upgrade in a session of their own** (2026-10-26). If
   the repo has a lockfile, a session first installs from it with every server stopped (`npm ci`,
   `pnpm install --frozen-lockfile`; 2026-11-17: the audit reads the lock),
   then runs the package manager's audit and compares it with
   `doc/guide/dipendenze.md`, which records the date of the last audit, the framework version and
   every open advisory with the owner's decision. The answer is one line: «dipendenze: invariate
   dal <data>» or «N avvisi nuovi: …». A new advisory is written into the guide with its decision,
   asked through rule 5; nothing is upgraded in that session. An upgrade is a session on its own
   branch with its own verification; never `audit fix --force` or the command an advisory suggests:
   the version is chosen and installed by hand, preferring a release at least a few days old. A
   missing guide is created by the session that notices it (`TEMPLATES.md`). A repo without a
   lockfile skips this rule.

9. **`SESSION_NOTES.md` is the session's temporary container** (2026-10-26). A working file in the
   repo root, created at the start of the session and never committed. Before the closing prompt it
   ends with one block per thing learned: *Cosa* (what was done), *Perché* (the decision behind
   it), *Nota* (traps and measurements, dated), *Dove va a fine sessione* (`AGENTS.md`
   if it holds for the whole repo · `doc/guide/<tema>.md` if a domain lesson · `WORKFLOW.md` if a
   session rule · `CLAUDE.md` if project state · a comment at the right line if it is the why of one
   line). The closing prompt writes every entry into its destination and deletes the file before
   the single commit; a note that names no destination is lost. A `SESSION_NOTES.md` still on the
   remote means a session was not closed.

10. **The commit's «Model: … · effort …» line is read from the spec, never asked** (2026-11-18). A
    session that implements a spec writes the model and effort the spec names (its prompt, or its
    row in the series index); the one that retires it writes the SAME pair as the implementation's
    commit (`git log`). The owner is asked only when no spec is behind the session or it ran at
    another model or effort.

---

## 2. Guided verification (*collaudo guidato*)

When a freshly implemented feature has to be verified by hand, do **not** hand over a checklist and
disappear. The verification is done together, in chat, one phase at a time.

### Five obligations

1. **You prepare the test data.** A throwaway script (untracked by git, deleted when the
   verification ends) that plants **decoy words** — invented terms such as *fenicottero*,
   *ornitorinco*, which appear nowhere else in the data. Never entered by hand.

2. **One phase per message.** Give the phase, wait for the report, then the next one. Never deliver
   all the phases at once: it breaks their prerequisites.

3. **State the expected outcome before running, not after** — otherwise the reading always bends to
   fit whatever happened.

4. **Do every check you can automate yourself, and leave the owner only what you cannot do.**
   If the sessions are scriptable, write a throwaway script that opens a **real browser**
   with an authenticated session — your own if the role allows it, otherwise a
   throwaway test identity — and verify every outcome **against the database or the HTTP response,
   never against the look of the page alone**. Report phase by phase, expected outcome first.
   **Any automated end-to-end test that you are able to run, you run**: never declare a feature
   verified with an automated check left unrun. Left to the owner is only what is genuinely not
   automatable: visual and aesthetic judgement, physical hardware (a real barcode scanner), or a
   login no script can drive (a real OAuth flow with MFA).
   **The whole suite is launched last, when no file of the repo is left to change** (2026-11-22): a
   run fingerprints its tree, and a file edited meanwhile kills it or
   makes it measure a tree that is gone. Finish every edit first, the deletion of
   `SESSION_NOTES.md` included, touch nothing in that repo until the suite reports, and run it
   again if a file changes after. Other repos and the scratchpad may change.
   **A long run in the background is watched, not waited on** (2026-11-25): for the full suite, a
   build or a benchmark, a monitor reports progress **every five minutes** and **at once**
   when a service the run needs (emulators, dev server, database) stops answering. A dead service
   stops the run: restart both, never read the reds it left as results.
   **A browser suite on a shared backend runs on several workers, each in its own data universe**
   (2026-11-26): a database, project or tenant picked by the worker's index and seeded alike, never
   accounts cloned inside one. The count is measured: the fastest whole run green twice (on a
   hybrid CPU start from the performance cores). Above two workers the trace is kept only at the
   one retry of a red, and a test green only there is «flaky», read like a red. No spec names the
   backend, a parked session or another file's data by literal (one helper does) or reads what
   another file wrote. A fixed sleep becomes a condition, unless it IS the gesture under test.
   Nothing else runs on the machine, and the run's ports are free, while it is measured or gated;
   the whole run on a production build, an area run on the dev server. § 3 carries the line
   `Browser tests: workers <N> · isolation <mechanism> · whole run <wall> on <date> (<tests>
   tests)`; `workers 1` gives its reason.

5. **Before dismantling, let the owner look.** When the session touched something visible, ask for
   the OK and then walk the owner onto the dev server **with the fixtures still alive**: exact URLs,
   under which identity, and at most **five** things to look at — for each, what must happen and
   what would be the bug. **The tour starts at the owner's go** (2026-10-05): finish everything that
   needs no eyes, say it is ready, and wait. **A tour the spec plans is always done, and before the
   commit** (2026-11-14): never offered as optional, never traded for green tests, never begun
   without the owner's go; the diff summary and the commit's OK (rule 1) follow the tour
   (2026-11-21). The assistant opens the windows itself (2026-11-21): a before/after comparison as
   two windows side by side, an action as the page already on it. Where obligation 4 allows it,
   **open the page for the owner, already authenticated**: one item per message, one page at a
   time, waiting for the outcome; two pages together only for a comparison (the same URL under two
   identities), saying which window is which.
   Only what a probe cannot say: layout, whether the screen says what it must say, the words,
   whether an action gives feedback. State also **what that tour does not cover**, and never ask
   the owner to redo by hand something already verified. Whatever the tour finds becomes an
   assertion before the session ends: the tour does not replace the tests.
   **The windows have a width and a way to close** (2026-11-24): a phone check opens at a FIXED
   viewport (`viewport: { width: 390, height: 844 }`, a helper option), never `viewport: null`.
   The helper closes the windows it opened with the
   platform's tool (`taskkill /T /F` on Windows), sparing its own parents.

**A before/after comparison of screenshots is shown cropped, one item at a time** (2026-10-30): never
a folder of files. The agent opens a browser window on an HTML page with BEFORE and AFTER **cropped
to the area that changes** (one above the other; side by side for phone screenshots), **enlarged**
when the difference is a few pixels, titled with where to look, the crop checked with a headless
screenshot first. The message says «Comparison N of M», what changes and which side is which; the
window rules of obligation 5 apply.

**A window ends by itself, and is closed by its tree** (2026-11-09). The script that opens a visible
browser exits when the owner closes the **page** (`disconnected` alone never fires), when the browser goes, or after a time limit — one
wait, written **once** in a helper the throwaway scripts import. A window is closed by its root
with the whole tree (stopping the background task kills only the shell), then the count says zero.
**Once the owner confirms an item, the agent closes its windows** (2026-11-13; the comparison page
too, 2026-11-21: it opens in a driven window, never in the owner's default browser): it stops the
helper by its root, checks the count at zero and only then opens
the next item. The owner never closes a window to move on.

### Standard phases, when they make sense

| | Phase | What it establishes |
| --- | --- | --- |
| **A** | Invarianza | What worked before still works |
| **B** | Cambio di contesto | The new role/state is genuinely active |
| **C** | Comportamento nuovo | It does what it must, and not what it must not (obligation 4) |
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

**No collaudo script outlives its session** (2026-11-09; the services too, 2026-11-13). `node ~/.claude/processi-collaudo.mjs` counts the
trees of `scripts/collaudo-*` alive in the repo and the services a session starts and forgets (the
Firebase emulators, the Next.js `dev`/`start` servers), and says whose they are: this session's
(closed with `--chiudi`), another open session's (never touched), or unknown (named to the owner,
closed with `--chiudi --anche-ignote` only on their yes). The count is the **first gate** of every
repo's gate list: zero, or none starts. The standard `settings.json` runs it with `--hook` at
`SessionEnd`; a session that dies
without ending is caught by the next gate and by the count at every session start
(`prompts/01_SESSION_START.md`).
*A verification that was not recorded counts as not done.*

**The outcome is one line, the signals are not** (2026-10-19). In `CLAUDE.md` the session's status
entry says what was done, where it is documented, what is open and what comes next; it replaces the
previous one. The session's signals — type-check, test counts, E2E runs, flakes, skipped phases, the
guided tour's walk and findings (2026-10-23) — go in the commit message and, where they teach
something, in the area's guide, never in `CLAUDE.md`, which is injected into every turn: of the
tour it keeps only the outcome, done and closed or what is left open.

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
- **First gate: `node ~/.claude/processi-collaudo.mjs --radice .` must say 0** (collaudo scripts and
  services alive in the repo, §2; `--chiudi` closes this session's). Zero, or the gates below do not start.
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
  requests: work has landed directly on `main`. A session closes on a session branch from `main`,
  with one commit and a pull request on GitHub, merged by the owner (decided 2026-10-27); CI runs on
  the pull request.
- **`SESSION_NOTES.md`**: the session's working file in the root (rule 9). **Not in `.gitignore`
  yet**: until it is added, check `git status` before the commit. Before the closing prompt it ends
  with one block per thing learned or decided — *Cosa*, *Perché*, *Nota* (traps and measurements,
  each with its date), *Dove va a fine sessione*, with these destinations in this repo:
  `AGENTS.md` (an environment or tooling lesson valid for the whole repo) · `doc/guide/<tema>.md`
  (a domain lesson; the folder exists since 2026-10-27 with `dipendenze.md` — `docs/` holds only
  the README screenshots) · `WORKFLOW.md` (a session rule) · `CLAUDE.md` ("What exists today"
  for the codebase map, "Current status" for project state) · `SETUP.md` (a setup or self-hosting
  step) · `PRODUCT.md` / `DESIGN.md` (a product or visual-system decision) · a comment at the right
  line (the why of one line). Every entry is written into its destination before closing; then the
  file is deleted.
- **Verification outcome**: `CLAUDE.md` → `## Current status` → the `### Latest — <title> (<date>)`
  entry, replaced each session; what stays open goes in `### Known limits carried forward`. The
  signals (check results, test counts, tour findings) go in the commit message.
- **Dependency guide**: `pnpm-lock.yaml` exists, so rule 8 applies (`pnpm audit --json`), compared
  with `doc/guide/dipendenze.md` (created 2026-10-27: audit date, framework versions, open
  advisories with the owner's decision).
- **`Draft Release Temp.md`**: not kept at the moment. It existed from the spec sessions until the
  v1.0 notes (deleted in `34fc3d7`, 2026-07-21); its last model — title `# Release notes — v1.0`,
  a short intro, then one section per product area — is in `git show cccd288:"Draft Release Temp.md"`.
  If a session brings it back, it follows that model and the standard rules: no private data (this
  repo is public), never «spec ritirata».
