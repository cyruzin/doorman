import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";

describe("can", () => {
  it("allows DOORMAN to create/read/update residents and owners", () => {
    expect(can("DOORMAN", "residents", "create")).toBe(true);
    expect(can("DOORMAN", "residents", "read")).toBe(true);
    expect(can("DOORMAN", "residents", "update")).toBe(true);
    expect(can("DOORMAN", "owners", "update")).toBe(true);
  });

  it("blocks DOORMAN from deleting residents/owners and from users/backups entirely", () => {
    expect(can("DOORMAN", "residents", "delete")).toBe(false);
    expect(can("DOORMAN", "owners", "delete")).toBe(false);
    expect(can("DOORMAN", "users", "read")).toBe(false);
    expect(can("DOORMAN", "backups", "read")).toBe(false);
  });

  it("gives DOORMAN full access to mezanino key checkouts", () => {
    for (const action of ["create", "read", "update", "delete"] as const) {
      expect(can("DOORMAN", "mezanino", action)).toBe(true);
    }
  });

  it("gives DOORMAN full access to event scheduling", () => {
    for (const action of ["create", "read", "update", "delete"] as const) {
      expect(can("DOORMAN", "scheduling", action)).toBe(true);
    }
  });

  it("lets DOORMAN read reports but not create/update/delete them", () => {
    expect(can("DOORMAN", "reports", "read")).toBe(true);
    expect(can("DOORMAN", "reports", "create")).toBe(false);
    expect(can("DOORMAN", "reports", "update")).toBe(false);
    expect(can("DOORMAN", "reports", "delete")).toBe(false);
  });

  it("gives ADMIN full access to every resource", () => {
    for (const resource of ["residents", "owners", "users", "mezanino", "scheduling"] as const) {
      for (const action of ["create", "read", "update", "delete"] as const) {
        expect(can("ADMIN", resource, action)).toBe(true);
      }
    }
    expect(can("ADMIN", "backups", "create")).toBe(true);
    expect(can("ADMIN", "backups", "read")).toBe(true);
    expect(can("ADMIN", "backups", "delete")).toBe(true);
    expect(can("ADMIN", "reports", "read")).toBe(true);
  });
});
