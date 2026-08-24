import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findUnique = vi.fn();
const update = vi.fn();
const count = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    schedulingEntry: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
      count: (...args: unknown[]) => count(...args),
    },
  },
}));

import { DELETE, PATCH } from "../route";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost/api/scheduling/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const validUpdate = { eventAt: "2026-09-10T20:00:00.000Z", allowMultipleSameDay: false };

describe("PATCH /api/scheduling/[id]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findUnique.mockReset();
    update.mockReset();
    count.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await PATCH(patchRequest("e1", validUpdate), params("e1"));
    expect(res.status).toBe(401);
  });

  it("404s when the entry doesn't exist", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue(null);

    const res = await PATCH(patchRequest("e1", validUpdate), params("e1"));
    expect(res.status).toBe(404);
  });

  it("rejects editing an already-finished event", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", room: "CINEMA", finishedAt: new Date(), cancelledAt: null });

    const res = await PATCH(patchRequest("e1", validUpdate), params("e1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects editing a cancelled event", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", room: "CINEMA", finishedAt: null, cancelledAt: new Date() });

    const res = await PATCH(patchRequest("e1", validUpdate), params("e1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects an invalid body", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", room: "CINEMA", finishedAt: null, cancelledAt: null });

    const res = await PATCH(patchRequest("e1", { eventAt: "" }), params("e1"));
    expect(res.status).toBe(400);
  });

  it("rejects rescheduling to a past date", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", room: "CINEMA", finishedAt: null });

    const res = await PATCH(patchRequest("e1", { ...validUpdate, eventAt: "2020-01-01T10:00:00.000Z" }), params("e1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a conflicting same-day reschedule when allowMultipleSameDay is false", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", room: "CINEMA", finishedAt: null });
    count.mockResolvedValue(1);

    const res = await PATCH(patchRequest("e1", validUpdate), params("e1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates the event when there is no conflict", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", room: "CINEMA", finishedAt: null });
    count.mockResolvedValue(0);
    update.mockResolvedValue({ id: "e1" });

    const res = await PATCH(patchRequest("e1", validUpdate), params("e1"));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { eventAt: new Date(validUpdate.eventAt), allowMultipleSameDay: false, notes: null },
    });
  });

  it("excludes itself from the same-day conflict check", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", room: "CINEMA", finishedAt: null });
    count.mockResolvedValue(0);
    update.mockResolvedValue({ id: "e1" });

    await PATCH(patchRequest("e1", validUpdate), params("e1"));
    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { not: "e1" } }) }),
    );
  });

  it("only counts non-cancelled entries for the same-day conflict check", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ id: "e1", room: "CINEMA", finishedAt: null });
    count.mockResolvedValue(0);
    update.mockResolvedValue({ id: "e1" });

    await PATCH(patchRequest("e1", validUpdate), params("e1"));
    expect(count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ cancelledAt: null }) }));
  });
});

describe("DELETE /api/scheduling/[id]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findUnique.mockReset();
    update.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await DELETE(new NextRequest("http://localhost/api/scheduling/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(401);
  });

  it("404s when the entry doesn't exist", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue(null);

    const res = await DELETE(new NextRequest("http://localhost/api/scheduling/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects cancelling an already-cancelled event", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ id: "e1", finishedAt: null, cancelledAt: new Date() });

    const res = await DELETE(new NextRequest("http://localhost/api/scheduling/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("soft-cancels an existing entry instead of deleting it, recording who cancelled it", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", name: "jonas" } }, error: null });
    findUnique.mockResolvedValue({ id: "e1", finishedAt: null, cancelledAt: null });
    update.mockResolvedValue({ id: "e1" });

    const res = await DELETE(new NextRequest("http://localhost/api/scheduling/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { cancelledAt: expect.any(Date), cancelledByUsername: "jonas" },
    });
  });

  it("blocks a doorman from cancelling a finished event", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN" } }, error: null });
    findUnique.mockResolvedValue({ id: "e1", finishedAt: new Date(), cancelledAt: null });

    const res = await DELETE(new NextRequest("http://localhost/api/scheduling/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("lets a doorman cancel a not-yet-finished event", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN" } }, error: null });
    findUnique.mockResolvedValue({ id: "e1", finishedAt: null, cancelledAt: null });
    update.mockResolvedValue({ id: "e1" });

    const res = await DELETE(new NextRequest("http://localhost/api/scheduling/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { cancelledAt: expect.any(Date) } });
  });

  it("lets an admin cancel a finished event", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ id: "e1", finishedAt: new Date(), cancelledAt: null });
    update.mockResolvedValue({ id: "e1" });

    const res = await DELETE(new NextRequest("http://localhost/api/scheduling/e1", { method: "DELETE" }), params("e1"));
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ where: { id: "e1" }, data: { cancelledAt: expect.any(Date) } });
  });
});
