import { describe, expect, it } from "vitest";
import { residentSchema } from "../resident";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "João",
    unit: "101",
    active: true,
    isOwner: false,
    phones: [],
    vehicles: [],
    ...overrides,
  };
}

describe("residentSchema", () => {
  it("accepts a plain resident without an ownerId", () => {
    expect(residentSchema.safeParse(validBody()).success).toBe(true);
  });

  it("rejects isOwner true without an ownerId", () => {
    const result = residentSchema.safeParse(validBody({ isOwner: true }));
    expect(result.success).toBe(false);
  });

  it("accepts isOwner true with an ownerId", () => {
    expect(residentSchema.safeParse(validBody({ isOwner: true, ownerId: "o1" })).success).toBe(true);
  });

  it("rejects a missing unit", () => {
    expect(residentSchema.safeParse(validBody({ unit: "" })).success).toBe(false);
  });
});
