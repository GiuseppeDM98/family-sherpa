---
spec: 09
title: Medicine cabinet and therapy tracking UI
depends_on: [05, 07]
complexity: medium
---

# 09 — Armadietto farmaceutico e terapie

## Goal

The family's medicine cabinet: add a medicine by photographing its box (Claude vision already extracts `medication` items — spec 05), track expiry dates, and manage therapies with per-dose tick-off. Reminders already fire (spec 07); this spec builds the UI and the expiry deadline bridge.

## Scope

- `/meds` page (linked from `/more` and the dashboard strip): cabinet + therapies.
- Medication CRUD; box-photo add flow reusing the spec 05 pipeline.
- Expiry → deadline bridge (category `farmaco`).
- Therapy CRUD + today's intake tick-off.

**Non-scope:** AIC barcode scanning against AIFA open data (roadmap — the `aic_code` field exists and is filled by vision when readable), stock/quantity decrementing, drug interaction info.

## 1. `/meds` — Armadietto

- Two tabs: **Armadietto** and **Terapie**.
- Armadietto list: card per non-archived medication — name, format, expiry badge (red if expired, amber if ≤60 days: "Scade tra 45 giorni"), AIC when present. Sort: expiring first. Search-as-you-filter input.
- Add flows:
  - **"📷 Fotografa la scatola"**: file input (`capture="environment"`) → submits through the in-app upload path of spec 05 (`channel:'app'`, `content_type:'photo'`) → redirects to the inbox detail for confirm/edit. No new pipeline code — reuse.
  - **"Aggiungi a mano"**: dialog with nome, formato, AIC (9 digits, optional, validated format-only), scadenza, quantità, note (`notes_enc`).
- Edit/archive per medication (archive = `archived=1`, confirm dialog).

### Expiry bridge
- On create/update of a medication with `expiry_date`: upsert the linked `deadlines` row via the `deadlines.medication_id` FK (spec 02): if a pending deadline with this `medication_id` exists, update its `due_date` and title; otherwise insert one (category `farmaco`, title `Scadenza <nome>`, due_date = expiry, no amount, recurrence `none`, `source='manual'`). Clearing the expiry or archiving the medication deletes the pending linked deadline. Keep this logic in `src/lib/meds.ts` (`syncMedicationExpiryDeadline(medication)`), unit-tested. (Reminders then come free from spec 07.)

## 2. Terapie tab

- Active therapies: card with medication name, person (asset) name, dosage_text, schedule chips (`08:00` `20:00`), progress ("giorno 3 di 7"), end date. Actions: pause (`active=0`), edit times, delete (cascades intakes).
- **Oggi**: at the top, today's intakes across therapies as a checklist — time, medication, person; tap → mark `taken` (sets `taken_at`); secondary action "salta" → `skipped`. Late pending intakes (>2h past) show "in ritardo" badge.
- Create therapy manually: dialog with farmaco (free text or select from cabinet), persona (person assets select), posologia text, volte al giorno (1–6 → default times as in spec 05 §6, editable time inputs), data inizio, durata giorni (optional). On save, generate today's intakes immediately if start_date is today (same helper the cron uses — extract `generateIntakesForDate(therapy, ymd)` into `src/lib/reminders/intakes.ts` and refactor the spec 07 cron to use it).
- History: last 7 days adherence strip per therapy (✓ / ✗ / – per scheduled dose).

## Acceptance criteria

1. Photo of a medicine box → inbox confirm → medication appears in the cabinet with extracted name/format (and AIC/expiry when readable on the box).
2. Manual medication with expiry creates the `farmaco` deadline; changing the expiry updates it (no duplicates); spec 07's daily cron would remind at 30/7/1/0 days (verify the deadline row, not the cron).
3. Expiring badge thresholds correct (expired / ≤60 giorni / ok).
4. Creating a therapy starting today generates today's intakes instantly; ticking one sets `taken_at`; the dashboard strip count (spec 08) decreases.
5. Pausing a therapy stops intake generation (next daily cron creates none for it).
6. `generateIntakesForDate` is unit-tested (times mapping, DST-safe via spec 07 time helpers, idempotent on unique index).
7. All queries family-scoped.

## Implementation prompt

```
Read docs/specs/00-overview.md first, then implement
docs/specs/09-medicine-cabinet.md in this repository, following CLAUDE.md.

Reuse the spec 05 in-app upload pipeline for the box-photo flow and refactor
intake generation into src/lib/reminders/intakes.ts shared with the spec 07
cron — do not duplicate that logic. Follow the "Definition of done" in
00-overview.md §9. Commit in logical steps.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how —
including a suggestion of what to photograph (any medicine box), the full
therapy lifecycle to click through, and which DB rows to check.
```
