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

import plugin from "tailwindcss/plugin.js";
import { fluidClamp, isFluidUnit, FLUID_UNITS, FluidUnit, LengthUnit } from "./fluid.js";
import { DEFAULT_TYPE_SCALE, DEFAULT_SPACE_SCALE } from "./defaults.js";
import {
  BreakpointConfig,
  FluidCssValue,
  ThemeFunction,
  parseArbitraryValue,
  resolveBreakpoints,
  resolveBreakpointConfig,
} from "./parse.js";
import { CssApi, Declarations, COMPOSITE_PROPS } from "./composite.js";

export type { BreakpointConfig } from "./parse.js";

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

  /**
   * Fluid CSS custom properties, emitted as `:root` overrides — handy for
   * overriding Tailwind's own scale variables (`--text-xs`, etc.) or any
   * global design token across breakpoints, instead of (or alongside) using
   * `text-fluid-*`/`*-fluid-*` utility classes directly.
   *
   * Each key becomes `--${key}`; each value is the exact same arbitrary-value
   * anchor syntax as `text-fluid-[...]` (minus the brackets) — shorthand,
   * anchors, named breakpoints, insets, the unit token, and bound markers all
   * work the same way. 3+ anchors produce a piecewise ramp: the value below
   * the first extra anchor, then a `@media (min-width: …)` override per
   * segment after that.
   *
   * Resolved against the same `textUnit`/`textBreakpointRange` as
   * `text-fluid-*` (i.e. shorthand values like `"10,12"` scale across
   * `textBreakpointRange`, not `spaceBreakpointRange`).
   *
   * @example
   * fluidVars: {
   *   "text-xs": "10@390,11@768,12@1280",
   *   "text-sm": "11@390,12@768,14@1280",
   * }
   * // → :root { --text-xs: clamp(...); } plus stacked @media overrides
   *
   * @default {}
   */
  fluidVars?: Record<string, string>;

  /**
   * Which Tailwind major version's internal formula to use for the
   * *composite* utilities (`translate-x/y`, `blur`, `backdrop-blur`, `ring`,
   * `ring-offset`, `space-x/y`, `divide-x/y`) — the ones that compose into a
   * shared property (`transform`/`translate`, `filter`, `box-shadow`) or a
   * child selector instead of setting a plain CSS property directly. v3 and
   * v4 compose these differently, so picking the wrong one means the fluid
   * utility won't stack correctly with Tailwind's own `rotate-*`/`scale-*`,
   * other filter utilities, `ring-color`, etc. on the same element.
   *
   * Defaults to `"v3"` from `createFluidPlugin` and `"v4"` from the default
   * `@plugin`/CSS-first export — the choice that matches each entry point's
   * usual Tailwind version. Override this explicitly if that assumption
   * doesn't hold for your setup, e.g. a Tailwind v4 project that still runs
   * plugins through v4's legacy JS-config compat mode (where other utilities
   * may still compose the v3 way) — pass `cssApi: "v3"` to `createFluidPlugin`
   * in that case, or vice versa.
   * @default "v3" from `createFluidPlugin`, "v4" from the default export
   */
  cssApi?: CssApi;
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
  "min-w": (clampValue) => ({ minWidth: clampValue }),
  "max-w": (clampValue) => ({ maxWidth: clampValue }),
  "min-h": (clampValue) => ({ minHeight: clampValue }),
  "max-h": (clampValue) => ({ maxHeight: clampValue }),
  size: (clampValue) => ({ width: clampValue, height: clampValue }),
  top: (clampValue) => ({ top: clampValue }),
  right: (clampValue) => ({ right: clampValue }),
  bottom: (clampValue) => ({ bottom: clampValue }),
  left: (clampValue) => ({ left: clampValue }),
  inset: (clampValue) => ({ inset: clampValue }),
  "inset-x": (clampValue) => ({ left: clampValue, right: clampValue }),
  "inset-y": (clampValue) => ({ top: clampValue, bottom: clampValue }),
  start: (clampValue) => ({ insetInlineStart: clampValue }),
  end: (clampValue) => ({ insetInlineEnd: clampValue }),
  basis: (clampValue) => ({ flexBasis: clampValue }),
  "scroll-m": (clampValue) => ({ scrollMargin: clampValue }),
  "scroll-mx": (clampValue) => ({
    scrollMarginLeft: clampValue,
    scrollMarginRight: clampValue,
  }),
  "scroll-my": (clampValue) => ({
    scrollMarginTop: clampValue,
    scrollMarginBottom: clampValue,
  }),
  "scroll-mt": (clampValue) => ({ scrollMarginTop: clampValue }),
  "scroll-mr": (clampValue) => ({ scrollMarginRight: clampValue }),
  "scroll-mb": (clampValue) => ({ scrollMarginBottom: clampValue }),
  "scroll-ml": (clampValue) => ({ scrollMarginLeft: clampValue }),
  "scroll-p": (clampValue) => ({ scrollPadding: clampValue }),
  "scroll-px": (clampValue) => ({
    scrollPaddingLeft: clampValue,
    scrollPaddingRight: clampValue,
  }),
  "scroll-py": (clampValue) => ({
    scrollPaddingTop: clampValue,
    scrollPaddingBottom: clampValue,
  }),
  "scroll-pt": (clampValue) => ({ scrollPaddingTop: clampValue }),
  "scroll-pr": (clampValue) => ({ scrollPaddingRight: clampValue }),
  "scroll-pb": (clampValue) => ({ scrollPaddingBottom: clampValue }),
  "scroll-pl": (clampValue) => ({ scrollPaddingLeft: clampValue }),
};

// ─── Arbitrary-only prefixes ───────────────────────────────────────────────────
// These prefixes don't get a static default scale (v1 decision — their px
// ranges differ too much from the space scale to reuse it, and inventing a
// curated scale per category is deferred). They still get full arbitrary-value
// support via `${prefix}-fluid-[…]`, bound to the same `spaceClamp` resolver
// as `SPACE_PROPS` (same breakpoint range/unit as spacing).

const TYPOGRAPHY_PROPS: Record<string, (clampValue: string) => Record<string, string>> = {
  leading: (clampValue) => ({ lineHeight: clampValue }),
  tracking: (clampValue) => ({ letterSpacing: clampValue }),
  indent: (clampValue) => ({ textIndent: clampValue }),
};

const BORDER_PROPS: Record<string, (clampValue: string) => Record<string, string>> = {
  border: (clampValue) => ({ borderWidth: clampValue }),
  "border-t": (clampValue) => ({ borderTopWidth: clampValue }),
  "border-r": (clampValue) => ({ borderRightWidth: clampValue }),
  "border-b": (clampValue) => ({ borderBottomWidth: clampValue }),
  "border-l": (clampValue) => ({ borderLeftWidth: clampValue }),
  outline: (clampValue) => ({ outlineWidth: clampValue }),
  "outline-offset": (clampValue) => ({ outlineOffset: clampValue }),
};

const RADIUS_PROPS: Record<string, (clampValue: string) => Record<string, string>> = {
  rounded: (clampValue) => ({ borderRadius: clampValue }),
  "rounded-t": (clampValue) => ({
    borderTopLeftRadius: clampValue,
    borderTopRightRadius: clampValue,
  }),
  "rounded-r": (clampValue) => ({
    borderTopRightRadius: clampValue,
    borderBottomRightRadius: clampValue,
  }),
  "rounded-b": (clampValue) => ({
    borderBottomRightRadius: clampValue,
    borderBottomLeftRadius: clampValue,
  }),
  "rounded-l": (clampValue) => ({
    borderTopLeftRadius: clampValue,
    borderBottomLeftRadius: clampValue,
  }),
  "rounded-tl": (clampValue) => ({ borderTopLeftRadius: clampValue }),
  "rounded-tr": (clampValue) => ({ borderTopRightRadius: clampValue }),
  "rounded-br": (clampValue) => ({ borderBottomRightRadius: clampValue }),
  "rounded-bl": (clampValue) => ({ borderBottomLeftRadius: clampValue }),
};

// `perspective` has no native utility root in Tailwind v3 at all (verified
// against real compiled v3.4.19 output — `perspective-500`/`perspective-[…]`
// produce no CSS), so making it fluid there would invent a utility Tailwind
// itself doesn't have. Tailwind v4 does ship a native arbitrary-value-only
// `perspective-[…]` utility, so this is registered for v4 only — see the
// `cssApi === "v4"` guard around its `matchUtilities` call below.
const MISC_PROPS: Record<string, (clampValue: string) => Record<string, string>> = {
  perspective: (clampValue) => ({ perspective: clampValue }),
};

// Arbitrary-only tables, merged for a single matchUtilities registration loop.
// MISC_PROPS is intentionally excluded — it's registered separately, gated to
// v4 only (see above).
const ARBITRARY_ONLY_PROPS = {
  ...TYPOGRAPHY_PROPS,
  ...BORDER_PROPS,
  ...RADIUS_PROPS,
};

// ─── Piecewise declaration builder ────────────────────────────────────────────
// Translates a parsed fluid value into what a `matchUtilities` callback
// returns. A shorthand/2-anchor value is just the base declarations; a 3+
// anchor value additionally nests a `@media (min-width: …)` block per extra
// segment, so a single class compiles to one selector with stacked overrides
// instead of a single clamp() — the same shape as manually chaining media
// queries, but generated from one arbitrary-value bracket.

// Nested-at-rule-friendly declaration shape (matches Tailwind's own
// CSSRuleObject structurally — that type isn't exported, so this is a minimal
// local stand-in just for the media-query nesting this helper introduces).
interface NestedDeclarations {
  [key: string]: string | NestedDeclarations;
}

function buildDeclarations(
  parsed: FluidCssValue,
  toDeclarations: (clampValue: string) => Declarations,
): NestedDeclarations {
  const declarations: NestedDeclarations = toDeclarations(parsed.value);
  for (const segment of parsed.segments) {
    declarations[`@media (min-width: ${segment.minBreakpoint}px)`] = toDeclarations(
      segment.value,
    );
  }
  return declarations;
}

// ─── Plugin handler ───────────────────────────────────────────────────────────
// The actual plugin body, shared by `createFluidPlugin` (v3 / JS config) and the
// default export (v4 CSS-first `@plugin`). Returns the function that Tailwind
// calls with its plugin API.

/** The function Tailwind calls with its plugin API — same type v3 and v4 accept. */
type PluginHandler = Parameters<typeof plugin>[0];

function createPluginHandler(
  config: FluidPluginConfig = {},
  defaultCssApi: CssApi = "v3",
): PluginHandler {
  // `config.cssApi` (an explicit override) wins over the entry point's usual
  // default — see the `cssApi` doc comment on `FluidPluginConfig` for when
  // that override is needed (e.g. Tailwind v4's legacy JS-config compat mode).
  const cssApi = config.cssApi ?? defaultCssApi;

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

  return function ({ addUtilities, matchUtilities, addBase, theme }) {
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
          const parsed = textClamp(value);
          return parsed ? buildDeclarations(parsed, (v) => ({ fontSize: v })) : null;
        },
      },
      { type: "any" },
    );

    matchUtilities(
      Object.fromEntries(
        Object.entries(SPACE_PROPS).map(([prefix, toDeclarations]) => [
          `${prefix}-fluid`,
          (value: string) => {
            const parsed = spaceClamp(value);
            return parsed ? buildDeclarations(parsed, toDeclarations) : null;
          },
        ]),
      ),
      { type: "any" },
    );

    // ── Arbitrary-only prefixes (no static scale in v1) ─────────────────────
    // typography, border/outline width, border-radius — all plain
    // (or dual/quad-declaration) properties, bound to the space breakpoint
    // range/unit like everything else above.

    matchUtilities(
      Object.fromEntries(
        Object.entries(ARBITRARY_ONLY_PROPS).map(([prefix, toDeclarations]) => [
          `${prefix}-fluid`,
          (value: string) => {
            const parsed = spaceClamp(value);
            return parsed ? buildDeclarations(parsed, toDeclarations) : null;
          },
        ]),
      ),
      { type: "any" },
    );

    // ── v4-only prefixes ──────────────────────────────────────────────────────
    // perspective — see the comment on MISC_PROPS for why this doesn't extend
    // to v3.

    if (cssApi === "v4") {
      matchUtilities(
        Object.fromEntries(
          Object.entries(MISC_PROPS).map(([prefix, toDeclarations]) => [
            `${prefix}-fluid`,
            (value: string) => {
              const parsed = spaceClamp(value);
              return parsed ? buildDeclarations(parsed, toDeclarations) : null;
            },
          ]),
        ),
        { type: "any" },
      );
    }

    // ── Composite prefixes (translate-x/y, blur, ring, space-x/y, divide-x/y) ─
    // These compose into a shared property/selector via Tailwind's own internal
    // CSS variables, which differ between v3 and v4 — see composite.ts.

    matchUtilities(
      Object.fromEntries(
        Object.entries(COMPOSITE_PROPS).map(([prefix, toDeclarations]) => [
          `${prefix}-fluid`,
          (value: string) => {
            const parsed = spaceClamp(value);
            return parsed
              ? buildDeclarations(parsed, (v) => toDeclarations(cssApi, v))
              : null;
          },
        ]),
      ),
      { type: "any" },
    );

    // ── Fluid CSS variables (:root overrides, optionally piecewise) ─────────
    // Reuses the exact same anchor grammar as text-fluid-[...] — a config
    // value is parsed exactly like an arbitrary utility value, and its base
    // value/segments become a :root declaration plus one @media override per
    // extra anchor. Config errors are loud: an unparsable value throws at
    // build time rather than silently emitting no override.

    if (config.fluidVars) {
      for (const [name, rawValue] of Object.entries(config.fluidVars)) {
        const parsed = textClamp(rawValue);
        if (!parsed) {
          throw new Error(
            `fluid-clamp: invalid fluidVars["${name}"] value "${rawValue}".`,
          );
        }

        const varName = `--${name}`;
        addBase({ ":root": { [varName]: parsed.value } });

        for (const segment of parsed.segments) {
          addBase({
            [`@media (min-width: ${segment.minBreakpoint}px)`]: {
              ":root": { [varName]: segment.value },
            },
          });
        }
      }
    }
  };
}

// ─── Plugin factory (v3 / JS config) ──────────────────────────────────────────

export function createFluidPlugin(config: FluidPluginConfig = {}) {
  return plugin(createPluginHandler(config, "v3"));
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
  cssApi?: CssApi;
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
  const { cssApi } = options;
  if (cssApi !== undefined && cssApi !== "v3" && cssApi !== "v4") {
    throw new Error(`fluid-clamp: invalid cssApi "${cssApi}" — expected v3 or v4.`);
  }
}

// The flat-only keys — the ones `normalizeOptions` consumes to build nested
// config and must NOT pass through to `FluidPluginConfig`. Typed as a full
// `Record` of `FluidPluginCssOptions`-minus-shared-keys so adding a flat option
// without listing it here is a type error rather than a silent leak.
const FLAT_ONLY_KEYS: Record<
  Exclude<keyof FluidPluginCssOptions, keyof FluidPluginConfig>,
  true
> = {
  minBreakpoint: true,
  maxBreakpoint: true,
  textMinBreakpoint: true,
  textMaxBreakpoint: true,
  spaceMinBreakpoint: true,
  spaceMaxBreakpoint: true,
};

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

  // Every nested `FluidPluginConfig` key passes through untouched by default —
  // only the keys derived from the flat CSS form are computed below. Spreading
  // rather than re-listing each key is deliberate: an allow-list has to be
  // updated for every new config option, and missing one silently drops that
  // option on this entry point only (which is how `fluidVars` was lost from
  // the default export while working fine through `createFluidPlugin`).
  const passthrough = { ...options } as Record<string, unknown>;
  for (const key of Object.keys(FLAT_ONLY_KEYS)) delete passthrough[key];
  const config = passthrough as FluidPluginConfig;

  return {
    ...config,
    breakpointRange:
      options.breakpointRange ??
      rangeFromFlatEndpoints(options.minBreakpoint, options.maxBreakpoint),
    textBreakpointRange:
      options.textBreakpointRange ??
      rangeFromFlatEndpoints(options.textMinBreakpoint, options.textMaxBreakpoint),
    spaceBreakpointRange:
      options.spaceBreakpointRange ??
      rangeFromFlatEndpoints(options.spaceMinBreakpoint, options.spaceMaxBreakpoint),
    rootFontSize,
  };
}

// ─── Default export (v4 CSS-first) ────────────────────────────────────────────
// `@plugin "@basilafro/fluid-clamp";` — optionally with a flat options block.
// `plugin.withOptions` is what lets Tailwind v4 pass `@plugin { … }` options in.

const fluidClampPlugin = plugin.withOptions<FluidPluginOptions>(
  (options = {}) => createPluginHandler(normalizeOptions(options), "v4"),
);

export default fluidClampPlugin;

// ─── Convenience export ───────────────────────────────────────────────────────
// For projects that don't need any config — just import and use.

export const fluidPlugin = createFluidPlugin();
