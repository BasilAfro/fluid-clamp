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
});
