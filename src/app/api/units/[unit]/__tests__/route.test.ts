import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const ownerUnitFindFirst = vi.fn();
const residentFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ownerUnit: { findFirst: (...args: unknown[]) => ownerUnitFindFirst(...args) },
    resident: { findMany: (...args: unknown[]) => residentFindMany(...args) },
  },
}));

import { GET } from "../route";

function params(unit: string) {
  return { params: Promise.resolve({ unit }) };
}

describe("GET /api/units/[unit]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    ownerUnitFindFirst.mockReset();
    residentFindMany.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET(new NextRequest("http://localhost/api/units/101"), params("101"));
    expect(res.status).toBe(401);
  });

  it("returns a null owner and empty residents when nobody is registered", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindFirst.mockResolvedValue(null);
    residentFindMany.mockResolvedValue([]);

    const res = await GET(new NextRequest("http://localhost/api/units/101"), params("101"));
    const body = await res.json();

    expect(body).toEqual({ owner: null, residents: [] });
  });

  it("returns the single active owner and the active residents for the unit", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindFirst.mockResolvedValue({ owner: { id: "o1", name: "Owner", phones: [] } });
    residentFindMany.mockResolvedValue([{ id: "r1", name: "Resident", phones: [] }]);

    const res = await GET(new NextRequest("http://localhost/api/units/101"), params("101"));
    const body = await res.json();

    expect(body).toEqual({
      owner: { id: "o1", name: "Owner", phones: [] },
      residents: [{ id: "r1", name: "Resident", phones: [] }],
    });
    expect(ownerUnitFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { unit: "101", owner: { active: true } } }),
    );
    expect(residentFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { unit: "101", active: true } }));
  });
});
