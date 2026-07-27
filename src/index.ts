/**
 * index.ts
 * Public API of the fluid-clamp package.
 */

export { fluidClamp, isFluidUnit } from "./fluid";
export type { FluidClampOptions, FluidUnit, LengthUnit } from "./fluid";

// Default export: the Tailwind v4 CSS-first entry point —
// `@plugin "@basilafro/fluid-clamp";` (optionally with a flat options block).
// Also usable from a JS config: `plugins: [fluidClampPlugin({ minBreakpoint: 320 })]`.
export { default } from "./plugin";

export { createFluidPlugin, fluidPlugin, normalizeOptions } from "./plugin";
export type {
  FluidPluginConfig,
  FluidPluginCssOptions,
  FluidPluginOptions,
  BreakpointConfig,
} from "./plugin";

export { DEFAULT_TYPE_SCALE, DEFAULT_SPACE_SCALE } from "./defaults";
export type { ScaleEntry } from "./defaults";
