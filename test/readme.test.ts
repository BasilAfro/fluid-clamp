/**
 * readme.test.ts
 * Treats the README's code samples as testable claims rather than prose.
 *
 * Every assertion here derives the expected string from the real thing —
 * compiled Tailwind output, or the exported function's actual return value —
 * and then checks the README contains it verbatim. So a failure means one of
 * two things, and the message tells you which: either the output changed and
 * the docs need updating, or the docs drifted on their own.
 *
 * This exists because the README once documented the flagship piecewise
 * example in `px` while the plugin emitted `rem` (the `lengthUnit` default) —
 * a mismatch nothing could catch, since no test ever compared the two.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import tailwind from "tailwindcss";
import { createFluidPlugin, type FluidPluginConfig } from "../src/plugin";
import { fluidClamp } from "../src/fluid";
import { cn } from "../src/tw-merge";

const README = readFileSync(new URL("../README.md", import.meta.url), "utf8");

// Tailwind's JIT caches by content string, so each compile needs a unique
// throwaway candidate (same reason as the counter in plugin.test.ts).
let uniqueId = 0;
async function compile(content: string, config: FluidPluginConfig = {}) {
  uniqueId += 1;
  const { css } = await postcss([
    tailwind({
      content: [{ raw: `readme${uniqueId} ${content}`, extension: "html" }],
      corePlugins: { preflight: false },
      plugins: [createFluidPlugin(config)],
    } as Parameters<typeof tailwind>[0]),
  ]).process("@tailwind base; @tailwind utilities;", { from: undefined });
  return css;
}

/** Pulls every `prop: value` declaration for `prop` out of compiled CSS. */
function declarations(css: string, prop: string): string[] {
  return [...css.matchAll(new RegExp(`${prop}:\\s*([^;\\n}]+)`, "g"))].map((m) =>
    m[1].trim(),
  );
}

function expectDocumented(actual: string, sample: string) {
  expect(
    README.includes(actual),
    `README is missing the current output of ${sample}:\n\n  ${actual}\n\n` +
      `Either the output changed (update the README) or the sample drifted.`,
  ).toBe(true);
}

describe("README code samples match real output", () => {
  it("documents the piecewise ramp example as it actually compiles", async () => {
    const css = await compile("text-fluid-[24@390,28@640,42@768,48@1024]");
    const fontSizes = declarations(css, "font-size");

    // One base clamp plus one @media override per extra anchor.
    expect(fontSizes).toHaveLength(3);
    for (const value of fontSizes) {
      expectDocumented(value, "the piecewise ramp example");
    }
    // The ramp's media queries are documented too.
    for (const minWidth of [640, 768]) {
      expectDocumented(`@media (min-width: ${minWidth}px)`, "the piecewise ramp example");
    }
  });

  it("documents the fluidVars example as it actually compiles", async () => {
    const css = await compile("text-fluid-base", {
      fluidVars: { "text-xs": "10@390,11@768,12@1280" },
    });
    const values = declarations(css, "--text-xs");

    expect(values).toHaveLength(2);
    for (const value of values) {
      expectDocumented(`--text-xs: ${value}`, "the fluidVars example");
    }
  });

  it("documents the direct fluidClamp() usage examples", () => {
    const options = {
      minSize: 14,
      maxSize: 22,
      minBreakpoint: 304,
      maxBreakpoint: 1074,
      fluidUnit: "cqw",
    } as const;

    expectDocumented(fluidClamp(options), "the fluidClamp() example");
    expectDocumented(
      fluidClamp({ ...options, clampMax: false }),
      "the fluidClamp() clampMax:false example",
    );
  });

  it("documents the equal-sizes shorthand result", async () => {
    // Equal sizes aren't fluid — the README promises a plain length, not a
    // degenerate clamp().
    const [fontSize] = declarations(await compile("text-fluid-[16,16]"), "font-size");
    expect(fontSize).toBe("1rem");
    expectDocumented("`text-fluid-[16,16]` → `1rem`", "the equal-sizes note");
  });

  it("documents the cn() results its comments claim", () => {
    const cases: [string, string][] = [
      ['cn("p-4", "p-fluid-4")', cn("p-4", "p-fluid-4")],
      ['cn("ring-fluid-4", "ring-2")', cn("ring-fluid-4", "ring-2")],
      ['cn("text-fluid-lg", "text-red-500")', cn("text-fluid-lg", "text-red-500")],
    ];
    for (const [call, result] of cases) {
      expectDocumented(`${call}; // → "${result}"`, call);
    }
  });
});
