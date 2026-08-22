import { describe, expect, it } from "vitest";
import { normalizeOwnerId } from "@/lib/person-owner-link";

describe("normalizeOwnerId", () => {
  it("converts an empty ownerId to null (unlink)", () => {
    expect(normalizeOwnerId("tenant", { name: "Maria", ownerId: "" })).toEqual({
      name: "Maria",
      ownerId: null,
    });
  });

  it("keeps a real ownerId untouched", () => {
    expect(normalizeOwnerId("tenant", { name: "Maria", ownerId: "owner-1" })).toEqual({
      name: "Maria",
      ownerId: "owner-1",
    });
  });

  it("leaves data untouched when ownerId is absent (partial update)", () => {
    const data = { name: "Maria" };
    expect(normalizeOwnerId("tenant", data)).toBe(data);
  });

  it("never touches Owner data (no ownerId column exists there)", () => {
    const data = { name: "João", ownerId: "" };
    expect(normalizeOwnerId("owner", data)).toBe(data);
  });
});
