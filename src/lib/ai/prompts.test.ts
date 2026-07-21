import { describe, expect, it } from "vitest";
import { ParseResultSchema } from "./parse-schema";
import {
  buildExtractionSystemPrompt,
  EXTRACTION_SYSTEM_PROMPT,
  FEW_SHOT_EXAMPLES,
  formatAssetsList,
  resolveFewShotExample,
  type PromptAsset,
} from "./prompts";

const VEHICLE: PromptAsset = {
  id: "11111111-1111-1111-1111-111111111111",
  type: "vehicle",
  name: "Panda di Giulia",
  plate: "AB123CD",
};
const PERSON: PromptAsset = {
  id: "22222222-2222-2222-2222-222222222222",
  type: "person",
  name: "Sofia",
  birthDate: "2016-03-12",
};
const HOME: PromptAsset = {
  id: "33333333-3333-3333-3333-333333333333",
  type: "home",
  name: "Casa",
};

describe("formatAssetsList", () => {
  it("renders a vehicle with its plate", () => {
    expect(formatAssetsList([VEHICLE])).toBe(
      "- id: 11111111-1111-1111-1111-111111111111 | tipo: vehicle | nome: Panda di Giulia | targa: AB123CD",
    );
  });

  it("renders a person's birth date when known", () => {
    expect(formatAssetsList([PERSON])).toContain("nato/a: 2016-03-12");
  });

  it("omits optional details that are missing", () => {
    expect(formatAssetsList([HOME])).toBe(
      "- id: 33333333-3333-3333-3333-333333333333 | tipo: home | nome: Casa",
    );
  });

  it("puts one asset per line", () => {
    expect(formatAssetsList([VEHICLE, PERSON, HOME]).split("\n")).toHaveLength(3);
  });

  it("says so explicitly when the family has no assets", () => {
    expect(formatAssetsList([])).toBe("(nessun asset registrato)");
  });
});

describe("buildExtractionSystemPrompt", () => {
  const prompt = buildExtractionSystemPrompt("2026-07-17", [VEHICLE, PERSON]);

  it("interpolates today's date", () => {
    expect(prompt).toContain("Oggi è 2026-07-17 (timezone Europe/Rome).");
  });

  it("interpolates the asset list", () => {
    expect(prompt).toContain("nome: Panda di Giulia | targa: AB123CD");
    expect(prompt).toContain("nome: Sofia | nato/a: 2016-03-12");
  });

  it("leaves no unresolved placeholders", () => {
    expect(prompt).not.toMatch(/\{\{.*?\}\}/);
  });

  it("keeps the spec's extraction rules", () => {
    expect(prompt).toContain("Regole di estrazione:");
    expect(prompt).toContain("13. confidence:");
  });

  it("resolves the sender line when a name is given, and omits it otherwise", () => {
    expect(buildExtractionSystemPrompt("2026-07-17", [VEHICLE], [], "Giuseppe")).toContain(
      "Chi ti scrive è Giuseppe.",
    );
    expect(buildExtractionSystemPrompt("2026-07-17", [VEHICLE])).not.toContain("Chi ti scrive");
  });

  it("interpolates the open deadlines, or says there are none", () => {
    const withDeadline = buildExtractionSystemPrompt("2026-07-17", [VEHICLE], [
      { id: "d1", title: "Tagliando Opel", assetName: "Opel Corsa", dueDate: "2026-02-15", amountCents: 23000 },
    ]);
    expect(withDeadline).toContain("titolo: Tagliando Opel");
    expect(withDeadline).toContain("asset: Opel Corsa");
    expect(buildExtractionSystemPrompt("2026-07-17", [VEHICLE])).toContain(
      "(nessuna scadenza aperta)",
    );
  });

  it("never sends a codice fiscale — the prompt only knows the listed fields", () => {
    const withCf = { ...PERSON, codice_fiscale_enc: "enc:v1:secret" } as PromptAsset;
    expect(buildExtractionSystemPrompt("2026-07-17", [withCf])).not.toContain("enc:v1");
  });
});

describe("EXTRACTION_SYSTEM_PROMPT", () => {
  it("carries the two placeholders the pipeline interpolates", () => {
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("{{today}}");
    expect(EXTRACTION_SYSTEM_PROMPT).toContain("{{assets_list}}");
  });
});

describe("FEW_SHOT_EXAMPLES", () => {
  it("has the four examples from the spec", () => {
    expect(FEW_SHOT_EXAMPLES).toHaveLength(4);
    expect(FEW_SHOT_EXAMPLES.map((example) => example.output.items[0]?.type)).toEqual([
      "deadline",
      "transaction",
      "therapy",
      "complete_deadline",
    ]);
  });

  it("produces outputs that satisfy the parse-result schema once resolved", () => {
    for (const example of FEW_SHOT_EXAMPLES) {
      const resolved = resolveFewShotExample(example, "2026-07-17");
      expect(ParseResultSchema.safeParse(resolved.output).success).toBe(true);
    }
  });
});

describe("resolveFewShotExample", () => {
  // 2026-07-17 is a Friday.
  const today = "2026-07-17";

  it("resolves 'giovedì prossimo' to the Thursday after today", () => {
    const [tagliando] = FEW_SHOT_EXAMPLES;
    const resolved = resolveFewShotExample(tagliando!, today);
    expect(resolved.output.items[0]).toMatchObject({ due_date: "2026-07-23" });
  });

  it("resolves 'oggi' to today", () => {
    const resolved = resolveFewShotExample(FEW_SHOT_EXAMPLES[1]!, today);
    expect(resolved.output.items[0]).toMatchObject({ date: today });
  });

  it("resolves 'domani' inside notes", () => {
    const resolved = resolveFewShotExample(FEW_SHOT_EXAMPLES[2]!, today);
    expect(resolved.output.notes).toBe("La terapia inizia domani (2026-07-18).");
  });

  it("leaves no unresolved placeholder in any example", () => {
    for (const example of FEW_SHOT_EXAMPLES) {
      const resolved = resolveFewShotExample(example, today);
      expect(JSON.stringify(resolved.output)).not.toMatch(/\{\{.*?\}\}/);
    }
  });

  it("does not mutate the shared example constants", () => {
    resolveFewShotExample(FEW_SHOT_EXAMPLES[0]!, today);
    expect(FEW_SHOT_EXAMPLES[0]!.output.items[0]).toMatchObject({
      due_date: "{{next_thursday}}",
    });
  });
});
