"use strict";
/**
 * parse.ts
 * Pure parsing & breakpoint-resolution helpers, separated from the Tailwind
 * plugin glue so they can be unit-tested directly.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseScreen = parseScreen;
exports.resolveBreakpoints = resolveBreakpoints;
exports.resolveBreakpointConfig = resolveBreakpointConfig;
exports.parsePixels = parsePixels;
exports.parseAnchor = parseAnchor;
exports.parseArbitraryValue = parseArbitraryValue;
const fluid_1 = require("./fluid");
// Parses a single theme `screens` value into px.
// Handles "640px", "40rem"/"40em" (× rootFontSize), bare numbers, and the
// object form ({ min, max }) by preferring `min`. Returns NaN if unparseable.
function parseScreen(value, rootFontSize = 16) {
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        const match = value.trim().match(/^(-?[\d.]+)(px|rem|em)?$/);
        if (!match)
            return NaN;
        const numericValue = Number(match[1]);
        if (isNaN(numericValue))
            return NaN;
        return match[2] === "rem" || match[2] === "em"
            ? numericValue * rootFontSize
            : numericValue;
    }
    if (value && typeof value === "object") {
        const screenObject = value;
        if ("min" in screenObject)
            return parseScreen(screenObject.min, rootFontSize);
        if ("max" in screenObject)
            return parseScreen(screenObject.max, rootFontSize);
    }
    return NaN;
}
function resolveBreakpoints(theme, overrides = {}) {
    const breakpointMap = {};
    const screens = theme("screens");
    if (screens && typeof screens === "object") {
        for (const [name, value] of Object.entries(screens)) {
            const pixels = parseScreen(value);
            if (!isNaN(pixels))
                breakpointMap[name] = pixels;
        }
    }
    // Plugin-level overrides win over theme screens.
    for (const [name, pixels] of Object.entries(overrides)) {
        if (typeof pixels === "number" && !isNaN(pixels))
            breakpointMap[name] = pixels;
    }
    return breakpointMap;
}
// Resolves a config breakpoint range to numbers, turning any breakpoint names
// (e.g. "xs", "lg") into px via the resolved breakpoint map. Throws a clear
// error on an unknown name — config mistakes should be loud, not silent.
function resolveBreakpointConfig(range, breakpointMap, label) {
    const resolveEndpoint = (value, field) => {
        if (typeof value === "number")
            return value;
        if (Object.prototype.hasOwnProperty.call(breakpointMap, value)) {
            return breakpointMap[value];
        }
        throw new Error(`createFluidPlugin: unknown breakpoint name "${value}" in ${label}.${field}. ` +
            `Add it to the plugin's \`breakpoints\` option or your tailwind ` +
            `theme.screens, or use a px number.`);
    };
    return {
        minBreakpoint: resolveEndpoint(range.minBreakpoint, "minBreakpoint"),
        maxBreakpoint: resolveEndpoint(range.maxBreakpoint, "maxBreakpoint"),
    };
}
// ─── Arbitrary value parser ───────────────────────────────────────────────────
// Parses the value inside w-fluid-[...] or text-fluid-[...]
//
// Two forms (px suffix optional on every number):
//
//   1. Shorthand — two sizes, scaled across the configured breakpoints:
//        text-fluid-[16_24]
//
//   2. Anchors — a size pinned to an explicit breakpoint with `size@breakpoint`:
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
// An empty numeric part is NaN, not 0 (Number("") is 0) — so a malformed
// token like "16@-320" (empty breakpoint after the inset split) is rejected.
function parsePixels(token) {
    const numericPart = token.endsWith("px") ? token.slice(0, -2) : token;
    return numericPart === "" ? NaN : Number(numericPart);
}
// Parses one `size@breakpoint` or `size@breakpoint-inset` anchor token.
// Returns null if malformed.
function parseAnchor(token, breakpoints) {
    const atIndex = token.indexOf("@");
    if (atIndex < 0)
        return null;
    const size = parsePixels(token.slice(0, atIndex));
    const afterAt = token.slice(atIndex + 1);
    // A registered breakpoint name is used as-is — names may contain "-"
    // (e.g. "tablet-portrait"), so we check the whole token before treating a
    // trailing "-N" as an inset. When it isn't a name we split on the LAST dash,
    // which lets even a hyphenated name carry an inset (e.g. "tablet-portrait-16").
    let breakpointToken = afterAt;
    let inset = 0;
    if (!Object.prototype.hasOwnProperty.call(breakpoints, afterAt)) {
        const dashIndex = afterAt.lastIndexOf("-");
        if (dashIndex >= 0) {
            inset = parsePixels(afterAt.slice(dashIndex + 1));
            breakpointToken = afterAt.slice(0, dashIndex);
        }
    }
    const named = Object.prototype.hasOwnProperty.call(breakpoints, breakpointToken);
    const breakpoint = named ? breakpoints[breakpointToken] : parsePixels(breakpointToken);
    if (isNaN(size) || isNaN(breakpoint) || isNaN(inset))
        return null;
    return { size, breakpoint: breakpoint - inset, named };
}
function parseArbitraryValue(value, fallbackUnit, fallbackRange, breakpoints = {}) {
    // Optional bound markers on the bracket edges break the clamp limits so the
    // value keeps extrapolating along the same slope: a leading "<" opens the
    // floor (keep shrinking past the min breakpoint), a trailing ">" opens the
    // ceiling (keep growing past the max breakpoint). Default: fully clamped.
    let clampMin = true;
    let clampMax = true;
    let body = value;
    if (body.startsWith("<")) {
        clampMin = false;
        body = body.slice(1);
    }
    if (body.endsWith(">")) {
        clampMax = false;
        body = body.slice(0, -1);
    }
    const parts = body.split(" ");
    // An explicit unit token (cqw|cqh|vw) may lead the value; it always wins.
    let inlineUnit = null;
    if ((0, fluid_1.isFluidUnit)(parts[0])) {
        inlineUnit = parts.shift();
    }
    const pickUnit = (named) => inlineUnit !== null && inlineUnit !== void 0 ? inlineUnit : (named ? "vw" : fallbackUnit);
    // ── Anchor form: every token carries an explicit `size@breakpoint` ──────────
    if (parts.some((part) => part.includes("@"))) {
        const anchors = parts.map((part) => parseAnchor(part, breakpoints));
        if (anchors.some((anchor) => anchor === null))
            return null;
        // 3+ anchors (piecewise) are not implemented yet — reserved for later.
        if (anchors.length !== 2)
            return null;
        const [first, second] = anchors;
        // Order by breakpoint so the smaller breakpoint is the min anchor.
        const [lowAnchor, highAnchor] = first.breakpoint <= second.breakpoint ? [first, second] : [second, first];
        try {
            return (0, fluid_1.fluidClamp)({
                minSize: lowAnchor.size,
                maxSize: highAnchor.size,
                minBreakpoint: lowAnchor.breakpoint,
                maxBreakpoint: highAnchor.breakpoint,
                fluidUnit: pickUnit(first.named || second.named),
                clampMin,
                clampMax,
            });
        }
        catch {
            return null;
        }
    }
    // ── Shorthand form: exactly two sizes, across the configured breakpoints ────
    if (parts.length !== 2)
        return null;
    const [minSize, maxSize] = parts.map(parsePixels);
    if (isNaN(minSize) || isNaN(maxSize))
        return null;
    try {
        return (0, fluid_1.fluidClamp)({
            minSize,
            maxSize,
            minBreakpoint: fallbackRange.minBreakpoint,
            maxBreakpoint: fallbackRange.maxBreakpoint,
            fluidUnit: pickUnit(false),
            clampMin,
            clampMax,
        });
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=parse.js.map