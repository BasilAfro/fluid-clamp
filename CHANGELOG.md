# Changelog

## 1.0.0 — initial release

- `fluidClamp()` core utility — supports `cqw`, `cqh`, `vw`
- `createFluidPlugin()` factory — configurable breakpoints and fluid units per project
- `fluidPlugin` zero-config export
- Static type scale: `text-fluid-{2xs|xs|sm|base|md|lg|xl|2xl|3xl|4xl}`
- Static space scale: `{p|m|gap|w|h}-fluid-{1|2|3|4|6|8|10|12|16|20|24}` and all directional variants
- Arbitrary value syntax: `text-fluid-[min_max]`, `w-fluid-[min_max_minBp_maxBp_minPad_maxPad_minSub_maxSub]`
- Padding and sibling subtraction via `minPadding`, `maxPadding`, `minSubtract`, `maxSubtract`
