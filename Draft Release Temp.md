# Release notes — v1.0

FamilySherpa's first release. Everything below ships together as the initial
feature set — there's no prior version to diff against, so it's organized by
product area rather than by change type.

## Onboarding & app shell

- Installable PWA with a mobile bottom navigation bar (desktop gets a side
  rail instead): Home, Scadenze, Inbox, Asset, Altro — the last linking to
  the medicine cabinet and Settings.
- Sign-up and sign-in with email and password.
- Create a new family or join an existing one with an invite code.
- Settings page showing your family's name, a copyable invite code, the
  member list, and a sign-out button.
- Automatic dark mode, following your device's appearance.
- A public landing page for signed-out visitors on self-hosted instances,
  explaining what FamilySherpa is and how it works.

## Telegram bot & capture

- Link a Telegram account from Settings, then send it voice notes, photos,
  PDFs, or text messages.
- AI reads whatever you send — a voice note, a photo of a paper reminder, a
  PagoPA or TARI PDF, a plain message — and turns it into a deadline,
  expense, therapy, or medicine, with the amount, due date, and family
  member or vehicle it belongs to filled in automatically. Voice notes are
  transcribed automatically.
- One-tap confirmation in Telegram: the bot replies with what it understood
  and **✅ Conferma tutto** / **❌ Annulla** buttons, so nothing is saved
  without your say-so. The message updates in place once you decide.
- The Inbox screen mirrors this in-app: what still needs confirming and a
  collapsed history. Open any item to see the original text or voice
  transcription, correct any field — amount, date, category, recurrence,
  which asset it belongs to — remove items you don't want, then confirm or
  reject.
- In-app sending: type a message, attach a photo or PDF, or record a voice
  note directly from the Inbox, without going through Telegram.
- Recognizes Italian bureaucracy: bollo is filed as an annual deadline,
  revisione as biennial, TARI instalments become separate deadlines, and a
  PagoPA notice's codice avviso is kept in the item's notes. "Ho pagato…" is
  filed as an expense, "devo pagare…" as an upcoming deadline.
- Mentioning a vehicle or family member the app hasn't seen yet creates it
  automatically when you confirm the item.
- When a message implies a person without naming them, it defaults to
  whoever sent it, creating them as a family member if needed.
- "Ho pagato la bolletta della luce" closes the matching open deadline and
  logs the real expense, instead of adding a duplicate.
- Therapy scheduling from plain language: "antibiotico a Sofia 2 volte al
  giorno per 5 giorni" becomes a therapy with sensible intake times and the
  right start and end dates.

## Assets & deadlines

- An asset hub: vehicles, family members, the home, and anything else worth
  tracking, each with its own details and notes.
- A codice fiscale field when adding a family member — the birth date fills
  in automatically and is checked for validity as you type; masked by
  default, with a show/hide toggle on the member's page.
- Italian smart defaults for vehicle deadlines: bollo and RCA yearly,
  revisione every two years, suggested from the vehicle's registration date.
- A dedicated Scadenze screen: every upcoming deadline across the family,
  grouped by month, with quick filters for vehicles, home, people, or
  everything else.
- "Segna pagata"/"segna fatta": mark any deadline paid or done in one tap —
  logs the expense and, for recurring deadlines, schedules the next
  occurrence automatically.
- A custom reminder date ("Avvisami il") on any deadline, additive to the
  automatic 30/7/1/0-day schedule.
- A rolling 12-month spending summary on each vehicle and home page.

## Medicine cabinet & therapies

- Armadietto: every medicine in one list, sorted by soonest-expiring, with a
  search box and colour-coded expiry badges. Add one by photographing the
  box — FamilySherpa reads the name, format, and expiry off it — or by hand.
- Terapie: a daily checklist of today's doses ("Fatto"/"Salta"), a card per
  active therapy showing its schedule, day-by-day progress, and the last 7
  days at a glance, plus pausing, adjusting times, or creating one by hand.
- Medicine expiry tracked alongside other deadlines, reminded on the same
  30/7/1/0-day schedule.

## Dashboard & spending

- The Home dashboard: a greeting, your next five upcoming deadlines, a
  today's-medicine strip when a dose is due, and a 12-month cash-flow chart
  that highlights your peak spending month with a plain-language callout
  ("⚠️ A settembre hai 420 € di spese previste tra..."). Tap any month's bar
  to see what's driving it.
- "Costo dei tuoi asset": your last 12 months of spending per vehicle,
  person, or home, tapping through to each asset's full breakdown.
- A "Costi" tab on every asset page: pick "ultimi 12 mesi" or "anno
  corrente", see the total and a breakdown by category, browse every past
  expense, and add one by hand with "Aggiungi spesa".

## Notifications

- Deadline reminders at 30, 7, 1, or 0 days away, and once more the day
  after a deadline lapses — via push notification and, once linked, the same
  reminders as Telegram messages automatically.
- Medicine reminders when a scheduled therapy dose is due, with the
  medicine, the person, and the dosage.
- Per-device push notification management from Settings (or the prompt on
  the Home screen): see your registered devices and remove any you no
  longer use. On iPhone, add the app to your Home Screen first.

## Design & accessibility

- A warm, paper-toned visual design with colour-coded category badges
  (bollo, TARI, medico… each recognisable at a glance).
- A calm, glance-first Home that leads with what's coming due rather than
  stacking edit/delete buttons on every row.
- Screen-reader names on the edit, pause, and delete icon buttons, and
  higher-contrast text for due-soon deadlines and expiring medicines.
- A custom app icon.

## Security & privacy

- Encryption at rest for sensitive personal data (like codice fiscale and
  free-text notes) using AES-256-GCM — the database never stores this
  information in plain text. Notes the AI extracts from your documents are
  encrypted the same way.
- An optional allowlist for self-hosted instances: restrict who can sign up
  or start a new family to a pre-approved list of email addresses.
- Your family's codice fiscale is never sent to the AI provider.

## Documentation

- SETUP.md with full step-by-step environment setup instructions (database,
  Telegram bot, local webhook tunneling, Windows-specific notes).
- Documented the AI provider keys you need to supply: an Anthropic API key
  for parsing, and a Groq key (free tier) for voice transcription — with
  OpenAI as an alternative transcription provider.
- Documented how to schedule the reminder jobs when self-hosting
  (`SETUP.md` §9): Vercel Cron, or the free cron-job.org alternative for
  sub-daily runs, plus the VAPID and CRON_SECRET keys to generate and the
  production environment variables.
- Real screenshots of the app in the README, reflecting the current design.
