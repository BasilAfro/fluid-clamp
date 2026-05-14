/**
 * defaults.ts
 * Default type and space scales.
 * These are the fallback values when no override is provided via createFluidPlugin().
 * All sizes are in px — conversion to rem happens inside fluidClamp().
 */

export interface ScaleEntry {
  minSize: number;
  maxSize: number;
}

export const DEFAULT_TYPE_SCALE: Record<string, ScaleEntry> = {
  "2xs": { minSize: 10, maxSize: 12 },
  xs: { minSize: 12, maxSize: 14 },
  sm: { minSize: 14, maxSize: 16 },
  base: { minSize: 16, maxSize: 18 },
  md: { minSize: 18, maxSize: 22 },
  lg: { minSize: 20, maxSize: 28 },
  xl: { minSize: 24, maxSize: 36 },
  "2xl": { minSize: 32, maxSize: 48 },
  "3xl": { minSize: 40, maxSize: 64 },
  "4xl": { minSize: 48, maxSize: 80 },
};

export const DEFAULT_SPACE_SCALE: Record<string, ScaleEntry> = {
  "1": { minSize: 4, maxSize: 6 },
  "2": { minSize: 8, maxSize: 12 },
  "3": { minSize: 12, maxSize: 18 },
  "4": { minSize: 16, maxSize: 24 },
  "6": { minSize: 24, maxSize: 36 },
  "8": { minSize: 32, maxSize: 48 },
  "10": { minSize: 40, maxSize: 64 },
  "12": { minSize: 48, maxSize: 80 },
  "16": { minSize: 64, maxSize: 112 },
  "20": { minSize: 80, maxSize: 140 },
  "24": { minSize: 96, maxSize: 160 },
};
