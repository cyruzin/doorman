import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const can = vi.fn();
vi.mock("@/lib/permissions-db", () => ({
  can: (...args: unknown[]) => can(...args),
}));

const findClaimedUnits = vi.fn();
vi.mock("@/lib/owner-units", () => ({
  findClaimedUnits: (...args: unknown[]) => findClaimedUnits(...args),
}));

const residentFindUnique = vi.fn();
const ownerCreate = vi.fn();
const residentUpdate = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    resident: {
      findUnique: (...args: unknown[]) => residentFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

import { POST } from "../route";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function promoteRequest(body: unknown) {
  return new NextRequest("http://localhost/api/residents/r1/promote-to-owner", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const session = { user: { role: "DOORMAN", id: "u1", name: "Cyro" } };

describe("POST /api/residents/[id]/promote-to-owner", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    requirePermission.mockResolvedValue({ session, error: null });
    can.mockReset();
    can.mockResolvedValue(true);
    findClaimedUnits.mockReset();
    findClaimedUnits.mockResolvedValue([]);
    residentFindUnique.mockReset();
    ownerCreate.mockReset();
    residentUpdate.mockReset();
    transaction.mockReset();
    transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn({
        owner: { create: (args: unknown) => ownerCreate(args) },
        resident: { update: (args: unknown) => residentUpdate(args) },
      }),
    );
  });

  it("creates the owner and links the resident to it", async () => {
    residentFindUnique.mockResolvedValue({ unit: "1306", active: true, isOwner: false });
    const created = { id: "o1", name: "Ana", cpf: "11111111111", email: null };
    ownerCreate.mockResolvedValue(created);

    const res = await POST(promoteRequest({ name: "Ana", cpf: "111.111.111-11" }), params("r1"));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(created);
    expect(ownerCreate).toHaveBeenCalledWith({
      data: { name: "Ana", cpf: "111.111.111-11", units: { create: [{ unit: "1306" }] } },
    });
    expect(residentUpdate).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { isOwner: true, ownerId: "o1", name: "Ana", cpf: "11111111111", email: null },
    });
  });

  it("404s when the resident doesn't exist", async () => {
    residentFindUnique.mockResolvedValue(null);

    const res = await POST(promoteRequest({ name: "Ana" }), params("r1"));

    expect(res.status).toBe(404);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects an inactive resident", async () => {
    residentFindUnique.mockResolvedValue({ unit: "1306", active: false, isOwner: false });

    const res = await POST(promoteRequest({ name: "Ana" }), params("r1"));

    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects a resident who is already an owner", async () => {
    residentFindUnique.mockResolvedValue({ unit: "1306", active: true, isOwner: true });

    const res = await POST(promoteRequest({ name: "Ana" }), params("r1"));

    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects a unit that already has an owner (race with another admin)", async () => {
    residentFindUnique.mockResolvedValue({ unit: "1306", active: true, isOwner: false });
    findClaimedUnits.mockResolvedValue(["1306"]);

    const res = await POST(promoteRequest({ name: "Ana" }), params("r1"));

    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("requires residents:update in addition to owners:create", async () => {
    residentFindUnique.mockResolvedValue({ unit: "1306", active: true, isOwner: false });
    can.mockResolvedValue(false);

    const res = await POST(promoteRequest({ name: "Ana" }), params("r1"));

    expect(res.status).toBe(403);
    expect(residentFindUnique).not.toHaveBeenCalled();
  });

  it("reports a friendly error on a duplicate cpf", async () => {
    residentFindUnique.mockResolvedValue({ unit: "1306", active: true, isOwner: false });
    ownerCreate.mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));

    const res = await POST(promoteRequest({ name: "Ana", cpf: "11111111111" }), params("r1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/já existe um proprietário/i);
  });
});
