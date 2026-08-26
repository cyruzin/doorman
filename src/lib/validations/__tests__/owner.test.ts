import { describe, expect, it } from "vitest";
import { ownerSchema } from "../owner";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Maria",
    cpf: "12345678900",
    active: true,
    units: ["101"],
    phones: [],
    vehicles: [],
    ...overrides,
  };
}

describe("ownerSchema", () => {
  it("accepts a valid owner with one unit", () => {
    expect(ownerSchema.safeParse(validBody()).success).toBe(true);
  });

  it("accepts an owner with multiple units", () => {
    expect(ownerSchema.safeParse(validBody({ units: ["101", "205"] })).success).toBe(true);
  });

  it("accepts an owner with no cpf", () => {
    expect(ownerSchema.safeParse(validBody({ cpf: "" })).success).toBe(true);
    expect(ownerSchema.safeParse(validBody({ cpf: undefined })).success).toBe(true);
  });

  it("rejects a missing units list", () => {
    expect(ownerSchema.safeParse(validBody({ units: [] })).success).toBe(false);
  });
});
