import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import {
  PARSE_RESULT_JSON_SCHEMA,
  ParseResultSchema,
  type ParseResult,
} from "./parse-schema";
import {
  buildExtractionSystemPrompt,
  EXTRACTION_TOOL_NAME,
  FEW_SHOT_EXAMPLES,
  resolveFewShotExample,
  type PromptAsset,
} from "./prompts";

/**
 * The Claude extraction call.
 *
 * Structured output is obtained through *forced tool use*: one tool whose
 * input schema is the parse-result schema, with `tool_choice` pinned to it, so
 * the model has no way to answer in prose. Its input is still Zod-validated —
 * the JSON Schema constrains the shape, not the semantics (a `due_date` of
 * "domani" would satisfy `type: string`).
 */

const MAX_TOKENS = 2048;
const VOICE_PREFIX = "Trascrizione di un messaggio vocale:";
const FEW_SHOT_ACK = "Registrato.";

export class LlmError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LlmError";
  }
}

export type ExtractionRequest = {
  contentType: "voice" | "photo" | "document" | "text";
  /** Text message, or the caption of a photo/PDF. */
  text?: string;
  /** STT output, for `voice`. */
  transcription?: string;
  media?: { buffer: Buffer; mimeType: string };
  assets: readonly PromptAsset[];
  today: string;
};

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: EXTRACTION_TOOL_NAME,
  description:
    "Registra gli elementi actionable estratti dal messaggio di un familiare: scadenze, spese già sostenute, terapie e farmaci. Va usato per ogni messaggio, anche quando non c'è nulla da salvare (in quel caso items è vuoto).",
  input_schema: PARSE_RESULT_JSON_SCHEMA as Anthropic.Tool.InputSchema,
};

/** Turns the inbound message into the content blocks of the final user turn. */
function buildMessageContent(request: ExtractionRequest): Anthropic.ContentBlockParam[] {
  const caption = request.text?.trim();

  switch (request.contentType) {
    case "text": {
      if (!caption) throw new LlmError("Text message has no text to parse");
      return [{ type: "text", text: caption }];
    }

    case "voice": {
      const transcription = request.transcription?.trim();
      if (!transcription) throw new LlmError("Voice message has no transcription to parse");
      return [{ type: "text", text: `${VOICE_PREFIX}\n${transcription}` }];
    }

    case "photo": {
      const media = requireMedia(request);
      return [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: media.mimeType as Anthropic.Base64ImageSource["media_type"],
            data: media.buffer.toString("base64"),
          },
        },
        { type: "text", text: caption ?? "Cosa c'è in questa immagine da salvare?" },
      ];
    }

    case "document": {
      const media = requireMedia(request);
      return [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: media.buffer.toString("base64"),
          },
        },
        { type: "text", text: caption ?? "Cosa c'è in questo documento da salvare?" },
      ];
    }
  }
}

function requireMedia(request: ExtractionRequest): { buffer: Buffer; mimeType: string } {
  if (!request.media) {
    throw new LlmError(`Content type "${request.contentType}" requires media bytes`);
  }
  return request.media;
}

/**
 * Builds the few-shot turns plus the real message.
 *
 * The examples are prior user/assistant turns whose assistant side is a
 * `report_extraction` call. The API requires every `tool_use` to be answered by
 * a `tool_result` in the *next* user turn, and requires roles to alternate — so
 * each example's acknowledgement rides along at the head of the following
 * user turn rather than in a turn of its own.
 */
function buildMessages(request: ExtractionRequest): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  let pendingToolUseId: string | null = null;

  const acknowledgement = (): Anthropic.ContentBlockParam[] =>
    pendingToolUseId
      ? [{ type: "tool_result", tool_use_id: pendingToolUseId, content: FEW_SHOT_ACK }]
      : [];

  FEW_SHOT_EXAMPLES.forEach((rawExample, index) => {
    const example = resolveFewShotExample(rawExample, request.today);
    const toolUseId = `toolu_fewshot_${index}`;

    messages.push({
      role: "user",
      content: [...acknowledgement(), { type: "text", text: example.userText }],
    });
    messages.push({
      role: "assistant",
      content: [
        { type: "tool_use", id: toolUseId, name: EXTRACTION_TOOL_NAME, input: example.output },
      ],
    });
    pendingToolUseId = toolUseId;
  });

  messages.push({
    role: "user",
    content: [...acknowledgement(), ...buildMessageContent(request)],
  });

  return messages;
}

function findExtractionCall(content: Anthropic.ContentBlock[]): Anthropic.ToolUseBlock | undefined {
  return content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === EXTRACTION_TOOL_NAME,
  );
}

/**
 * Runs the extraction. On a schema violation the validation error is appended
 * to the conversation and the call is retried **once** — a second failure
 * throws `LlmError`, which the pipeline turns into `status='failed'`
 * and an Italian apology rather than a crashed webhook.
 */
export async function extractParseResult(request: ExtractionRequest): Promise<ParseResult> {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const messages = buildMessages(request);
  const system = buildExtractionSystemPrompt(request.today, request.assets);

  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system,
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
        // Extraction is a shape-filling task with a tight 2048-token budget
        // that thinking would eat into; the few-shot examples do the steering.
        // (Models where thinking cannot be turned off reject this — the
        // supported values of ANTHROPIC_MODEL are the Opus/Sonnet families.)
        thinking: { type: "disabled" },
        messages,
      });
    } catch (cause) {
      // Network/HTTP failures are not recoverable by re-prompting: the retry
      // below only exists to show the model its own validation error.
      throw new LlmError(`Claude request failed: ${(cause as Error).message}`, { cause });
    }

    const toolUse = findExtractionCall(response.content);
    if (!toolUse) {
      throw new LlmError(
        `Claude did not call ${EXTRACTION_TOOL_NAME} (stop_reason: ${response.stop_reason})`,
      );
    }

    const parsed = ParseResultSchema.safeParse(toolUse.input);
    if (parsed.success) return parsed.data;

    lastError = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    messages.push(
      { role: "assistant", content: response.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: `L'output non rispetta lo schema: ${lastError}. Richiama report_extraction correggendo questi campi.`,
          },
        ],
      },
    );
  }

  throw new LlmError(`Claude output failed schema validation twice: ${lastError}`);
}
