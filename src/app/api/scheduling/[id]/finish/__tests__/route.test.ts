import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findUnique = vi.fn();
const update = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    schedulingEntry: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

import { PATCH } from "../route";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/scheduling/[id]/finish", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findUnique.mockReset();
    update.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await PATCH(new NextRequest("http://localhost/api/scheduling/e1/finish", { method: "PATCH" }), params("e1"));
    expect(res.status).toBe(401);
  });

  it("404s when the entry doesn't exist", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue(null);

    const res = await PATCH(new NextRequest("http://localhost/api/scheduling/e1/finish", { method: "PATCH" }), params("e1"));
    expect(res.status).toBe(404);
  });

  it("rejects finishing an already-finished event", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", finishedAt: new Date(), cancelledAt: null });

    const res = await PATCH(new NextRequest("http://localhost/api/scheduling/e1/finish", { method: "PATCH" }), params("e1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects finishing a cancelled event", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", finishedAt: null, cancelledAt: new Date() });

    const res = await PATCH(new NextRequest("http://localhost/api/scheduling/e1/finish", { method: "PATCH" }), params("e1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("sets finishedAt and finishedByUsername when the event is not yet finished", async () => {
    requirePermission.mockResolvedValue({ session: { user: { name: "jonas" } }, error: null });
    findUnique.mockResolvedValue({ id: "e1", finishedAt: null, cancelledAt: null });
    update.mockResolvedValue({ id: "e1", finishedAt: new Date().toISOString() });

    const res = await PATCH(new NextRequest("http://localhost/api/scheduling/e1/finish", { method: "PATCH" }), params("e1"));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { finishedAt: expect.any(Date), finishedByUsername: "jonas" },
    });
  });
});
