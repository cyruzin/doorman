import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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
  });

  it("blocks a DOORMAN from actually flipping active status", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN" } }, error: null });
    findUnique.mockResolvedValue({ active: true });

    const res = await PATCH(patchRequest({ active: false }), params("o1"));

    expect(res.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("lets a DOORMAN edit other fields when active is resubmitted unchanged", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN" } }, error: null });
    findUnique.mockResolvedValue({ active: true });
    update.mockResolvedValue({ id: "o1", units: [], phones: [], vehicles: [], residents: [] });

    const res = await PATCH(patchRequest({ name: "Maria Updated", active: true }), params("o1"));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalled();
  });

  it("rejects moving to a unit already claimed by a different active owner", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ active: true });
    ownerUnitFindMany.mockResolvedValue([{ unit: "205" }]);

    const res = await PATCH(patchRequest({ units: ["205"] }), params("o1"));

    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("excludes the owner's own current units from the conflict check", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    findUnique.mockResolvedValue({ active: true });
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
