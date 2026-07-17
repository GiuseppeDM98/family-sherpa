import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ENV } from "@/test/env-fixture";

// Transitively imports src/lib/reminders/recurrence.ts -> src/db -> env, so
// it needs the shared TEST_ENV fixture (AGENTS.md "Vitest: any test that
// touches env").
async function loadSmartDefaults() {
  vi.resetModules();
  process.env = { ...process.env, ...TEST_ENV };
  return import("./deadline-smart-defaults");
}

describe("suggestVehicleDeadlineDefault", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("suggests an annual recurrence for bollo, no due date", async () => {
    const { suggestVehicleDeadlineDefault } = await loadSmartDefaults();
    expect(
      suggestVehicleDeadlineDefault("bollo", {
        matriculationDate: null,
        hasExistingRevisione: false,
      }),
    ).toEqual({ recurrence: "annual", dueDate: null });
  });

  it("suggests an annual recurrence for rca, no due date", async () => {
    const { suggestVehicleDeadlineDefault } = await loadSmartDefaults();
    expect(
      suggestVehicleDeadlineDefault("rca", {
        matriculationDate: null,
        hasExistingRevisione: false,
      }),
    ).toEqual({ recurrence: "annual", dueDate: null });
  });

  it("suggests no recurrence for tagliando", async () => {
    const { suggestVehicleDeadlineDefault } = await loadSmartDefaults();
    expect(
      suggestVehicleDeadlineDefault("tagliando", {
        matriculationDate: null,
        hasExistingRevisione: false,
      }),
    ).toEqual({ recurrence: "none", dueDate: null });
  });

  it("suggests biennial + matriculation date + 4 years for a fresh vehicle's first revisione", async () => {
    const { suggestVehicleDeadlineDefault } = await loadSmartDefaults();
    expect(
      suggestVehicleDeadlineDefault("revisione", {
        matriculationDate: "2024-05-10",
        hasExistingRevisione: false,
      }),
    ).toEqual({ recurrence: "biennial", dueDate: "2028-05-10" });
  });

  it("suggests biennial with no due date once a revisione already exists", async () => {
    const { suggestVehicleDeadlineDefault } = await loadSmartDefaults();
    expect(
      suggestVehicleDeadlineDefault("revisione", {
        matriculationDate: "2024-05-10",
        hasExistingRevisione: true,
      }),
    ).toEqual({ recurrence: "biennial", dueDate: null });
  });

  it("suggests biennial with no due date when matriculation date is unknown", async () => {
    const { suggestVehicleDeadlineDefault } = await loadSmartDefaults();
    expect(
      suggestVehicleDeadlineDefault("revisione", {
        matriculationDate: null,
        hasExistingRevisione: false,
      }),
    ).toEqual({ recurrence: "biennial", dueDate: null });
  });

  it("returns null for a non-vehicle category", async () => {
    const { suggestVehicleDeadlineDefault } = await loadSmartDefaults();
    expect(
      suggestVehicleDeadlineDefault("bolletta", {
        matriculationDate: null,
        hasExistingRevisione: false,
      }),
    ).toBeNull();
  });
});
