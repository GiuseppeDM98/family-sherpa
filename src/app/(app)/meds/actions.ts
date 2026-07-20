"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { assets, medications, therapies, therapyIntakes } from "@/db/schema";
import { encryptField } from "@/lib/crypto";
import { addDaysToYmd, todayInRome } from "@/lib/date";
import { syncMedicationExpiryDeadline } from "@/lib/meds";
import { generateIntakesForDate } from "@/lib/reminders/intakes";
import { requireFamily } from "@/lib/session";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const AIC_REGEX = /^\d{9}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const MedicationInputSchema = z.object({
  name: z.string().trim().min(1, "Il nome è obbligatorio."),
  format: z.string().trim().optional(),
  aicCode: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || AIC_REGEX.test(value), "Il codice AIC deve avere 9 cifre."),
  expiryDate: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || YMD_REGEX.test(value), "Data non valida."),
  quantity: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

/**
 * Every mutation revalidates both `/meds` (the cabinet/therapy list itself)
 * and `/` (the dashboard's today's-meds strip and pending-deadline count,
 * spec 08).
 */
function revalidateMedsSurfaces() {
  revalidatePath("/meds");
  revalidatePath("/");
}

export async function createMedication(
  rawInput: unknown,
): Promise<ActionResult<{ medicationId: string }>> {
  const { familyId } = await requireFamily();
  const parsed = MedicationInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Alcuni campi non sono validi." };

  const [row] = await db
    .insert(medications)
    .values({
      family_id: familyId,
      name: parsed.data.name,
      format: parsed.data.format || null,
      aic_code: parsed.data.aicCode || null,
      expiry_date: parsed.data.expiryDate || null,
      quantity: parsed.data.quantity || null,
      notes_enc: parsed.data.notes ? encryptField(parsed.data.notes) : null,
    })
    .returning({
      id: medications.id,
      family_id: medications.family_id,
      name: medications.name,
      expiry_date: medications.expiry_date,
    });
  if (!row) return { ok: false, error: "Impossibile creare il farmaco." };

  await syncMedicationExpiryDeadline(db, row);

  revalidateMedsSurfaces();
  return { ok: true, medicationId: row.id };
}

export async function updateMedication(
  medicationId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  const { familyId } = await requireFamily();
  const parsed = MedicationInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Alcuni campi non sono validi." };

  const [existing] = await db
    .select({ id: medications.id })
    .from(medications)
    .where(and(eq(medications.id, medicationId), eq(medications.family_id, familyId)));
  if (!existing) return { ok: false, error: "Farmaco non trovato." };

  await db
    .update(medications)
    .set({
      name: parsed.data.name,
      format: parsed.data.format || null,
      aic_code: parsed.data.aicCode || null,
      expiry_date: parsed.data.expiryDate || null,
      quantity: parsed.data.quantity || null,
      notes_enc: parsed.data.notes ? encryptField(parsed.data.notes) : null,
    })
    .where(eq(medications.id, medicationId));

  await syncMedicationExpiryDeadline(db, {
    id: medicationId,
    family_id: familyId,
    name: parsed.data.name,
    expiry_date: parsed.data.expiryDate || null,
  });

  revalidateMedsSurfaces();
  return { ok: true };
}

export async function archiveMedication(medicationId: string): Promise<ActionResult> {
  const { familyId } = await requireFamily();
  const [existing] = await db
    .select({ id: medications.id, family_id: medications.family_id, name: medications.name })
    .from(medications)
    .where(and(eq(medications.id, medicationId), eq(medications.family_id, familyId)));
  if (!existing) return { ok: false, error: "Farmaco non trovato." };

  await db.update(medications).set({ archived: true }).where(eq(medications.id, medicationId));
  // Archiving clears the expiry too — no pending "Scadenza <nome>" deadline
  // should linger for a medication no longer in the cabinet (spec 09 §1).
  await syncMedicationExpiryDeadline(db, { ...existing, expiry_date: null });

  revalidateMedsSurfaces();
  return { ok: true };
}

const TherapyInputSchema = z
  .object({
    medicationName: z.string().trim().min(1, "Il nome del farmaco è obbligatorio."),
    medicationId: z.string().trim().optional(),
    personAssetId: z.string().trim().min(1, "Seleziona una persona."),
    dosageText: z.string().trim().min(1, "La posologia è obbligatoria."),
    timesPerDay: z.number().int().min(1).max(6),
    times: z.array(z.string().regex(TIME_REGEX, "Orario non valido.")),
    startDate: z.string().regex(YMD_REGEX, "Data non valida."),
    durationDays: z.number().int().positive().optional(),
  })
  .refine((data) => data.times.length === data.timesPerDay, {
    message: "Il numero di orari non corrisponde a volte al giorno.",
    path: ["times"],
  });

export async function createTherapy(
  rawInput: unknown,
): Promise<ActionResult<{ therapyId: string }>> {
  const { familyId } = await requireFamily();
  const parsed = TherapyInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false, error: "Alcuni campi non sono validi." };

  const [person] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.id, parsed.data.personAssetId),
        eq(assets.family_id, familyId),
        eq(assets.type, "person"),
      ),
    );
  if (!person) return { ok: false, error: "Persona non trovata." };

  if (parsed.data.medicationId) {
    const [medication] = await db
      .select({ id: medications.id })
      .from(medications)
      .where(and(eq(medications.id, parsed.data.medicationId), eq(medications.family_id, familyId)));
    if (!medication) return { ok: false, error: "Farmaco non trovato." };
  }

  const endDate = parsed.data.durationDays
    ? addDaysToYmd(parsed.data.startDate, parsed.data.durationDays - 1)
    : null;

  const [row] = await db
    .insert(therapies)
    .values({
      family_id: familyId,
      person_asset_id: person.id,
      medication_id: parsed.data.medicationId || null,
      medication_name: parsed.data.medicationName,
      dosage_text: parsed.data.dosageText,
      times_per_day: parsed.data.timesPerDay,
      times: parsed.data.times,
      start_date: parsed.data.startDate,
      end_date: endDate,
      active: true,
    })
    .returning();
  if (!row) return { ok: false, error: "Impossibile creare la terapia." };

  const today = todayInRome();
  if (row.start_date === today) await generateIntakesForDate(row, today);

  revalidateMedsSurfaces();
  return { ok: true, therapyId: row.id };
}

export async function pauseTherapy(therapyId: string): Promise<ActionResult> {
  const { familyId } = await requireFamily();
  const [existing] = await db
    .select({ id: therapies.id })
    .from(therapies)
    .where(and(eq(therapies.id, therapyId), eq(therapies.family_id, familyId)));
  if (!existing) return { ok: false, error: "Terapia non trovata." };

  await db.update(therapies).set({ active: false }).where(eq(therapies.id, therapyId));
  revalidateMedsSurfaces();
  return { ok: true };
}

const TimesSchema = z.array(z.string().regex(TIME_REGEX, "Orario non valido.")).min(1);

export async function updateTherapyTimes(
  therapyId: string,
  rawTimes: unknown,
): Promise<ActionResult> {
  const { familyId } = await requireFamily();
  const parsed = TimesSchema.safeParse(rawTimes);
  if (!parsed.success) return { ok: false, error: "Orari non validi." };

  const [existing] = await db
    .select({ id: therapies.id })
    .from(therapies)
    .where(and(eq(therapies.id, therapyId), eq(therapies.family_id, familyId)));
  if (!existing) return { ok: false, error: "Terapia non trovata." };

  await db
    .update(therapies)
    .set({ times: parsed.data, times_per_day: parsed.data.length })
    .where(eq(therapies.id, therapyId));

  revalidateMedsSurfaces();
  return { ok: true };
}

export async function deleteTherapy(therapyId: string): Promise<ActionResult> {
  const { familyId } = await requireFamily();
  const [existing] = await db
    .select({ id: therapies.id })
    .from(therapies)
    .where(and(eq(therapies.id, therapyId), eq(therapies.family_id, familyId)));
  if (!existing) return { ok: false, error: "Terapia non trovata." };

  // therapy_intakes.therapy_id is ON DELETE CASCADE (src/db/schema.ts).
  await db.delete(therapies).where(eq(therapies.id, therapyId));
  revalidateMedsSurfaces();
  return { ok: true };
}

/** Family-scoped intake lookup: the id comes straight from the client (00-overview.md §6). */
async function loadFamilyIntake(intakeId: string) {
  const { familyId } = await requireFamily();
  const [row] = await db
    .select({ id: therapyIntakes.id })
    .from(therapyIntakes)
    .innerJoin(therapies, eq(therapyIntakes.therapy_id, therapies.id))
    .where(and(eq(therapyIntakes.id, intakeId), eq(therapies.family_id, familyId)));
  return row;
}

export async function markIntakeTaken(intakeId: string): Promise<ActionResult> {
  const existing = await loadFamilyIntake(intakeId);
  if (!existing) return { ok: false, error: "Somministrazione non trovata." };

  await db
    .update(therapyIntakes)
    .set({ status: "taken", taken_at: new Date().toISOString() })
    .where(eq(therapyIntakes.id, intakeId));

  revalidateMedsSurfaces();
  return { ok: true };
}

export async function markIntakeSkipped(intakeId: string): Promise<ActionResult> {
  const existing = await loadFamilyIntake(intakeId);
  if (!existing) return { ok: false, error: "Somministrazione non trovata." };

  await db.update(therapyIntakes).set({ status: "skipped" }).where(eq(therapyIntakes.id, intakeId));

  revalidateMedsSurfaces();
  return { ok: true };
}
