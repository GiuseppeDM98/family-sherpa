# Draft release notes

Unreleased changes — kept up to date session by session, published at cut time.

## ✨ New Features

- Added the initial installable Progressive Web App shell, with a mobile bottom navigation bar (desktop gets a side rail instead): Home, Scadenze, Inbox, Asset, Altro — the last linking through to placeholder Medicine Cabinet and Settings screens.
- Added sign-up and sign-in with email and password.
- Added the ability to create a new family or join an existing one with an invite code.
- Added a settings page showing your family's name, a copyable invite code, the member list, and a sign-out button.
- Added Telegram bot integration: link your account from Settings, then send it voice notes, photos, PDFs, or text messages.
- Added AI understanding of everything you send: a voice note, a photo of a paper reminder, a PagoPA or TARI PDF, or a plain message is read and turned into deadlines, expenses, therapies, and medicines — with the amount, the due date, and the family member or vehicle it belongs to filled in for you. Voice notes are transcribed automatically.
- Added one-tap confirmation in Telegram: the bot replies with what it understood and **✅ Conferma tutto** / **❌ Annulla** buttons, so nothing is saved without your say-so. The message updates in place once you decide.
- Added the Inbox screen: everything you sent, split into what still needs confirming and a collapsed history. Open any item to see the original text or voice transcription, correct any field — amount, date, category, recurrence, which asset it belongs to — remove items you don't want, then confirm or reject.
- Added in-app sending: type a message, attach a photo or PDF, or record a voice note directly from the Inbox, without going through Telegram.
- Added automatic recognition of Italian bureaucracy: bollo is recognised as an annual deadline, revisione as biennial, TARI instalments become separate deadlines, and a PagoPA notice's codice avviso is kept in the item's notes. "Ho pagato…" is filed as an expense, "devo pagare…" as an upcoming deadline.
- Added automatic creation of assets the app doesn't know yet: mention a vehicle or a family member it has never seen, and confirming the item creates it for you.
- Added therapy scheduling from plain language: "antibiotico a Sofia 2 volte al giorno per 5 giorni" becomes a therapy with sensible intake times and the right start and end dates.
- Added the asset hub: add and manage your vehicles, family members, home, and anything else worth tracking, each with its own details and notes.
- Added a codice fiscale field when adding a family member — the birth date is filled in automatically and checked for validity as you type.
- Added Italian smart defaults when adding a vehicle deadline: bollo and RCA default to yearly, revisione to every two years — and for a newly added vehicle, revisione even suggests the right due date from its registration date.
- Added a dedicated Scadenze screen: every upcoming deadline across the family, grouped by month, with quick filters for vehicles, home, people, or everything else.
- Added "segna pagata"/"segna fatta": mark any deadline as paid or done in one tap. It logs the expense and, for recurring deadlines like bollo or RCA, automatically schedules the next occurrence for you.
- Added a rolling 12-month spending summary on each vehicle and home page.
- Added deadline reminders: FamilySherpa now notifies you when a deadline is 30, 7, 1, or 0 days away — and once more the day after it lapses — so nothing slips by. Each reminder shows the title, the asset it belongs to, the amount, and the due date.
- Added medicine reminders: when a scheduled therapy dose is due, you get a notification with the medicine, the person, and the dosage.
- Added push notifications: turn them on per device from Settings (or the prompt on the Home screen), see your registered devices, and remove any you no longer use. On iPhone, add the app to your Home Screen first, then enable them.
- Added automatic Telegram reminders: once your account is linked, the same reminders also arrive as messages from the bot — no extra setup.

## 🔧 Improvements

- Improved the Home screen with a gentle prompt to enable notifications, which disappears once they're on.

## 🔒 Security

- Added encryption at rest for sensitive personal data (like codice fiscale and free-text notes) using AES-256-GCM — the database never stores this information in plain text. Notes the AI extracts from your documents are encrypted the same way.
- Added an optional allowlist for self-hosted instances: restrict who can sign up or start a new family to a pre-approved list of email addresses.
- Your family's codice fiscale is never sent to the AI provider.
- Added a show/hide toggle for codice fiscale on a family member's page — it stays masked by default.

## 📚 Documentation

- Added SETUP.md with full step-by-step environment setup instructions (database, Telegram bot, local webhook tunneling, Windows-specific notes).
- Documented the AI provider keys you need to supply: an Anthropic API key for parsing, and a Groq key (free tier) for voice transcription — with OpenAI as an alternative transcription provider.
- Documented how to schedule the reminder jobs when self-hosting (`docs/CRON_SETUP.md`): Vercel Cron, or the free cron-job.org alternative for sub-daily runs, plus the VAPID and CRON_SECRET keys to generate.
