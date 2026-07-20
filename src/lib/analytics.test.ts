import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ENV } from "@/test/env-fixture";

// analytics.ts imports src/db (which validates the whole environment at
// import time) via getCashFlowForecast/getAssetTco/getFamilySpendSummary, so
// it needs the shared TEST_ENV fixture even though these tests only exercise
// the pure `projectRecurrences`/`groupByMonth` functions (AGENTS.md "Vitest:
// any test that touches env").
async function loadAnalytics() {
  vi.resetModules();
  process.env = { ...process.env, ...TEST_ENV };
  return import("./analytics");
}

describe("projectRecurrences", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("includes an annual deadline once when the window is 12 months", async () => {
    const { projectRecurrences } = await loadAnalytics();
    const items = projectRecurrences(
      [
        {
          title: "Bollo",
          category: "bollo",
          dueDate: "2026-08-01",
          amountCents: 8000,
          recurrence: "annual",
          assetName: "Panda",
        },
      ],
      "2026-07-20",
      "2027-07-20",
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ dueDate: "2026-08-01", projected: false });
  });

  it("includes a monthly deadline once per month inside the window", async () => {
    const { projectRecurrences } = await loadAnalytics();
    const items = projectRecurrences(
      [
        {
          title: "Bolletta",
          category: "bolletta",
          dueDate: "2026-08-01",
          amountCents: 5000,
          recurrence: "monthly",
          assetName: "Casa",
        },
      ],
      "2026-07-20",
      "2026-11-30",
    );
    expect(items.map((item) => item.dueDate)).toEqual([
      "2026-08-01",
      "2026-09-01",
      "2026-10-01",
      "2026-11-01",
    ]);
    expect(items[0]?.projected).toBe(false);
    expect(items.slice(1).every((item) => item.projected)).toBe(true);
  });

  it("does not duplicate a 'none' recurrence past its due date", async () => {
    const { projectRecurrences } = await loadAnalytics();
    const items = projectRecurrences(
      [
        {
          title: "TARI",
          category: "tari",
          dueDate: "2026-08-01",
          amountCents: 15000,
          recurrence: "none",
          assetName: "Casa",
        },
      ],
      "2026-07-20",
      "2027-07-20",
    );
    expect(items).toHaveLength(1);
  });

  it("excludes occurrences outside the window on either edge", async () => {
    const { projectRecurrences } = await loadAnalytics();
    const items = projectRecurrences(
      [
        {
          title: "Fuori finestra",
          category: "altro",
          dueDate: "2026-07-01",
          amountCents: 1000,
          recurrence: "none",
          assetName: null,
        },
      ],
      "2026-07-20",
      "2026-08-20",
    );
    expect(items).toHaveLength(0);
  });

  it("skips deadlines with no amount", async () => {
    const { projectRecurrences } = await loadAnalytics();
    const items = projectRecurrences(
      [
        {
          title: "Visita",
          category: "medico",
          dueDate: "2026-08-01",
          amountCents: null,
          recurrence: "none",
          assetName: null,
        },
      ],
      "2026-07-20",
      "2027-07-20",
    );
    expect(items).toHaveLength(0);
  });
});

describe("groupByMonth", () => {
  it("sums amounts within the same month and sorts months chronologically", async () => {
    const { groupByMonth } = await loadAnalytics();
    const result = groupByMonth([
      { title: "A", category: "altro", amountCents: 1000, dueDate: "2026-09-05", assetName: null, projected: false },
      { title: "B", category: "altro", amountCents: 2000, dueDate: "2026-08-10", assetName: null, projected: false },
      { title: "C", category: "altro", amountCents: 500, dueDate: "2026-09-20", assetName: null, projected: true },
    ]);
    expect(result.map((entry) => entry.month)).toEqual(["2026-08", "2026-09"]);
    expect(result[0]?.totalCents).toBe(2000);
    expect(result[1]?.totalCents).toBe(1500);
    expect(result[1]?.items).toHaveLength(2);
  });

  it("returns an empty array for no items", async () => {
    const { groupByMonth } = await loadAnalytics();
    expect(groupByMonth([])).toEqual([]);
  });
});
