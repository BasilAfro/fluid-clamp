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
const PLUGIN_DEFAULTS = {
    textBp: { minBp: 320, maxBp: 1280 },
    spaceBp: { minBp: 320, maxBp: 1280 },
    // vw matches the viewport-based default breakpoints (and the named Tailwind
    // breakpoints). Override per-class with a unit token, e.g. text-fluid-[cqw_15_32].
    textUnit: "vw",
    spaceUnit: "vw",
};
// Parses a single theme `screens` value into px.
// Handles "640px", "40rem"/"40em" (× rootPx), bare numbers, and the
// object form ({ min, max }) by preferring `min`. Returns NaN if unparseable.
function parseScreen(value, rootPx = 16) {
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        const match = value.trim().match(/^(-?[\d.]+)(px|rem|em)?$/);
        if (!match)
            return NaN;
        const n = Number(match[1]);
        if (isNaN(n))
            return NaN;
        return match[2] === "rem" || match[2] === "em" ? n * rootPx : n;
    }
    if (value && typeof value === "object") {
        const obj = value;
        if ("min" in obj)
            return parseScreen(obj.min, rootPx);
        if ("max" in obj)
            return parseScreen(obj.max, rootPx);
    }
    return NaN;
}
function resolveBreakpoints(theme, overrides = {}) {
    const map = {};
    const screens = theme("screens");
    if (screens && typeof screens === "object") {
        for (const [name, value] of Object.entries(screens)) {
            const px = parseScreen(value);
            if (!isNaN(px))
                map[name] = px;
        }
    }
    // Plugin-level overrides win over theme screens.
    for (const [name, px] of Object.entries(overrides)) {
        if (typeof px === "number" && !isNaN(px))
            map[name] = px;
    }
    return map;
}
// Resolves a config breakpoint range to numbers, turning any breakpoint names
// (e.g. "xs", "lg") into px via the resolved breakpoint map. Throws a clear
// error on an unknown name — config mistakes should be loud, not silent.
function resolveBpConfig(bp, bpMap, label) {
    const one = (v, which) => {
        if (typeof v === "number")
            return v;
        if (Object.prototype.hasOwnProperty.call(bpMap, v))
            return bpMap[v];
        throw new Error(`createFluidPlugin: unknown breakpoint name "${v}" in ${label}.${which}. ` +
            `Add it to the plugin's \`breakpoints\` option or your tailwind ` +
            `theme.screens, or use a px number.`);
    };
    return { minBp: one(bp.minBp, "minBp"), maxBp: one(bp.maxBp, "maxBp") };
}
// ─── Arbitrary value parser ───────────────────────────────────────────────────
// Parses the value inside w-fluid-[...] or text-fluid-[...]
//
// Two forms (px suffix optional on every number):
//
//   1. Shorthand — two sizes, scaled across the configured breakpoints:
//        text-fluid-[16_24]
//
//   2. Anchors — a size pinned to an explicit breakpoint with `size@bp`:
//        text-fluid-[16@320_24@1280]      explicit breakpoints
//        text-fluid-[16@sm_24@lg]         breakpoint names (theme.screens + config)
//        text-fluid-[16@320-16_24@1280-24] per-anchor inset (effective bp = bp − 16 / − 24)
//
//      The inset (`-N`) is subtracted directly from that breakpoint — use it to
//      account for container padding or sibling elements. (3+ anchors / piecewise
//      ramps are reserved for a future release.)
//
// The fluid unit is chosen automatically, with this precedence:
//   1. An explicit leading unit token (cqw|cqh|vw) — always wins:
//        text-fluid-[cqw_16_24]   text-fluid-[cqw_16@320_24@1280]
//   2. A named breakpoint ⇒ vw (named breakpoints are viewport screens).
//   3. Otherwise the configured default unit (textUnit/spaceUnit, default vw).
// Strips a trailing "px" suffix and returns the numeric value.
// Returns NaN if the string is not a valid number (with or without px).
function stripPx(s) {
    return Number(s.endsWith("px") ? s.slice(0, -2) : s);
}
// Parses one `size@bp` or `size@bp-inset` anchor token. Returns null if malformed.
function parseAnchor(token, breakpoints) {
    const at = token.indexOf("@");
    if (at < 0)
        return null;
    const size = stripPx(token.slice(0, at));
    let bpToken = token.slice(at + 1);
    // Optional inset: `bp-inset` (subtracted directly, no doubling).
    let inset = 0;
    const dash = bpToken.indexOf("-");
    if (dash >= 0) {
        inset = stripPx(bpToken.slice(dash + 1));
        bpToken = bpToken.slice(0, dash);
    }
    const named = Object.prototype.hasOwnProperty.call(breakpoints, bpToken);
    const bp = named ? breakpoints[bpToken] : stripPx(bpToken);
    if (isNaN(size) || isNaN(bp) || isNaN(inset))
        return null;
    return { size, bp: bp - inset, named };
}
function parseArbitraryValue(value, fallbackUnit, fallbackBp, breakpoints = {}) {
    const parts = value.split(" ");
    // An explicit unit token (cqw|cqh|vw) may lead the value; it always wins.
    let inlineUnit = null;
    if ((0, fluid_1.isFluidUnit)(parts[0])) {
        inlineUnit = parts.shift();
    }
    const pickUnit = (named) => inlineUnit !== null && inlineUnit !== void 0 ? inlineUnit : (named ? "vw" : fallbackUnit);
    // ── Anchor form: every token carries an explicit `size@bp` ──────────────────
    if (parts.some((p) => p.includes("@"))) {
        const anchors = parts.map((p) => parseAnchor(p, breakpoints));
        if (anchors.some((a) => a === null))
            return null;
        // 3+ anchors (piecewise) are not implemented yet — reserved for later.
        if (anchors.length !== 2)
            return null;
        const [a, b] = anchors;
        // Order by breakpoint so the smaller bp is the min anchor.
        const [lo, hi] = a.bp <= b.bp ? [a, b] : [b, a];
        try {
            return (0, fluid_1.fluidClamp)({
                minSize: lo.size,
                maxSize: hi.size,
                minBp: lo.bp,
                maxBp: hi.bp,
                fluidUnit: pickUnit(a.named || b.named),
            });
        }
        catch {
            return null;
        }
    }
    // ── Shorthand form: exactly two sizes, across the configured breakpoints ────
    if (parts.length !== 2)
        return null;
    const [minSize, maxSize] = parts.map(stripPx);
    if (isNaN(minSize) || isNaN(maxSize))
        return null;
    try {
        return (0, fluid_1.fluidClamp)({
            minSize,
            maxSize,
            minBp: fallbackBp.minBp,
            maxBp: fallbackBp.maxBp,
            fluidUnit: pickUnit(false),
        });
    }
    catch {
        return null;
    }
}
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
        const bpMap = resolveBreakpoints(theme, config.breakpoints);
        // Resolve config breakpoints (which may use names like "xs"/"lg") to px.
        const textBp = resolveBpConfig(resolved.textBp, bpMap, "textBp");
        const spaceBp = resolveBpConfig(resolved.spaceBp, bpMap, "spaceBp");
        // Bound parsers so arbitrary-value callbacks stay terse.
        const textClamp = (value) => parseArbitraryValue(value, resolved.textUnit, textBp, bpMap);
        const spaceClamp = (value) => parseArbitraryValue(value, resolved.spaceUnit, spaceBp, bpMap);
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
                const c = textClamp(value);
                return c ? { fontSize: c } : null;
            },
        }, { type: "any" });
        matchUtilities({
            "p-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { padding: c } : null;
            },
            "px-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { paddingLeft: c, paddingRight: c } : null;
            },
            "py-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { paddingTop: c, paddingBottom: c } : null;
            },
            "pt-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { paddingTop: c } : null;
            },
            "pr-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { paddingRight: c } : null;
            },
            "pb-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { paddingBottom: c } : null;
            },
            "pl-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { paddingLeft: c } : null;
            },
            "m-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { margin: c } : null;
            },
            "mx-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { marginLeft: c, marginRight: c } : null;
            },
            "my-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { marginTop: c, marginBottom: c } : null;
            },
            "mt-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { marginTop: c } : null;
            },
            "mr-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { marginRight: c } : null;
            },
            "mb-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { marginBottom: c } : null;
            },
            "ml-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { marginLeft: c } : null;
            },
            "gap-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { gap: c } : null;
            },
            "gap-x-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { columnGap: c } : null;
            },
            "gap-y-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { rowGap: c } : null;
            },
            "w-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { width: c } : null;
            },
            "h-fluid": (value) => {
                const c = spaceClamp(value);
                return c ? { height: c } : null;
            },
        }, { type: "any" });
    });
}
// ─── Convenience export ───────────────────────────────────────────────────────
// For projects that don't need any config — just import and use.
exports.fluidPlugin = createFluidPlugin();
//# sourceMappingURL=plugin.js.map