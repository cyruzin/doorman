import { describe, expect, it } from "vitest";
import { mezaninoEntrySchema } from "../mezanino";

describe("mezaninoEntrySchema", () => {
  it("accepts a known room with a unit and resident", () => {
    const result = mezaninoEntrySchema.safeParse({ room: "GYM", unit: "101", residentId: "t1" });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown room", () => {
    const result = mezaninoEntrySchema.safeParse({ room: "SAUNA", unit: "101", residentId: "t1" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty unit", () => {
    const result = mezaninoEntrySchema.safeParse({ room: "GYM", unit: "", residentId: "t1" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing resident", () => {
    const result = mezaninoEntrySchema.safeParse({ room: "GYM", unit: "101", residentId: "" });
    expect(result.success).toBe(false);
  });
});
