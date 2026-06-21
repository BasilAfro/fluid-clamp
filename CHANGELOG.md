# Changelog

## Unreleased

- **Breaking:** redesigned the arbitrary-value syntax around `size@bp` anchors.
  - Shorthand `text-fluid-[16_24]` (two sizes, config breakpoints) is unchanged.
  - Explicit breakpoints now use anchors: `text-fluid-[16@320_24@1280]`
    (replaces the old positional `[16_24_320_1280]`).
  - Breakpoints accept names: `text-fluid-[16@sm_24@lg]`.
  - Optional per-anchor **inset** `text-fluid-[16@320-16_24@1280-24]` subtracts px
    from a breakpoint directly (replaces the old `_minPad_maxPad_minSub_maxSub`
    positional tail; merged into one value, no `×2`).
  - The old 4-/6-/8-position positional forms are removed from the class syntax.
    `padding`/`subtract` remain available on the `fluidClamp()` function.
  - (3+ anchors / piecewise ramps are reserved for a future release.)
- Config breakpoints (`bp`, `textBp`, `spaceBp`) accept **breakpoint names**
  for `minBp`/`maxBp`, e.g. `bp: { minBp: "xs", maxBp: "lg" }`. Names resolve
  from `theme.screens` + the `breakpoints` option; an unknown name throws a
  clear build-time error.
- New `breakpoints` config option on `createFluidPlugin()` to add names that
  aren't Tailwind screens (e.g. `xs`) or override a screen's px value for fluid
  utilities. Merged on top of `theme.screens`.
- Added general `unit` and `bp` config options that apply to both text and
  spacing — the only knobs most projects need. The existing `textUnit`,
  `spaceUnit`, `textBp`, `spaceBp` keys still work and override the general one
  for their target (precedence: per-target → general → default).
- **Breaking:** the default fluid unit is now `vw` (was `cqw`) for both
  `textUnit` and `spaceUnit`, matching the viewport-based breakpoints. Pass
  `textUnit`/`spaceUnit` to restore `cqw`.
- The fluid unit can be selected **per-class** with a leading unit token, e.g.
  `text-fluid-[cqw_16_24]` or `text-fluid-[cqw_16@sm_24@lg]`.
- Using a **named breakpoint** (e.g. `text-fluid-[16@sm_24@lg]`) selects `vw`
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
