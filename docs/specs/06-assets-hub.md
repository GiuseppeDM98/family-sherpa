---
spec: 06
title: Assets hub and deadlines UI
depends_on: [02, 03, 05]
complexity: medium-high
---

# 06 — Hub "I tuoi asset" e gestione scadenze

## Goal

The manual side of the product: browse and manage assets (vehicles, people, home), see each asset's deadline timeline, create/edit/complete deadlines by hand, with Italian smart defaults. Also the global **Scadenze** list.

## Scope

- `/assets` list + `/assets/[id]` detail + create/edit forms per asset type.
- Codice fiscale utility (`src/lib/cf.ts`): birth-date prefill.
- `/deadlines` global list; deadline create/edit/complete flows (server actions shared with asset detail).
- "Mark as paid/done" flow → transaction creation + recurrence roll-over (implemented here in `src/lib/reminders/recurrence.ts`, reused by spec 07).

**Non-scope:** notifications/cron (07), charts (08), medications UI (09).

## 1. Codice fiscale — `src/lib/cf.ts`

```ts
export function decodeCodiceFiscale(cf: string): { birthDate: string; sex: 'M'|'F' } | null
export function isValidCodiceFiscale(cf: string): boolean  // format + check character
```
- Standard CF algorithm: chars 7–8 birth year (century inferred: >current 2-digit year → 1900s), 9 month letter (`ABCDEHLMPRST`), 10–11 day (day > 40 → female, subtract 40). Implement the official odd/even check-character table for validation.
- **Important honesty rule (from the project note review):** the CF does *not* contain document expiry dates — it only prefills birth date. Do not fake more.
- Unit tests with a few synthetic CFs (valid male, valid female, bad check char, malformed).

## 2. Assets UI

### `/assets` (replaces spec 01 placeholder)
- Sections by type with Italian headers: 🚗 Veicoli, 👤 Persone, 🏠 Casa, 📦 Altro. Card per asset: name, key metadata line (plate / birth date / address), badge with count of pending deadlines (red if any overdue). FAB / "Aggiungi asset" → type picker → form.

### Create/edit forms (dialog or page, one per type; fields from spec 02 metadata shapes)
- **Vehicle**: nome, targa (uppercase, regex `^[A-Z]{2}\d{3}[A-Z]{2}$` with non-blocking warning if unmatched), marca, modello, anno, alimentazione, data immatricolazione.
- **Person**: nome, codice fiscale (optional — on valid CF, prefill data di nascita via `decodeCodiceFiscale`; store CF with `encryptField` into `codice_fiscale_enc`), data di nascita, relazione (adulto/bambino/altro).
- **Home**: nome (default "Casa"), indirizzo, proprietà/affitto.
- **Other**: nome, note.
- All forms: notes field → `notes_enc`. Server actions with Zod validation and `requireFamily()` scoping. Delete = archive (`archived=1`) with confirm dialog; archived assets hidden everywhere (deadlines keep `asset_id`).

### `/assets/[id]` detail
- Header: name, metadata, edit/archive actions. For persons showing CF: decrypt server-side, display masked (`RSSMRA…`) with a "mostra" toggle.
- **Timeline scadenze**: pending deadlines ascending by due date (overdue highlighted red, ≤30 days amber), then collapsed "Completate". Row: category chip, title, due date (relative + absolute), amount, recurrence icon; actions: ✅ segna pagata/fatta, ✏️ modifica, 🗑️ elimina.
- "Aggiungi scadenza" prefilled with the asset. **Smart defaults per vehicle category** (suggest, never force): bollo → recurrence annual; revisione → biennial and, if `matriculation_date` set and no revisione exists, suggest due date = matriculation + 4 years; rca → annual; tagliando → none.
- Small **TCO teaser**: "Spese ultimi 12 mesi: €X" (sum of the asset's transactions; links to spec 08 dashboard — render the number now, it's one query).

## 3. Deadlines

### `/deadlines` (replaces placeholder)
- All family pending deadlines grouped by month ("Luglio 2026", …), same row component as the asset timeline, plus asset name. Filter chips by category type group: Tutte / Veicoli / Casa / Persone / Altro. Empty state with CTA to the bot ("Inoltra un avviso al bot Telegram o aggiungi a mano").
- "Aggiungi scadenza" form: titolo, categoria, asset (optional select), data, importo (€ → cents), ricorrenza, note.

### Completion + recurrence — `src/lib/reminders/recurrence.ts`
```ts
export function nextDueDate(dueDate: string, recurrence: Recurrence): string | null
export async function completeDeadline(deadlineId: string, opts: { paid: boolean; actualAmountCents?: number; date?: string }): Promise<void>
```
- `nextDueDate`: add 1/2/3/6/12/24 months (monthly…biennial) with end-of-month clamping (e.g. 31 gen + 1 mese → 28/29 feb); `none` → null. **Unit-test the month math thoroughly** (month-end, February, year wrap).
- `completeDeadline` (transaction): set status `paid`/`done`; if `paid` and an amount exists (`actualAmountCents` overrides), insert a `transactions` row (`source='deadline'`, copy category/title/asset, date = today or `opts.date`); if recurrence ≠ none, insert the next pending deadline (same fields, `due_date = nextDueDate(...)`, same recurrence).
- UI "segna pagata" opens a small dialog: importo effettivo (prefilled), data pagamento (default oggi) → calls `completeDeadline`. Toast confirms and mentions the next occurrence when one was created ("Prossima scadenza creata per il 31/01/2027").

## Acceptance criteria

1. CRUD for all four asset types works; person CF is stored encrypted (starts with `enc:v1:` in DB), prefills birth date when valid, shows masked in UI with reveal toggle.
2. `decodeCodiceFiscale` unit tests pass (male/female/invalid cases); invalid CF in the form shows an Italian warning but can be bypassed only by clearing the field (invalid CF is never saved).
3. Vehicle detail suggests bollo=annual / revisione=biennial defaults; revisione suggestion uses matriculation + 4 years on a fresh vehicle.
4. Marking a seeded annual deadline as paid creates the transaction and the next-year deadline; month-end clamping unit tests pass.
5. `/deadlines` groups by month, filters work, overdue items are visually distinct.
6. Archiving an asset hides it from lists but its historic deadlines/transactions remain queryable (no FK errors).
7. Every server action is family-scoped (attempting to access another family's asset id returns not-found, verifiable with two accounts from spec 03 testing).

## Implementation prompt

> **Run with:** Sonnet 5 (`claude-sonnet-5`), reasoning effort **high** — set via `/model` before pasting. (CF check-character algorithm and month-end recurrence math must be exact.)

```
Read docs/specs/00-overview.md first, then implement docs/specs/06-assets-hub.md
in this repository, following CLAUDE.md.

Reuse tables and enums from spec 02 exactly; put recurrence logic in
src/lib/reminders/recurrence.ts with the exact exported signatures (spec 07
depends on them). Follow the "Definition of done" in 00-overview.md §9.
Commit in logical steps.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how —
a click-path checklist through asset creation (all 4 types, including a CF to
try), deadline creation with smart defaults, and the mark-as-paid → recurrence
roll-over flow, with the expected UI results and DB effects.
```
