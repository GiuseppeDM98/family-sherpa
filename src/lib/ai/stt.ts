import { env } from "@/lib/env";

/**
 * Speech-to-text for voice notes (docs/specs/05-ai-parsing-pipeline.md §1).
 *
 * Both providers speak the same OpenAI-compatible multipart endpoint, so this
 * is plain `fetch` + `FormData` rather than two SDKs. Groq is the default: it
 * has a free tier, which matters because the project is meant to be
 * self-hostable for free (00-overview.md §1).
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

const MIME_EXTENSIONS: Record<string, string> = {
  "audio/ogg": "oga",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/webm": "webm",
};

/**
 * Whisper endpoints reject an upload whose filename has no recognizable audio
 * extension, even when the part carries the right content type — so the name
 * has to be derived from the mime type, not left to the caller.
 */
function fileNameFor(mimeType: string): string {
  return `audio.${MIME_EXTENSIONS[mimeType] ?? "ogg"}`;
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
      form.append("file", new Blob([new Uint8Array(audio)], { type: mimeType }), fileNameFor(mimeType));
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
