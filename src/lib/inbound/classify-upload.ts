import type { InboundMessage } from "./types";

/**
 * Normalizes an in-app upload into the `InboundMessage` content type
 * (docs/specs/05-ai-parsing-pipeline.md §7), mirroring what
 * `src/lib/telegram/classify.ts` does for a Telegram message. Same limits and
 * same Italian rejections, so a PDF too big to send the bot is also too big to
 * upload — one rule for the user to learn.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type UploadInput = {
  text?: string;
  file?: { mimeType: string; size: number };
};

export type ClassifiedUpload =
  | { ok: true; contentType: InboundMessage["contentType"]; rawText?: string }
  | { ok: false; error: string };

const EMPTY_UPLOAD_REPLY = "Scrivi qualcosa o allega un file.";
const UNSUPPORTED_UPLOAD_REPLY = "Per ora capisco vocali, foto, PDF e testo 🙂";
const FILE_TOO_LARGE_REPLY = "File troppo grande (max 10 MB)";

function trimmedOrUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function classifyUpload(input: UploadInput): ClassifiedUpload {
  const rawText = trimmedOrUndefined(input.text);

  if (!input.file) {
    return rawText
      ? { ok: true, contentType: "text", rawText }
      : { ok: false, error: EMPTY_UPLOAD_REPLY };
  }

  if (input.file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: FILE_TOO_LARGE_REPLY };
  }
  if (input.file.size === 0) {
    return { ok: false, error: EMPTY_UPLOAD_REPLY };
  }

  const mimeType = input.file.mimeType.toLowerCase();

  // The text field doubles as a caption when a file is attached.
  if (mimeType.startsWith("audio/")) return { ok: true, contentType: "voice", rawText };
  if (mimeType.startsWith("image/")) return { ok: true, contentType: "photo", rawText };
  if (mimeType === "application/pdf") return { ok: true, contentType: "document", rawText };

  return { ok: false, error: UNSUPPORTED_UPLOAD_REPLY };
}
