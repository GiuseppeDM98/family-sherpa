/**
 * Minimal shape of a Telegram `Message` this module cares about — kept
 * structurally compatible with grammY's real `Message` type (a superset) so
 * this stays pure and unit-testable without a live Bot/DB.
 */
export type TelegramMessageLike = {
  text?: string;
  caption?: string;
  voice?: { file_id: string; file_size?: number; mime_type?: string };
  audio?: { file_id: string; file_size?: number; mime_type?: string };
  photo?: Array<{ file_id: string; file_size?: number }>;
  document?: { file_id: string; file_size?: number; mime_type?: string };
};

export type ClassifiedMessage =
  | { ok: true; contentType: "voice"; fileId: string; mimeType: string; rawText?: string }
  | { ok: true; contentType: "photo"; fileId: string; mimeType: string; rawText?: string }
  | { ok: true; contentType: "document"; fileId: string; mimeType: string; rawText?: string }
  | { ok: true; contentType: "text"; rawText: string }
  | { ok: false; error: string };

export const MAX_TELEGRAM_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const UNSUPPORTED_MESSAGE_REPLY = "Per ora capisco vocali, foto, PDF e testo 🙂";
const FILE_TOO_LARGE_REPLY = "File troppo grande (max 10 MB)";

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Normalizes a raw Telegram message into the shape `ingestInboundMessage`
 * expects, or an Italian error reply for unsupported/oversized content (see
 * docs/specs/04-telegram-channel.md §3).
 */
export function classifyTelegramMessage(message: TelegramMessageLike): ClassifiedMessage {
  const rawText = trimmedOrUndefined(message.caption);

  const voiceLike = message.voice ?? message.audio;
  if (voiceLike) {
    return {
      ok: true,
      contentType: "voice",
      fileId: voiceLike.file_id,
      mimeType: voiceLike.mime_type ?? "audio/ogg",
      rawText,
    };
  }

  if (message.photo && message.photo.length > 0) {
    // Telegram sends photo sizes ascending — the last entry is the largest.
    const largest = message.photo[message.photo.length - 1];
    if (!largest) return { ok: false, error: UNSUPPORTED_MESSAGE_REPLY };
    if (largest.file_size && largest.file_size > MAX_TELEGRAM_FILE_SIZE_BYTES) {
      return { ok: false, error: FILE_TOO_LARGE_REPLY };
    }
    return { ok: true, contentType: "photo", fileId: largest.file_id, mimeType: "image/jpeg", rawText };
  }

  if (message.document) {
    const { document } = message;
    if (document.file_size && document.file_size > MAX_TELEGRAM_FILE_SIZE_BYTES) {
      return { ok: false, error: FILE_TOO_LARGE_REPLY };
    }
    const mimeType = document.mime_type ?? "";
    if (mimeType === "application/pdf") {
      return { ok: true, contentType: "document", fileId: document.file_id, mimeType, rawText };
    }
    if (mimeType.startsWith("image/")) {
      return { ok: true, contentType: "photo", fileId: document.file_id, mimeType, rawText };
    }
    return { ok: false, error: UNSUPPORTED_MESSAGE_REPLY };
  }

  const text = trimmedOrUndefined(message.text);
  if (text) {
    return { ok: true, contentType: "text", rawText: text };
  }

  return { ok: false, error: UNSUPPORTED_MESSAGE_REPLY };
}
