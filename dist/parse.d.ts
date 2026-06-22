/**
 * parse.ts
 * Pure parsing & breakpoint-resolution helpers, separated from the Tailwind
 * plugin glue so they can be unit-tested directly.
 */
import { FluidUnit } from "./fluid";
export interface BreakpointConfig {
    /**
     * Minimum breakpoint — a px number, or a breakpoint name (a Tailwind screen
     * or a name from the `breakpoints` config), e.g. `"xs"` or `"sm"`.
     */
    minBp: number | string;
    /**
     * Maximum breakpoint — a px number or a breakpoint name, e.g. `"lg"`.
     */
    maxBp: number | string;
}
/** Internal: a fully-resolved, numeric breakpoint range. */
export interface NumericBp {
    minBp: number;
    maxBp: number;
}
export type ThemeFn = (path: string) => unknown;
export declare function parseScreen(value: unknown, rootPx?: number): number;
export declare function resolveBreakpoints(theme: ThemeFn, overrides?: Record<string, number>): Record<string, number>;
export declare function resolveBpConfig(bp: BreakpointConfig, bpMap: Record<string, number>, label: string): NumericBp;
export declare function stripPx(s: string): number;
export interface ParsedAnchor {
    size: number;
    /** Effective breakpoint in px, after subtracting any inset. */
    bp: number;
    /** Whether the breakpoint was given as a name (a viewport screen). */
    named: boolean;
}
export declare function parseAnchor(token: string, breakpoints: Record<string, number>): ParsedAnchor | null;
export declare function parseArbitraryValue(value: string, fallbackUnit: FluidUnit, fallbackBp: NumericBp, breakpoints?: Record<string, number>): string | null;
//# sourceMappingURL=parse.d.ts.map