import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findMany = vi.fn();
const count = vi.fn();
const create = vi.fn();
const ownerUnitFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    owner: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
      create: (...args: unknown[]) => create(...args),
    },
    ownerUnit: { findMany: (...args: unknown[]) => ownerUnitFindMany(...args) },
  },
}));

import { GET, POST } from "../route";

function validOwnerBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Maria",
    cpf: "12345678900",
    email: "",
    active: true,
    units: ["101"],
    phones: [],
    vehicles: [],
    ...overrides,
  };
}

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/owners", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/owners", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findMany.mockReset();
    count.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await GET(new NextRequest("http://localhost/api/owners"));
    expect(res.status).toBe(401);
  });

  it("flattens the units relation into a plain string array", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([
      { id: "o1", units: [{ unit: "101" }, { unit: "205" }], phones: [], vehicles: [], residents: [] },
    ]);
    count.mockResolvedValue(1);

    const res = await GET(new NextRequest("http://localhost/api/owners"));
    const body = await res.json();

    expect(body.items[0].units).toEqual(["101", "205"]);
  });
});

describe("POST /api/owners", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    create.mockReset();
    ownerUnitFindMany.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await POST(postRequest(validOwnerBody()));
    expect(res.status).toBe(401);
  });

  it("creates the owner with no cpf, normalizing the empty string to null", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindMany.mockResolvedValue([]);
    create.mockResolvedValue({ id: "o1", units: [{ unit: "101" }], phones: [], vehicles: [], residents: [] });

    const res = await POST(postRequest(validOwnerBody({ cpf: "" })));

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ cpf: null }) }));
  });

  it("rejects a body with no units", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await POST(postRequest(validOwnerBody({ units: [] })));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects when a unit is already claimed by another active owner", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindMany.mockResolvedValue([{ unit: "101" }]);

    const res = await POST(postRequest(validOwnerBody({ units: ["101", "205"] })));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/101/);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the owner with multiple units when none are claimed", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindMany.mockResolvedValue([]);
    create.mockResolvedValue({ id: "o1", units: [{ unit: "101" }, { unit: "205" }], phones: [], vehicles: [], residents: [] });

    const res = await POST(postRequest(validOwnerBody({ units: ["101", "205"] })));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ units: { create: [{ unit: "101" }, { unit: "205" }] } }),
      }),
    );
    expect(body.units).toEqual(["101", "205"]);
  });

  it("returns a friendly error when the cpf is already taken", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    ownerUnitFindMany.mockResolvedValue([]);
    create.mockRejectedValue(Object.assign(new Error("Unique constraint"), { code: "P2002" }));

    const res = await POST(postRequest(validOwnerBody()));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/cpf/i);
  });
});
