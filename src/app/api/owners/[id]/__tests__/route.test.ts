import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findUnique = vi.fn();
const update = vi.fn();
const del = vi.fn();
const ownerUnitFindMany = vi.fn();
const residentFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    owner: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
      delete: (...args: unknown[]) => del(...args),
    },
    ownerUnit: { findMany: (...args: unknown[]) => ownerUnitFindMany(...args) },
    resident: { findFirst: (...args: unknown[]) => residentFindFirst(...args) },
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

import { DELETE, GET, PATCH } from "../route";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/owners/o1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/owners/[id]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findUnique.mockReset();
  });

  it("returns 404 when the owner doesn't exist", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue(null);

    const res = await GET(new NextRequest("http://localhost/api/owners/o1"), params("o1"));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/owners/[id]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findUnique.mockReset();
    update.mockReset();
    ownerUnitFindMany.mockReset();
    can.mockReset();
    can.mockResolvedValue(true);
    requirePasswordConfirmation.mockReset();
    requirePasswordConfirmation.mockResolvedValue(null);
    ownerUnitFindMany.mockResolvedValue([]);
  });

  it("blocks a DOORMAN from actually flipping active status", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN" } }, error: null });
    can.mockResolvedValue(false);
    findUnique.mockResolvedValue({ active: true, units: [] });

    const res = await PATCH(patchRequest({ active: false }), params("o1"));

    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("lets a DOORMAN edit other fields when active is resubmitted unchanged", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN" } }, error: null });
    findUnique.mockResolvedValue({ active: true, units: [] });
    update.mockResolvedValue({ id: "o1", units: [], phones: [], vehicles: [], residents: [] });

    const res = await PATCH(patchRequest({ name: "Maria Updated", active: true }), params("o1"));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });

  it("deactivates the owner's resident record along with the owner, recording the operator", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", id: "u1", name: "Cyro" } }, error: null });
    findUnique.mockResolvedValue({ active: true, units: [] });
    update.mockResolvedValue({ id: "o1", units: [], phones: [], vehicles: [], residents: [] });

    const res = await PATCH(patchRequest({ active: false, password: "secret" }), params("o1"));

    expect(res.status).toBe(200);
    expect(requirePasswordConfirmation).toHaveBeenCalledWith("u1", "secret");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deactivatedBy: "Cyro",
          residents: { updateMany: { where: { active: true }, data: { active: false, deactivatedBy: "Cyro" } } },
        }),
      }),
    );
  });

  it("refuses to deactivate when the password doesn't check out", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", id: "u1", name: "Cyro" } }, error: null });
    findUnique.mockResolvedValue({ active: true, units: [] });
    requirePasswordConfirmation.mockResolvedValue(NextResponse.json({ error: "Senha incorreta" }, { status: 401 }));

    const res = await PATCH(patchRequest({ active: false, password: "wrong" }), params("o1"));

    expect(res.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it("clears the operator when the owner is reactivated", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", id: "u1", name: "Cyro" } }, error: null });
    findUnique.mockResolvedValue({ active: false, units: [] });
    update.mockResolvedValue({ id: "o1", units: [], phones: [], vehicles: [], residents: [] });

    const res = await PATCH(patchRequest({ active: true }), params("o1"));

    expect(res.status).toBe(200);
    expect(requirePasswordConfirmation).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deactivatedBy: null }) }));
  });

  it("leaves the resident record alone when reactivating the owner", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ active: false, units: [] });
    update.mockResolvedValue({ id: "o1", units: [], phones: [], vehicles: [], residents: [] });

    const res = await PATCH(patchRequest({ active: true }), params("o1"));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.not.objectContaining({ residents: expect.anything() }) }));
  });

  it("refuses to reactivate an owner whose apartment was taken over meanwhile", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", id: "u1", name: "Cyro" } }, error: null });
    findUnique.mockResolvedValue({ active: false, units: [{ unit: "801" }, { unit: "802" }] });
    ownerUnitFindMany.mockResolvedValue([{ unit: "802", owner: { name: "Novo Dono" } }]);

    const res = await PATCH(patchRequest({ active: true }), params("o1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/802 agora pertence a Novo Dono/);
    expect(update).not.toHaveBeenCalled();
  });

  it("sends unit removal on an active owner through Desvincular instead", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", id: "u1", name: "Cyro" } }, error: null });
    findUnique.mockResolvedValue({ active: true, units: [{ unit: "801" }, { unit: "802" }] });

    const res = await PATCH(patchRequest({ units: ["801"] }), params("o1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Desvincular.*802/);
    expect(update).not.toHaveBeenCalled();
  });

  it("still allows dropping a unit from an inactive owner, to clear a conflict before reactivating", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", id: "u1", name: "Cyro" } }, error: null });
    findUnique.mockResolvedValue({ active: false, units: [{ unit: "801" }, { unit: "802" }] });
    update.mockResolvedValue({ id: "o1", units: [{ unit: "801" }], phones: [], vehicles: [], residents: [] });

    const res = await PATCH(patchRequest({ units: ["801"] }), params("o1"));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });

  it("rejects moving to a unit already claimed by a different active owner", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ active: true, units: [] });
    ownerUnitFindMany.mockResolvedValue([{ unit: "205" }]);

    const res = await PATCH(patchRequest({ units: ["205"] }), params("o1"));

    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("excludes the owner's own current units from the conflict check", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ active: true, units: [] });
    ownerUnitFindMany.mockResolvedValue([]);
    update.mockResolvedValue({ id: "o1", units: [{ unit: "101" }], phones: [], vehicles: [], residents: [] });

    const res = await PATCH(patchRequest({ units: ["101"] }), params("o1"));

    expect(res.status).toBe(200);
    expect(ownerUnitFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ owner: expect.objectContaining({ id: { not: "o1" } }) }) }),
    );
  });
});

describe("DELETE /api/owners/[id]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    residentFindFirst.mockReset();
    del.mockReset();
  });

  it("blocks deletion when a resident is linked as this owner", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    residentFindFirst.mockResolvedValue({ id: "r1" });

    const res = await DELETE(new NextRequest("http://localhost/api/owners/o1"), params("o1"));

    expect(res.status).toBe(400);
    expect(del).not.toHaveBeenCalled();
  });

  it("deletes the owner when no resident is linked", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    residentFindFirst.mockResolvedValue(null);
    del.mockResolvedValue({ id: "o1" });

    const res = await DELETE(new NextRequest("http://localhost/api/owners/o1"), params("o1"));

    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith({ where: { id: "o1" } });
  });
});
