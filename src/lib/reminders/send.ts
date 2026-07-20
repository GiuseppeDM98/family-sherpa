import { eq } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import {
  notificationsLog,
  pushSubscriptions,
  telegramLinks,
  type NOTIFICATION_KINDS,
} from "@/db/schema";
import { env } from "@/lib/env";
import { sendTelegramText } from "@/lib/telegram/outbound";

/**
 * Notification fan-out.
 *
 * `notifyUser` is the single entry point the cron jobs call. It delivers one
 * logical notification to a user across two channels — web push (all their
 * devices) and Telegram (if linked) — with per-channel idempotency: the
 * `notifications_log` unique `dedupe_key` is claimed *before* sending, so
 * re-running a cron window sends nothing new. That trades a possible lost
 * message (crash after the log insert, before the send) for never
 * double-notifying, which is the right call for reminders.
 */

type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type NotifyPayload = {
  title: string;
  body: string;
  url: string;
  kind: NotificationKind;
  refId: string;
  dedupeKey: string;
  familyId: string;
};

// VAPID identifies this server to the push services. Configured lazily on the
// first real send, NOT at module load: web-push validates the key format inside
// setVapidDetails, and `next build` imports this module to analyze the cron
// routes — doing it at import would fail the build under CI's dummy keys, even
// though no push is ever sent there.
let isVapidConfigured = false;
function ensureVapidConfigured(): void {
  if (isVapidConfigured) return;
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  isVapidConfigured = true;
}

/**
 * Claims one channel's dedupe key by inserting its `notifications_log` row.
 * Returns true when this call is the one that claimed it (so the caller should
 * send), false when a row already existed (already sent — skip).
 */
async function claimChannel(
  channel: "push" | "telegram",
  payload: NotifyPayload,
  userId: string,
): Promise<boolean> {
  const suffix = channel === "push" ? ":push" : ":tg";
  const inserted = await db
    .insert(notificationsLog)
    .values({
      family_id: payload.familyId,
      user_id: userId,
      kind: payload.kind,
      ref_id: payload.refId,
      dedupe_key: `${payload.dedupeKey}${suffix}`,
      channel,
    })
    .onConflictDoNothing({ target: notificationsLog.dedupe_key })
    .returning({ id: notificationsLog.id });

  return inserted.length > 0;
}

/**
 * Sends the payload to every push subscription of the user, deleting any that
 * the push service reports as gone (404/410) — an unsubscribed or expired
 * endpoint.
 *
 * @returns 1 if the push channel was dispatched now, 0 if there was nothing to
 *   send to or it had already been sent (dedupe) — so a re-run reports honestly.
 */
async function sendPush(payload: NotifyPayload, userId: string): Promise<number> {
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.user_id, userId));

  if (subscriptions.length === 0) return 0;
  if (!(await claimChannel("push", payload, userId))) return 0;

  ensureVapidConfigured();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, subscription.id));
        } else {
          console.error(
            `[reminders/send] push failed for subscription ${subscription.id}: ${statusCode ?? ""}`,
            error,
          );
        }
      }
    }),
  );

  return 1;
}

/**
 * Sends the payload as a Telegram message when the user has linked their chat.
 *
 * @returns 1 if a Telegram message was dispatched now, 0 otherwise (not linked
 *   or already sent).
 */
async function sendTelegram(payload: NotifyPayload, userId: string): Promise<number> {
  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.user_id, userId));

  if (!link) return 0;
  if (!(await claimChannel("telegram", payload, userId))) return 0;

  // Telegram has no separate title field; lead with it, then the body.
  await sendTelegramText(link.telegram_chat_id, `${payload.title}\n${payload.body}`);
  return 1;
}

/**
 * Delivers one notification to a user over every channel available to them.
 * Idempotent per channel via `notifications_log` — safe to call again for the
 * same `dedupeKey`.
 *
 * @returns how many channels were actually dispatched (0–2), so callers can
 *   report a truthful "sent" count that drops to 0 on an idempotent re-run.
 */
export async function notifyUser(userId: string, payload: NotifyPayload): Promise<number> {
  const pushed = await sendPush(payload, userId);
  const telegrammed = await sendTelegram(payload, userId);
  return pushed + telegrammed;
}
