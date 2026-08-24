import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";

describe("can", () => {
  it("allows DOORMAN to create/read/update tenants and owners", () => {
    expect(can("DOORMAN", "tenants", "create")).toBe(true);
    expect(can("DOORMAN", "tenants", "read")).toBe(true);
    expect(can("DOORMAN", "tenants", "update")).toBe(true);
    expect(can("DOORMAN", "owners", "update")).toBe(true);
  });

  it("blocks DOORMAN from deleting tenants/owners and from users/backups entirely", () => {
    expect(can("DOORMAN", "tenants", "delete")).toBe(false);
    expect(can("DOORMAN", "owners", "delete")).toBe(false);
    expect(can("DOORMAN", "users", "read")).toBe(false);
    expect(can("DOORMAN", "backups", "read")).toBe(false);
  });

  it("gives DOORMAN full access to mezanino key checkouts", () => {
    for (const action of ["create", "read", "update", "delete"] as const) {
      expect(can("DOORMAN", "mezanino", action)).toBe(true);
    }
  });

  it("gives ADMIN full access to every resource", () => {
    for (const resource of ["tenants", "owners", "users", "mezanino"] as const) {
      for (const action of ["create", "read", "update", "delete"] as const) {
        expect(can("ADMIN", resource, action)).toBe(true);
      }
    }
    expect(can("ADMIN", "backups", "create")).toBe(true);
    expect(can("ADMIN", "backups", "read")).toBe(true);
    expect(can("ADMIN", "backups", "delete")).toBe(true);
  });
});
