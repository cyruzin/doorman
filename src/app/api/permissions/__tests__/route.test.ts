import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => auth(...args),
}));

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const getPermissionsMatrix = vi.fn();
const setPermissionsMatrix = vi.fn();
vi.mock("@/lib/permissions-db", () => ({
  getPermissionsMatrix: (...args: unknown[]) => getPermissionsMatrix(...args),
  setPermissionsMatrix: (...args: unknown[]) => setPermissionsMatrix(...args),
}));

import { GET, PUT } from "../route";

const validMatrix = {
  ADMIN: { users: ["read", "update"] },
  DOORMAN: { notices: ["read"] },
};

function putRequest(body: unknown) {
  return new NextRequest("http://localhost/api/permissions", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("GET /api/permissions", () => {
  beforeEach(() => {
    auth.mockReset();
    getPermissionsMatrix.mockReset();
  });

  it("rejects an unauthenticated request", async () => {
    auth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the matrix for any authenticated role, not just users:read", async () => {
    auth.mockResolvedValue({ user: { id: "1", role: "DOORMAN" } });
    getPermissionsMatrix.mockResolvedValue(validMatrix);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(validMatrix);
  });
});

describe("PUT /api/permissions", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    setPermissionsMatrix.mockReset();
    getPermissionsMatrix.mockReset();
  });

  it("rejects a matrix that strips ADMIN's own users read/update", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await PUT(putRequest({ ADMIN: { users: ["read"] }, DOORMAN: {} }));

    expect(res.status).toBe(400);
    expect(setPermissionsMatrix).not.toHaveBeenCalled();
  });

  it("applies a valid matrix", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    getPermissionsMatrix.mockResolvedValue(validMatrix);

    const res = await PUT(putRequest(validMatrix));

    expect(res.status).toBe(200);
    expect(setPermissionsMatrix).toHaveBeenCalledWith(validMatrix);
  });
});
