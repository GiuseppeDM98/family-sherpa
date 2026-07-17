# Session notes — spec 05: AI parsing pipeline

Working notes for the session implementing `docs/specs/05-ai-parsing-pipeline.md`.
Kept during the session; folded into `CLAUDE.md` / `AGENTS.md` at the end.

## Plan (commit by commit)

1. `chore:` add `@anthropic-ai/sdk`, new env vars (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
   `STT_PROVIDER`, `GROQ_API_KEY`, `OPENAI_API_KEY`) to `.env.example` + `src/lib/env.ts` + CI.
2. `feat:` date/format helpers (`src/lib/date.ts`, `src/lib/format.ts`) + tests.
3. `feat:` STT provider interface (`src/lib/ai/stt.ts`).
4. `feat:` parse-result Zod schema + JSON Schema for the tool (`src/lib/ai/parse-schema.ts`) + tests.
5. `feat:` extraction prompt + few-shot examples (`src/lib/ai/prompts.ts`) + tests.
6. `feat:` Claude client (`src/lib/ai/claude.ts`).
7. `feat:` real `ingestInboundMessage` body + reply composition + materialization.
8. `feat:` Telegram confirmation keyboard + `callback_query` handling.
9. `feat:` Inbox UI (list, detail/edit, in-app upload).
10. `docs:` update CLAUDE.md / AGENTS.md / SETUP.md.

## Decisions & open questions

- (filled in as the session goes)

## Deviations from the spec

- (filled in as the session goes)
