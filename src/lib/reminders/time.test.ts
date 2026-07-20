import { describe, expect, it } from "vitest";
import { daysBetween, romeTimeToUtcIso } from "./time";

describe("romeTimeToUtcIso", () => {
  it("maps 08:00 to 06:00 UTC in summer (CEST, +02:00)", () => {
    expect(romeTimeToUtcIso("2026-07-01", "08:00")).toBe("2026-07-01T06:00:00.000Z");
  });

  it("maps 08:00 to 07:00 UTC in winter (CET, +01:00)", () => {
    expect(romeTimeToUtcIso("2026-01-01", "08:00")).toBe("2026-01-01T07:00:00.000Z");
  });

  it("handles the spring-forward day (clocks jump 02:00 -> 03:00 on 2026-03-29)", () => {
    // Before the switch that morning Rome is still on CET (+01:00).
    expect(romeTimeToUtcIso("2026-03-29", "01:00")).toBe("2026-03-29T00:00:00.000Z");
    // After it, on CEST (+02:00).
    expect(romeTimeToUtcIso("2026-03-29", "08:00")).toBe("2026-03-29T06:00:00.000Z");
  });

  it("handles the fall-back day (clocks drop 03:00 -> 02:00 on 2026-10-25)", () => {
    // A daytime dose is unambiguous; by 08:00 Rome is back on CET (+01:00).
    expect(romeTimeToUtcIso("2026-10-25", "08:00")).toBe("2026-10-25T07:00:00.000Z");
  });

  it("preserves the minutes", () => {
    expect(romeTimeToUtcIso("2026-07-01", "14:30")).toBe("2026-07-01T12:30:00.000Z");
  });
});

describe("daysBetween", () => {
  it("counts forward days", () => {
    expect(daysBetween("2026-07-01", "2026-07-08")).toBe(7);
  });

  it("is zero for the same day", () => {
    expect(daysBetween("2026-07-01", "2026-07-01")).toBe(0);
  });

  it("is negative when the target is in the past (overdue yesterday = -1)", () => {
    expect(daysBetween("2026-07-02", "2026-07-01")).toBe(-1);
  });

  it("counts across a month boundary", () => {
    expect(daysBetween("2026-01-30", "2026-02-02")).toBe(3);
  });

  it("is unaffected by the spring-forward DST boundary between the dates", () => {
    // CEST starts 2026-03-29; the 23-hour civil day must not drop a count.
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });
});
