---
spec: 02
title: Database schema, field encryption, migrations, seed
depends_on: [01]
complexity: medium
---

# 02 — Database schema, field encryption, migrations, seed

## Goal

The complete Drizzle schema for the MVP (all specs 03–09 build on it, so column names here are canonical), the field-encryption helper, generated migrations, and a development seed script.

## Scope

- `src/db/schema.ts` — every table below.
- `src/lib/crypto.ts` — AES-256-GCM field encryption.
- Drizzle migrations generated and committed; `pnpm db:migrate` works on the local file DB.
- `src/db/seed.ts` dev seed + `pnpm db:seed` script.

**Non-scope:** queries/server actions (owned by feature specs), Auth.js runtime config (spec 03 — but its tables are defined here).

## 1. Field encryption — `src/lib/crypto.ts`

- Algorithm: **AES-256-GCM** via Node `crypto`. Key: `ENCRYPTION_KEY` env var, 32 bytes base64 (add to `.env.example` with a comment: generate with `openssl rand -base64 32`; add to `src/lib/env.ts`).
- API:
  ```ts
  export function encryptField(plaintext: string): string  // → "enc:v1:<iv_b64>:<ciphertext_b64>:<tag_b64>"
  export function decryptField(value: string): string      // accepts only "enc:v1:..." strings, throws EncryptionError otherwise
  export function isEncrypted(value: string): boolean
  ```
- Random 12-byte IV per encryption. The `v1` version segment exists for future key rotation.
- Unit tests: roundtrip, tampered ciphertext throws, wrong-format input throws, empty string roundtrip.
- Convention (from 00-overview §6): DB columns holding encrypted values end in `_enc`; only this module touches the raw key.

## 2. Schema — `src/db/schema.ts`

All tables use `text` UUID PKs (default `crypto.randomUUID()` via `$defaultFn`), `created_at`/`updated_at` as ISO text timestamps (`$defaultFn(() => new Date().toISOString())`; `updated_at` also `$onUpdateFn`). Use `text({ enum: [...] })` for enums. Add the indexes listed. Export inferred types (`export type Asset = typeof assets.$inferSelect` etc.) and the enum value arrays (e.g. `export const DEADLINE_CATEGORIES = [...] as const`) for reuse.

### Auth.js tables (per official Drizzle adapter shape)

- `users`: `id`, `name`, `email` (unique), `email_verified` (timestamp), `image`.
- `accounts`: standard Auth.js Drizzle adapter columns (provider, provider_account_id PK composite, tokens…).
- (JWT session strategy → **no** `sessions` table; no `verification_tokens` since we only use OAuth.)

### Domain tables

**families** — `id`, `name`, `invite_code` (unique, 8 uppercase alphanumeric, generated), `created_at`.

**family_members** — `id`, `family_id` FK→families, `user_id` FK→users, `role` enum `['admin','member']`, `created_at`. Unique index on (`family_id`,`user_id`); index on `user_id`. MVP rule: one family per user (enforce with a unique index on `user_id`).

**assets** — `id`, `family_id` FK, `type` enum `['vehicle','person','home','other']`, `name` (e.g. "Panda di Giulia", "Sofia", "Casa"), `metadata` (JSON text, see shapes below), `codice_fiscale_enc` (nullable — persons only), `notes_enc` (nullable), `archived` (integer boolean, default 0), timestamps. Index on `family_id`.

`metadata` JSON shapes (validated by Zod schemas exported from `src/lib/asset-metadata.ts`, discriminated by asset `type`):
- vehicle: `{ plate?, make?, model?, year?, fuel?: 'benzina'|'diesel'|'gpl'|'metano'|'elettrica'|'ibrida', matriculation_date? /* YYYY-MM-DD, drives revisione default */ }`
- person: `{ birth_date? /* YYYY-MM-DD */, relationship?: 'adulto'|'bambino'|'altro' }`
- home: `{ address?, ownership?: 'proprietà'|'affitto' }`
- other: `{}` (free)

**deadlines** — `id`, `family_id` FK, `asset_id` (nullable FK→assets, `onDelete: 'set null'`), `category` enum: `['bollo','revisione','rca','tagliando','documento','bolletta','condominio','tari','medico','farmaco','abbonamento','altro']`, `title`, `due_date` (`YYYY-MM-DD`), `amount_cents` (integer, nullable), `recurrence` enum `['none','monthly','bimonthly','quarterly','semiannual','annual','biennial']` default `'none'`, `status` enum `['pending','paid','done','skipped']` default `'pending'` (`paid` = money involved, `done` = no money, e.g. a visit), `source` enum `['manual','parser']`, `source_message_id` (nullable FK→inbox_messages), `medication_id` (nullable FK→medications, `onDelete: 'set null'` — used by spec 09 to link a medicine's expiry deadline), `notes_enc` (nullable), timestamps. Indexes: (`family_id`,`due_date`), (`family_id`,`status`).

**transactions** — `id`, `family_id` FK, `asset_id` (nullable FK, `set null`), `deadline_id` (nullable FK→deadlines, `set null`), `category` (same enum as deadlines), `title`, `date` (`YYYY-MM-DD`), `amount_cents` (integer, **required**), `source` enum `['manual','parser','deadline']`, timestamps. Indexes: (`family_id`,`date`), `asset_id`.

**inbox_messages** — `id`, `family_id` FK, `user_id` FK, `channel` enum `['telegram','app']`, `content_type` enum `['voice','photo','document','text']`, `raw_text` (nullable — original text message or caption), `transcription` (nullable — STT output), `telegram_file_id` (nullable), `parse_result` (nullable JSON text — the validated LLM output, shape owned by spec 05), `parse_error` (nullable), `status` enum `['received','parsed','confirmed','rejected','failed']` default `'received'`, `telegram_chat_id` (nullable — where to send the confirmation), `telegram_confirmation_message_id` (nullable — to edit the message after button press), timestamps. Index: (`family_id`,`status`).

**medications** — `id`, `family_id` FK, `name`, `aic_code` (nullable), `format` (nullable, e.g. "20 compresse 500 mg"), `expiry_date` (nullable `YYYY-MM-DD`), `quantity` (nullable text, e.g. "1 scatola"), `notes_enc` (nullable), `archived` (integer boolean default 0), timestamps. Index `family_id`.

**therapies** — `id`, `family_id` FK, `person_asset_id` (nullable FK→assets, `set null`), `medication_id` (nullable FK→medications, `set null`), `medication_name` (required — denormalized so a therapy works without a cabinet entry), `dosage_text` (original Italian instruction, e.g. "1 misurino ogni 12 ore"), `times_per_day` (integer), `times` (JSON text array of `HH:MM` in Europe/Rome, e.g. `["08:00","20:00"]`), `start_date`, `end_date` (nullable `YYYY-MM-DD`), `active` (integer boolean default 1), `source_message_id` (nullable FK→inbox_messages), timestamps. Index (`family_id`,`active`).

**therapy_intakes** — `id`, `therapy_id` FK (`onDelete: 'cascade'`), `scheduled_at` (ISO UTC timestamp), `status` enum `['pending','taken','skipped']` default `'pending'`, `taken_at` (nullable timestamp), `created_at`. Unique index (`therapy_id`,`scheduled_at`); index (`status`,`scheduled_at`).

**telegram_links** — `id`, `user_id` FK (unique), `telegram_chat_id` (text, unique), `telegram_username` (nullable), `created_at`.

**telegram_link_codes** — `id`, `code` (6 digits, unique), `user_id` FK, `expires_at` (timestamp), `used` (integer boolean default 0), `created_at`.

**push_subscriptions** — `id`, `user_id` FK, `endpoint` (text, unique), `p256dh`, `auth`, `user_agent` (nullable), `created_at`.

**notifications_log** — `id`, `family_id` FK, `user_id` (nullable FK), `kind` enum `['deadline_reminder','therapy_reminder','deadline_digest']`, `ref_id` (text — deadline id or intake id), `dedupe_key` (text, unique — e.g. `deadline:<id>:offset:7:user:<uid>`), `channel` enum `['push','telegram']`, `sent_at`. Index `dedupe_key` (unique).

## 3. Migrations & seed

- `pnpm db:generate` → commit the `drizzle/` output; `pnpm db:migrate` applies to `file:local.db`.
- `src/db/seed.ts` (run with `tsx`, add dev-dep; script `"db:seed": "tsx src/db/seed.ts"`): idempotent (wipe-and-recreate a family named "Famiglia Demo"), creating: 1 user (`demo@familysherpa.dev`), 1 family, 3 assets (vehicle "Panda" with plate + matriculation date, person "Sofia" with birth date and **encrypted** fake CF, home "Casa"), ~8 deadlines spread over the next 12 months across categories (bollo, RCA, revisione, TARI ×2, bolletta recurring bimonthly, documento, medico) with realistic amounts, ~10 past transactions linked to the vehicle and home (for TCO/dashboard testing), 2 medications (one expiring soon), 1 active therapy (2 times/day, 7 days) with intakes for yesterday/today/tomorrow.
- Seed must use `encryptField` for `_enc` columns and print a summary table of created rows.

## Acceptance criteria

1. `pnpm db:generate && pnpm db:migrate` runs clean on a fresh `local.db`; migrations are committed.
2. `pnpm db:seed` is idempotent (running twice leaves one demo family) and prints the summary.
3. Crypto unit tests pass (`pnpm test`); a seeded CF value in the DB starts with `enc:v1:` (verify via `pnpm db:studio` or a sqlite query).
4. `typecheck` passes; all exported inferred types and enum arrays compile.
5. No feature spec concept is missing: cross-check each table/column referenced by specs 03–09 exists here (the implementing session should grep the specs for table names as a sanity pass).

## Implementation prompt

> **Run with:** Sonnet 5 (`claude-sonnet-5`), reasoning effort **high** — set via `/model` before pasting. (The schema is canonical for the whole project: precision over speed.)

```
Read docs/specs/00-overview.md first, then implement docs/specs/02-database-schema.md
in this repository, following CLAUDE.md.

The column and table names in this spec are canonical for the whole project —
implement them exactly as written; if something seems wrong or missing, stop
and ask before renaming. Follow the "Definition of done" in 00-overview.md §9.
Commit in logical steps with conventional commit messages.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how
(commands to run, what to look for in db:studio / seed output), plus any
external setup I must do myself.
```
