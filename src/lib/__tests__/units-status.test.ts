import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { resident: { findMany: (...args: unknown[]) => findMany(...args) } },
}));

import { getUnitsFreedBy } from "../units-status";

describe("getUnitsFreedBy", () => {
  beforeEach(() => findMany.mockReset());

  it("lists a unit whose only resident is leaving", async () => {
    findMany.mockResolvedValueOnce([{ unit: "1501" }]).mockResolvedValueOnce([]);
    await expect(getUnitsFreedBy(["r1"])).resolves.toEqual(["1501"]);
  });

  it("keeps a unit that still has another active resident", async () => {
    findMany.mockResolvedValueOnce([{ unit: "202" }]).mockResolvedValueOnce([{ unit: "202" }]);
    await expect(getUnitsFreedBy(["r1"])).resolves.toEqual([]);
  });

  it("frees only the units no one is left in", async () => {
    findMany
      .mockResolvedValueOnce([{ unit: "801" }, { unit: "802" }])
      .mockResolvedValueOnce([{ unit: "802" }]);
    await expect(getUnitsFreedBy(["r1", "r2"])).resolves.toEqual(["801"]);
  });

  it("skips the query entirely with no residents", async () => {
    await expect(getUnitsFreedBy([])).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
