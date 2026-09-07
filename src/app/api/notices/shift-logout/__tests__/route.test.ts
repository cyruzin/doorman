import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => auth(...args),
}));

const create = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notice: {
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

import { POST } from "../route";

describe("POST /api/notices/shift-logout", () => {
  beforeEach(() => {
    auth.mockReset();
    create.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects an unauthenticated request", async () => {
    auth.mockResolvedValue(null);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates an automatic, home-pinned notice stamped with the logged-in username", async () => {
    vi.setSystemTime(new Date(2026, 0, 15, 18, 0, 0, 0));
    auth.mockResolvedValue({ user: { name: "raimundo" } });
    create.mockResolvedValue({ id: "n1" });

    const res = await POST();

    expect(res.status).toBe(201);
    expect(create).toHaveBeenCalledWith({
      data: {
        message:
          "Logout automático realizado — 18h. Sessão encerrada automaticamente conforme rotina de segurança do sistema.",
        showOnHome: true,
        isAutomatic: true,
        authorUsername: "raimundo",
      },
    });
  });

  it("falls back to em dash when the session has no username", async () => {
    auth.mockResolvedValue({ user: {} });
    create.mockResolvedValue({ id: "n1" });

    await POST();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ authorUsername: "—" }) }),
    );
  });
});
