import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deadlines, type Medication } from "@/db/schema";

/**
 * Medicine cabinet server-only logic (docs/specs/09-medicine-cabinet.md §1):
 * the expiry → deadline bridge. The expiry badge tier itself is client-safe
 * and lives in `src/lib/meds-labels.ts` (no `@/db` import).
 */

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Keeps the medication's linked `farmaco` deadline in sync with its
 * `expiry_date` (spec 09 §1 "Expiry bridge"). Called on every
 * create/update/archive of a medication, from the manual cabinet actions and
 * from `materializeInboxMessage`'s box-photo path — pass the transaction's
 * `tx` there so the deadline lands atomically with the medication row.
 *
 * There's no unique index tying one deadline to one medication (a family
 * could in principle create one by hand too), so this reads the existing
 * pending linked deadline before deciding whether to insert, update, or
 * delete it — an update-or-insert by id lookup rather than an upsert.
 */
export async function syncMedicationExpiryDeadline(
  executor: Executor,
  medication: Pick<Medication, "id" | "family_id" | "name" | "expiry_date">,
): Promise<void> {
  const [existing] = await executor
    .select({ id: deadlines.id })
    .from(deadlines)
    .where(and(eq(deadlines.medication_id, medication.id), eq(deadlines.status, "pending")));

  if (!medication.expiry_date) {
    if (existing) await executor.delete(deadlines).where(eq(deadlines.id, existing.id));
    return;
  }

  const title = `Scadenza ${medication.name}`;
  if (existing) {
    await executor
      .update(deadlines)
      .set({ due_date: medication.expiry_date, title })
      .where(eq(deadlines.id, existing.id));
  } else {
    await executor.insert(deadlines).values({
      family_id: medication.family_id,
      medication_id: medication.id,
      category: "farmaco",
      title,
      due_date: medication.expiry_date,
      recurrence: "none",
      source: "manual",
    });
  }
}
