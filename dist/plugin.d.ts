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
import { FluidUnit } from "./fluid";
import { BreakpointConfig } from "./parse";
export type { BreakpointConfig } from "./parse";
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
     * unit token (e.g. `text-fluid-[cqw_15_32]`), and using a named breakpoint
     * (e.g. `text-fluid-[15@sm_32@lg]`) automatically selects `vw`.
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
     * Named breakpoints usable as the breakpoint in arbitrary-value anchors,
     * e.g. `text-fluid-[15@sm_32@lg]` (size 15→32px across the sm→lg range).
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
export declare function createFluidPlugin(config?: FluidPluginConfig): {
    handler: import("tailwindcss/types/config").PluginCreator;
    config?: Partial<import("tailwindcss/types/config").Config>;
};
export declare const fluidPlugin: {
    handler: import("tailwindcss/types/config").PluginCreator;
    config?: Partial<import("tailwindcss/types/config").Config>;
};
//# sourceMappingURL=plugin.d.ts.map