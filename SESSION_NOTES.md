# Session notes — spec 01: scaffold

Status: done — all steps implemented, lint/typecheck/test/build green.

## Plan
1. `create-next-app` (TS, ESLint, Tailwind, src/, App Router, `@/*` alias), pnpm.
2. tsconfig strict + noUncheckedIndexedAccess.
3. package.json: license AGPL-3.0-only, private true, scripts.
4. Deps: drizzle-orm, @libsql/client, zod, @serwist/next, serwist; dev: drizzle-kit, vitest, @types/node.
5. shadcn/ui init + starter components.
6. .env.example + src/lib/env.ts (server/client split, Zod).
7. drizzle.config.ts + src/db/index.ts + src/db/schema.ts (empty, spec 02 note).
8. PWA: manifest, icons, sw.ts via Serwist, next.config wiring, layout meta.
9. App shell: root layout (lang=it, Inter font, Toaster), (app) route group with top bar + bottom nav (Home/Scadenze/Inbox/Asset/Altro), placeholder pages, /more sub-links to /meds /settings.
10. CI workflow (.github/workflows/ci.yml).
11. Vitest smoke test for env.ts, vitest.config.ts with @/* alias.
12. .gitignore check.
13. Verify: pnpm dev, pnpm build, pnpm test, pnpm lint, pnpm typecheck.

## Log
- pnpm not installed on machine; installed globally via `npm install -g pnpm` (v11.13.1). Node v24.18.0.
- Scaffolded with `create-next-app` in a scratch dir (repo root already had non-empty files) then merged in, keeping the repo's own README.md and .gitignore.
- Next.js resolved to 16.2.10 (spec asked for "15+, install exact current stable" — 16 is current stable).
- shadcn/ui CLI is now v4.x with a preset system (Nova/Vega/Maia/...) instead of the old `style`/`--base-color` flags the spec described; used `-d` (preset `base-nova`, base color `neutral` — matches spec intent).
- `next lint` was removed in Next 16; `lint` script now runs `eslint .` directly (same effect).
- Next 16 defaults to Turbopack for `dev`/`build`; `@serwist/next` only supports webpack. Added `--webpack` to both scripts.
- Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass; `pnpm build` succeeds (8 static routes + generated `public/sw.js`); `pnpm start` smoke-tested with curl (`/`, `/deadlines`, `/manifest.webmanifest`, `/sw.js` all 200).
- Next's metadata API emits `<meta name="mobile-web-app-capable">` instead of the spec's literal `apple-mobile-web-app-capable` tag (Next follows the updated standard tag name now that Apple also supports it) — same installability effect.

## Session summary

- **Cosa**: implementato interamente lo spec 01 (scaffold Next.js 16 + Tailwind v4 + shadcn/ui, env accessor Zod, Drizzle/Turso wiring senza tabelle, PWA via Serwist, app shell con bottom nav, CI). Creato e verificato un database Turso reale (`family-sherpa-dev`) e popolato `.env` locale. Aggiornati gli spec 00/02/03 per aggiungere login email/password (oltre a Google) e una allowlist opzionale (`AUTH_ALLOWED_EMAILS`) che limita chi può *creare* una nuova famiglia.
- **Perché**: lo spec richiedeva solo lo scaffold, senza auth né tabelle DB — rispettato lo scope. Il DB Turso è stato creato ora (su richiesta) per non dover rifare questo passaggio nelle prossime sessioni. Le modifiche agli spec 00/02/03 nascono da una preoccupazione concreta dell'utente: un deploy Vercel espone un URL pubblico facilmente scopribile dal repo GitHub, quindi senza un gate esplicito chiunque potrebbe registrarsi e creare la propria famiglia (isolata ma comunque a carico delle chiavi API del proprietario). L'utente inoltre vuole poter condividere l'accesso con la moglie senza obbligarla a un account Google, o meglio ancora farla iscrivere autonomamente e unirsi con l'invite code.
- **Nota**:
  - Il toolchain è cambiato dalla scrittura degli spec originali: Next.js 16 di default usa Turbopack (incompatibile con `@serwist/next`, quindi `dev`/`build` usano `--webpack`), `next lint` è stato rimosso (script `lint` ora chiama `eslint .`), e la CLI shadcn/ui v4 usa preset invece dei vecchi flag `style`/`--base-color`. Dettagli sopra nel Log.
  - La CLI Turso **non ha binario nativo per Windows** (solo Linux/macOS, o WSL che non è installato su questa macchina) — il DB è stato creato tramite la dashboard web (`app.turso.tech`), non da terminale.
  - Nel gitconfig globale esiste già un `includeIf` per-cartella (`Personale/` → `gdimaio9814@gmail.com`, `Aziendale/` → `gdimaio@emilianaimballaggi.it`), verificato funzionante con `git config --show-origin` — nessuna modifica necessaria.
  - Nello spec 03 aggiornato: l'allowlist `AUTH_ALLOWED_EMAILS` blocca solo `createFamily`, **mai** `joinFamily` — chi ha un invite code valido entra sempre, indipendentemente dalla sua email. Questo è il meccanismo pensato per invitare familiari senza doverli aggiungere manualmente a una lista email.
  - Aggiunta `password_hash` (nullable) alla tabella `users` nello spec 02 — un utente Google-only ha quel campo `null` e non può autenticarsi via password (errore generico, non rivela che l'account esiste).
