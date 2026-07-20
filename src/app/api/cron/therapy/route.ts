import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { assets, familyMembers, therapies, therapyIntakes } from "@/db/schema";
import { hasValidCronAuth } from "@/lib/reminders/cron-auth";
import { therapyReminderContent } from "@/lib/reminders/messages";
import { notifyUser } from "@/lib/reminders/send";

/**
 * Dose-time reminder job (docs/specs/07-reminders-notifications.md §2), run
 * every 15 minutes. Notifies family members about therapy intakes scheduled
 * around now, once per intake per member (dedupe key), leaving the intake
 * `pending` until it is ticked off in the UI (spec 09).
 *
 * Like the daily job, this sweeps every family and is authenticated only by the
 * cron bearer (00-overview.md §6).
 */

// Look slightly back and a touch forward: a dose is "due now" from 20 minutes
// after its time (late reminders still useful) until 5 minutes before (early is
// fine, avoids missing one that lands just after this tick). A 15-minute cron
// with a 25-minute window guarantees every intake is seen at least once.
const WINDOW_BEFORE_MS = 20 * 60 * 1000;
const WINDOW_AFTER_MS = 5 * 60 * 1000;

export const maxDuration = 60;

async function handle(request: Request): Promise<Response> {
  if (!hasValidCronAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = Date.now();
  const lowerBound = new Date(now - WINDOW_BEFORE_MS).toISOString();
  const upperBound = new Date(now + WINDOW_AFTER_MS).toISOString();

  const dueIntakes = await db
    .select({
      intakeId: therapyIntakes.id,
      familyId: therapies.family_id,
      medicationName: therapies.medication_name,
      dosageText: therapies.dosage_text,
      personName: assets.name,
    })
    .from(therapyIntakes)
    .innerJoin(therapies, eq(therapyIntakes.therapy_id, therapies.id))
    .leftJoin(assets, eq(therapies.person_asset_id, assets.id))
    .where(
      and(
        eq(therapyIntakes.status, "pending"),
        gte(therapyIntakes.scheduled_at, lowerBound),
        lte(therapyIntakes.scheduled_at, upperBound),
      ),
    );

  if (dueIntakes.length === 0) {
    return Response.json({ ok: true, processed: 0, sent: 0 });
  }

  // Fetch members only for the families that actually have a due intake.
  const familyIds = [...new Set(dueIntakes.map((intake) => intake.familyId))];
  const members = await db
    .select({ familyId: familyMembers.family_id, userId: familyMembers.user_id })
    .from(familyMembers)
    .where(inArray(familyMembers.family_id, familyIds));
  const membersByFamily = new Map<string, string[]>();
  for (const member of members) {
    const list = membersByFamily.get(member.familyId) ?? [];
    list.push(member.userId);
    membersByFamily.set(member.familyId, list);
  }

  let sent = 0;
  for (const intake of dueIntakes) {
    const content = therapyReminderContent({
      medicationName: intake.medicationName,
      personName: intake.personName,
      dosageText: intake.dosageText,
    });

    for (const userId of membersByFamily.get(intake.familyId) ?? []) {
      sent += await notifyUser(userId, {
        ...content,
        url: "/meds",
        kind: "therapy_reminder",
        refId: intake.intakeId,
        dedupeKey: `intake:${intake.intakeId}:u:${userId}`,
        familyId: intake.familyId,
      });
    }
  }

  return Response.json({ ok: true, processed: dueIntakes.length, sent });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
