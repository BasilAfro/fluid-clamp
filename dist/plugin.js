"use strict";
/**
 * plugin.ts
 * Tailwind CSS plugin factory for fluid clamp utilities.
 *
 * Usage in tailwind.config.ts:
 *   import { createFluidPlugin } from "@basilafro/fluid-clamp";
 *   plugins: [createFluidPlugin({ ... })]
 *
 * Zero-config (uses all defaults):
 *   import { fluidPlugin } from "@basilafro/fluid-clamp";
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
const parse_1 = require("./parse");
const PLUGIN_DEFAULTS = {
    textBp: { minBp: 320, maxBp: 1280 },
    spaceBp: { minBp: 320, maxBp: 1280 },
    // vw matches the viewport-based default breakpoints (and the named Tailwind
    // breakpoints). Override per-class with a unit token, e.g. text-fluid-[cqw_15_32].
    textUnit: "vw",
    spaceUnit: "vw",
};
// ─── Spacing utilities ────────────────────────────────────────────────────────
// Single source of truth for the spacing prefixes and the CSS declarations each
// one applies a fluid clamp value to. Both the static scale (`p-fluid-4`) and the
// arbitrary-value matchers (`p-fluid-[…]`) are generated from this map, so the
// prefix → property mapping lives in exactly one place.
const SPACE_PROPS = {
    p: (c) => ({ padding: c }),
    px: (c) => ({ paddingLeft: c, paddingRight: c }),
    py: (c) => ({ paddingTop: c, paddingBottom: c }),
    pt: (c) => ({ paddingTop: c }),
    pr: (c) => ({ paddingRight: c }),
    pb: (c) => ({ paddingBottom: c }),
    pl: (c) => ({ paddingLeft: c }),
    m: (c) => ({ margin: c }),
    mx: (c) => ({ marginLeft: c, marginRight: c }),
    my: (c) => ({ marginTop: c, marginBottom: c }),
    mt: (c) => ({ marginTop: c }),
    mr: (c) => ({ marginRight: c }),
    mb: (c) => ({ marginBottom: c }),
    ml: (c) => ({ marginLeft: c }),
    gap: (c) => ({ gap: c }),
    "gap-x": (c) => ({ columnGap: c }),
    "gap-y": (c) => ({ rowGap: c }),
    w: (c) => ({ width: c }),
    h: (c) => ({ height: c }),
};
// ─── Plugin factory ───────────────────────────────────────────────────────────
function createFluidPlugin(config = {}) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    // Precedence: per-target override → general knob → built-in default.
    const resolved = {
        textBp: (_b = (_a = config.textBp) !== null && _a !== void 0 ? _a : config.bp) !== null && _b !== void 0 ? _b : PLUGIN_DEFAULTS.textBp,
        spaceBp: (_d = (_c = config.spaceBp) !== null && _c !== void 0 ? _c : config.bp) !== null && _d !== void 0 ? _d : PLUGIN_DEFAULTS.spaceBp,
        textUnit: (_f = (_e = config.textUnit) !== null && _e !== void 0 ? _e : config.unit) !== null && _f !== void 0 ? _f : PLUGIN_DEFAULTS.textUnit,
        spaceUnit: (_h = (_g = config.spaceUnit) !== null && _g !== void 0 ? _g : config.unit) !== null && _h !== void 0 ? _h : PLUGIN_DEFAULTS.spaceUnit,
    };
    return (0, plugin_1.default)(function ({ addUtilities, matchUtilities, theme }) {
        // Named breakpoints: Tailwind's theme screens + plugin overrides.
        const bpMap = (0, parse_1.resolveBreakpoints)(theme, config.breakpoints);
        // Resolve config breakpoints (which may use names like "xs"/"lg") to px.
        const textBp = (0, parse_1.resolveBpConfig)(resolved.textBp, bpMap, "textBp");
        const spaceBp = (0, parse_1.resolveBpConfig)(resolved.spaceBp, bpMap, "spaceBp");
        // Bound parsers so arbitrary-value callbacks stay terse.
        const textClamp = (value) => (0, parse_1.parseArbitraryValue)(value, resolved.textUnit, textBp, bpMap);
        const spaceClamp = (value) => (0, parse_1.parseArbitraryValue)(value, resolved.spaceUnit, spaceBp, bpMap);
        // ── Static type scale ────────────────────────────────────────────────────
        // Generates: text-fluid-xs, text-fluid-sm, text-fluid-base, etc.
        const typeUtilities = Object.fromEntries(Object.entries(defaults_1.DEFAULT_TYPE_SCALE).map(([key, { minSize, maxSize }]) => [
            `.text-fluid-${key}`,
            {
                fontSize: (0, fluid_1.fluidClamp)({
                    minSize,
                    maxSize,
                    fluidUnit: resolved.textUnit,
                    ...textBp,
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
                ...spaceBp,
            });
            for (const [prefix, toDecls] of Object.entries(SPACE_PROPS)) {
                spaceUtilities[`.${prefix}-fluid-${key}`] = toDecls(c);
            }
        }
        addUtilities({ ...typeUtilities, ...spaceUtilities });
        // ── Dynamic arbitrary values ─────────────────────────────────────────────
        // text-fluid-[16_24]                ← shorthand: two sizes, config breakpoints
        // text-fluid-[16@320_24@1280]       ← anchors: size pinned to explicit bp
        // text-fluid-[16@sm_24@lg]          ← anchors with breakpoint names
        // text-fluid-[16@320-16_24@1280-24] ← per-anchor inset (effective bp = bp − N)
        // text-fluid-[cqw_16_24]            ← leading unit token (overrides the default)
        matchUtilities({
            "text-fluid": (value) => {
                const c = textClamp(value);
                return c ? { fontSize: c } : null;
            },
        }, { type: "any" });
        matchUtilities(Object.fromEntries(Object.entries(SPACE_PROPS).map(([prefix, toDecls]) => [
            `${prefix}-fluid`,
            (value) => {
                const c = spaceClamp(value);
                return c ? toDecls(c) : null;
            },
        ])), { type: "any" });
    });
}
// ─── Convenience export ───────────────────────────────────────────────────────
// For projects that don't need any config — just import and use.
exports.fluidPlugin = createFluidPlugin();
//# sourceMappingURL=plugin.js.map