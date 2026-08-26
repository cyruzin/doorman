import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const findMany = vi.fn();
const $transaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rolePermission: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      findMany: (...args: unknown[]) => findMany(...args),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: (...args: unknown[]) => $transaction(...args),
  },
}));

import { can, getPermissionsMatrix, setPermissionsMatrix } from "../permissions-db";

describe("can", () => {
  beforeEach(() => findUnique.mockReset());

  it("returns true when a matching grant row exists", async () => {
    findUnique.mockResolvedValue({ id: "1", role: "ADMIN", resource: "users", action: "read" });
    expect(await can("ADMIN", "users", "read")).toBe(true);
  });

  it("returns false when no grant row exists", async () => {
    findUnique.mockResolvedValue(null);
    expect(await can("DOORMAN", "users", "read")).toBe(false);
  });
});

describe("getPermissionsMatrix", () => {
  beforeEach(() => findMany.mockReset());

  it("groups rows by role and resource", async () => {
    findMany.mockResolvedValue([
      { role: "ADMIN", resource: "users", action: "read" },
      { role: "ADMIN", resource: "users", action: "create" },
      { role: "DOORMAN", resource: "notices", action: "read" },
    ]);

    const matrix = await getPermissionsMatrix();

    expect(matrix.ADMIN.users).toEqual(["read", "create"]);
    expect(matrix.DOORMAN.notices).toEqual(["read"]);
    expect(matrix.DOORMAN.users).toBeUndefined();
  });
});

describe("setPermissionsMatrix", () => {
  beforeEach(() => $transaction.mockReset());

  it("replaces all rows in a single transaction", async () => {
    await setPermissionsMatrix({
      ADMIN: { users: ["read", "update"] },
      DOORMAN: { notices: ["read"] },
    });

    expect($transaction).toHaveBeenCalledTimes(1);
    expect($transaction.mock.calls[0][0]).toHaveLength(2);
  });
});
