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
// Syntax (all values in px):
//   [minSize_maxSize]
//   [minSize_maxSize_minBp_maxBp]
//   [minSize_maxSize_minBp_maxBp_minPad_maxPad]
//   [minSize_maxSize_minBp_maxBp_minPad_maxPad_minSubtract_maxSubtract]
//
// When minBp/maxBp are omitted → config breakpoints are used (304/1074).
// When padding/subtract are omitted → 0 (no subtraction).
//
// The minBp/maxBp slots also accept a breakpoint name (a Tailwind screen or a
// name from the `breakpoints` config), e.g. text-fluid-[15_32_sm_lg].

export function ArbitraryValueExamples() {
  return (
    <div>
      {/* Basic — uses config breakpoints */}
      <p className="text-fluid-[13_19]">custom font between 13px and 19px</p>
      <div className="p-fluid-[10_20]">custom padding</div>
      <div className="gap-fluid-[6_14]">custom gap</div>

      {/* With explicit breakpoints */}
      <p className="text-fluid-[14_22_304_1074]">
        same as config defaults, explicit
      </p>

      {/* With named breakpoints — resolve from theme.screens + the
          `breakpoints` config option. Names and numbers can be mixed. */}
      <p className="text-fluid-[15_32_sm_lg]">scales across the sm→lg range</p>
      <div className="w-fluid-[120_200_xs_1280]">
        custom name xs (480) → raw 1280px
      </div>

      {/* Card with 140→260px range, 8→12px padding */}
      {/* Available space: 124→236px */}
      <div className="w-fluid-[120_200_140_260_8_12]">
        fluid width accounting for card padding
      </div>

      {/* Row card: icon(24px) + gap(6px) at min, icon(32px) + gap(8px) at max */}
      {/* Container 140→260px, padding 8→12px, sibling elements 30→40px */}
      <p className="text-fluid-[12_18_140_260_8_12_30_40]">
        text in a row layout with icon and gap subtracted
      </p>

      {/* Height-based — needs container-type: size + explicit height on parent */}
      <p
        className="text-fluid-[12_20]"
        style={{ fontSize: "var(--text-cqh, inherit)" }}
      >
        {/* For cqh override, use inline style with fluidClamp() directly */}
      </p>
    </div>
  );
}

// ─── One-off inline (escape hatch) ───────────────────────────────────────────
// When you need to build the class name dynamically at runtime,
// Tailwind can't see it statically — use an inline style instead.

import { fluidClamp } from "@basilafro/fluid-clamp";

export function InlineEscapeHatch({
  minPx,
  maxPx,
}: {
  minPx: number;
  maxPx: number;
}) {
  return (
    <p
      style={{
        fontSize: fluidClamp({
          minSize: minPx,
          maxSize: maxPx,
          minBp: 304,
          maxBp: 1074,
          fluidUnit: "cqw",
        }),
      }}
    >
      dynamically sized text
    </p>
  );
}
