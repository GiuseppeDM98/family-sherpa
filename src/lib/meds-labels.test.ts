import { describe, expect, it } from "vitest";
import { expiryBadgeLabel, medicationExpiryStatus } from "./meds-labels";

describe("medicationExpiryStatus", () => {
  it("is 'none' when there is no expiry date", () => {
    expect(medicationExpiryStatus(null, "2026-07-20")).toBe("none");
  });

  it("is 'expired' for a past expiry date", () => {
    expect(medicationExpiryStatus("2026-07-19", "2026-07-20")).toBe("expired");
  });

  it("is 'expiring' at exactly 60 days out", () => {
    expect(medicationExpiryStatus("2026-09-18", "2026-07-20")).toBe("expiring");
  });

  it("is 'ok' at 61 days out", () => {
    expect(medicationExpiryStatus("2026-09-19", "2026-07-20")).toBe("ok");
  });

  it("is 'expiring', not 'expired', for a medication expiring today", () => {
    expect(medicationExpiryStatus("2026-07-20", "2026-07-20")).toBe("expiring");
  });
});

describe("expiryBadgeLabel", () => {
  it("singularizes 1 day overdue", () => {
    expect(expiryBadgeLabel("2026-07-19", "2026-07-20")).toBe("Scaduto da 1 giorno");
  });

  it("pluralizes multiple days overdue", () => {
    expect(expiryBadgeLabel("2026-07-17", "2026-07-20")).toBe("Scaduto da 3 giorni");
  });

  it("special-cases today", () => {
    expect(expiryBadgeLabel("2026-07-20", "2026-07-20")).toBe("Scade oggi");
  });

  it("singularizes 1 day out", () => {
    expect(expiryBadgeLabel("2026-07-21", "2026-07-20")).toBe("Scade tra 1 giorno");
  });

  it("pluralizes multiple days out", () => {
    expect(expiryBadgeLabel("2026-09-03", "2026-07-20")).toBe("Scade tra 45 giorni");
  });
});
