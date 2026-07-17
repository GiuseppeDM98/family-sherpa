import { eq } from "drizzle-orm";
import { db } from "@/db";
import { deadlines, transactions, type RECURRENCES } from "@/db/schema";
import { todayInRome } from "@/lib/date";

/**
 * Recurrence math and the "mark as paid/done" completion flow
 * (docs/specs/06-assets-hub.md §3). Spec 07 (reminders/cron) imports
 * `nextDueDate` and `completeDeadline` — keep their signatures stable.
 */

export type Recurrence = (typeof RECURRENCES)[number];

export class DeadlineNotFoundError extends Error {
  constructor(deadlineId: string) {
    super(`Deadline ${deadlineId} not found`);
    this.name = "DeadlineNotFoundError";
  }
}

/** The deadline was already marked paid/done/skipped — the caller should say so, not retry. */
export class DeadlineAlreadyCompletedError extends Error {
  constructor(readonly status: string) {
    super(`Deadline is already ${status}`);
    this.name = "DeadlineAlreadyCompletedError";
  }
}

const RECURRENCE_MONTHS: Record<Recurrence, number | null> = {
  none: null,
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
  biennial: 24,
};

/**
 * Adds `months` to a `YYYY-MM-DD` date, clamping to the target month's last
 * day instead of rolling over (31 gen + 1 mese -> 28/29 feb, never 3 mar).
 * Done in UTC on purpose, like the rest of src/lib/date.ts: a date-only
 * string carries no timezone, so whole-month arithmetic can't hit a DST
 * boundary — only clock-time math (spec 07) needs to reason about Rome time.
 */
export function addMonthsToYmd(ymd: string, months: number): string {
  const [year, month, day] = ymd.split("-").map(Number) as [number, number, number];

  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = totalMonths % 12; // 0-based (0 = January)

  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  const mm = String(targetMonthIndex + 1).padStart(2, "0");
  const dd = String(targetDay).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

/** The next occurrence after `dueDate`, or `null` when the recurrence is `'none'`. */
export function nextDueDate(dueDate: string, recurrence: Recurrence): string | null {
  const months = RECURRENCE_MONTHS[recurrence];
  return months === null ? null : addMonthsToYmd(dueDate, months);
}

/**
 * Marks a deadline paid (money changed hands) or done (no money, e.g. a
 * visit), optionally logging a transaction and rolling a recurring deadline
 * forward. One DB transaction: a crash between the transaction insert and
 * the next-deadline insert must not happen, since a retry would then have no
 * way to tell "already paid, next one pending" from "paid twice".
 */
export async function completeDeadline(
  deadlineId: string,
  opts: { paid: boolean; actualAmountCents?: number; date?: string },
): Promise<void> {
  await db.transaction(async (tx) => {
    const [deadline] = await tx.select().from(deadlines).where(eq(deadlines.id, deadlineId));
    if (!deadline) throw new DeadlineNotFoundError(deadlineId);
    if (deadline.status !== "pending") {
      throw new DeadlineAlreadyCompletedError(deadline.status);
    }

    await tx
      .update(deadlines)
      .set({ status: opts.paid ? "paid" : "done" })
      .where(eq(deadlines.id, deadlineId));

    const amountCents = opts.actualAmountCents ?? deadline.amount_cents;
    if (opts.paid && amountCents != null) {
      await tx.insert(transactions).values({
        family_id: deadline.family_id,
        asset_id: deadline.asset_id,
        deadline_id: deadline.id,
        category: deadline.category,
        title: deadline.title,
        date: opts.date ?? todayInRome(),
        amount_cents: amountCents,
        source: "deadline",
      });
    }

    const nextDate = nextDueDate(deadline.due_date, deadline.recurrence);
    if (nextDate) {
      await tx.insert(deadlines).values({
        family_id: deadline.family_id,
        asset_id: deadline.asset_id,
        category: deadline.category,
        title: deadline.title,
        due_date: nextDate,
        amount_cents: deadline.amount_cents,
        recurrence: deadline.recurrence,
        status: "pending",
        source: deadline.source,
        medication_id: deadline.medication_id,
        notes_enc: deadline.notes_enc,
      });
    }
  });
}
