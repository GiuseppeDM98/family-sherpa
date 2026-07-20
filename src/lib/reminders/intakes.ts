import { db } from "@/db";
import { therapyIntakes, type Therapy } from "@/db/schema";
import { romeTimeToUtcIso } from "./time";

/**
 * Therapy intake generation (docs/specs/09-medicine-cabinet.md §2), shared by
 * the spec 07 daily cron (sweeps every active therapy) and the "crea terapia"
 * UI action (generates today's doses immediately when `start_date` is today).
 */

type TherapyForIntakes = Pick<Therapy, "id" | "times" | "start_date" | "end_date">;

/**
 * The UTC instants `therapy`'s doses fall on for `ymd`, honoring the
 * start/end date guards. Pure and DST-safe via `romeTimeToUtcIso`.
 */
export function intakeTimesForDate(therapy: TherapyForIntakes, ymd: string): string[] {
  if (therapy.start_date > ymd) return [];
  if (therapy.end_date && therapy.end_date < ymd) return [];
  return therapy.times.map((time) => romeTimeToUtcIso(ymd, time));
}

/**
 * Inserts `therapy`'s intake rows for `ymd`. Idempotent via the unique
 * `(therapy_id, scheduled_at)` index, so calling it twice for the same
 * therapy/date (a manual "crea terapia" today, then the same day's cron run)
 * creates nothing extra. Returns the count of rows actually created.
 */
export async function generateIntakesForDate(
  therapy: TherapyForIntakes,
  ymd: string,
): Promise<number> {
  let created = 0;
  for (const scheduledAt of intakeTimesForDate(therapy, ymd)) {
    const inserted = await db
      .insert(therapyIntakes)
      .values({ therapy_id: therapy.id, scheduled_at: scheduledAt })
      .onConflictDoNothing({
        target: [therapyIntakes.therapy_id, therapyIntakes.scheduled_at],
      })
      .returning({ id: therapyIntakes.id });
    if (inserted.length > 0) created++;
  }
  return created;
}
