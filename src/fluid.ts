/**
 * fluid.ts
 * Core math for generating CSS clamp() functions.
 * Supports cqw, cqh, and vw as fluid units.
 *
 * Formula:
 *   slope     = (maxSize - minSize) / (maxBreakpoint - minBreakpoint)
 *   intercept = minSize - slope * minBreakpoint
 *   clamp(minSize, slope * 100{unit} + intercept{lengthUnit}, maxSize)
 */

export const FLUID_UNITS = ["cqw", "cqh", "vw"] as const;
export type FluidUnit = (typeof FLUID_UNITS)[number];

export type LengthUnit = "rem" | "px";

export function isFluidUnit(value: string): value is FluidUnit {
  return FLUID_UNITS.includes(value as FluidUnit);
}

export interface FluidClampOptions {
  /** Minimum size in px */
  minSize: number;
  /** Maximum size in px */
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

  if (minSize >= maxSize) {
    throw new Error(
      `fluidClamp: minSize (${minSize}) must be less than maxSize (${maxSize})`,
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

  const slope =
    (maxSizeValue - minSizeValue) / (maxBreakpointValue - minBreakpointValue);
  const intercept = minSizeValue - slope * minBreakpointValue;

  const slopePercent = parseFloat((slope * 100).toFixed(4));
  const interceptValue = parseFloat(intercept.toFixed(4));
  const minSizeRounded = parseFloat(minSizeValue.toFixed(4));
  const maxSizeRounded = parseFloat(maxSizeValue.toFixed(4));

  const interceptString =
    interceptValue === 0
      ? ""
      : interceptValue > 0
        ? ` + ${interceptValue}${lengthUnit}`
        : ` - ${Math.abs(interceptValue)}${lengthUnit}`;

  return `clamp(${minSizeRounded}${lengthUnit}, ${slopePercent}${fluidUnit}${interceptString}, ${maxSizeRounded}${lengthUnit})`;
}
