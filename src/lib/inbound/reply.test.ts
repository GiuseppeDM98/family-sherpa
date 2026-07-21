import { describe, expect, it } from "vitest";
import type { ParseResult } from "@/lib/ai/parse-schema";
import { composeReply, formatItemLine } from "./reply";

/** Intl separates the amount from "€" with U+00A0; compare against plain spaces. */
function plain(text: string): string {
  return text.replace(/ /g, " ");
}

const DEADLINE_RESULT: ParseResult = {
  items: [
    {
      type: "deadline",
      title: "Bollo Panda",
      category: "bollo",
      due_date: "2026-01-31",
      amount_cents: 8750,
      recurrence: "annual",
      asset_id: null,
      asset_suggestion: null,
      remind_at: null,
    },
  ],
  summary_it: "Ho trovato una scadenza: bollo della Panda, 87,50 €, entro il 31/01.",
  confidence: "high",
  notes: null,
};

describe("formatItemLine", () => {
  it("renders a deadline with date and amount", () => {
    expect(plain(formatItemLine(DEADLINE_RESULT.items[0]!))).toBe(
      "• 📅 Bollo Panda — 31/01/2026 — 87,50 €",
    );
  });

  it("omits the amount of a deadline that has none", () => {
    const line = formatItemLine({ ...DEADLINE_RESULT.items[0]!, amount_cents: null } as never);
    expect(line).toBe("• 📅 Bollo Panda — 31/01/2026");
  });

  it("renders a transaction with the money emoji", () => {
    expect(
      plain(
        formatItemLine({
          type: "transaction",
          title: "Bolletta luce",
          category: "bolletta",
          date: "2026-07-17",
          amount_cents: 6200,
          asset_id: null,
          asset_suggestion: null,
        }),
      ),
    ).toBe("• 💸 Bolletta luce — 17/07/2026 — 62,00 €");
  });

  it("renders a therapy with its dosage instead of a date", () => {
    expect(
      formatItemLine({
        type: "therapy",
        medication_name: "Amoxicillina",
        dosage_text: "1 misurino ogni 12 ore",
        times_per_day: 2,
        duration_days: 5,
        person_asset_id: null,
        person_suggestion: "Sofia",
      }),
    ).toBe("• 💊 Amoxicillina — 1 misurino ogni 12 ore");
  });

  it("renders a completed deadline as paid with its amount", () => {
    expect(
      plain(
        formatItemLine({
          type: "complete_deadline",
          deadline_id: "44444444-4444-4444-4444-444444444444",
          match_label: "Tagliando Opel",
          actual_amount_cents: 25400,
          completed_date: "2026-07-21",
        }),
      ),
    ).toBe("• ✅ Tagliando Opel — pagato 254,00 €");
  });

  it("renders a completed deadline with no amount as 'fatto'", () => {
    expect(
      formatItemLine({
        type: "complete_deadline",
        deadline_id: "44444444-4444-4444-4444-444444444444",
        match_label: "Visita pediatra",
        actual_amount_cents: null,
        completed_date: null,
      }),
    ).toBe("• ✅ Visita pediatra — fatto");
  });

  it("renders a medication with its expiry, or just its name", () => {
    expect(
      formatItemLine({
        type: "medication",
        name: "Tachipirina 500mg",
        aic_code: null,
        format: "20 compresse",
        expiry_date: "2027-05-31",
      }),
    ).toBe("• 💊 Tachipirina 500mg — 31/05/2027");

    expect(
      formatItemLine({
        type: "medication",
        name: "Tachipirina 500mg",
        aic_code: null,
        format: null,
        expiry_date: null,
      }),
    ).toBe("• 💊 Tachipirina 500mg");
  });
});

describe("composeReply", () => {
  it("returns the bare summary when there is nothing actionable", () => {
    expect(
      composeReply({
        items: [],
        summary_it: "Non c'è nulla da salvare qui: mi stavi solo salutando 🙂",
        confidence: "high",
        notes: null,
      }),
    ).toBe("Non c'è nulla da salvare qui: mi stavi solo salutando 🙂");
  });

  it("lists the items under the summary", () => {
    expect(plain(composeReply(DEADLINE_RESULT))).toBe(
      [
        "Ho trovato una scadenza: bollo della Panda, 87,50 €, entro il 31/01.",
        "",
        "• 📅 Bollo Panda — 31/01/2026 — 87,50 €",
      ].join("\n"),
    );
  });

  it("appends the model's doubts when confidence is not high", () => {
    const reply = composeReply({
      ...DEADLINE_RESULT,
      confidence: "medium",
      notes: "L'importo era poco leggibile.",
    });
    expect(reply).toContain("⚠️ L'importo era poco leggibile.");
  });

  it("does not append notes when the model was confident", () => {
    const reply = composeReply({
      ...DEADLINE_RESULT,
      confidence: "high",
      notes: "Codice avviso: 301000000000000000.",
    });
    expect(reply).not.toContain("⚠️");
  });

  it("does not append an empty warning when confidence is low but there are no notes", () => {
    const reply = composeReply({ ...DEADLINE_RESULT, confidence: "low", notes: null });
    expect(reply).not.toContain("⚠️");
  });
});
