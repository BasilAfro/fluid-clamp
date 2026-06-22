import { describe, it, expect } from "vitest";
import { stripPx, parseAnchor, parseArbitraryValue } from "../src/parse";

const BP = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536, xs: 480 };
const FALLBACK = { minBp: 320, maxBp: 1280 };

// parseArbitraryValue receives the value with underscores already turned into
// spaces by Tailwind, so tests pass space-separated tokens.
const parse = (v: string) => parseArbitraryValue(v, "vw", FALLBACK, BP);

describe("stripPx", () => {
  it("parses numbers with or without a px suffix", () => {
    expect(stripPx("16")).toBe(16);
    expect(stripPx("16px")).toBe(16);
    expect(stripPx("12.5")).toBe(12.5);
  });
  it("returns NaN for non-numbers", () => {
    expect(Number.isNaN(stripPx("abc"))).toBe(true);
  });
});

describe("parseAnchor", () => {
  it("parses size@bp", () => {
    expect(parseAnchor("16@320", BP)).toEqual({ size: 16, bp: 320, named: false });
  });
  it("resolves a named breakpoint and flags it", () => {
    expect(parseAnchor("16@sm", BP)).toEqual({ size: 16, bp: 640, named: true });
  });
  it("applies an inset directly (no doubling)", () => {
    expect(parseAnchor("16@320-16", BP)).toEqual({ size: 16, bp: 304, named: false });
  });
  it("applies an inset to a named breakpoint", () => {
    expect(parseAnchor("16@sm-40", BP)).toEqual({ size: 16, bp: 600, named: true });
  });
  it("returns null without an @", () => {
    expect(parseAnchor("16", BP)).toBeNull();
  });
  it("returns null for an unknown breakpoint name", () => {
    expect(parseAnchor("16@bogus", BP)).toBeNull();
  });
  it("returns null for a non-numeric size", () => {
    expect(parseAnchor("abc@320", BP)).toBeNull();
  });
});

describe("parseArbitraryValue — valid forms", () => {
  it("shorthand uses the fallback breakpoints", () => {
    expect(parse("16 24")).toBe("clamp(1rem, 0.8333vw + 0.8333rem, 1.5rem)");
  });

  it("explicit anchors match the shorthand for the same range", () => {
    expect(parse("16@320 24@1280")).toBe("clamp(1rem, 0.8333vw + 0.8333rem, 1.5rem)");
  });

  it("anchor order does not matter", () => {
    expect(parse("24@1280 16@320")).toBe(parse("16@320 24@1280"));
  });

  it("named breakpoints auto-select vw", () => {
    expect(parse("16@sm 24@lg")).toBe("clamp(1rem, 2.0833vw + 0.1667rem, 1.5rem)");
  });

  it("inset is subtracted directly", () => {
    expect(parse("16@320-16 24@1280-24")).toBe(
      "clamp(1rem, 0.8403vw + 0.8403rem, 1.5rem)",
    );
  });

  it("leading unit token overrides the default", () => {
    expect(parse("cqw 16 24")).toBe("clamp(1rem, 0.8333cqw + 0.8333rem, 1.5rem)");
  });

  it("leading unit token overrides the named-breakpoint auto rule", () => {
    expect(parse("cqw 16@sm 24@lg")).toBe(
      "clamp(1rem, 2.0833cqw + 0.1667rem, 1.5rem)",
    );
  });
});

describe("parseArbitraryValue — rejected forms (null)", () => {
  it("3+ anchors are reserved (piecewise not implemented)", () => {
    expect(parse("16@320 20@768 24@1280")).toBeNull();
  });
  it("mixing an anchor with a bare number", () => {
    expect(parse("16@320 24")).toBeNull();
  });
  it("unknown breakpoint name", () => {
    expect(parse("16@bogus 24@lg")).toBeNull();
  });
  it("old positional 4-value form is gone", () => {
    expect(parse("16 24 320 1280")).toBeNull();
  });
  it("a single value", () => {
    expect(parse("16")).toBeNull();
  });
  it("a non-numeric token", () => {
    expect(parse("abc 24")).toBeNull();
  });
});
