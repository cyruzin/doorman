import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

const compare = vi.fn();
vi.mock("bcrypt", () => ({ default: { compare: (...args: unknown[]) => compare(...args) } }));

import { requirePasswordConfirmation } from "../verify-password";

describe("requirePasswordConfirmation", () => {
  beforeEach(() => {
    findUnique.mockReset();
    compare.mockReset();
  });

  it("lets the action through when the password matches", async () => {
    findUnique.mockResolvedValue({ passwordHash: "hash" });
    compare.mockResolvedValue(true);

    await expect(requirePasswordConfirmation("u1", "secret")).resolves.toBeNull();
    expect(compare).toHaveBeenCalledWith("secret", "hash");
  });

  it("rejects a wrong password with 401", async () => {
    findUnique.mockResolvedValue({ passwordHash: "hash" });
    compare.mockResolvedValue(false);

    const res = await requirePasswordConfirmation("u1", "wrong");
    expect(res?.status).toBe(401);
  });

  it("rejects a missing password without hitting the database", async () => {
    const res = await requirePasswordConfirmation("u1", undefined);

    expect(res?.status).toBe(401);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects when the session points at a user that no longer exists", async () => {
    findUnique.mockResolvedValue(null);

    const res = await requirePasswordConfirmation("ghost", "secret");
    expect(res?.status).toBe(401);
    expect(compare).not.toHaveBeenCalled();
  });
});
