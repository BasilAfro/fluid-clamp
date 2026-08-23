import { describe, it, expect } from "vitest";
import { cn, createFluidTwMerge, fluidClassGroups } from "../src/tw-merge";

describe("cn", () => {
  it("dedupes a fluid static utility against the matching native one", () => {
    expect(cn("p-4", "p-fluid-4")).toBe("p-fluid-4");
    expect(cn("p-fluid-4", "p-4")).toBe("p-4");
  });

  it("dedupes two fluid static utilities in the same group", () => {
    expect(cn("p-fluid-4", "p-fluid-8")).toBe("p-fluid-8");
  });

  it("dedupes a fluid arbitrary value against a native/fluid sibling", () => {
    expect(cn("w-24", "w-fluid-[16,24]")).toBe("w-fluid-[16,24]");
    expect(cn("w-fluid-[16,24]", "w-fluid-[20,30]")).toBe("w-fluid-[20,30]");
  });

  it("dedupes composite utilities against their native counterpart", () => {
    expect(cn("ring-2", "ring-fluid-4")).toBe("ring-fluid-4");
    expect(cn("ring-fluid-4", "ring-2")).toBe("ring-2");
    expect(cn("border-2", "border-fluid-[1,4]")).toBe("border-fluid-[1,4]");
  });

  it("keeps text-fluid-* out of the text-color group", () => {
    expect(cn("text-fluid-lg", "text-red-500")).toBe("text-fluid-lg text-red-500");
  });

  it("leaves unrelated utilities alone", () => {
    expect(cn("flex", "items-center", "gap-fluid-4")).toBe(
      "flex items-center gap-fluid-4",
    );
  });
});

describe("createFluidTwMerge", () => {
  it("still recognizes fluid-clamp classes when composed with a custom extend", () => {
    const twMerge = createFluidTwMerge({
      extend: { classGroups: { "font-size": [{ text: ["heading-lg", "heading-sm"] }] } },
    });
    expect(twMerge("text-fluid-lg", "text-fluid-xl")).toBe("text-fluid-xl");
    expect(twMerge("text-heading-lg", "text-fluid-xl")).toBe("text-fluid-xl");
  });

  it("accepts a caller-defined class group id that isn't a Tailwind/fluid-clamp default", () => {
    const twMerge = createFluidTwMerge<"brand-shadow">({
      extend: { classGroups: { "brand-shadow": [{ "shadow-brand": ["sm", "lg"] }] } },
    });
    expect(twMerge("shadow-brand-sm", "shadow-brand-lg")).toBe("shadow-brand-lg");
    // unaffected: fluid-clamp's own groups still work alongside the custom one
    expect(twMerge("p-4", "p-fluid-4")).toBe("p-fluid-4");
  });
});

describe("fluidClassGroups", () => {
  it("is exported for consumers composing their own extendTailwindMerge config", () => {
    expect(fluidClassGroups.p).toBeDefined();
    expect(fluidClassGroups["font-size"]).toBeDefined();
  });
});
