/**
 * plugin.ts
 * Tailwind CSS plugin factory for fluid clamp utilities.
 *
 * Tailwind v4 (CSS-first) — the default export accepts flat options:
 *   @plugin "@basilafro/fluid-clamp";
 *   @plugin "@basilafro/fluid-clamp" { minBreakpoint: 320; maxBreakpoint: 1280; unit: vw; }
 *
 * Tailwind v3 / JS config:
 *   import { createFluidPlugin } from "@basilafro/fluid-clamp";
 *   plugins: [createFluidPlugin({ ... })]
 *
 * Zero-config (uses all defaults):
 *   import { fluidPlugin } from "@basilafro/fluid-clamp";
 *   plugins: [fluidPlugin]
 */

import plugin from "tailwindcss/plugin";
import { fluidClamp, isFluidUnit, FLUID_UNITS, FluidUnit, LengthUnit } from "./fluid";
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
   * unit token (e.g. `text-fluid-[cqw,15,32]`), and using a named breakpoint
   * (e.g. `text-fluid-[15@sm,32@lg]`) automatically selects `vw`.
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
   * Unit for the generated min, max, and intercept length values across every
   * fluid utility (static scales and arbitrary values alike). The fluid unit
   * (vw/cqw/cqh) is separate — this only controls the non-fluid lengths.
   * rem respects user browser font preferences — prefer it over px.
   * @default "rem"
   */
  lengthUnit?: LengthUnit;

  /**
   * Root font size in px, used to convert px sizes to rem. Set this to match
   * your project's root font size when it isn't the browser default. Only
   * affects `rem` output.
   * @default 16
   */
  rootFontSize?: number;

  /**
   * Named breakpoints usable as the breakpoint in arbitrary-value anchors,
   * e.g. `text-fluid-[15@sm,32@lg]` (size 15→32px across the sm→lg range).
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
  lengthUnit: LengthUnit;
  rootFontSize: number;
}

const DEFAULT_BREAKPOINT_RANGE: BreakpointConfig = {
  minBreakpoint: 320,
  maxBreakpoint: 1280,
};

const PLUGIN_DEFAULTS: ResolvedConfig = {
  textBreakpointRange: DEFAULT_BREAKPOINT_RANGE,
  spaceBreakpointRange: DEFAULT_BREAKPOINT_RANGE,
  // vw matches the viewport-based default breakpoints (and the named Tailwind
  // breakpoints). Override per-class with a unit token, e.g. text-fluid-[cqw,15,32].
  textUnit: "vw",
  spaceUnit: "vw",
  lengthUnit: "rem",
  rootFontSize: 16,
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

// ─── Plugin handler ───────────────────────────────────────────────────────────
// The actual plugin body, shared by `createFluidPlugin` (v3 / JS config) and the
// default export (v4 CSS-first `@plugin`). Returns the function that Tailwind
// calls with its plugin API.

/** The function Tailwind calls with its plugin API — same type v3 and v4 accept. */
type PluginHandler = Parameters<typeof plugin>[0];

function createPluginHandler(config: FluidPluginConfig = {}): PluginHandler {
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
    lengthUnit: config.lengthUnit ?? PLUGIN_DEFAULTS.lengthUnit,
    rootFontSize: config.rootFontSize ?? PLUGIN_DEFAULTS.rootFontSize,
  };

  // Length options forwarded to every fluidClamp call (static and arbitrary).
  const lengthOptions = {
    lengthUnit: resolved.lengthUnit,
    rootFontSize: resolved.rootFontSize,
  };

  return function ({ addUtilities, matchUtilities, theme }) {
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
      parseArbitraryValue(
        value,
        resolved.textUnit,
        textBreakpointRange,
        breakpointMap,
        lengthOptions,
      );
    const spaceClamp = (value: string) =>
      parseArbitraryValue(
        value,
        resolved.spaceUnit,
        spaceBreakpointRange,
        breakpointMap,
        lengthOptions,
      );

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
            ...lengthOptions,
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
        ...lengthOptions,
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
  };
}

// ─── Plugin factory (v3 / JS config) ──────────────────────────────────────────

export function createFluidPlugin(config: FluidPluginConfig = {}) {
  return plugin(createPluginHandler(config));
}

// ─── Flat options (v4 CSS-first `@plugin`) ────────────────────────────────────
// Tailwind v4's `@plugin "…" { … }` blocks only carry flat key/value pairs — no
// nested objects — so each breakpoint range is spelled out as two keys. The
// default export accepts these alongside the nested `FluidPluginConfig` keys
// (nested wins), so the same export works from CSS and from a JS config.

export interface FluidPluginCssOptions {
  /** Flat form of `breakpointRange.minBreakpoint` (px number or breakpoint name). */
  minBreakpoint?: number | string;
  /** Flat form of `breakpointRange.maxBreakpoint` (px number or breakpoint name). */
  maxBreakpoint?: number | string;
  /** Flat form of `textBreakpointRange.minBreakpoint`. */
  textMinBreakpoint?: number | string;
  /** Flat form of `textBreakpointRange.maxBreakpoint`. */
  textMaxBreakpoint?: number | string;
  /** Flat form of `spaceBreakpointRange.minBreakpoint`. */
  spaceMinBreakpoint?: number | string;
  /** Flat form of `spaceBreakpointRange.maxBreakpoint`. */
  spaceMaxBreakpoint?: number | string;
  unit?: FluidUnit;
  textUnit?: FluidUnit;
  spaceUnit?: FluidUnit;
  lengthUnit?: LengthUnit;
  rootFontSize?: number;
}

/** Everything the default export accepts: nested config keys + flat CSS keys. */
export type FluidPluginOptions = FluidPluginConfig & FluidPluginCssOptions;

// CSS option values arrive as strings or numbers depending on how Tailwind
// parses the block, so numeric strings ("320") are coerced to numbers here —
// a non-numeric string stays a breakpoint name and resolves later.
function coerceNumeric(value: number | string | undefined) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed !== "" && !isNaN(Number(trimmed)) ? Number(trimmed) : value;
}

// Builds a nested range from a flat endpoint pair; a missing endpoint falls
// back to the built-in default so `{ maxBreakpoint: 1536 }` alone is valid.
function rangeFromFlatEndpoints(
  minBreakpoint: number | string | undefined,
  maxBreakpoint: number | string | undefined,
): BreakpointConfig | undefined {
  if (minBreakpoint === undefined && maxBreakpoint === undefined) return undefined;
  return {
    minBreakpoint:
      coerceNumeric(minBreakpoint) ?? DEFAULT_BREAKPOINT_RANGE.minBreakpoint,
    maxBreakpoint:
      coerceNumeric(maxBreakpoint) ?? DEFAULT_BREAKPOINT_RANGE.maxBreakpoint,
  };
}

// Validates option values that TypeScript can't check when they come from CSS.
// Config errors are loud by design — a typo'd unit should fail the build.
function assertValidUnits(options: FluidPluginOptions) {
  for (const key of ["unit", "textUnit", "spaceUnit"] as const) {
    const value = options[key];
    if (value !== undefined && !isFluidUnit(value)) {
      throw new Error(
        `fluid-clamp: invalid ${key} "${value}" — expected one of ${FLUID_UNITS.join(", ")}.`,
      );
    }
  }
  const { lengthUnit } = options;
  if (lengthUnit !== undefined && lengthUnit !== "rem" && lengthUnit !== "px") {
    throw new Error(
      `fluid-clamp: invalid lengthUnit "${lengthUnit}" — expected rem or px.`,
    );
  }
}

export function normalizeOptions(
  options: FluidPluginOptions = {},
): FluidPluginConfig {
  assertValidUnits(options);
  const rootFontSize = coerceNumeric(options.rootFontSize);
  if (rootFontSize !== undefined && typeof rootFontSize !== "number") {
    throw new Error(
      `fluid-clamp: invalid rootFontSize "${rootFontSize}" — expected a number (px).`,
    );
  }
  return {
    breakpointRange:
      options.breakpointRange ??
      rangeFromFlatEndpoints(options.minBreakpoint, options.maxBreakpoint),
    textBreakpointRange:
      options.textBreakpointRange ??
      rangeFromFlatEndpoints(options.textMinBreakpoint, options.textMaxBreakpoint),
    spaceBreakpointRange:
      options.spaceBreakpointRange ??
      rangeFromFlatEndpoints(options.spaceMinBreakpoint, options.spaceMaxBreakpoint),
    unit: options.unit,
    textUnit: options.textUnit,
    spaceUnit: options.spaceUnit,
    lengthUnit: options.lengthUnit,
    rootFontSize,
    breakpoints: options.breakpoints,
  };
}

// ─── Default export (v4 CSS-first) ────────────────────────────────────────────
// `@plugin "@basilafro/fluid-clamp";` — optionally with a flat options block.
// `plugin.withOptions` is what lets Tailwind v4 pass `@plugin { … }` options in.

const fluidClampPlugin = plugin.withOptions<FluidPluginOptions>(
  (options = {}) => createPluginHandler(normalizeOptions(options)),
);

export default fluidClampPlugin;

// ─── Convenience export ───────────────────────────────────────────────────────
// For projects that don't need any config — just import and use.

export const fluidPlugin = createFluidPlugin();
