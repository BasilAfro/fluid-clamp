# @basilafro/fluid-clamp

Tailwind CSS plugin for fluid `clamp()` utilities using `cqw`, `cqh`, and `vw`.
Works with Tailwind CSS **v3** (JS config) and **v4** (CSS-first `@plugin`).

Generates fluid type and spacing classes that scale smoothly between a minimum
and maximum size across a container or viewport range.

---

## Install

```bash
pnpm add @basilafro/fluid-clamp
```

---

## Setup — Tailwind v4 (CSS-first)

Register the plugin in your CSS with `@plugin`:

```css
/* app.css */
@import "tailwindcss";
@plugin "@basilafro/fluid-clamp";
```

Options go in a block. `@plugin` blocks only carry flat key/value pairs, so the
breakpoint ranges are spelled out as two keys (this is the flat form of
`breakpointRange` below):

```css
@plugin "@basilafro/fluid-clamp" {
  minBreakpoint: 320; /* px number or breakpoint name, e.g. sm */
  maxBreakpoint: 1280;
  unit: vw; /* default — see "Fluid unit selection" below */
}
```

Flat option keys: `minBreakpoint`, `maxBreakpoint`, `unit`, `lengthUnit`,
`rootFontSize`, `cssApi`, plus the per-target overrides `textMinBreakpoint`,
`textMaxBreakpoint`, `spaceMinBreakpoint`, `spaceMaxBreakpoint`, `textUnit`,
`spaceUnit`. They map 1:1 onto the config options table below. (`breakpoints`
and `fluidVars` are absent by necessity — they need nested values, which
`@plugin` blocks can't carry.)

Named breakpoints come straight from your `@theme` — every `--breakpoint-*`
variable is usable in anchors and options, no plugin config needed:

```css
@theme {
  --breakpoint-xs: 30rem; /* usable as text-fluid-[15@xs,32@lg] */
}
```

> Need the nested config or the `breakpoints` override map? Load a JS config
> with `@config "./tailwind.config.ts"` and register `createFluidPlugin({ … })`
> there — same as the v3 setup below.

The default export also works from a JS config (v3 or v4), taking the same flat
keys — plus the nested ones the CSS form can't express (`breakpoints`,
`fluidVars`, `breakpointRange`, …):

```ts
plugins: [fluidClampPlugin({ minBreakpoint: 320, maxBreakpoint: 1280 })];
```

> **Using it from a Tailwind v3 config?** Pass `cssApi: "v3"`. The default
> export assumes `"v4"` (it's the CSS-first entry point), and on v3 that makes
> the [composite utilities](#config-options) emit v4's internal variables, so
> they silently stop composing with native `rotate-*`/`ring-*`. Everything else
> is unaffected. `createFluidPlugin` already defaults to `"v3"`, so on a v3
> project it's the simpler choice.

---

## Setup — Tailwind v3 (JS config)

### 1. Register the plugin

```ts
// tailwind.config.ts
import { createFluidPlugin } from "@basilafro/fluid-clamp";

export default {
  plugins: [
    createFluidPlugin({
      breakpointRange: { minBreakpoint: 320, maxBreakpoint: 1280 }, // viewport range to scale across
      unit: "vw", // default — see "Fluid unit selection" below
    }),
  ],
};
```

> `breakpointRange` and `unit` apply to both text and spacing. Override just one
> with `textBreakpointRange`/`spaceBreakpointRange` or `textUnit`/`spaceUnit`
> (see Config options).

### 2. (Only for `cqw`/`cqh`) set container-type

The default unit is `vw`, which is relative to the viewport and needs **no
setup**. You only need `container-type` if you opt into container units
(`cqw`/`cqh`) — either as the config default or per-class with a unit token.

```css
/* required only when using cqw */
.page-container {
  max-width: 1280px;
  margin-inline: auto;
  container-type: inline-size;
}
```

---

## Config options

| Option                 | Type                                   | Default                | Description                                                  |
| ---------------------- | -------------------------------------- | ---------------------- | ------------------------------------------------------------ |
| `breakpointRange`      | `{ minBreakpoint, maxBreakpoint }`     | `{ 320, 1280 }`        | Breakpoint range for **all** fluid utilities                 |
| `unit`                 | `"vw" \| "cqw" \| "cqh"`               | `"vw"`                 | Default fluid unit for **all** utilities (overridable per-class) |
| `breakpoints`          | `Record<string, number>`               | `{}`                   | Extra/override named breakpoints for arbitrary values (px)   |
| `lengthUnit`           | `"rem" \| "px"`                        | `"rem"`                | Unit for the generated min/max/intercept lengths (not the fluid unit) |
| `rootFontSize`         | `number`                               | `16`                   | Root font size (px) for px→rem conversion; only affects `rem` output |
| `textBreakpointRange`  | `{ minBreakpoint, maxBreakpoint }`     | `breakpointRange`      | Override the breakpoint range for `text-fluid-*` only        |
| `spaceBreakpointRange` | `{ minBreakpoint, maxBreakpoint }`     | `breakpointRange`      | Override the breakpoint range for spacing utilities only     |
| `textUnit`             | `"vw" \| "cqw" \| "cqh"`               | `unit`                 | Override fluid unit for text only                            |
| `spaceUnit`            | `"vw" \| "cqw" \| "cqh"`               | `unit`                 | Override fluid unit for spacing only                         |
| `cssApi`               | `"v3" \| "v4"`                         | see below              | Which Tailwind major version's formula to use for composite utilities |
| `fluidVars`            | `Record<string, string>`               | `{}`                   | Fluid CSS custom properties (`:root` overrides) — see below   |

Most projects only need `breakpointRange` and `unit`. The four `text*`/`space*` keys are
escape hatches for the rarer case where text and spacing scale differently
(e.g. text against the viewport, spacing against a component container).

`cssApi` only affects the [composite utilities](#arbitrary-only-utilities-no-static-scale-yet)
(`translate-x/y`, `blur`, `backdrop-blur`, `ring`, `ring-offset`, `space-x/y`,
`divide-x/y`) — it defaults to `"v3"` from `createFluidPlugin` and `"v4"` from
the default `@plugin`/CSS-first export, matching each entry point's usual
Tailwind version. Override it explicitly if that doesn't hold for your setup —
for example, a Tailwind v4 project that still runs plugins through v4's legacy
JS-config compat mode, where other utilities on the page may still compose the
v3 way even though npm has v4 installed:

```ts
// Tailwind v4 project using the legacy JS-config compat path
createFluidPlugin({ cssApi: "v3" }); // instead of the "v4" you might expect
```

```css
/* Tailwind v3 project loading the CSS-first entry via a compat shim */
@plugin "@basilafro/fluid-clamp" {
  cssApi: v3;
}
```

Picking the wrong `cssApi` doesn't break the plain-property utilities (`p-fluid-*`,
`border-fluid-*`, etc.) — only the composite ones, which would then use the
wrong internal variable names and stop composing with Tailwind's own
`rotate-*`/`scale-*`, other filter utilities, `ring-color`, etc. on the same
element.

`minBreakpoint`/`maxBreakpoint` (in `breakpointRange`, `textBreakpointRange`,
`spaceBreakpointRange`) accept either a px number or a **breakpoint name** — a
Tailwind `theme.screens` entry or a name from the `breakpoints` option:

```ts
createFluidPlugin({
  breakpoints: { xs: 480 }, // adds a name not in theme.screens
  breakpointRange: { minBreakpoint: "xs", maxBreakpoint: "lg" }, // scale across xs(480) → lg(1024)
});
```

An unknown name throws a clear config error at build time.

### `fluidVars` — fluid CSS custom properties

`fluidVars` emits `:root` overrides instead of utility classes — handy for
overriding Tailwind's own scale variables (`--text-xs`, `--text-sm`, …) or any
global design token across breakpoints, without needing an element to carry a
class:

```ts
createFluidPlugin({
  fluidVars: {
    "text-xs": "10@390,11@768,12@1280",
    "text-sm": "11@390,12@768,14@1280",
  },
});
```

```css
/* generated */
:root {
  --text-xs: clamp(0.625rem, 0.26455vw + 0.560516rem, 0.6875rem);
}
@media (min-width: 768px) {
  :root {
    --text-xs: clamp(0.6875rem, 0.195313vw + 0.59375rem, 0.75rem);
  }
}
```

Each key becomes `--${key}`; each value is parsed with the **exact same
arbitrary-value grammar** as `text-fluid-[...]` (minus the brackets) —
shorthand, anchors, named breakpoints, insets, the unit token, and bound
markers all work identically, including [piecewise ramps](#piecewise-ramps--3-anchors)
for 3+ anchors (shown above: a base declaration plus one `@media` override per
extra anchor). Values are resolved against the same `textUnit`/
`textBreakpointRange` as `text-fluid-*`, so a shorthand value like `"10,12"`
scales across `textBreakpointRange`.

An unparsable value throws a clear config error at build time, the same way
an unknown breakpoint name does.

> `@plugin` blocks only carry flat key/value pairs, so `fluidVars` (like
> `breakpoints`) is JS-config-only — load one via `@config "./tailwind.config.ts"`
> and register `createFluidPlugin({ fluidVars: { ... } })` there.

---

## Classes

### Type scale

| Class             | Min  | Max  |
| ----------------- | ---- | ---- |
| `text-fluid-2xs`  | 10px | 12px |
| `text-fluid-xs`   | 12px | 14px |
| `text-fluid-sm`   | 14px | 16px |
| `text-fluid-base` | 16px | 18px |
| `text-fluid-md`   | 18px | 22px |
| `text-fluid-lg`   | 20px | 28px |
| `text-fluid-xl`   | 24px | 36px |
| `text-fluid-2xl`  | 32px | 48px |
| `text-fluid-3xl`  | 40px | 64px |
| `text-fluid-4xl`  | 48px | 80px |

### Space scale

Prefixes: `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl`, `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml`,
`gap`, `gap-x`, `gap-y`, `w`, `h`, `min-w`, `max-w`, `min-h`, `max-h`, `size`,
`top`, `right`, `bottom`, `left`, `inset`, `inset-x`, `inset-y`, `start`, `end`,
`basis`, `scroll-m`, `scroll-mx`, `scroll-my`, `scroll-mt`, `scroll-mr`, `scroll-mb`,
`scroll-ml`, `scroll-p`, `scroll-px`, `scroll-py`, `scroll-pt`, `scroll-pr`,
`scroll-pb`, `scroll-pl`

Steps: `1 2 3 4 6 8 10 12 16 20 24`

Example: `p-fluid-4`, `gap-fluid-6`, `w-fluid-12`, `inset-fluid-4`, `size-fluid-8`

`start`/`end` are the logical (RTL-aware) equivalents of `left`/`right` —
`inset-inline-start`/`inset-inline-end`. `size` sets `width` and `height`
together from the same clamp value.

### Arbitrary-only utilities (no static scale yet)

These utilities only support the [arbitrary-value syntax](#arbitrary-values)
below (e.g. `border-fluid-[1,4]`) — their px ranges vary too much from the
space scale above to reuse it, so v1 ships arbitrary values only and leaves a
curated default scale for a future release.

`perspective-fluid-*` is only registered under Tailwind v4 (i.e. `cssApi: "v4"`,
the default for the CSS-first `@plugin` entry point) — Tailwind v3 never
shipped a native `perspective` utility, so this plugin doesn't invent one for it.

| Category                | Prefixes                                                                                          | CSS property                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Typography               | `leading`, `tracking`, `indent`                                                                    | `line-height`, `letter-spacing`, `text-indent`                    |
| Borders / outline        | `border`, `border-t`, `border-r`, `border-b`, `border-l`, `outline`, `outline-offset`               | `border(-*)-width`, `outline-width`, `outline-offset`             |
| Border radius             | `rounded`, `rounded-t/r/b/l`, `rounded-tl/tr/br/bl`                                                 | `border-radius` (whole or per-corner)                             |
| Perspective (v4 only)     | `perspective`                                                                                       | `perspective`                                                     |
| Transform (composite)    | `translate-x`, `translate-y`                                                                        | `translate` (v4) / `transform` (v3), via `--tw-translate-x/y`     |
| Filters (composite)      | `blur`, `backdrop-blur`                                                                             | `filter` / `backdrop-filter`, via `--tw-blur`/`--tw-backdrop-blur` |
| Ring (composite)         | `ring`, `ring-offset`                                                                                | `box-shadow`, via the same `--tw-ring-*` variables Tailwind uses  |
| Spacing between children (composite) | `space-x`, `space-y`, `divide-x`, `divide-y`                                              | margin/border-width on a child selector — `:where(& > :not(:last-child))` (v4) / `> :not([hidden]) ~ :not([hidden])` (v3) |

Example: `border-fluid-[1,4]`, `rounded-tl-fluid-[4,12]`, `leading-fluid-[16,24]`,
`translate-x-fluid-[8,24]`, `space-x-fluid-[8,16]`.

The **composite** utilities above don't set a plain CSS property — they write
to the same internal CSS variables Tailwind's own `translate-*`/`rotate-*`/
`scale-*`, `blur-*`/other filter utilities, `ring-*`, and `space-x/y`/
`divide-x/y` utilities use, so they compose correctly with those native
utilities on the same element (e.g. `translate-x-fluid-[8,24]` and `rotate-45`
both apply). The exact formula is resolved automatically for Tailwind v3 vs
v4, since the two versions compose these differently under the hood.

---

## Arbitrary values

For one-off values outside the scale, use bracket syntax directly in your JSX.
All numbers are in `px` (the `px` suffix is optional). The same syntax works on
every utility: `text-fluid-[...]`, `p-fluid-[...]`, `w-fluid-[...]`, etc.

Tokens are separated by a **comma**. (An underscore — Tailwind's space escape —
also works, so `text-fluid-[16@320_24@1280]` is accepted as well.)

### Shorthand — two sizes

Scales between two sizes across the **configured** breakpoints. The first number
is the size at the min breakpoint, the second at the max:

```tsx
<p className="text-fluid-[13,19]" />; // 13px → 19px (grows)
<p className="text-fluid-[19,13]" />; // 19px → 13px (shrinks as the viewport grows)
```

Put the larger size first to **shrink** as the breakpoint grows; two equal sizes
just emit that constant value (`text-fluid-[16,16]` → `1rem`). The same holds for
anchors below.

### Negative values

Margins, insets, scroll-margins and translates come in negative form on the
static scale, exactly as they do in Tailwind:

```tsx
<div className="-mt-fluid-4" />;  {/* margin-top: clamp(-1.5rem, -0.833333vw - 0.833333rem, -1rem) */}
```

For arbitrary values, put the signs **inside** the bracket:

```tsx
<div className="mt-fluid-[-8,-16]" />;   {/* ✅ */}
<div className="-mt-fluid-[8,16]" />;    {/* ❌ produces nothing */}
```

The `-` prefix doesn't work on arbitrary values: Tailwind rejects a negative
candidate whose value contains a comma before this plugin's matcher ever runs,
and the bracket grammar is comma-based. Both forms are equally expressive —
`mt-fluid-[-8,-16]` is simply where the sign has to go.

Only the prefixes Tailwind itself makes negatable get a negative form
(`m*`, `inset*`/`top`/`right`/`bottom`/`left`/`start`/`end`, `translate-x/y`,
`scroll-m*`). `-p-fluid-4` doesn't exist, the same way `-p-4` doesn't.

### Anchors — `size@breakpoint`

Pin a size to an explicit breakpoint with `size@breakpoint`. Order doesn't matter.

```tsx
{
  /* 16px at 320, 24px at 1280 */
}
<p className="text-fluid-[16@320,24@1280]" />;

{
  /* Spacing works the same way */
}
<div className="p-fluid-[8@320,16@1280]" />;
```

The breakpoint can be a **name** — a Tailwind screen (`sm`, `md`, `lg`, `xl`,
`2xl`, plus custom ones — `theme.screens` in v3, `--breakpoint-*` theme
variables in v4), or a name from the `breakpoints` config.
Names may contain hyphens (e.g. `tablet-portrait`); a registered name is matched
in full before any trailing `-N` is read as an inset:

```tsx
<p className="text-fluid-[16@sm,24@lg]" />;
```

```ts
createFluidPlugin({
  breakpoints: { xs: 480 }, // now usable as text-fluid-[16@xs,24@lg]
});
```

#### Inset

Append `-N` to a breakpoint to subtract `N` px from it — handy for accounting
for container padding or fixed sibling elements. It's subtracted **directly**
(no doubling):

```tsx
{
  /* effective range 304 → 1256 (320−16, 1280−24) */
}
<p className="text-fluid-[16@320-16,24@1280-24]" />;
```

### Piecewise ramps — 3+ anchors

Add more anchors to ramp through multiple slopes instead of a single clamp —
handy for a type/spacing scale that should grow faster after a given
breakpoint (e.g. a headline that barely grows on mobile, then accelerates from
tablet up). Order doesn't matter; anchors are sorted by breakpoint internally:

```tsx
<h1 className="text-fluid-[24@390,28@640,42@768,48@1024]" />
```

This compiles to **one class** with a base `clamp()` plus a stacked
`@media (min-width: …)` override per extra anchor — each pair of consecutive
anchors gets its own two-point clamp, valid from its lower anchor's breakpoint
up:

```css
.text-fluid-\[24\@390\2c 28\@640\2c 42\@768\2c 48\@1024\] {
  font-size: clamp(1.5rem, 1.6vw + 1.11rem, 1.75rem); /* 24→28px, 390 → 640 */
}
@media (min-width: 640px) {
  .text-fluid-\[24\@390\2c 28\@640\2c 42\@768\2c 48\@1024\] {
    font-size: clamp(1.75rem, 10.9375vw - 2.625rem, 2.625rem); /* 28→42px, 640 → 768 */
  }
}
@media (min-width: 768px) {
  .text-fluid-\[24\@390\2c 28\@640\2c 42\@768\2c 48\@1024\] {
    font-size: clamp(2.625rem, 2.34375vw + 1.5rem, 3rem); /* 42→48px, 768 → 1024 */
  }
}
```

Sizes are written in px but emitted in `rem` (the `lengthUnit` default, which
respects the reader's browser font-size preference) — 24px → `1.5rem` at the
default `rootFontSize` of 16. Pass `lengthUnit: "px"` to get px out.

Works with named breakpoints, insets, the unit token, and every other
`*-fluid-[...]` prefix (spacing, typography, border, composite) — it's the
same anchor syntax, just with more than two anchors. Bound markers (`<`/`>`)
still apply to the true outer ends only — `<` opens the floor of the first
segment, `>` the ceiling of the last one; interior segments stay fully clamped
since they're bounded by real anchors on both sides:

```tsx
<h1 className="text-fluid-[<24@390,28@640,42@768,48@1024>]" />
```

> Want a reusable named utility (`text-h1`, `text-display-1`, …) instead of
> repeating the bracket value? Define it as your own `@utility` (v4) or
> `@layer components` (v3) rule composed with `@apply`:
> `@utility text-h1 { @apply text-fluid-[24@390,28@640,42@768,48@1024]; }`

### Breaking the bounds

By default the value is clamped at both ends. To let it keep scaling along the
**same slope** past a breakpoint, open that bound with an edge marker. The markers
are **positional** — they open the breakpoint end they sit next to: a leading `<`
opens the **min-breakpoint** end, a trailing `>` opens the **max-breakpoint** end.
Works on both shorthand and anchors, and composes with the unit token and insets.

```tsx
<p className="text-fluid-[16@320,24@1280]" />;   {/* clamp() — bounded both ends (default) */}
<p className="text-fluid-[16@320,24@1280>]" />;  {/* opens the 1280 end — keeps growing past 24px */}
<p className="text-fluid-[<16@320,24@1280]" />;  {/* opens the 320 end — keeps shrinking below 16px */}
<p className="text-fluid-[<16@320,24@1280>]" />; {/* calc() — fully linear, unbounded */}
```

For a **growing** scale (the common case) opening the max-breakpoint end emits
`max(floor, …)` and opening the min-breakpoint end emits `min(ceiling, …)`.
Because the markers track the breakpoint end — not a fixed size bound — a
**shrinking** scale (larger size first) flips which CSS function you get: there
the smaller size sits at the max breakpoint, so `>` opens the floor (`min(…)`) and
`<` opens the ceiling (`max(…)`). Either way, the end you mark keeps extrapolating
and the other end stays clamped; opening both yields a bare `calc(…)`.

### Fluid unit selection

The unit (`vw`, `cqw`, or `cqh`) is chosen automatically, with this precedence:

1. **Inline unit token** — a leading `vw`/`cqw`/`cqh` always wins (explicit opt-in).
2. **Named breakpoint → `vw`** — a named breakpoint is a viewport screen, so it
   selects `vw` automatically (no token needed).
3. **Config default** — `textUnit` / `spaceUnit` (default `vw`).

```tsx
<p className="text-fluid-[16,24]" />;          {/* default → vw */}
<p className="text-fluid-[16@sm,24@lg]" />;    {/* named breakpoint → vw */}
<p className="text-fluid-[cqw,16,24]" />;      {/* inline token → cqw */}
<p className="text-fluid-[cqw,16@sm,24@lg]" />;{/* token wins over the auto rule */}
```

> `cqw`/`cqh` are container-relative and require `container-type` on an ancestor;
> `vw` is viewport-relative and needs no setup. An unknown breakpoint name (or any
> malformed value) produces no class, the same way an invalid number does.

> **Note:** Tailwind scans files statically. If you build a class name dynamically
> at runtime, use the `fluidClamp()` function in an inline style instead.

---

## Direct function usage

```ts
import { fluidClamp } from "@basilafro/fluid-clamp";

// anywhere you need a clamp string
const fontSize = fluidClamp({
  minSize: 14,
  maxSize: 22,
  minBreakpoint: 304,
  maxBreakpoint: 1074,
  fluidUnit: "cqw",
});
// → "clamp(0.875rem, 1.038961cqw + 0.677597rem, 1.375rem)"

// Open a bound to extrapolate past it along the same slope:
fluidClamp({ minSize: 14, maxSize: 22, minBreakpoint: 304, maxBreakpoint: 1074, fluidUnit: "cqw", clampMax: false });
// → "max(0.875rem, 1.038961cqw + 0.677597rem)"  (grows past the max breakpoint)
```

`clampMin`/`clampMax` default to `true`. Set either to `false` to drop that bound
(`min()`/`max()`); drop both for a bare `calc()`.

### Other exports

| Export | Type | Use |
| ------ | ---- | --- |
| `DEFAULT_TYPE_SCALE`, `DEFAULT_SPACE_SCALE` | `Record<string, { minSize, maxSize }>` | The px tables backing `text-fluid-lg`, `p-fluid-4`, … — read them to mirror the scale elsewhere, or feed entries to `fluidClamp()` directly |
| `isFluidUnit` | `(value: string) => value is FluidUnit` | Narrowing guard for `vw`/`cqw`/`cqh`, e.g. when validating your own config input |
| `normalizeOptions` | `(options: FluidPluginOptions) => FluidPluginConfig` | Turns the flat CSS-first keys into the nested config shape; exported mainly for wrapping the plugin in your own preset |
| `FluidUnit`, `LengthUnit`, `CssApi`, `ScaleEntry`, `FluidClampOptions`, `FluidPluginConfig`, `FluidPluginOptions`, `FluidPluginCssOptions`, `BreakpointConfig` | types | For typing your own config objects and wrappers |

---

## Zero-config

If you don't need to configure anything, in v4 the bare `@plugin` line is all
there is:

```css
@plugin "@basilafro/fluid-clamp";
```

In a JS config, use the pre-built plugin:

```ts
import { fluidPlugin } from "@basilafro/fluid-clamp";
plugins: [fluidPlugin];
```

---

## `tailwind-merge` / `cn()` integration

`tailwind-merge` only knows Tailwind's built-in scales, so `p-fluid-4`,
`w-fluid-[16,24]`, `text-fluid-lg`, etc. either land in the wrong class group
(silently overwritten by an unrelated native utility) or form a lone group
that never dedupes against a repeat of itself. The `@basilafro/fluid-clamp/tw-merge`
subpath fixes that — it's a separate entry point so importing the main
package never pulls in `clsx`/`tailwind-merge` for projects that don't use them.

```
pnpm add clsx tailwind-merge
```

Drop-in `cn()`:

```ts
import { cn } from "@basilafro/fluid-clamp/tw-merge";

cn("p-4", "p-fluid-4"); // → "p-fluid-4"
cn("ring-fluid-4", "ring-2"); // → "ring-2"
cn("text-fluid-lg", "text-red-500"); // → "text-fluid-lg text-red-500"
```

Composing with your own `extendTailwindMerge` config (e.g. a custom
`font-size` scale) — your `classGroups` entries are added to fluid-clamp's,
not replaced by them:

```ts
import { createFluidTwMerge } from "@basilafro/fluid-clamp/tw-merge";

export const cn = createFluidTwMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["heading-lg", "heading-sm"] }],
    },
  },
});
```

The raw `fluidClassGroups` fragment is also exported for consumers who want
to wire it into their own `extendTailwindMerge` call directly.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
