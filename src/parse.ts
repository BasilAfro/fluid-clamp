/**
 * parse.ts
 * Pure parsing & breakpoint-resolution helpers, separated from the Tailwind
 * plugin glue so they can be unit-tested directly.
 */

import { fluidClamp, FluidUnit, isFluidUnit } from "./fluid";

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
export interface NumericBp {
  minBp: number;
  maxBp: number;
}

// ─── Breakpoint name resolution ───────────────────────────────────────────────
// Builds a { name -> px } map from Tailwind's theme `screens`, then merges the
// plugin's `breakpoints` override on top. Used to resolve names like `sm`/`lg`
// when they appear in breakpoint slots.

export type ThemeFn = (path: string) => unknown;

// Parses a single theme `screens` value into px.
// Handles "640px", "40rem"/"40em" (× rootPx), bare numbers, and the
// object form ({ min, max }) by preferring `min`. Returns NaN if unparseable.
export function parseScreen(value: unknown, rootPx = 16): number {
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

export function resolveBreakpoints(
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
export function resolveBpConfig(
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
export function stripPx(s: string): number {
  return Number(s.endsWith("px") ? s.slice(0, -2) : s);
}

export interface ParsedAnchor {
  size: number;
  /** Effective breakpoint in px, after subtracting any inset. */
  bp: number;
  /** Whether the breakpoint was given as a name (a viewport screen). */
  named: boolean;
}

// Parses one `size@bp` or `size@bp-inset` anchor token. Returns null if malformed.
export function parseAnchor(
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

export function parseArbitraryValue(
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
