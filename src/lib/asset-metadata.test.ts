import { describe, expect, it } from "vitest";
import { parseAssetMetadata } from "./asset-metadata";

describe("parseAssetMetadata", () => {
  it("accepts a full vehicle metadata payload", () => {
    const result = parseAssetMetadata("vehicle", {
      plate: "AB123CD",
      make: "Fiat",
      model: "Panda",
      year: 2018,
      fuel: "benzina",
      matriculation_date: "2018-05-10",
    });
    expect(result).toMatchObject({ plate: "AB123CD", fuel: "benzina" });
  });

  it("accepts an empty vehicle metadata payload (all fields optional)", () => {
    expect(parseAssetMetadata("vehicle", {})).toEqual({});
  });

  it("rejects an invalid fuel enum value", () => {
    expect(() =>
      parseAssetMetadata("vehicle", { fuel: "nucleare" }),
    ).toThrow();
  });

  it("accepts person metadata with birth_date and relationship", () => {
    const result = parseAssetMetadata("person", {
      birth_date: "2016-03-12",
      relationship: "bambino",
    });
    expect(result).toEqual({ birth_date: "2016-03-12", relationship: "bambino" });
  });

  it("rejects a malformed birth_date", () => {
    expect(() =>
      parseAssetMetadata("person", { birth_date: "12/03/2016" }),
    ).toThrow();
  });

  it("accepts home metadata", () => {
    const result = parseAssetMetadata("home", {
      address: "Via Roma 1",
      ownership: "proprietà",
    });
    expect(result).toEqual({ address: "Via Roma 1", ownership: "proprietà" });
  });

  it("accepts any free-form fields for other", () => {
    expect(parseAssetMetadata("other", { note: "qualsiasi cosa" })).toEqual({
      note: "qualsiasi cosa",
    });
  });
});
