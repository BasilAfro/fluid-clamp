/**
 * plugin.ts
 * Tailwind CSS plugin factory for fluid clamp utilities.
 *
 * Usage in tailwind.config.ts:
 *   import { createFluidPlugin } from "@BasilAfro/fluid-clamp";
 *   plugins: [createFluidPlugin({ ... })]
 *
 * Zero-config (uses all defaults):
 *   import { fluidPlugin } from "@BasilAfro/fluid-clamp";
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

// ─── Arbitrary value parser ───────────────────────────────────────────────────
// Parses the value inside w-fluid-[...] or text-fluid-[...]
//
// Supported syntaxes (all values in px, px suffix optional):
//   [minSize_maxSize]
//   [minSize_maxSize_minBp_maxBp]
//   [minSize_maxSize_minBp_maxBp_minPad_maxPad]
//   [minSize_maxSize_minBp_maxBp_minPad_maxPad_minSubtract_maxSubtract]
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
): string | null {
  const parts = value.split(" ");

  let fluidUnit = fallbackUnit;

  if (isFluidUnit(parts[0])) {
    fluidUnit = parts.shift() as FluidUnit;
  }

  const numbers = parts.map(stripPx);

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

  return plugin(function ({ addUtilities, matchUtilities }) {
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
          const c = parseArbitraryValue(
            value,
            resolved.textUnit,
            resolved.textBp,
          );
          return c ? { fontSize: c } : null;
        },
      },
      { type: "any" },
    );

    matchUtilities(
      {
        "p-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { padding: c } : null;
        },
        "px-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { paddingLeft: c, paddingRight: c } : null;
        },
        "py-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { paddingTop: c, paddingBottom: c } : null;
        },
        "pt-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { paddingTop: c } : null;
        },
        "pr-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { paddingRight: c } : null;
        },
        "pb-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { paddingBottom: c } : null;
        },
        "pl-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { paddingLeft: c } : null;
        },

        "m-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { margin: c } : null;
        },
        "mx-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { marginLeft: c, marginRight: c } : null;
        },
        "my-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { marginTop: c, marginBottom: c } : null;
        },
        "mt-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { marginTop: c } : null;
        },
        "mr-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { marginRight: c } : null;
        },
        "mb-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { marginBottom: c } : null;
        },
        "ml-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { marginLeft: c } : null;
        },

        "gap-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { gap: c } : null;
        },
        "gap-x-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { columnGap: c } : null;
        },
        "gap-y-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { rowGap: c } : null;
        },

        "w-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
          return c ? { width: c } : null;
        },
        "h-fluid": (value) => {
          const c = parseArbitraryValue(
            value,
            resolved.spaceUnit,
            resolved.spaceBp,
          );
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
