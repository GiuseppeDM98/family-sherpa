/**
 * Channel abstraction (docs/specs/04-telegram-channel.md §5). Every inbound
 * source (Telegram now, app upload and WhatsApp later) normalizes into this
 * shape before calling `ingestInboundMessage`.
 */
export type InboundMessage = {
  channel: "telegram" | "app";
  userId: string;
  familyId: string;
  contentType: "voice" | "photo" | "document" | "text";
  rawText?: string;
  media?: { buffer: Buffer; mimeType: string; fileName?: string };
  telegram?: { chatId: string; fileId?: string };
};

export interface OutboundChannel {
  sendText(chatId: string, text: string): Promise<void>;
  // extended by spec 05 (confirmation keyboards) and spec 07 (reminders)
}
