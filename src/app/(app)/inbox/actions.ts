"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ParseResultSchema } from "@/lib/ai/parse-schema";
import { db } from "@/db";
import { inboxMessages, type InboxMessage } from "@/db/schema";
import { classifyUpload } from "@/lib/inbound/classify-upload";
import { ingestInboundMessage } from "@/lib/inbound/ingest";
import {
  AlreadyMaterializedError,
  materializationTarget,
  materializeInboxMessage,
} from "@/lib/inbound/materialize";
import { composeReply } from "@/lib/inbound/reply";
import type { InboundMessage } from "@/lib/inbound/types";
import { requireFamily } from "@/lib/session";
import { editTelegramMessageText } from "@/lib/telegram/outbound";

const ItemsSchema = ParseResultSchema.shape.items;

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : T))
  | { ok: false; error: string };

/**
 * Loads an inbox message **scoped to the caller's family**. Every action here
 * takes an id straight from the client, so the family filter is the access
 * check, not an optimization.
 */
async function loadFamilyMessage(inboxMessageId: string) {
  const { familyId, userId } = await requireFamily();
  const [message] = await db
    .select()
    .from(inboxMessages)
    .where(and(eq(inboxMessages.id, inboxMessageId), eq(inboxMessages.family_id, familyId)));
  return { familyId, userId, message };
}

/**
 * Settles the Telegram confirmation that proposed this message, if it came from
 * the bot: without this, deciding in the app leaves live buttons in the chat
 * that answer "Già gestito." when tapped.
 */
async function settleTelegramConfirmation(
  message: InboxMessage,
  outcome: string,
): Promise<void> {
  if (!message.telegram_chat_id || !message.telegram_confirmation_message_id) return;
  if (!message.parse_result) return;

  const parsed = ParseResultSchema.safeParse(JSON.parse(message.parse_result));
  if (!parsed.success) return;

  await editTelegramMessageText(
    message.telegram_chat_id,
    message.telegram_confirmation_message_id,
    `${composeReply(parsed.data)}\n\n${outcome}`,
  );
}

export async function confirmInboxMessage(
  inboxMessageId: string,
  items: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const { message } = await loadFamilyMessage(inboxMessageId);
  if (!message) return { ok: false, error: "Messaggio non trovato." };

  const parsedItems = ItemsSchema.safeParse(items);
  if (!parsedItems.success) {
    return { ok: false, error: "Alcuni campi non sono validi: controlla date e importi." };
  }

  try {
    const result = await materializeInboxMessage(inboxMessageId, parsedItems.data);
    await settleTelegramConfirmation(message, "✅ Salvato!");

    const redirectTo = materializationTarget(result);
    revalidatePath("/inbox");
    revalidatePath(redirectTo);
    return { ok: true, redirectTo };
  } catch (error) {
    if (error instanceof AlreadyMaterializedError) {
      return { ok: false, error: "Questo messaggio è già stato gestito." };
    }
    console.error(`[inbox/actions] Failed to confirm message ${inboxMessageId}`, error);
    return { ok: false, error: "Non sono riuscito a salvare. Riprova." };
  }
}

export async function rejectInboxMessage(inboxMessageId: string): Promise<ActionResult> {
  const { message } = await loadFamilyMessage(inboxMessageId);
  if (!message) return { ok: false, error: "Messaggio non trovato." };
  if (message.status !== "parsed") {
    return { ok: false, error: "Questo messaggio è già stato gestito." };
  }

  await db
    .update(inboxMessages)
    .set({ status: "rejected" })
    .where(eq(inboxMessages.id, inboxMessageId));
  await settleTelegramConfirmation(message, "❌ Annullato.");

  revalidatePath("/inbox");
  return { ok: true };
}

/**
 * The in-app upload channel: the same pipeline as Telegram, only the
 * transport differs.
 */
export async function submitAppMessage(
  formData: FormData,
): Promise<ActionResult<{ inboxMessageId: string }>> {
  const { familyId, userId } = await requireFamily();

  const text = formData.get("text");
  const rawFile = formData.get("file");
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : undefined;

  const classified = classifyUpload({
    text: typeof text === "string" ? text : undefined,
    file: file ? { mimeType: file.type, size: file.size } : undefined,
  });
  if (!classified.ok) return { ok: false, error: classified.error };

  const message: InboundMessage = {
    channel: "app",
    userId,
    familyId,
    contentType: classified.contentType,
    rawText: classified.rawText,
    media: file
      ? {
          buffer: Buffer.from(await file.arrayBuffer()),
          mimeType: file.type,
          fileName: file.name,
        }
      : undefined,
  };

  const { inboxMessageId } = await ingestInboundMessage(message);
  revalidatePath("/inbox");
  return { ok: true, inboxMessageId };
}
