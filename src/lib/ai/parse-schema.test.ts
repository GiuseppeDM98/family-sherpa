import { describe, expect, it } from "vitest";
import {
  dropUnknownReferences,
  PARSE_RESULT_JSON_SCHEMA,
  ParseResultSchema,
  type ParseResult,
} from "./parse-schema";

const VEHICLE_ID = "11111111-1111-1111-1111-111111111111";
const PERSON_ID = "22222222-2222-2222-2222-222222222222";
const DEADLINE_ID = "44444444-4444-4444-4444-444444444444";

function deadlinePayload(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        type: "deadline",
        title: "Bollo Panda",
        category: "bollo",
        due_date: "2026-01-31",
        amount_cents: 8750,
        recurrence: "annual",
        asset_id: VEHICLE_ID,
        asset_suggestion: null,
        remind_at: null,
        ...overrides,
      },
    ],
    summary_it: "Ho trovato una scadenza: bollo della Panda, 87,50 €, entro il 31/01.",
    confidence: "high",
    notes: null,
  };
}

describe("ParseResultSchema", () => {
  it("accepts a deadline item", () => {
    expect(ParseResultSchema.safeParse(deadlinePayload()).success).toBe(true);
  });

  it("accepts a transaction, a therapy and a medication in one payload", () => {
    const payload = {
      items: [
        {
          type: "transaction",
          title: "Bolletta luce",
          category: "bolletta",
          date: "2026-07-17",
          amount_cents: 6200,
          asset_id: null,
          asset_suggestion: "Casa",
        },
        {
          type: "therapy",
          medication_name: "Amoxicillina",
          dosage_text: "1 misurino ogni 8 ore",
          times_per_day: 3,
          duration_days: 5,
          person_asset_id: PERSON_ID,
          person_suggestion: null,
        },
        {
          type: "medication",
          name: "Tachipirina 500mg",
          aic_code: "012745062",
          format: "20 compresse",
          expiry_date: "2027-05-31",
        },
      ],
      summary_it: "Ho capito tre cose.",
      confidence: "medium",
      notes: "Il mese non era chiarissimo.",
    };
    expect(ParseResultSchema.safeParse(payload).success).toBe(true);
  });

  it("accepts an empty items array (nothing actionable)", () => {
    const result = ParseResultSchema.safeParse({
      items: [],
      summary_it: "Non ho trovato nulla da salvare in questo messaggio.",
      confidence: "high",
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a deadline with a null amount", () => {
    expect(ParseResultSchema.safeParse(deadlinePayload({ amount_cents: null })).success).toBe(
      true,
    );
  });

  it("accepts a deadline with a custom reminder date", () => {
    expect(
      ParseResultSchema.safeParse(deadlinePayload({ remind_at: "2026-01-24" })).success,
    ).toBe(true);
  });

  it("rejects a deadline whose remind_at is not YYYY-MM-DD", () => {
    expect(
      ParseResultSchema.safeParse(deadlinePayload({ remind_at: "24/01/2026" })).success,
    ).toBe(false);
  });

  it("accepts a complete_deadline item (paid, with an actual amount)", () => {
    const result = ParseResultSchema.safeParse({
      items: [
        {
          type: "complete_deadline",
          deadline_id: DEADLINE_ID,
          match_label: "Tagliando Opel",
          actual_amount_cents: 25400,
          completed_date: "2026-07-21",
        },
      ],
      summary_it: "Segno come fatto il tagliando dell'Opel.",
      confidence: "high",
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a complete_deadline item with no amount and no date (done, today)", () => {
    const result = ParseResultSchema.safeParse({
      items: [
        {
          type: "complete_deadline",
          deadline_id: DEADLINE_ID,
          match_label: "Visita pediatra",
          actual_amount_cents: null,
          completed_date: null,
        },
      ],
      summary_it: "Segno come fatta la visita.",
      confidence: "high",
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a due date that is not YYYY-MM-DD", () => {
    expect(ParseResultSchema.safeParse(deadlinePayload({ due_date: "31/01/2026" })).success).toBe(
      false,
    );
  });

  it("rejects an unknown category", () => {
    expect(ParseResultSchema.safeParse(deadlinePayload({ category: "benzina" })).success).toBe(
      false,
    );
  });

  it("rejects an unknown recurrence", () => {
    expect(ParseResultSchema.safeParse(deadlinePayload({ recurrence: "weekly" })).success).toBe(
      false,
    );
  });

  it("rejects a non-integer amount (euros leaked in as a float)", () => {
    expect(ParseResultSchema.safeParse(deadlinePayload({ amount_cents: 87.5 })).success).toBe(
      false,
    );
  });

  it("rejects a negative amount", () => {
    expect(ParseResultSchema.safeParse(deadlinePayload({ amount_cents: -8750 })).success).toBe(
      false,
    );
  });

  it("rejects an unknown item type", () => {
    const result = ParseResultSchema.safeParse({
      items: [{ type: "reminder", title: "Boh" }],
      summary_it: "…",
      confidence: "low",
      notes: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a transaction without an amount (an expense always has one)", () => {
    const result = ParseResultSchema.safeParse({
      items: [
        {
          type: "transaction",
          title: "Bolletta luce",
          category: "bolletta",
          date: "2026-07-17",
          amount_cents: null,
          asset_id: null,
          asset_suggestion: null,
        },
      ],
      summary_it: "…",
      confidence: "high",
      notes: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a therapy taken more than 6 times a day", () => {
    const result = ParseResultSchema.safeParse({
      items: [
        {
          type: "therapy",
          medication_name: "Amoxicillina",
          dosage_text: "ogni ora",
          times_per_day: 24,
          duration_days: 1,
          person_asset_id: null,
          person_suggestion: "Sofia",
        },
      ],
      summary_it: "…",
      confidence: "low",
      notes: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing summary", () => {
    const payload = deadlinePayload();
    const result = ParseResultSchema.safeParse({ ...payload, summary_it: undefined });
    expect(result.success).toBe(false);
  });
});

describe("PARSE_RESULT_JSON_SCHEMA", () => {
  it("describes an object with the four top-level parse-result fields", () => {
    expect(PARSE_RESULT_JSON_SCHEMA.type).toBe("object");
    expect(Object.keys(PARSE_RESULT_JSON_SCHEMA.properties ?? {}).sort()).toEqual([
      "confidence",
      "items",
      "notes",
      "summary_it",
    ]);
  });
});

describe("dropUnknownReferences", () => {
  const known = new Set([VEHICLE_ID, PERSON_ID]);
  const knownDeadlines = new Set([DEADLINE_ID]);

  it("keeps ids that belong to the family", () => {
    const parsed = ParseResultSchema.parse(deadlinePayload());
    expect(dropUnknownReferences(parsed, known, knownDeadlines).items[0]).toMatchObject({
      asset_id: VEHICLE_ID,
    });
  });

  it("nulls out an id the family does not own", () => {
    const parsed = ParseResultSchema.parse(
      deadlinePayload({ asset_id: "99999999-9999-9999-9999-999999999999" }),
    );
    expect(dropUnknownReferences(parsed, known, knownDeadlines).items[0]).toMatchObject({
      asset_id: null,
    });
  });

  it("nulls out an unknown therapy person while keeping the suggestion", () => {
    const parsed: ParseResult = ParseResultSchema.parse({
      items: [
        {
          type: "therapy",
          medication_name: "Amoxicillina",
          dosage_text: "1 misurino ogni 12 ore",
          times_per_day: 2,
          duration_days: 5,
          person_asset_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          person_suggestion: "Sofia",
        },
      ],
      summary_it: "…",
      confidence: "high",
      notes: null,
    });
    expect(dropUnknownReferences(parsed, known, knownDeadlines).items[0]).toMatchObject({
      person_asset_id: null,
      person_suggestion: "Sofia",
    });
  });

  it("leaves medication items untouched", () => {
    const parsed = ParseResultSchema.parse({
      items: [
        {
          type: "medication",
          name: "Tachipirina 500mg",
          aic_code: null,
          format: null,
          expiry_date: null,
        },
      ],
      summary_it: "…",
      confidence: "high",
      notes: null,
    });
    expect(dropUnknownReferences(parsed, known, knownDeadlines)).toEqual(parsed);
  });

  it("keeps a complete_deadline that references a real open deadline", () => {
    const parsed = ParseResultSchema.parse({
      items: [
        {
          type: "complete_deadline",
          deadline_id: DEADLINE_ID,
          match_label: "Tagliando Opel",
          actual_amount_cents: 25400,
          completed_date: "2026-07-21",
        },
      ],
      summary_it: "…",
      confidence: "high",
      notes: null,
    });
    expect(dropUnknownReferences(parsed, known, knownDeadlines).items).toHaveLength(1);
  });

  it("drops a complete_deadline whose deadline_id is not a known open deadline", () => {
    const parsed = ParseResultSchema.parse({
      items: [
        {
          type: "complete_deadline",
          deadline_id: "esempio-scadenza",
          match_label: "Tagliando Opel",
          actual_amount_cents: 25400,
          completed_date: "2026-07-21",
        },
      ],
      summary_it: "…",
      confidence: "high",
      notes: null,
    });
    expect(dropUnknownReferences(parsed, known, knownDeadlines).items).toHaveLength(0);
  });
});
