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
  ThemeFunction,
  parseArbitraryValue,
  resolveBreakpoints,
  resolveBreakpointConfig,
} from "./parse";

export type { BreakpointConfig } from "./parse";

// ─── Plugin config ────────────────────────────────────────────────────────────

export interface FluidPluginConfig {
  /**
   * Breakpoint range used for all fluid utilities (text and spacing).
   * This is the one knob most projects need — text and spacing usually share
   * the same range. Use `textBreakpointRange`/`spaceBreakpointRange` only to
   * override one of them.
   *
   * `minBreakpoint`/`maxBreakpoint` accept a px number or a breakpoint name (a
   * Tailwind screen or a name from the `breakpoints` option), e.g.
   * `{ minBreakpoint: "xs", maxBreakpoint: "lg" }`.
   * @default { minBreakpoint: 320, maxBreakpoint: 1280 }
   */
  breakpointRange?: BreakpointConfig;

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
   * Override the breakpoint range for text-fluid-* classes only.
   * Falls back to `breakpointRange`, then the default. Use this when text should
   * scale across a different range than spacing (e.g. page/viewport vs component).
   * @default `breakpointRange`
   */
  textBreakpointRange?: BreakpointConfig;

  /**
   * Override the breakpoint range for spacing fluid-* classes only.
   * Falls back to `breakpointRange`, then the default.
   * @default `breakpointRange`
   */
  spaceBreakpointRange?: BreakpointConfig;

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
   * Named breakpoints usable as the breakpoint in arbitrary-value anchors,
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
  textBreakpointRange: BreakpointConfig;
  spaceBreakpointRange: BreakpointConfig;
  textUnit: FluidUnit;
  spaceUnit: FluidUnit;
}

const PLUGIN_DEFAULTS: ResolvedConfig = {
  textBreakpointRange: { minBreakpoint: 320, maxBreakpoint: 1280 },
  spaceBreakpointRange: { minBreakpoint: 320, maxBreakpoint: 1280 },
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

const SPACE_PROPS: Record<string, (clampValue: string) => Record<string, string>> = {
  p: (clampValue) => ({ padding: clampValue }),
  px: (clampValue) => ({ paddingLeft: clampValue, paddingRight: clampValue }),
  py: (clampValue) => ({ paddingTop: clampValue, paddingBottom: clampValue }),
  pt: (clampValue) => ({ paddingTop: clampValue }),
  pr: (clampValue) => ({ paddingRight: clampValue }),
  pb: (clampValue) => ({ paddingBottom: clampValue }),
  pl: (clampValue) => ({ paddingLeft: clampValue }),
  m: (clampValue) => ({ margin: clampValue }),
  mx: (clampValue) => ({ marginLeft: clampValue, marginRight: clampValue }),
  my: (clampValue) => ({ marginTop: clampValue, marginBottom: clampValue }),
  mt: (clampValue) => ({ marginTop: clampValue }),
  mr: (clampValue) => ({ marginRight: clampValue }),
  mb: (clampValue) => ({ marginBottom: clampValue }),
  ml: (clampValue) => ({ marginLeft: clampValue }),
  gap: (clampValue) => ({ gap: clampValue }),
  "gap-x": (clampValue) => ({ columnGap: clampValue }),
  "gap-y": (clampValue) => ({ rowGap: clampValue }),
  w: (clampValue) => ({ width: clampValue }),
  h: (clampValue) => ({ height: clampValue }),
};

// ─── Plugin factory ───────────────────────────────────────────────────────────

export function createFluidPlugin(config: FluidPluginConfig = {}) {
  // Precedence: per-target override → general knob → built-in default.
  const resolved: ResolvedConfig = {
    textBreakpointRange:
      config.textBreakpointRange ??
      config.breakpointRange ??
      PLUGIN_DEFAULTS.textBreakpointRange,
    spaceBreakpointRange:
      config.spaceBreakpointRange ??
      config.breakpointRange ??
      PLUGIN_DEFAULTS.spaceBreakpointRange,
    textUnit: config.textUnit ?? config.unit ?? PLUGIN_DEFAULTS.textUnit,
    spaceUnit: config.spaceUnit ?? config.unit ?? PLUGIN_DEFAULTS.spaceUnit,
  };

  return plugin(function ({ addUtilities, matchUtilities, theme }) {
    // Named breakpoints: Tailwind's theme screens + plugin overrides.
    const breakpointMap = resolveBreakpoints(
      theme as ThemeFunction,
      config.breakpoints,
    );

    // Resolve config breakpoints (which may use names like "xs"/"lg") to px.
    const textBreakpointRange = resolveBreakpointConfig(
      resolved.textBreakpointRange,
      breakpointMap,
      "textBreakpointRange",
    );
    const spaceBreakpointRange = resolveBreakpointConfig(
      resolved.spaceBreakpointRange,
      breakpointMap,
      "spaceBreakpointRange",
    );

    // Bound parsers so arbitrary-value callbacks stay terse.
    const textClamp = (value: string) =>
      parseArbitraryValue(value, resolved.textUnit, textBreakpointRange, breakpointMap);
    const spaceClamp = (value: string) =>
      parseArbitraryValue(value, resolved.spaceUnit, spaceBreakpointRange, breakpointMap);

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
            ...textBreakpointRange,
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
      const clampValue = fluidClamp({
        minSize,
        maxSize,
        fluidUnit: resolved.spaceUnit,
        ...spaceBreakpointRange,
      });

      for (const [prefix, toDeclarations] of Object.entries(SPACE_PROPS)) {
        spaceUtilities[`.${prefix}-fluid-${key}`] = toDeclarations(clampValue);
      }
    }

    addUtilities({ ...typeUtilities, ...spaceUtilities });

    // ── Dynamic arbitrary values (comma-separated; "_" also works) ───────────
    // text-fluid-[16,24]                ← shorthand: two sizes, config breakpoints
    // text-fluid-[16@320,24@1280]       ← anchors: size pinned to explicit bp
    // text-fluid-[16@sm,24@lg]          ← anchors with breakpoint names
    // text-fluid-[16@320-16,24@1280-24] ← per-anchor inset (effective bp = bp − N)
    // text-fluid-[cqw,16,24]            ← leading unit token (overrides the default)
    // text-fluid-[<16@320,24@1280>]     ← break bounds (< opens floor, > opens ceiling)

    matchUtilities(
      {
        "text-fluid": (value) => {
          const clampValue = textClamp(value);
          return clampValue ? { fontSize: clampValue } : null;
        },
      },
      { type: "any" },
    );

    matchUtilities(
      Object.fromEntries(
        Object.entries(SPACE_PROPS).map(([prefix, toDeclarations]) => [
          `${prefix}-fluid`,
          (value: string) => {
            const clampValue = spaceClamp(value);
            return clampValue ? toDeclarations(clampValue) : null;
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
