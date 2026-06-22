import { describe, it, expect } from "vitest";
import postcss from "postcss";
import tailwind from "tailwindcss";
import { createFluidPlugin } from "../src/plugin";

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

describe("createFluidPlugin (integration)", () => {
  it("emits a named-breakpoint anchor class with auto-vw", async () => {
    const { css } = await generateCss("text-fluid-[16@sm_24@lg]", {
      breakpoints: { xs: 480 },
    });
    expect(css).toContain("font-size: clamp(1rem, 2.0833vw + 0.1667rem, 1.5rem)");
  });

  it("static scale honours unit + breakpointRange config (general knobs)", async () => {
    // cqw default, breakpoints sm..2xl (640..1536)
    const { css } = await generateCss("text-fluid-base", {
      unit: "cqw",
      breakpointRange: { minBreakpoint: "sm", maxBreakpoint: "2xl" },
    });
    expect(css).toContain("font-size: clamp(1rem, 0.2232cqw + 0.9107rem, 1.125rem)");
  });

  it("a per-target override beats the general knob", async () => {
    const { css } = await generateCss("p-fluid-[8@320_16@1280]", {
      unit: "vw",
      spaceUnit: "cqw",
    });
    // spaceUnit cqw overrides the general vw for spacing utilities
    expect(css).toContain("padding: clamp(0.5rem, 0.8333cqw + 0.3333rem, 1rem)");
  });

  it("an unknown config breakpoint name throws a build-time error", async () => {
    await expect(
      generateCss("text-fluid-base", {
        breakpointRange: { minBreakpoint: "nope", maxBreakpoint: "lg" },
      }),
    ).rejects.toThrow(/unknown breakpoint name "nope"/);
  });

  it("reserved 3-anchor value produces no class", async () => {
    const { css } = await generateCss("text-fluid-[16@320_20@768_24@1280]");
    expect(css).not.toContain("clamp(");
  });

  it("applies a per-anchor inset in an arbitrary value", async () => {
    // 320-16 -> 304, 1280-24 -> 1256; subtracted directly (no ×2)
    const { css } = await generateCss("text-fluid-[16@320-16_24@1280-24]");
    expect(css).toContain("font-size: clamp(1rem, 0.8403vw + 0.8403rem, 1.5rem)");
  });
});
