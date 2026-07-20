import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

/**
 * Stores a browser's web-push subscription. Upsert by endpoint: the same
 * device re-subscribing (keys rotate) updates its row rather than
 * duplicating, and a device that moved to another account gets reassigned.
 *
 * This is a Route Handler, not a Server Action, because the PWA posts the raw
 * PushSubscription JSON straight from `pushManager.subscribe()`.
 */

const SubscribeSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const parsed = SubscribeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response("Bad Request", { status: 400 });

  const { endpoint, keys } = parsed.data;
  const userAgent = req.headers.get("user-agent");

  await db
    .insert(pushSubscriptions)
    .values({
      user_id: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: userAgent,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        user_id: session.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: userAgent,
      },
    });

  return Response.json({ ok: true });
}
