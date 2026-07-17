# FamilySherpa — instructions for AI coding sessions

This project is built spec-by-spec. Each implementation session executes exactly one spec from `docs/specs/`.

## Rules

1. **Before writing any code, read `docs/specs/00-overview.md`** (architecture, conventions, glossary) **and the spec you were asked to implement.** The specs are the source of truth; if code and spec disagree, the spec wins unless the user says otherwise.
2. Stay inside the scope of the assigned spec. If you notice something missing that belongs to another spec, note it at the end of the session — do not implement it.
3. If a spec is ambiguous or turns out to be technically wrong (e.g. an API changed), stop and tell the user before improvising. Propose the fix, and update the spec file itself once agreed.
4. Follow the acceptance criteria of the spec literally: they are the definition of done.
5. **At the end of every session**, tell the user (a) what was implemented, (b) exactly what to test manually and how, step by step (commands, URLs, example messages to send), and (c) which env vars/external setup they must configure themselves.

## Project conventions (summary — full version in 00-overview.md)

- Package manager: **pnpm**. TypeScript strict. Path alias `@/*` → `src/*`.
- UI copy and LLM prompts in **Italian**; code, comments, commit messages in **English**.
- Money is always integer cents (`amount_cents`). Dates: `YYYY-MM-DD` strings for due dates, ISO 8601 UTC for timestamps. User timezone is `Europe/Rome`.
- DB access only through Drizzle (`src/db/`). Sensitive fields are encrypted via `src/lib/crypto.ts` and end with `_enc`.
- Never commit secrets. Every new env var must be added to `.env.example` with a comment.
- Every server action/page under `(app)` must start with `requireUser()`/`requireFamily()` from `src/lib/session.ts`. A missing family scope is a security bug.
- Windows-specific tooling gotchas (pnpm not preinstalled, Turso CLI has no Windows binary, Next 16 needs `--webpack` for Serwist, shadcn CLI v4 preset system, etc.) are tracked in `AGENTS.md`, not here — check it before re-debugging something already solved.

## Current status

### Latest — spec 05: AI parsing pipeline (2026-07-17)

Implemented the core of the product: an inbound message is transcribed if needed, parsed by Claude into structured items, proposed for confirmation, and materialized into the domain tables.

- **STT** (`src/lib/ai/stt.ts`): `SttProvider` interface, `getSttProvider()` switching on `STT_PROVIDER`. Groq (`whisper-large-v3-turbo`, default, free tier) and OpenAI (`whisper-1`) share the same OpenAI-compatible multipart endpoint, so it's plain `fetch` + `FormData`, no SDK. Failures throw `SttError`.
- **Claude** (`src/lib/ai/claude.ts`): structured output via forced tool use — one `report_extraction` tool whose `input_schema` is derived from the Zod schema with `z.toJSONSchema()` (never hand-written: a divergence fails every extraction). `max_tokens: 2048`, `thinking: { type: "disabled" }`. Zod-validates the tool input; on a schema violation it appends the validation error as an `is_error` tool_result and retries **once**, then throws `LlmError`.
- **Schema** (`src/lib/ai/parse-schema.ts`): `ParseResultSchema` verbatim from the spec + `dropUnknownAssetIds()`, which nulls asset ids not belonging to the family (defends against hallucinated/copied ids reaching the DB as FK violations).
- **Prompt** (`src/lib/ai/prompts.ts`): `EXTRACTION_SYSTEM_PROMPT` verbatim, `{{today}}`/`{{assets_list}}` interpolated at call time; CF is never sent. `FEW_SHOT_EXAMPLES` holds the spec's 3 examples with `{{today}}`/`{{tomorrow}}`/`{{next_thursday}}` date placeholders resolved per call (`resolveFewShotExample`) — a frozen date would contradict the prompt's `{{today}}`. Few-shot turns are sent as prior user/assistant turns; each example's `tool_use` is answered by a `tool_result` riding at the head of the next user turn (the API requires both role alternation and a result per tool_use).
- **Pipeline** (`src/lib/inbound/ingest.ts`): real body, same signature as spec 04's stub. Insert row → STT (voice) → build asset list → Claude → `dropUnknownAssetIds` → `parse_result` + `status='parsed'`. **The pipeline sends the Telegram reply itself** (it owns the keyboard and the message id to edit later), so `bot.ts` no longer sends the returned `reply` — that value is for the `app` channel. Any failure → `status='failed'` + Italian apology, never a throw (a non-200 makes Telegram retry, re-running STT + LLM and re-billing both).
- **Confirmation**: inline keyboard `[✅ Conferma tutto] [❌ Annulla]` / `[✏️ Modifica nell'app]` (URL to `/inbox/<id>`); `callback_query` handled in `bot.ts`, re-checking the message's family against the chat's linked user. Already-handled → "Già gestito.".
- **Materialization** (`src/lib/inbound/materialize.ts`): one transaction; refuses unless `status='parsed'` (`AlreadyMaterializedError`); creates suggested assets once per name (type heuristic: bollo/revisione/rca/tagliando → `vehicle`, therapy → `person`, else `other`); message-level `notes` → each deadline's `notes_enc`; therapy `times` from `defaultTherapyTimes()`. `itemsOverride` asset ids are re-checked against the family — they arrive from a server action.
- **Inbox UI** (`(app)/inbox`): list grouped into "Da confermare" / collapsed "Storico", detail page with a per-item edit form (native `<select>` — no shadcn Select in the project yet; euro inputs backed by integer cents), and in-app upload (file picker + `MediaRecorder` → `audio/webm`, which Groq accepts). Confirming in the app also edits the Telegram message, so the chat doesn't keep live buttons for a decided message.

New env vars: `ANTHROPIC_API_KEY` (required), `ANTHROPIC_MODEL` (default `claude-sonnet-5`), `STT_PROVIDER` (`groq`|`openai`, default `groq`), `GROQ_API_KEY`, `OPENAI_API_KEY`. `env.ts` requires the key matching the selected STT provider (a `superRefine`, so a misconfigured deploy fails at boot, not on the first voice note).

Verified against the real Claude API (text messages) and against a throwaway local SQLite for materialization: bollo → `deadlines` (8750, annual, linked vehicle, encrypted notes), "ho pagato 60 euro di luce" → `transactions` + created "Casa" asset, "antibiotico a Sofia 2 volte al giorno per 5 giorni" → therapy with `["08:00","20:00"]` and correct start/end, double confirm rejected without duplicates, small talk → empty items and no buttons.

Not yet implemented: reminders/cron (07), dashboard (08), medicine-box photo enrichment (09), conversational editing and WhatsApp (post-MVP).

### Previously — spec 04: Telegram channel (2026-07-17)

Implemented: grammY bot in webhook mode (`src/lib/telegram/bot.ts`, route at `src/app/api/telegram/webhook/route.ts`, `maxDuration = 60`, secret header checked with `crypto.timingSafeEqual`, always returns 200 on unhandled errors so Telegram doesn't retry-flood the function). Commands `/start`, `/collega <codice>`, `/aiuto`. Account linking: settings page gained a "Collega Telegram" card (`createTelegramLinkCode`/`unlinkTelegram` actions, `telegram-link-card.tsx`) generating a 6-digit code (`src/lib/telegram/link-code.ts`, 10-minute expiry) the user sends to the bot. Message classification (`src/lib/telegram/classify.ts`, pure/unit-tested) maps voice/audio → voice, photo → photo, PDF document → document, image document → photo, plain text → text, rejecting unsupported types and anything over 10 MB. Media download (`src/lib/telegram/media.ts`) and outbound send (`src/lib/telegram/outbound.ts`, HTML-escaped) wrap the raw Bot API. The channel abstraction (`src/lib/inbound/types.ts`: `InboundMessage`, `OutboundChannel`) and `ingestInboundMessage()` (`src/lib/inbound/ingest.ts`) insert the `inbox_messages` row and return a stub Italian reply — spec 05 replaces the body, keeping the signature. `scripts/telegram-setup.ts` (`pnpm telegram:setup`) registers the webhook + commands and prints `getWebhookInfo`.

New env vars: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (server), `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` (client — not in 00-overview's original registry, added because the settings UI needs the bot's `@handle` to tell the user who to message; the token alone doesn't reveal it).

Verified end-to-end manually with a real bot (`@familySherpa_bot`) and a `cloudflared` tunnel: webhook registration, `/collega` account linking, and a text message landing in `inbox_messages`. `SETUP.md` was added as the single consolidated setup guide (env vars, Turso, Telegram bot + tunnel, Windows gotchas); `README.md` now points there instead of duplicating the steps.

(Spec 05 replaced the stub reply and `ingestInboundMessage`'s body; the transport, linking and classification described here are unchanged.)
