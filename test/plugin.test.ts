import { describe, it, expect } from "vitest";
import postcss from "postcss";
import tailwind from "tailwindcss";
import fluidClampPlugin, { createFluidPlugin, normalizeOptions } from "../src/plugin";

const SCREENS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
};

// Tailwind's JIT caches compiled output by content string, so each call gets a
// unique throwaway candidate to guarantee a fresh build.
let uniqueId = 0;
function generateCss(
  content: string,
  config: Parameters<typeof createFluidPlugin>[0] = {},
) {
  uniqueId += 1;
  return postcss([
    tailwind({
      content: [{ raw: `uniq${uniqueId} ${content}`, extension: "html" }],
      corePlugins: { preflight: false },
      theme: { screens: SCREENS },
      plugins: [createFluidPlugin(config)],
    }),
  ]).process("@tailwind utilities;", { from: undefined });
}

// `addBase` output only appears in the "base" layer, so `fluidVars` tests need
// `@tailwind base;` in the processed stylesheet as well.
function generateCssWithBase(
  content: string,
  config: Parameters<typeof createFluidPlugin>[0] = {},
) {
  uniqueId += 1;
  return postcss([
    tailwind({
      content: [{ raw: `uniq${uniqueId} ${content}`, extension: "html" }],
      corePlugins: { preflight: false },
      theme: { screens: SCREENS },
      plugins: [createFluidPlugin(config)],
    }),
  ]).process("@tailwind base; @tailwind utilities;", { from: undefined });
}

describe("createFluidPlugin (integration)", () => {
  it("emits a named-breakpoint anchor class with auto-vw", async () => {
    const { css } = await generateCss("text-fluid-[16@sm,24@lg]", {
      breakpoints: { xs: 480 },
    });
    expect(css).toContain("font-size: clamp(1rem, 2.083333vw + 0.166667rem, 1.5rem)");
  });

  it("static scale honours unit + breakpointRange config (general knobs)", async () => {
    // cqw default, breakpoints sm..2xl (640..1536)
    const { css } = await generateCss("text-fluid-base", {
      unit: "cqw",
      breakpointRange: { minBreakpoint: "sm", maxBreakpoint: "2xl" },
    });
    expect(css).toContain("font-size: clamp(1rem, 0.223214cqw + 0.910714rem, 1.125rem)");
  });

  it("a per-target override beats the general knob", async () => {
    const { css } = await generateCss("p-fluid-[8@320,16@1280]", {
      unit: "vw",
      spaceUnit: "cqw",
    });
    // spaceUnit cqw overrides the general vw for spacing utilities
    expect(css).toContain("padding: clamp(0.5rem, 0.833333cqw + 0.333333rem, 1rem)");
  });

  it("an unknown config breakpoint name throws a build-time error", async () => {
    await expect(
      generateCss("text-fluid-base", {
        breakpointRange: { minBreakpoint: "nope", maxBreakpoint: "lg" },
      }),
    ).rejects.toThrow(/unknown breakpoint name "nope"/);
  });

  it("a 3-anchor value compiles to a base clamp plus a stacked @media override", async () => {
    const { css } = await generateCss("text-fluid-[16@320,20@768,24@1280]");
    expect(css).toContain("clamp(1rem, 0.892857vw + 0.821429rem, 1.25rem)");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain("clamp(1.25rem, 0.78125vw + 0.875rem, 1.5rem)");
  });

  it("applies a per-anchor inset in an arbitrary value", async () => {
    // 320-16 -> 304, 1280-24 -> 1256; subtracted directly (no ×2)
    const { css } = await generateCss("text-fluid-[16@320-16,24@1280-24]");
    expect(css).toContain("font-size: clamp(1rem, 0.840336vw + 0.840336rem, 1.5rem)");
  });

  it("breaks the clamp bounds via < > edge markers (Tailwind extracts them)", async () => {
    const { css } = await generateCss(
      "text-fluid-[16@320,24@1280>] text-fluid-[<16@320,24@1280] text-fluid-[<16@320,24@1280>]",
    );
    expect(css).toContain("font-size: max(1rem, 0.833333vw + 0.833333rem)"); // open ceiling
    expect(css).toContain("font-size: min(1.5rem, 0.833333vw + 0.833333rem)"); // open floor
    expect(css).toContain("font-size: calc(0.833333vw + 0.833333rem)"); // open both
  });

  it("still accepts the legacy underscore separator end-to-end", async () => {
    const { css } = await generateCss("text-fluid-[16@320_24@1280]");
    expect(css).toContain("font-size: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
  });

  it("emits the static space scale (default vw, 320..1280)", async () => {
    const { css } = await generateCss("p-fluid-4 gap-fluid-6 w-fluid-12");
    // p-fluid-4 → {16,24}, gap-fluid-6 → {24,36}, w-fluid-12 → {48,80}
    expect(css).toContain("padding: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("gap: clamp(1.5rem, 1.25vw + 1.25rem, 2.25rem)");
    expect(css).toContain("width: clamp(3rem, 3.333333vw + 2.333333rem, 5rem)");
  });

  it("generates a cqh unit via the inline token", async () => {
    const { css } = await generateCss("text-fluid-[cqh,16,24]");
    expect(css).toContain("font-size: clamp(1rem, 0.833333cqh + 0.833333rem, 1.5rem)");
  });

  it("lengthUnit: px applies to static scale and arbitrary values", async () => {
    const { css } = await generateCss("text-fluid-base text-fluid-[16,24]", {
      lengthUnit: "px",
    });
    expect(css).toContain("font-size: clamp(16px, 0.208333vw + 15.333333px, 18px)"); // base {16,18}
    expect(css).toContain("font-size: clamp(16px, 0.833333vw + 13.333333px, 24px)"); // arbitrary
  });

  it("rootFontSize changes the rem conversion", async () => {
    const { css } = await generateCss("text-fluid-base", { rootFontSize: 10 });
    // base {16,18} at root 10 → floor 1.6rem, ceiling 1.8rem
    expect(css).toContain("font-size: clamp(1.6rem, 0.208333vw + 1.533333rem, 1.8rem)");
  });

  it("emits the new static space-scale entries (sizing, inset/position, scroll-m/p)", async () => {
    const { css } = await generateCss(
      "min-w-fluid-4 max-w-fluid-4 size-fluid-4 inset-fluid-4 inset-x-fluid-4 start-fluid-4 basis-fluid-4 scroll-mt-fluid-4 scroll-pt-fluid-4",
    );
    // fluid-4 → {16,24} across default 320..1280 vw range
    expect(css).toContain("min-width: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("max-width: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain(
      "width: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem);\n    height: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)",
    );
    expect(css).toContain("inset: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain(
      "left: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem);\n    right: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)",
    );
    expect(css).toContain("inset-inline-start: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("flex-basis: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("scroll-margin-top: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("scroll-padding-top: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
  });

  it("supports arbitrary values for the new typography/border/radius prefixes", async () => {
    const { css } = await generateCss(
      "leading-fluid-[16,24] tracking-fluid-[1,2] border-fluid-[1,4] rounded-tl-fluid-[4,12]",
    );
    expect(css).toContain("line-height: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("letter-spacing: clamp(0.0625rem, 0.104167vw + 0.041667rem, 0.125rem)");
    expect(css).toContain("border-width: clamp(0.0625rem, 0.3125vw, 0.25rem)");
    expect(css).toContain(
      "border-top-left-radius: clamp(0.25rem, 0.833333vw + 0.083333rem, 0.75rem)",
    );
  });

  // Tailwind v3 never registered a "perspective" utility root (verified
  // against real compiled v3.4.19 output), so making it fluid there would
  // invent a utility Tailwind itself doesn't have — perspective-fluid-* is
  // v4-only, see plugin-v4.test.ts.
  it("does not register perspective-fluid-* (v3 has no native perspective utility)", async () => {
    // `p-fluid-4` is a control: it proves the content really was scanned and
    // utilities really were generated, so the `not.toContain` below is
    // meaningful. Without it a compile that produced nothing at all would pass
    // this test vacuously — and Tailwind would (rightly) warn that it detected
    // no utility classes.
    const { css } = await generateCss("perspective-fluid-[250,500] p-fluid-4");
    expect(css).toContain(".p-fluid-4");
    expect(css).not.toContain("perspective");
  });

  it("composes translate-x/y-fluid into transform (v3 formula)", async () => {
    const { css } = await generateCss("translate-x-fluid-[8,16] translate-y-fluid-[8,16]");
    expect(css).toContain("--tw-translate-x: clamp(0.5rem, 0.833333vw + 0.333333rem, 1rem)");
    expect(css).toContain(
      "transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))",
    );
  });

  it("composes blur-fluid/backdrop-blur-fluid into filter/backdrop-filter (v3 formula)", async () => {
    const { css } = await generateCss("blur-fluid-[4,16] backdrop-blur-fluid-[4,16]");
    expect(css).toContain("--tw-blur: blur(clamp(0.25rem, 1.25vw, 1rem))");
    expect(css).toContain(
      "filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)",
    );
    expect(css).toContain("--tw-backdrop-blur: blur(clamp(0.25rem, 1.25vw, 1rem))");
    expect(css).toContain("-webkit-backdrop-filter:");
    expect(css).toContain("backdrop-filter: var(--tw-backdrop-blur)");
  });

  it("composes ring-fluid/ring-offset-fluid into box-shadow (v3 formula)", async () => {
    const { css } = await generateCss("ring-fluid-[1,4] ring-offset-fluid-[1,4]");
    expect(css).toContain(
      "--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(clamp(0.0625rem, 0.3125vw, 0.25rem) + var(--tw-ring-offset-width)) var(--tw-ring-color)",
    );
    expect(css).toContain(
      "box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000)",
    );
    expect(css).toContain("--tw-ring-offset-width: clamp(0.0625rem, 0.3125vw, 0.25rem)");
  });

  it("space-x/y-fluid and divide-x/y-fluid target the v3 adjacent-sibling selector", async () => {
    const { css } = await generateCss(
      "space-x-fluid-[8,16] space-y-fluid-[8,16] divide-x-fluid-[1,4] divide-y-fluid-[1,4]",
    );
    expect(css).toContain("> :not([hidden]) ~ :not([hidden])");
    expect(css).toContain("--tw-space-x-reverse: 0");
    expect(css).toContain(
      "margin-right: calc(clamp(0.5rem, 0.833333vw + 0.333333rem, 1rem) * var(--tw-space-x-reverse))",
    );
    expect(css).toContain("--tw-divide-x-reverse: 0");
    expect(css).toContain(
      "border-right-width: calc(clamp(0.0625rem, 0.3125vw, 0.25rem) * var(--tw-divide-x-reverse))",
    );
  });

  it("cssApi: 'v4' overrides createFluidPlugin's v3 default for composite utilities", async () => {
    const { css } = await generateCss("translate-x-fluid-[8,16]", { cssApi: "v4" });
    expect(css).toContain("--tw-translate-x: clamp(0.5rem, 0.833333vw + 0.333333rem, 1rem)");
    expect(css).toContain("translate: var(--tw-translate-x) var(--tw-translate-y)");
    expect(css).not.toContain("transform:");
  });

  describe("fluidVars", () => {
    it("emits a :root override for a shorthand value (no media)", async () => {
      const { css } = await generateCssWithBase("text-fluid-base", {
        fluidVars: { "space-token": "16,24" },
      });
      expect(css).toContain(":root");
      expect(css).toContain(
        "--space-token: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)",
      );
      expect(css).not.toContain("@media");
    });

    it("emits a base :root declaration plus stacked @media overrides for 3+ anchors", async () => {
      const { css } = await generateCssWithBase("text-fluid-base", {
        fluidVars: { "text-xs": "10@320,11@768,12@1280" },
      });
      expect(css).toContain(
        "--text-xs: clamp(0.625rem, 0.223214vw + 0.580357rem, 0.6875rem)",
      );
      expect(css).toContain("@media (min-width: 768px)");
      expect(css).toContain(
        "--text-xs: clamp(0.6875rem, 0.195313vw + 0.59375rem, 0.75rem)",
      );
    });

    it("resolves named breakpoints and the textUnit/textBreakpointRange config", async () => {
      const { css } = await generateCssWithBase("text-fluid-base", {
        textUnit: "cqw",
        fluidVars: { "text-xs": "10@sm,12@lg" },
      });
      expect(css).toContain("cqw");
    });

    it("an unparsable fluidVars value throws a build-time error", async () => {
      await expect(
        generateCssWithBase("text-fluid-base", {
          fluidVars: { "text-xs": "not-a-value" },
        }),
      ).rejects.toThrow(/invalid fluidVars\["text-xs"\]/);
    });

    // The default export normalizes flat CSS-first options before handing them
    // to the shared plugin body; it used to rebuild the config key-by-key and
    // drop `fluidVars` entirely, so this path silently emitted no :root
    // override while `createFluidPlugin` worked fine.
    it("survives the default export's option normalization", async () => {
      uniqueId += 1;
      const { css } = await postcss([
        tailwind({
          content: [{ raw: `uniq${uniqueId} text-fluid-base`, extension: "html" }],
          corePlugins: { preflight: false },
          theme: { screens: SCREENS },
          plugins: [fluidClampPlugin({ fluidVars: { "space-token": "16,24" } })],
        }),
      ]).process("@tailwind base; @tailwind utilities;", { from: undefined });

      expect(css).toContain(
        "--space-token: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)",
      );
    });
  });
});

describe("normalizeOptions", () => {
  it("passes nested-only config options through untouched", () => {
    const fluidVars = { "text-xs": "10,12" };
    const breakpoints = { xs: 480 };
    expect(normalizeOptions({ fluidVars, breakpoints, cssApi: "v4" })).toMatchObject({
      fluidVars,
      breakpoints,
      cssApi: "v4",
    });
  });

  it("builds nested ranges from flat endpoints and drops the flat keys", () => {
    const normalized = normalizeOptions({
      minBreakpoint: "320",
      maxBreakpoint: 1280,
      textMinBreakpoint: "sm",
    });
    expect(normalized.breakpointRange).toEqual({
      minBreakpoint: 320,
      maxBreakpoint: 1280,
    });
    // A missing endpoint falls back to the built-in default.
    expect(normalized.textBreakpointRange).toEqual({
      minBreakpoint: "sm",
      maxBreakpoint: 1280,
    });
    expect(normalized.spaceBreakpointRange).toBeUndefined();
    expect(normalized).not.toHaveProperty("minBreakpoint");
    expect(normalized).not.toHaveProperty("textMinBreakpoint");
  });
});
