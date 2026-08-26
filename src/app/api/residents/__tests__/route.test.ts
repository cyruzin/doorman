import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findMany = vi.fn();
const count = vi.fn();
const create = vi.fn();
const residentFindFirst = vi.fn();
const ownerUnitFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    resident: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
      create: (...args: unknown[]) => create(...args),
      findFirst: (...args: unknown[]) => residentFindFirst(...args),
    },
    ownerUnit: { findFirst: (...args: unknown[]) => ownerUnitFindFirst(...args) },
  },
}));

import { GET, POST } from "../route";

function validResidentBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "João",
    cpf: "",
    email: "",
    unit: "101",
    active: true,
    isOwner: false,
    phones: [],
    vehicles: [],
    ...overrides,
  };
}

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/residents", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/residents", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findMany.mockReset();
    count.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET(new NextRequest("http://localhost/api/residents"));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/residents", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    create.mockReset();
    residentFindFirst.mockReset();
    ownerUnitFindFirst.mockReset();
  });

  it("rejects a unit with no active owner", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindFirst.mockResolvedValue(null);

    const res = await POST(postRequest(validResidentBody()));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/sem proprietário/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a plain resident (not the owner) untouched", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindFirst.mockResolvedValue({ owner: { id: "o1", name: "Owner", cpf: "1", email: "o@x.com" } });
    create.mockResolvedValue({ id: "r1" });

    const res = await POST(postRequest(validResidentBody({ name: "João", cpf: "999" })));

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "João", cpf: "999", ownerId: null }),
      }),
    );
  });

  it("rejects isOwner without a matching ownerId for the unit", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindFirst.mockResolvedValue({ owner: { id: "o1", name: "Owner", cpf: "1", email: "o@x.com" } });
    residentFindFirst.mockResolvedValue(null);

    const res = await POST(postRequest(validResidentBody({ isOwner: true, ownerId: "wrong-id" })));

    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("derives name/cpf/email from the linked owner when isOwner is true", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindFirst.mockResolvedValue({ owner: { id: "o1", name: "Owner Real Name", cpf: "111", email: "owner@x.com" } });
    residentFindFirst.mockResolvedValue(null);
    create.mockResolvedValue({ id: "r1" });

    const res = await POST(
      postRequest(validResidentBody({ isOwner: true, ownerId: "o1", name: "Whatever Typed", cpf: "000" })),
    );

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Owner Real Name",
          cpf: "111",
          email: "owner@x.com",
          ownerId: "o1",
        }),
      }),
    );
  });

  it("rejects isOwner when another resident already represents this unit's owner (the exact duplication bug)", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindFirst.mockResolvedValue({ owner: { id: "o1", name: "Lúcia", cpf: "111", email: "lucia@x.com" } });
    residentFindFirst.mockResolvedValue({ id: "existing-resident" });

    const res = await POST(postRequest(validResidentBody({ isOwner: true, ownerId: "o1" })));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/já existe um morador cadastrado como proprietário/i);
    expect(create).not.toHaveBeenCalled();
  });
});
