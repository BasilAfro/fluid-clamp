# ba-fluid-clamp

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
`rootFontSize`, plus the per-target overrides `textMinBreakpoint`,
`textMaxBreakpoint`, `spaceMinBreakpoint`, `spaceMaxBreakpoint`, `textUnit`,
`spaceUnit`. They map 1:1 onto the config options table below.

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
keys: `plugins: [fluidClampPlugin({ minBreakpoint: 320, maxBreakpoint: 1280 })]`.

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

| Category                | Prefixes                                                                                          | CSS property                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Typography               | `leading`, `tracking`, `indent`, `word-spacing`                                                    | `line-height`, `letter-spacing`, `text-indent`, `word-spacing`    |
| Borders / outline        | `border`, `border-t`, `border-r`, `border-b`, `border-l`, `outline`, `outline-offset`               | `border(-*)-width`, `outline-width`, `outline-offset`             |
| Border radius             | `rounded`, `rounded-t/r/b/l`, `rounded-tl/tr/br/bl`                                                 | `border-radius` (whole or per-corner)                             |
| Perspective               | `perspective`                                                                                       | `perspective`                                                     |
| Transform (composite)    | `translate-x`, `translate-y`                                                                        | `translate` (v4) / `transform` (v3), via `--tw-translate-x/y`     |
| Filters (composite)      | `blur`, `backdrop-blur`                                                                             | `filter` / `backdrop-filter`, via `--tw-blur`/`--tw-backdrop-blur` |
| Ring (composite)         | `ring`, `ring-offset`                                                                                | `box-shadow`, via the same `--tw-ring-*` variables Tailwind uses  |
| Spacing between children (composite) | `space-x`, `space-y`, `divide-x`, `divide-y`                                              | margin/border-width on `> :not(:last-child)`                      |

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

> 3+ anchors (piecewise / non-linear ramps) are reserved for a future release.

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

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
