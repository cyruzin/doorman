import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const ownerUnitFindMany = vi.fn();
const residentFindMany = vi.fn();
const schedulingFindMany = vi.fn();
const noticeFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ownerUnit: { findMany: (...args: unknown[]) => ownerUnitFindMany(...args) },
    resident: { findMany: (...args: unknown[]) => residentFindMany(...args) },
    schedulingEntry: { findMany: (...args: unknown[]) => schedulingFindMany(...args) },
    notice: { findMany: (...args: unknown[]) => noticeFindMany(...args) },
  },
}));

const getCapacityPercent = vi.fn();
vi.mock("@/lib/scheduling", () => ({
  getCapacityPercent: (...args: unknown[]) => getCapacityPercent(...args),
}));

const can = vi.fn();
vi.mock("@/lib/permissions-db", () => ({
  can: (...args: unknown[]) => can(...args),
}));

import { GET } from "../route";

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    ownerUnitFindMany.mockReset();
    residentFindMany.mockReset();
    schedulingFindMany.mockReset();
    noticeFindMany.mockReset();
    getCapacityPercent.mockReset();
    getCapacityPercent.mockResolvedValue(0);
    noticeFindMany.mockResolvedValue([]);
    can.mockReset();
    can.mockResolvedValue(true);
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("counts occupied units from active owners and residents, without double-counting a unit that has both", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    ownerUnitFindMany.mockResolvedValue([{ unit: "101" }]);
    residentFindMany.mockResolvedValue([{ unit: "101" }, { unit: "202" }]);
    schedulingFindMany.mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    // Ownership alone doesn't make someone a "morador" — only actual residents count.
    expect(body.occupancy).toMatchObject({ totalUnits: 110, occupiedUnits: 2, totalResidents: 2 });
  });

  it("includes scheduling capacity and upcoming events when the role can read scheduling", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    ownerUnitFindMany.mockResolvedValue([]);
    residentFindMany.mockResolvedValue([]);
    schedulingFindMany.mockResolvedValue([{ id: "e1" }]);
    getCapacityPercent.mockResolvedValue(42);

    const res = await GET();
    const body = await res.json();

    expect(body.scheduling.capacityByRoom).toMatchObject({ PARTY_HALL: 42, CINEMA: 42, GRILL: 42 });
    expect(body.scheduling.upcoming).toEqual([{ id: "e1" }]);
  });

  it("only fetches upcoming events that are neither finished nor cancelled", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    ownerUnitFindMany.mockResolvedValue([]);
    residentFindMany.mockResolvedValue([]);
    schedulingFindMany.mockResolvedValue([]);

    await GET();

    expect(schedulingFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ finishedAt: null, cancelledAt: null }),
        take: 5,
      }),
    );
  });

  it("returns only today's notices pinned to the home dashboard, up to 5", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    ownerUnitFindMany.mockResolvedValue([]);
    residentFindMany.mockResolvedValue([]);
    schedulingFindMany.mockResolvedValue([]);
    noticeFindMany.mockResolvedValue([{ id: "n1" }]);

    const res = await GET();
    const body = await res.json();

    expect(body.notices).toEqual([{ id: "n1" }]);
    expect(noticeFindMany).toHaveBeenCalledWith({
      where: { showOnHome: true, createdAt: { gte: expect.any(Date), lt: expect.any(Date) } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const [{ where }] = noticeFindMany.mock.calls[0];
    const spanMs = where.createdAt.lt.getTime() - where.createdAt.gte.getTime();
    expect(spanMs).toBe(24 * 60 * 60 * 1000);
  });
});
