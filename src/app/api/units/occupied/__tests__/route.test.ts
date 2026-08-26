import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const ownerUnitFindMany = vi.fn();
const residentFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ownerUnit: { findMany: (...args: unknown[]) => ownerUnitFindMany(...args) },
    resident: { findMany: (...args: unknown[]) => residentFindMany(...args) },
  },
}));

import { GET } from "../route";

describe("GET /api/units/occupied", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    ownerUnitFindMany.mockReset();
    residentFindMany.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("merges units with an active owner and units with an active resident, de-duplicated", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindMany.mockResolvedValue([{ unit: "202" }, { unit: "506" }]);
    residentFindMany.mockResolvedValue([{ unit: "202" }, { unit: "101" }]);

    const res = await GET();
    const body = await res.json();

    expect(body.units.sort()).toEqual(["101", "202", "506"]);
    expect(ownerUnitFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { owner: { active: true } } }));
    expect(residentFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { active: true } }));
  });
});
