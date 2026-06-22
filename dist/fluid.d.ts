/**
 * fluid.ts
 * Core math for generating CSS clamp() functions.
 * Supports cqw, cqh, and vw as fluid units.
 *
 * Formula (slope may be negative when the size shrinks as the breakpoint grows):
 *   slope     = (maxSize - minSize) / (maxBreakpoint - minBreakpoint)
 *   intercept = minSize - slope * minBreakpoint
 *   clamp(min(minSize, maxSize), slope * 100{unit} + intercept{lengthUnit}, max(minSize, maxSize))
 */
export declare const FLUID_UNITS: readonly ["cqw", "cqh", "vw"];
export type FluidUnit = (typeof FLUID_UNITS)[number];
export type LengthUnit = "rem" | "px";
export declare function isFluidUnit(value: string): value is FluidUnit;
export interface FluidClampOptions {
    /** Size in px at `minBreakpoint`. May be larger than `maxSize` to shrink as the breakpoint grows. */
    minSize: number;
    /** Size in px at `maxBreakpoint`. May be smaller than `minSize` to shrink as the breakpoint grows. */
    maxSize: number;
    /**
     * Minimum breakpoint in px.
     * For cqw → container width. For cqh → container height. For vw → viewport width.
     */
    minBreakpoint: number;
    /**
     * Maximum breakpoint in px.
     * For cqw → container width. For cqh → container height. For vw → viewport width.
     */
    maxBreakpoint: number;
    /**
     * The fluid unit for the slope.
     * - cqw → needs container-type: inline-size or size on parent
     * - cqh → needs container-type: size + explicit height on parent
     * - vw  → relative to viewport, no container needed
     */
    fluidUnit: FluidUnit;
    /**
     * Unit for the min, max, and intercept values.
     * rem respects user browser font preferences — prefer over px.
     * @default "rem"
     */
    lengthUnit?: LengthUnit;
    /**
     * Root font size in px, used to convert px values to rem.
     * @default 16
     */
    rootFontSize?: number;
    /**
     * Keep the lower clamp bound (the floor). When false, the value keeps
     * extrapolating below the smaller size along the same slope instead of being
     * clamped — emits `min(ceiling, …)`, or a bare `calc(…)` if `clampMax` is also
     * false.
     * @default true
     */
    clampMin?: boolean;
    /**
     * Keep the upper clamp bound (the ceiling). When false, the value keeps
     * extrapolating above the larger size along the same slope — emits
     * `max(floor, …)`, or a bare `calc(…)` if `clampMin` is also false.
     * @default true
     */
    clampMax?: boolean;
}
export declare function fluidClamp(options: FluidClampOptions): string;
//# sourceMappingURL=fluid.d.ts.map