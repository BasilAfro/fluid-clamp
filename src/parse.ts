/**
 * parse.ts
 * Pure parsing & breakpoint-resolution helpers, separated from the Tailwind
 * plugin glue so they can be unit-tested directly.
 */

import { fluidClamp, FluidUnit, LengthUnit, isFluidUnit } from "./fluid.js";

// ─── Breakpoint config ────────────────────────────────────────────────────────

export interface BreakpointConfig {
  /**
   * Minimum breakpoint — a px number, or a breakpoint name (a Tailwind screen
   * or a name from the `breakpoints` config), e.g. `"xs"` or `"sm"`.
   */
  minBreakpoint: number | string;
  /**
   * Maximum breakpoint — a px number or a breakpoint name, e.g. `"lg"`.
   */
  maxBreakpoint: number | string;
}

/** Internal: a fully-resolved, numeric breakpoint range. */
export interface NumericBreakpointRange {
  minBreakpoint: number;
  maxBreakpoint: number;
}

// ─── Breakpoint name resolution ───────────────────────────────────────────────
// Builds a { name -> px } map from Tailwind's theme `screens`, then merges the
// plugin's `breakpoints` override on top. Used to resolve names like `sm`/`lg`
// when they appear in breakpoint slots.

export type ThemeFunction = (path: string) => unknown;

// Parses a single theme `screens` value into px.
// Handles "640px", "40rem"/"40em" (× rootFontSize), bare numbers, and the
// object form ({ min, max }) by preferring `min`. Returns NaN if unparseable.
export function parseScreen(value: unknown, rootFontSize = 16): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const match = value.trim().match(/^(-?[\d.]+)(px|rem|em)?$/);
    if (!match) return NaN;
    const numericValue = Number(match[1]);
    if (isNaN(numericValue)) return NaN;
    return match[2] === "rem" || match[2] === "em"
      ? numericValue * rootFontSize
      : numericValue;
  }

  if (value && typeof value === "object") {
    const screenObject = value as Record<string, unknown>;
    if ("min" in screenObject) return parseScreen(screenObject.min, rootFontSize);
    if ("max" in screenObject) return parseScreen(screenObject.max, rootFontSize);
  }

  return NaN;
}

export function resolveBreakpoints(
  theme: ThemeFunction,
  overrides: Record<string, number> = {},
): Record<string, number> {
  const breakpointMap: Record<string, number> = {};

  const screens = theme("screens");
  if (screens && typeof screens === "object") {
    for (const [name, value] of Object.entries(
      screens as Record<string, unknown>,
    )) {
      const pixels = parseScreen(value);
      if (!isNaN(pixels)) breakpointMap[name] = pixels;
    }
  }

  // Plugin-level overrides win over theme screens.
  for (const [name, pixels] of Object.entries(overrides)) {
    if (typeof pixels === "number" && !isNaN(pixels)) breakpointMap[name] = pixels;
  }

  return breakpointMap;
}

// Resolves a config breakpoint range to numbers, turning any breakpoint names
// (e.g. "xs", "lg") into px via the resolved breakpoint map. Throws a clear
// error on an unknown name — config mistakes should be loud, not silent.
export function resolveBreakpointConfig(
  range: BreakpointConfig,
  breakpointMap: Record<string, number>,
  label: string,
): NumericBreakpointRange {
  const resolveEndpoint = (
    value: number | string,
    field: "minBreakpoint" | "maxBreakpoint",
  ): number => {
    if (typeof value === "number") return value;
    if (Object.prototype.hasOwnProperty.call(breakpointMap, value)) {
      return breakpointMap[value];
    }
    throw new Error(
      `createFluidPlugin: unknown breakpoint name "${value}" in ${label}.${field}. ` +
        `Add it to the plugin's \`breakpoints\` option or your tailwind ` +
        `theme.screens, or use a px number.`,
    );
  };
  return {
    minBreakpoint: resolveEndpoint(range.minBreakpoint, "minBreakpoint"),
    maxBreakpoint: resolveEndpoint(range.maxBreakpoint, "maxBreakpoint"),
  };
}

// ─── Arbitrary value parser ───────────────────────────────────────────────────
// Parses the value inside w-fluid-[...] or text-fluid-[...]
//
// Tokens are comma-separated (a space — Tailwind's legacy "_" — also works).
// Two forms (px suffix optional on every number):
//
//   1. Shorthand — two sizes, scaled across the configured breakpoints:
//        text-fluid-[16,24]
//
//   2. Anchors — a size pinned to an explicit breakpoint with `size@breakpoint`:
//        text-fluid-[16@320,24@1280]      explicit breakpoints
//        text-fluid-[16@sm,24@lg]         breakpoint names (theme.screens + config)
//        text-fluid-[16@320-16,24@1280-24] per-anchor inset (effective bp = bp − 16 / − 24)
//
//      The inset (`-N`) is subtracted directly from that breakpoint — use it to
//      account for container padding or sibling elements.
//
//      3+ anchors produce a piecewise ramp: each consecutive pair (sorted by
//      breakpoint) becomes its own two-point clamp, and every pair after the
//      first is scoped behind a `@media (min-width: …)` matching its lower
//      anchor — e.g. text-fluid-[16@sm,24@md,32@lg] clamps sm→md, then
//      overrides with a md→lg clamp from the md breakpoint up. A single
//      clamp() can't do multi-slope ramps, so this is the multi-declaration
//      escape hatch — see `FluidCssValue`.
//
//   Optional bound markers on the bracket edges break the clamp limits and keep
//   the value extrapolating along the same slope. They are POSITIONAL: a leading
//   "<" opens the min-breakpoint end, a trailing ">" opens the max-breakpoint end
//   — e.g. text-fluid-[<16@320,24@1280>]. For 3+ anchors the markers only open
//   the true outer ends (the first pair's floor, the last pair's ceiling); For
//   a shrinking scale the smaller size sits at the max breakpoint, so which
//   size bound each marker opens flips accordingly (see resolveBoundFlags).
//
// The fluid unit is chosen automatically, with this precedence:
//   1. An explicit leading unit token (cqw|cqh|vw) — always wins:
//        text-fluid-[cqw,16,24]   text-fluid-[cqw,16@320,24@1280]
//   2. A named breakpoint ⇒ vw (named breakpoints are viewport screens).
//   3. Otherwise the configured default unit (textUnit/spaceUnit, default vw).

// Strips a trailing "px" suffix and returns the numeric value.
// Returns NaN if the string is not a valid number (with or without px).
// An empty numeric part is NaN, not 0 (Number("") is 0) — so a malformed
// token like "16@-320" (empty breakpoint after the inset split) is rejected.
export function parsePixels(token: string): number {
  const numericPart = token.endsWith("px") ? token.slice(0, -2) : token;
  return numericPart === "" ? NaN : Number(numericPart);
}

export interface ParsedAnchor {
  size: number;
  /** Effective breakpoint in px, after subtracting any inset. */
  breakpoint: number;
  /** Whether the breakpoint was given as a name (a viewport screen). */
  named: boolean;
}

// Parses one `size@breakpoint` or `size@breakpoint-inset` anchor token.
// Returns null if malformed.
export function parseAnchor(
  token: string,
  breakpoints: Record<string, number>,
): ParsedAnchor | null {
  const atIndex = token.indexOf("@");
  if (atIndex < 0) return null;

  const size = parsePixels(token.slice(0, atIndex));
  const afterAt = token.slice(atIndex + 1);

  // A registered breakpoint name is used as-is — names may contain "-"
  // (e.g. "tablet-portrait"), so we check the whole token before treating a
  // trailing "-N" as an inset. When it isn't a name we split on the LAST dash,
  // which lets even a hyphenated name carry an inset (e.g. "tablet-portrait-16").
  let breakpointToken = afterAt;
  let inset = 0;
  if (!Object.prototype.hasOwnProperty.call(breakpoints, afterAt)) {
    const dashIndex = afterAt.lastIndexOf("-");
    if (dashIndex >= 0) {
      inset = parsePixels(afterAt.slice(dashIndex + 1));
      breakpointToken = afterAt.slice(0, dashIndex);
    }
  }

  const named = Object.prototype.hasOwnProperty.call(breakpoints, breakpointToken);
  const breakpoint = named ? breakpoints[breakpointToken] : parsePixels(breakpointToken);

  if (isNaN(size) || isNaN(breakpoint) || isNaN(inset)) return null;

  return { size, breakpoint: breakpoint - inset, named };
}

/** Length-output options forwarded verbatim to fluidClamp. */
export interface LengthOptions {
  lengthUnit?: LengthUnit;
  rootFontSize?: number;
}

/**
 * Result of parsing an arbitrary fluid value. `value` is the declaration
 * active from viewport 0 (or the shorthand/2-anchor range as a whole);
 * `segments` carries any additional piecewise pairs from a 3+ anchor value,
 * each meant to override `value` from its `minBreakpoint` up via a
 * `@media (min-width: …)` block. Empty for the shorthand and 2-anchor forms.
 */
export interface FluidCssValue {
  value: string;
  segments: Array<{ minBreakpoint: number; value: string }>;
}

// Maps the positional bound markers to fluidClamp's size-based flags.
// `<` opens the min-breakpoint end, `>` the max-breakpoint end. fluidClamp's
// floor is the smaller size and its ceiling the larger one: for a growing scale
// the min-breakpoint end IS the floor, but for a shrinking scale
// (minSize > maxSize) the min-breakpoint end is the ceiling, so the two flags
// swap.
function resolveBoundFlags(
  openMinBreakpointEnd: boolean,
  openMaxBreakpointEnd: boolean,
  minSize: number,
  maxSize: number,
): { clampMin: boolean; clampMax: boolean } {
  const growing = minSize <= maxSize;
  const openFloor = growing ? openMinBreakpointEnd : openMaxBreakpointEnd;
  const openCeiling = growing ? openMaxBreakpointEnd : openMinBreakpointEnd;
  return { clampMin: !openFloor, clampMax: !openCeiling };
}

export function parseArbitraryValue(
  value: string,
  fallbackUnit: FluidUnit,
  fallbackRange: NumericBreakpointRange,
  breakpoints: Record<string, number> = {},
  lengthOptions: LengthOptions = {},
): FluidCssValue | null {
  // Optional bound markers on the bracket edges break the clamp limits so the
  // value keeps extrapolating along the same slope. They are POSITIONAL: a
  // leading "<" opens the min-breakpoint end, a trailing ">" opens the
  // max-breakpoint end. Translated to floor/ceiling flags via resolveBoundFlags
  // once the sizes are known (the mapping flips for a shrinking scale).
  // Default: fully clamped.
  let openMinBreakpointEnd = false;
  let openMaxBreakpointEnd = false;
  let body = value;
  if (body.startsWith("<")) {
    openMinBreakpointEnd = true;
    body = body.slice(1);
  }
  if (body.endsWith(">")) {
    openMaxBreakpointEnd = true;
    body = body.slice(0, -1);
  }

  // Tokens are comma-separated (the documented form). A space is also accepted —
  // that's what Tailwind turns the legacy "_" separator into — so both work.
  const parts = body.split(/[\s,]+/);

  // An explicit unit token (cqw|cqh|vw) may lead the value; it always wins.
  let inlineUnit: FluidUnit | null = null;
  if (isFluidUnit(parts[0])) {
    inlineUnit = parts.shift() as FluidUnit;
  }

  const pickUnit = (named: boolean): FluidUnit =>
    inlineUnit ?? (named ? "vw" : fallbackUnit);

  // ── Anchor form: every token carries an explicit `size@breakpoint` ──────────
  if (parts.some((part) => part.includes("@"))) {
    const anchors = parts.map((part) => parseAnchor(part, breakpoints));
    if (anchors.some((anchor) => anchor === null) || anchors.length < 2) return null;

    // Sort ascending by breakpoint so consecutive pairs form the ramp's
    // segments regardless of the order they were written in.
    const sorted = [...(anchors as ParsedAnchor[])].sort(
      (a, b) => a.breakpoint - b.breakpoint,
    );
    const unit = pickUnit(sorted.some((anchor) => anchor.named));

    let base: string | null = null;
    const segments: FluidCssValue["segments"] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const low = sorted[i];
      const high = sorted[i + 1];
      const isFirst = i === 0;
      const isLast = i === sorted.length - 2;

      // Bound markers only open the true outer ends: the first pair's floor
      // and the last pair's ceiling. Interior pairs are always fully clamped
      // — they're bounded by real anchors on both sides, not the bracket edge.
      const { clampMin, clampMax } = resolveBoundFlags(
        isFirst && openMinBreakpointEnd,
        isLast && openMaxBreakpointEnd,
        low.size,
        high.size,
      );

      let clampValue: string;
      try {
        clampValue = fluidClamp({
          minSize: low.size,
          maxSize: high.size,
          minBreakpoint: low.breakpoint,
          maxBreakpoint: high.breakpoint,
          fluidUnit: unit,
          clampMin,
          clampMax,
          ...lengthOptions,
        });
      } catch {
        return null;
      }

      if (isFirst) base = clampValue;
      else segments.push({ minBreakpoint: low.breakpoint, value: clampValue });
    }

    return { value: base as string, segments };
  }

  // ── Shorthand form: exactly two sizes, across the configured breakpoints ────
  if (parts.length !== 2) return null;

  const [minSize, maxSize] = parts.map(parsePixels);
  if (isNaN(minSize) || isNaN(maxSize)) return null;

  const { clampMin, clampMax } = resolveBoundFlags(
    openMinBreakpointEnd,
    openMaxBreakpointEnd,
    minSize,
    maxSize,
  );

  try {
    const clampValue = fluidClamp({
      minSize,
      maxSize,
      minBreakpoint: fallbackRange.minBreakpoint,
      maxBreakpoint: fallbackRange.maxBreakpoint,
      fluidUnit: pickUnit(false),
      clampMin,
      clampMax,
      ...lengthOptions,
    });
    return { value: clampValue, segments: [] };
  } catch {
    return null;
  }
}
