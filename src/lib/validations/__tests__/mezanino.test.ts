import { describe, expect, it } from "vitest";
import { mezaninoEntrySchema } from "../mezanino";

describe("mezaninoEntrySchema", () => {
  it("accepts a known room with a unit", () => {
    const result = mezaninoEntrySchema.safeParse({ room: "GYM", unit: "101" });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown room", () => {
    const result = mezaninoEntrySchema.safeParse({ room: "SAUNA", unit: "101" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty unit", () => {
    const result = mezaninoEntrySchema.safeParse({ room: "GYM", unit: "" });
    expect(result.success).toBe(false);
  });
});
