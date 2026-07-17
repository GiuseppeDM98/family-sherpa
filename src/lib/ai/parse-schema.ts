import { z } from "zod";
import { DEADLINE_CATEGORIES } from "@/db/enums";

/**
 * The canonical shape of what Claude extracts from an inbound message
 * (docs/specs/05-ai-parsing-pipeline.md §3). It is stored as a JSON string in
 * `inbox_messages.parse_result`, sent to Claude as the `report_extraction`
 * tool's input schema, and re-validated when the Inbox edit form posts
 * user-corrected items back — so this module is the single definition of the
 * contract between the LLM, the DB and the UI.
 */

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const DeadlineItem = z.object({
  type: z.literal("deadline"),
  title: z.string(), // short Italian, e.g. "Bollo Panda"
  category: z.enum(DEADLINE_CATEGORIES),
  due_date: z.string().regex(YMD_REGEX),
  amount_cents: z.number().int().positive().nullable(),
  recurrence: z.enum([
    "none",
    "monthly",
    "bimonthly",
    "quarterly",
    "semiannual",
    "annual",
    "biennial",
  ]),
  asset_id: z.string().nullable(), // matched existing asset, or null
  asset_suggestion: z.string().nullable(), // e.g. "Panda di Giulia" if no match but an asset seems implied
});

const TransactionItem = z.object({
  type: z.literal("transaction"), // an ALREADY-PAID expense
  title: z.string(),
  category: z.enum(DEADLINE_CATEGORIES),
  date: z.string().regex(YMD_REGEX),
  amount_cents: z.number().int().positive(),
  asset_id: z.string().nullable(),
  asset_suggestion: z.string().nullable(),
});

const TherapyItem = z.object({
  type: z.literal("therapy"),
  medication_name: z.string(),
  dosage_text: z.string(),
  times_per_day: z.number().int().min(1).max(6),
  duration_days: z.number().int().positive().nullable(),
  person_asset_id: z.string().nullable(),
  person_suggestion: z.string().nullable(),
});

const MedicationItem = z.object({
  type: z.literal("medication"),
  name: z.string(),
  aic_code: z.string().nullable(),
  format: z.string().nullable(),
  expiry_date: z.string().regex(YMD_REGEX).nullable(),
});

export const ParseResultItemSchema = z.discriminatedUnion("type", [
  DeadlineItem,
  TransactionItem,
  TherapyItem,
  MedicationItem,
]);

export const ParseResultSchema = z.object({
  items: z.array(ParseResultItemSchema),
  summary_it: z.string(), // 1–2 frasi in italiano che riassumono cosa è stato capito
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().nullable(), // dubbi o informazioni non catturate dagli item
});

export type ParseResult = z.infer<typeof ParseResultSchema>;
export type ParseResultItem = z.infer<typeof ParseResultItemSchema>;
export type DeadlineParseItem = z.infer<typeof DeadlineItem>;
export type TransactionParseItem = z.infer<typeof TransactionItem>;
export type TherapyParseItem = z.infer<typeof TherapyItem>;
export type MedicationParseItem = z.infer<typeof MedicationItem>;

/**
 * JSON Schema for the `report_extraction` tool, derived from the Zod schema
 * rather than hand-written: the two must agree or every extraction fails
 * validation, and a hand-kept copy is exactly the kind of thing that drifts.
 */
export const PARSE_RESULT_JSON_SCHEMA = (() => {
  const schema = z.toJSONSchema(ParseResultSchema, { target: "draft-7" });
  // `$schema` is a document-level annotation; a tool's `input_schema` is a
  // bare schema object, so drop it rather than send a key it has no use for.
  delete schema.$schema;
  return schema;
})();

/**
 * Nulls out `asset_id`/`person_asset_id` values that don't belong to the
 * family. The prompt lists the family's real assets, but the few-shot examples
 * contain placeholder ids, and a hallucinated id would otherwise reach the DB
 * as a foreign key violation at confirmation time — far from the cause. A
 * dropped id degrades to "no asset linked", which the user can fix in the
 * Inbox form.
 */
export function dropUnknownAssetIds(
  parseResult: ParseResult,
  knownAssetIds: ReadonlySet<string>,
): ParseResult {
  const keepOrNull = (assetId: string | null) =>
    assetId && knownAssetIds.has(assetId) ? assetId : null;

  return {
    ...parseResult,
    items: parseResult.items.map((item) => {
      switch (item.type) {
        case "deadline":
        case "transaction":
          return { ...item, asset_id: keepOrNull(item.asset_id) };
        case "therapy":
          return { ...item, person_asset_id: keepOrNull(item.person_asset_id) };
        case "medication":
          return item;
      }
    }),
  };
}
