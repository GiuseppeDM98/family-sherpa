import { eq, or } from "drizzle-orm";
import { Bot } from "grammy";
import { db } from "@/db";
import { familyMembers, telegramLinkCodes, telegramLinks } from "@/db/schema";
import { env } from "@/lib/env";
import { ingestInboundMessage } from "@/lib/inbound/ingest";
import type { InboundMessage } from "@/lib/inbound/types";
import { classifyTelegramMessage } from "./classify";
import { isLinkCodeUsable } from "./link-code";
import { downloadTelegramFile } from "./media";
import { sendTelegramText } from "./outbound";

const UNLINKED_REPLY =
  "Non ho ancora collegato questa chat a un account FamilySherpa. Apri l'app → Impostazioni → Collega Telegram, poi scrivimi qui /collega 123456.";

async function findLinkByChatId(chatId: string) {
  const [link] = await db
    .select()
    .from(telegramLinks)
    .where(eq(telegramLinks.telegram_chat_id, chatId));
  return link;
}

/**
 * Builds a fresh Bot instance — created per webhook invocation (serverless:
 * no long polling, no globals requiring warm state, see
 * docs/specs/04-telegram-channel.md §3). grammY's `webhookCallback` calls
 * `bot.init()` (one `getMe` request) the first time the returned handler
 * runs.
 */
export function createBot(): Bot {
  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

  bot.command("start", async (ctx) => {
    const chatId = ctx.chat ? String(ctx.chat.id) : undefined;
    const link = chatId ? await findLinkByChatId(chatId) : undefined;

    if (link) {
      await ctx.reply("Bentornato! Inviami vocali, foto o PDF quando vuoi 🙂");
      return;
    }

    await ctx.reply(
      "Ciao! Sono il bot di FamilySherpa 👋\n\nPer collegarmi al tuo account: apri l'app → Impostazioni → Collega Telegram, poi scrivimi qui /collega 123456.",
    );
  });

  bot.command("collega", async (ctx) => {
    const chatId = ctx.chat ? String(ctx.chat.id) : undefined;
    if (!chatId) return;

    const code = ctx.match?.toString().trim();
    if (!code) {
      await ctx.reply("Usa il comando così: /collega 123456");
      return;
    }

    const [linkCode] = await db
      .select()
      .from(telegramLinkCodes)
      .where(eq(telegramLinkCodes.code, code));

    if (!linkCode) {
      await ctx.reply(
        "❌ Codice non valido. Controlla di averlo copiato correttamente dalle Impostazioni dell'app.",
      );
      return;
    }

    const validation = isLinkCodeUsable(linkCode, new Date());
    if (!validation.ok) {
      await ctx.reply(validation.error);
      return;
    }

    // Relinking (new device, cleared app data, re-generated code, …): drop
    // any previous link for this user or this chat before inserting the
    // fresh one, since both columns are unique.
    await db
      .delete(telegramLinks)
      .where(or(eq(telegramLinks.user_id, linkCode.user_id), eq(telegramLinks.telegram_chat_id, chatId)));

    await db.insert(telegramLinks).values({
      user_id: linkCode.user_id,
      telegram_chat_id: chatId,
      telegram_username: ctx.from?.username,
    });

    await db
      .update(telegramLinkCodes)
      .set({ used: true })
      .where(eq(telegramLinkCodes.id, linkCode.id));

    await ctx.reply("✅ Account collegato! Ora inviami vocali, foto o PDF.");
  });

  bot.command("aiuto", async (ctx) => {
    await ctx.reply(
      [
        "Ecco cosa posso fare:",
        "",
        "🎙️ Vocale — es. «ho prenotato il tagliando per giovedì»",
        "📷 Foto — es. il promemoria cartaceo del pediatra",
        "📄 PDF — es. un avviso PagoPA o TARI",
        "✍️ Testo — scrivimi direttamente cosa devo ricordarti",
        "",
        "Comandi:",
        "/collega <codice> — collega questa chat al tuo account",
        "/aiuto — questo messaggio",
      ].join("\n"),
    );
  });

  bot.on("message", async (ctx) => {
    const chatId = ctx.chat ? String(ctx.chat.id) : undefined;
    if (!chatId) return;

    const link = await findLinkByChatId(chatId);
    if (!link) {
      await ctx.reply(UNLINKED_REPLY);
      return;
    }

    const [membership] = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.user_id, link.user_id));
    if (!membership) {
      await ctx.reply("Il tuo account non risulta ancora in una famiglia nell'app.");
      return;
    }

    const classified = classifyTelegramMessage(ctx.message);
    if (!classified.ok) {
      await sendTelegramText(chatId, classified.error);
      return;
    }

    let media: InboundMessage["media"];
    let fileId: string | undefined;
    if (classified.contentType !== "text") {
      fileId = classified.fileId;
      const downloaded = await downloadTelegramFile(classified.fileId);
      media = {
        buffer: downloaded.buffer,
        mimeType: classified.mimeType,
        fileName: downloaded.fileName,
      };
    }

    const inboundMessage: InboundMessage = {
      channel: "telegram",
      userId: link.user_id,
      familyId: membership.family_id,
      contentType: classified.contentType,
      rawText: classified.rawText,
      media,
      telegram: { chatId, fileId },
    };

    const { reply } = await ingestInboundMessage(inboundMessage);
    await sendTelegramText(chatId, reply);
  });

  return bot;
}
