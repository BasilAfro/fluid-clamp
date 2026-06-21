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
export interface BreakpointConfig {
    /** Minimum breakpoint in px (container or viewport width/height) */
    minBp: number;
    /** Maximum breakpoint in px */
    maxBp: number;
}
export interface FluidPluginConfig {
    /**
     * Breakpoints used for all fluid utilities (text and spacing).
     * This is the one knob most projects need — text and spacing usually share
     * the same range. Use `textBp`/`spaceBp` only to override one of them.
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
export declare function createFluidPlugin(config?: FluidPluginConfig): {
    handler: import("tailwindcss/types/config").PluginCreator;
    config?: Partial<import("tailwindcss/types/config").Config>;
};
export declare const fluidPlugin: {
    handler: import("tailwindcss/types/config").PluginCreator;
    config?: Partial<import("tailwindcss/types/config").Config>;
};
//# sourceMappingURL=plugin.d.ts.map