import { describe, expect, it } from "vitest";
import { getAllUnits, getFloors, getUnitNumber, getUnitsPerFloor, sortUnits } from "@/lib/building";

describe("building layout", () => {
  it("has 19 floors", () => {
    expect(getFloors()).toHaveLength(19);
    expect(getFloors()[0]).toBe(1);
    expect(getFloors()[18]).toBe(19);
  });

  it("has 6 units per floor except the top floor (2 penthouses)", () => {
    expect(getUnitsPerFloor(1)).toBe(6);
    expect(getUnitsPerFloor(18)).toBe(6);
    expect(getUnitsPerFloor(19)).toBe(2);
  });

  it("numbers units as floor + 2-digit position", () => {
    expect(getUnitNumber(1, 1)).toBe("101");
    expect(getUnitNumber(1, 6)).toBe("106");
    expect(getUnitNumber(10, 1)).toBe("1001");
    expect(getUnitNumber(19, 2)).toBe("1902");
  });

  it("generates 110 total units (18 * 6 + 2)", () => {
    expect(getAllUnits()).toHaveLength(110);
  });
});

describe("sortUnits", () => {
  it("orders by apartment number, not by string", () => {
    expect(sortUnits(["803", "1501", "801", "1101", "802"])).toEqual(["801", "802", "803", "1101", "1501"]);
  });

  it("leaves the input array untouched", () => {
    const units = ["802", "801"];
    sortUnits(units);
    expect(units).toEqual(["802", "801"]);
  });
});
