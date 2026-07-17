---
spec: 05
title: AI parsing pipeline (STT, Claude extraction, confirmation flow)
depends_on: [02, 03, 04]
complexity: high
---

# 05 — AI parsing pipeline: STT → Claude → conferma → materializzazione

## Goal

The heart of the product. An inbound message (voice/photo/PDF/text) is transcribed if needed, parsed by Claude into structured items (deadlines, expenses, therapies, medications), proposed to the user for confirmation (Telegram inline buttons and/or in-app inbox), and on confirmation materialized into the domain tables.

## Scope

- STT provider interface (Groq Whisper default, OpenAI optional).
- Claude client + the extraction prompt (Italian, verbatim below) with structured output via tool use.
- `parse_result` Zod schema (canonical shape stored in `inbox_messages.parse_result`).
- Real `ingestInboundMessage()` body (replaces spec 04 stub, same signature).
- Telegram confirmation message with inline keyboard + `callback_query` handling.
- In-app **Inbox** page (`/inbox`): pending items, edit form, confirm/reject.
- Materialization: confirmed items → `deadlines` / `transactions` / `therapies`(+intakes) / `medications`.

**Non-scope:** reminders (07), dashboard (08), medicine-box photo enrichment details (09 — but the `medication` item type is created here), conversational editing via chat (post-MVP).

## 1. STT — `src/lib/ai/stt.ts`

```ts
export interface SttProvider { transcribe(audio: Buffer, mimeType: string): Promise<string>; }
export function getSttProvider(): SttProvider  // switches on env STT_PROVIDER: 'groq' (default) | 'openai'
```
- **Groq**: POST `https://api.groq.com/openai/v1/audio/transcriptions` (multipart: file, `model=whisper-large-v3-turbo`, `language=it`, `response_format=text`), bearer `GROQ_API_KEY`. Plain `fetch` + `FormData` — no SDK dependency needed.
- **OpenAI**: same OpenAI-compatible endpoint shape at `https://api.openai.com/v1/audio/transcriptions` with `model=whisper-1`, key `OPENAI_API_KEY`.
- Env additions to `.env.example` + `env.ts`: `STT_PROVIDER` (optional, default `groq`), `GROQ_API_KEY`, `OPENAI_API_KEY` (optional). Comment: Groq has a free tier — get a key at console.groq.com.
- Errors: throw `SttError` with a readable message; the pipeline converts it to `status='failed'` + Italian user reply.

## 2. Claude client — `src/lib/ai/claude.ts`

- `@anthropic-ai/sdk`; model from `ANTHROPIC_MODEL` (default `claude-sonnet-5`), `max_tokens: 2048`. Env: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (optional).
- Structured output via **tool use**: define one tool `report_extraction` whose `input_schema` is the JSON Schema equivalent of `ParseResultSchema` (§3) and call with `tool_choice: { type: "tool", name: "report_extraction" }`. Parse the tool input with Zod; on validation failure retry **once** appending the validation error to the conversation; then fail.
- Content assembly per content type:
  - `text` → user text.
  - `voice` → transcription text (from §1), prefixed `Trascrizione di un messaggio vocale:`.
  - `photo` → image content block (base64) + optional caption.
  - `document` (PDF) → document content block (base64, `application/pdf`) + optional caption.

## 3. Parse result schema — `src/lib/ai/parse-schema.ts`

The canonical shape stored (JSON string) in `inbox_messages.parse_result`. Zod:

```ts
const DeadlineItem = z.object({
  type: z.literal('deadline'),
  title: z.string(),                       // short Italian, e.g. "Bollo Panda"
  category: z.enum(DEADLINE_CATEGORIES),   // from spec 02 schema exports
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount_cents: z.number().int().positive().nullable(),
  recurrence: z.enum(['none','monthly','bimonthly','quarterly','semiannual','annual','biennial']),
  asset_id: z.string().nullable(),         // matched existing asset, or null
  asset_suggestion: z.string().nullable(), // e.g. "Panda di Giulia" if no match but an asset seems implied
});
const TransactionItem = z.object({
  type: z.literal('transaction'),          // an ALREADY-PAID expense
  title: z.string(), category: z.enum(DEADLINE_CATEGORIES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount_cents: z.number().int().positive(),
  asset_id: z.string().nullable(), asset_suggestion: z.string().nullable(),
});
const TherapyItem = z.object({
  type: z.literal('therapy'),
  medication_name: z.string(), dosage_text: z.string(),
  times_per_day: z.number().int().min(1).max(6),
  duration_days: z.number().int().positive().nullable(),
  person_asset_id: z.string().nullable(), person_suggestion: z.string().nullable(),
});
const MedicationItem = z.object({
  type: z.literal('medication'),
  name: z.string(), aic_code: z.string().nullable(),
  format: z.string().nullable(), expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});
export const ParseResultSchema = z.object({
  items: z.array(z.discriminatedUnion('type', [DeadlineItem, TransactionItem, TherapyItem, MedicationItem])),
  summary_it: z.string(),   // 1–2 frasi in italiano che riassumono cosa è stato capito
  confidence: z.enum(['high','medium','low']),
  notes: z.string().nullable(), // dubbi o informazioni non catturate dagli item
});
```

`items` may be empty (nothing actionable — e.g. small talk): then the pipeline replies conversationally with `summary_it` and sets status `parsed` with no confirmation buttons.

## 4. The extraction prompt — `src/lib/ai/prompts.ts`

System prompt, **verbatim** (string constant `EXTRACTION_SYSTEM_PROMPT`; the `{{...}}` placeholders are interpolated at call time):

```
Sei l'assistente di FamilySherpa, un'app che gestisce le scadenze e le spese di una famiglia italiana. Ricevi messaggi (testo, trascrizioni di vocali, foto o PDF) inviati da un familiare e devi estrarre gli elementi actionable usando lo strumento report_extraction.

Oggi è {{today}} (timezone Europe/Rome).

Gli asset della famiglia sono:
{{assets_list}}

Regole di estrazione:
1. Estrai SOLO ciò che è presente nel messaggio: non inventare importi, date o targhe. Se un dato manca, usa null.
2. Date: converti sempre in formato YYYY-MM-DD. Espressioni relative ("giovedì prossimo", "fra due settimane", "entro fine mese") vanno risolte rispetto a oggi. Se il messaggio indica solo un mese ("a settembre"), usa il giorno 1 e segnalalo in notes.
3. Importi: sempre in centesimi di euro (es. "87,50 €" → 8750). Distingui tra scadenza futura da pagare (deadline) e spesa già sostenuta (transaction): "ho pagato", "abbiamo speso" → transaction; "da pagare", "scade", un avviso PagoPA → deadline.
4. Categorie: bollo, revisione, rca (assicurazione veicolo), tagliando (manutenzione veicolo), documento (carta d'identità, passaporto, patente, tessera sanitaria), bolletta (luce, gas, acqua, internet), condominio, tari (rifiuti), medico (visite, esami, ticket), farmaco, abbonamento, altro. Nel dubbio usa altro.
5. Burocrazia italiana: un avviso PagoPA contiene codice avviso, ente creditore, importo e data di scadenza: estraili (il codice avviso va in notes). La TARI è spesso divisa in rate: ogni rata con la sua data è una deadline separata. Il bollo auto è annuale (recurrence: annual). La revisione è biennale (biennial). L'assicurazione RCA è tipicamente annuale o semestrale.
6. Ricorrenza: imposta recurrence solo se il messaggio o la natura della scadenza la implica chiaramente (bollo → annual, revisione → biennial, bolletta bimestrale → bimonthly); altrimenti none.
7. Associazione asset: se il messaggio riferisce chiaramente un asset esistente (targa, nome del veicolo, nome del familiare, "casa"), usa il suo id in asset_id. Se implica un asset che non esiste ancora, lascia asset_id null e proponi il nome in asset_suggestion.
8. Terapie: frasi come "antibiotico alla bimba 2 volte al giorno per una settimana" → un item therapy con times_per_day e duration_days. Identifica la persona tra gli asset (person_asset_id) o proponila (person_suggestion).
9. Farmaci: la foto di una confezione di farmaco → item medication con nome, formato e, se leggibili, codice AIC (9 cifre) e data di scadenza.
10. summary_it: 1-2 frasi in italiano, tono amichevole e asciutto, che elencano cosa hai capito (es. "Ho trovato una scadenza: bollo della Panda, 87,50 €, entro il 31/01."). Se items è vuoto, spiega brevemente perché non c'è nulla da salvare.
11. confidence: high se dati chiari e completi; medium se hai interpretato qualcosa; low se il messaggio è ambiguo o il documento poco leggibile (spiega in notes).
```

`{{assets_list}}` format, one per line: `- id: <uuid> | tipo: vehicle | nome: Panda di Giulia | targa: AB123CD` (plate/birth-year detail only when present; person lines include `nato/a: YYYY-MM-DD` when known — decrypt nothing: CF is never sent to the LLM).

Include in `src/lib/ai/prompts.ts` a `FEW_SHOT_EXAMPLES` array (used as prior user/assistant turns before the real message) with **exactly these 3 examples** (assistant turns are `report_extraction` tool calls):
1. *Voice transcription*: "Allora, ho prenotato il tagliando della Panda per giovedì prossimo, dovrebbero essere sui 250 euro" → 1 deadline (`tagliando`, next Thursday resolved from `{{today}}`, 25000, recurrence none, asset matched to the vehicle), confidence high.
2. *Text*: "pagato oggi 62€ di luce" → 1 transaction (`bolletta`, today, 6200, asset matched to home if present), confidence high.
3. *Text*: "domani antibiotico a Sofia ogni 8 ore per 5 giorni" → 1 therapy (times_per_day 3, duration_days 5, person matched/suggested "Sofia"), confidence high.

## 5. Pipeline — `src/lib/inbound/ingest.ts` (replace stub body; same signature)

1. Insert `inbox_messages` row (`status='received'`) as in spec 04.
2. `voice` → STT → save `transcription`.
3. Build asset list (family's non-archived assets), call Claude, Zod-validate → save `parse_result`, `status='parsed'`. On STT/LLM/validation failure: `status='failed'`, `parse_error`, reply "😓 Non sono riuscito ad analizzare il messaggio. Riprova o inseriscilo dall'app." (still return normally — never crash the webhook).
4. Reply composition:
   - `items` empty → reply `summary_it` only.
   - otherwise → reply `summary_it` + bullet list of items (each as `• <emoji per type: 📅 deadline / 💸 transaction / 💊 therapy|medication> <title/name> — <formatted date> — <formatted €>` when fields present, plus `⚠️ <notes>` if confidence ≠ high) + inline keyboard.
5. Telegram inline keyboard rows: `[✅ Conferma tutto] [❌ Annulla]` / `[✏️ Modifica nell'app]` (URL button to `${NEXT_PUBLIC_APP_URL}/inbox/<id>`). Store the sent message id in `telegram_confirmation_message_id`. For `channel='app'`, skip Telegram and let the Inbox UI handle it.

### Callback handling (extends spec 04 bot)

`callback_query` data `confirm:<inboxMessageId>` / `reject:<inboxMessageId>`:
- Verify the chat's linked user belongs to the message's family.
- `confirm` → run materialization (§6) → edit the original message (remove keyboard, append "✅ Salvato!"), `answerCallbackQuery`.
- `reject` → `status='rejected'`, edit message appending "❌ Annullato."
- Already-processed message → answer callback with "Già gestito." and do nothing.

## 6. Materialization — `src/lib/inbound/materialize.ts`

`materializeInboxMessage(inboxMessageId, itemsOverride?)` — inside a transaction:
- `deadline` item → insert `deadlines` (`source='parser'`, `source_message_id`, map fields 1:1; `notes` from parse → `notes_enc` encrypted).
- `transaction` item → insert `transactions` (`source='parser'`).
- `therapy` item → insert `therapies`: default `times` by `times_per_day` (1→`["08:00"]`, 2→`["08:00","20:00"]`, 3→`["08:00","14:00","20:00"]`, 4→`["08:00","12:00","16:00","20:00"]`, 5–6 spread evenly 08–22), `start_date` = today (Europe/Rome), `end_date` = start + duration_days − 1 when present, `active=1`. (Intake generation is spec 07's cron; do not generate here.)
- `medication` item → insert `medications`.
- `asset_suggestion`/`person_suggestion` with null id → create the asset (type `vehicle` if the suggestion clearly names a vehicle — heuristic: matched by the item category being bollo/revisione/rca/tagliando; `person` for therapy suggestions; else `other`) and link it.
- Set `status='confirmed'`. Idempotent: refuse to run if status is already `confirmed`.
- `itemsOverride` lets the Inbox edit form pass user-corrected items (same Zod schema).

## 7. Inbox UI — `(app)/inbox`

- **List page**: `inbox_messages` for the family, newest first, grouped by status: "Da confermare" (`parsed`), then collapsed "Storico" (`confirmed`/`rejected`/`failed`). Card: channel icon, content-type icon, `summary_it` (or `parse_error`), relative time, sender name.
- **Detail page `/inbox/[id]`**: transcription/raw text block; editable form of parsed items (per-item fields matching the Zod schema; date pickers, € input converting to cents, asset select from family assets, remove-item button); buttons **"Conferma"** (server action → materialize with overrides) and **"Rifiuta"**. After confirm, redirect to the relevant hub with a success toast.
- In-app upload (the `app` channel): on `/inbox`, an upload/record button accepting audio/image/PDF files (max 10 MB) + a text field → server action builds `InboundMessage` with `channel:'app'` and runs the same `ingestInboundMessage`. (Voice *recording* UI: `MediaRecorder` capturing `audio/webm`; Groq accepts webm. Keep it minimal — record/stop/send.)

## Acceptance criteria

1. Unit tests: `ParseResultSchema` accepts/rejects fixture payloads; therapy `times` defaulting; relative-date resolution helper (if extracted as a utility) — all pure logic tested.
2. Sending the bot a text "devo pagare il bollo della Panda entro il 31 gennaio, 87,50€" produces a Telegram reply with summary + buttons; **Conferma** creates a `deadlines` row (category `bollo`, 8750, recurrence annual, linked to the vehicle asset from seed) and edits the Telegram message to "✅ Salvato!".
3. A voice note in Italian gets transcribed (visible in inbox detail) and parsed end-to-end.
4. A PagoPA-style PDF (or photo of a bill) produces a deadline with amount and due date; the avviso code appears in notes.
5. "ho pagato 60 euro di luce" creates a `transactions` row on confirm, not a deadline.
6. "antibiotico a Sofia 2 volte al giorno per 5 giorni" creates a therapy with `times ["08:00","20:00"]`, correct start/end dates.
7. In-app upload of an image produces the same flow through the Inbox UI, including edit-then-confirm with modified amount.
8. LLM returning malformed output triggers one retry, then `failed` status with the Italian error reply; the webhook still returns 200.
9. Confirm tapped twice does not duplicate rows.

## Implementation prompt

> **Run with:** Opus 4.8 (`claude-opus-4-8`), reasoning effort **high** — set via `/model` before pasting. (Core spec: multi-component pipeline, error paths, Telegram callback state.)

```
Read docs/specs/00-overview.md first, then implement docs/specs/05-ai-parsing-pipeline.md
in this repository, following CLAUDE.md.

This is the core spec of the product — implement the prompt text, Zod schemas
and few-shot examples EXACTLY as written in the spec. Replace the body of
ingestInboundMessage from spec 04 keeping its signature. Use tables from
spec 02 as-is. Follow the "Definition of done" in 00-overview.md §9. Commit
in logical steps.

When you are finished: summarize what was implemented, list any deviations
from the spec and why, and tell me exactly what to test manually and how —
give me a numbered end-to-end test script (exact messages to send to the bot,
files to upload, buttons to press) with the expected replies and the expected
DB rows, plus which env vars (ANTHROPIC_API_KEY, GROQ_API_KEY, ...) I must set.
```
