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
// Most existing assertions only care about the base value (shorthand/2-anchor
// forms never produce segments), so `parse` unwraps `.value` for them; a
// dedicated "piecewise" block below asserts on `segments` directly.
const parseFull = (value: string) =>
  parseArbitraryValue(value, "vw", FALLBACK_RANGE, BREAKPOINTS);
const parse = (value: string) => parseFull(value)?.value ?? null;

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
  it("parses signed and leading-dot decimals", () => {
    expect(parsePixels("-16")).toBe(-16);
    expect(parsePixels("-12.5px")).toBe(-12.5);
    expect(parsePixels(".5")).toBe(0.5);
  });
  it("returns NaN for non-finite values (they would emit invalid CSS)", () => {
    expect(Number.isNaN(parsePixels("Infinity"))).toBe(true);
    expect(Number.isNaN(parsePixels("-Infinity"))).toBe(true);
    expect(Number.isNaN(parsePixels("NaN"))).toBe(true);
  });
  it("returns NaN for numeric forms that don't mean what they look like", () => {
    // Number() would read these as 16 and 100 — a px token should not be
    // silently reinterpreted as hex or exponential notation.
    expect(Number.isNaN(parsePixels("0x10"))).toBe(true);
    expect(Number.isNaN(parsePixels("1e2"))).toBe(true);
    expect(Number.isNaN(parsePixels(" 16 "))).toBe(true);
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

  // Markers are positional: `<` opens the min-breakpoint end, `>` the
  // max-breakpoint end — regardless of scale direction. For a shrinking scale
  // the larger size sits at the min breakpoint, so the size bound each marker
  // opens is the opposite of the growing case.
  it("shrinking: < opens the min-breakpoint end (keeps growing past it, floor kept)", () => {
    expect(parse("<24@320,16@1280")).toBe(
      "max(1rem, -0.833333vw + 1.666667rem)",
    );
  });

  it("shrinking: > opens the max-breakpoint end (keeps shrinking past it, ceiling kept)", () => {
    expect(parse("24@320,16@1280>")).toBe(
      "min(1.5rem, -0.833333vw + 1.666667rem)",
    );
  });

  it("shrinking: both markers emit a bare calc()", () => {
    expect(parse("<24@320,16@1280>")).toBe("calc(-0.833333vw + 1.666667rem)");
  });

  it("the same marker yields opposite clamp fns for growing vs shrinking", () => {
    // `>` → max() when growing (opens ceiling), min() when shrinking (opens floor)
    expect(parse("16@320,24@1280>").startsWith("max(")).toBe(true);
    expect(parse("24@320,16@1280>").startsWith("min(")).toBe(true);
  });

  it("shrinking shorthand honours markers too", () => {
    expect(parse("<24,16")).toBe("max(1rem, -0.833333vw + 1.666667rem)");
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

describe("parseArbitraryValue — length options", () => {
  it("forwards lengthUnit (px) to the generated value", () => {
    expect(
      parseArbitraryValue("16,24", "vw", FALLBACK_RANGE, BREAKPOINTS, {
        lengthUnit: "px",
      })?.value,
    ).toBe("clamp(16px, 0.833333vw + 13.333333px, 24px)");
  });

  it("forwards a custom rootFontSize to the rem conversion", () => {
    expect(
      parseArbitraryValue("16,24", "vw", FALLBACK_RANGE, BREAKPOINTS, {
        rootFontSize: 10,
      })?.value,
    ).toBe("clamp(1.6rem, 0.833333vw + 1.333333rem, 2.4rem)");
  });
});

describe("parseArbitraryValue — piecewise (3+ anchors)", () => {
  it("splits into a base value plus one segment per extra anchor", () => {
    const result = parseFull("16@320,20@768,24@1280");
    expect(result?.value).toBe(
      "clamp(1rem, 0.892857vw + 0.821429rem, 1.25rem)",
    );
    expect(result?.segments).toEqual([
      {
        minBreakpoint: 768,
        value: "clamp(1.25rem, 0.78125vw + 0.875rem, 1.5rem)",
      },
    ]);
  });

  it("is order-independent — anchors are sorted by breakpoint first", () => {
    expect(parseFull("24@1280,16@320,20@768")).toEqual(
      parseFull("16@320,20@768,24@1280"),
    );
  });

  it("resolves named breakpoints and picks vw automatically", () => {
    const result = parseFull("16@sm,20@md,24@lg");
    expect(result?.segments.map((s) => s.minBreakpoint)).toEqual([768]);
  });

  it("a leading unit token applies to every segment", () => {
    const result = parseFull("cqw,16@320,20@768,24@1280");
    expect(result?.value.includes("cqw")).toBe(true);
    expect(result?.segments[0].value.includes("cqw")).toBe(true);
  });

  it("bound markers only open the true outer ends", () => {
    const result = parseFull("<16@320,20@768,24@1280>");
    expect(result?.value.startsWith("min(")).toBe(true); // floor dropped on the first pair
    expect(result?.segments[0].value.startsWith("max(")).toBe(true); // ceiling dropped on the last pair only
  });

  it("four anchors produce two segments", () => {
    const result = parseFull("16@320,20@640,24@960,28@1280");
    expect(result?.segments.map((s) => s.minBreakpoint)).toEqual([640, 960]);
  });

  it("rejects a malformed anchor even among otherwise-valid ones", () => {
    expect(parseFull("16@320,abc@768,24@1280")).toBeNull();
  });

  it("rejects duplicate/non-increasing breakpoints after sorting", () => {
    expect(parseFull("16@320,20@320,24@1280")).toBeNull();
  });
});

describe("parseArbitraryValue — rejected forms (null)", () => {
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
  it("a non-finite size — it would compile to an invalid length, not no class", () => {
    expect(parse("Infinity,24")).toBeNull();
    expect(parse("16,Infinity")).toBeNull();
    expect(parse("Infinity@320,24@1280")).toBeNull();
  });
  it("a size in hex or exponential notation", () => {
    expect(parse("0x10,24")).toBeNull();
    expect(parse("1e2,24")).toBeNull();
  });
});
