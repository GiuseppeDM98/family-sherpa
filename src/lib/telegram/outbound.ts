import { env } from "@/lib/env";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sends a plain-text message to a Telegram chat. Used by the ingestion
 * pipeline's stub reply here, and (from spec 05/07 onward) confirmation
 * prompts and reminders — any caller that only has a `chatId`, not a
 * grammY `Context` (e.g. a cron job).
 */
export async function sendTelegramText(chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: escapeHtml(text),
      parse_mode: "HTML",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[telegram/outbound] sendMessage failed for chat ${chatId}: ${res.status} ${body}`);
  }
}
