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

export const FLUID_UNITS = ["cqw", "cqh", "vw"] as const;
export type FluidUnit = (typeof FLUID_UNITS)[number];

export type LengthUnit = "rem" | "px";

export function isFluidUnit(value: string): value is FluidUnit {
  return FLUID_UNITS.includes(value as FluidUnit);
}

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
}

export function fluidClamp(options: FluidClampOptions): string {
  const {
    minSize,
    maxSize,
    minBreakpoint,
    maxBreakpoint,
    fluidUnit,
    lengthUnit = "rem",
    rootFontSize = 16,
  } = options;

  if (minSize === maxSize) {
    throw new Error(
      `fluidClamp: minSize and maxSize must differ (both ${minSize})`,
    );
  }

  if (minBreakpoint >= maxBreakpoint) {
    throw new Error(
      `fluidClamp: minBreakpoint (${minBreakpoint}) must be less than maxBreakpoint (${maxBreakpoint})`,
    );
  }

  const toLengthValue = (pixels: number) =>
    lengthUnit === "rem" ? pixels / rootFontSize : pixels;

  const minSizeValue = toLengthValue(minSize);
  const maxSizeValue = toLengthValue(maxSize);
  const minBreakpointValue = toLengthValue(minBreakpoint);
  const maxBreakpointValue = toLengthValue(maxBreakpoint);

  // Slope is negative when the size shrinks as the breakpoint grows.
  const slope =
    (maxSizeValue - minSizeValue) / (maxBreakpointValue - minBreakpointValue);
  const intercept = minSizeValue - slope * minBreakpointValue;

  const slopePercent = parseFloat((slope * 100).toFixed(4));
  const interceptValue = parseFloat(intercept.toFixed(4));
  // clamp() requires floor ≤ ceiling — the smaller size is the floor regardless
  // of which breakpoint it sits at, so growing and shrinking both work.
  const lowerBound = parseFloat(Math.min(minSizeValue, maxSizeValue).toFixed(4));
  const upperBound = parseFloat(Math.max(minSizeValue, maxSizeValue).toFixed(4));

  const interceptString =
    interceptValue === 0
      ? ""
      : interceptValue > 0
        ? ` + ${interceptValue}${lengthUnit}`
        : ` - ${Math.abs(interceptValue)}${lengthUnit}`;

  return `clamp(${lowerBound}${lengthUnit}, ${slopePercent}${fluidUnit}${interceptString}, ${upperBound}${lengthUnit})`;
}
