# 🏔️ FamilySherpa

**The open-source AI assistant that carries your family's mental load.**

Italian families juggle an absurd amount of recurring bureaucracy: bollo auto, revisione, RCA, TARI, PagoPA notices, ID card renewals, utility bills, pediatrician appointments, antibiotic schedules. FamilySherpa makes tracking all of it *passive*: you forward a voice note, a photo, or a PDF to a Telegram bot (or upload it in the app), and the AI extracts what it is, when it's due, how much it costs, and which family asset it belongs to. You tap **Conferma** and forget about it — the app remembers for you.

> ⚠️ **Work in progress.** The project is currently in the specification phase. The full architecture and implementation specs live in [`docs/specs/`](docs/specs/) — start with [`00-overview.md`](docs/specs/00-overview.md).

## Planned MVP features

- **Inbound + AI parser** — voice/photo/PDF via Telegram or in-app upload → Claude extracts deadlines, amounts, and asset associations → one-tap confirmation.
- **Asset hub** — vehicles, people, home. Each asset has its deadline timeline (bollo, revisione, RCA, documents, bills) with smart Italian recurrence defaults.
- **Expense dashboard** — predictive cash flow ("September: €800 between TARI and insurance") and per-asset total cost of ownership.
- **Medicine cabinet** — photo of a medicine box → recognized and tracked with expiry; "antibiotico bimba 2 volte al giorno per una settimana" → scheduled reminders.

## Stack

Next.js 15 (PWA) · Turso + Drizzle · Auth.js · Claude API (BYOK) · Telegram Bot API · deployed on Vercel.

Privacy: sensitive fields (codice fiscale, free-text medical notes) are encrypted at rest with an app-level key — the database is blind.

## License

[AGPL-3.0](LICENSE) — you can use, modify and self-host FamilySherpa freely; if you distribute a modified version or offer it as a network service, you must publish your source code under the same license.
