# Changelog

## Unreleased

- Added general `unit` and `bp` config options that apply to both text and
  spacing — the only knobs most projects need. The existing `textUnit`,
  `spaceUnit`, `textBp`, `spaceBp` keys still work and override the general one
  for their target (precedence: per-target → general → default).
- **Breaking:** the default fluid unit is now `vw` (was `cqw`) for both
  `textUnit` and `spaceUnit`, matching the viewport-based breakpoints. Pass
  `textUnit`/`spaceUnit` to restore `cqw`.
- The fluid unit can be selected **per-class** with a leading unit token, e.g.
  `text-fluid-[cqw_15_32]` or `text-fluid-[vw_15_32_sm_lg]`.
- Using a **named breakpoint** (e.g. `text-fluid-[15_32_sm_lg]`) now selects
  `vw` automatically, since named breakpoints are viewport screens. An inline
  unit token still overrides this.
- Arbitrary values accept **breakpoint names** in the `minBp`/`maxBp` slots,
  e.g. `text-fluid-[15_32_sm_lg]`. Names resolve from Tailwind's `theme.screens`
  (including custom screens) and can be mixed with raw px values.
- New `breakpoints` config option on `createFluidPlugin()` to add names that
  aren't Tailwind screens (e.g. `xs`) or override a screen's px value for fluid
  utilities. Merged on top of `theme.screens`.

## 1.0.0 — initial release

- `fluidClamp()` core utility — supports `cqw`, `cqh`, `vw`
- `createFluidPlugin()` factory — configurable breakpoints and fluid units per project
- `fluidPlugin` zero-config export
- Static type scale: `text-fluid-{2xs|xs|sm|base|md|lg|xl|2xl|3xl|4xl}`
- Static space scale: `{p|m|gap|w|h}-fluid-{1|2|3|4|6|8|10|12|16|20|24}` and all directional variants
- Arbitrary value syntax: `text-fluid-[min_max]`, `w-fluid-[min_max_minBp_maxBp_minPad_maxPad_minSub_maxSub]`
- Padding and sibling subtraction via `minPadding`, `maxPadding`, `minSubtract`, `maxSubtract`
