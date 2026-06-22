# ba-fluid-clamp

Tailwind CSS plugin for fluid `clamp()` utilities using `cqw`, `cqh`, and `vw`.

Generates fluid type and spacing classes that scale smoothly between a minimum
and maximum size across a container or viewport range.

---

## Install

```bash
pnpm add @basilafro/fluid-clamp
```

---

## Setup

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
| `textBreakpointRange`  | `{ minBreakpoint, maxBreakpoint }`     | `breakpointRange`      | Override the breakpoint range for `text-fluid-*` only        |
| `spaceBreakpointRange` | `{ minBreakpoint, maxBreakpoint }`     | `breakpointRange`      | Override the breakpoint range for spacing utilities only     |
| `textUnit`             | `"vw" \| "cqw" \| "cqh"`               | `unit`                 | Override fluid unit for text only                            |
| `spaceUnit`            | `"vw" \| "cqw" \| "cqh"`               | `unit`                 | Override fluid unit for spacing only                         |

Most projects only need `breakpointRange` and `unit`. The four `text*`/`space*` keys are
escape hatches for the rarer case where text and spacing scale differently
(e.g. text against the viewport, spacing against a component container).

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

Prefixes: `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl`, `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml`, `gap`, `gap-x`, `gap-y`, `w`, `h`

Steps: `1 2 3 4 6 8 10 12 16 20 24`

Example: `p-fluid-4`, `gap-fluid-6`, `w-fluid-12`

---

## Arbitrary values

For one-off values outside the scale, use bracket syntax directly in your JSX.
All numbers are in `px` (the `px` suffix is optional). The same syntax works on
every utility: `text-fluid-[...]`, `p-fluid-[...]`, `w-fluid-[...]`, etc.

### Shorthand — two sizes

Scales between two sizes across the **configured** breakpoints. The first number
is the size at the min breakpoint, the second at the max:

```tsx
<p className="text-fluid-[13_19]" />; // 13px → 19px (grows)
<p className="text-fluid-[19_13]" />; // 19px → 13px (shrinks as the viewport grows)
```

Put the larger size first to **shrink** as the breakpoint grows; two equal sizes
just emit that constant value (`text-fluid-[16_16]` → `1rem`). The same holds for
anchors below.

### Anchors — `size@breakpoint`

Pin a size to an explicit breakpoint with `size@breakpoint`. Order doesn't matter.

```tsx
{
  /* 16px at 320, 24px at 1280 */
}
<p className="text-fluid-[16@320_24@1280]" />;

{
  /* Spacing works the same way */
}
<div className="p-fluid-[8@320_16@1280]" />;
```

The breakpoint can be a **name** — a Tailwind `theme.screens` entry (`sm`, `md`,
`lg`, `xl`, `2xl`, plus custom screens), or a name from the `breakpoints` config.
Names may contain hyphens (e.g. `tablet-portrait`); a registered name is matched
in full before any trailing `-N` is read as an inset:

```tsx
<p className="text-fluid-[16@sm_24@lg]" />;
```

```ts
createFluidPlugin({
  breakpoints: { xs: 480 }, // now usable as text-fluid-[16@xs_24@lg]
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
<p className="text-fluid-[16@320-16_24@1280-24]" />;
```

> 3+ anchors (piecewise / non-linear ramps) are reserved for a future release.

### Breaking the bounds

By default the value is clamped at both ends. To let it keep scaling along the
**same slope** past a breakpoint, open that bound with an edge marker: a leading
`<` opens the floor (keep shrinking past the min breakpoint), a trailing `>` opens
the ceiling (keep growing past the max breakpoint). Works on both shorthand and
anchors, and composes with the unit token and insets.

```tsx
<p className="text-fluid-[16@320_24@1280]" />;   {/* clamp() — bounded both ends (default) */}
<p className="text-fluid-[16@320_24@1280>]" />;  {/* max() — grows past the max bp, floor kept */}
<p className="text-fluid-[<16@320_24@1280]" />;  {/* min() — shrinks past the min bp, ceiling kept */}
<p className="text-fluid-[<16@320_24@1280>]" />; {/* calc() — fully linear, unbounded */}
```

The marker maps to the CSS: open ceiling → `max(floor, …)`, open floor →
`min(ceiling, …)`, both open → a bare `calc(…)`.

### Fluid unit selection

The unit (`vw`, `cqw`, or `cqh`) is chosen automatically, with this precedence:

1. **Inline unit token** — a leading `vw`/`cqw`/`cqh` always wins (explicit opt-in).
2. **Named breakpoint → `vw`** — a named breakpoint is a viewport screen, so it
   selects `vw` automatically (no token needed).
3. **Config default** — `textUnit` / `spaceUnit` (default `vw`).

```tsx
<p className="text-fluid-[16_24]" />;          {/* default → vw */}
<p className="text-fluid-[16@sm_24@lg]" />;    {/* named breakpoint → vw */}
<p className="text-fluid-[cqw_16_24]" />;      {/* inline token → cqw */}
<p className="text-fluid-[cqw_16@sm_24@lg]" />;{/* token wins over the auto rule */}
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

If you don't need to configure anything, use the pre-built plugin:

```ts
import { fluidPlugin } from "@basilafro/fluid-clamp";
plugins: [fluidPlugin];
```

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
