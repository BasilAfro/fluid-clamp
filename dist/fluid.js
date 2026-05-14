"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLUID_UNITS = void 0;
exports.isFluidUnit = isFluidUnit;
exports.fluidClamp = fluidClamp;
exports.FLUID_UNITS = ["cqw", "cqh", "vw"];
function isFluidUnit(value) {
    return exports.FLUID_UNITS.includes(value);
}
function fluidClamp(options) {
    const { minSize, maxSize, minBp: rawMinBp, maxBp: rawMaxBp, fluidUnit, lengthUnit = "rem", rootPx = 16, minPadding = 0, maxPadding = 0, minSubtract = 0, maxSubtract = 0, } = options;
    if (minSize >= maxSize) {
        throw new Error(`fluidClamp: minSize (${minSize}) must be less than maxSize (${maxSize})`);
    }
    const minBp = rawMinBp - minPadding * 2 - minSubtract;
    const maxBp = rawMaxBp - maxPadding * 2 - maxSubtract;
    if (minBp >= maxBp) {
        throw new Error(`fluidClamp: resolved minBp (${minBp}) must be less than resolved maxBp (${maxBp}). ` +
            `Check your padding/subtract values.`);
    }
    const convert = (px) => (lengthUnit === "rem" ? px / rootPx : px);
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
    const interceptStr = interceptVal === 0
        ? ""
        : interceptVal > 0
            ? ` + ${interceptVal}${lengthUnit}`
            : ` - ${Math.abs(interceptVal)}${lengthUnit}`;
    return `clamp(${minRounded}${lengthUnit}, ${slopePct}${fluidUnit}${interceptStr}, ${maxRounded}${lengthUnit})`;
}
//# sourceMappingURL=fluid.js.map