/**
 * registration.test.ts
 * Exhaustive, data-driven coverage of the prefix tables.
 *
 * The rest of the suite asserts on hand-picked utilities — `p-fluid-4`,
 * `w-fluid-[16,24]`, a few composites. That leaves the long tail untested:
 * `SPACE_PROPS` alone has 47 prefixes, and a typo in any one of them (a wrong
 * camelCase property name, a prefix registered but never matched) ships
 * silently because no test names it.
 *
 * These tests iterate the tables themselves, so a prefix added later is covered
 * the moment it's added — including the cross-table invariant CLAUDE.md calls
 * out but nothing enforced: every fluid prefix must also appear in
 * `tw-merge.ts`'s `fluidClassGroups`, or `cn()` silently stops deduping it.
 */

import { describe, it, expect } from "vitest";
import postcss from "postcss";
import tailwind from "tailwindcss";
import {
  createFluidPlugin,
  SPACE_PROPS,
  ARBITRARY_ONLY_PROPS,
  MISC_PROPS,
  type FluidPluginConfig,
} from "../src/plugin";
import { COMPOSITE_PROPS } from "../src/composite";
import { DEFAULT_TYPE_SCALE, DEFAULT_SPACE_SCALE } from "../src/defaults";
import { fluidClassGroups } from "../src/tw-merge";

let uniqueId = 0;
async function compile(content: string, config: FluidPluginConfig = {}) {
  uniqueId += 1;
  const { css } = await postcss([
    tailwind({
      content: [{ raw: `reg${uniqueId} ${content}`, extension: "html" }],
      corePlugins: { preflight: false },
      plugins: [createFluidPlugin(config)],
    } as Parameters<typeof tailwind>[0]),
  ]).process("@tailwind utilities;", { from: undefined });
  return css;
}

/**
 * camelCase declaration keys → the kebab-case property Tailwind emits.
 * Vendor-prefixed keys need no special case: `WebkitBackdropFilter` starts
 * with a capital, so the same rule yields the leading dash of
 * `-webkit-backdrop-filter`. Custom properties (`--tw-blur`) have no capitals
 * and pass through untouched.
 */
const toCssProp = (key: string) => key.replace(/([A-Z])/g, "-$1").toLowerCase();

describe("static scales cover every documented key", () => {
  it("emits a text-fluid-* class for every type-scale key", async () => {
    const keys = Object.keys(DEFAULT_TYPE_SCALE);
    const css = await compile(keys.map((k) => `text-fluid-${k}`).join(" "));
    for (const key of keys) {
      // Tailwind escapes the dot-free keys as-is; 2xs/2xl start with a digit
      // and get a leading escape, so match on the declaration context instead.
      expect(css, `missing .text-fluid-${key}`).toContain(`text-fluid-${key}`);
    }
    expect((css.match(/font-size:/g) ?? []).length).toBe(keys.length);
  });

  it("emits every space-scale step for every space prefix", async () => {
    const steps = Object.keys(DEFAULT_SPACE_SCALE);
    const prefixes = Object.keys(SPACE_PROPS);
    const classes = prefixes.flatMap((p) => steps.map((s) => `${p}-fluid-${s}`));
    const css = await compile(classes.join(" "));

    for (const prefix of prefixes) {
      for (const step of steps) {
        expect(css, `missing .${prefix}-fluid-${step}`).toContain(
          `${prefix}-fluid-${step}`,
        );
      }
    }
  });
});

describe("every registered prefix produces the CSS its table declares", () => {
  // One arbitrary value is enough — it exercises the same matchUtilities
  // callback the static scale uses, and covers the arbitrary-only prefixes
  // that have no static scale at all.
  const plainTables = { ...SPACE_PROPS, ...ARBITRARY_ONLY_PROPS };

  it.each(Object.keys(plainTables))("%s-fluid-[…] emits its properties", async (prefix) => {
    const css = await compile(`${prefix}-fluid-[16,24]`);
    const expected = plainTables[prefix]("clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)");

    for (const [key, value] of Object.entries(expected)) {
      expect(css, `${prefix}-fluid-* is missing ${toCssProp(key)}`).toContain(
        `${toCssProp(key)}: ${value}`,
      );
    }
  });

  // The check above derives its expectation from the very table it tests, so
  // it proves each prefix is registered and reaches the CSS — but a *wrong*
  // property name (say `scroll-pl` writing scroll-padding-right) would satisfy
  // it, because the expectation is wrong in exactly the same way. Tailwind's
  // own utility for the same prefix is an independent oracle: every fluid
  // prefix exists to make a native utility fluid, so it must set precisely the
  // properties the native one sets.
  it.each(Object.keys(plainTables))(
    "%s-fluid-[…] sets the same properties as its native Tailwind counterpart",
    async (prefix) => {
      const cssProps = (css: string) =>
        [...css.matchAll(/^\s+(-?[a-z-]+):/gm)]
          .map((m) => m[1])
          .filter((p) => !p.startsWith("--"))
          .sort();

      const native = cssProps(await compile(`${prefix}-[16px]`));
      const fluid = cssProps(await compile(`${prefix}-fluid-[16,24]`));

      expect(native.length, `no native ${prefix}-[16px] to compare against`).toBeGreaterThan(0);
      expect(fluid, `${prefix}-fluid-* doesn't mirror native ${prefix}-*`).toEqual(native);
    },
  );

  it.each(Object.keys(COMPOSITE_PROPS))(
    "%s-fluid-[…] emits its composite declarations (v3 + v4)",
    async (prefix) => {
      for (const cssApi of ["v3", "v4"] as const) {
        const css = await compile(`${prefix}-fluid-[16,24]`, { cssApi });
        const clampValue = "clamp(1rem, 0.833333vw + 0.833333rem, 1.5rem)";
        const declarations = COMPOSITE_PROPS[prefix](cssApi, clampValue);

        for (const [key, value] of Object.entries(declarations)) {
          if (typeof value === "string") {
            expect(css, `${prefix}-fluid-* (${cssApi}) missing ${key}`).toContain(
              `${toCssProp(key)}: ${value}`,
            );
          } else {
            // A child-selector block (space-*/divide-*) — check its inner
            // declarations landed rather than the selector text, which
            // Tailwind rewrites.
            for (const [innerKey, innerValue] of Object.entries(value)) {
              expect(
                css,
                `${prefix}-fluid-* (${cssApi}) missing ${innerKey}`,
              ).toContain(`${toCssProp(innerKey)}: ${innerValue}`);
            }
          }
        }
      }
    },
  );

  it("perspective-fluid-* is registered on v4 and absent on v3", async () => {
    const v4 = await compile("perspective-fluid-[250,500] p-fluid-4", { cssApi: "v4" });
    expect(v4).toContain(".p-fluid-4"); // control: compilation really happened
    expect(v4).toContain("perspective:");

    const v3 = await compile("perspective-fluid-[250,500] p-fluid-4", { cssApi: "v3" });
    expect(v3).toContain(".p-fluid-4");
    expect(v3).not.toContain("perspective");
    expect(Object.keys(MISC_PROPS)).toEqual(["perspective"]);
  });
});

describe("tailwind-merge mirrors the prefix tables", () => {
  // CLAUDE.md: "Adding a new fluid prefix means updating the relevant table
  // plus its tw-merge.ts entry." Nothing enforced that until this test — a
  // prefix missing from fluidClassGroups still generates CSS, it just stops
  // being deduped by cn(), which is invisible until a user hits it.
  const registeredPrefixes = new Set([
    "text", // the text-fluid-* matcher, registered separately
    ...Object.keys(SPACE_PROPS),
    ...Object.keys(ARBITRARY_ONLY_PROPS),
    ...Object.keys(MISC_PROPS),
    ...Object.keys(COMPOSITE_PROPS),
  ]);

  // fluidClassGroups is { groupId: [{ classPart: [validator] }] } — the
  // classPart is the utility prefix as written in a class name.
  const mergePrefixes = new Set(
    Object.values(fluidClassGroups).flatMap((entries) =>
      entries.flatMap((entry) => Object.keys(entry)),
    ),
  );

  it("every registered fluid prefix has a fluidClassGroups entry", () => {
    const missing = [...registeredPrefixes].filter((p) => !mergePrefixes.has(p));
    expect(
      missing,
      `these prefixes generate CSS but cn() won't dedupe them — add them to fluidClassGroups`,
    ).toEqual([]);
  });

  it("fluidClassGroups has no entry for a prefix the plugin doesn't register", () => {
    const stale = [...mergePrefixes].filter((p) => !registeredPrefixes.has(p));
    expect(
      stale,
      `these fluidClassGroups entries don't match any generated utility`,
    ).toEqual([]);
  });
});
