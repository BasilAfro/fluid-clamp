/**
 * examples/usage.tsx
 * Reference for every class and arbitrary value pattern the plugin generates.
 */

// ─── Setup ────────────────────────────────────────────────────────────────────
// Your page container needs container-type so cqw resolves correctly.
//
// In your root layout or global CSS:
//
//   .page-container {
//     max-width: 1098px;
//     margin-inline: auto;
//     padding-inline: 8px;          /* min padding */
//     container-type: inline-size;  /* required for cqw */
//   }
//
//   @media (min-width: 640px) {
//     .page-container { padding-inline: 12px; } /* max padding */
//   }
//
// Cards inside the grid also need it if you use cqw inside them:
//
//   .card { container-type: inline-size; }

// ─── Static scale classes ─────────────────────────────────────────────────────

export function StaticScaleExamples() {
  return (
    <article className="p-fluid-6 gap-fluid-4">
      {/* Type scale */}
      <h1 className="text-fluid-4xl">Display heading</h1>
      <h2 className="text-fluid-2xl">Section heading</h2>
      <h3 className="text-fluid-xl">Card heading</h3>
      <p className="text-fluid-base">Body copy</p>
      <p className="text-fluid-sm">Caption or label</p>

      {/* Spacing — padding */}
      <div className="p-fluid-4">uniform fluid padding</div>
      <div className="px-fluid-6 py-fluid-3">different x/y padding</div>
      <div className="pt-fluid-8 pb-fluid-4">different top/bottom</div>

      {/* Spacing — margin */}
      <div className="mt-fluid-8 mb-fluid-4">vertical margins</div>
      <div className="mx-fluid-6">horizontal margins</div>

      {/* Spacing — gap */}
      <div className="flex gap-fluid-4">gap between flex children</div>
      <div className="grid gap-x-fluid-6 gap-y-fluid-3">different x/y gaps</div>

      {/* Sizing */}
      <div className="w-fluid-12 h-fluid-12">fluid square</div>
    </article>
  );
}

// ─── Arbitrary value classes ──────────────────────────────────────────────────
// Use these for one-off values that don't fit the scale.
//
// Two forms (numbers in px, `px` suffix optional):
//   [minSize,maxSize]                       shorthand — config breakpoints
//   [size@breakpoint,size@breakpoint]       anchors — explicit breakpoints (any order)
//
// Anchor breakpoints accept names (a Tailwind screen or a `breakpoints` entry),
// and an optional inset `-N` subtracts N px from that breakpoint directly:
//   [16@sm,24@lg]                named breakpoints
//   [16@320-16,24@1280-24]       inset → effective breakpoint 304 / 1256
//
// Fluid unit precedence: a leading unit token (vw|cqw|cqh) wins → a named
// breakpoint implies vw → otherwise the config default (vw).
//   text-fluid-[cqw,16,24]   text-fluid-[16@sm,24@lg]   text-fluid-[16,24]
//
// Break the bounds to keep scaling past a breakpoint along the same slope.
// Markers are positional: leading `<` opens the min-breakpoint end, trailing `>`
// opens the max-breakpoint end (for a growing scale that's the floor and the
// ceiling respectively; a shrinking scale flips which CSS fn you get).
//   [16@320,24@1280>]   keeps growing past 24px    [<16@320,24@1280]  keeps shrinking below 16px
//   [<16@320,24@1280>]  fully linear (calc())

export function ArbitraryValueExamples() {
  return (
    <div>
      {/* Shorthand — uses config breakpoints */}
      <p className="text-fluid-[13,19]">custom font between 13px and 19px</p>
      <div className="p-fluid-[10,20]">custom padding</div>
      <div className="gap-fluid-[6,14]">custom gap</div>

      {/* Anchors — explicit breakpoints (16px at 320, 24px at 1280) */}
      <p className="text-fluid-[16@320,24@1280]">explicit breakpoints</p>

      {/* Named breakpoints — resolve from theme.screens + the `breakpoints`
          config option. A named breakpoint auto-selects the vw unit. */}
      <p className="text-fluid-[16@sm,24@lg]">scales across the sm→lg range</p>
      <div className="w-fluid-[120@xs,200@xl]">custom name xs (480) → xl</div>

      {/* Explicit unit token (vw|cqw|cqh) leads the value and always wins —
          this is the per-class "dev input" for choosing the unit. */}
      <p className="text-fluid-[cqw,16,24]">container-relative (needs container-type)</p>
      <p className="text-fluid-[cqw,16@sm,24@lg]">
        inline cqw overrides the named-breakpoint vw auto rule
      </p>

      {/* Inset — subtract container padding / sibling elements from the bp.
          Card 140→260px, minus 8/12px padding → effective range 132 → 248. */}
      <div className="w-fluid-[120@140-8,200@260-12]">
        fluid width accounting for card padding
      </div>

      {/* Break the bounds — keep scaling past a breakpoint along the same slope.
          `>` opens the max-breakpoint end, `<` opens the min-breakpoint end. */}
      <h1 className="text-fluid-[32@320,64@1280>]">grows past 64px on huge screens</h1>
      <p className="text-fluid-[<12@320,16@1280]">shrinks below 12px on tiny screens</p>
      <p className="text-fluid-[<14@320,20@1280>]">fully linear, no clamp</p>
    </div>
  );
}

// ─── One-off inline (escape hatch) ───────────────────────────────────────────
// When you need to build the class name dynamically at runtime,
// Tailwind can't see it statically — use an inline style instead.

import { fluidClamp } from "@basilafro/fluid-clamp";

export function InlineEscapeHatch({
  minPixels,
  maxPixels,
}: {
  minPixels: number;
  maxPixels: number;
}) {
  return (
    <p
      style={{
        fontSize: fluidClamp({
          minSize: minPixels,
          maxSize: maxPixels,
          minBreakpoint: 304,
          maxBreakpoint: 1074,
          fluidUnit: "cqw",
        }),
      }}
    >
      dynamically sized text
    </p>
  );
}
