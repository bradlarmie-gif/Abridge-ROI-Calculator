import { describe, it, expect } from "vitest";
import { buildStackBars, type AppRatItem } from "@/lib/appRationalizationCalc";

const mk = (o: Partial<AppRatItem>): AppRatItem => ({
  id: "x", category: "dictation", annualSpend: 0, coveragePct: 80, when: "thisYear", ...o,
});

describe("buildStackBars", () => {
  it("derives per-tool spend/sunset/stays and totals, spend-only, in order", () => {
    const bars = buildStackBars([
      mk({ id: "a", vendorName: "DAX", annualSpend: 180_000, coveragePct: 100 }),
      mk({ id: "b", vendorName: "Scribe", annualSpend: 120_000, coveragePct: 90 }),
      mk({ id: "c", vendorName: "Iodine", annualSpend: 70_000, coveragePct: 60 }),
    ]);
    expect(bars.stackTotal).toBe(370_000);
    expect(bars.sunset).toBe(180_000 + 108_000 + 42_000); // 330,000
    expect(bars.stays).toBe(0 + 12_000 + 28_000);          // 40,000
    expect(bars.tools.map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(bars.tools[0]).toEqual({ id: "a", name: "DAX", spend: 180_000, sunset: 180_000, stays: 0 });
    expect(bars.tools[1]).toMatchObject({ name: "Scribe", sunset: 108_000, stays: 12_000 });
  });
  it("drops zero-spend tools", () => {
    const bars = buildStackBars([mk({ id: "z", annualSpend: 0 }), mk({ id: "y", annualSpend: 50_000, coveragePct: 80 })]);
    expect(bars.tools.map((t) => t.id)).toEqual(["y"]);
    expect(bars.stackTotal).toBe(50_000);
  });
  it("is zero-safe on an empty stack", () => {
    expect(buildStackBars([])).toEqual({ stackTotal: 0, sunset: 0, stays: 0, tools: [] });
  });
  it("falls back to the category label when a tool has no vendor name", () => {
    const bars = buildStackBars([mk({ id: "s", category: "scribe", vendorName: undefined, annualSpend: 10_000 })]);
    expect(bars.tools[0].name).toBe("Medical scribe");
  });
});
