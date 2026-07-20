import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Bearer check shared by both `/api/cron/*` routes
 * (docs/specs/07-reminders-notifications.md §2). The single auth mechanism is
 * this `Authorization: Bearer <CRON_SECRET>` header — whatever schedules the
 * endpoint (Vercel Cron, cron-job.org) must send it. Constant-time compare so
 * the header never leaks where it first differs from the secret.
 */
export function hasValidCronAuth(request: Request): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(header.slice("Bearer ".length));
  const expected = Buffer.from(env.CRON_SECRET);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
