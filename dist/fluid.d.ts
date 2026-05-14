/**
 * fluid.ts
 * Core math for generating CSS clamp() functions.
 * Supports cqw, cqh, and vw as fluid units.
 *
 * Formula:
 *   slope     = (maxSize - minSize) / (maxBp - minBp)
 *   intercept = minSize - slope * minBp
 *   clamp(minSize, slope * 100{unit} + intercept{lengthUnit}, maxSize)
 */
export declare const FLUID_UNITS: readonly ["cqw", "cqh", "vw"];
export type FluidUnit = (typeof FLUID_UNITS)[number];
export type LengthUnit = "rem" | "px";
export declare function isFluidUnit(value: string): value is FluidUnit;
export interface FluidClampOptions {
    /** Minimum size in px */
    minSize: number;
    /** Maximum size in px */
    maxSize: number;
    /**
     * Minimum breakpoint in px.
     * For cqw → container width. For cqh → container height. For vw → viewport width.
     */
    minBp: number;
    /**
     * Maximum breakpoint in px.
     * For cqw → container width. For cqh → container height. For vw → viewport width.
     */
    maxBp: number;
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
     * Root font size in px for rem conversion.
     * @default 16
     */
    rootPx?: number;
    /**
     * Padding to subtract from both sides of minBp.
     * minBp becomes: minBp - minPadding * 2
     */
    minPadding?: number;
    /**
     * Padding to subtract from both sides of maxBp.
     * maxBp becomes: maxBp - maxPadding * 2
     */
    maxPadding?: number;
    /**
     * Additional fixed elements to subtract from minBp
     * (e.g. icon width + gap in a row layout).
     */
    minSubtract?: number;
    /**
     * Additional fixed elements to subtract from maxBp.
     */
    maxSubtract?: number;
}
export declare function fluidClamp(options: FluidClampOptions): string;
//# sourceMappingURL=fluid.d.ts.map