import { env } from "@/lib/env";

/**
 * Speech-to-text for voice notes.
 *
 * Both providers speak the same OpenAI-compatible multipart endpoint, so this
 * is plain `fetch` + `FormData` rather than two SDKs. Groq is the default: it
 * has a free tier, which matters because the project is meant to be
 * self-hostable for free.
 */

export class SttError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SttError";
  }
}

export interface SttProvider {
  transcribe(audio: Buffer, mimeType: string): Promise<string>;
}

type OpenAiCompatibleConfig = {
  providerName: string;
  url: string;
  model: string;
  apiKey: string | undefined;
  apiKeyEnvVar: string;
};

/**
 * Extensions the Whisper endpoints accept in the uploaded file's name.
 * Verbatim from Groq's own rejection message; OpenAI's list is the same.
 *
 * Note `oga` is **not** in it — which matters, because that's exactly what
 * Telegram calls a voice note (`file_path` ends in `.oga`, hence the mapping in
 * `src/lib/telegram/media.ts`). Naming the upload after Telegram's extension
 * gets a 400 even though the bytes are ordinary Ogg/Opus.
 */
export const WHISPER_ACCEPTED_EXTENSIONS = [
  "flac",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "m4a",
  "ogg",
  "opus",
  "wav",
  "webm",
] as const;

const DEFAULT_EXTENSION = "ogg";

const MIME_EXTENSIONS: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/opus": "opus",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/flac": "flac",
};

/**
 * Whisper endpoints reject an upload whose filename has no recognizable audio
 * extension, even when the part carries the right content type — so the name is
 * derived from the mime type rather than taken from the caller (whose filename
 * comes from Telegram and may well be `.oga`).
 */
export function sttFileName(mimeType: string): string {
  return `audio.${MIME_EXTENSIONS[mimeType.toLowerCase()] ?? DEFAULT_EXTENSION}`;
}

function createOpenAiCompatibleProvider(config: OpenAiCompatibleConfig): SttProvider {
  return {
    async transcribe(audio: Buffer, mimeType: string): Promise<string> {
      if (!config.apiKey) {
        throw new SttError(
          `${config.apiKeyEnvVar} is not set — cannot transcribe with ${config.providerName}`,
        );
      }

      const form = new FormData();
      form.append(
        "file",
        new Blob([new Uint8Array(audio)], { type: mimeType }),
        sttFileName(mimeType),
      );
      form.append("model", config.model);
      form.append("language", "it");
      form.append("response_format", "text");

      let response: Response;
      try {
        response = await fetch(config.url, {
          method: "POST",
          headers: { authorization: `Bearer ${config.apiKey}` },
          body: form,
        });
      } catch (cause) {
        throw new SttError(`${config.providerName} transcription request failed`, { cause });
      }

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new SttError(
          `${config.providerName} transcription failed: ${response.status} ${body.slice(0, 500)}`,
        );
      }

      const transcription = (await response.text()).trim();
      if (!transcription) {
        throw new SttError(`${config.providerName} returned an empty transcription`);
      }
      return transcription;
    },
  };
}

export function getSttProvider(): SttProvider {
  if (env.STT_PROVIDER === "openai") {
    return createOpenAiCompatibleProvider({
      providerName: "OpenAI",
      url: "https://api.openai.com/v1/audio/transcriptions",
      model: "whisper-1",
      apiKey: env.OPENAI_API_KEY,
      apiKeyEnvVar: "OPENAI_API_KEY",
    });
  }

  return createOpenAiCompatibleProvider({
    providerName: "Groq",
    url: "https://api.groq.com/openai/v1/audio/transcriptions",
    model: "whisper-large-v3-turbo",
    apiKey: env.GROQ_API_KEY,
    apiKeyEnvVar: "GROQ_API_KEY",
  });
}
