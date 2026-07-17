import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ENV } from "@/test/env-fixture";

// recurrence.ts imports src/db (which validates the whole environment at
// import time), so it needs the shared TEST_ENV fixture even though these
// tests only exercise the pure `nextDueDate` mapping (AGENTS.md "Vitest: any
// test that touches env"). The underlying month-math (end-of-month clamping,
// leap years, year wraps) is unit-tested in src/lib/date.test.ts, where
// `addMonthsToYmd` actually lives.
async function loadRecurrence() {
  vi.resetModules();
  process.env = { ...process.env, ...TEST_ENV };
  return import("./recurrence");
}

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
