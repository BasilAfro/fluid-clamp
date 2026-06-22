/**
 * plugin.ts
 * Tailwind CSS plugin factory for fluid clamp utilities.
 *
 * Usage in tailwind.config.ts:
 *   import { createFluidPlugin } from "@basilafro/fluid-clamp";
 *   plugins: [createFluidPlugin({ ... })]
 *
 * Zero-config (uses all defaults):
 *   import { fluidPlugin } from "@basilafro/fluid-clamp";
 *   plugins: [fluidPlugin]
 */

import plugin from "tailwindcss/plugin";
import { fluidClamp, FluidUnit } from "./fluid";
import { DEFAULT_TYPE_SCALE, DEFAULT_SPACE_SCALE } from "./defaults";
import {
  BreakpointConfig,
  ThemeFn,
  parseArbitraryValue,
  resolveBreakpoints,
  resolveBpConfig,
} from "./parse";

export type { BreakpointConfig } from "./parse";

// ─── Plugin config ────────────────────────────────────────────────────────────

export interface FluidPluginConfig {
  /**
   * Breakpoints used for all fluid utilities (text and spacing).
   * This is the one knob most projects need — text and spacing usually share
   * the same range. Use `textBp`/`spaceBp` only to override one of them.
   *
   * `minBp`/`maxBp` accept a px number or a breakpoint name (a Tailwind screen
   * or a name from the `breakpoints` option), e.g. `{ minBp: "xs", maxBp: "lg" }`.
   * @default { minBp: 320, maxBp: 1280 }
   */
  bp?: BreakpointConfig;

  /**
   * Default fluid unit for all fluid utilities (text and spacing).
   * - "vw"  → relative to viewport, no container needed (matches breakpoints)
   * - "cqw" → needs container-type: inline-size or size on parent
   * - "cqh" → needs container-type: size + explicit height on parent
   *
   * This is only the fallback. A unit can be chosen per-class with a leading
   * unit token (e.g. `text-fluid-[cqw_15_32]`), and using a named breakpoint
   * (e.g. `text-fluid-[15@sm_32@lg]`) automatically selects `vw`.
   * Use `textUnit`/`spaceUnit` only to override one of them.
   * @default "vw"
   */
  unit?: FluidUnit;

  /**
   * Override breakpoints for text-fluid-* classes only.
   * Falls back to `bp`, then the default. Use this when text should scale
   * across a different range than spacing (e.g. page/viewport vs component).
   * @default `bp`
   */
  textBp?: BreakpointConfig;

  /**
   * Override breakpoints for spacing fluid-* classes only.
   * Falls back to `bp`, then the default.
   * @default `bp`
   */
  spaceBp?: BreakpointConfig;

  /**
   * Override the fluid unit for text-fluid-* classes only.
   * Falls back to `unit`, then the default. Same precedence rules as `unit`.
   * @default `unit`
   */
  textUnit?: FluidUnit;

  /**
   * Override the fluid unit for spacing fluid-* classes only.
   * Falls back to `unit`, then the default.
   * @default `unit`
   */
  spaceUnit?: FluidUnit;

  /**
   * Named breakpoints usable as the bp in arbitrary-value anchors,
   * e.g. `text-fluid-[15@sm_32@lg]` (size 15→32px across the sm→lg range).
   *
   * These are merged on top of — and override — Tailwind's theme `screens`,
   * so every breakpoint you already use in Tailwind (sm, md, lg, xl, 2xl, plus
   * any custom ones) is available automatically. Use this option to add names
   * that aren't Tailwind screens (e.g. `xs`) or to override a screen's px value
   * just for fluid utilities.
   *
   * Values are in px.
   * @default {}
   */
  breakpoints?: Record<string, number>;
}

// ─── Resolved config (after applying defaults) ────────────────────────────────

interface ResolvedConfig {
  textBp: BreakpointConfig;
  spaceBp: BreakpointConfig;
  textUnit: FluidUnit;
  spaceUnit: FluidUnit;
}

const PLUGIN_DEFAULTS: ResolvedConfig = {
  textBp: { minBp: 320, maxBp: 1280 },
  spaceBp: { minBp: 320, maxBp: 1280 },
  // vw matches the viewport-based default breakpoints (and the named Tailwind
  // breakpoints). Override per-class with a unit token, e.g. text-fluid-[cqw_15_32].
  textUnit: "vw",
  spaceUnit: "vw",
};

// ─── Spacing utilities ────────────────────────────────────────────────────────
// Single source of truth for the spacing prefixes and the CSS declarations each
// one applies a fluid clamp value to. Both the static scale (`p-fluid-4`) and the
// arbitrary-value matchers (`p-fluid-[…]`) are generated from this map, so the
// prefix → property mapping lives in exactly one place.

const SPACE_PROPS: Record<string, (c: string) => Record<string, string>> = {
  p: (c) => ({ padding: c }),
  px: (c) => ({ paddingLeft: c, paddingRight: c }),
  py: (c) => ({ paddingTop: c, paddingBottom: c }),
  pt: (c) => ({ paddingTop: c }),
  pr: (c) => ({ paddingRight: c }),
  pb: (c) => ({ paddingBottom: c }),
  pl: (c) => ({ paddingLeft: c }),
  m: (c) => ({ margin: c }),
  mx: (c) => ({ marginLeft: c, marginRight: c }),
  my: (c) => ({ marginTop: c, marginBottom: c }),
  mt: (c) => ({ marginTop: c }),
  mr: (c) => ({ marginRight: c }),
  mb: (c) => ({ marginBottom: c }),
  ml: (c) => ({ marginLeft: c }),
  gap: (c) => ({ gap: c }),
  "gap-x": (c) => ({ columnGap: c }),
  "gap-y": (c) => ({ rowGap: c }),
  w: (c) => ({ width: c }),
  h: (c) => ({ height: c }),
};

// ─── Plugin factory ───────────────────────────────────────────────────────────

export function createFluidPlugin(config: FluidPluginConfig = {}) {
  // Precedence: per-target override → general knob → built-in default.
  const resolved: ResolvedConfig = {
    textBp: config.textBp ?? config.bp ?? PLUGIN_DEFAULTS.textBp,
    spaceBp: config.spaceBp ?? config.bp ?? PLUGIN_DEFAULTS.spaceBp,
    textUnit: config.textUnit ?? config.unit ?? PLUGIN_DEFAULTS.textUnit,
    spaceUnit: config.spaceUnit ?? config.unit ?? PLUGIN_DEFAULTS.spaceUnit,
  };

  return plugin(function ({ addUtilities, matchUtilities, theme }) {
    // Named breakpoints: Tailwind's theme screens + plugin overrides.
    const bpMap = resolveBreakpoints(theme as ThemeFn, config.breakpoints);

    // Resolve config breakpoints (which may use names like "xs"/"lg") to px.
    const textBp = resolveBpConfig(resolved.textBp, bpMap, "textBp");
    const spaceBp = resolveBpConfig(resolved.spaceBp, bpMap, "spaceBp");

    // Bound parsers so arbitrary-value callbacks stay terse.
    const textClamp = (value: string) =>
      parseArbitraryValue(value, resolved.textUnit, textBp, bpMap);
    const spaceClamp = (value: string) =>
      parseArbitraryValue(value, resolved.spaceUnit, spaceBp, bpMap);

    // ── Static type scale ────────────────────────────────────────────────────
    // Generates: text-fluid-xs, text-fluid-sm, text-fluid-base, etc.

    const typeUtilities = Object.fromEntries(
      Object.entries(DEFAULT_TYPE_SCALE).map(([key, { minSize, maxSize }]) => [
        `.text-fluid-${key}`,
        {
          fontSize: fluidClamp({
            minSize,
            maxSize,
            fluidUnit: resolved.textUnit,
            ...textBp,
          }),
        },
      ]),
    );

    // ── Static space scale ───────────────────────────────────────────────────
    // Generates: p-fluid-4, px-fluid-4, gap-fluid-4, w-fluid-4, etc.

    const spaceUtilities: Record<string, Record<string, string>> = {};

    for (const [key, { minSize, maxSize }] of Object.entries(
      DEFAULT_SPACE_SCALE,
    )) {
      const c = fluidClamp({
        minSize,
        maxSize,
        fluidUnit: resolved.spaceUnit,
        ...spaceBp,
      });

      for (const [prefix, toDecls] of Object.entries(SPACE_PROPS)) {
        spaceUtilities[`.${prefix}-fluid-${key}`] = toDecls(c);
      }
    }

    addUtilities({ ...typeUtilities, ...spaceUtilities });

    // ── Dynamic arbitrary values ─────────────────────────────────────────────
    // text-fluid-[16_24]                ← shorthand: two sizes, config breakpoints
    // text-fluid-[16@320_24@1280]       ← anchors: size pinned to explicit bp
    // text-fluid-[16@sm_24@lg]          ← anchors with breakpoint names
    // text-fluid-[16@320-16_24@1280-24] ← per-anchor inset (effective bp = bp − N)
    // text-fluid-[cqw_16_24]            ← leading unit token (overrides the default)

    matchUtilities(
      {
        "text-fluid": (value) => {
          const c = textClamp(value);
          return c ? { fontSize: c } : null;
        },
      },
      { type: "any" },
    );

    matchUtilities(
      Object.fromEntries(
        Object.entries(SPACE_PROPS).map(([prefix, toDecls]) => [
          `${prefix}-fluid`,
          (value: string) => {
            const c = spaceClamp(value);
            return c ? toDecls(c) : null;
          },
        ]),
      ),
      { type: "any" },
    );
  });
}

// ─── Convenience export ───────────────────────────────────────────────────────
// For projects that don't need any config — just import and use.

export const fluidPlugin = createFluidPlugin();
