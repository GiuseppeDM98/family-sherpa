import { describe, expect, it } from "vitest";
import { addDaysToYmd, addMonthsToYmd, nextWeekdayAfter, todayInRome } from "./date";

describe("todayInRome", () => {
  it("uses the Rome calendar date, not UTC's", () => {
    // 23:30 UTC on 16 July is already 01:30 on 17 July in Rome (CEST, +02:00).
    expect(todayInRome(new Date("2026-07-16T23:30:00.000Z"))).toBe("2026-07-17");
  });

  it("uses the winter offset when Rome is on CET", () => {
    // 23:30 UTC on 16 January is 00:30 on 17 January in Rome (CET, +01:00).
    expect(todayInRome(new Date("2026-01-16T23:30:00.000Z"))).toBe("2026-01-17");
    // …but 22:30 UTC is still 23:30 on the 16th.
    expect(todayInRome(new Date("2026-01-16T22:30:00.000Z"))).toBe("2026-01-16");
  });

  it("zero-pads month and day", () => {
    expect(todayInRome(new Date("2026-03-05T12:00:00.000Z"))).toBe("2026-03-05");
  });
});

describe("addDaysToYmd", () => {
  it("adds days across a month boundary", () => {
    expect(addDaysToYmd("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("subtracts days across a year boundary", () => {
    expect(addDaysToYmd("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles a leap day", () => {
    expect(addDaysToYmd("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("is unaffected by the Rome DST switch", () => {
    // CEST starts on 29 March 2026; a date-only shift must not lose a day.
    expect(addDaysToYmd("2026-03-28", 2)).toBe("2026-03-30");
  });
});

describe("addMonthsToYmd", () => {
  it("clamps end-of-month instead of rolling over (31 Jan + 1 month -> 28 Feb)", () => {
    expect(addMonthsToYmd("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("clamps to 29 Feb in a leap year", () => {
    expect(addMonthsToYmd("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("does not clamp when the day exists in the target month", () => {
    expect(addMonthsToYmd("2026-01-15", 1)).toBe("2026-02-15");
  });

  it("wraps across a year boundary", () => {
    expect(addMonthsToYmd("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("wraps across multiple years for a biennial recurrence", () => {
    expect(addMonthsToYmd("2026-07-17", 24)).toBe("2028-07-17");
  });

  it("clamps 31 Mar + 1 month to 30 Apr", () => {
    expect(addMonthsToYmd("2026-03-31", 1)).toBe("2026-04-30");
  });

  it("keeps 28 Feb on a non-leap year 4 years out (matriculation + 4y case)", () => {
    expect(addMonthsToYmd("2025-02-28", 48)).toBe("2029-02-28");
  });

  it("subtracts months (negative offset), e.g. the last-12-months TCO window", () => {
    expect(addMonthsToYmd("2026-07-17", -12)).toBe("2025-07-17");
  });
});

describe("nextWeekdayAfter", () => {
  it("finds the next Thursday later in the same week", () => {
    // 2026-07-17 is a Friday… so from Monday the 13th, Thursday is the 16th.
    expect(nextWeekdayAfter("2026-07-13", 4)).toBe("2026-07-16");
  });

  it("skips a full week when the reference day is already that weekday", () => {
    expect(nextWeekdayAfter("2026-07-16", 4)).toBe("2026-07-23");
  });

  it("wraps into the following week", () => {
    // From Friday 2026-07-17, the next Monday is the 20th.
    expect(nextWeekdayAfter("2026-07-17", 1)).toBe("2026-07-20");
  });
});
