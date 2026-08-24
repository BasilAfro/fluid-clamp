/**
 * plugin-v4.test.ts
 * Integration tests against Tailwind CSS v4's CSS-first pipeline (`compile()`),
 * installed as the `tailwindcss4` devDependency alias so v3 and v4 can be
 * tested side by side.
 *
 * The `loadModule` hook below stands in for v4's real module loader
 * (@tailwindcss/node), which loads plugin packages through jiti with default
 * interop — i.e. the package's `default` export is what reaches Tailwind.
 * Passing `pluginModule.default` here exercises the exact consumer path of
 * `@plugin "@basilafro/fluid-clamp";`.
 */

import { describe, it, expect } from "vitest";
import { compile } from "tailwindcss4";
import { Scanner } from "@tailwindcss/oxide";
import * as pluginModule from "../src/index";
import { createFluidPlugin } from "../src/index";

type LoadedModule = Parameters<typeof compile>[1] extends
  | { loadModule?: (...args: never[]) => Promise<infer Result> }
  | undefined
  ? Result
  : never;

async function generateV4Css(
  candidates: string[],
  {
    css = "",
    pluginDirective = `@plugin "@basilafro/fluid-clamp";`,
    module = pluginModule.default as LoadedModule["module"],
  } = {},
) {
  const compiler = await compile(
    `${css}\n${pluginDirective}\n@tailwind utilities;`,
    {
      base: "/",
      loadModule: async () => ({
        path: "@basilafro/fluid-clamp",
        base: "/",
        module,
      }),
      loadStylesheet: async () => {
        throw new Error("no stylesheet imports expected in these tests");
      },
    },
  );
  return compiler.build(candidates);
}

describe("Tailwind v4 (@plugin, CSS-first)", () => {
  it("zero-config @plugin emits the static type and space scales", async () => {
    const css = await generateV4Css(["text-fluid-base", "p-fluid-4", "gap-fluid-6"]);
    expect(css).toContain("font-size: clamp(1rem, 0.208333vw + 0.958333rem, 1.125rem)");
    expect(css).toContain("padding: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("gap: clamp(1.5rem, 1.25vw + 1.25rem, 2.25rem)");
  });

  it("accepts flat options in the @plugin block", async () => {
    const css = await generateV4Css(["text-fluid-base"], {
      pluginDirective: `@plugin "@basilafro/fluid-clamp" {
        minBreakpoint: 640;
        maxBreakpoint: 1536;
        unit: cqw;
      }`,
    });
    // Same numbers as the v3 test with the sm..2xl (640..1536) range.
    expect(css).toContain("font-size: clamp(1rem, 0.223214cqw + 0.910714rem, 1.125rem)");
  });

  it("resolves flat option breakpoint names from @theme --breakpoint-*", async () => {
    const css = await generateV4Css(["text-fluid-base"], {
      css: `@theme { --breakpoint-sm: 40rem; --breakpoint-2xl: 96rem; }`,
      pluginDirective: `@plugin "@basilafro/fluid-clamp" {
        minBreakpoint: sm;
        maxBreakpoint: 2xl;
        unit: cqw;
      }`,
    });
    // sm(640)..2xl(1536) — identical output to the numeric-options test above.
    expect(css).toContain("font-size: clamp(1rem, 0.223214cqw + 0.910714rem, 1.125rem)");
  });

  it("resolves named anchors from @theme --breakpoint-* screens", async () => {
    const css = await generateV4Css(["text-fluid-[16@sm,24@lg]"], {
      css: `@theme { --breakpoint-sm: 40rem; --breakpoint-lg: 64rem; }`,
    });
    // 16..24 across sm(640)..lg(1024), auto-vw for named breakpoints.
    expect(css).toContain("font-size: clamp(1rem, 2.083333vw + 0.166667rem, 1.5rem)");
  });

  it("compiles the full arbitrary-value grammar under v4", async () => {
    const css = await generateV4Css([
      "text-fluid-[16,24]",
      "text-fluid-[cqw,16,24]",
      "text-fluid-[16@320-16,24@1280-24]",
      "text-fluid-[16@320,24@1280>]",
      "text-fluid-[<16@320,24@1280]",
      "text-fluid-[<16@320,24@1280>]",
      "text-fluid-[16@320_24@1280]",
    ]);
    expect(css).toContain("font-size: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)"); // shorthand
    expect(css).toContain("font-size: clamp(1rem, 0.833333cqw + 0.833333rem, 1.5rem)"); // unit token
    expect(css).toContain("font-size: clamp(1rem, 0.840336vw + 0.840336rem, 1.5rem)"); // inset
    expect(css).toContain("font-size: max(1rem, 0.833333vw + 0.833333rem)"); // open ceiling
    expect(css).toContain("font-size: min(1.5rem, 0.833333vw + 0.833333rem)"); // open floor
    expect(css).toContain("font-size: calc(0.833333vw + 0.833333rem)"); // open both
  });

  it("a 3+ anchor value produces a piecewise ramp (base clamp + stacked @media overrides)", async () => {
    const css = await generateV4Css([
      "text-fluid-[16@320,20@768,24@1280]",
      "px-fluid-[16@320,20@768,24@1280]",
    ]);
    // Single-declaration prefix (font-size).
    expect(css).toContain("font-size: clamp(1rem, 0.892857vw + 0.821429rem, 1.25rem)");
    // Multi-declaration prefix (padding-left + padding-right) also nests correctly.
    expect(css).toContain("padding-left: clamp(1rem, 0.892857vw + 0.821429rem, 1.25rem)");
    expect(css).toContain("padding-right: clamp(1rem, 0.892857vw + 0.821429rem, 1.25rem)");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain("clamp(1.25rem, 0.78125vw + 0.875rem, 1.5rem)");
  });

  it("an unknown breakpoint name in the options block throws a build-time error", async () => {
    await expect(
      generateV4Css(["text-fluid-base"], {
        pluginDirective: `@plugin "@basilafro/fluid-clamp" {
          minBreakpoint: nope;
          maxBreakpoint: 1280;
        }`,
      }),
    ).rejects.toThrow(/unknown breakpoint name "nope"/);
  });

  it("an invalid unit in the options block throws a build-time error", async () => {
    await expect(
      generateV4Css(["text-fluid-base"], {
        pluginDirective: `@plugin "@basilafro/fluid-clamp" { unit: banana; }`,
      }),
    ).rejects.toThrow(/invalid unit "banana"/);
  });

  it("v4's oxide scanner extracts every syntax form from real source text", async () => {
    // `compiler.build()` bypasses source scanning, so this covers the missing
    // half: the scanner must first find the class names — with `,` `@` `-` and
    // the `<`/`>` edge markers — in actual JSX before they can be compiled.
    const jsx = `
      const heading = <h1 className="text-fluid-[16@sm,24@lg] p-fluid-[8@320-16,16@1280>]" />;
      const body = <p className={"text-fluid-[<13,19>] text-fluid-[cqw,16,24]"} />;
    `;
    const scanner = new Scanner({});
    const candidates = scanner
      .getCandidatesWithPositions({ content: jsx, extension: "tsx" })
      .map(({ candidate }) => candidate);

    const css = await generateV4Css(candidates, {
      css: `@theme { --breakpoint-sm: 40rem; --breakpoint-lg: 64rem; }`,
    });
    expect(css).toContain("font-size: clamp(1rem, 2.083333vw + 0.166667rem, 1.5rem)"); // named anchors
    expect(css).toContain("padding: max(0.5rem, 0.819672vw + 0.344262rem)"); // inset + open ceiling
    expect(css).toContain("font-size: calc(0.625vw + 0.6875rem)"); // fully open shorthand
    expect(css).toContain("font-size: clamp(1rem, 0.833333cqw + 0.833333rem, 1.5rem)"); // unit token
  });

  it("createFluidPlugin (nested JS config) still works as the loaded module", async () => {
    const css = await generateV4Css(["p-fluid-[8@320,16@1280]"], {
      module: createFluidPlugin({
        unit: "vw",
        spaceUnit: "cqw",
      }) as LoadedModule["module"],
    });
    expect(css).toContain("padding: clamp(0.5rem, 0.833333cqw + 0.333333rem, 1rem)");
  });

  it("emits the new static space-scale entries (sizing, inset/position, scroll-m/p)", async () => {
    const css = await generateV4Css([
      "min-w-fluid-4",
      "max-w-fluid-4",
      "size-fluid-4",
      "inset-fluid-4",
      "inset-x-fluid-4",
      "start-fluid-4",
      "basis-fluid-4",
      "scroll-mt-fluid-4",
      "scroll-pt-fluid-4",
    ]);
    expect(css).toContain("min-width: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("max-width: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("inset: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("inset-inline-start: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("flex-basis: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("scroll-margin-top: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("scroll-padding-top: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
  });

  it("supports arbitrary values for the new typography/border/radius/perspective prefixes", async () => {
    const css = await generateV4Css([
      "leading-fluid-[16,24]",
      "tracking-fluid-[1,2]",
      "border-fluid-[1,4]",
      "rounded-tl-fluid-[4,12]",
      "perspective-fluid-[250,500]",
    ]);
    expect(css).toContain("line-height: clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");
    expect(css).toContain("letter-spacing: clamp(0.0625rem, 0.104167vw + 0.041667rem, 0.125rem)");
    expect(css).toContain("border-width: clamp(0.0625rem, 0.3125vw, 0.25rem)");
    expect(css).toContain(
      "border-top-left-radius: clamp(0.25rem, 0.833333vw + 0.083333rem, 0.75rem)",
    );
    expect(css).toContain("perspective: clamp(15.625rem, 26.041667vw + 10.416667rem, 31.25rem)");
  });

  it("composes translate-x/y-fluid into the v4 `translate` property", async () => {
    const css = await generateV4Css(["translate-x-fluid-[8,16]", "translate-y-fluid-[8,16]"]);
    expect(css).toContain("--tw-translate-x: clamp(0.5rem, 0.833333vw + 0.333333rem, 1rem)");
    expect(css).toContain("translate: var(--tw-translate-x) var(--tw-translate-y)");
  });

  it("composes blur-fluid/backdrop-blur-fluid into filter/backdrop-filter (v4 fallback syntax)", async () => {
    const css = await generateV4Css(["blur-fluid-[4,16]", "backdrop-blur-fluid-[4,16]"]);
    expect(css).toContain("--tw-blur: blur(clamp(0.25rem, 1.25vw, 1rem))");
    expect(css).toContain(
      "filter: var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)",
    );
    expect(css).toContain("--tw-backdrop-blur: blur(clamp(0.25rem, 1.25vw, 1rem))");
    expect(css).toContain("-webkit-backdrop-filter:");
    expect(css).toContain("backdrop-filter: var(--tw-backdrop-blur,)");
  });

  it("composes ring-fluid/ring-offset-fluid into box-shadow (v4 formula)", async () => {
    const css = await generateV4Css(["ring-fluid-[1,4]", "ring-offset-fluid-[1,4]"]);
    expect(css).toContain(
      "--tw-ring-shadow: var(--tw-ring-inset,) 0 0 0 calc(clamp(0.0625rem, 0.3125vw, 0.25rem) + var(--tw-ring-offset-width)) var(--tw-ring-color, currentcolor)",
    );
    expect(css).toContain(
      "box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)",
    );
    expect(css).toContain("--tw-ring-offset-width: clamp(0.0625rem, 0.3125vw, 0.25rem)");
  });

  it("space-x/y-fluid and divide-x/y-fluid target the v4 :where(&>:not(:last-child)) selector", async () => {
    const css = await generateV4Css([
      "space-x-fluid-[8,16]",
      "space-y-fluid-[8,16]",
      "divide-x-fluid-[1,4]",
      "divide-y-fluid-[1,4]",
    ]);
    expect(css).toContain(":where(& > :not(:last-child))");
    expect(css).toContain("--tw-space-x-reverse: 0");
    expect(css).toContain(
      "margin-inline-start: calc(clamp(0.5rem, 0.833333vw + 0.333333rem, 1rem) * var(--tw-space-x-reverse))",
    );
    expect(css).toContain("--tw-divide-x-reverse: 0");
    expect(css).toContain(
      "border-inline-start-width: calc(clamp(0.0625rem, 0.3125vw, 0.25rem) * var(--tw-divide-x-reverse))",
    );
  });

  it("cssApi: v3 in the @plugin block overrides the default export's v4 default", async () => {
    const css = await generateV4Css(["translate-x-fluid-[8,16]"], {
      pluginDirective: `@plugin "@basilafro/fluid-clamp" { cssApi: v3; }`,
    });
    expect(css).toContain("--tw-translate-x: clamp(0.5rem, 0.833333vw + 0.333333rem, 1rem)");
    expect(css).toContain(
      "transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))",
    );
  });

  it("an invalid cssApi in the options block throws a build-time error", async () => {
    await expect(
      generateV4Css(["translate-x-fluid-[8,16]"], {
        pluginDirective: `@plugin "@basilafro/fluid-clamp" { cssApi: v5; }`,
      }),
    ).rejects.toThrow(/invalid cssApi "v5"/);
  });
});
