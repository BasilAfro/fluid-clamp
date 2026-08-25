/**
 * edge-cases.test.ts
 * Paths the feature-oriented suites leave uncovered.
 *
 * Two kinds of gap:
 *
 *  1. Feature *combinations*. Piecewise ramps are tested on plain properties
 *     and composites are tested with two-anchor values, but their intersection
 *     — a `@media` block nested inside a child-selector rule — is the most
 *     structurally complex CSS this plugin can emit and nothing exercised it.
 *
 *  2. Validation branches that only fire on input TypeScript can't check,
 *     i.e. values arriving from a CSS-first `@plugin` block as strings.
 */

import { describe, it, expect } from "vitest";
import postcss from "postcss";
import tailwind from "tailwindcss";
import { createFluidPlugin, normalizeOptions, type FluidPluginConfig } from "../src/plugin";

let uniqueId = 0;
async function compile(content: string, config: FluidPluginConfig = {}) {
  uniqueId += 1;
  const { css } = await postcss([
    tailwind({
      content: [{ raw: `edge${uniqueId} ${content}`, extension: "html" }],
      corePlugins: { preflight: false },
      theme: { screens: { sm: "640px", md: "768px", lg: "1024px" } },
      plugins: [createFluidPlugin(config)],
    } as Parameters<typeof tailwind>[0]),
  ]).process("@tailwind base; @tailwind utilities;", { from: undefined });
  return css;
}

describe("piecewise ramps combined with composite utilities", () => {
  // buildDeclarations nests `@media` keys alongside the child-selector key a
  // composite builder returns. Getting that shape wrong yields CSS that
  // parses but applies to nothing.
  it("nests the @media override inside a space-y child-selector rule (v3)", async () => {
    const css = await compile("space-y-fluid-[8@320,12@768,16@1280]", { cssApi: "v3" });

    expect(css).toContain("> :not([hidden]) ~ :not([hidden])");
    expect(css).toContain("@media (min-width: 768px)");
    // Base segment (320→768) and the override (768→1280) both present…
    expect(css).toContain("clamp(0.5rem, 0.892857vw + 0.321429rem, 0.75rem)");
    expect(css).toContain("clamp(0.75rem, 0.78125vw + 0.375rem, 1rem)");
    // …and the override repeats the child selector rather than landing on the
    // element itself.
    const media = css.slice(css.indexOf("@media (min-width: 768px)"));
    expect(media).toContain("> :not([hidden]) ~ :not([hidden])");
  });

  it("nests the @media override inside the v4 child selector too", async () => {
    const css = await compile("divide-y-fluid-[2@320,4@768,8@1280]", { cssApi: "v4" });
    const media = css.slice(css.indexOf("@media (min-width: 768px)"));

    expect(css).toContain(":not(:last-child)");
    expect(media).toContain(":not(:last-child)");
    expect(media).toContain("--tw-divide-y-reverse");
  });

  it("applies a piecewise ramp to a translate composite (shared-variable form)", async () => {
    const css = await compile("translate-x-fluid-[4@320,8@768,16@1280]", { cssApi: "v4" });
    const media = css.slice(css.indexOf("@media (min-width: 768px)"));

    // The override must rewrite the variable *and* keep the `translate`
    // shorthand, or the second segment silently stops composing.
    expect(media).toContain("--tw-translate-x:");
    expect(media).toContain("translate: var(--tw-translate-x) var(--tw-translate-y)");
  });
});

describe("fluidVars supports the full arbitrary-value grammar", () => {
  // The README promises "shorthand, anchors, named breakpoints, insets, the
  // unit token, and bound markers all work identically". Shorthand, anchors
  // and names were covered; these two were not.
  it("honours a leading unit token", async () => {
    const css = await compile("text-fluid-base", {
      fluidVars: { "token-cq": "cqw,16,24" },
    });
    expect(css).toContain("--token-cq: clamp(1rem, 0.833333cqw + 0.833333rem, 1.5rem)");
  });

  it("honours bound markers and per-anchor insets", async () => {
    const css = await compile("text-fluid-base", {
      fluidVars: { "token-open": "16@320-16,24@1280>" },
    });
    // `>` opens the ceiling on a growing scale → max(), and the inset shifts
    // the low anchor to 304.
    expect(css).toContain("--token-open: max(1rem,");
    expect(css).not.toContain("--token-open: clamp(");
  });
});

describe("option validation rejects values TypeScript can't catch", () => {
  // These arrive as strings from a CSS-first `@plugin` block, so the type
  // system never sees them — normalizeOptions is the only guard.
  it("rejects an invalid lengthUnit", () => {
    expect(() => normalizeOptions({ lengthUnit: "em" as never })).toThrow(
      /invalid lengthUnit "em"/,
    );
  });

  it("rejects a non-numeric rootFontSize", () => {
    expect(() => normalizeOptions({ rootFontSize: "big" as never })).toThrow(
      /invalid rootFontSize "big"/,
    );
  });

  it("coerces a numeric-string rootFontSize from a CSS block", () => {
    expect(normalizeOptions({ rootFontSize: "10" as never }).rootFontSize).toBe(10);
  });

  it("rejects an invalid unit on each per-target key", () => {
    for (const key of ["unit", "textUnit", "spaceUnit"] as const) {
      expect(() => normalizeOptions({ [key]: "vh" } as never), key).toThrow(
        new RegExp(`invalid ${key} "vh"`),
      );
    }
  });

  it("accepts valid values on every validated key", () => {
    expect(() =>
      normalizeOptions({
        unit: "cqw",
        textUnit: "cqh",
        spaceUnit: "vw",
        lengthUnit: "px",
        rootFontSize: 10,
        cssApi: "v4",
      }),
    ).not.toThrow();
  });
});

describe("malformed arbitrary values produce no class rather than broken CSS", () => {
  it("drops the utility and leaves valid siblings intact", async () => {
    const css = await compile("w-fluid-[16] p-fluid-4", {});
    expect(css).toContain(".p-fluid-4"); // control: the build really ran
    expect(css).not.toContain("w-fluid");
  });

  it("drops an anchor value whose breakpoints collide", async () => {
    const css = await compile("w-fluid-[16@320,24@320] p-fluid-4", {});
    expect(css).toContain(".p-fluid-4");
    expect(css).not.toContain("w-fluid");
  });
});
