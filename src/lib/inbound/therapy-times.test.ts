import { describe, expect, it } from "vitest";
import { defaultTherapyTimes } from "./therapy-times";

describe("defaultTherapyTimes", () => {
  it("uses the conventional Italian times up to four doses a day", () => {
    expect(defaultTherapyTimes(1)).toEqual(["08:00"]);
    expect(defaultTherapyTimes(2)).toEqual(["08:00", "20:00"]);
    expect(defaultTherapyTimes(3)).toEqual(["08:00", "14:00", "20:00"]);
    expect(defaultTherapyTimes(4)).toEqual(["08:00", "12:00", "16:00", "20:00"]);
  });

  it("spreads five doses evenly across the 08–22 window", () => {
    expect(defaultTherapyTimes(5)).toEqual(["08:00", "11:30", "15:00", "18:30", "22:00"]);
  });

  it("spreads six doses evenly across the 08–22 window", () => {
    expect(defaultTherapyTimes(6)).toEqual([
      "08:00",
      "10:48",
      "13:36",
      "16:24",
      "19:12",
      "22:00",
    ]);
  });

  it("returns exactly times_per_day entries, always within 08:00–22:00", () => {
    for (let timesPerDay = 1; timesPerDay <= 6; timesPerDay++) {
      const times = defaultTherapyTimes(timesPerDay);
      expect(times).toHaveLength(timesPerDay);
      expect(times.every((time) => time >= "08:00" && time <= "22:00")).toBe(true);
      expect([...times].sort()).toEqual(times);
    }
  });

  it("returns a fresh array the caller can safely mutate", () => {
    const times = defaultTherapyTimes(2);
    times.push("23:00");
    expect(defaultTherapyTimes(2)).toEqual(["08:00", "20:00"]);
  });
});
