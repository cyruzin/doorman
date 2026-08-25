import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findMany = vi.fn();
const count = vi.fn();
const create = vi.fn();
const tenantFindFirst = vi.fn();
const ownerFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    schedulingEntry: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
      create: (...args: unknown[]) => create(...args),
    },
    tenant: { findFirst: (...args: unknown[]) => tenantFindFirst(...args) },
    owner: { findFirst: (...args: unknown[]) => ownerFindFirst(...args) },
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
    tenantFindFirst.mockReset();
    ownerFindFirst.mockReset();
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

  const validBody = { room: "CINEMA", unit: "101", eventAt: "2026-09-10T20:00:00.000Z", allowMultipleSameDay: false };

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

  it("rejects a unit with no active resident", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    tenantFindFirst.mockResolvedValue(null);
    ownerFindFirst.mockResolvedValue(null);

    const res = await POST(postRequest(validBody));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a conflicting same-day booking when allowMultipleSameDay is false", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    tenantFindFirst.mockResolvedValue({ name: "Tenant Person" });
    ownerFindFirst.mockResolvedValue(null);
    count.mockResolvedValue(1);

    const res = await POST(postRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/já existe um evento/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("only counts non-cancelled entries for the same-day conflict check", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    tenantFindFirst.mockResolvedValue({ name: "Tenant Person" });
    ownerFindFirst.mockResolvedValue(null);
    count.mockResolvedValue(0);
    create.mockResolvedValue({ id: "e1" });

    await POST(postRequest(validBody));

    expect(count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ cancelledAt: null }) }));
  });

  it("allows a conflicting same-day booking when allowMultipleSameDay is true", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    tenantFindFirst.mockResolvedValue({ name: "Tenant Person" });
    ownerFindFirst.mockResolvedValue(null);
    count.mockResolvedValue(1);
    create.mockResolvedValue({ id: "e1" });

    const res = await POST(postRequest({ ...validBody, allowMultipleSameDay: true }));
    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalled();
  });

  it("prefers the tenant name over the owner when both exist", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    tenantFindFirst.mockResolvedValue({ name: "Tenant Person" });
    ownerFindFirst.mockResolvedValue({ name: "Owner Person" });
    count.mockResolvedValue(0);
    create.mockResolvedValue({ id: "e1", room: "CINEMA", unit: "101", requesterName: "Tenant Person" });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: {
        room: "CINEMA",
        unit: "101",
        requesterName: "Tenant Person",
        eventAt: new Date(validBody.eventAt),
        allowMultipleSameDay: false,
        notes: null,
      },
    });
  });

  it("falls back to the owner name when there is no active tenant", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    tenantFindFirst.mockResolvedValue(null);
    ownerFindFirst.mockResolvedValue({ name: "Owner Person" });
    count.mockResolvedValue(0);
    create.mockResolvedValue({ id: "e1", room: "CINEMA", unit: "101", requesterName: "Owner Person" });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ requesterName: "Owner Person" }),
    });
  });

  it("stores the notes when provided", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    tenantFindFirst.mockResolvedValue({ name: "Tenant Person" });
    ownerFindFirst.mockResolvedValue(null);
    count.mockResolvedValue(0);
    create.mockResolvedValue({ id: "e1" });

    const res = await POST(postRequest({ ...validBody, notes: "Som até 22h" }));

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ notes: "Som até 22h" }),
    });
  });
});
