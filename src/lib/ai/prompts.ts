import { addDaysToYmd, nextWeekdayAfter } from "@/lib/date";
import { formatEuroCents } from "@/lib/format";
import type { ParseResult } from "./parse-schema";

/**
 * The extraction prompt.
 *
 * The prompt text and the few-shot examples are the product, not an
 * implementation detail. Per project convention everything the LLM reads is
 * Italian; the code around it stays English.
 */

export const EXTRACTION_SYSTEM_PROMPT = `Sei l'assistente di FamilySherpa, un'app che gestisce le scadenze e le spese di una famiglia italiana. Ricevi messaggi (testo, trascrizioni di vocali, foto o PDF) inviati da un familiare e devi estrarre gli elementi actionable usando lo strumento report_extraction.

Oggi è {{today}} (timezone Europe/Rome).
{{sender_line}}
Gli asset della famiglia sono:
{{assets_list}}

Le scadenze aperte (ancora da pagare o da fare) sono:
{{open_deadlines}}

Regole di estrazione:
1. Estrai SOLO ciò che è presente nel messaggio: non inventare importi, date o targhe. Se un dato manca, usa null.
2. Date: converti sempre in formato YYYY-MM-DD. Espressioni relative ("giovedì prossimo", "fra due settimane", "entro fine mese") vanno risolte rispetto a oggi. Se il messaggio indica solo un mese ("a settembre"), usa il giorno 1 e segnalalo in notes.
3. Importi: sempre in centesimi di euro (es. "87,50 €" → 8750). Distingui tra scadenza futura da pagare (deadline) e spesa già sostenuta (transaction): "ho pagato", "abbiamo speso" → transaction; "da pagare", "scade", un avviso PagoPA → deadline.
4. Completamento di una scadenza esistente: se il messaggio dice che un obbligo GIÀ registrato è stato svolto o pagato ("ho fatto il tagliando dell'Opel", "ho pagato la bolletta della luce", "ho completato la revisione") e nella lista delle scadenze aperte qui sopra ce n'è una che corrisponde chiaramente, NON creare una nuova deadline né una transaction: usa un item complete_deadline con il suo deadline_id, riporta il titolo in match_label, l'importo effettivo in actual_amount_cents (se indicato, altrimenti null) e la data in completed_date (YYYY-MM-DD, default oggi). Se nessuna scadenza aperta corrisponde, tratta la spesa come transaction.
5. Categorie: bollo, revisione, rca (assicurazione veicolo), tagliando (manutenzione veicolo), documento (carta d'identità, passaporto, patente, tessera sanitaria), bolletta (luce, gas, acqua, internet), condominio, tari (rifiuti), medico (visite, esami, ticket), farmaco, abbonamento, altro. Nel dubbio usa altro.
6. Burocrazia italiana: un avviso PagoPA contiene codice avviso, ente creditore, importo e data di scadenza: estraili (il codice avviso va in notes). La TARI è spesso divisa in rate: ogni rata con la sua data è una deadline separata. Il bollo auto è annuale (recurrence: annual). La revisione è biennale (biennial). L'assicurazione RCA è tipicamente annuale o semestrale.
7. Ricorrenza: imposta recurrence solo se il messaggio o la natura della scadenza la implica chiaramente (bollo → annual, revisione → biennial, bolletta bimestrale → bimonthly); altrimenti none.
8. Associazione asset: se il messaggio riferisce chiaramente un asset esistente (targa, nome del veicolo, nome del familiare, "casa"), usa il suo id in asset_id. Se implica un asset che non esiste ancora, lascia asset_id null e proponi il nome in asset_suggestion.
9. Terapie: frasi come "antibiotico alla bimba 2 volte al giorno per una settimana" → un item therapy con times_per_day e duration_days. Identifica la persona tra gli asset (person_asset_id) o proponila (person_suggestion). Se il messaggio riguarda una persona ma non la nomina esplicitamente (es. "ricordami di prendere la medicina", "devo iniziare l'antibiotico"), la persona di riferimento è chi ti scrive: se esiste già un asset persona con quel nome usa il suo id in person_asset_id, altrimenti proponi quel nome in person_suggestion.
10. Farmaci: la foto di una confezione di farmaco → item medication con nome, formato e, se leggibili, codice AIC (9 cifre) e data di scadenza.
11. Data di promemoria (deadline.remind_at): se il messaggio chiede esplicitamente di essere avvisato in un momento diverso dalla scadenza stessa (es. "avvisami il 10 ottobre", "ricordamelo il giorno prima"), imposta remind_at (YYYY-MM-DD) risolvendo la data rispetto a oggi; altrimenti null. È un promemoria aggiuntivo, non sostituisce la data di scadenza.
12. summary_it: 1-2 frasi in italiano, tono amichevole e asciutto, che elencano cosa hai capito (es. "Ho trovato una scadenza: bollo della Panda, 87,50 €, entro il 31/01."). Se items è vuoto, spiega brevemente perché non c'è nulla da salvare.
13. confidence: high se dati chiari e completi; medium se hai interpretato qualcosa; low se il messaggio è ambiguo o il documento poco leggibile (spiega in notes).`;

export const EXTRACTION_TOOL_NAME = "report_extraction";

/** An asset as the prompt sees it — never the encrypted CF. */
export type PromptAsset = {
  id: string;
  type: "vehicle" | "person" | "home" | "other";
  name: string;
  plate?: string;
  birthDate?: string;
};

/**
 * An open (pending) deadline as the prompt sees it, so the model can match
 * "ho fatto il tagliando dell'Opel" against a real obligation and complete it
 * (complete_deadline) instead of duplicating it.
 */
export type PromptOpenDeadline = {
  id: string;
  title: string;
  assetName: string | null;
  dueDate: string;
  amountCents: number | null;
};

const NO_ASSETS_LINE = "(nessun asset registrato)";
const NO_OPEN_DEADLINES_LINE = "(nessuna scadenza aperta)";

/**
 * One line per asset: `- id: <uuid> | tipo: vehicle | nome: Panda di Giulia | targa: AB123CD`
 * Optional details appear only when known, so the model never sees an empty
 * field it might try to fill in.
 */
export function formatAssetsList(assets: readonly PromptAsset[]): string {
  if (assets.length === 0) return NO_ASSETS_LINE;

  return assets
    .map((asset) => {
      const parts = [`- id: ${asset.id}`, `tipo: ${asset.type}`, `nome: ${asset.name}`];
      if (asset.plate) parts.push(`targa: ${asset.plate}`);
      if (asset.birthDate) parts.push(`nato/a: ${asset.birthDate}`);
      return parts.join(" | ");
    })
    .join("\n");
}

/**
 * One line per open deadline: `- id: <uuid> | titolo: Tagliando Opel | asset: Opel Corsa | scade: 2026-02-15 | stimato: 230,00 €`.
 * Asset and estimated amount appear only when known — same reasoning as the
 * asset list.
 */
export function formatOpenDeadlines(deadlines: readonly PromptOpenDeadline[]): string {
  if (deadlines.length === 0) return NO_OPEN_DEADLINES_LINE;

  return deadlines
    .map((deadline) => {
      const parts = [`- id: ${deadline.id}`, `titolo: ${deadline.title}`];
      if (deadline.assetName) parts.push(`asset: ${deadline.assetName}`);
      parts.push(`scade: ${deadline.dueDate}`);
      if (deadline.amountCents !== null) parts.push(`stimato: ${formatEuroCents(deadline.amountCents)}`);
      return parts.join(" | ");
    })
    .join("\n");
}

/** The "chi ti scrive è …" line, or empty when the sender's name is unknown. */
function formatSenderLine(senderName?: string): string {
  const name = senderName?.trim();
  return name ? `Chi ti scrive è ${name}.` : "";
}

export function buildExtractionSystemPrompt(
  today: string,
  assets: readonly PromptAsset[],
  openDeadlines: readonly PromptOpenDeadline[] = [],
  senderName?: string,
): string {
  return EXTRACTION_SYSTEM_PROMPT.replace("{{today}}", today)
    .replace("{{sender_line}}", formatSenderLine(senderName))
    .replace("{{assets_list}}", formatAssetsList(assets))
    .replace("{{open_deadlines}}", formatOpenDeadlines(openDeadlines));
}

/**
 * The few-shot examples.
 *
 * Dates are placeholders resolved against the real `today` at call time: the
 * examples teach relative-date resolution ("giovedì prossimo"), which only
 * works if the answer is consistent with the `{{today}}` in the system prompt.
 *
 * The asset and deadline ids are deliberately *not* uuid-shaped. The model is
 * meant to imitate the shape of a match — "the message names something you were
 * given, so put its id here" — but it will sometimes copy an example's id
 * verbatim instead (observed: a uuid-shaped example id was echoed for an
 * unrelated message, and it happened to collide with a real asset of a
 * different type). Real ids come from `crypto.randomUUID()` and can never look
 * like these, so a copied id is always caught by `dropUnknownReferences` and
 * degrades to "no link" rather than silently linking the wrong one.
 */
const EXAMPLE_VEHICLE_ID = "esempio-asset-veicolo";
const EXAMPLE_HOME_ID = "esempio-asset-casa";
const EXAMPLE_PERSON_ID = "esempio-asset-persona";
const EXAMPLE_DEADLINE_ID = "esempio-scadenza";

const NEXT_THURSDAY = "{{next_thursday}}";
const TODAY = "{{today}}";
const TOMORROW = "{{tomorrow}}";

export type FewShotExample = {
  /** The user turn, exactly as the pipeline would build it for a real message. */
  userText: string;
  /** The assistant turn: the `report_extraction` tool input. */
  output: ParseResult;
};

export const FEW_SHOT_EXAMPLES: readonly FewShotExample[] = [
  {
    userText:
      "Trascrizione di un messaggio vocale:\nAllora, ho prenotato il tagliando della Panda per giovedì prossimo, dovrebbero essere sui 250 euro",
    output: {
      items: [
        {
          type: "deadline",
          title: "Tagliando Panda",
          category: "tagliando",
          due_date: NEXT_THURSDAY,
          amount_cents: 25000,
          recurrence: "none",
          asset_id: EXAMPLE_VEHICLE_ID,
          asset_suggestion: null,
          remind_at: null,
        },
      ],
      summary_it: "Ho trovato una scadenza: tagliando della Panda, circa 250,00 €, giovedì.",
      confidence: "high",
      notes: null,
    },
  },
  {
    userText: "pagato oggi 62€ di luce",
    output: {
      items: [
        {
          type: "transaction",
          title: "Bolletta luce",
          category: "bolletta",
          date: TODAY,
          amount_cents: 6200,
          asset_id: EXAMPLE_HOME_ID,
          asset_suggestion: null,
        },
      ],
      summary_it: "Ho registrato una spesa: bolletta della luce, 62,00 €, pagata oggi.",
      confidence: "high",
      notes: null,
    },
  },
  {
    userText: "domani antibiotico a Sofia ogni 8 ore per 5 giorni",
    output: {
      items: [
        {
          type: "therapy",
          medication_name: "Antibiotico",
          dosage_text: "1 dose ogni 8 ore",
          times_per_day: 3,
          duration_days: 5,
          person_asset_id: EXAMPLE_PERSON_ID,
          person_suggestion: null,
        },
      ],
      summary_it: "Ho trovato una terapia per Sofia: antibiotico 3 volte al giorno per 5 giorni.",
      confidence: "high",
      notes: `La terapia inizia domani (${TOMORROW}).`,
    },
  },
  {
    // Completing an already-registered obligation: the message matches an open
    // deadline in the list above, so it's a completion, not a new transaction.
    userText: "fatto il tagliando dell'Opel, mi è costato 254 euro",
    output: {
      items: [
        {
          type: "complete_deadline",
          deadline_id: EXAMPLE_DEADLINE_ID,
          match_label: "Tagliando Opel",
          actual_amount_cents: 25400,
          completed_date: TODAY,
        },
      ],
      summary_it: "Segno come fatto il tagliando dell'Opel e registro la spesa di 254,00 €.",
      confidence: "high",
      notes: null,
    },
  },
];

const THURSDAY = 4;

/** Resolves the `{{...}}` date placeholders in a few-shot example against `today`. */
export function resolveFewShotExample(example: FewShotExample, today: string): FewShotExample {
  const replacements: Record<string, string> = {
    [TODAY]: today,
    [TOMORROW]: addDaysToYmd(today, 1),
    [NEXT_THURSDAY]: nextWeekdayAfter(today, THURSDAY),
  };

  const substituted = JSON.stringify(example.output).replace(
    /\{\{(?:today|tomorrow|next_thursday)\}\}/g,
    (match) => replacements[match] ?? match,
  );

  return { userText: example.userText, output: JSON.parse(substituted) as ParseResult };
}
