import { addDaysToYmd, nextWeekdayAfter } from "@/lib/date";
import type { ParseResult } from "./parse-schema";

/**
 * The extraction prompt (docs/specs/05-ai-parsing-pipeline.md §4).
 *
 * The prompt text and the three few-shot examples are reproduced verbatim from
 * the spec — they are the product, not an implementation detail, so edit them
 * in the spec first. Per project convention (00-overview.md §6) everything the
 * LLM reads is Italian; the code around it stays English.
 */

export const EXTRACTION_SYSTEM_PROMPT = `Sei l'assistente di FamilySherpa, un'app che gestisce le scadenze e le spese di una famiglia italiana. Ricevi messaggi (testo, trascrizioni di vocali, foto o PDF) inviati da un familiare e devi estrarre gli elementi actionable usando lo strumento report_extraction.

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
11. confidence: high se dati chiari e completi; medium se hai interpretato qualcosa; low se il messaggio è ambiguo o il documento poco leggibile (spiega in notes).`;

export const EXTRACTION_TOOL_NAME = "report_extraction";

/** An asset as the prompt sees it — never the encrypted CF (spec 05 §4). */
export type PromptAsset = {
  id: string;
  type: "vehicle" | "person" | "home" | "other";
  name: string;
  plate?: string;
  birthDate?: string;
};

const NO_ASSETS_LINE = "(nessun asset registrato)";

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

export function buildExtractionSystemPrompt(
  today: string,
  assets: readonly PromptAsset[],
): string {
  return EXTRACTION_SYSTEM_PROMPT.replace("{{today}}", today).replace(
    "{{assets_list}}",
    formatAssetsList(assets),
  );
}

/**
 * The three few-shot examples from spec 05 §4.
 *
 * Dates are placeholders resolved against the real `today` at call time: the
 * examples teach relative-date resolution ("giovedì prossimo"), which only
 * works if the answer is consistent with the `{{today}}` in the system prompt.
 * The asset ids are placeholders too — the model is meant to imitate the shape
 * of a match, not these ids, and `dropUnknownAssetIds` catches it if it copies
 * one literally.
 */
const EXAMPLE_VEHICLE_ID = "11111111-1111-1111-1111-111111111111";
const EXAMPLE_HOME_ID = "22222222-2222-2222-2222-222222222222";
const EXAMPLE_PERSON_ID = "33333333-3333-3333-3333-333333333333";

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
