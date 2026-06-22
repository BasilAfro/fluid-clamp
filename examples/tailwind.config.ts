/**
 * tailwind.config.ts — consuming Remix project
 *
 * This project uses a page container that goes from 320px to 1098px,
 * with 8px padding at min and 12px padding at max.
 * Available space: 304px → 1074px — these are the breakpoints we pass in.
 *
 * container-type: inline-size must be set on the page container
 * so that cqw resolves correctly inside it.
 */

import type { Config } from "tailwindcss";
import { createFluidPlugin } from "@basilafro/fluid-clamp";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [
    createFluidPlugin({
      // breakpointRange + unit apply to both text and spacing — usually all you need.
      // (Use textBreakpointRange/spaceBreakpointRange or textUnit/spaceUnit only to diverge them.)

      // available space after subtracting page container padding.
      // minBreakpoint/maxBreakpoint also accept breakpoint names, e.g.
      // { minBreakpoint: "xs", maxBreakpoint: "lg" }
      // (resolved from theme.screens + the `breakpoints` option below).
      breakpointRange: { minBreakpoint: 304, maxBreakpoint: 1074 },

      // The default unit is "vw". This project renders everything inside a
      // page container with container-type, so it overrides the default to cqw.
      // (Individual classes can still opt back to vw with a unit token, and a
      //  named breakpoint auto-selects vw — see usage.tsx.)
      unit: "cqw",

      // extra named breakpoints usable in arbitrary values, e.g.
      // text-fluid-[15@xs,32@lg] — merged on top of theme.screens
      breakpoints: { xs: 480 },
    }),
  ],
} satisfies Config;
