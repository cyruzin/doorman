import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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

const can = vi.fn();
vi.mock("@/lib/permissions-db", () => ({
  can: (...args: unknown[]) => can(...args),
}));

const requirePasswordConfirmation = vi.fn();
vi.mock("@/lib/verify-password", () => ({
  requirePasswordConfirmation: (...args: unknown[]) => requirePasswordConfirmation(...args),
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
    can.mockReset();
    can.mockResolvedValue(true);
    requirePasswordConfirmation.mockReset();
    requirePasswordConfirmation.mockResolvedValue(null);
  });

  it("blocks a DOORMAN from actually flipping active status", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN" } }, error: null });
    can.mockResolvedValue(false);
    findUnique.mockResolvedValue({ active: true, unit: "101", isOwner: false });

    const res = await PATCH(patchRequest({ active: false }), params("r1"));

    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("records who deactivated the resident, after confirming their password", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", id: "u1", name: "Cyro" } }, error: null });
    findUnique.mockResolvedValue({ active: true, unit: "101", isOwner: false });
    update.mockResolvedValue({ id: "r1" });

    const res = await PATCH(patchRequest({ active: false, password: "secret" }), params("r1"));

    expect(res.status).toBe(200);
    expect(requirePasswordConfirmation).toHaveBeenCalledWith("u1", "secret");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ active: false, deactivatedBy: "Cyro" }) }),
    );
  });

  it("refuses to deactivate when the password doesn't check out", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", id: "u1", name: "Cyro" } }, error: null });
    findUnique.mockResolvedValue({ active: true, unit: "101", isOwner: false });
    requirePasswordConfirmation.mockResolvedValue(NextResponse.json({ error: "Senha incorreta" }, { status: 401 }));

    const res = await PATCH(patchRequest({ active: false, password: "wrong" }), params("r1"));

    expect(res.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it("leaves the owner record alone when the resident is also the unit's owner", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", id: "u1", name: "Cyro" } }, error: null });
    findUnique.mockResolvedValue({ active: true, unit: "506", isOwner: true });
    update.mockResolvedValue({ id: "r1" });

    const res = await PATCH(patchRequest({ active: false, password: "secret" }), params("r1"));

    expect(res.status).toBe(200);
    // Moving out is not selling: only the resident row goes inactive, the ownership link stays.
    // (The prisma mock has no `owner` model at all, so any write to it would blow up here.)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ isOwner: expect.anything(), ownerId: expect.anything() }),
      }),
    );
  });

  it("clears the operator when the resident is reactivated", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", id: "u1", name: "Cyro" } }, error: null });
    findUnique.mockResolvedValue({ active: false, unit: "101", isOwner: false });
    update.mockResolvedValue({ id: "r1" });

    const res = await PATCH(patchRequest({ active: true }), params("r1"));

    expect(res.status).toBe(200);
    expect(requirePasswordConfirmation).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deactivatedBy: null }) }));
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
