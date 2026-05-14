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
export declare const DEFAULT_TYPE_SCALE: Record<string, ScaleEntry>;
export declare const DEFAULT_SPACE_SCALE: Record<string, ScaleEntry>;
//# sourceMappingURL=defaults.d.ts.map