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
import { createFluidPlugin } from "@BasilAfro/fluid-clamp";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [
    createFluidPlugin({
      // available space after subtracting page container padding
      textBp: { minBp: 304, maxBp: 1074 },
      spaceBp: { minBp: 304, maxBp: 1074 },

      // everything inside the page container uses cqw
      textUnit: "cqw",
      spaceUnit: "cqw",
    }),
  ],
} satisfies Config;
