import { clientEnv, env } from "@/lib/env";

/**
 * Outbound Telegram Bot API calls.
 *
 * These wrap raw HTTP rather than going through grammY's `Context` because
 * their callers often don't have one: the ingestion pipeline knows a chat id,
 * and spec 07's cron reminders have no incoming update at all.
 */

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type InlineKeyboard = { inline_keyboard: Array<Array<Record<string, string>>> };

type SendMessageResponse = {
  ok: boolean;
  description?: string;
  result?: { message_id: number };
};

async function callBotApi(
  method: string,
  payload: Record<string, unknown>,
): Promise<SendMessageResponse | null> {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json().catch(() => null)) as SendMessageResponse | null;

  if (!res.ok || !body?.ok) {
    console.error(
      `[telegram/outbound] ${method} failed: ${res.status} ${body?.description ?? ""}`,
    );
    return null;
  }
  return body;
}

/**
 * Sends a plain-text message to a Telegram chat. Used by any caller that only
 * has a `chatId`, not a grammY `Context`.
 */
export async function sendTelegramText(chatId: string, text: string): Promise<void> {
  await callBotApi("sendMessage", {
    chat_id: chatId,
    text: escapeHtml(text),
    parse_mode: "HTML",
  });
}

/**
 * The confirmation keyboard of spec 05 §5. "Modifica" is a URL button deep-linking
 * into the app rather than a callback: editing items in chat is post-MVP
 * (00-overview.md §10), and the app already has the form.
 */
function confirmationKeyboard(inboxMessageId: string): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "✅ Conferma tutto", callback_data: `confirm:${inboxMessageId}` },
        { text: "❌ Annulla", callback_data: `reject:${inboxMessageId}` },
      ],
      [
        {
          text: "✏️ Modifica nell'app",
          url: `${clientEnv.NEXT_PUBLIC_APP_URL}/inbox/${inboxMessageId}`,
        },
      ],
    ],
  };
}

/**
 * Sends the pipeline's reply, with the confirm/reject keyboard when there is
 * something to confirm.
 *
 * @param inboxMessageId the message to confirm, or null for a reply with
 *   nothing actionable in it (no keyboard).
 * @returns the sent message's id, so the pipeline can edit it after a button
 *   press; null if the send failed.
 */
export async function sendTelegramConfirmation(
  chatId: string,
  text: string,
  inboxMessageId: string | null,
): Promise<number | null> {
  const body = await callBotApi("sendMessage", {
    chat_id: chatId,
    text: escapeHtml(text),
    parse_mode: "HTML",
    ...(inboxMessageId ? { reply_markup: confirmationKeyboard(inboxMessageId) } : {}),
  });

  return body?.result?.message_id ?? null;
}

/**
 * Rewrites an already-sent message, dropping its keyboard (omitting
 * `reply_markup` on an edit removes it) — the outcome replaces the buttons, so
 * the chat history reads as a settled decision rather than a stale prompt.
 */
export async function editTelegramMessageText(
  chatId: string,
  messageId: string,
  text: string,
): Promise<void> {
  await callBotApi("editMessageText", {
    chat_id: chatId,
    message_id: Number(messageId),
    text: escapeHtml(text),
    parse_mode: "HTML",
  });
}
