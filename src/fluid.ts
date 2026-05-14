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

export function fluidClamp(options: FluidClampOptions): string {
  const {
    minSize,
    maxSize,
    minBp: rawMinBp,
    maxBp: rawMaxBp,
    fluidUnit,
    lengthUnit = "rem",
    rootPx = 16,
    minPadding = 0,
    maxPadding = 0,
    minSubtract = 0,
    maxSubtract = 0,
  } = options;

  if (minSize >= maxSize) {
    throw new Error(
      `fluidClamp: minSize (${minSize}) must be less than maxSize (${maxSize})`,
    );
  }

  const minBp = rawMinBp - minPadding * 2 - minSubtract;
  const maxBp = rawMaxBp - maxPadding * 2 - maxSubtract;

  if (minBp >= maxBp) {
    throw new Error(
      `fluidClamp: resolved minBp (${minBp}) must be less than resolved maxBp (${maxBp}). ` +
        `Check your padding/subtract values.`,
    );
  }

  const convert = (px: number) => (lengthUnit === "rem" ? px / rootPx : px);

  const minVal = convert(minSize);
  const maxVal = convert(maxSize);
  const minBpVal = convert(minBp);
  const maxBpVal = convert(maxBp);

  const slope = (maxVal - minVal) / (maxBpVal - minBpVal);
  const intercept = minVal - slope * minBpVal;

  const slopePct = parseFloat((slope * 100).toFixed(4));
  const interceptVal = parseFloat(intercept.toFixed(4));
  const minRounded = parseFloat(minVal.toFixed(4));
  const maxRounded = parseFloat(maxVal.toFixed(4));

  const interceptStr =
    interceptVal === 0
      ? ""
      : interceptVal > 0
        ? ` + ${interceptVal}${lengthUnit}`
        : ` - ${Math.abs(interceptVal)}${lengthUnit}`;

  return `clamp(${minRounded}${lengthUnit}, ${slopePct}${fluidUnit}${interceptStr}, ${maxRounded}${lengthUnit})`;
}
