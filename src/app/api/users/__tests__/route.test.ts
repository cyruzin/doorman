import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findMany = vi.fn();
const count = vi.fn();
const create = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => findMany(...args),
      count: (...args: unknown[]) => count(...args),
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed") },
}));

import { GET, POST } from "../route";

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/users", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

const validBody = { name: "João Silva", username: "joao", password: "senha123", role: "DOORMAN" };

describe("GET /api/users", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findMany.mockReset();
    count.mockReset();
  });

  it("searches by name or username", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    findMany.mockResolvedValue([]);
    count.mockResolvedValue(0);

    await GET(new NextRequest("http://localhost/api/users?q=joao"));

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ name: { contains: "joao" } }, { username: { contains: "joao" } }] },
      }),
    );
  });
});

describe("POST /api/users", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    create.mockReset();
  });

  it("rejects a username with spaces or uppercase letters", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });

    const res = await POST(postRequest({ ...validBody, username: "Joao Silva" }));

    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the user with name and username", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    create.mockResolvedValue({ id: "u1", name: "João Silva", username: "joao", role: "DOORMAN" });

    const res = await POST(postRequest(validBody));

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "João Silva", username: "joao" }) }),
    );
  });

  it("returns a friendly error when the username is already taken", async () => {
    requirePermission.mockResolvedValue({ session: {}, error: null });
    create.mockRejectedValue(Object.assign(new Error("Unique constraint"), { code: "P2002" }));

    const res = await POST(postRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/usuário/i);
  });
});
