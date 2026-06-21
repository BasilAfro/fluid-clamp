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