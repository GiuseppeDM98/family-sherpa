import { describe, expect, it } from "vitest";
import { formatEuroCents } from "@/lib/format";
import { deadlineReminderContent, therapyReminderContent } from "./messages";

describe("deadlineReminderContent", () => {
  it("uses the days-away heading for a far-off deadline", () => {
    const content = deadlineReminderContent({
      title: "Bollo auto",
      assetName: "Panda",
      amountCents: 8750,
      dueDate: "2026-08-31",
      daysLeft: 30,
    });
    expect(content.title).toBe("⏰ Scadenza tra 30 giorni");
    expect(content.body).toBe(`Bollo auto — Panda — ${formatEuroCents(8750)} — 31/08`);
  });

  it("says 'tra 7 giorni' at the one-week mark", () => {
    expect(
      deadlineReminderContent({
        title: "RCA",
        assetName: "Panda",
        amountCents: null,
        dueDate: "2026-08-08",
        daysLeft: 7,
      }).title,
    ).toBe("⏰ Scadenza tra 7 giorni");
  });

  it("says 'domani' the day before", () => {
    expect(
      deadlineReminderContent({
        title: "Revisione",
        assetName: null,
        amountCents: null,
        dueDate: "2026-08-02",
        daysLeft: 1,
      }).title,
    ).toBe("⏰ Scadenza domani");
  });

  it("says 'Scade oggi' on the due date", () => {
    expect(
      deadlineReminderContent({
        title: "TARI",
        assetName: "Casa",
        amountCents: 12000,
        dueDate: "2026-08-01",
        daysLeft: 0,
      }).title,
    ).toBe("⏰ Scade oggi");
  });

  it("flags an overdue deadline", () => {
    expect(
      deadlineReminderContent({
        title: "Bollo",
        assetName: "Panda",
        amountCents: null,
        dueDate: "2026-07-31",
        daysLeft: -1,
      }).title,
    ).toBe("⚠️ Scadenza superata");
  });

  it("omits the asset and amount when they are absent", () => {
    expect(
      deadlineReminderContent({
        title: "Documento",
        assetName: null,
        amountCents: null,
        dueDate: "2026-08-01",
        daysLeft: 7,
      }).body,
    ).toBe("Documento — 01/08");
  });
});

describe("therapyReminderContent", () => {
  it("includes the person and dosage", () => {
    const content = therapyReminderContent({
      medicationName: "Tachipirina",
      personName: "Giulia",
      dosageText: "1 compressa",
    });
    expect(content.title).toBe("💊 Ora della medicina");
    expect(content.body).toBe("Tachipirina — Giulia (1 compressa)");
  });

  it("omits the person when the therapy has no linked asset", () => {
    expect(
      therapyReminderContent({
        medicationName: "Aspirina",
        personName: null,
        dosageText: "1 bustina",
      }).body,
    ).toBe("Aspirina (1 bustina)");
  });
});
