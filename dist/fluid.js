"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLUID_UNITS = void 0;
exports.isFluidUnit = isFluidUnit;
exports.fluidClamp = fluidClamp;
exports.FLUID_UNITS = ["cqw", "cqh", "vw"];
function isFluidUnit(value) {
    return exports.FLUID_UNITS.includes(value);
}
function fluidClamp(options) {
    const { minSize, maxSize, minBreakpoint, maxBreakpoint, fluidUnit, lengthUnit = "rem", rootFontSize = 16, } = options;
    if (minSize >= maxSize) {
        throw new Error(`fluidClamp: minSize (${minSize}) must be less than maxSize (${maxSize})`);
    }
    if (minBreakpoint >= maxBreakpoint) {
        throw new Error(`fluidClamp: minBreakpoint (${minBreakpoint}) must be less than maxBreakpoint (${maxBreakpoint})`);
    }
    const toLengthValue = (pixels) => lengthUnit === "rem" ? pixels / rootFontSize : pixels;
    const minSizeValue = toLengthValue(minSize);
    const maxSizeValue = toLengthValue(maxSize);
    const minBreakpointValue = toLengthValue(minBreakpoint);
    const maxBreakpointValue = toLengthValue(maxBreakpoint);
    const slope = (maxSizeValue - minSizeValue) / (maxBreakpointValue - minBreakpointValue);
    const intercept = minSizeValue - slope * minBreakpointValue;
    const slopePercent = parseFloat((slope * 100).toFixed(4));
    const interceptValue = parseFloat(intercept.toFixed(4));
    const minSizeRounded = parseFloat(minSizeValue.toFixed(4));
    const maxSizeRounded = parseFloat(maxSizeValue.toFixed(4));
    const interceptString = interceptValue === 0
        ? ""
        : interceptValue > 0
            ? ` + ${interceptValue}${lengthUnit}`
            : ` - ${Math.abs(interceptValue)}${lengthUnit}`;
    return `clamp(${minSizeRounded}${lengthUnit}, ${slopePercent}${fluidUnit}${interceptString}, ${maxSizeRounded}${lengthUnit})`;
}
//# sourceMappingURL=fluid.js.map