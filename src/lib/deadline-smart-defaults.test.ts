import { describe, expect, it } from "vitest";
import { suggestVehicleDeadlineDefault } from "./deadline-smart-defaults";

describe("suggestVehicleDeadlineDefault", () => {
  it("suggests an annual recurrence for bollo, no due date", () => {
    expect(
      suggestVehicleDeadlineDefault("bollo", {
        matriculationDate: null,
        hasExistingRevisione: false,
      }),
    ).toEqual({ recurrence: "annual", dueDate: null });
  });

  it("suggests an annual recurrence for rca, no due date", () => {
    expect(
      suggestVehicleDeadlineDefault("rca", {
        matriculationDate: null,
        hasExistingRevisione: false,
      }),
    ).toEqual({ recurrence: "annual", dueDate: null });
  });

  it("suggests no recurrence for tagliando", () => {
    expect(
      suggestVehicleDeadlineDefault("tagliando", {
        matriculationDate: null,
        hasExistingRevisione: false,
      }),
    ).toEqual({ recurrence: "none", dueDate: null });
  });

  it("suggests biennial + matriculation date + 4 years for a fresh vehicle's first revisione", () => {
    expect(
      suggestVehicleDeadlineDefault("revisione", {
        matriculationDate: "2024-05-10",
        hasExistingRevisione: false,
      }),
    ).toEqual({ recurrence: "biennial", dueDate: "2028-05-10" });
  });

  it("suggests biennial with no due date once a revisione already exists", () => {
    expect(
      suggestVehicleDeadlineDefault("revisione", {
        matriculationDate: "2024-05-10",
        hasExistingRevisione: true,
      }),
    ).toEqual({ recurrence: "biennial", dueDate: null });
  });

  it("suggests biennial with no due date when matriculation date is unknown", () => {
    expect(
      suggestVehicleDeadlineDefault("revisione", {
        matriculationDate: null,
        hasExistingRevisione: false,
      }),
    ).toEqual({ recurrence: "biennial", dueDate: null });
  });

  it("returns null for a non-vehicle category", () => {
    expect(
      suggestVehicleDeadlineDefault("bolletta", {
        matriculationDate: null,
        hasExistingRevisione: false,
      }),
    ).toBeNull();
  });
});
