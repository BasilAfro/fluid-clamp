import { describe, it, expect } from "vitest";
import { parsePixels, parseAnchor, parseArbitraryValue } from "../src/parse";

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
  xs: 480,
  "tablet-portrait": 900,
};
const FALLBACK_RANGE = { minBreakpoint: 320, maxBreakpoint: 1280 };

// parseArbitraryValue receives the post-Tailwind value: commas pass through
// verbatim, and the legacy "_" separator arrives as a space. The blocks below use
// spaces (the fallback path); a dedicated block covers the comma form.
const parse = (value: string) =>
  parseArbitraryValue(value, "vw", FALLBACK_RANGE, BREAKPOINTS);

describe("parsePixels", () => {
  it("parses numbers with or without a px suffix", () => {
    expect(parsePixels("16")).toBe(16);
    expect(parsePixels("16px")).toBe(16);
    expect(parsePixels("12.5")).toBe(12.5);
  });
  it("returns NaN for non-numbers", () => {
    expect(Number.isNaN(parsePixels("abc"))).toBe(true);
  });
  it("returns NaN for an empty string (not 0)", () => {
    expect(Number.isNaN(parsePixels(""))).toBe(true);
    expect(Number.isNaN(parsePixels("px"))).toBe(true);
  });
});

describe("parseAnchor", () => {
  it("parses size@breakpoint", () => {
    expect(parseAnchor("16@320", BREAKPOINTS)).toEqual({
      size: 16,
      breakpoint: 320,
      named: false,
    });
  });
  it("resolves a named breakpoint and flags it", () => {
    expect(parseAnchor("16@sm", BREAKPOINTS)).toEqual({
      size: 16,
      breakpoint: 640,
      named: true,
    });
  });
  it("applies an inset directly (no doubling)", () => {
    expect(parseAnchor("16@320-16", BREAKPOINTS)).toEqual({
      size: 16,
      breakpoint: 304,
      named: false,
    });
  });
  it("applies an inset to a named breakpoint", () => {
    expect(parseAnchor("16@sm-40", BREAKPOINTS)).toEqual({
      size: 16,
      breakpoint: 600,
      named: true,
    });
  });
  it("resolves a hyphenated breakpoint name (not treated as an inset)", () => {
    expect(parseAnchor("16@tablet-portrait", BREAKPOINTS)).toEqual({
      size: 16,
      breakpoint: 900,
      named: true,
    });
  });
  it("applies an inset to a hyphenated name (splits on the last dash)", () => {
    expect(parseAnchor("16@tablet-portrait-100", BREAKPOINTS)).toEqual({
      size: 16,
      breakpoint: 800,
      named: true,
    });
  });
  it("returns null without an @", () => {
    expect(parseAnchor("16", BREAKPOINTS)).toBeNull();
  });
  it("returns null for an unknown breakpoint name", () => {
    expect(parseAnchor("16@bogus", BREAKPOINTS)).toBeNull();
  });
  it("returns null for a non-numeric size", () => {
    expect(parseAnchor("abc@320", BREAKPOINTS)).toBeNull();
  });
  it("returns null when the breakpoint is empty (e.g. a negative inset wipes it)", () => {
    expect(parseAnchor("16@-320", BREAKPOINTS)).toBeNull();
    expect(parseAnchor("16@", BREAKPOINTS)).toBeNull();
  });
});

describe("parseArbitraryValue — valid forms", () => {
  it("shorthand uses the fallback breakpoints", () => {
    expect(parse("16 24")).toBe("clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
  });

  it("explicit anchors match the shorthand for the same range", () => {
    expect(parse("16@320 24@1280")).toBe("clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
  });

  it("anchor order does not matter", () => {
    expect(parse("24@1280 16@320")).toBe(parse("16@320 24@1280"));
  });

  it("named breakpoints auto-select vw", () => {
    expect(parse("16@sm 24@lg")).toBe("clamp(1rem, 2.083333vw + 0.166667rem, 1.5rem)");
  });

  it("inset is subtracted directly", () => {
    expect(parse("16@320-16 24@1280-24")).toBe(
      "clamp(1rem, 0.840336vw + 0.840336rem, 1.5rem)",
    );
  });

  it("supports decreasing sizes — shorthand (shrink as the viewport grows)", () => {
    expect(parse("24 16")).toBe("clamp(1rem, -0.833333vw + 1.666667rem, 1.5rem)");
  });

  it("equal sizes emit the constant value (no clamp)", () => {
    expect(parse("16 16")).toBe("1rem");
    expect(parse("16@320 16@1280")).toBe("1rem");
  });

  it("trailing > opens the ceiling (grows past max, keeps the floor)", () => {
    expect(parse("16@320 24@1280>")).toBe("max(1rem, 0.833333vw + 0.833333rem)");
    expect(parse("16 24>")).toBe("max(1rem, 0.833333vw + 0.833333rem)");
  });

  it("leading < opens the floor (shrinks past min, keeps the ceiling)", () => {
    expect(parse("<16@320 24@1280")).toBe("min(1.5rem, 0.833333vw + 0.833333rem)");
  });

  it("both markers emit a bare calc() (fully unbounded)", () => {
    expect(parse("<16@320 24@1280>")).toBe("calc(0.833333vw + 0.833333rem)");
    expect(parse("<13 19>")).toBe("calc(0.625vw + 0.6875rem)");
  });

  it("markers combine with the unit token and inset", () => {
    expect(parse("cqw 16@320-16 24@1280-24>")).toBe(
      "max(1rem, 0.840336cqw + 0.840336rem)",
    );
  });

  it("supports decreasing sizes — anchors, order-independent", () => {
    expect(parse("24@320 16@1280")).toBe("clamp(1rem, -0.833333vw + 1.666667rem, 1.5rem)");
    expect(parse("16@1280 24@320")).toBe(parse("24@320 16@1280"));
  });

  it("leading unit token overrides the default", () => {
    expect(parse("cqw 16 24")).toBe("clamp(1rem, 0.833333cqw + 0.833333rem, 1.5rem)");
  });

  it("leading unit token overrides the named-breakpoint auto rule", () => {
    expect(parse("cqw 16@sm 24@lg")).toBe(
      "clamp(1rem, 2.083333cqw + 0.166667rem, 1.5rem)",
    );
  });
});

describe("parseArbitraryValue — comma separator (primary) + space fallback", () => {
  it("parses comma-separated anchors and shorthand", () => {
    expect(parse("16@320,24@1280")).toBe("clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(parse("16,24")).toBe("clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
  });

  it("comma composes with the unit token, named bps, inset, and bound markers", () => {
    expect(parse("cqw,16@sm,24@lg")).toBe("clamp(1rem, 2.083333cqw + 0.166667rem, 1.5rem)");
    expect(parse("16@320-16,24@1280-24")).toBe(
      "clamp(1rem, 0.840336vw + 0.840336rem, 1.5rem)",
    );
    expect(parse("<16@320,24@1280>")).toBe("calc(0.833333vw + 0.833333rem)");
  });

  it("still accepts the legacy space/underscore separator (same result)", () => {
    expect(parse("16@320 24@1280")).toBe(parse("16@320,24@1280"));
    expect(parse("cqw 16@sm 24@lg")).toBe(parse("cqw,16@sm,24@lg"));
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
