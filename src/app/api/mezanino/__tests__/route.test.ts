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
    mezaninoEntry: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
      create: (...args: unknown[]) => create(...args),
    },
    resident: { findFirst: (...args: unknown[]) => residentFindFirst(...args) },
  },
}));

import { GET, POST } from "../route";

describe("GET /api/mezanino", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findMany.mockReset();
    count.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET(new NextRequest("http://localhost/api/mezanino?room=GAME_ROOM"));
    expect(res.status).toBe(401);
  });

  it("rejects a missing or invalid room", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await GET(new NextRequest("http://localhost/api/mezanino?room=SAUNA"));
    expect(res.status).toBe(400);
  });

  it("returns today's entries plus whether the room is currently occupied", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([{ id: "e1" }]);
    count.mockResolvedValueOnce(1); // total for today
    count.mockResolvedValueOnce(2); // occupied count

    const res = await GET(new NextRequest("http://localhost/api/mezanino?room=GYM"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ items: [{ id: "e1" }], total: 1, occupied: true });
  });
});

describe("POST /api/mezanino", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    residentFindFirst.mockReset();
    create.mockReset();
  });

  function postRequest(body: unknown) {
    return new NextRequest("http://localhost/api/mezanino", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    });
  }

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await POST(postRequest({ room: "GYM", unit: "101", residentId: "t1" }));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid body", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await POST(postRequest({ room: "SAUNA", unit: "101", residentId: "t1" }));
    expect(res.status).toBe(400);
  });

  it("rejects a residentId that isn't an active resident of the unit", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    residentFindFirst.mockResolvedValue(null);

    const res = await POST(postRequest({ room: "GYM", unit: "101", residentId: "t1" }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the entry with the resident matched by residentId", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    residentFindFirst.mockResolvedValue({ name: "Resident Person" });
    create.mockResolvedValue({ id: "e1", room: "GYM", unit: "101", residentName: "Resident Person" });

    const res = await POST(postRequest({ room: "GYM", unit: "101", residentId: "t1" }));

    expect(res.status).toBe(201);
    expect(residentFindFirst).toHaveBeenCalledWith({
      where: { id: "t1", unit: "101", active: true },
      select: { name: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: { room: "GYM", unit: "101", residentName: "Resident Person" },
    });
  });
});
