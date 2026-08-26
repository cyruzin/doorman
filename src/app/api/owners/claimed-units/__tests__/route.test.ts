import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const ownerUnitFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ownerUnit: { findMany: (...args: unknown[]) => ownerUnitFindMany(...args) },
  },
}));

import { GET } from "../route";

describe("GET /api/owners/claimed-units", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    ownerUnitFindMany.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET(new NextRequest("http://localhost/api/owners/claimed-units"));
    expect(res.status).toBe(401);
  });

  it("maps every unit owned by an active owner to that owner's name", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindMany.mockResolvedValue([
      { unit: "202", owner: { name: "Maria Lúcia" } },
      { unit: "506", owner: { name: "Cyro Dubeux" } },
    ]);

    const res = await GET(new NextRequest("http://localhost/api/owners/claimed-units"));
    const body = await res.json();

    expect(body).toEqual({ claims: { "202": "Maria Lúcia", "506": "Cyro Dubeux" } });
    expect(ownerUnitFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { owner: { active: true } } }));
  });

  it("excludes the given owner so their own units stay off the claimed list", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindMany.mockResolvedValue([{ unit: "202", owner: { name: "Maria Lúcia" } }]);

    await GET(new NextRequest("http://localhost/api/owners/claimed-units?excludeOwnerId=o1"));

    expect(ownerUnitFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { owner: { active: true, id: { not: "o1" } } } }),
    );
  });
});
