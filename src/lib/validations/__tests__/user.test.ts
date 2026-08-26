import { describe, expect, it } from "vitest";
import { userCreateSchema, usernameSchema } from "../user";

describe("usernameSchema", () => {
  it("accepts lowercase letters, digits, hyphen and underscore", () => {
    expect(usernameSchema.safeParse("porteiro-2_dia").success).toBe(true);
  });

  it("rejects spaces", () => {
    expect(usernameSchema.safeParse("porteiro dois").success).toBe(false);
  });

  it("rejects uppercase letters", () => {
    expect(usernameSchema.safeParse("Porteiro").success).toBe(false);
  });

  it("rejects fewer than 3 characters", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });
});

describe("userCreateSchema", () => {
  function validBody(overrides: Record<string, unknown> = {}) {
    return { name: "João Silva", username: "joao", password: "senha123", role: "DOORMAN", ...overrides };
  }

  it("accepts a valid body", () => {
    expect(userCreateSchema.safeParse(validBody()).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(userCreateSchema.safeParse(validBody({ name: "" })).success).toBe(false);
  });

  it("rejects a username with mixed case", () => {
    expect(userCreateSchema.safeParse(validBody({ username: "Joao" })).success).toBe(false);
  });
});
