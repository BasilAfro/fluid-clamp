/**
 * parse.ts
 * Pure parsing & breakpoint-resolution helpers, separated from the Tailwind
 * plugin glue so they can be unit-tested directly.
 */
import { FluidUnit, LengthUnit } from "./fluid";
export interface BreakpointConfig {
    /**
     * Minimum breakpoint — a px number, or a breakpoint name (a Tailwind screen
     * or a name from the `breakpoints` config), e.g. `"xs"` or `"sm"`.
     */
    minBreakpoint: number | string;
    /**
     * Maximum breakpoint — a px number or a breakpoint name, e.g. `"lg"`.
     */
    maxBreakpoint: number | string;
}
/** Internal: a fully-resolved, numeric breakpoint range. */
export interface NumericBreakpointRange {
    minBreakpoint: number;
    maxBreakpoint: number;
}
export type ThemeFunction = (path: string) => unknown;
export declare function parseScreen(value: unknown, rootFontSize?: number): number;
export declare function resolveBreakpoints(theme: ThemeFunction, overrides?: Record<string, number>): Record<string, number>;
export declare function resolveBreakpointConfig(range: BreakpointConfig, breakpointMap: Record<string, number>, label: string): NumericBreakpointRange;
export declare function parsePixels(token: string): number;
export interface ParsedAnchor {
    size: number;
    /** Effective breakpoint in px, after subtracting any inset. */
    breakpoint: number;
    /** Whether the breakpoint was given as a name (a viewport screen). */
    named: boolean;
}
export declare function parseAnchor(token: string, breakpoints: Record<string, number>): ParsedAnchor | null;
/** Length-output options forwarded verbatim to fluidClamp. */
export interface LengthOptions {
    lengthUnit?: LengthUnit;
    rootFontSize?: number;
}
export declare function parseArbitraryValue(value: string, fallbackUnit: FluidUnit, fallbackRange: NumericBreakpointRange, breakpoints?: Record<string, number>, lengthOptions?: LengthOptions): string | null;
//# sourceMappingURL=parse.d.ts.map