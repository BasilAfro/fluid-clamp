# @BasilAfro/fluid-clamp

Tailwind CSS plugin for fluid `clamp()` utilities using `cqw`, `cqh`, and `vw`.

Generates fluid type and spacing classes that scale smoothly between a minimum
and maximum size across a container or viewport range.

---

## Install

```bash
npm install @BasilAfro/fluid-clamp
```

---

## Setup

### 1. Register the plugin

```ts
// tailwind.config.ts
import { createFluidPlugin } from "@BasilAfro/fluid-clamp";

export default {
  plugins: [
    createFluidPlugin({
      textBp: { minBp: 320, maxBp: 1280 }, // available space after page container padding
      spaceBp: { minBp: 320, maxBp: 1280 },
      textUnit: "cqw",
      spaceUnit: "cqw",
    }),
  ],
};
```

### 2. Set container-type on your page container

```css
.page-container {
  max-width: 1280px;
  margin-inline: auto;
  padding-inline: 8px;
  container-type: inline-size; /* required for cqw */
}
```

Cards or components that use `cqw` inside them also need it:

```css
.card {
  container-type: inline-size;
}
```

---

## Config options

| Option      | Type                     | Default         | Description                       |
| ----------- | ------------------------ | --------------- | --------------------------------- |
| `textBp`    | `{ minBp, maxBp }`       | `{ 320, 1280 }` | Breakpoints for `text-fluid-*`    |
| `spaceBp`   | `{ minBp, maxBp }`       | `{ 320, 1280 }` | Breakpoints for spacing utilities |
| `textUnit`  | `"cqw" \| "cqh" \| "vw"` | `"cqw"`         | Fluid unit for text               |
| `spaceUnit` | `"cqw" \| "cqh" \| "vw"` | `"cqw"`         | Fluid unit for spacing            |

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
All values are in `px`.

```
text-fluid-[minSize_maxSize]
text-fluid-[minSize_maxSize_minBp_maxBp]
text-fluid-[minSize_maxSize_minBp_maxBp_minPad_maxPad]
text-fluid-[minSize_maxSize_minBp_maxBp_minPad_maxPad_minSubtract_maxSubtract]
```

Same syntax works for all spacing utilities: `p-fluid-[...]`, `w-fluid-[...]`, etc.

### Examples

```tsx
{
  /* Uses config breakpoints */
}
<p className="text-fluid-[13_19]" />;

{
  /* Card 140→260px with 8→12px padding — available space 124→236px */
}
<div className="w-fluid-[120_200_140_260_8_12]" />;

{
  /* Row layout: subtract icon(24→32px) + gap(6→8px) */
}
<p className="text-fluid-[12_18_140_260_8_12_30_40]" />;
```

> **Note:** Tailwind scans files statically. If you build a class name dynamically
> at runtime, use the `fluidClamp()` function in an inline style instead.

---

## Direct function usage

```ts
import { fluidClamp } from "@BasilAfro/fluid-clamp";

// anywhere you need a clamp string
const fontSize = fluidClamp({
  minSize: 14,
  maxSize: 22,
  minBp: 304,
  maxBp: 1074,
  fluidUnit: "cqw",
});
// → "clamp(0.875rem, 2.1739cqw + 0.1875rem, 1.375rem)"
```

---

## Zero-config

If you don't need to configure anything, use the pre-built plugin:

```ts
import { fluidPlugin } from "@BasilAfro/fluid-clamp";
plugins: [fluidPlugin];
```

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
