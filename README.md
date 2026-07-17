# 🏔️ FamilySherpa

**The open-source AI assistant that carries your family's mental load.**

Italian families juggle an absurd amount of recurring bureaucracy: bollo auto, revisione, RCA, TARI, PagoPA notices, ID card renewals, utility bills, pediatrician appointments, antibiotic schedules. FamilySherpa makes tracking all of it *passive*: you forward a voice note, a photo, or a PDF to a Telegram bot (or upload it in the app), and the AI extracts what it is, when it's due, how much it costs, and which family asset it belongs to. You tap **Conferma** and forget about it — the app remembers for you.

> ⚠️ **Work in progress.** The app scaffold, database schema/encryption/seed layer, authentication + family onboarding, the Telegram inbound channel, the AI parsing pipeline, and the asset/deadline hub ([specs 01–06](docs/specs/)) are implemented. **The core loop works end to end**: send the bot a voice note, a photo, a PDF or a text message, and it comes back with what it understood plus one-tap confirm/cancel buttons; confirming writes real deadlines, expenses, therapies and medicines, which you can review and correct from the in-app Inbox, or manage by hand from the Asset and Scadenze screens (create/edit/archive assets, add deadlines with Italian smart defaults, mark them paid with automatic recurrence roll-over). What's still spec-only: reminders and notifications (07), the expense dashboard (08), and the medicine cabinet (09) — the Home screen is still a placeholder. The full architecture and implementation specs live in [`docs/specs/`](docs/specs/) — start with [`00-overview.md`](docs/specs/00-overview.md).

## Getting started

```
pnpm install
cp .env.example .env
# fill in .env — see SETUP.md for what each variable is and how to get it
pnpm db:generate && pnpm db:migrate
pnpm db:seed      # optional: populates a demo family with sample data
pnpm dev
```

Open `http://localhost:3000` — you'll be redirected to sign in. Sign up with an email/password, then create a family (or join one with an invite code from `/settings`). `pnpm build && pnpm start` produces the installable production build.

Every variable in `.env.example` is validated at startup, so a missing one fails fast with its name. Two are new and easy to miss: **`ANTHROPIC_API_KEY`** (bring your own key — parsing is billed per message) and **`GROQ_API_KEY`** (free tier, transcribes voice notes; set `STT_PROVIDER=openai` + `OPENAI_API_KEY` to use OpenAI instead).

**Full step-by-step setup** (env vars, Turso, Telegram bot + tunnel, Windows gotchas) is in [`SETUP.md`](SETUP.md).

## MVP features

- **Inbound + AI parser** ✅ *working* — voice/photo/PDF/text via Telegram or in-app upload → Claude extracts deadlines, amounts, and asset associations → one-tap confirmation. Prompted specifically for Italian bureaucracy: bollo → annual, revisione → biennial, TARI instalments → separate deadlines, PagoPA codice avviso kept in the notes.
- **Asset hub** ✅ *working* — vehicles, people, home, and anything else, each with its own deadline timeline (bollo, revisione, RCA, documents, bills) and smart Italian recurrence defaults (bollo/RCA yearly, revisione every two years). Mark a deadline paid or done in one tap — it logs the expense and schedules the next occurrence for recurring ones.
- **Expense dashboard** — predictive cash flow ("September: €800 between TARI and insurance") and per-asset total cost of ownership.
- **Medicine cabinet** — photo of a medicine box → recognized and tracked with expiry; "antibiotico bimba 2 volte al giorno per una settimana" → scheduled reminders.

## Stack

Next.js 16 (PWA) · Turso + Drizzle · Auth.js (email/password) · Claude API (BYOK) · Groq Whisper for speech-to-text · Telegram Bot API · deployed on Vercel.

Privacy: sensitive fields (codice fiscale, free-text medical notes) are encrypted at rest with an app-level key — the database is blind. Codice fiscale is never sent to the AI provider, and media (voice/photo/PDF) is processed in memory and never stored.

## License

[AGPL-3.0](LICENSE) — you can use, modify and self-host FamilySherpa freely; if you distribute a modified version or offer it as a network service, you must publish your source code under the same license.
