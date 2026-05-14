"use strict";
/**
 * plugin.ts
 * Tailwind CSS plugin factory for fluid clamp utilities.
 *
 * Usage in tailwind.config.ts:
 *   import { createFluidPlugin } from "@BasilAfro/fluid-clamp";
 *   plugins: [createFluidPlugin({ ... })]
 *
 * Zero-config (uses all defaults):
 *   import { fluidPlugin } from "@BasilAfro/fluid-clamp";
 *   plugins: [fluidPlugin]
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fluidPlugin = void 0;
exports.createFluidPlugin = createFluidPlugin;
const plugin_1 = __importDefault(require("tailwindcss/plugin"));
const fluid_1 = require("./fluid");
const defaults_1 = require("./defaults");
const PLUGIN_DEFAULTS = {
    textBp: { minBp: 320, maxBp: 1280 },
    spaceBp: { minBp: 320, maxBp: 1280 },
    textUnit: "cqw",
    spaceUnit: "cqw",
};
// ─── Arbitrary value parser ───────────────────────────────────────────────────
// Parses the value inside w-fluid-[...] or text-fluid-[...]
//
// Supported syntaxes (all values in px, px suffix optional):
//   [minSize_maxSize]
//   [minSize_maxSize_minBp_maxBp]
//   [minSize_maxSize_minBp_maxBp_minPad_maxPad]
//   [minSize_maxSize_minBp_maxBp_minPad_maxPad_minSubtract_maxSubtract]
//
// Examples — these are all equivalent:
//   text-fluid-[14_24]
//   text-fluid-[14px_24px]
//   text-fluid-[14_24_304_1074]
//   text-fluid-[14px_24px_304px_1074px]
//
// When minBp/maxBp are omitted, the resolved config breakpoints are used.
// Strips a trailing "px" suffix and returns the numeric value.
// Returns NaN if the string is not a valid number (with or without px).
function stripPx(s) {
    return Number(s.endsWith("px") ? s.slice(0, -2) : s);
}
function parseArbitraryValue(value, fallbackUnit, fallbackBp) {
    const parts = value.split(" ");
    let fluidUnit = fallbackUnit;
    if ((0, fluid_1.isFluidUnit)(parts[0])) {
        fluidUnit = parts.shift();
    }
    const numbers = parts.map(stripPx);
    if (numbers.length < 2 || numbers.some(isNaN))
        return null;
    const [minSize, maxSize, minBp, maxBp, minPadding, maxPadding, minSubtract, maxSubtract,] = numbers;
    try {
        return (0, fluid_1.fluidClamp)({
            minSize,
            maxSize,
            minBp: minBp !== null && minBp !== void 0 ? minBp : fallbackBp.minBp,
            maxBp: maxBp !== null && maxBp !== void 0 ? maxBp : fallbackBp.maxBp,
            fluidUnit,
            minPadding: minPadding !== null && minPadding !== void 0 ? minPadding : 0,
            maxPadding: maxPadding !== null && maxPadding !== void 0 ? maxPadding : 0,
            minSubtract: minSubtract !== null && minSubtract !== void 0 ? minSubtract : 0,
            maxSubtract: maxSubtract !== null && maxSubtract !== void 0 ? maxSubtract : 0,
        });
    }
    catch {
        return null;
    }
}
// ─── Plugin factory ───────────────────────────────────────────────────────────
function createFluidPlugin(config = {}) {
    var _a, _b, _c, _d;
    const resolved = {
        textBp: (_a = config.textBp) !== null && _a !== void 0 ? _a : PLUGIN_DEFAULTS.textBp,
        spaceBp: (_b = config.spaceBp) !== null && _b !== void 0 ? _b : PLUGIN_DEFAULTS.spaceBp,
        textUnit: (_c = config.textUnit) !== null && _c !== void 0 ? _c : PLUGIN_DEFAULTS.textUnit,
        spaceUnit: (_d = config.spaceUnit) !== null && _d !== void 0 ? _d : PLUGIN_DEFAULTS.spaceUnit,
    };
    return (0, plugin_1.default)(function ({ addUtilities, matchUtilities }) {
        // ── Static type scale ────────────────────────────────────────────────────
        // Generates: text-fluid-xs, text-fluid-sm, text-fluid-base, etc.
        const typeUtilities = Object.fromEntries(Object.entries(defaults_1.DEFAULT_TYPE_SCALE).map(([key, { minSize, maxSize }]) => [
            `.text-fluid-${key}`,
            {
                fontSize: (0, fluid_1.fluidClamp)({
                    minSize,
                    maxSize,
                    fluidUnit: resolved.textUnit,
                    ...resolved.textBp,
                }),
            },
        ]));
        // ── Static space scale ───────────────────────────────────────────────────
        // Generates: p-fluid-4, px-fluid-4, gap-fluid-4, w-fluid-4, etc.
        const spaceUtilities = {};
        for (const [key, { minSize, maxSize }] of Object.entries(defaults_1.DEFAULT_SPACE_SCALE)) {
            const c = (0, fluid_1.fluidClamp)({
                minSize,
                maxSize,
                fluidUnit: resolved.spaceUnit,
                ...resolved.spaceBp,
            });
            spaceUtilities[`.p-fluid-${key}`] = { padding: c };
            spaceUtilities[`.px-fluid-${key}`] = { paddingLeft: c, paddingRight: c };
            spaceUtilities[`.py-fluid-${key}`] = { paddingTop: c, paddingBottom: c };
            spaceUtilities[`.pt-fluid-${key}`] = { paddingTop: c };
            spaceUtilities[`.pr-fluid-${key}`] = { paddingRight: c };
            spaceUtilities[`.pb-fluid-${key}`] = { paddingBottom: c };
            spaceUtilities[`.pl-fluid-${key}`] = { paddingLeft: c };
            spaceUtilities[`.m-fluid-${key}`] = { margin: c };
            spaceUtilities[`.mx-fluid-${key}`] = { marginLeft: c, marginRight: c };
            spaceUtilities[`.my-fluid-${key}`] = { marginTop: c, marginBottom: c };
            spaceUtilities[`.mt-fluid-${key}`] = { marginTop: c };
            spaceUtilities[`.mr-fluid-${key}`] = { marginRight: c };
            spaceUtilities[`.mb-fluid-${key}`] = { marginBottom: c };
            spaceUtilities[`.ml-fluid-${key}`] = { marginLeft: c };
            spaceUtilities[`.gap-fluid-${key}`] = { gap: c };
            spaceUtilities[`.gap-x-fluid-${key}`] = { columnGap: c };
            spaceUtilities[`.gap-y-fluid-${key}`] = { rowGap: c };
            spaceUtilities[`.w-fluid-${key}`] = { width: c };
            spaceUtilities[`.h-fluid-${key}`] = { height: c };
        }
        addUtilities({ ...typeUtilities, ...spaceUtilities });
        // ── Dynamic arbitrary values ─────────────────────────────────────────────
        // text-fluid-[14_24]
        // text-fluid-[14_24_304_1074]
        // text-fluid-[14_24_140_260_8_12]          ← with padding subtraction
        // text-fluid-[14_24_140_260_8_12_32_40]    ← with padding + sibling subtraction
        matchUtilities({
            "text-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.textUnit, resolved.textBp);
                return c ? { fontSize: c } : null;
            },
        }, { type: "any" });
        matchUtilities({
            "p-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { padding: c } : null;
            },
            "px-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { paddingLeft: c, paddingRight: c } : null;
            },
            "py-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { paddingTop: c, paddingBottom: c } : null;
            },
            "pt-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { paddingTop: c } : null;
            },
            "pr-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { paddingRight: c } : null;
            },
            "pb-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { paddingBottom: c } : null;
            },
            "pl-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { paddingLeft: c } : null;
            },
            "m-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { margin: c } : null;
            },
            "mx-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { marginLeft: c, marginRight: c } : null;
            },
            "my-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { marginTop: c, marginBottom: c } : null;
            },
            "mt-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { marginTop: c } : null;
            },
            "mr-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { marginRight: c } : null;
            },
            "mb-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { marginBottom: c } : null;
            },
            "ml-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { marginLeft: c } : null;
            },
            "gap-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { gap: c } : null;
            },
            "gap-x-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { columnGap: c } : null;
            },
            "gap-y-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { rowGap: c } : null;
            },
            "w-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { width: c } : null;
            },
            "h-fluid": (value) => {
                const c = parseArbitraryValue(value, resolved.spaceUnit, resolved.spaceBp);
                return c ? { height: c } : null;
            },
        }, { type: "any" });
    });
}
// ─── Convenience export ───────────────────────────────────────────────────────
// For projects that don't need any config — just import and use.
exports.fluidPlugin = createFluidPlugin();
//# sourceMappingURL=plugin.js.map