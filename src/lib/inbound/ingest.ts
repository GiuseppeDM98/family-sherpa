import { db } from "@/db";
import { inboxMessages } from "@/db/schema";
import type { InboundMessage } from "./types";

const STUB_REPLY = "📥 Ricevuto! (L'analisi AI arriva con la prossima versione.)";

/**
 * Entry point for every inbound channel. For this spec it only persists the
 * raw message and returns a stub reply — spec 05 replaces the body with the
 * STT/LLM parsing pipeline, keeping this exact signature (see
 * docs/specs/04-telegram-channel.md §5).
 */
export async function ingestInboundMessage(
  msg: InboundMessage,
): Promise<{ inboxMessageId: string; reply: string }> {
  const [row] = await db
    .insert(inboxMessages)
    .values({
      family_id: msg.familyId,
      user_id: msg.userId,
      channel: msg.channel,
      content_type: msg.contentType,
      raw_text: msg.rawText,
      telegram_file_id: msg.telegram?.fileId,
      telegram_chat_id: msg.telegram?.chatId,
      status: "received",
    })
    .returning();

  if (!row) {
    throw new Error("Failed to insert inbox_messages row");
  }

  return { inboxMessageId: row.id, reply: STUB_REPLY };
}
