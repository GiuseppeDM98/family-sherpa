import { beforeAll, describe, expect, it } from "vitest";
import { TEST_ENV } from "@/test/env-fixture";

// The module reads `env` at import time (to pick the provider), so the
// environment has to be valid before it loads.
let sttFileName: (mimeType: string) => string;
let WHISPER_ACCEPTED_EXTENSIONS: readonly string[];

beforeAll(async () => {
  Object.assign(process.env, TEST_ENV);
  ({ sttFileName, WHISPER_ACCEPTED_EXTENSIONS } = await import("./stt"));
});

const extensionOf = (fileName: string) => fileName.split(".").pop()!;

describe("sttFileName", () => {
  it("names a Telegram voice note .ogg, not .oga", () => {
    // Telegram serves voice notes as `.oga` files with mime audio/ogg, but
    // Whisper rejects the `oga` extension outright — this is a real 400 that
    // reached a user.
    expect(sttFileName("audio/ogg")).toBe("audio.ogg");
  });

  it("maps the mime types the two upload channels can produce", () => {
    expect(sttFileName("audio/webm")).toBe("audio.webm"); // in-app MediaRecorder
    expect(sttFileName("audio/mpeg")).toBe("audio.mp3");
    expect(sttFileName("audio/mp4")).toBe("audio.m4a");
    expect(sttFileName("audio/x-m4a")).toBe("audio.m4a");
    expect(sttFileName("audio/wav")).toBe("audio.wav");
    expect(sttFileName("audio/opus")).toBe("audio.opus");
  });

  it("is case-insensitive", () => {
    expect(sttFileName("AUDIO/OGG")).toBe("audio.ogg");
  });

  it("falls back to an accepted extension for an unknown mime type", () => {
    expect(extensionOf(sttFileName("audio/weird-codec"))).toBe("ogg");
  });

  it("only ever produces an extension Whisper accepts", () => {
    const mimeTypes = [
      "audio/ogg",
      "audio/opus",
      "audio/mpeg",
      "audio/mp4",
      "audio/x-m4a",
      "audio/wav",
      "audio/x-wav",
      "audio/webm",
      "audio/flac",
      "audio/unknown",
      "",
    ];
    for (const mimeType of mimeTypes) {
      expect(WHISPER_ACCEPTED_EXTENSIONS).toContain(extensionOf(sttFileName(mimeType)));
    }
  });
});
