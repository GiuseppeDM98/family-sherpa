import { timingSafeEqual } from "node:crypto";
import { webhookCallback } from "grammy";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { createBot } from "@/lib/telegram/bot";

// STT + LLM parsing will run inside this same invocation.
export const maxDuration = 60;

function isValidSecretHeader(header: string | null): boolean {
  if (!header) return false;
  const expected = Buffer.from(env.TELEGRAM_WEBHOOK_SECRET);
  const actual = Buffer.from(header);
  // Constant-time compare: the header carries a shared secret, a plain
  // `===` would leak timing information about where it first differs.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(req: NextRequest) {
  if (!isValidSecretHeader(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const bot = createBot();
    const handleUpdate = webhookCallback(bot, "std/http");
    return await handleUpdate(req);
  } catch (error) {
    // Telegram retries non-200 responses and can flood the function — a
    // malformed update or a bug in a handler must never propagate as one.
    console.error("[telegram/webhook] Unhandled error processing update", error);
    return new Response("OK", { status: 200 });
  }
}
