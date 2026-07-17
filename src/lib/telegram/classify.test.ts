import { describe, expect, it } from "vitest";
import { classifyTelegramMessage, MAX_TELEGRAM_FILE_SIZE_BYTES } from "./classify";

describe("classifyTelegramMessage", () => {
  it("classifies a voice note, defaulting to audio/ogg", () => {
    const result = classifyTelegramMessage({ voice: { file_id: "voice-1" } });
    expect(result).toEqual({
      ok: true,
      contentType: "voice",
      fileId: "voice-1",
      mimeType: "audio/ogg",
      rawText: undefined,
    });
  });

  it("classifies an audio message the same as voice", () => {
    const result = classifyTelegramMessage({ audio: { file_id: "audio-1", mime_type: "audio/mpeg" } });
    expect(result).toEqual({
      ok: true,
      contentType: "voice",
      fileId: "audio-1",
      mimeType: "audio/mpeg",
      rawText: undefined,
    });
  });

  it("classifies a photo, picking the largest size and carrying the caption as rawText", () => {
    const result = classifyTelegramMessage({
      caption: "il tagliando della Panda",
      photo: [
        { file_id: "small", file_size: 1_000 },
        { file_id: "large", file_size: 50_000 },
      ],
    });
    expect(result).toEqual({
      ok: true,
      contentType: "photo",
      fileId: "large",
      mimeType: "image/jpeg",
      rawText: "il tagliando della Panda",
    });
  });

  it("rejects a photo larger than 10 MB", () => {
    const result = classifyTelegramMessage({
      photo: [{ file_id: "huge", file_size: MAX_TELEGRAM_FILE_SIZE_BYTES + 1 }],
    });
    expect(result).toEqual({ ok: false, error: "File troppo grande (max 10 MB)" });
  });

  it("classifies a PDF document as content_type document", () => {
    const result = classifyTelegramMessage({
      document: { file_id: "doc-1", mime_type: "application/pdf", file_size: 1_000 },
    });
    expect(result).toEqual({
      ok: true,
      contentType: "document",
      fileId: "doc-1",
      mimeType: "application/pdf",
      rawText: undefined,
    });
  });

  it("classifies an image document as content_type photo", () => {
    const result = classifyTelegramMessage({
      document: { file_id: "doc-2", mime_type: "image/png", file_size: 1_000 },
    });
    expect(result).toEqual({
      ok: true,
      contentType: "photo",
      fileId: "doc-2",
      mimeType: "image/png",
      rawText: undefined,
    });
  });

  it("rejects a document larger than 10 MB", () => {
    const result = classifyTelegramMessage({
      document: { file_id: "doc-3", mime_type: "application/pdf", file_size: MAX_TELEGRAM_FILE_SIZE_BYTES + 1 },
    });
    expect(result).toEqual({ ok: false, error: "File troppo grande (max 10 MB)" });
  });

  it("rejects a document with an unsupported mime type", () => {
    const result = classifyTelegramMessage({
      document: { file_id: "doc-4", mime_type: "application/zip" },
    });
    expect(result).toEqual({ ok: false, error: "Per ora capisco vocali, foto, PDF e testo 🙂" });
  });

  it("classifies plain text", () => {
    const result = classifyTelegramMessage({ text: "  ho prenotato il tagliando  " });
    expect(result).toEqual({ ok: true, contentType: "text", rawText: "ho prenotato il tagliando" });
  });

  it("rejects a message with no recognizable content", () => {
    const result = classifyTelegramMessage({});
    expect(result).toEqual({ ok: false, error: "Per ora capisco vocali, foto, PDF e testo 🙂" });
  });

  it("rejects a text message that is only whitespace", () => {
    const result = classifyTelegramMessage({ text: "   " });
    expect(result).toEqual({ ok: false, error: "Per ora capisco vocali, foto, PDF e testo 🙂" });
  });
});
