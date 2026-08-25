import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const tenantCreate = vi.fn();
const tenantUpdate = vi.fn();
const ownerCreate = vi.fn();
const ownerUpdate = vi.fn();
const ownerFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: (...args: unknown[]) => tenantCreate(...args),
      update: (...args: unknown[]) => tenantUpdate(...args),
      delete: vi.fn(),
    },
    owner: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: (...args: unknown[]) => ownerCreate(...args),
      update: (...args: unknown[]) => ownerUpdate(...args),
      delete: vi.fn(),
      findFirst: (...args: unknown[]) => ownerFindFirst(...args),
    },
  },
}));

import { createPersonCollectionHandlers, createPersonItemHandlers } from "../person-crud";

const { POST: createTenant } = createPersonCollectionHandlers("tenant", "tenants");
const { POST: createOwner } = createPersonCollectionHandlers("owner", "owners");
const { PATCH: patchTenant } = createPersonItemHandlers("tenant", "tenants");
const { PATCH: patchOwner } = createPersonItemHandlers("owner", "owners");

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/tenants", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function patchRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("tenant/owner unit-has-an-owner rule", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN" } }, error: null });
    tenantCreate.mockReset();
    tenantUpdate.mockReset();
    ownerCreate.mockReset();
    ownerUpdate.mockReset();
    ownerFindFirst.mockReset();
  });

  it("rejects creating a tenant for a unit with no active owner", async () => {
    ownerFindFirst.mockResolvedValue(null);

    const res = await createTenant(postRequest({ name: "Maria", unit: "101", active: true, phones: [], vehicles: [] }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/sem proprietário cadastrado/i);
    expect(tenantCreate).not.toHaveBeenCalled();
  });

  it("allows creating a tenant when the unit has an active owner, auto-linking to it", async () => {
    ownerFindFirst.mockResolvedValue({ id: "o1" });
    tenantCreate.mockResolvedValue({ id: "t1" });

    const res = await createTenant(postRequest({ name: "Maria", unit: "101", active: true, phones: [], vehicles: [] }));

    expect(res.status).toBe(201);
    expect(ownerFindFirst).toHaveBeenCalledWith({ where: { unit: "101", active: true }, select: { id: true } });
    expect(tenantCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ownerId: "o1" }) }));
  });

  it("does not apply the owner check when creating an owner", async () => {
    ownerCreate.mockResolvedValue({ id: "o1" });

    const res = await createOwner(postRequest({ name: "Owner", unit: "999", active: true, phones: [], vehicles: [] }));

    expect(res.status).toBe(201);
    expect(ownerFindFirst).not.toHaveBeenCalled();
    expect(ownerCreate).toHaveBeenCalled();
  });

  it("rejects moving a tenant to a unit with no active owner", async () => {
    ownerFindFirst.mockResolvedValue(null);

    const res = await patchTenant(patchRequest("http://localhost/api/tenants/t1", { unit: "202" }), params("t1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/sem proprietário cadastrado/i);
    expect(tenantUpdate).not.toHaveBeenCalled();
  });

  it("re-links a tenant to the new unit's owner when the unit changes", async () => {
    ownerFindFirst.mockResolvedValue({ id: "o2" });
    tenantUpdate.mockResolvedValue({ id: "t1" });

    const res = await patchTenant(patchRequest("http://localhost/api/tenants/t1", { unit: "202" }), params("t1"));

    expect(res.status).toBe(200);
    expect(tenantUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ ownerId: "o2" }) }));
  });

  it("allows updating a tenant without touching unit, skipping the owner check", async () => {
    tenantUpdate.mockResolvedValue({ id: "t1" });

    const res = await patchTenant(patchRequest("http://localhost/api/tenants/t1", { name: "Maria Updated" }), params("t1"));

    expect(res.status).toBe(200);
    expect(ownerFindFirst).not.toHaveBeenCalled();
    expect(tenantUpdate).toHaveBeenCalled();
  });

  it("does not apply the owner check when updating an owner", async () => {
    ownerUpdate.mockResolvedValue({ id: "o1" });

    const res = await patchOwner(patchRequest("http://localhost/api/owners/o1", { unit: "999" }), params("o1"));

    expect(res.status).toBe(200);
    expect(ownerFindFirst).not.toHaveBeenCalled();
    expect(ownerUpdate).toHaveBeenCalled();
  });
});
