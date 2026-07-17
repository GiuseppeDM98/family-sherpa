/**
 * The domain's fixed vocabularies (spec 02 §2).
 *
 * These live apart from `schema.ts` — which re-exports them, so it stays the
 * one place to look — because client components need them (a category select, a
 * recurrence select) and `schema.ts` imports `node:crypto` for invite-code
 * generation. Importing an enum from `schema.ts` in a `"use client"` file drags
 * `node:crypto` into the browser bundle and fails the webpack build with
 * `UnhandledSchemeError`.
 */

export const FAMILY_MEMBER_ROLES = ["admin", "member"] as const;
export const ASSET_TYPES = ["vehicle", "person", "home", "other"] as const;

// Asset metadata vocabularies (spec 06 §2 — src/lib/asset-metadata.ts owns
// the Zod shapes, re-exporting these). Kept here, not there, because
// asset-metadata.ts's schemas are for server-side validation while these
// plain arrays also back client-side <select> options (asset-form-dialog.tsx).
export const VEHICLE_FUELS = ["benzina", "diesel", "gpl", "metano", "elettrica", "ibrida"] as const;
export const PERSON_RELATIONSHIPS = ["adulto", "bambino", "altro"] as const;
export const HOME_OWNERSHIPS = ["proprietà", "affitto"] as const;
export const DEADLINE_CATEGORIES = [
  "bollo",
  "revisione",
  "rca",
  "tagliando",
  "documento",
  "bolletta",
  "condominio",
  "tari",
  "medico",
  "farmaco",
  "abbonamento",
  "altro",
] as const;
export const RECURRENCES = [
  "none",
  "monthly",
  "bimonthly",
  "quarterly",
  "semiannual",
  "annual",
  "biennial",
] as const;
export const DEADLINE_STATUSES = ["pending", "paid", "done", "skipped"] as const;
export const DEADLINE_SOURCES = ["manual", "parser"] as const;
export const TRANSACTION_SOURCES = ["manual", "parser", "deadline"] as const;
export const INBOX_CHANNELS = ["telegram", "app"] as const;
export const INBOX_CONTENT_TYPES = ["voice", "photo", "document", "text"] as const;
export const INBOX_STATUSES = [
  "received",
  "parsed",
  "confirmed",
  "rejected",
  "failed",
] as const;
export const THERAPY_INTAKE_STATUSES = ["pending", "taken", "skipped"] as const;
export const NOTIFICATION_KINDS = [
  "deadline_reminder",
  "therapy_reminder",
  "deadline_digest",
] as const;
export const NOTIFICATION_CHANNELS = ["push", "telegram"] as const;
