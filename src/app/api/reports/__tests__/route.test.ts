import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findMany = vi.fn();
const count = vi.fn();
const mezaninoFindMany = vi.fn();
const mezaninoCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    schedulingEntry: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
    },
    mezaninoEntry: {
      findMany: (...args: unknown[]) => mezaninoFindMany(...args),
      count: (...args: unknown[]) => mezaninoCount(...args),
    },
  },
}));

import { GET } from "../route";

describe("GET /api/reports", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findMany.mockReset();
    count.mockReset();
    mezaninoFindMany.mockReset();
    mezaninoCount.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET(new NextRequest("http://localhost/api/reports?room=CINEMA"));
    expect(res.status).toBe(401);
  });

  it("rejects a missing or invalid room", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await GET(new NextRequest("http://localhost/api/reports?room=SAUNA"));
    expect(res.status).toBe(400);
  });

  it("accepts the grill room", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    const res = await GET(new NextRequest("http://localhost/api/reports?room=GRILL"));
    expect(res.status).toBe(200);
  });

  it("rejects a start date after the end date", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await GET(
      new NextRequest("http://localhost/api/reports?room=CINEMA&startDate=2026-08-10&endDate=2026-08-01"),
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/data inicial/i);
  });

  it("allows a future end date — a future-dated event may already be cancelled", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    const res = await GET(new NextRequest("http://localhost/api/reports?room=CINEMA&endDate=2099-01-01"));
    expect(res.status).toBe(200);
  });

  it("matches nothing when no status checkbox is checked", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await GET(new NextRequest("http://localhost/api/reports?room=CINEMA"));

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ room: "CINEMA", id: "" }) }),
    );
  });

  it("lists finished/cancelled entries when Todos is checked", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([{ id: "e1" }]);
    count.mockResolvedValue(1);

    const res = await GET(new NextRequest("http://localhost/api/reports?room=CINEMA&all=true"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ items: [{ id: "e1" }], total: 1 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          room: "CINEMA",
          OR: [{ finishedAt: { not: null } }, { cancelledAt: { not: null } }],
        }),
      }),
    );
  });

  it("queries the mezanino entry table and normalizes rows, including the operator, for a mezanino room", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    mezaninoFindMany.mockResolvedValue([
      {
        id: "m1",
        room: "GAME_ROOM",
        unit: "101",
        residentName: "Resident Person",
        entryAt: new Date("2026-08-10"),
        exitAt: new Date("2026-08-10T12:00:00.000Z"),
        exitConfirmedByUsername: "jonas",
      },
    ]);
    mezaninoCount.mockResolvedValue(1);

    const res = await GET(new NextRequest("http://localhost/api/reports?room=GAME_ROOM&all=true"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(findMany).not.toHaveBeenCalled();
    expect(mezaninoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ room: "GAME_ROOM" }) }),
    );
    expect(body).toMatchObject({
      total: 1,
      items: [{ id: "m1", unit: "101", requesterName: "Resident Person", finishedByUsername: "jonas" }],
    });
  });

  it("maps the cancelled checkbox to pending (no exit yet) for mezanino rooms", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    mezaninoFindMany.mockResolvedValue([]);
    mezaninoCount.mockResolvedValue(0);

    await GET(new NextRequest("http://localhost/api/reports?room=GYM&cancelled=true"));

    expect(mezaninoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ room: "GYM", exitAt: null }) }),
    );
  });

  it("filters by status, date range and unit search", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await GET(
      new NextRequest(
        "http://localhost/api/reports?room=PARTY_HALL&cancelled=true&startDate=2026-08-01&endDate=2026-08-10&q=10",
      ),
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          room: "PARTY_HALL",
          cancelledAt: { not: null },
          unit: { contains: "10" },
          eventAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        }),
      }),
    );
  });
});
