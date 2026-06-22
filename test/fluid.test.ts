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
    ).toBe("clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
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
    ).toBe("clamp(1rem, 0.833333cqw + 0.833333rem, 1.5rem)");
  });

  it("honours the cqh fluid unit", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "cqh",
      }),
    ).toBe("clamp(1rem, 0.833333cqh + 0.833333rem, 1.5rem)");
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

  it("supports decreasing sizes (shrink as the breakpoint grows)", () => {
    // 24px at 320 → 16px at 1280: negative slope, floor/ceiling still sorted
    expect(
      fluidClamp({
        minSize: 24,
        maxSize: 16,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "vw",
      }),
    ).toBe("clamp(1rem, -0.833333vw + 1.666667rem, 1.5rem)");
  });

  it("emits a constant value when minSize === maxSize (no fluid range)", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 16,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "vw",
      }),
    ).toBe("1rem");
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 16,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "vw",
        lengthUnit: "px",
      }),
    ).toBe("16px");
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
    ).toBe("clamp(1.6rem, 0.833333vw + 1.333333rem, 2.4rem)");
  });

  it("opens the ceiling when clampMax is false (keeps the floor via max())", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "vw",
        clampMax: false,
      }),
    ).toBe("max(1rem, 0.833333vw + 0.833333rem)");
  });

  it("opens the floor when clampMin is false (keeps the ceiling via min())", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "vw",
        clampMin: false,
      }),
    ).toBe("min(1.5rem, 0.833333vw + 0.833333rem)");
  });

  it("opens a bound with a px length unit", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "vw",
        lengthUnit: "px",
        clampMax: false,
      }),
    ).toBe("max(16px, 0.833333vw + 13.333333px)");
  });

  it("emits a bare calc() when both bounds are open", () => {
    expect(
      fluidClamp({
        minSize: 16,
        maxSize: 24,
        minBreakpoint: 320,
        maxBreakpoint: 1280,
        fluidUnit: "vw",
        clampMin: false,
        clampMax: false,
      }),
    ).toBe("calc(0.833333vw + 0.833333rem)");
  });

  it("isFluidUnit guards the unit set", () => {
    expect(isFluidUnit("vw")).toBe(true);
    expect(isFluidUnit("cqw")).toBe(true);
    expect(isFluidUnit("cqh")).toBe(true);
    expect(isFluidUnit("px")).toBe(false);
    expect(isFluidUnit("rem")).toBe(false);
  });
});
