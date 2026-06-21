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
import { fluidClamp, FluidUnit, isFluidUnit } from "./fluid";
import {
  DEFAULT_TYPE_SCALE,
  DEFAULT_SPACE_SCALE,
  ScaleEntry,
} from "./defaults";

// ─── Breakpoint config ────────────────────────────────────────────────────────

export interface BreakpointConfig {
  /** Minimum breakpoint in px (container or viewport width/height) */
  minBp: number;
  /** Maximum breakpoint in px */
  maxBp: number;
}

// ─── Plugin config ────────────────────────────────────────────────────────────

export interface FluidPluginConfig {
  /**
   * Breakpoints used for text-fluid-* classes.
   * Should reflect your page container or viewport range.
   * @default { minBp: 304, maxBp: 1074 }  (320 - 8px pad, 1098 - 12px pad)
   */
  textBp?: BreakpointConfig;

  /**
   * Breakpoints used for spacing fluid-* classes (padding, margin, gap, size).
   * Should reflect your component/card container range.
   * @default { minBp: 304, maxBp: 1074 }
   */
  spaceBp?: BreakpointConfig;

  /**
   * Default fluid unit for text-fluid-* classes.
   * - "cqw" → needs container-type: inline-size or size on parent (recommended)
   * - "cqh" → needs container-type: size + explicit height on parent
   * - "vw"  → relative to viewport, no container needed
   * @default "cqw"
   */
  textUnit?: FluidUnit;

  /**
   * Default fluid unit for spacing fluid-* classes.
   * @default "cqw"
   */
  spaceUnit?: FluidUnit;

  /**
   * Named breakpoints usable as the min/max bp limits in arbitrary values,
   * e.g. `text-fluid-[15_32_sm_lg]` (size 15→32px across the sm→lg range).
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
  textUnit: "cqw",
  spaceUnit: "cqw",
};

// ─── Breakpoint name resolution ───────────────────────────────────────────────
// Builds a { name -> px } map from Tailwind's theme `screens`, then merges the
// plugin's `breakpoints` override on top. Used to resolve names like `sm`/`lg`
// when they appear in the minBp/maxBp slots of an arbitrary value.

type ThemeFn = (path: string) => unknown;

// Parses a single theme `screens` value into px.
// Handles "640px", "40rem"/"40em" (× rootPx), bare numbers, and the
// object form ({ min, max }) by preferring `min`. Returns NaN if unparseable.
function parseScreen(value: unknown, rootPx = 16): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const match = value.trim().match(/^(-?[\d.]+)(px|rem|em)?$/);
    if (!match) return NaN;
    const n = Number(match[1]);
    if (isNaN(n)) return NaN;
    return match[2] === "rem" || match[2] === "em" ? n * rootPx : n;
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("min" in obj) return parseScreen(obj.min, rootPx);
    if ("max" in obj) return parseScreen(obj.max, rootPx);
  }

  return NaN;
}

function resolveBreakpoints(
  theme: ThemeFn,
  overrides: Record<string, number> = {},
): Record<string, number> {
  const map: Record<string, number> = {};

  const screens = theme("screens");
  if (screens && typeof screens === "object") {
    for (const [name, value] of Object.entries(
      screens as Record<string, unknown>,
    )) {
      const px = parseScreen(value);
      if (!isNaN(px)) map[name] = px;
    }
  }

  // Plugin-level overrides win over theme screens.
  for (const [name, px] of Object.entries(overrides)) {
    if (typeof px === "number" && !isNaN(px)) map[name] = px;
  }

  return map;
}

// ─── Arbitrary value parser ───────────────────────────────────────────────────
// Parses the value inside w-fluid-[...] or text-fluid-[...]
//
// Supported syntaxes (all sizes/pads in px, px suffix optional):
//   [minSize_maxSize]
//   [minSize_maxSize_minBp_maxBp]
//   [minSize_maxSize_minBp_maxBp_minPad_maxPad]
//   [minSize_maxSize_minBp_maxBp_minPad_maxPad_minSubtract_maxSubtract]
//
// The minBp/maxBp slots accept either a px number OR a breakpoint name
// (a Tailwind screen or a name from the `breakpoints` config), e.g.:
//   text-fluid-[15_32_sm_lg]      ← size 15→32px across the sm→lg range
//   text-fluid-[15_32_xs_1280]    ← names and numbers can be mixed
//
// Examples — these are all equivalent:
//   text-fluid-[14_24]
//   text-fluid-[14px_24px]
//   text-fluid-[14_24_304_1074]
//   text-fluid-[14px_24px_304px_1074px]
//
// When minBp/maxBp are omitted, the resolved config breakpoints are used.

// Strips a trailing "px" suffix and returns the numeric value.
// Returns NaN if the string is not a valid number (with or without px).

function stripPx(s: string): number {
  return Number(s.endsWith("px") ? s.slice(0, -2) : s);
}

function parseArbitraryValue(
  value: string,
  fallbackUnit: FluidUnit,
  fallbackBp: BreakpointConfig,
  breakpoints: Record<string, number> = {},
): string | null {
  const parts = value.split(" ");

  let fluidUnit = fallbackUnit;

  if (isFluidUnit(parts[0])) {
    fluidUnit = parts.shift() as FluidUnit;
  }

  // Indices 2 (minBp) and 3 (maxBp) may be breakpoint names; everything else
  // must be a px number.
  const numbers = parts.map((part, i) => {
    if (
      (i === 2 || i === 3) &&
      Object.prototype.hasOwnProperty.call(breakpoints, part)
    ) {
      return breakpoints[part];
    }
    return stripPx(part);
  });

  if (numbers.length < 2 || numbers.some(isNaN)) return null;

  const [
    minSize,
    maxSize,
    minBp,
    maxBp,
    minPadding,
    maxPadding,
    minSubtract,
    maxSubtract,
  ] = numbers;

  try {
    return fluidClamp({
      minSize,
      maxSize,
      minBp: minBp ?? fallbackBp.minBp,
      maxBp: maxBp ?? fallbackBp.maxBp,
      fluidUnit,
      minPadding: minPadding ?? 0,
      maxPadding: maxPadding ?? 0,
      minSubtract: minSubtract ?? 0,
      maxSubtract: maxSubtract ?? 0,
    });
  } catch {
    return null;
  }
}

// ─── Plugin factory ───────────────────────────────────────────────────────────

export function createFluidPlugin(config: FluidPluginConfig = {}) {
  const resolved: ResolvedConfig = {
    textBp: config.textBp ?? PLUGIN_DEFAULTS.textBp,
    spaceBp: config.spaceBp ?? PLUGIN_DEFAULTS.spaceBp,
    textUnit: config.textUnit ?? PLUGIN_DEFAULTS.textUnit,
    spaceUnit: config.spaceUnit ?? PLUGIN_DEFAULTS.spaceUnit,
  };

  return plugin(function ({ addUtilities, matchUtilities, theme }) {
    // Named breakpoints: Tailwind's theme screens + plugin overrides.
    const bpMap = resolveBreakpoints(theme as ThemeFn, config.breakpoints);

    // Bound parsers so arbitrary-value callbacks stay terse.
    const textClamp = (value: string) =>
      parseArbitraryValue(value, resolved.textUnit, resolved.textBp, bpMap);
    const spaceClamp = (value: string) =>
      parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp, bpMap);

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
            ...resolved.textBp,
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
        ...resolved.spaceBp,
      });

      spaceUtilities[`.p-fluid-${key}`] = { padding: c };
      spaceUtilities[`.px-fluid-${key}`] = { paddingLeft: c, paddingRight: c };
      spaceUtilities[`.py-fluid-${key}`] = { paddingTop: c, paddingBottom: c };
      spaceUtilities[`.pt-fluid-${key}`] = { paddingTop: c };
      spaceUtilities[`.pr-fluid-${key}`] = { paddingRight: c };
      spaceUtilities[`.pb-fluid-${key}`] = { paddingBottom: c };
      spaceUtilities[`.pl-fluid-${key}`] = { paddingLeft: c };

      spaceUtilities[`.m-fluid-${key}`] = { margin: c };
      spaceUtilities[`.mx-fluid-${key}`] = { marginLeft: c, marginRight: c };
      spaceUtilities[`.my-fluid-${key}`] = { marginTop: c, marginBottom: c };
      spaceUtilities[`.mt-fluid-${key}`] = { marginTop: c };
      spaceUtilities[`.mr-fluid-${key}`] = { marginRight: c };
      spaceUtilities[`.mb-fluid-${key}`] = { marginBottom: c };
      spaceUtilities[`.ml-fluid-${key}`] = { marginLeft: c };

      spaceUtilities[`.gap-fluid-${key}`] = { gap: c };
      spaceUtilities[`.gap-x-fluid-${key}`] = { columnGap: c };
      spaceUtilities[`.gap-y-fluid-${key}`] = { rowGap: c };

      spaceUtilities[`.w-fluid-${key}`] = { width: c };
      spaceUtilities[`.h-fluid-${key}`] = { height: c };
    }

    addUtilities({ ...typeUtilities, ...spaceUtilities });

    // ── Dynamic arbitrary values ─────────────────────────────────────────────
    // text-fluid-[14_24]
    // text-fluid-[14_24_304_1074]
    // text-fluid-[14_24_140_260_8_12]          ← with padding subtraction
    // text-fluid-[14_24_140_260_8_12_32_40]    ← with padding + sibling subtraction

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
      {
        "p-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { padding: c } : null;
        },
        "px-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { paddingLeft: c, paddingRight: c } : null;
        },
        "py-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { paddingTop: c, paddingBottom: c } : null;
        },
        "pt-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { paddingTop: c } : null;
        },
        "pr-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { paddingRight: c } : null;
        },
        "pb-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { paddingBottom: c } : null;
        },
        "pl-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { paddingLeft: c } : null;
        },

        "m-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { margin: c } : null;
        },
        "mx-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { marginLeft: c, marginRight: c } : null;
        },
        "my-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { marginTop: c, marginBottom: c } : null;
        },
        "mt-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { marginTop: c } : null;
        },
        "mr-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { marginRight: c } : null;
        },
        "mb-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { marginBottom: c } : null;
        },
        "ml-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { marginLeft: c } : null;
        },

        "gap-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { gap: c } : null;
        },
        "gap-x-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { columnGap: c } : null;
        },
        "gap-y-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { rowGap: c } : null;
        },

        "w-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { width: c } : null;
        },
        "h-fluid": (value) => {
          const c = spaceClamp(value);
          return c ? { height: c } : null;
        },
      },
      { type: "any" },
    );
  });
}

// ─── Convenience export ───────────────────────────────────────────────────────
// For projects that don't need any config — just import and use.

export const fluidPlugin = createFluidPlugin();
