import { eq } from "drizzle-orm";
import { db } from "@/db";
import { assets, deadlines, familyMembers, therapies } from "@/db/schema";
import { todayInRome } from "@/lib/date";
import { hasValidCronAuth } from "@/lib/reminders/cron-auth";
import { generateIntakesForDate } from "@/lib/reminders/intakes";
import { customReminderContent, deadlineReminderContent } from "@/lib/reminders/messages";
import { notifyUser } from "@/lib/reminders/send";
import { daysBetween } from "@/lib/reminders/time";

/**
 * Daily reminder job, suggested 07:00 Europe/Rome. Two responsibilities:
 *   1. Notify family members about deadlines at 30 / 7 / 1 / 0 days out and the
 *      day after they lapse ("scaduta ieri").
 *   2. Generate today's therapy-intake rows, and retire therapies past their
 *      end date.
 *
 * Idempotent: reminder dedupe keys and the unique (therapy_id, scheduled_at)
 * index mean a re-run in the same window creates and sends nothing new.
 *
 * The queries here are intentionally *not* family-scoped — this is a
 * system-level job authenticated by the cron bearer, not a user request, so it
 * must sweep every family. That is the one sanctioned exception to the
 * requireFamily rule.
 */

// The reminder fires when a deadline is exactly this many days away…
const REMINDER_DAYS_AHEAD = new Set([30, 7, 1, 0]);
// …or exactly one day overdue, for the single "scaduta ieri" nudge.
const OVERDUE_REMINDER_DAY = -1;

export const maxDuration = 60;

async function processDeadlineReminders(
  today: string,
  membersByFamily: Map<string, string[]>,
): Promise<{ processed: number; sent: number }> {
  const pending = await db
    .select({
      id: deadlines.id,
      familyId: deadlines.family_id,
      title: deadlines.title,
      dueDate: deadlines.due_date,
      remindAt: deadlines.remind_at,
      amountCents: deadlines.amount_cents,
      assetName: assets.name,
    })
    .from(deadlines)
    .leftJoin(assets, eq(deadlines.asset_id, assets.id))
    .where(eq(deadlines.status, "pending"));

  let processed = 0;
  let sent = 0;

  for (const deadline of pending) {
    const daysLeft = daysBetween(today, deadline.dueDate);
    const isReminderDay =
      REMINDER_DAYS_AHEAD.has(daysLeft) || daysLeft === OVERDUE_REMINDER_DAY;
    // A custom reminder date fires independently of the automatic offsets, and
    // can coincide with one on the same day — the distinct dedupe keys below
    // keep both from being suppressed as duplicates.
    const isCustomReminderDay = deadline.remindAt === today;
    if (!isReminderDay && !isCustomReminderDay) continue;

    processed++;
    const recipients = membersByFamily.get(deadline.familyId) ?? [];

    if (isReminderDay) {
      const content = deadlineReminderContent({
        title: deadline.title,
        assetName: deadline.assetName,
        amountCents: deadline.amountCents,
        dueDate: deadline.dueDate,
        daysLeft,
      });
      for (const userId of recipients) {
        sent += await notifyUser(userId, {
          ...content,
          url: "/deadlines",
          kind: "deadline_reminder",
          refId: deadline.id,
          dedupeKey: `deadline:${deadline.id}:d:${daysLeft}:u:${userId}`,
          familyId: deadline.familyId,
        });
      }
    }

    if (isCustomReminderDay) {
      const content = customReminderContent({
        title: deadline.title,
        assetName: deadline.assetName,
        amountCents: deadline.amountCents,
        dueDate: deadline.dueDate,
      });
      for (const userId of recipients) {
        sent += await notifyUser(userId, {
          ...content,
          url: "/deadlines",
          kind: "deadline_reminder",
          refId: deadline.id,
          dedupeKey: `deadline:${deadline.id}:custom:u:${userId}`,
          familyId: deadline.familyId,
        });
      }
    }
  }

  return { processed, sent };
}

async function generateTherapyIntakes(today: string): Promise<number> {
  const activeTherapies = await db
    .select()
    .from(therapies)
    .where(eq(therapies.active, true));

  let created = 0;

  for (const therapy of activeTherapies) {
    // Retire a therapy the day after it ends instead of generating for it.
    if (therapy.end_date && therapy.end_date < today) {
      await db.update(therapies).set({ active: false }).where(eq(therapies.id, therapy.id));
      continue;
    }
    created += await generateIntakesForDate(therapy, today);
  }

  return created;
}

async function handle(request: Request): Promise<Response> {
  if (!hasValidCronAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = todayInRome();

  const members = await db
    .select({ familyId: familyMembers.family_id, userId: familyMembers.user_id })
    .from(familyMembers);
  const membersByFamily = new Map<string, string[]>();
  for (const member of members) {
    const list = membersByFamily.get(member.familyId) ?? [];
    list.push(member.userId);
    membersByFamily.set(member.familyId, list);
  }

  const deadlineResult = await processDeadlineReminders(today, membersByFamily);
  const intakesCreated = await generateTherapyIntakes(today);

  return Response.json({
    ok: true,
    processed: deadlineResult.processed,
    sent: deadlineResult.sent,
    intakesCreated,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
