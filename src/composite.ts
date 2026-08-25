/**
 * composite.ts
 * Declaration builders for fluid utilities that don't map to a single plain
 * CSS property in Tailwind — they compose into a shared property (`transform`
 * /`translate`, `filter`, `box-shadow`) via Tailwind's own internal CSS
 * variables, or apply to a child selector (`space-x/y`, `divide-x/y`).
 *
 * The exact variable names, `var()` fallback syntax, and selectors differ
 * between Tailwind v3 and v4 (verified against real compiled output from
 * both), so every builder here takes the resolved `cssApi` and picks the
 * matching formula — this keeps the new utilities composable with native
 * Tailwind utilities of the same family (e.g. `translate-x-fluid-4` +
 * `rotate-45` still both apply) instead of silently overwriting them.
 */

export type CssApi = "v3" | "v4";

export type Declarations = Record<string, string | Record<string, string>>;

const V3_TRANSFORM =
  "translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))";
const V4_TRANSLATE = "var(--tw-translate-x) var(--tw-translate-y)";

export function translateXDeclarations(cssApi: CssApi, clampValue: string): Declarations {
  return cssApi === "v4"
    ? { "--tw-translate-x": clampValue, translate: V4_TRANSLATE }
    : { "--tw-translate-x": clampValue, transform: V3_TRANSFORM };
}

export function translateYDeclarations(cssApi: CssApi, clampValue: string): Declarations {
  return cssApi === "v4"
    ? { "--tw-translate-y": clampValue, translate: V4_TRANSLATE }
    : { "--tw-translate-y": clampValue, transform: V3_TRANSFORM };
}

const V3_FILTER_CHAIN =
  "var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)";
const V4_FILTER_CHAIN =
  "var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)";

export function blurDeclarations(cssApi: CssApi, clampValue: string): Declarations {
  return {
    "--tw-blur": `blur(${clampValue})`,
    filter: cssApi === "v4" ? V4_FILTER_CHAIN : V3_FILTER_CHAIN,
  };
}

const V3_BACKDROP_FILTER_CHAIN =
  "var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)";
const V4_BACKDROP_FILTER_CHAIN =
  "var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,)";

export function backdropBlurDeclarations(cssApi: CssApi, clampValue: string): Declarations {
  const chain = cssApi === "v4" ? V4_BACKDROP_FILTER_CHAIN : V3_BACKDROP_FILTER_CHAIN;
  return {
    "--tw-backdrop-blur": `blur(${clampValue})`,
    WebkitBackdropFilter: chain,
    backdropFilter: chain,
  };
}

export function ringWidthDeclarations(cssApi: CssApi, clampValue: string): Declarations {
  if (cssApi === "v4") {
    return {
      "--tw-ring-shadow": `var(--tw-ring-inset,) 0 0 0 calc(${clampValue} + var(--tw-ring-offset-width)) var(--tw-ring-color, currentcolor)`,
      boxShadow:
        "var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)",
    };
  }
  return {
    "--tw-ring-offset-shadow":
      "var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)",
    "--tw-ring-shadow": `var(--tw-ring-inset) 0 0 0 calc(${clampValue} + var(--tw-ring-offset-width)) var(--tw-ring-color)`,
    boxShadow: "var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000)",
  };
}

export function ringOffsetDeclarations(cssApi: CssApi, clampValue: string): Declarations {
  const declarations: Declarations = { "--tw-ring-offset-width": clampValue };
  if (cssApi === "v4") {
    declarations["--tw-ring-offset-shadow"] =
      "var(--tw-ring-inset,) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)";
  }
  return declarations;
}

// space-x/y and divide-x/y apply to a child selector rather than the element
// itself — v3 targets adjacent non-hidden siblings, v4 targets all children
// but the last (both are Tailwind's own real selectors for these utilities).
function childSelector(cssApi: CssApi): string {
  return cssApi === "v4" ? ":where(& > :not(:last-child))" : "> :not([hidden]) ~ :not([hidden])";
}

export function spaceXDeclarations(cssApi: CssApi, clampValue: string): Declarations {
  const inner: Record<string, string> =
    cssApi === "v4"
      ? {
          "--tw-space-x-reverse": "0",
          marginInlineStart: `calc(${clampValue} * var(--tw-space-x-reverse))`,
          marginInlineEnd: `calc(${clampValue} * calc(1 - var(--tw-space-x-reverse)))`,
        }
      : {
          "--tw-space-x-reverse": "0",
          marginRight: `calc(${clampValue} * var(--tw-space-x-reverse))`,
          marginLeft: `calc(${clampValue} * calc(1 - var(--tw-space-x-reverse)))`,
        };
  return { [childSelector(cssApi)]: inner };
}

export function spaceYDeclarations(cssApi: CssApi, clampValue: string): Declarations {
  const inner: Record<string, string> =
    cssApi === "v4"
      ? {
          "--tw-space-y-reverse": "0",
          marginBlockStart: `calc(${clampValue} * var(--tw-space-y-reverse))`,
          marginBlockEnd: `calc(${clampValue} * calc(1 - var(--tw-space-y-reverse)))`,
        }
      : {
          "--tw-space-y-reverse": "0",
          marginTop: `calc(${clampValue} * calc(1 - var(--tw-space-y-reverse)))`,
          marginBottom: `calc(${clampValue} * var(--tw-space-y-reverse))`,
        };
  return { [childSelector(cssApi)]: inner };
}

export function divideXDeclarations(cssApi: CssApi, clampValue: string): Declarations {
  const inner: Record<string, string> =
    cssApi === "v4"
      ? {
          "--tw-divide-x-reverse": "0",
          borderInlineStyle: "var(--tw-border-style)",
          borderInlineStartWidth: `calc(${clampValue} * var(--tw-divide-x-reverse))`,
          borderInlineEndWidth: `calc(${clampValue} * calc(1 - var(--tw-divide-x-reverse)))`,
        }
      : {
          "--tw-divide-x-reverse": "0",
          borderRightWidth: `calc(${clampValue} * var(--tw-divide-x-reverse))`,
          borderLeftWidth: `calc(${clampValue} * calc(1 - var(--tw-divide-x-reverse)))`,
        };
  return { [childSelector(cssApi)]: inner };
}

export function divideYDeclarations(cssApi: CssApi, clampValue: string): Declarations {
  const inner: Record<string, string> =
    cssApi === "v4"
      ? {
          "--tw-divide-y-reverse": "0",
          borderBottomStyle: "var(--tw-border-style)",
          borderTopStyle: "var(--tw-border-style)",
          borderTopWidth: `calc(${clampValue} * var(--tw-divide-y-reverse))`,
          borderBottomWidth: `calc(${clampValue} * calc(1 - var(--tw-divide-y-reverse)))`,
        }
      : {
          "--tw-divide-y-reverse": "0",
          borderTopWidth: `calc(${clampValue} * calc(1 - var(--tw-divide-y-reverse)))`,
          borderBottomWidth: `calc(${clampValue} * var(--tw-divide-y-reverse))`,
        };
  return { [childSelector(cssApi)]: inner };
}

// Single source of truth for the composite prefixes, mirroring the shape of
// `SPACE_PROPS` in plugin.ts but parameterized on `cssApi` since these need a
// different formula per Tailwind major version.
export const COMPOSITE_PROPS: Record<
  string,
  (cssApi: CssApi, clampValue: string) => Declarations
> = {
  "translate-x": translateXDeclarations,
  "translate-y": translateYDeclarations,
  blur: blurDeclarations,
  "backdrop-blur": backdropBlurDeclarations,
  ring: ringWidthDeclarations,
  "ring-offset": ringOffsetDeclarations,
  "space-x": spaceXDeclarations,
  "space-y": spaceYDeclarations,
  "divide-x": divideXDeclarations,
  "divide-y": divideYDeclarations,
};
