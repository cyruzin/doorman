import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findUnique = vi.fn();
const update = vi.fn();
const del = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mezaninoEntry: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
      delete: (...args: unknown[]) => del(...args),
    },
  },
}));

import { DELETE, PATCH } from "../route";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("PATCH /api/mezanino/[id]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findUnique.mockReset();
    update.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await PATCH(new NextRequest("http://localhost/api/mezanino/e1", { method: "PATCH" }), params("e1"));
    expect(res.status).toBe(401);
  });

  it("404s when the entry doesn't exist", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue(null);

    const res = await PATCH(new NextRequest("http://localhost/api/mezanino/e1", { method: "PATCH" }), params("e1"));
    expect(res.status).toBe(404);
  });

  it("rejects confirming an exit twice", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", exitAt: new Date() });

    const res = await PATCH(new NextRequest("http://localhost/api/mezanino/e1", { method: "PATCH" }), params("e1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("sets exitAt when the entry is still pending", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", exitAt: null });
    update.mockResolvedValue({ id: "e1", exitAt: new Date().toISOString() });

    const res = await PATCH(new NextRequest("http://localhost/api/mezanino/e1", { method: "PATCH" }), params("e1"));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { exitAt: expect.any(Date) } });
  });
});

describe("DELETE /api/mezanino/[id]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findUnique.mockReset();
    del.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await DELETE(new NextRequest("http://localhost/api/mezanino/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(401);
  });

  it("404s when the entry doesn't exist", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue(null);

    const res = await DELETE(new NextRequest("http://localhost/api/mezanino/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(404);
    expect(del).not.toHaveBeenCalled();
  });

  it("removes an existing entry", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1" });
    del.mockResolvedValue({ id: "e1" });

    const res = await DELETE(new NextRequest("http://localhost/api/mezanino/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith({ where: { id: "e1" } });
  });

  it("blocks a doorman from deleting an entry with a confirmed exit", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN" } }, error: null });
    findUnique.mockResolvedValue({ id: "e1", exitAt: new Date() });

    const res = await DELETE(new NextRequest("http://localhost/api/mezanino/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(403);
    expect(del).not.toHaveBeenCalled();
  });

  it("lets a doorman delete a still-pending entry", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN" } }, error: null });
    findUnique.mockResolvedValue({ id: "e1", exitAt: null });
    del.mockResolvedValue({ id: "e1" });

    const res = await DELETE(new NextRequest("http://localhost/api/mezanino/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith({ where: { id: "e1" } });
  });

  it("lets an admin delete an entry with a confirmed exit", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ id: "e1", exitAt: new Date() });
    del.mockResolvedValue({ id: "e1" });

    const res = await DELETE(new NextRequest("http://localhost/api/mezanino/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith({ where: { id: "e1" } });
  });
});
