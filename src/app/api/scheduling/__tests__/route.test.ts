import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findMany = vi.fn();
const count = vi.fn();
const create = vi.fn();
const residentFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    schedulingEntry: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
      create: (...args: unknown[]) => create(...args),
    },
    resident: { findFirst: (...args: unknown[]) => residentFindFirst(...args) },
  },
}));

import { GET, POST } from "../route";

describe("GET /api/scheduling", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findMany.mockReset();
    count.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET(new NextRequest("http://localhost/api/scheduling?room=CINEMA"));
    expect(res.status).toBe(401);
  });

  it("rejects a missing or invalid room", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await GET(new NextRequest("http://localhost/api/scheduling?room=SAUNA"));
    expect(res.status).toBe(400);
  });

  it("returns the list plus the current month's capacity percentage", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValueOnce([{ id: "e1" }]);
    count.mockResolvedValueOnce(3);

    const now = new Date();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const bookedDay = new Date(now.getFullYear(), now.getMonth(), 5);
    findMany.mockResolvedValueOnce([{ eventAt: bookedDay }, { eventAt: bookedDay }]);

    const res = await GET(new NextRequest("http://localhost/api/scheduling?room=CINEMA"));
    const body = await res.json();

    const expectedPercent = Math.round((1 / totalDays) * 100);
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ items: [{ id: "e1" }], total: 3, capacityPercent: expectedPercent });
  });

  it("excludes cancelled entries from the capacity calculation", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValueOnce([]);
    count.mockResolvedValueOnce(0);
    findMany.mockResolvedValueOnce([]);

    await GET(new NextRequest("http://localhost/api/scheduling?room=CINEMA"));

    // Second findMany call is the capacity month-query.
    expect(findMany.mock.calls[1][0]).toMatchObject({ where: expect.objectContaining({ cancelledAt: null }) });
  });

  it("excludes cancelled events but keeps finished ones in the listing", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await GET(new NextRequest("http://localhost/api/scheduling?room=CINEMA"));

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { room: "CINEMA", cancelledAt: null } }));
    expect(count).toHaveBeenCalledWith({ where: { room: "CINEMA", cancelledAt: null } });
  });

  it("orders pending entries before finished ones", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await GET(new NextRequest("http://localhost/api/scheduling?room=CINEMA"));

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ finishedAt: { sort: "asc", nulls: "first" } }, { eventAt: "desc" }],
      }),
    );
  });
});

describe("POST /api/scheduling", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    residentFindFirst.mockReset();
    create.mockReset();
    count.mockReset();
  });

  function postRequest(body: unknown) {
    return new NextRequest("http://localhost/api/scheduling", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  const validBody = {
    room: "CINEMA",
    unit: "101",
    residentId: "t1",
    eventAt: "2026-09-10T20:00:00.000Z",
    allowMultipleSameDay: false,
  };

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid body", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await POST(postRequest({ room: "SAUNA", unit: "101" }));
    expect(res.status).toBe(400);
  });

  it("rejects an event scheduled in the past", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await POST(postRequest({ ...validBody, eventAt: "2020-01-01T10:00:00.000Z" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a residentId that isn't an active resident of the unit", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    residentFindFirst.mockResolvedValue(null);

    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a conflicting same-day booking when allowMultipleSameDay is false", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    residentFindFirst.mockResolvedValue({ name: "Resident Person" });
    count.mockResolvedValue(1);

    const res = await POST(postRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/já existe um evento/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("only counts non-cancelled entries for the same-day conflict check", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    residentFindFirst.mockResolvedValue({ name: "Resident Person" });
    count.mockResolvedValue(0);
    create.mockResolvedValue({ id: "e1" });

    await POST(postRequest(validBody));

    expect(count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ cancelledAt: null }) }));
  });

  it("allows a conflicting same-day booking when allowMultipleSameDay is true", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    residentFindFirst.mockResolvedValue({ name: "Resident Person" });
    count.mockResolvedValue(1);
    create.mockResolvedValue({ id: "e1" });

    const res = await POST(postRequest({ ...validBody, allowMultipleSameDay: true }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalled();
  });

  it("creates the entry with the resident matched by residentId", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    residentFindFirst.mockResolvedValue({ name: "Resident Person" });
    count.mockResolvedValue(0);
    create.mockResolvedValue({ id: "e1", room: "CINEMA", unit: "101", requesterName: "Resident Person" });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
    expect(residentFindFirst).toHaveBeenCalledWith({
      where: { id: "t1", unit: "101", active: true },
      select: { name: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        room: "CINEMA",
        unit: "101",
        requesterName: "Resident Person",
        eventAt: new Date(validBody.eventAt),
        allowMultipleSameDay: false,
        notes: null,
      },
    });
  });

  it("stores the notes when provided", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    residentFindFirst.mockResolvedValue({ name: "Resident Person" });
    count.mockResolvedValue(0);
    create.mockResolvedValue({ id: "e1" });

    const res = await POST(postRequest({ ...validBody, notes: "Som até 22h" }));

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ notes: "Som até 22h" }),
    });
  });
});
