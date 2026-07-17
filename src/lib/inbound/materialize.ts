import { eq } from "drizzle-orm";
import type { ParseResult, ParseResultItem } from "@/lib/ai/parse-schema";
import { ParseResultSchema } from "@/lib/ai/parse-schema";
import { db } from "@/db";
import {
  assets,
  deadlines,
  inboxMessages,
  medications,
  therapies,
  transactions,
  type ASSET_TYPES,
} from "@/db/schema";
import { encryptField } from "@/lib/crypto";
import { addDaysToYmd, todayInRome } from "@/lib/date";
import { defaultTherapyTimes } from "./therapy-times";

/**
 * Turns a confirmed inbox message into domain rows
 * (docs/specs/05-ai-parsing-pipeline.md §6).
 *
 * Everything happens in one transaction: a message that creates an asset and
 * three deadlines must land completely or not at all, otherwise a retry after a
 * partial failure duplicates whatever already went in. The status flip to
 * `confirmed` is part of the same transaction and doubles as the idempotency
 * guard — tapping "Conferma tutto" twice on Telegram is normal user behavior,
 * not an edge case.
 */

export type MaterializationResult = {
  deadlineIds: string[];
  transactionIds: string[];
  therapyIds: string[];
  medicationIds: string[];
};

/** The message was already confirmed or rejected — the caller should say so, not retry. */
export class AlreadyMaterializedError extends Error {
  constructor(readonly status: string) {
    super(`Inbox message is already ${status}`);
    this.name = "AlreadyMaterializedError";
  }
}

export class MaterializationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "MaterializationError";
  }
}

type AssetType = (typeof ASSET_TYPES)[number];

/**
 * Categories that can only belong to a vehicle. Used to guess the type of an
 * asset the parser suggested but the family doesn't have yet: "il bollo della
 * Punta" implies a car even though nothing in the message says "veicolo".
 */
const VEHICLE_CATEGORIES = new Set(["bollo", "revisione", "rca", "tagliando"]);

function suggestedAssetType(item: ParseResultItem): AssetType {
  switch (item.type) {
    case "therapy":
      return "person";
    case "deadline":
    case "transaction":
      return VEHICLE_CATEGORIES.has(item.category) ? "vehicle" : "other";
    default:
      return "other";
  }
}

function isEmpty(result: MaterializationResult): boolean {
  return Object.values(result).every((ids) => ids.length === 0);
}

/**
 * @param itemsOverride items edited by the user in the Inbox form; when absent
 *   the stored `parse_result` items are used as-is. Either way they are
 *   re-validated — the override arrives from a server action, i.e. from the
 *   client.
 */
export async function materializeInboxMessage(
  inboxMessageId: string,
  itemsOverride?: ParseResultItem[],
): Promise<MaterializationResult> {
  return db.transaction(async (tx) => {
    const [message] = await tx
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.id, inboxMessageId));

    if (!message) throw new MaterializationError(`Inbox message ${inboxMessageId} not found`);
    if (message.status !== "parsed") throw new AlreadyMaterializedError(message.status);
    if (!message.parse_result) {
      throw new MaterializationError(`Inbox message ${inboxMessageId} has no parse result`);
    }

    let parseResult: ParseResult;
    try {
      parseResult = ParseResultSchema.parse(JSON.parse(message.parse_result));
    } catch (cause) {
      throw new MaterializationError("Stored parse result is not valid", { cause });
    }

    const items = itemsOverride
      ? ParseResultSchema.shape.items.parse(itemsOverride)
      : parseResult.items;

    const familyId = message.family_id;
    const familyAssets = await tx
      .select({ id: assets.id, name: assets.name })
      .from(assets)
      .where(eq(assets.family_id, familyId));

    const knownAssetIds = new Set(familyAssets.map((asset) => asset.id));
    const assetIdsByName = new Map(
      familyAssets.map((asset) => [asset.name.trim().toLowerCase(), asset.id]),
    );

    /**
     * Resolves an item's asset: an explicit id (checked against the family —
     * `itemsOverride` is client input, and linking another family's asset would
     * be a tenancy leak), else the parser's suggestion, creating the asset the
     * first time a name appears so two items suggesting "Panda di Giulia" share
     * one asset instead of creating two.
     */
    async function resolveAssetId(
      explicitId: string | null,
      suggestion: string | null,
      item: ParseResultItem,
    ): Promise<string | null> {
      if (explicitId) {
        if (!knownAssetIds.has(explicitId)) {
          throw new MaterializationError(
            `Asset ${explicitId} does not belong to family ${familyId}`,
          );
        }
        return explicitId;
      }

      const name = suggestion?.trim();
      if (!name) return null;

      const existingId = assetIdsByName.get(name.toLowerCase());
      if (existingId) return existingId;

      const [created] = await tx
        .insert(assets)
        .values({ family_id: familyId, type: suggestedAssetType(item), name, metadata: {} })
        .returning({ id: assets.id });
      if (!created) throw new MaterializationError(`Failed to create asset "${name}"`);

      knownAssetIds.add(created.id);
      assetIdsByName.set(name.toLowerCase(), created.id);
      return created.id;
    }

    // The model's caveats ("codice avviso: 3010...") belong to the message, not
    // to a single item, so every deadline it produced carries them.
    const notesEnc = parseResult.notes?.trim()
      ? encryptField(parseResult.notes.trim())
      : null;
    const today = todayInRome();

    const result: MaterializationResult = {
      deadlineIds: [],
      transactionIds: [],
      therapyIds: [],
      medicationIds: [],
    };

    for (const item of items) {
      switch (item.type) {
        case "deadline": {
          const [row] = await tx
            .insert(deadlines)
            .values({
              family_id: familyId,
              asset_id: await resolveAssetId(item.asset_id, item.asset_suggestion, item),
              category: item.category,
              title: item.title,
              due_date: item.due_date,
              amount_cents: item.amount_cents,
              recurrence: item.recurrence,
              source: "parser",
              source_message_id: inboxMessageId,
              notes_enc: notesEnc,
            })
            .returning({ id: deadlines.id });
          if (row) result.deadlineIds.push(row.id);
          break;
        }

        case "transaction": {
          const [row] = await tx
            .insert(transactions)
            .values({
              family_id: familyId,
              asset_id: await resolveAssetId(item.asset_id, item.asset_suggestion, item),
              category: item.category,
              title: item.title,
              date: item.date,
              amount_cents: item.amount_cents,
              source: "parser",
            })
            .returning({ id: transactions.id });
          if (row) result.transactionIds.push(row.id);
          break;
        }

        case "therapy": {
          const [row] = await tx
            .insert(therapies)
            .values({
              family_id: familyId,
              person_asset_id: await resolveAssetId(
                item.person_asset_id,
                item.person_suggestion,
                item,
              ),
              medication_name: item.medication_name,
              dosage_text: item.dosage_text,
              times_per_day: item.times_per_day,
              times: defaultTherapyTimes(item.times_per_day),
              start_date: today,
              end_date: item.duration_days
                ? addDaysToYmd(today, item.duration_days - 1)
                : null,
              active: true,
              source_message_id: inboxMessageId,
            })
            .returning({ id: therapies.id });
          if (row) result.therapyIds.push(row.id);
          break;
        }

        case "medication": {
          const [row] = await tx
            .insert(medications)
            .values({
              family_id: familyId,
              name: item.name,
              aic_code: item.aic_code,
              format: item.format,
              expiry_date: item.expiry_date,
            })
            .returning({ id: medications.id });
          if (row) result.medicationIds.push(row.id);
          break;
        }
      }
    }

    await tx
      .update(inboxMessages)
      .set({ status: "confirmed" })
      .where(eq(inboxMessages.id, inboxMessageId));

    return result;
  });
}

/** Where to send the user after confirming, based on what was actually created. */
export function materializationTarget(result: MaterializationResult): string {
  if (isEmpty(result)) return "/inbox";
  if (result.deadlineIds.length > 0 || result.transactionIds.length > 0) return "/deadlines";
  return "/meds";
}
