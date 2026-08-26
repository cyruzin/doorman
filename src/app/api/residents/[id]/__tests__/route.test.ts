import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findUnique = vi.fn();
const update = vi.fn();
const residentFindFirst = vi.fn();
const ownerUnitFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    resident: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
      findFirst: (...args: unknown[]) => residentFindFirst(...args),
    },
    ownerUnit: { findFirst: (...args: unknown[]) => ownerUnitFindFirst(...args) },
  },
}));

import { PATCH } from "../route";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/residents/r1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("PATCH /api/residents/[id]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findUnique.mockReset();
    update.mockReset();
    residentFindFirst.mockReset();
    ownerUnitFindFirst.mockReset();
  });

  it("blocks a DOORMAN from actually flipping active status", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN" } }, error: null });
    findUnique.mockResolvedValue({ active: true, unit: "101", isOwner: false });

    const res = await PATCH(patchRequest({ active: false }), params("r1"));

    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("skips re-resolving the owner link when unit/isOwner/ownerId are untouched", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ active: true, unit: "101", isOwner: false });
    update.mockResolvedValue({ id: "r1" });

    const res = await PATCH(patchRequest({ name: "New Name" }), params("r1"));

    expect(res.status).toBe(200);
    expect(ownerUnitFindFirst).not.toHaveBeenCalled();
  });

  it("re-derives name/cpf/email when isOwner flips on with a valid ownerId", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ active: true, unit: "101", isOwner: false });
    residentFindFirst.mockResolvedValue(null);
    ownerUnitFindFirst.mockResolvedValue({ owner: { id: "o1", name: "Owner Name", cpf: "111", email: "o@x.com" } });
    update.mockResolvedValue({ id: "r1" });

    const res = await PATCH(patchRequest({ isOwner: true, ownerId: "o1" }), params("r1"));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: "o1", name: "Owner Name", cpf: "111", email: "o@x.com" }),
      }),
    );
  });

  it("rejects re-linking to an ownerId that doesn't own the unit", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ active: true, unit: "101", isOwner: false });
    residentFindFirst.mockResolvedValue(null);
    ownerUnitFindFirst.mockResolvedValue({ owner: { id: "o1", name: "Owner Name", cpf: "111", email: "o@x.com" } });

    const res = await PATCH(patchRequest({ isOwner: true, ownerId: "someone-else" }), params("r1"));

    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects flipping isOwner on when another resident already represents the unit's owner", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ active: true, unit: "101", isOwner: false });
    ownerUnitFindFirst.mockResolvedValue({ owner: { id: "o1", name: "Owner Name", cpf: "111", email: "o@x.com" } });
    residentFindFirst.mockResolvedValue({ id: "other-resident" });

    const res = await PATCH(patchRequest({ isOwner: true, ownerId: "o1" }), params("r1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/já existe um morador cadastrado como proprietário/i);
    expect(update).not.toHaveBeenCalled();
    expect(residentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ unit: "101", isOwner: true, id: { not: "r1" } }) }),
    );
  });

  it("allows re-saving isOwner:true for the resident who already is the owner (excludes itself)", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ active: true, unit: "101", isOwner: true });
    ownerUnitFindFirst.mockResolvedValue({ owner: { id: "o1", name: "Owner Name", cpf: "111", email: "o@x.com" } });
    residentFindFirst.mockResolvedValue(null);
    update.mockResolvedValue({ id: "r1" });

    const res = await PATCH(patchRequest({ name: "New Name", isOwner: true, ownerId: "o1" }), params("r1"));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });
});
