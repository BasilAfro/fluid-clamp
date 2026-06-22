"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLUID_UNITS = void 0;
exports.isFluidUnit = isFluidUnit;
exports.fluidClamp = fluidClamp;
exports.FLUID_UNITS = ["cqw", "cqh", "vw"];
// Decimal places for the generated slope, intercept, and clamp bounds. 6 keeps
// the value at the breakpoints accurate to ~0.00001px (4 left a ~0.001px gap at
// the limits) without bloating the output.
const DECIMAL_PLACES = 6;
function isFluidUnit(value) {
    return exports.FLUID_UNITS.includes(value);
}
function fluidClamp(options) {
    const { minSize, maxSize, minBreakpoint, maxBreakpoint, fluidUnit, lengthUnit = "rem", rootFontSize = 16, clampMin = true, clampMax = true, } = options;
    if (minBreakpoint >= maxBreakpoint) {
        throw new Error(`fluidClamp: minBreakpoint (${minBreakpoint}) must be less than maxBreakpoint (${maxBreakpoint})`);
    }
    const toLengthValue = (pixels) => lengthUnit === "rem" ? pixels / rootFontSize : pixels;
    const minSizeValue = toLengthValue(minSize);
    const maxSizeValue = toLengthValue(maxSize);
    // Equal sizes aren't fluid — there's no slope. Emit the constant value
    // directly (a clamp would be degenerate) so callers passing data-driven sizes
    // never have to special-case the "both ends the same" case.
    if (minSize === maxSize) {
        return `${parseFloat(minSizeValue.toFixed(DECIMAL_PLACES))}${lengthUnit}`;
    }
    const minBreakpointValue = toLengthValue(minBreakpoint);
    const maxBreakpointValue = toLengthValue(maxBreakpoint);
    // Slope is negative when the size shrinks as the breakpoint grows.
    const slope = (maxSizeValue - minSizeValue) / (maxBreakpointValue - minBreakpointValue);
    const intercept = minSizeValue - slope * minBreakpointValue;
    const slopePercent = parseFloat((slope * 100).toFixed(DECIMAL_PLACES));
    const interceptValue = parseFloat(intercept.toFixed(DECIMAL_PLACES));
    // clamp() requires floor ≤ ceiling — the smaller size is the floor regardless
    // of which breakpoint it sits at, so growing and shrinking both work.
    const lowerBound = parseFloat(Math.min(minSizeValue, maxSizeValue).toFixed(DECIMAL_PLACES));
    const upperBound = parseFloat(Math.max(minSizeValue, maxSizeValue).toFixed(DECIMAL_PLACES));
    const interceptString = interceptValue === 0
        ? ""
        : interceptValue > 0
            ? ` + ${interceptValue}${lengthUnit}`
            : ` - ${Math.abs(interceptValue)}${lengthUnit}`;
    const preferred = `${slopePercent}${fluidUnit}${interceptString}`;
    const floor = `${lowerBound}${lengthUnit}`;
    const ceiling = `${upperBound}${lengthUnit}`;
    // Dropping a bound lets the value keep extrapolating past it along the same
    // slope. A bare linear value must be wrapped in calc() to be valid CSS.
    if (clampMin && clampMax)
        return `clamp(${floor}, ${preferred}, ${ceiling})`;
    if (clampMin)
        return `max(${floor}, ${preferred})`;
    if (clampMax)
        return `min(${ceiling}, ${preferred})`;
    return `calc(${preferred})`;
}
//# sourceMappingURL=fluid.js.map