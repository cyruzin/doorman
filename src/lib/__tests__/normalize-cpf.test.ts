import { describe, expect, it } from "vitest";
import { normalizeCpf } from "../normalize-cpf";

describe("normalizeCpf", () => {
  it("converts an empty string to null so it never collides under the unique constraint", () => {
    expect(normalizeCpf({ cpf: "" })).toEqual({ cpf: null });
  });

  it("leaves a real cpf untouched", () => {
    expect(normalizeCpf({ cpf: "12345678900" })).toEqual({ cpf: "12345678900" });
  });

  it("leaves other fields untouched", () => {
    expect(normalizeCpf({ cpf: "", name: "Maria" })).toEqual({ cpf: null, name: "Maria" });
  });

  it("does nothing when cpf isn't present in the payload at all", () => {
    const data: { cpf?: string; name: string } = { name: "Maria" };
    expect(normalizeCpf(data)).toBe(data);
  });
});
