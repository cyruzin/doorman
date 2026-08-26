import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findUnique = vi.fn();
const update = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      update: (...args: unknown[]) => update(...args),
    },
  },
}));

import { PATCH } from "../route";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/users/u1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("PATCH /api/users/[id]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findUnique.mockReset();
    update.mockReset();
  });

  it("rejects a username with spaces or uppercase letters", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await PATCH(patchRequest({ username: "Novo Nome" }), params("u1"));

    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("updates the name and username", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ isSuperAdmin: false });
    update.mockResolvedValue({ id: "u1", name: "Novo Nome", username: "novo-nome" });

    const res = await PATCH(patchRequest({ name: "Novo Nome", username: "novo-nome" }), params("u1"));

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Novo Nome", username: "novo-nome" } }),
    );
  });

  it("returns a friendly error when the new username is already taken", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findUnique.mockResolvedValue({ isSuperAdmin: false });
    update.mockRejectedValue(Object.assign(new Error("Unique constraint"), { code: "P2002" }));

    const res = await PATCH(patchRequest({ username: "ja-existe" }), params("u1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/usuário/i);
  });
});
