import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const ownerFindUnique = vi.fn();
const ownerUpdate = vi.fn((args: unknown) => ({ op: "owner.update", args }));
const ownerUnitDeleteMany = vi.fn((args: unknown) => ({ op: "ownerUnit.deleteMany", args }));
const residentUpdateMany = vi.fn((args: unknown) => ({ op: "resident.updateMany", args }));
const transaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    owner: {
      findUnique: (...args: unknown[]) => ownerFindUnique(...args),
      update: (args: unknown) => ownerUpdate(args),
    },
    ownerUnit: { deleteMany: (args: unknown) => ownerUnitDeleteMany(args) },
    resident: { updateMany: (args: unknown) => residentUpdateMany(args) },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

const requirePasswordConfirmation = vi.fn();
vi.mock("@/lib/verify-password", () => ({
  requirePasswordConfirmation: (...args: unknown[]) => requirePasswordConfirmation(...args),
}));

import { POST } from "../route";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function unlinkRequest(body: unknown) {
  return new NextRequest("http://localhost/api/owners/o1/unlink", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const session = { user: { role: "ADMIN", id: "u1", name: "Cyro" } };

describe("POST /api/owners/[id]/unlink", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    requirePermission.mockResolvedValue({ session, error: null });
    ownerFindUnique.mockReset();
    ownerUpdate.mockClear();
    ownerUnitDeleteMany.mockClear();
    residentUpdateMany.mockClear();
    transaction.mockReset();
    transaction.mockResolvedValue([]);
    requirePasswordConfirmation.mockReset();
    requirePasswordConfirmation.mockResolvedValue(null);
  });

  it("releases the selected units and keeps the owner active", async () => {
    ownerFindUnique.mockResolvedValue({ active: true, units: [{ unit: "801" }, { unit: "802" }] });

    const res = await POST(unlinkRequest({ units: ["802"], password: "secret" }), params("o1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, deactivated: false, units: ["802"] });
    expect(ownerUnitDeleteMany).toHaveBeenCalledWith({ where: { ownerId: "o1", unit: { in: ["802"] } } });
    // Only the resident record of the released unit goes down with it.
    expect(residentUpdateMany).toHaveBeenCalledWith({
      where: { ownerId: "o1", active: true, unit: { in: ["802"] } },
      data: { active: false, deactivatedBy: "Cyro" },
    });
    expect(ownerUpdate).not.toHaveBeenCalled();
  });

  it("deactivates the owner when the last unit is released", async () => {
    ownerFindUnique.mockResolvedValue({ active: true, units: [{ unit: "1501" }] });

    const res = await POST(unlinkRequest({ units: ["1501"], password: "secret" }), params("o1"));
    const body = await res.json();

    expect(body.deactivated).toBe(true);
    expect(ownerUpdate).toHaveBeenCalledWith({ where: { id: "o1" }, data: { active: false, deactivatedBy: "Cyro" } });
    // Every linked resident goes, not just the ones in the released unit.
    expect(residentUpdateMany).toHaveBeenCalledWith({
      where: { ownerId: "o1", active: true },
      data: { active: false, deactivatedBy: "Cyro" },
    });
  });

  it("rejects a unit the owner doesn't hold", async () => {
    ownerFindUnique.mockResolvedValue({ active: true, units: [{ unit: "801" }] });

    const res = await POST(unlinkRequest({ units: ["999"], password: "secret" }), params("o1"));

    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("does not touch anything when the password is wrong", async () => {
    ownerFindUnique.mockResolvedValue({ active: true, units: [{ unit: "801" }] });
    requirePasswordConfirmation.mockResolvedValue(NextResponse.json({ error: "Senha incorreta" }, { status: 401 }));

    const res = await POST(unlinkRequest({ units: ["801"], password: "wrong" }), params("o1"));

    expect(res.status).toBe(401);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects an empty selection", async () => {
    ownerFindUnique.mockResolvedValue({ active: true, units: [{ unit: "801" }] });

    const res = await POST(unlinkRequest({ units: [], password: "secret" }), params("o1"));

    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses to unlink from an already inactive owner", async () => {
    ownerFindUnique.mockResolvedValue({ active: false, units: [{ unit: "801" }] });

    const res = await POST(unlinkRequest({ units: ["801"], password: "secret" }), params("o1"));

    expect(res.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized request before reading anything", async () => {
    requirePermission.mockResolvedValue({
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await POST(unlinkRequest({ units: ["801"], password: "secret" }), params("o1"));

    expect(res.status).toBe(403);
    expect(ownerFindUnique).not.toHaveBeenCalled();
  });
});
