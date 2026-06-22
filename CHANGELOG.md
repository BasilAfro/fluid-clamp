# Changelog

## Unreleased

- New: `lengthUnit` (`"rem" | "px"`, default `"rem"`) and `rootFontSize` (default
  `16`) options on `createFluidPlugin()`. They apply to every generated utility —
  static scales and arbitrary values — so a project with a non-default root font
  size can get correct `rem` math, or opt into `px` output. `fluidClamp()` already
  accepted both; this just exposes them at the plugin level.
- Fixed: the class-syntax bound markers (`<`/`>`) are now **positional** — `<`
  opens the min-breakpoint end and `>` the max-breakpoint end, regardless of scale
  direction. Previously they were wired to fixed size bounds (floor/ceiling), so on
  a **shrinking** scale (larger size first) the marker opened the bound at the
  *opposite* breakpoint from where it was written. Growing scales are unaffected.
- **Breaking:** redesigned the arbitrary-value syntax around `size@breakpoint` anchors.
  - Shorthand `text-fluid-[16,24]` (two sizes, config breakpoints) is unchanged.
  - Explicit breakpoints now use anchors: `text-fluid-[16@320,24@1280]`
    (replaces the old positional `[16_24_320_1280]`).
  - Breakpoints accept names: `text-fluid-[16@sm,24@lg]`.
  - Optional per-anchor **inset** `text-fluid-[16@320-16,24@1280-24]` subtracts px
    from a breakpoint directly (replaces the old `_minPad_maxPad_minSub_maxSub`
    positional tail; merged into one value, no `×2`).
  - The old 4-/6-/8-position positional forms are removed from the class syntax;
    the per-anchor inset replaces them.
  - Tokens are now separated by a **comma** (`text-fluid-[16@320,24@1280]`); the
    underscore separator still works as a fallback.
  - (3+ anchors / piecewise ramps are reserved for a future release.)
- Fluid utilities now support **decreasing** sizes — a value that shrinks as the
  breakpoint grows. Put the larger size first: `text-fluid-[24,16]` or
  `text-fluid-[24@320,16@1280]`. `fluidClamp()` accepts `minSize > maxSize`
  (negative slope). Equal sizes are no longer an error: they emit the constant
  value directly (`text-fluid-[16,16]` → `1rem`), so data-driven sizes never need
  to special-case the degenerate case. Only `minBreakpoint >= maxBreakpoint` throws.
- New: **break the clamp bounds** to keep extrapolating along the same slope past
  a breakpoint. In the class syntax, a leading `<` opens the floor and a trailing
  `>` opens the ceiling: `text-fluid-[16@320,24@1280>]` (grows past max, `max()`),
  `text-fluid-[<16@320,24@1280]` (shrinks past min, `min()`),
  `text-fluid-[<16@320,24@1280>]` (fully linear, bare `calc()`). On `fluidClamp()`
  the same is controlled by `clampMin`/`clampMax` (both default `true`). Default
  behavior is unchanged — fully clamped.
- Fixed: breakpoint names containing **hyphens** (e.g. `tablet-portrait`) now
  resolve in anchors. A registered name is matched in full before a trailing
  `-N` is read as an inset (split on the last dash), so a hyphenated name can
  still carry an inset (`16@tablet-portrait-16`). Previously such names silently
  produced no class.
- **Breaking:** removed `minPadding`/`maxPadding`/`minSubtract`/`maxSubtract` from
  `fluidClamp()`. The plugin no longer used them after the anchor redesign, and the
  class-side inset (`size@breakpoint-N`) replaces them. Callers that need a smaller
  effective range now subtract it from `minBreakpoint`/`maxBreakpoint` directly
  (e.g. `minBreakpoint: 320 - 8 * 2`).
- **Breaking:** renamed config and function fields to spell out abbreviations —
  `bp`/`textBp`/`spaceBp` → `breakpointRange`/`textBreakpointRange`/`spaceBreakpointRange`,
  `minBp`/`maxBp` → `minBreakpoint`/`maxBreakpoint`, and `fluidClamp()`'s `rootPx` →
  `rootFontSize`. The `breakpoints` named-map option and `unit`/`textUnit`/`spaceUnit`
  are unchanged.
- Config breakpoint ranges (`breakpointRange`, `textBreakpointRange`,
  `spaceBreakpointRange`) accept **breakpoint names** for `minBreakpoint`/`maxBreakpoint`,
  e.g. `breakpointRange: { minBreakpoint: "xs", maxBreakpoint: "lg" }`. Names resolve
  from `theme.screens` + the `breakpoints` option; an unknown name throws a
  clear build-time error.
- Generated values now use **6 decimal places** (was 4). This keeps the rendered
  size accurate to ~0.00001px at the breakpoints (4 dp left a ~0.001px gap and a
  sub-pixel discontinuity at the limits) and makes fractional-px bounds exact.
- New `breakpoints` config option on `createFluidPlugin()` to add names that
  aren't Tailwind screens (e.g. `xs`) or override a screen's px value for fluid
  utilities. Merged on top of `theme.screens`.
- Added general `unit` and `breakpointRange` config options that apply to both
  text and spacing — the only knobs most projects need. The existing `textUnit`,
  `spaceUnit`, `textBreakpointRange`, `spaceBreakpointRange` keys still work and
  override the general one for their target (precedence: per-target → general → default).
- **Breaking:** the default fluid unit is now `vw` (was `cqw`) for both
  `textUnit` and `spaceUnit`, matching the viewport-based breakpoints. Pass
  `textUnit`/`spaceUnit` to restore `cqw`.
- The fluid unit can be selected **per-class** with a leading unit token, e.g.
  `text-fluid-[cqw,16,24]` or `text-fluid-[cqw,16@sm,24@lg]`.
- Using a **named breakpoint** (e.g. `text-fluid-[16@sm,24@lg]`) selects `vw`
  automatically, since named breakpoints are viewport screens. An inline unit
  token still overrides this.

## 1.0.0 — initial release

- `fluidClamp()` core utility — supports `cqw`, `cqh`, `vw`
- `createFluidPlugin()` factory — configurable breakpoints and fluid units per project
- `fluidPlugin` zero-config export
- Static type scale: `text-fluid-{2xs|xs|sm|base|md|lg|xl|2xl|3xl|4xl}`
- Static space scale: `{p|m|gap|w|h}-fluid-{1|2|3|4|6|8|10|12|16|20|24}` and all directional variants
- Arbitrary value syntax: `text-fluid-[min_max]`, `w-fluid-[min_max_minBp_maxBp_minPad_maxPad_minSub_maxSub]`
- Padding and sibling subtraction via `minPadding`, `maxPadding`, `minSubtract`, `maxSubtract`
