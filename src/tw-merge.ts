/**
 * tw-merge.ts
 * Optional tailwind-merge/clsx integration — imported from the
 * "@basilafro/fluid-clamp/tw-merge" subpath so consumers who don't use
 * tailwind-merge never pull it (or clsx) in.
 *
 * tailwind-merge only knows Tailwind's built-in scales. Every utility this
 * plugin generates (`p-fluid-4`, `w-fluid-[16,24]`, `text-fluid-lg`, …) falls
 * outside those scales, so without this it either drops into the wrong class
 * group (silently overwritten by an unrelated native utility) or forms its
 * own single-class group (never deduped against a repeated fluid utility of
 * the same kind). This registers every fluid-clamp prefix under the native
 * class group it actually competes with — the exact conflicts each generated
 * utility produces are documented next to `SPACE_PROPS`/`COMPOSITE_PROPS` in
 * plugin.ts and `COMPOSITE_PROPS` in composite.ts.
 */

import { clsx, type ClassValue } from "clsx";
import {
  extendTailwindMerge,
  type ConfigExtension,
  type DefaultClassGroupIds,
  type DefaultThemeGroupIds,
} from "tailwind-merge";

// Every fluid-clamp class is `${prefix}-fluid-${rest}` — either a static scale
// key (`fluid-4`, `fluid-lg`) or an arbitrary value (`fluid-[16,24]`). Once
// tailwind-merge strips the `${prefix}-` root, what's left always starts with
// "fluid-", regardless of which form it is.
const isFluidValue = (value: string) => value.startsWith("fluid-");

// tailwind-merge doesn't export its internal `ClassGroup`/`ClassObject`
// types, so this mirrors the subset of their shape this file actually uses:
// `{ [groupId]: [{ [classPart]: [validator, ...] }] }`.
type FluidClassGroupEntry = readonly Record<string, readonly ((classPart: string) => boolean)[]>[];

/**
 * `extend.classGroups` fragment for `extendTailwindMerge`, covering every
 * class this plugin generates — every one of them extends a utility Tailwind
 * itself already ships, so every entry here maps onto an existing native
 * `DefaultClassGroupIds` group rather than inventing a new one. Spread it
 * into your own config if you need to add more `extend` options — see
 * `createFluidTwMerge` for the ready-made merge function.
 */
export const fluidClassGroups: Partial<
  Record<DefaultClassGroupIds, FluidClassGroupEntry>
> = {
  // Padding / margin
  p: [{ p: [isFluidValue] }],
  px: [{ px: [isFluidValue] }],
  py: [{ py: [isFluidValue] }],
  pt: [{ pt: [isFluidValue] }],
  pr: [{ pr: [isFluidValue] }],
  pb: [{ pb: [isFluidValue] }],
  pl: [{ pl: [isFluidValue] }],
  m: [{ m: [isFluidValue] }],
  mx: [{ mx: [isFluidValue] }],
  my: [{ my: [isFluidValue] }],
  mt: [{ mt: [isFluidValue] }],
  mr: [{ mr: [isFluidValue] }],
  mb: [{ mb: [isFluidValue] }],
  ml: [{ ml: [isFluidValue] }],
  // Gap
  gap: [{ gap: [isFluidValue] }],
  "gap-x": [{ "gap-x": [isFluidValue] }],
  "gap-y": [{ "gap-y": [isFluidValue] }],
  // Sizing
  w: [{ w: [isFluidValue] }],
  h: [{ h: [isFluidValue] }],
  "min-w": [{ "min-w": [isFluidValue] }],
  "max-w": [{ "max-w": [isFluidValue] }],
  "min-h": [{ "min-h": [isFluidValue] }],
  "max-h": [{ "max-h": [isFluidValue] }],
  size: [{ size: [isFluidValue] }],
  // Positioning
  top: [{ top: [isFluidValue] }],
  right: [{ right: [isFluidValue] }],
  bottom: [{ bottom: [isFluidValue] }],
  left: [{ left: [isFluidValue] }],
  inset: [{ inset: [isFluidValue] }],
  "inset-x": [{ "inset-x": [isFluidValue] }],
  "inset-y": [{ "inset-y": [isFluidValue] }],
  start: [{ start: [isFluidValue] }],
  end: [{ end: [isFluidValue] }],
  basis: [{ basis: [isFluidValue] }],
  // Scroll margin / padding
  "scroll-m": [{ "scroll-m": [isFluidValue] }],
  "scroll-mx": [{ "scroll-mx": [isFluidValue] }],
  "scroll-my": [{ "scroll-my": [isFluidValue] }],
  "scroll-mt": [{ "scroll-mt": [isFluidValue] }],
  "scroll-mr": [{ "scroll-mr": [isFluidValue] }],
  "scroll-mb": [{ "scroll-mb": [isFluidValue] }],
  "scroll-ml": [{ "scroll-ml": [isFluidValue] }],
  "scroll-p": [{ "scroll-p": [isFluidValue] }],
  "scroll-px": [{ "scroll-px": [isFluidValue] }],
  "scroll-py": [{ "scroll-py": [isFluidValue] }],
  "scroll-pt": [{ "scroll-pt": [isFluidValue] }],
  "scroll-pr": [{ "scroll-pr": [isFluidValue] }],
  "scroll-pb": [{ "scroll-pb": [isFluidValue] }],
  "scroll-pl": [{ "scroll-pl": [isFluidValue] }],
  // Typography
  "font-size": [{ text: [isFluidValue] }],
  leading: [{ leading: [isFluidValue] }],
  tracking: [{ tracking: [isFluidValue] }],
  indent: [{ indent: [isFluidValue] }],
  // Border / outline / radius
  "border-w": [{ border: [isFluidValue] }],
  "border-w-t": [{ "border-t": [isFluidValue] }],
  "border-w-r": [{ "border-r": [isFluidValue] }],
  "border-w-b": [{ "border-b": [isFluidValue] }],
  "border-w-l": [{ "border-l": [isFluidValue] }],
  "outline-w": [{ outline: [isFluidValue] }],
  "outline-offset": [{ "outline-offset": [isFluidValue] }],
  rounded: [{ rounded: [isFluidValue] }],
  "rounded-t": [{ "rounded-t": [isFluidValue] }],
  "rounded-r": [{ "rounded-r": [isFluidValue] }],
  "rounded-b": [{ "rounded-b": [isFluidValue] }],
  "rounded-l": [{ "rounded-l": [isFluidValue] }],
  "rounded-tl": [{ "rounded-tl": [isFluidValue] }],
  "rounded-tr": [{ "rounded-tr": [isFluidValue] }],
  "rounded-br": [{ "rounded-br": [isFluidValue] }],
  "rounded-bl": [{ "rounded-bl": [isFluidValue] }],
  // Composites (translate, blur, ring, space, divide)
  "translate-x": [{ "translate-x": [isFluidValue] }],
  "translate-y": [{ "translate-y": [isFluidValue] }],
  blur: [{ blur: [isFluidValue] }],
  "backdrop-blur": [{ "backdrop-blur": [isFluidValue] }],
  "ring-w": [{ ring: [isFluidValue] }],
  "ring-offset-w": [{ "ring-offset": [isFluidValue] }],
  "space-x": [{ "space-x": [isFluidValue] }],
  "space-y": [{ "space-y": [isFluidValue] }],
  "divide-x": [{ "divide-x": [isFluidValue] }],
  "divide-y": [{ "divide-y": [isFluidValue] }],
  // Misc
  perspective: [{ perspective: [isFluidValue] }],
};

/**
 * Builds a `tailwind-merge` instance that already knows every fluid-clamp
 * utility, optionally composed with your own `extendTailwindMerge` config
 * (e.g. your own design system's `font-size` scale, prefix, theme, …).
 *
 * ```ts
 * import { createFluidTwMerge } from "@basilafro/fluid-clamp/tw-merge";
 *
 * const twMerge = createFluidTwMerge({
 *   extend: { classGroups: { "font-size": [{ text: ["heading-lg", "heading-sm"] }] } },
 * });
 * ```
 *
 * The generics let you extend with a class group id of your own (not just
 * ones fluid-clamp/Tailwind already define), the same way you would with a
 * plain `extendTailwindMerge<AdditionalClassGroupIds>(...)` call.
 */
export function createFluidTwMerge<
  AdditionalClassGroupIds extends string = never,
  AdditionalThemeGroupIds extends string = never,
>(
  configExtension?: ConfigExtension<
    DefaultClassGroupIds | AdditionalClassGroupIds,
    DefaultThemeGroupIds | AdditionalThemeGroupIds
  >,
) {
  // extendTailwindMerge only accepts a single plain ConfigExtension object —
  // additional positional args must be config-transform functions — so a
  // caller-supplied extension is merged into ours up front rather than
  // passed through separately. Merging is per-key-concat, not a shallow
  // object spread: a caller extending a group we already use (e.g. a custom
  // `font-size` scale) would otherwise silently replace our fluid validator
  // for that group instead of adding to it.
  const callerClassGroups = (configExtension?.extend?.classGroups ?? {}) as Record<
    string,
    readonly unknown[]
  >;
  const mergedClassGroups: Record<string, readonly unknown[]> = { ...fluidClassGroups };
  for (const [groupId, entries] of Object.entries(callerClassGroups)) {
    const existing = mergedClassGroups[groupId];
    mergedClassGroups[groupId] = existing ? [...existing, ...entries] : entries;
  }

  type MergedConfigExtension = ConfigExtension<
    DefaultClassGroupIds | AdditionalClassGroupIds,
    DefaultThemeGroupIds | AdditionalThemeGroupIds
  >;
  return extendTailwindMerge<AdditionalClassGroupIds, AdditionalThemeGroupIds>({
    ...configExtension,
    extend: {
      ...configExtension?.extend,
      // tailwind-merge doesn't export the exact `ClassGroup`/`ClassObject`
      // shapes needed to reconstruct this type generically — the per-key
      // concat above already guarantees this satisfies it at runtime.
      classGroups: mergedClassGroups as NonNullable<MergedConfigExtension["extend"]>["classGroups"],
    },
  });
}

const defaultTwMerge = createFluidTwMerge();

/**
 * Drop-in `cn()` — `clsx` + a `tailwind-merge` instance preloaded with every
 * fluid-clamp utility. For a version composed with your own design system's
 * `extendTailwindMerge` config, use `createFluidTwMerge` directly.
 */
export function cn(...inputs: ClassValue[]): string {
  return defaultTwMerge(clsx(inputs));
}
