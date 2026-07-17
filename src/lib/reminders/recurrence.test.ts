import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ENV } from "@/test/env-fixture";

// recurrence.ts imports src/db (which validates the whole environment at
// import time), so it needs the shared TEST_ENV fixture even though these
// tests only exercise the pure date math (AGENTS.md "Vitest: any test that
// touches env").
async function loadRecurrence() {
  vi.resetModules();
  process.env = { ...process.env, ...TEST_ENV };
  return import("./recurrence");
}

describe("addMonthsToYmd", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("clamps end-of-month instead of rolling over (31 Jan + 1 month -> 28 Feb)", async () => {
    const { addMonthsToYmd } = await loadRecurrence();
    expect(addMonthsToYmd("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("clamps to 29 Feb in a leap year", async () => {
    const { addMonthsToYmd } = await loadRecurrence();
    expect(addMonthsToYmd("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("does not clamp when the day exists in the target month", async () => {
    const { addMonthsToYmd } = await loadRecurrence();
    expect(addMonthsToYmd("2026-01-15", 1)).toBe("2026-02-15");
  });

  it("wraps across a year boundary", async () => {
    const { addMonthsToYmd } = await loadRecurrence();
    expect(addMonthsToYmd("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("wraps across multiple years for a biennial recurrence", async () => {
    const { addMonthsToYmd } = await loadRecurrence();
    expect(addMonthsToYmd("2026-07-17", 24)).toBe("2028-07-17");
  });

  it("clamps 31 Mar + 1 month to 30 Apr", async () => {
    const { addMonthsToYmd } = await loadRecurrence();
    expect(addMonthsToYmd("2026-03-31", 1)).toBe("2026-04-30");
  });

  it("keeps 28 Feb on a non-leap year 4 years out (matriculation + 4y case)", async () => {
    const { addMonthsToYmd } = await loadRecurrence();
    expect(addMonthsToYmd("2025-02-28", 48)).toBe("2029-02-28");
  });
});

describe("nextDueDate", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns null for recurrence 'none'", async () => {
    const { nextDueDate } = await loadRecurrence();
    expect(nextDueDate("2026-07-17", "none")).toBeNull();
  });

  it.each([
    ["monthly", 1],
    ["bimonthly", 2],
    ["quarterly", 3],
    ["semiannual", 6],
    ["annual", 12],
    ["biennial", 24],
  ] as const)("advances %s by %i month(s)", async (recurrence, months) => {
    const { nextDueDate, addMonthsToYmd } = await loadRecurrence();
    expect(nextDueDate("2026-01-31", recurrence)).toBe(addMonthsToYmd("2026-01-31", months));
  });

  it("advances an annual bollo across the month-end/leap edge", async () => {
    const { nextDueDate } = await loadRecurrence();
    expect(nextDueDate("2028-02-29", "annual")).toBe("2029-02-28");
  });
});
