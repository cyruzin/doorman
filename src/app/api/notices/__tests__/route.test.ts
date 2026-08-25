import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findMany = vi.fn();
const count = vi.fn();
const create = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notice: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

import { GET, POST } from "../route";

describe("GET /api/notices", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findMany.mockReset();
    count.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET(new NextRequest("http://localhost/api/notices"));
    expect(res.status).toBe(401);
  });

  it("lists notices newest first, with no date filter by default", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([{ id: "n1" }]);
    count.mockResolvedValue(1);

    const res = await GET(new NextRequest("http://localhost/api/notices"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ items: [{ id: "n1" }], total: 1 });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {}, orderBy: { createdAt: "desc" } }));
  });

  it("filters by a startDate/endDate range when given", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await GET(new NextRequest("http://localhost/api/notices?startDate=2026-08-01&endDate=2026-08-10"));

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { createdAt: { gte: new Date("2026-08-01T00:00:00"), lte: new Date("2026-08-10T23:59:59.999") } },
      }),
    );
    expect(count).toHaveBeenCalledWith({
      where: { createdAt: { gte: new Date("2026-08-01T00:00:00"), lte: new Date("2026-08-10T23:59:59.999") } },
    });
  });

  it("rejects a start date after the end date", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await GET(new NextRequest("http://localhost/api/notices?startDate=2026-08-10&endDate=2026-08-01"));
    expect(res.status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/notices", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    create.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await POST(new NextRequest("http://localhost/api/notices", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("rejects an empty message", async () => {
    requirePermission.mockResolvedValue({ session: { user: { name: "raimundo" } }, error: null });

    const res = await POST(
      new NextRequest("http://localhost/api/notices", { method: "POST", body: JSON.stringify({ message: "" }) }),
    );
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a notice stamped with the logged-in username, defaulting showOnHome to false", async () => {
    requirePermission.mockResolvedValue({ session: { user: { name: "raimundo" } }, error: null });
    create.mockResolvedValue({ id: "n1", message: "Encomenda do 304 na portaria", authorUsername: "raimundo" });

    const res = await POST(
      new NextRequest("http://localhost/api/notices", {
        method: "POST",
        body: JSON.stringify({ message: "Encomenda do 304 na portaria" }),
      }),
    );

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: { message: "Encomenda do 304 na portaria", showOnHome: false, authorUsername: "raimundo" },
    });
  });

  it("honors showOnHome when set", async () => {
    requirePermission.mockResolvedValue({ session: { user: { name: "raimundo" } }, error: null });
    create.mockResolvedValue({ id: "n1" });

    await POST(
      new NextRequest("http://localhost/api/notices", {
        method: "POST",
        body: JSON.stringify({ message: "Aviso pro próximo plantão", showOnHome: true }),
      }),
    );

    expect(create).toHaveBeenCalledWith({
      data: { message: "Aviso pro próximo plantão", showOnHome: true, authorUsername: "raimundo" },
    });
  });
});
