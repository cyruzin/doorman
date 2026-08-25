import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requirePermission = vi.fn();
vi.mock("@/lib/api-guard", () => ({
  requirePermission: (...args: unknown[]) => requirePermission(...args),
}));

const findUnique = vi.fn();
const remove = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notice: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      delete: (...args: unknown[]) => remove(...args),
    },
  },
}));

import { DELETE } from "../route";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("DELETE /api/notices/[id]", () => {
  beforeEach(() => {
    requirePermission.mockReset();
    findUnique.mockReset();
    remove.mockReset();
  });

  it("rejects an unauthorized request", async () => {
    const denied = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    requirePermission.mockResolvedValue({ session: null, error: denied });

    const res = await DELETE(new NextRequest("http://localhost/api/notices/n1"), params("n1"));
    expect(res.status).toBe(401);
  });

  it("404s for a missing notice", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", name: "admin" } }, error: null });
    findUnique.mockResolvedValue(null);

    const res = await DELETE(new NextRequest("http://localhost/api/notices/n1"), params("n1"));
    expect(res.status).toBe(404);
  });

  it("never allows deleting an automatic notice, even for an admin", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", name: "admin" } }, error: null });
    findUnique.mockResolvedValue({ id: "n1", isAutomatic: true, authorUsername: "admin" });

    const res = await DELETE(new NextRequest("http://localhost/api/notices/n1"), params("n1"));
    expect(res.status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
  });

  it("blocks a doorman from deleting another porteiro's manual notice", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN", name: "raimundo" } }, error: null });
    findUnique.mockResolvedValue({ id: "n1", isAutomatic: false, authorUsername: "lindinaldo" });

    const res = await DELETE(new NextRequest("http://localhost/api/notices/n1"), params("n1"));
    expect(res.status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
  });

  it("lets a doorman delete their own manual notice", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "DOORMAN", name: "raimundo" } }, error: null });
    findUnique.mockResolvedValue({ id: "n1", isAutomatic: false, authorUsername: "raimundo" });
    remove.mockResolvedValue({});

    const res = await DELETE(new NextRequest("http://localhost/api/notices/n1"), params("n1"));
    expect(res.status).toBe(200);
    expect(remove).toHaveBeenCalledWith({ where: { id: "n1" } });
  });

  it("lets an admin delete any manual notice, regardless of author", async () => {
    requirePermission.mockResolvedValue({ session: { user: { role: "ADMIN", name: "admin" } }, error: null });
    findUnique.mockResolvedValue({ id: "n1", isAutomatic: false, authorUsername: "raimundo" });
    remove.mockResolvedValue({});

    const res = await DELETE(new NextRequest("http://localhost/api/notices/n1"), params("n1"));
    expect(res.status).toBe(200);
    expect(remove).toHaveBeenCalledWith({ where: { id: "n1" } });
  });
});
