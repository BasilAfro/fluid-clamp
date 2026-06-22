import { describe, it, expect } from "vitest";
import { fluidClamp, isFluidUnit } from "../src/fluid";

describe("fluidClamp", () => {
  it("produces the canonical clamp string (rem)", () => {
    expect(
      fluidClamp({ minSize: 16, maxSize: 24, minBp: 320, maxBp: 1280, fluidUnit: "vw" }),
    ).toBe("clamp(1rem, 0.8333vw + 0.8333rem, 1.5rem)");
  });

  it("honours the fluid unit", () => {
    expect(
      fluidClamp({ minSize: 16, maxSize: 24, minBp: 320, maxBp: 1280, fluidUnit: "cqw" }),
    ).toBe("clamp(1rem, 0.8333cqw + 0.8333rem, 1.5rem)");
  });

  it("emits px when lengthUnit is px", () => {
    const out = fluidClamp({
      minSize: 16,
      maxSize: 24,
      minBp: 320,
      maxBp: 1280,
      fluidUnit: "vw",
      lengthUnit: "px",
    });
    expect(out.startsWith("clamp(16px,")).toBe(true);
    expect(out.endsWith("24px)")).toBe(true);
    expect(out).toContain("vw");
  });

  it("throws when minSize >= maxSize", () => {
    expect(() =>
      fluidClamp({ minSize: 24, maxSize: 16, minBp: 320, maxBp: 1280, fluidUnit: "vw" }),
    ).toThrow(/minSize/);
  });

  it("throws when resolved minBp >= maxBp", () => {
    expect(() =>
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBp: 1280,
        maxBp: 320,
        fluidUnit: "vw",
      }),
    ).toThrow(/minBp/);
  });

  it("subtracts padding from both sides (×2) and shrinks the slope", () => {
    const plain = fluidClamp({
      minSize: 16,
      maxSize: 24,
      minBp: 320,
      maxBp: 1280,
      fluidUnit: "vw",
    });
    const padded = fluidClamp({
      minSize: 16,
      maxSize: 24,
      minBp: 320,
      maxBp: 1280,
      fluidUnit: "vw",
      minPadding: 8, // -> effective minBp 304, wider range, smaller slope
    });
    expect(padded).not.toBe(plain);
    expect(padded.startsWith("clamp(1rem,")).toBe(true);
    expect(padded.endsWith("1.5rem)")).toBe(true);
  });

  it("subtracts maxPadding (×2) from maxBp", () => {
    // maxBp 1280 - 8*2 = 1264, narrower range -> larger slope
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBp: 320,
        maxBp: 1280,
        fluidUnit: "vw",
        maxPadding: 8,
      }),
    ).toBe("clamp(1rem, 0.8475vw + 0.8305rem, 1.5rem)");
  });

  it("subtracts minSubtract/maxSubtract directly (no ×2)", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBp: 320,
        maxBp: 1280,
        fluidUnit: "vw",
        minSubtract: 16,
        maxSubtract: 24,
      }),
    ).toBe("clamp(1rem, 0.8403vw + 0.8403rem, 1.5rem)");
  });

  it("honours a custom rootPx for rem conversion", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBp: 320,
        maxBp: 1280,
        fluidUnit: "vw",
        rootPx: 10,
      }),
    ).toBe("clamp(1.6rem, 0.8333vw + 1.3333rem, 2.4rem)");
  });

  it("isFluidUnit guards the unit set", () => {
    expect(isFluidUnit("vw")).toBe(true);
    expect(isFluidUnit("cqw")).toBe(true);
    expect(isFluidUnit("cqh")).toBe(true);
    expect(isFluidUnit("px")).toBe(false);
    expect(isFluidUnit("rem")).toBe(false);
  });
});
