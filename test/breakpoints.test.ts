import { describe, it, expect } from "vitest";
import {
  parseScreen,
  resolveBreakpoints,
  resolveBreakpointConfig,
} from "../src/parse";

describe("parseScreen", () => {
  it("parses px strings", () => {
    expect(parseScreen("640px")).toBe(640);
  });
  it("parses rem/em as ×rootFontSize", () => {
    expect(parseScreen("40rem")).toBe(640);
    expect(parseScreen("40em")).toBe(640);
    expect(parseScreen("40rem", 10)).toBe(400);
  });
  it("passes through bare numbers and numeric strings", () => {
    expect(parseScreen(700)).toBe(700);
    expect(parseScreen("700")).toBe(700);
  });
  it("prefers min in the object form", () => {
    expect(parseScreen({ min: "640px" })).toBe(640);
    expect(parseScreen({ min: "640px", max: "1280px" })).toBe(640);
    expect(parseScreen({ max: "1280px" })).toBe(1280);
  });
  it("returns NaN for unparseable values", () => {
    expect(Number.isNaN(parseScreen("garbage"))).toBe(true);
    expect(Number.isNaN(parseScreen(undefined))).toBe(true);
    expect(Number.isNaN(parseScreen({}))).toBe(true);
  });
});

describe("resolveBreakpoints", () => {
  const theme = (path: string) =>
    path === "screens" ? { sm: "640px", md: "768px" } : undefined;

  it("builds a px map from theme screens", () => {
    expect(resolveBreakpoints(theme)).toEqual({ sm: 640, md: 768 });
  });

  it("merges overrides on top, overrides winning", () => {
    expect(resolveBreakpoints(theme, { xs: 480, sm: 600 })).toEqual({
      sm: 600,
      md: 768,
      xs: 480,
    });
  });

  it("tolerates a missing/!object screens value", () => {
    expect(resolveBreakpoints(() => undefined, { xs: 480 })).toEqual({ xs: 480 });
  });
});

describe("resolveBreakpointConfig", () => {
  const breakpointMap = { xs: 480, lg: 1024 };

  it("resolves names to px", () => {
    expect(
      resolveBreakpointConfig(
        { minBreakpoint: "xs", maxBreakpoint: "lg" },
        breakpointMap,
        "breakpointRange",
      ),
    ).toEqual({ minBreakpoint: 480, maxBreakpoint: 1024 });
  });

  it("passes numbers through and mixes with names", () => {
    expect(
      resolveBreakpointConfig(
        { minBreakpoint: 320, maxBreakpoint: "lg" },
        breakpointMap,
        "breakpointRange",
      ),
    ).toEqual({ minBreakpoint: 320, maxBreakpoint: 1024 });
  });

  it("throws a clear error on an unknown name", () => {
    expect(() =>
      resolveBreakpointConfig(
        { minBreakpoint: "nope", maxBreakpoint: "lg" },
        breakpointMap,
        "textBreakpointRange",
      ),
    ).toThrow(/unknown breakpoint name "nope" in textBreakpointRange\.minBreakpoint/);
  });
});
