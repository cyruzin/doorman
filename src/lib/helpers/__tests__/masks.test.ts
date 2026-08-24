import { describe, expect, it } from "vitest";
import { maskCpf, maskPhone, unmask } from "../masks";

describe("maskCpf", () => {
  it("formats progressively as digits are typed", () => {
    expect(maskCpf("1")).toBe("1");
    expect(maskCpf("123")).toBe("123");
    expect(maskCpf("1234")).toBe("123.4");
    expect(maskCpf("123456")).toBe("123.456");
    expect(maskCpf("1234567")).toBe("123.456.7");
    expect(maskCpf("123456789")).toBe("123.456.789");
    expect(maskCpf("12345678900")).toBe("123.456.789-00");
  });

  it("ignores non-digit characters and caps at 11 digits", () => {
    expect(maskCpf("123.456.789-00")).toBe("123.456.789-00");
    expect(maskCpf("123456789001234")).toBe("123.456.789-00");
  });
});

describe("maskPhone", () => {
  it("formats progressively as digits are typed, landline split (10 digits)", () => {
    expect(maskPhone("1")).toBe("1");
    expect(maskPhone("11")).toBe("11");
    expect(maskPhone("113")).toBe("(11) 3");
    expect(maskPhone("113456")).toBe("(11) 3456");
    expect(maskPhone("1134567890")).toBe("(11) 3456-7890");
  });

  it("formats a mobile number (11 digits)", () => {
    expect(maskPhone("11999990000")).toBe("(11) 99999-0000");
  });

  it("ignores non-digit characters and caps at 11 digits", () => {
    expect(maskPhone("(11) 99999-0000")).toBe("(11) 99999-0000");
    expect(maskPhone("119999900001234")).toBe("(11) 99999-0000");
  });
});

describe("unmask", () => {
  it("strips every non-digit character", () => {
    expect(unmask("123.456.789-00")).toBe("12345678900");
    expect(unmask("(11) 99999-0000")).toBe("11999990000");
    expect(unmask("")).toBe("");
  });
});
