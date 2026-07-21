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
- Added the Home dashboard: a greeting, your next five upcoming deadlines, a today's-medicine strip when a dose is due, and a 12-month cash-flow chart that highlights your peak spending month with a plain-language callout ("⚠️ A settembre hai 420 € di spese previste tra..."). Tap any month's bar to see exactly what's driving it.
- Added a "Costo dei tuoi asset" summary on the Home dashboard: your last 12 months of spending per vehicle, person, or home, tap-through to each asset's full breakdown.
- Added a "Costi" tab on every asset page: pick "ultimi 12 mesi" or "anno corrente", see the total and a breakdown by category, browse every past expense, and add one by hand with "Aggiungi spesa".
- Added the medicine cabinet (Armadietto): every medicine in one list, sorted by what's expiring soonest, with a search box and colour-coded expiry badges. Add one by photographing the box — FamilySherpa reads the name, format, and expiry off it — or by hand.
- Added the Terapie screen: a daily checklist of today's doses you can mark "Fatto" or "Salta", a card for each active therapy showing its schedule, day-by-day progress, and the last 7 days at a glance, plus the ability to pause a therapy, adjust its times, or create one by hand instead of through the bot.
- Added expiry tracking for medicines: one nearing its expiry date shows up alongside your other deadlines and gets reminded on the same 30/7/1/0-day schedule.
- Added automatic dark mode: the app now follows your device's light or dark appearance.
- Added a public landing page: opening a self-hosted instance's link while signed out now shows a welcome page explaining what FamilySherpa is and how it works, instead of jumping straight to the sign-in form.
- Added a custom reminder date: pick "Avvisami il" on any deadline (in the app, or by voice/text through the bot) to get an extra reminder on that date, on top of the automatic 30/7/1/0-day schedule.
- Added recognition of who a message is about even when it's not named: "ricordami di prendere la medicina ogni sera" now defaults to whoever sent the message, creating them as a family member if needed.
- Added completing an existing deadline by voice or text: "ho pagato la bolletta della luce" now closes the matching open deadline and logs the real expense, instead of adding a duplicate.

## 🐛 Bug Fixes

- Fixed the "Altro" screen, which showed a misleading "In arrivo…" (coming soon) label above links that already worked.

## 🔧 Improvements

- Refreshed the visual design: warmer paper-toned surfaces, colour-coded category badges (bollo, TARI, medico… each recognisable at a glance), and a calmer, glance-first Home that leads with what's coming due rather than stacking edit/delete buttons on every row.
- Improved accessibility: screen-reader names on the edit, pause and delete icon buttons, and higher-contrast text for due-soon deadlines and expiring medicines.
- Improved the Home screen with a gentle prompt to enable notifications, which disappears once they're on.
- Redesigned the app icon.

## 🔒 Security

- Added encryption at rest for sensitive personal data (like codice fiscale and free-text notes) using AES-256-GCM — the database never stores this information in plain text. Notes the AI extracts from your documents are encrypted the same way.
- Added an optional allowlist for self-hosted instances: restrict who can sign up or start a new family to a pre-approved list of email addresses.
- Your family's codice fiscale is never sent to the AI provider.
- Added a show/hide toggle for codice fiscale on a family member's page — it stays masked by default.

## 📚 Documentation

- Added SETUP.md with full step-by-step environment setup instructions (database, Telegram bot, local webhook tunneling, Windows-specific notes).
- Documented the AI provider keys you need to supply: an Anthropic API key for parsing, and a Groq key (free tier) for voice transcription — with OpenAI as an alternative transcription provider.
- Documented how to schedule the reminder jobs when self-hosting (`SETUP.md` §9): Vercel Cron, or the free cron-job.org alternative for sub-daily runs, plus the VAPID and CRON_SECRET keys to generate and the production environment variables.
- Added real screenshots of the app to the README, refreshed to reflect the redesigned interface.
