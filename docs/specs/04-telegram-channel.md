---
spec: 04
title: Telegram inbound channel and account linking
depends_on: [02, 03]
complexity: medium-high
---

# 04 — Telegram channel: bot, webhook, linking, media intake

## Goal

A Telegram bot that any family member links to their account, which receives **voice notes, photos, PDFs and text**, stores them as `inbox_messages`, and replies. This spec builds the *transport*; the AI parsing that fills `parse_result` is spec 05 — until then the bot replies with a stub acknowledgment.

## Scope

- grammY bot in webhook mode on a Next.js route handler.
- Secure webhook (secret token) + setup script.
- Account linking via short-lived numeric code generated in the app.
- Media download helpers (voice/photo/document) with size limits.
- `InboundChannel` abstraction + `ingestInboundMessage()` entry point that spec 05 will extend.
- Outbound helper to send Telegram messages (used by spec 05 confirmations and spec 07 reminders).

**Non-scope:** LLM parsing (05), confirmation buttons logic (05), WhatsApp.

## Design

### 1. Env & setup

- Env: `TELEGRAM_BOT_TOKEN` (from @BotFather), `TELEGRAM_WEBHOOK_SECRET` (random string, e.g. `openssl rand -hex 16`). Append to `.env.example` with comments (how to create a bot with @BotFather, suggested name "FamilySherpa Bot", enable no privacy concerns since it's a private bot).
- Script `scripts/telegram-setup.ts` (`pnpm telegram:setup`): calls `setWebhook` with `${NEXT_PUBLIC_APP_URL}/api/telegram/webhook`, `secret_token: TELEGRAM_WEBHOOK_SECRET`, `allowed_updates: ["message","callback_query"]`; also calls `setMyCommands` (`/start`, `/collega`, `/aiuto`). Print `getWebhookInfo` after. Document in the script header that local dev needs a tunnel (e.g. `ngrok http 3000` or `cloudflared`) and re-running setup with the tunnel URL.

### 2. Webhook route — `src/app/api/telegram/webhook/route.ts`

- `export const maxDuration = 60` (STT+LLM will run inside this invocation from spec 05 onward).
- Validate header `x-telegram-bot-api-secret-token === TELEGRAM_WEBHOOK_SECRET`, else 401.
- Use grammY `webhookCallback(bot, "std/http")` or manual `bot.handleUpdate` — bot instance created per-invocation in `src/lib/telegram/bot.ts` (serverless-safe: no long polling, no globals requiring warm state).
- **Always return 200 quickly on unhandled errors** (log them) — Telegram retries non-200 responses and can flood the function.

### 3. Bot behavior — `src/lib/telegram/bot.ts`

Commands (all copy in Italian):
- `/start` — greeting; if chat not linked: explain linking ("Apri l'app → Impostazioni → Collega Telegram, poi scrivimi /collega 123456").
- `/collega <code>` — look up `telegram_link_codes` (unused, not expired, code match): create `telegram_links` row (chat_id, username), mark code used, reply "✅ Account collegato! Ora inviami vocali, foto o PDF."; on failure reply with Italian error.
- `/aiuto` — short usage guide with examples of what to send.

Message handling (non-command):
- If chat is not linked → reply asking to link, ignore content.
- Resolve `user_id` from `telegram_links`, then `family_id` via `family_members`.
- Normalize into an `InboundMessage` (see §5) for: `message.voice` / `message.audio` (voice), `message.photo` (largest size) (photo), `message.document` with mime `application/pdf` or `image/*` (document/photo), plain `message.text` (text). Caption becomes `raw_text`.
- Reject unsupported types ("Per ora capisco vocali, foto, PDF e testo 🙂") and PDFs/images > **10 MB** ("File troppo grande (max 10 MB)").
- Call `ingestInboundMessage(msg)` (§5). Until spec 05 lands, that stub stores the row and returns a canned reply: "📥 Ricevuto! (L'analisi AI arriva con la prossima versione.)" — send it.

### 4. Media download — `src/lib/telegram/media.ts`

`downloadTelegramFile(fileId): Promise<{ buffer: Buffer; mimeType: string; fileName?: string }>` using `getFile` + `https://api.telegram.org/file/bot<token>/<file_path>`. Infer mime from Telegram metadata/extension. Voice notes arrive as `audio/ogg` (opus) — pass through as-is (Groq Whisper accepts ogg/opus).

### 5. Channel abstraction — `src/lib/inbound/`

```ts
// src/lib/inbound/types.ts
export type InboundMessage = {
  channel: 'telegram' | 'app';
  userId: string; familyId: string;
  contentType: 'voice' | 'photo' | 'document' | 'text';
  rawText?: string;                       // text content or caption
  media?: { buffer: Buffer; mimeType: string; fileName?: string };
  telegram?: { chatId: string; fileId?: string };
};

export interface OutboundChannel {
  sendText(chatId: string, text: string): Promise<void>;
  // extended by spec 05 (confirmation keyboards) and spec 07 (reminders)
}
```

```ts
// src/lib/inbound/ingest.ts
export async function ingestInboundMessage(msg: InboundMessage): Promise<{ inboxMessageId: string; reply: string }>
```
For this spec: insert the `inbox_messages` row (`status: 'received'`, `telegram_file_id`/`telegram_chat_id` when present, `raw_text`), return the stub reply. Spec 05 replaces the body with the real pipeline **keeping this exact signature**.

- `src/lib/telegram/outbound.ts`: `sendTelegramText(chatId, text)` wrapping the Bot API (parse_mode HTML, escape user content).

### 6. Linking UI (app side)

- Settings page (spec 03) gains a "Collega Telegram" card: server action `createTelegramLinkCode()` → 6-digit code, 10-minute expiry, rendered big with the instruction "Scrivi al bot @<nome-bot>: /collega <codice>". Show linked status (username + "Scollega" action deleting the `telegram_links` row) when already linked.

## Acceptance criteria

1. `pnpm telegram:setup` registers the webhook (verified by printed `getWebhookInfo`).
2. Unlinked chat: any message gets the "collega il tuo account" reply; `/collega` with a valid code links (row in `telegram_links`, code marked used) and expired/used/wrong codes get Italian errors.
3. Linked chat: sending a voice note, a photo with caption, a PDF and a text each create an `inbox_messages` row with correct `channel/content_type/raw_text/telegram_file_id/telegram_chat_id` and `status='received'`, and receive the stub reply.
4. A >10 MB PDF is rejected with the size message and no row is created.
5. Requests without the secret header get 401; malformed update bodies do not crash (200 + logged error).
6. Settings shows link code generation and linked/unlink states.

## Implementation prompt

> **Run with:** Sonnet 5 (`claude-sonnet-5`), reasoning effort **high** — set via `/model` before pasting. (Webhook edge cases, serverless constraints, media handling.)

```
Read docs/specs/00-overview.md first, then implement docs/specs/04-telegram-channel.md
in this repository, following CLAUDE.md.

Use the tables from spec 02 (telegram_links, telegram_link_codes, inbox_messages)
exactly as defined. Keep ingestInboundMessage's signature exactly as specified —
spec 05 will replace its body. Follow the "Definition of done" in 00-overview.md §9.
Commit in logical steps.

When you are finished: summarize what was implemented, list any deviations from
the spec and why, and tell me exactly what to test manually and how — including
the @BotFather steps, the ngrok/tunnel setup for local webhook testing, and a
checklist of messages to send to the bot with the expected replies and DB rows.
```
