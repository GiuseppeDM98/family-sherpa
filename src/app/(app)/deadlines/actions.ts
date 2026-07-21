"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { assets, deadlines, DEADLINE_CATEGORIES, RECURRENCES } from "@/db/schema";
import { decryptField, encryptField } from "@/lib/crypto";
import {
  completeDeadline,
  DeadlineAlreadyCompletedError,
  DeadlineNotFoundError,
  nextDueDate,
} from "@/lib/reminders/recurrence";
import { requireFamily } from "@/lib/session";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const DeadlineInputSchema = z.object({
  title: z.string().trim().min(1, "Il titolo è obbligatorio."),
  category: z.enum(DEADLINE_CATEGORIES),
  assetId: z.string().nullable(),
  dueDate: z.string().regex(YMD_REGEX, "Data non valida."),
  amountCents: z.number().int().nonnegative().nullable(),
  recurrence: z.enum(RECURRENCES),
  remindAt: z.string().regex(YMD_REGEX, "Data non valida.").nullable(),
  notes: z.string().trim().optional(),
});

/** Thrown internally when `assetId` doesn't belong to the caller's family; never escapes this module. */
class AssetNotInFamilyError extends Error {}

async function assertAssetInFamily(assetId: string | null, familyId: string): Promise<void> {
  if (!assetId) return;
  const [row] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.family_id, familyId)));
  if (!row) throw new AssetNotInFamilyError();
}

export async function createDeadline(
  rawInput: unknown,
): Promise<ActionResult<{ deadlineId: string }>> {
  const { familyId } = await requireFamily();
  const parsed = DeadlineInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Alcuni campi non sono validi." };

  try {
    await assertAssetInFamily(parsed.data.assetId, familyId);
  } catch {
    return { ok: false, error: "Asset non trovato." };
  }

  const [row] = await db
    .insert(deadlines)
    .values({
      family_id: familyId,
      asset_id: parsed.data.assetId,
      category: parsed.data.category,
      title: parsed.data.title,
      due_date: parsed.data.dueDate,
      amount_cents: parsed.data.amountCents,
      recurrence: parsed.data.recurrence,
      remind_at: parsed.data.remindAt,
      source: "manual",
      notes_enc: parsed.data.notes ? encryptField(parsed.data.notes) : null,
    })
    .returning({ id: deadlines.id });

  if (!row) return { ok: false, error: "Impossibile creare la scadenza." };

  revalidatePath("/deadlines");
  if (parsed.data.assetId) revalidatePath(`/assets/${parsed.data.assetId}`);
  return { ok: true, deadlineId: row.id };
}

export async function updateDeadline(deadlineId: string, rawInput: unknown): Promise<ActionResult> {
  const { familyId } = await requireFamily();
  const parsed = DeadlineInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Alcuni campi non sono validi." };

  const [existing] = await db
    .select()
    .from(deadlines)
    .where(and(eq(deadlines.id, deadlineId), eq(deadlines.family_id, familyId)));
  if (!existing) return { ok: false, error: "Scadenza non trovata." };

  try {
    await assertAssetInFamily(parsed.data.assetId, familyId);
  } catch {
    return { ok: false, error: "Asset non trovato." };
  }

  await db
    .update(deadlines)
    .set({
      title: parsed.data.title,
      category: parsed.data.category,
      asset_id: parsed.data.assetId,
      due_date: parsed.data.dueDate,
      amount_cents: parsed.data.amountCents,
      recurrence: parsed.data.recurrence,
      remind_at: parsed.data.remindAt,
      notes_enc: parsed.data.notes ? encryptField(parsed.data.notes) : null,
    })
    .where(eq(deadlines.id, deadlineId));

  revalidatePath("/deadlines");
  if (existing.asset_id) revalidatePath(`/assets/${existing.asset_id}`);
  if (parsed.data.assetId && parsed.data.assetId !== existing.asset_id) {
    revalidatePath(`/assets/${parsed.data.assetId}`);
  }
  return { ok: true };
}

export async function deleteDeadline(deadlineId: string): Promise<ActionResult> {
  const { familyId } = await requireFamily();
  const [existing] = await db
    .select({ id: deadlines.id, asset_id: deadlines.asset_id })
    .from(deadlines)
    .where(and(eq(deadlines.id, deadlineId), eq(deadlines.family_id, familyId)));
  if (!existing) return { ok: false, error: "Scadenza non trovata." };

  await db.delete(deadlines).where(eq(deadlines.id, deadlineId));

  revalidatePath("/deadlines");
  if (existing.asset_id) revalidatePath(`/assets/${existing.asset_id}`);
  return { ok: true };
}

/** Decrypts a deadline's notes for the edit form — never sent for list rendering. */
export async function getDeadlineNotes(
  deadlineId: string,
): Promise<ActionResult<{ notes: string }>> {
  const { familyId } = await requireFamily();
  const [existing] = await db
    .select({ notes_enc: deadlines.notes_enc })
    .from(deadlines)
    .where(and(eq(deadlines.id, deadlineId), eq(deadlines.family_id, familyId)));
  if (!existing) return { ok: false, error: "Scadenza non trovata." };

  return { ok: true, notes: existing.notes_enc ? decryptField(existing.notes_enc) : "" };
}

/**
 * Marks a deadline paid/done via `completeDeadline` (src/lib/reminders/
 * recurrence.ts) and reports the next occurrence's due date, if a recurring
 * one was created, so the UI can toast it.
 */
export async function markDeadlineComplete(
  deadlineId: string,
  opts: { paid: boolean; actualAmountCents?: number; date?: string },
): Promise<ActionResult<{ nextDueDate: string | null }>> {
  const { familyId } = await requireFamily();
  const [existing] = await db
    .select()
    .from(deadlines)
    .where(and(eq(deadlines.id, deadlineId), eq(deadlines.family_id, familyId)));
  if (!existing) return { ok: false, error: "Scadenza non trovata." };

  try {
    await completeDeadline(deadlineId, opts);
  } catch (error) {
    if (error instanceof DeadlineAlreadyCompletedError) {
      return { ok: false, error: "Questa scadenza è già stata gestita." };
    }
    if (error instanceof DeadlineNotFoundError) {
      return { ok: false, error: "Scadenza non trovata." };
    }
    console.error(`[deadlines/actions] Failed to complete deadline ${deadlineId}`, error);
    return { ok: false, error: "Non sono riuscito a salvare. Riprova." };
  }

  revalidatePath("/deadlines");
  if (existing.asset_id) revalidatePath(`/assets/${existing.asset_id}`);
  return { ok: true, nextDueDate: nextDueDate(existing.due_date, existing.recurrence) };
}
