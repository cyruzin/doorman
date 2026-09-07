import { describe, expect, it } from "vitest";
import { isSessionExpiredByShift, mostRecentShiftBoundary, nextShiftBoundary } from "@/lib/shift";

function at(hour: number, minute = 0) {
  return new Date(2026, 0, 15, hour, minute, 0, 0);
}

describe("mostRecentShiftBoundary", () => {
  it("returns 06:00 of the same day for a time between 6h and 18h", () => {
    expect(mostRecentShiftBoundary(at(12, 30))).toEqual(at(6));
  });

  it("returns 18:00 of the same day for a time between 18h and 24h", () => {
    expect(mostRecentShiftBoundary(at(23, 59))).toEqual(at(18));
  });

  it("returns 18:00 of the previous day for a time before 6h", () => {
    expect(mostRecentShiftBoundary(at(3, 0))).toEqual(
      new Date(2026, 0, 14, 18, 0, 0, 0),
    );
  });

  it("treats exactly 06:00 and 18:00 as the start of the new shift", () => {
    expect(mostRecentShiftBoundary(at(6, 0))).toEqual(at(6));
    expect(mostRecentShiftBoundary(at(18, 0))).toEqual(at(18));
  });
});

describe("nextShiftBoundary", () => {
  it("returns 18:00 same day when currently in the morning shift", () => {
    expect(nextShiftBoundary(at(9))).toEqual(at(18));
  });

  it("returns 06:00 next day when currently in the night shift", () => {
    expect(nextShiftBoundary(at(20))).toEqual(new Date(2026, 0, 16, 6, 0, 0, 0));
  });

  it("returns 06:00 next day when currently before the morning shift", () => {
    expect(nextShiftBoundary(at(2))).toEqual(at(6));
  });
});

describe("isSessionExpiredByShift", () => {
  it("is not expired for a login within the current shift", () => {
    const loginAt = at(7).getTime();
    expect(isSessionExpiredByShift(loginAt, at(10))).toBe(false);
  });

  it("is expired once the shift boundary has passed since login", () => {
    const loginAt = at(15).getTime();
    expect(isSessionExpiredByShift(loginAt, at(18, 1))).toBe(true);
  });

  it("is expired for a login that crossed the midnight/6h boundary", () => {
    const loginAt = at(19).getTime();
    const nextMorning = new Date(2026, 0, 16, 6, 1, 0, 0);
    expect(isSessionExpiredByShift(loginAt, nextMorning)).toBe(true);
  });
});
