import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_ENV } from "@/test/env-fixture";

// intakes.ts imports src/db (which validates the whole environment at import
// time), so it needs the shared TEST_ENV fixture even though these tests only
// exercise the pure `intakeTimesForDate` mapping (AGENTS.md "Vitest: any test
// that touches env"). The DB-writing half of generateIntakesForDate (the
// onConflictDoNothing insert) is exercised manually — no test in this repo
// hits the DB directly (recurrence.test.ts only covers nextDueDate's pure
// math for the same reason). intakeTimesForDate isolates everything that can
// be unit tested without a database: the times mapping, DST safety, and the
// start/end date guards.
async function loadIntakes() {
  vi.resetModules();
  process.env = { ...process.env, ...TEST_ENV };
  return import("./intakes");
}

describe("intakeTimesForDate", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("maps each therapy time through romeTimeToUtcIso for the given day", async () => {
    const { intakeTimesForDate } = await loadIntakes();
    const therapy = { id: "t1", times: ["08:00", "20:00"], start_date: "2026-07-01", end_date: null };
    expect(intakeTimesForDate(therapy, "2026-07-15")).toEqual([
      "2026-07-15T06:00:00.000Z",
      "2026-07-15T18:00:00.000Z",
    ]);
  });

  it("is DST-safe across the spring-forward boundary", async () => {
    const { intakeTimesForDate } = await loadIntakes();
    const therapy = { id: "t1", times: ["08:00"], start_date: "2026-01-01", end_date: null };
    // CET before the switch, CEST after — see time.test.ts for the raw mapping.
    expect(intakeTimesForDate(therapy, "2026-03-29")).toEqual(["2026-03-29T06:00:00.000Z"]);
  });

  it("returns nothing before the therapy's start date", async () => {
    const { intakeTimesForDate } = await loadIntakes();
    const therapy = { id: "t1", times: ["08:00"], start_date: "2026-07-10", end_date: null };
    expect(intakeTimesForDate(therapy, "2026-07-09")).toEqual([]);
  });

  it("includes the start date itself", async () => {
    const { intakeTimesForDate } = await loadIntakes();
    const therapy = { id: "t1", times: ["08:00"], start_date: "2026-07-10", end_date: null };
    expect(intakeTimesForDate(therapy, "2026-07-10")).toHaveLength(1);
  });

  it("returns nothing after the therapy's end date", async () => {
    const { intakeTimesForDate } = await loadIntakes();
    const therapy = { id: "t1", times: ["08:00"], start_date: "2026-07-01", end_date: "2026-07-10" };
    expect(intakeTimesForDate(therapy, "2026-07-11")).toEqual([]);
  });

  it("includes the end date itself", async () => {
    const { intakeTimesForDate } = await loadIntakes();
    const therapy = { id: "t1", times: ["08:00"], start_date: "2026-07-01", end_date: "2026-07-10" };
    expect(intakeTimesForDate(therapy, "2026-07-10")).toHaveLength(1);
  });
});
