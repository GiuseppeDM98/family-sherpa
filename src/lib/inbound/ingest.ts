import { and, eq } from "drizzle-orm";
import { extractParseResult } from "@/lib/ai/claude";
import { dropUnknownAssetIds, type ParseResult } from "@/lib/ai/parse-schema";
import type { PromptAsset } from "@/lib/ai/prompts";
import { getSttProvider } from "@/lib/ai/stt";
import { db } from "@/db";
import { assets, inboxMessages } from "@/db/schema";
import { todayInRome } from "@/lib/date";
import { sendTelegramConfirmation } from "@/lib/telegram/outbound";
import { composeReply } from "./reply";
import type { InboundMessage } from "./types";

const FAILED_REPLY =
  "😓 Non sono riuscito ad analizzare il messaggio. Riprova o inseriscilo dall'app.";

/**
 * Builds the asset list the prompt sees. Only the fields spec 05 §4 allows:
 * the codice fiscale is encrypted at rest and is never sent to the LLM.
 */
async function loadPromptAssets(familyId: string): Promise<PromptAsset[]> {
  const rows = await db
    .select({ id: assets.id, type: assets.type, name: assets.name, metadata: assets.metadata })
    .from(assets)
    .where(and(eq(assets.family_id, familyId), eq(assets.archived, false)));

  return rows.map((row) => {
    const plate = row.metadata.plate;
    const birthDate = row.metadata.birth_date;
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      ...(typeof plate === "string" && plate ? { plate } : {}),
      ...(typeof birthDate === "string" && birthDate ? { birthDate } : {}),
    };
  });
}

/**
 * Transcribes (voice only) and extracts. Split out so the pipeline below reads
 * as its two real phases — understand the message, then answer it — rather than
 * one long function.
 */
async function parseMessage(
  msg: InboundMessage,
  inboxMessageId: string,
): Promise<ParseResult> {
  let transcription: string | undefined;

  if (msg.contentType === "voice") {
    if (!msg.media) throw new Error("Voice message arrived without audio");
    transcription = await getSttProvider().transcribe(msg.media.buffer, msg.media.mimeType);
    await db
      .update(inboxMessages)
      .set({ transcription })
      .where(eq(inboxMessages.id, inboxMessageId));
  }

  const familyAssets = await loadPromptAssets(msg.familyId);
  const parseResult = await extractParseResult({
    contentType: msg.contentType,
    text: msg.rawText,
    transcription,
    media: msg.media,
    assets: familyAssets,
    today: todayInRome(),
  });

  return dropUnknownAssetIds(parseResult, new Set(familyAssets.map((asset) => asset.id)));
}

/**
 * Entry point for every inbound channel (docs/specs/04-telegram-channel.md §5,
 * body per 05 §5): persist the raw message, transcribe and parse it, then
 * propose the result for confirmation.
 *
 * Runs inside the Telegram webhook invocation, so it must never throw: an
 * exception would be a non-200 to Telegram, which retries — replaying STT and
 * an LLM call, and billing for both, on every retry. Failures become
 * `status='failed'` plus an Italian apology instead.
 *
 * For `channel='telegram'` the reply is *sent here* (the confirmation keyboard
 * and its message id are part of the pipeline's state); the returned `reply` is
 * for the `app` channel, whose UI renders it itself.
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

  let parseResult: ParseResult;
  try {
    parseResult = await parseMessage(msg, row.id);
  } catch (error) {
    console.error(`[inbound/ingest] Failed to parse message ${row.id}`, error);
    await db
      .update(inboxMessages)
      .set({ status: "failed", parse_error: (error as Error).message })
      .where(eq(inboxMessages.id, row.id));

    if (msg.telegram) {
      await sendTelegramConfirmation(msg.telegram.chatId, FAILED_REPLY, null);
    }
    return { inboxMessageId: row.id, reply: FAILED_REPLY };
  }

  await db
    .update(inboxMessages)
    .set({ status: "parsed", parse_result: JSON.stringify(parseResult) })
    .where(eq(inboxMessages.id, row.id));

  const reply = composeReply(parseResult);

  if (msg.telegram) {
    // Nothing to confirm means nothing to press: an empty extraction gets a
    // plain conversational answer, no keyboard.
    const confirmationFor = parseResult.items.length > 0 ? row.id : null;
    const sentMessageId = await sendTelegramConfirmation(
      msg.telegram.chatId,
      reply,
      confirmationFor,
    );
    if (sentMessageId) {
      await db
        .update(inboxMessages)
        .set({ telegram_confirmation_message_id: String(sentMessageId) })
        .where(eq(inboxMessages.id, row.id));
    }
  }

  return { inboxMessageId: row.id, reply };
}
