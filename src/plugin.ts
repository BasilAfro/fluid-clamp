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
  /**
   * Minimum breakpoint — a px number, or a breakpoint name (a Tailwind screen
   * or a name from the `breakpoints` config), e.g. `"xs"` or `"sm"`.
   */
  minBp: number | string;
  /**
   * Maximum breakpoint — a px number or a breakpoint name, e.g. `"lg"`.
   */
  maxBp: number | string;
}

/** Internal: a fully-resolved, numeric breakpoint range. */
interface NumericBp {
  minBp: number;
  maxBp: number;
}

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
   * (e.g. `text-fluid-[15_32_sm_lg]`) automatically selects `vw`.
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
  // vw matches the viewport-based default breakpoints (and the named Tailwind
  // breakpoints). Override per-class with a unit token, e.g. text-fluid-[cqw_15_32].
  textUnit: "vw",
  spaceUnit: "vw",
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

// Resolves a config breakpoint range to numbers, turning any breakpoint names
// (e.g. "xs", "lg") into px via the resolved breakpoint map. Throws a clear
// error on an unknown name — config mistakes should be loud, not silent.
function resolveBpConfig(
  bp: BreakpointConfig,
  bpMap: Record<string, number>,
  label: string,
): NumericBp {
  const one = (v: number | string, which: "minBp" | "maxBp"): number => {
    if (typeof v === "number") return v;
    if (Object.prototype.hasOwnProperty.call(bpMap, v)) return bpMap[v];
    throw new Error(
      `createFluidPlugin: unknown breakpoint name "${v}" in ${label}.${which}. ` +
        `Add it to the plugin's \`breakpoints\` option or your tailwind ` +
        `theme.screens, or use a px number.`,
    );
  };
  return { minBp: one(bp.minBp, "minBp"), maxBp: one(bp.maxBp, "maxBp") };
}

// ─── Arbitrary value parser ───────────────────────────────────────────────────
// Parses the value inside w-fluid-[...] or text-fluid-[...]
//
// Two forms (px suffix optional on every number):
//
//   1. Shorthand — two sizes, scaled across the configured breakpoints:
//        text-fluid-[16_24]
//
//   2. Anchors — a size pinned to an explicit breakpoint with `size@bp`:
//        text-fluid-[16@320_24@1280]      explicit breakpoints
//        text-fluid-[16@sm_24@lg]         breakpoint names (theme.screens + config)
//        text-fluid-[16@320-16_24@1280-24] per-anchor inset (effective bp = bp − 16 / − 24)
//
//      The inset (`-N`) is subtracted directly from that breakpoint — use it to
//      account for container padding or sibling elements. (3+ anchors / piecewise
//      ramps are reserved for a future release.)
//
// The fluid unit is chosen automatically, with this precedence:
//   1. An explicit leading unit token (cqw|cqh|vw) — always wins:
//        text-fluid-[cqw_16_24]   text-fluid-[cqw_16@320_24@1280]
//   2. A named breakpoint ⇒ vw (named breakpoints are viewport screens).
//   3. Otherwise the configured default unit (textUnit/spaceUnit, default vw).

// Strips a trailing "px" suffix and returns the numeric value.
// Returns NaN if the string is not a valid number (with or without px).

function stripPx(s: string): number {
  return Number(s.endsWith("px") ? s.slice(0, -2) : s);
}

interface ParsedAnchor {
  size: number;
  /** Effective breakpoint in px, after subtracting any inset. */
  bp: number;
  /** Whether the breakpoint was given as a name (a viewport screen). */
  named: boolean;
}

// Parses one `size@bp` or `size@bp-inset` anchor token. Returns null if malformed.
function parseAnchor(
  token: string,
  breakpoints: Record<string, number>,
): ParsedAnchor | null {
  const at = token.indexOf("@");
  if (at < 0) return null;

  const size = stripPx(token.slice(0, at));
  let bpToken = token.slice(at + 1);

  // Optional inset: `bp-inset` (subtracted directly, no doubling).
  let inset = 0;
  const dash = bpToken.indexOf("-");
  if (dash >= 0) {
    inset = stripPx(bpToken.slice(dash + 1));
    bpToken = bpToken.slice(0, dash);
  }

  const named = Object.prototype.hasOwnProperty.call(breakpoints, bpToken);
  const bp = named ? breakpoints[bpToken] : stripPx(bpToken);

  if (isNaN(size) || isNaN(bp) || isNaN(inset)) return null;

  return { size, bp: bp - inset, named };
}

function parseArbitraryValue(
  value: string,
  fallbackUnit: FluidUnit,
  fallbackBp: NumericBp,
  breakpoints: Record<string, number> = {},
): string | null {
  const parts = value.split(" ");

  // An explicit unit token (cqw|cqh|vw) may lead the value; it always wins.
  let inlineUnit: FluidUnit | null = null;
  if (isFluidUnit(parts[0])) {
    inlineUnit = parts.shift() as FluidUnit;
  }

  const pickUnit = (named: boolean): FluidUnit =>
    inlineUnit ?? (named ? "vw" : fallbackUnit);

  // ── Anchor form: every token carries an explicit `size@bp` ──────────────────
  if (parts.some((p) => p.includes("@"))) {
    const anchors = parts.map((p) => parseAnchor(p, breakpoints));
    if (anchors.some((a) => a === null)) return null;

    // 3+ anchors (piecewise) are not implemented yet — reserved for later.
    if (anchors.length !== 2) return null;

    const [a, b] = anchors as ParsedAnchor[];
    // Order by breakpoint so the smaller bp is the min anchor.
    const [lo, hi] = a.bp <= b.bp ? [a, b] : [b, a];

    try {
      return fluidClamp({
        minSize: lo.size,
        maxSize: hi.size,
        minBp: lo.bp,
        maxBp: hi.bp,
        fluidUnit: pickUnit(a.named || b.named),
      });
    } catch {
      return null;
    }
  }

  // ── Shorthand form: exactly two sizes, across the configured breakpoints ────
  if (parts.length !== 2) return null;

  const [minSize, maxSize] = parts.map(stripPx);
  if (isNaN(minSize) || isNaN(maxSize)) return null;

  try {
    return fluidClamp({
      minSize,
      maxSize,
      minBp: fallbackBp.minBp,
      maxBp: fallbackBp.maxBp,
      fluidUnit: pickUnit(false),
    });
  } catch {
    return null;
  }
}

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
