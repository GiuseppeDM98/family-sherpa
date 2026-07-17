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

## 🔒 Security

- Added encryption at rest for sensitive personal data (like codice fiscale and free-text notes) using AES-256-GCM — the database never stores this information in plain text. Notes the AI extracts from your documents are encrypted the same way.
- Added an optional allowlist for self-hosted instances: restrict who can sign up or start a new family to a pre-approved list of email addresses.
- Your family's codice fiscale is never sent to the AI provider.

## 📚 Documentation

- Added SETUP.md with full step-by-step environment setup instructions (database, Telegram bot, local webhook tunneling, Windows-specific notes).
- Documented the AI provider keys you need to supply: an Anthropic API key for parsing, and a Groq key (free tier) for voice transcription — with OpenAI as an alternative transcription provider.
