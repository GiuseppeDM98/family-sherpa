# Session notes — spec 05: AI parsing pipeline (2026-07-17)

Working notes for the session implementing `docs/specs/05-ai-parsing-pipeline.md`.
The durable parts are already folded into `CLAUDE.md` (what was built) and
`AGENTS.md` (gotchas); this file keeps the reasoning behind the judgement calls,
which is what a reviewer of the diff would otherwise have to reconstruct.

## Summary

**What.** Spec 05 end to end, in 10 commits: the STT provider interface
(`src/lib/ai/stt.ts` — Groq default, OpenAI optional); the Claude extraction
client (`claude.ts` — forced tool use, Zod-validated, one re-prompt on a schema
violation); the parse-result schema and the verbatim Italian prompt with its
three few-shot examples (`parse-schema.ts`, `prompts.ts`); the real
`ingestInboundMessage` body replacing spec 04's stub, keeping its signature
(`inbound/ingest.ts`); the Telegram confirmation keyboard and `callback_query`
handling (`telegram/outbound.ts`, `telegram/bot.ts`); transactional, idempotent
materialization into `deadlines` / `transactions` / `therapies` / `medications`
(`inbound/materialize.ts`); and the Inbox UI — list, per-item edit form, in-app
upload and voice recording (`(app)/inbox`). Two supporting refactors: a shared
test env fixture, and `src/db/enums.ts`. 123 unit tests; lint, typecheck, test
and build green.

**Why.** Three constraints shaped almost every call. (1) *This code runs inside
the Telegram webhook*, so it must never throw: a non-200 makes Telegram retry,
which re-runs STT and the LLM and re-bills both — hence failures become
`status='failed'` plus an Italian apology, and the pipeline (not the bot) owns
the outbound reply, because the confirmation keyboard and the id of the message
to edit later are pipeline state. (2) *LLM output is untrusted input*, like a
form post: Zod-validated, asset ids checked against the family, one bounded
retry, never a raw value reaching the DB. (3) *The spec is the product*, so the
prompt text, the schema and the few-shot examples are reproduced verbatim and
the deviations below are all forced by something outside it (an API rule, a
webpack constraint, a missing component) rather than by preference.

**Note.** Three gotchas cost real time and are all written up below and in
`AGENTS.md`: Whisper rejects Telegram's `.oga` extension (every voice note
failed); the model copies few-shot asset ids verbatim, so they must not be
uuid-shaped; and importing anything from `schema.ts` in a client component drags
`node:crypto` into the browser bundle — a failure only `pnpm build` catches, not
lint or typecheck. Still untested by hand: **PDF and photo** ingestion (text and
voice are verified end-to-end against the real APIs, materialization against a
throwaway SQLite). Also unresolved by design: a message can still get stuck at
`status='received'` if the function dies mid-run (e.g. the 60 s Vercel limit) —
recovering orphans needs a cron, so it belongs to spec 07.

## Decisions the spec left open

- **Who sends the Telegram reply.** `ingestInboundMessage` keeps its spec 04
  signature (`{ inboxMessageId, reply }`), but the confirmation carries an inline
  keyboard *and* its sent message id must be stored for later editing — both
  pipeline state. So the pipeline sends it, and `bot.ts` no longer sends the
  returned `reply`; that value now serves the `app` channel, whose UI renders it
  itself. The alternative (returning a keyboard descriptor for the bot to send)
  would have changed the signature.
- **`thinking: { type: "disabled" }`** on the extraction call. The spec fixes
  `max_tokens: 2048`; on `claude-sonnet-5` adaptive thinking is on by default and
  would eat into that budget, risking truncated tool input. Extraction is a
  shape-filling task with three few-shot examples doing the steering. Caveat:
  models that cannot disable thinking (the Fable family) would 400 — the
  supported values of `ANTHROPIC_MODEL` are the Opus/Sonnet families.
- **Tool JSON Schema derived from Zod** (`z.toJSONSchema`) rather than
  hand-written. The spec says "the JSON Schema equivalent of ParseResultSchema";
  two hand-kept copies that disagree fail *every* extraction, and nothing else in
  the build would catch the drift.
- **Few-shot dates are placeholders** resolved per call. The examples teach
  relative-date resolution ("giovedì prossimo"); a frozen date would contradict
  the `{{today}}` interpolated into the system prompt three lines above.
  `FEW_SHOT_EXAMPLES` remains an exported array as the spec asks, with a
  `resolveFewShotExample()` applied at call time.
- **Few-shot `tool_result` turns.** The spec describes the examples as prior
  user/assistant turns with tool-call assistant sides. The API additionally
  requires every `tool_use` to be answered by a `tool_result` and roles to
  alternate, so each example's acknowledgement rides at the head of the following
  user turn. Not a deviation — a constraint the spec doesn't mention.
- **`dropUnknownAssetIds`** (not in the spec). An asset id the model invents or
  copies would otherwise reach the DB as a foreign-key violation at confirmation
  time, far from its cause. Nulling it degrades to "no asset linked", which the
  user can fix in the Inbox form.

## Found by manual testing (post-implementation)

**Every Telegram voice note failed.** Groq returned `400 file must be one of the
following types: [flac mp3 mp4 mpeg mpga m4a ogg opus wav webm]`. The STT upload
was named `audio.oga` because Telegram serves voice notes as `.oga`, and `oga`
isn't on Whisper's list. Fixed by deriving the upload name from the mime type
(`audio/ogg → audio.ogg`) and pinning the accepted-extension list in a test.
Verified by re-running the actual failed voice note: transcribed correctly.
Worth noting the pipeline behaved as designed around the bug — `status='failed'`,
`parse_error` stored and visible in the Inbox detail, Italian apology in chat,
webhook still 200 — which is how the cause was identifiable at all.

## Found by verification (worth knowing)

Driving the real API surfaced a failure the schema could not: **the model copies
few-shot asset ids verbatim** instead of matching the real asset list. With
uuid-shaped example ids, "ho pagato 60 euro di luce" came back linked to a
*person* — the example's home id collided with a real asset. Example ids are now
`esempio-asset-casa`-shaped, which `crypto.randomUUID()` can never produce, so a
copied id is always dropped. After the fix the three example messages match
Panda / Casa / Sofia correctly. (Also in `AGENTS.md`.)

## Deviations from the spec

1. **`therapies.times` for 5–6 doses/day** are spread over **08:00–22:00**, not
   around the clock. The spec says "5–6 spread evenly 08–22"; this is that,
   spelled out — noted only because the resulting times (11:30, 13:36…) look
   arbitrary without the reasoning.
2. **Reply bullet for a therapy** shows `dosage_text` where the spec's template
   has "`<formatted date>`". A therapy has no date; the spec's own rule is "when
   fields present", and a bare medication name reads as a stub.
3. **Native `<select>`** in the Inbox edit form instead of a shadcn Select — the
   project has no Select component installed, and adding one via the shadcn CLI
   was out of scope for this spec.
4. **`src/db/enums.ts`** (new file) — spec 02 says all tables and enums live in
   `schema.ts`. Client components need the category/recurrence vocabularies, and
   importing them from `schema.ts` breaks the webpack build (`node:crypto`).
   `schema.ts` re-exports them, so spec 02's "import from `@/db/schema`" contract
   is intact.
5. **Confirming in the app also edits the Telegram message** (spec only describes
   the reverse direction). Without it, deciding in the app leaves live buttons in
   the chat.

## Not done here (belongs to other specs)

- Reminders / intake generation for the therapies created here — spec 07's cron.
- An expenses hub: `materializationTarget()` sends a confirmed transaction to
  `/deadlines` because there is nowhere else yet (spec 08).
- Medicine-box photo enrichment beyond the `medication` item type — spec 09.
