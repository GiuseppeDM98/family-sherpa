"use server";

import { and, eq } from "drizzle-orm";
import { signOut } from "@/auth";
import { db } from "@/db";
import { pushSubscriptions, telegramLinkCodes, telegramLinks } from "@/db/schema";
import { generateLinkCode, linkCodeExpiryIso } from "@/lib/telegram/link-code";
import { requireUser } from "@/lib/session";

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}

export async function createTelegramLinkCode(): Promise<
  { ok: true; code: string; expiresAt: string } | { ok: false; error: string }
> {
  const { userId } = await requireUser();

  // The 6-digit code space is unique-constrained; a collision is extremely
  // unlikely (1-in-10^6) but not impossible over the app's lifetime since
  // old codes are never deleted, so retry with a fresh one rather than fail.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [row] = await db
        .insert(telegramLinkCodes)
        .values({ code: generateLinkCode(), user_id: userId, expires_at: linkCodeExpiryIso() })
        .returning();
      if (row) return { ok: true, code: row.code, expiresAt: row.expires_at };
    } catch {
      // Fall through and retry with a new code.
    }
  }

  return { ok: false, error: "Impossibile generare il codice, riprova." };
}

export async function unlinkTelegram(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireUser();
  await db.delete(telegramLinks).where(eq(telegramLinks.user_id, userId));
  return { ok: true };
}

/**
 * Removes one of the user's registered push devices. Scoped to the caller's own
 * subscriptions (the id-plus-user_id filter) so nobody can delete another
 * user's device by guessing its id.
 */
export async function deletePushSubscription(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await requireUser();
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.user_id, userId)));
  return { ok: true };
}
