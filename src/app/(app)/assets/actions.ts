"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  HomeMetadataSchema,
  OtherMetadataSchema,
  PersonMetadataSchema,
  VehicleMetadataSchema,
} from "@/lib/asset-metadata";
import { isValidCodiceFiscale } from "@/lib/cf";
import { encryptField } from "@/lib/crypto";
import { db } from "@/db";
import { assets, DEADLINE_CATEGORIES, transactions } from "@/db/schema";
import { requireFamily } from "@/lib/session";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

const NameSchema = z.string().trim().min(1, "Il nome è obbligatorio.");
const NotesSchema = z.string().trim().optional();

const AssetInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("vehicle"),
    name: NameSchema,
    metadata: VehicleMetadataSchema,
    notes: NotesSchema,
  }),
  z.object({
    type: z.literal("person"),
    name: NameSchema,
    metadata: PersonMetadataSchema,
    codiceFiscale: z.string().trim().optional(),
    notes: NotesSchema,
  }),
  z.object({
    type: z.literal("home"),
    name: NameSchema,
    metadata: HomeMetadataSchema,
    notes: NotesSchema,
  }),
  z.object({
    type: z.literal("other"),
    name: NameSchema,
    metadata: OtherMetadataSchema,
    notes: NotesSchema,
  }),
]);

type AssetInput = z.infer<typeof AssetInputSchema>;

/** Thrown internally to short-circuit on an invalid CF; never escapes this module. */
class InvalidCodiceFiscaleError extends Error {}

/**
 * `undefined` means "not applicable, leave the column alone" (every type but
 * person); `null` means "clear it". A non-empty CF that fails the check
 * character is rejected server-side too — the form's own validation is a UX
 * nicety, not the security boundary (acceptance criterion #2: an invalid CF
 * is never saved).
 */
function resolveCodiceFiscaleEnc(input: AssetInput): string | null | undefined {
  if (input.type !== "person") return undefined;
  if (!input.codiceFiscale) return null;
  if (!isValidCodiceFiscale(input.codiceFiscale)) throw new InvalidCodiceFiscaleError();
  return encryptField(input.codiceFiscale.trim().toUpperCase());
}

export async function createAsset(rawInput: unknown): Promise<ActionResult<{ assetId: string }>> {
  const { familyId } = await requireFamily();
  const parsed = AssetInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Alcuni campi non sono validi." };

  let codiceFiscaleEnc: string | null | undefined;
  try {
    codiceFiscaleEnc = resolveCodiceFiscaleEnc(parsed.data);
  } catch {
    return { ok: false, error: "Codice fiscale non valido." };
  }

  const [row] = await db
    .insert(assets)
    .values({
      family_id: familyId,
      type: parsed.data.type,
      name: parsed.data.name,
      metadata: parsed.data.metadata,
      codice_fiscale_enc: codiceFiscaleEnc ?? null,
      notes_enc: parsed.data.notes ? encryptField(parsed.data.notes) : null,
    })
    .returning({ id: assets.id });

  if (!row) return { ok: false, error: "Impossibile creare l'asset." };

  revalidatePath("/assets");
  return { ok: true, assetId: row.id };
}

export async function updateAsset(assetId: string, rawInput: unknown): Promise<ActionResult> {
  const { familyId } = await requireFamily();
  const parsed = AssetInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Alcuni campi non sono validi." };

  const [existing] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.family_id, familyId)));
  if (!existing) return { ok: false, error: "Asset non trovato." };

  let codiceFiscaleEnc: string | null | undefined;
  try {
    codiceFiscaleEnc = resolveCodiceFiscaleEnc(parsed.data);
  } catch {
    return { ok: false, error: "Codice fiscale non valido." };
  }

  await db
    .update(assets)
    .set({
      name: parsed.data.name,
      metadata: parsed.data.metadata,
      ...(codiceFiscaleEnc !== undefined ? { codice_fiscale_enc: codiceFiscaleEnc } : {}),
      notes_enc: parsed.data.notes ? encryptField(parsed.data.notes) : null,
    })
    .where(eq(assets.id, assetId));

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  return { ok: true };
}

/**
 * Delete = archive (00-overview.md §6, spec 06 §2): deadlines/transactions
 * keep their `asset_id`, so history stays queryable with no FK errors.
 */
export async function archiveAsset(assetId: string): Promise<ActionResult> {
  const { familyId } = await requireFamily();
  const [existing] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.family_id, familyId)));
  if (!existing) return { ok: false, error: "Asset non trovato." };

  await db.update(assets).set({ archived: true }).where(eq(assets.id, assetId));

  revalidatePath("/assets");
  revalidatePath(`/assets/${assetId}`);
  return { ok: true };
}

const TransactionInputSchema = z.object({
  title: z.string().trim().min(1, "Il titolo è obbligatorio."),
  category: z.enum(DEADLINE_CATEGORIES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida."),
  amountCents: z.number().int().positive("L'importo deve essere maggiore di zero."),
});

/**
 * "Aggiungi spesa" on the asset cost tab (docs/specs/08-expense-dashboard.md
 * §3): a manual transaction not tied to any deadline (`source: 'manual'`).
 */
export async function createTransaction(
  assetId: string,
  rawInput: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { familyId } = await requireFamily();
  const parsed = TransactionInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Alcuni campi non sono validi." };

  const [asset] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.family_id, familyId)));
  if (!asset) return { ok: false, error: "Asset non trovato." };

  await db.insert(transactions).values({
    family_id: familyId,
    asset_id: assetId,
    category: parsed.data.category,
    title: parsed.data.title,
    date: parsed.data.date,
    amount_cents: parsed.data.amountCents,
    source: "manual",
  });

  revalidatePath(`/assets/${assetId}`);
  revalidatePath("/");
  return { ok: true };
}
