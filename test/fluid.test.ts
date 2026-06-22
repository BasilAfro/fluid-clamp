import { describe, it, expect } from "vitest";
import { fluidClamp, isFluidUnit } from "../src/fluid";

describe("fluidClamp", () => {
  it("produces the canonical clamp string (rem)", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "vw",
      }),
    ).toBe("clamp(1rem, 0.8333vw + 0.8333rem, 1.5rem)");
  });

  it("honours the fluid unit", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "cqw",
      }),
    ).toBe("clamp(1rem, 0.8333cqw + 0.8333rem, 1.5rem)");
  });

  it("emits px when lengthUnit is px", () => {
    const output = fluidClamp({
      minSize: 16,
      maxSize: 24,
      minBreakpoint: 320,
      maxBreakpoint: 1280,
      fluidUnit: "vw",
      lengthUnit: "px",
    });
    expect(output.startsWith("clamp(16px,")).toBe(true);
    expect(output.endsWith("24px)")).toBe(true);
    expect(output).toContain("vw");
  });

  it("throws when minSize >= maxSize", () => {
    expect(() =>
      fluidClamp({
        minSize: 24,
        maxSize: 16,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "vw",
      }),
    ).toThrow(/minSize/);
  });

  it("throws when minBreakpoint >= maxBreakpoint", () => {
    expect(() =>
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBreakpoint: 1280,
        maxBreakpoint: 320,
        fluidUnit: "vw",
      }),
    ).toThrow(/minBreakpoint/);
  });

  it("honours a custom rootFontSize for rem conversion", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "vw",
        rootFontSize: 10,
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
