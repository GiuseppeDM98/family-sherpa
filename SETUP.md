# Setup guide

Step-by-step environment setup for FamilySherpa, from a fresh clone/fork to a
running dev server with the Telegram bot wired up. Written for anyone forking
the repo — for the project's architecture and conventions, see
[`docs/specs/00-overview.md`](docs/specs/00-overview.md); for day-to-day
tooling gotchas (mostly Windows-specific), see [`AGENTS.md`](AGENTS.md).

## 1. Prerequisites

- **Node.js 20+** (this repo is developed against Node 24; anything 20+ should work).
- **pnpm** — if missing: `npm install -g pnpm` (on Windows, `corepack enable` can fail with an `EPERM`; go straight to the global npm install instead).
- **git**.
- A **Telegram account**, to create a bot via [@BotFather](https://t.me/BotFather) — only needed if you want to test the Telegram channel (spec 04+); auth/family/DB features work without it.

## 2. Clone and install

```bash
git clone <your-fork-url>
cd family-sherpa
pnpm install
```

On **Windows**, pnpm 10+ may block native/postinstall build scripts the first
time (`[ERR_PNPM_IGNORED_BUILDS]`). It auto-writes a `pnpm-workspace.yaml` with
an `allowBuilds` block — set each listed package to `true` (they're
legitimate transitive deps of Next/ESLint/Vitest/drizzle-kit: `sharp`,
`unrs-resolver`, `esbuild`), keep the same names under
`onlyBuiltDependencies`, then re-run `pnpm install`.

## 3. Environment variables

```bash
cp .env.example .env
```

Then fill in `.env`. Each variable, and where it comes from:

| Variable | How to get it |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Leave as `file:local.db` / empty for local dev — no account needed. For a cloud DB (or if testing against production data), create one at [app.turso.tech](https://app.turso.tech) (the `turso` CLI has no native Windows build, use the web dashboard) and copy the connection URL + an auth token. |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local dev; your tunnel's HTTPS URL while testing Telegram (see §6); your real domain in production. |
| `AUTH_SECRET` | `npx auth secret`, or `openssl rand -base64 32` |
| `AUTH_ALLOWED_EMAILS` | Optional. Leave empty for an open instance. Comma-separated emails to restrict who can sign up / create a family on a closed instance. |
| `TELEGRAM_BOT_TOKEN` | From @BotFather — see §5. |
| `TELEGRAM_WEBHOOK_SECRET` | `openssl rand -hex 16` |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | The bot's `@handle` (without the `@`), also from @BotFather. |
| `ANTHROPIC_API_KEY` | **Required.** [console.anthropic.com](https://console.anthropic.com) → Settings → API keys. Bring your own key; parsing is billed per message (a few cents per hundred). |
| `ANTHROPIC_MODEL` | Optional, defaults to `claude-sonnet-5`. |
| `STT_PROVIDER` | Optional, `groq` (default) or `openai`. Only used to transcribe voice notes. |
| `GROQ_API_KEY` | Required when `STT_PROVIDER=groq`. Free tier: [console.groq.com](https://console.groq.com) → API Keys. |
| `OPENAI_API_KEY` | Required only when `STT_PROVIDER=openai` — [platform.openai.com/api-keys](https://platform.openai.com/api-keys). |
| `CRON_SECRET` | `openssl rand -hex 32`. Bearer token protecting the `/api/cron/*` reminder endpoints (§9). |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web-push key pair — generate both at once with `npx web-push generate-vapid-keys`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | The **same value** as `VAPID_PUBLIC_KEY` — the browser needs it to subscribe. |
| `VAPID_SUBJECT` | A contact URI for push services: a `mailto:` address (e.g. `mailto:you@example.com`) or your app's `https://` URL. |

`src/lib/env.ts` validates all of these at startup with Zod — if one is
missing or malformed, every command (`pnpm dev`, `pnpm test`, `pnpm build`,
`pnpm db:seed`, `pnpm telegram:setup`) fails immediately with a message
naming the missing variable.

## 4. Database

```bash
pnpm db:generate   # only needed if you changed src/db/schema.ts — migrations are already committed in drizzle/
pnpm db:migrate
pnpm db:seed       # optional: populates a demo family ("Famiglia Demo") with sample data
```

`pnpm db:studio` opens Drizzle Studio, useful for inspecting rows while testing.

## 5. Run the app

```bash
pnpm dev
```

Open `http://localhost:3000` → you'll be redirected to `/signin`. Sign up
with an email/password, then create a family (or join one with an invite
code, from `/settings`).

## 6. Telegram bot (optional, needed for spec 04+)

### 6.1 Create the bot

Message [@BotFather](https://t.me/BotFather) on Telegram:

1. `/newbot`
2. Pick a display name (e.g. "FamilySherpa Bot", or "FamilySherpa Dev" for a
   separate dev bot — see the note at the end of this section).
3. Pick a unique `@username` ending in `bot` (e.g. `familysherpa_dev_bot`).
4. BotFather replies with a token — this is `TELEGRAM_BOT_TOKEN`. The
   `@username` (without the `@`) is `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.

No further BotFather configuration is needed (group privacy mode doesn't
matter — the bot is only used in private chats).

### 6.2 Expose your local server with a tunnel

Telegram needs to reach your webhook over a public HTTPS URL — `localhost`
won't do. This project standardizes on **cloudflared** — no account needed,
and more reliable than ngrok behind some networks/antivirus setups (see the
troubleshooting note below):

```bash
# Windows: winget install --id Cloudflare.cloudflared
# macOS:   brew install cloudflared
cloudflared tunnel --url http://localhost:3000
```

It prints a random `https://<something>.trycloudflare.com` URL — that's your
tunnel. **This URL changes every time you restart it** (it's an account-less
"quick tunnel") — update `NEXT_PUBLIC_APP_URL` in `.env` and re-run the setup
script (§6.3) whenever it does.

> **If you reach for ngrok instead**: an old build installed via `winget`
> (e.g. 3.3.1) fails with `authentication failed: ... minimum supported agent
> version ...`, or with a CRL / ASN.1 parsing error, on some networks. Fix:
> `ngrok update`. If it still fails with `failed to fetch CRL` / `asn1:
> structure error`, that's almost always TLS interception by security
> software (antivirus HTTPS scanning, a corporate VPN/EDR agent) — cloudflared
> avoids the issue entirely, which is why it's the default here.

### 6.3 Register the webhook

With the dev server (`pnpm dev`) and the tunnel both running, and
`NEXT_PUBLIC_APP_URL` in `.env` set to the tunnel's HTTPS URL:

```bash
pnpm telegram:setup
```

This calls `setWebhook`, `setMyCommands`, and prints `getWebhookInfo` — check
that `url` matches your tunnel and there's no `last_error_message`.

### 6.4 Test it

Message your bot on Telegram:

1. `/start` → greeting + linking instructions.
2. In the app: **Impostazioni → Collega Telegram → Genera codice** (10-minute code).
3. On the bot: `/collega <codice>` → "✅ Account collegato!".
4. Send a voice note, a photo (with caption), a PDF, or plain text → each is
   transcribed if needed, parsed by Claude, and comes back as a summary with
   **[✅ Conferma tutto] [❌ Annulla]** buttons, plus a new row in
   `inbox_messages` (check with `pnpm db:studio`). Confirming writes to
   `deadlines` / `transactions` / `therapies` / `medications`.
5. `/aiuto` for the command list; a file over 10 MB or an unsupported type
   gets an Italian error instead of a row.

Parsing runs inside the webhook request (STT + LLM, ~5–20 s), so the reply
takes a few seconds to arrive — that's expected, not a hang.

### 6.5 One bot, multiple environments

A Telegram bot isn't tied to one family or one database — linking
(`telegram_links`) is per-user, per-environment (whichever DB the running
app points at). You *can* reuse the same bot across dev and production, but
**a bot has only one active webhook at a time**, so switching environments
means re-running `pnpm telegram:setup` against the new `NEXT_PUBLIC_APP_URL`
each time. Simplest to avoid the friction: create **two bots** via
@BotFather — one for local/dev testing, one for production — each with its
own token, webhook, and `.env` values.

## 7. Checks before committing

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four must pass — see `docs/specs/00-overview.md` §9 ("Definition of done").

## 8. Windows-specific gotchas

Covered in detail in [`AGENTS.md`](AGENTS.md): pnpm not preinstalled, no
native Turso CLI (use the web dashboard), `next dev`/`next build` need
`--webpack` (already wired into `package.json`'s scripts) because Serwist
doesn't support Turbopack, and `src/proxy.ts` (not `middleware.ts`) for route
protection. Read it before re-debugging something already solved there.

## 9. Reminders & cron scheduling (spec 07)

The app sends deadline and medicine-dose reminders over **web push** and
**Telegram**, driven by two secret-protected endpoints. *What* triggers them is
your choice — the app assumes no specific scheduler.

| Endpoint | Cadence | Purpose |
|---|---|---|
| `POST/GET /api/cron/daily` | once a day, **07:00 Europe/Rome** | deadline reminders (30/7/1/0 days + "scaduta ieri") and therapy-intake generation |
| `POST/GET /api/cron/therapy` | **every 15 minutes** | dose-time reminders |

Both require `Authorization: Bearer $CRON_SECRET`; without it they return 401 and
do nothing. This bearer is the single auth mechanism.

### Testing push locally

Web push needs a **production build** — the service worker is disabled in
`next dev`. Run `pnpm build && pnpm start`, then Settings → Notifiche → *Attiva le
notifiche* (`localhost` is a secure context, so no HTTPS needed). `pnpm start`
locally also needs `AUTH_TRUST_HOST=true` in `.env` (Auth.js refuses to trust the
Host header in a production build otherwise; on Vercel it's auto-detected).

Trigger a cron by hand (PowerShell):

```powershell
$secret = (Get-Content .env | Select-String '^CRON_SECRET=').ToString().Split('=')[1]
curl.exe -i -H "Authorization: Bearer $secret" http://localhost:3000/api/cron/daily
```

### Scheduling in production

**Vercel Cron (`vercel.json`)** already declares both crons. But the **Hobby
plan runs cron jobs at most once per day**, so the `*/15` therapy cron will not
fire on Hobby (the daily one is fine).

**Free alternative — [cron-job.org](https://cron-job.org)** (works on any plan).
Create a job per endpoint, each with a custom request header
`Authorization: Bearer <your CRON_SECRET>`:

- `https://<your-app>/api/cron/daily` — schedule 07:00, job timezone Europe/Rome.
- `https://<your-app>/api/cron/therapy` — every 15 minutes.

On **Vercel Pro** the `vercel.json` crons run natively and you can drop
cron-job.org.

### Production environment variables (Vercel)

Set every variable from §3 in the Vercel dashboard (Project → Settings →
Environment Variables, **Production** scope), with these differences:

- `NEXT_PUBLIC_APP_URL` → your real domain (e.g. `https://familysherpa.vercel.app`).
- `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` → your cloud Turso DB, not `file:`.
- `NEXT_PUBLIC_*` are inlined at **build** time — after adding or changing one,
  **redeploy**.
- `AUTH_TRUST_HOST` is **not** needed on Vercel (auto-detected).
- If you name the cron bearer exactly `CRON_SECRET`, Vercel Cron sends it as the
  `Authorization` header automatically.
