import { randomInt } from "node:crypto";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import {
  ASSET_TYPES,
  DEADLINE_CATEGORIES,
  DEADLINE_SOURCES,
  DEADLINE_STATUSES,
  FAMILY_MEMBER_ROLES,
  INBOX_CHANNELS,
  INBOX_CONTENT_TYPES,
  INBOX_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_KINDS,
  RECURRENCES,
  THERAPY_INTAKE_STATUSES,
  TRANSACTION_SOURCES,
} from "./enums";

// ---------------------------------------------------------------------------
// Shared column builders
//
// Every table uses a text UUID primary key and ISO-8601 UTC text timestamps.
// These return a *new* column builder on each call — reusing a single
// builder instance across tables is unsafe in Drizzle.
// ---------------------------------------------------------------------------

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString());

const updatedAt = () =>
  text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString())
    .$onUpdateFn(() => new Date().toISOString());

const INVITE_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** 8-char uppercase alphanumeric invite code (families.invite_code default). */
function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += INVITE_CODE_CHARS.charAt(randomInt(INVITE_CODE_CHARS.length));
  }
  return code;
}

// ---------------------------------------------------------------------------
// Enums — defined in ./enums (importable from client components, which this
// file is not: it pulls in node:crypto) and re-exported here so `@/db/schema`
// remains the single import for schema consumers.
// ---------------------------------------------------------------------------

export {
  ASSET_TYPES,
  DEADLINE_CATEGORIES,
  DEADLINE_SOURCES,
  DEADLINE_STATUSES,
  FAMILY_MEMBER_ROLES,
  INBOX_CHANNELS,
  INBOX_CONTENT_TYPES,
  INBOX_STATUSES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_KINDS,
  RECURRENCES,
  THERAPY_INTAKE_STATUSES,
  TRANSACTION_SOURCES,
} from "./enums";

// ---------------------------------------------------------------------------
// Auth.js tables (per official Drizzle adapter shape).
// `accounts` is unused by the Credentials provider; it authenticates directly
// against users.password_hash with no accounts row.
// ---------------------------------------------------------------------------

export const users = sqliteTable("users", {
  id: id(),
  name: text("name"),
  email: text("email").notNull().unique(),
  email_verified: integer("email_verified", { mode: "timestamp_ms" }),
  image: text("image"),
  password_hash: text("password_hash"),
});

export const accounts = sqliteTable(
  "accounts",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    provider_account_id: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.provider_account_id] }),
    index("accounts_user_id_idx").on(table.user_id),
  ],
);

// ---------------------------------------------------------------------------
// Domain tables
// ---------------------------------------------------------------------------

export const families = sqliteTable("families", {
  id: id(),
  name: text("name").notNull(),
  invite_code: text("invite_code")
    .notNull()
    .unique()
    .$defaultFn(() => generateInviteCode()),
  created_at: createdAt(),
});

export const familyMembers = sqliteTable(
  "family_members",
  {
    id: id(),
    family_id: text("family_id")
      .notNull()
      .references(() => families.id),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role", { enum: FAMILY_MEMBER_ROLES }).notNull(),
    created_at: createdAt(),
  },
  (table) => [
    uniqueIndex("family_members_family_id_user_id_idx").on(
      table.family_id,
      table.user_id,
    ),
    // MVP rule: one family per user.
    uniqueIndex("family_members_user_id_idx").on(table.user_id),
  ],
);

export const assets = sqliteTable(
  "assets",
  {
    id: id(),
    family_id: text("family_id")
      .notNull()
      .references(() => families.id),
    type: text("type", { enum: ASSET_TYPES }).notNull(),
    name: text("name").notNull(),
    // Shape validated at the app layer by src/lib/asset-metadata.ts, discriminated by `type`.
    metadata: text("metadata", { mode: "json" })
      .notNull()
      .$type<Record<string, unknown>>(),
    codice_fiscale_enc: text("codice_fiscale_enc"),
    notes_enc: text("notes_enc"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (table) => [index("assets_family_id_idx").on(table.family_id)],
);

export const deadlines = sqliteTable(
  "deadlines",
  {
    id: id(),
    family_id: text("family_id")
      .notNull()
      .references(() => families.id),
    asset_id: text("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    category: text("category", { enum: DEADLINE_CATEGORIES }).notNull(),
    title: text("title").notNull(),
    due_date: text("due_date").notNull(),
    amount_cents: integer("amount_cents"),
    // Optional extra reminder date (YYYY-MM-DD): an additional nudge on top of
    // the automatic 30/7/1/0-day offsets, not a replacement. Absolute, so it is
    // dropped on recurrence roll-over (see completeDeadlineTx).
    remind_at: text("remind_at"),
    recurrence: text("recurrence", { enum: RECURRENCES })
      .notNull()
      .default("none"),
    status: text("status", { enum: DEADLINE_STATUSES })
      .notNull()
      .default("pending"),
    source: text("source", { enum: DEADLINE_SOURCES }).notNull(),
    source_message_id: text("source_message_id").references(
      () => inboxMessages.id,
    ),
    medication_id: text("medication_id").references(() => medications.id, {
      onDelete: "set null",
    }),
    notes_enc: text("notes_enc"),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (table) => [
    index("deadlines_family_id_due_date_idx").on(table.family_id, table.due_date),
    index("deadlines_family_id_status_idx").on(table.family_id, table.status),
  ],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: id(),
    family_id: text("family_id")
      .notNull()
      .references(() => families.id),
    asset_id: text("asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    deadline_id: text("deadline_id").references(() => deadlines.id, {
      onDelete: "set null",
    }),
    category: text("category", { enum: DEADLINE_CATEGORIES }).notNull(),
    title: text("title").notNull(),
    date: text("date").notNull(),
    amount_cents: integer("amount_cents").notNull(),
    source: text("source", { enum: TRANSACTION_SOURCES }).notNull(),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (table) => [
    index("transactions_family_id_date_idx").on(table.family_id, table.date),
    index("transactions_asset_id_idx").on(table.asset_id),
  ],
);

export const inboxMessages = sqliteTable(
  "inbox_messages",
  {
    id: id(),
    family_id: text("family_id")
      .notNull()
      .references(() => families.id),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id),
    channel: text("channel", { enum: INBOX_CHANNELS }).notNull(),
    content_type: text("content_type", { enum: INBOX_CONTENT_TYPES }).notNull(),
    raw_text: text("raw_text"),
    transcription: text("transcription"),
    telegram_file_id: text("telegram_file_id"),
    parse_result: text("parse_result"),
    parse_error: text("parse_error"),
    status: text("status", { enum: INBOX_STATUSES })
      .notNull()
      .default("received"),
    telegram_chat_id: text("telegram_chat_id"),
    telegram_confirmation_message_id: text("telegram_confirmation_message_id"),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (table) => [
    index("inbox_messages_family_id_status_idx").on(table.family_id, table.status),
  ],
);

export const medications = sqliteTable(
  "medications",
  {
    id: id(),
    family_id: text("family_id")
      .notNull()
      .references(() => families.id),
    name: text("name").notNull(),
    aic_code: text("aic_code"),
    format: text("format"),
    expiry_date: text("expiry_date"),
    quantity: text("quantity"),
    notes_enc: text("notes_enc"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (table) => [index("medications_family_id_idx").on(table.family_id)],
);

export const therapies = sqliteTable(
  "therapies",
  {
    id: id(),
    family_id: text("family_id")
      .notNull()
      .references(() => families.id),
    person_asset_id: text("person_asset_id").references(() => assets.id, {
      onDelete: "set null",
    }),
    medication_id: text("medication_id").references(() => medications.id, {
      onDelete: "set null",
    }),
    medication_name: text("medication_name").notNull(),
    dosage_text: text("dosage_text").notNull(),
    times_per_day: integer("times_per_day").notNull(),
    times: text("times", { mode: "json" }).notNull().$type<string[]>(),
    start_date: text("start_date").notNull(),
    end_date: text("end_date"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    source_message_id: text("source_message_id").references(
      () => inboxMessages.id,
    ),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (table) => [
    index("therapies_family_id_active_idx").on(table.family_id, table.active),
  ],
);

export const therapyIntakes = sqliteTable(
  "therapy_intakes",
  {
    id: id(),
    therapy_id: text("therapy_id")
      .notNull()
      .references(() => therapies.id, { onDelete: "cascade" }),
    scheduled_at: text("scheduled_at").notNull(),
    status: text("status", { enum: THERAPY_INTAKE_STATUSES })
      .notNull()
      .default("pending"),
    taken_at: text("taken_at"),
    created_at: createdAt(),
  },
  (table) => [
    uniqueIndex("therapy_intakes_therapy_id_scheduled_at_idx").on(
      table.therapy_id,
      table.scheduled_at,
    ),
    index("therapy_intakes_status_scheduled_at_idx").on(
      table.status,
      table.scheduled_at,
    ),
  ],
);

export const telegramLinks = sqliteTable("telegram_links", {
  id: id(),
  user_id: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  telegram_chat_id: text("telegram_chat_id").notNull().unique(),
  telegram_username: text("telegram_username"),
  created_at: createdAt(),
});

export const telegramLinkCodes = sqliteTable("telegram_link_codes", {
  id: id(),
  code: text("code").notNull().unique(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  expires_at: text("expires_at").notNull(),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  created_at: createdAt(),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: id(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  user_agent: text("user_agent"),
  created_at: createdAt(),
});

export const notificationsLog = sqliteTable(
  "notifications_log",
  {
    id: id(),
    family_id: text("family_id")
      .notNull()
      .references(() => families.id),
    user_id: text("user_id").references(() => users.id),
    kind: text("kind", { enum: NOTIFICATION_KINDS }).notNull(),
    ref_id: text("ref_id").notNull(),
    dedupe_key: text("dedupe_key").notNull(),
    channel: text("channel", { enum: NOTIFICATION_CHANNELS }).notNull(),
    sent_at: text("sent_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => [uniqueIndex("notifications_log_dedupe_key_idx").on(table.dedupe_key)],
);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Family = typeof families.$inferSelect;
export type FamilyMember = typeof familyMembers.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Deadline = typeof deadlines.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type InboxMessage = typeof inboxMessages.$inferSelect;
export type Medication = typeof medications.$inferSelect;
export type Therapy = typeof therapies.$inferSelect;
export type TherapyIntake = typeof therapyIntakes.$inferSelect;
export type TelegramLink = typeof telegramLinks.$inferSelect;
export type TelegramLinkCode = typeof telegramLinkCodes.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NotificationLog = typeof notificationsLog.$inferSelect;
