/**
 * index.ts
 * Public API of the fluid-clamp package.
 */

export { fluidClamp, isFluidUnit } from "./fluid.js";
export type { FluidClampOptions, FluidUnit, LengthUnit } from "./fluid.js";

// Default export: the Tailwind v4 CSS-first entry point —
// `@plugin "@basilafro/fluid-clamp";` (optionally with a flat options block).
// Also usable from a JS config: `plugins: [fluidClampPlugin({ minBreakpoint: 320 })]`.
export { default } from "./plugin.js";

export { createFluidPlugin, fluidPlugin, normalizeOptions } from "./plugin.js";
export type {
  FluidPluginConfig,
  FluidPluginCssOptions,
  FluidPluginOptions,
  BreakpointConfig,
} from "./plugin.js";

// `cssApi` is a public config option, so its type has to be nameable by
// consumers writing a typed config object.
export type { CssApi } from "./composite.js";

export { DEFAULT_TYPE_SCALE, DEFAULT_SPACE_SCALE } from "./defaults.js";
export type { ScaleEntry } from "./defaults.js";
