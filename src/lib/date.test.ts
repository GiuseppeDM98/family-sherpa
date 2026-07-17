import { describe, expect, it } from "vitest";
import { addDaysToYmd, nextWeekdayAfter, todayInRome } from "./date";

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
