import { describe, expect, it } from "vitest";
import { classifyUpload, MAX_UPLOAD_BYTES } from "./classify-upload";

describe("classifyUpload", () => {
  it("classifies a bare text field", () => {
    expect(classifyUpload({ text: "  devo pagare il bollo  " })).toEqual({
      ok: true,
      contentType: "text",
      rawText: "devo pagare il bollo",
    });
  });

  it("classifies a recorded voice note (MediaRecorder produces audio/webm)", () => {
    expect(classifyUpload({ file: { mimeType: "audio/webm", size: 4_000 } })).toEqual({
      ok: true,
      contentType: "voice",
      rawText: undefined,
    });
  });

  it("classifies an image, carrying the text field as a caption", () => {
    expect(
      classifyUpload({ text: "promemoria del pediatra", file: { mimeType: "image/jpeg", size: 1_000 } }),
    ).toEqual({ ok: true, contentType: "photo", rawText: "promemoria del pediatra" });
  });

  it("classifies a PDF as a document", () => {
    expect(classifyUpload({ file: { mimeType: "application/pdf", size: 1_000 } })).toEqual({
      ok: true,
      contentType: "document",
      rawText: undefined,
    });
  });

  it("accepts an upper-case mime type", () => {
    expect(classifyUpload({ file: { mimeType: "IMAGE/PNG", size: 1_000 } })).toMatchObject({
      ok: true,
      contentType: "photo",
    });
  });

  it("rejects a file over 10 MB", () => {
    expect(
      classifyUpload({ file: { mimeType: "application/pdf", size: MAX_UPLOAD_BYTES + 1 } }),
    ).toEqual({ ok: false, error: "File troppo grande (max 10 MB)" });
  });

  it("rejects an unsupported file type", () => {
    expect(classifyUpload({ file: { mimeType: "application/zip", size: 1_000 } })).toEqual({
      ok: false,
      error: "Per ora capisco vocali, foto, PDF e testo 🙂",
    });
  });

  it("rejects an empty submission", () => {
    expect(classifyUpload({})).toEqual({ ok: false, error: "Scrivi qualcosa o allega un file." });
    expect(classifyUpload({ text: "   " })).toEqual({
      ok: false,
      error: "Scrivi qualcosa o allega un file.",
    });
  });

  it("rejects an empty file", () => {
    expect(classifyUpload({ file: { mimeType: "audio/webm", size: 0 } })).toEqual({
      ok: false,
      error: "Scrivi qualcosa o allega un file.",
    });
  });

  it("rejects an oversized file before looking at its type", () => {
    expect(
      classifyUpload({ file: { mimeType: "application/zip", size: MAX_UPLOAD_BYTES + 1 } }),
    ).toEqual({ ok: false, error: "File troppo grande (max 10 MB)" });
  });
});
