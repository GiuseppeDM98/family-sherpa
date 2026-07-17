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

/**
 * What a channel must be able to say back. Telegram implements this in
 * `src/lib/telegram/outbound.ts`; WhatsApp (post-MVP) implements the same
 * surface without the pipeline changing.
 */
export interface OutboundChannel {
  sendText(chatId: string, text: string): Promise<void>;
  /**
   * Sends the parse result with confirm/reject affordances when
   * `inboxMessageId` is set, and returns the sent message's id so it can be
   * edited once the user decides.
   */
  sendConfirmation(
    chatId: string,
    text: string,
    inboxMessageId: string | null,
  ): Promise<number | null>;
  // extended by spec 07 (reminders)
}
