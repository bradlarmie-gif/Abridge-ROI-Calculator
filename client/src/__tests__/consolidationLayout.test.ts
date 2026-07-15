import { describe, it, expect } from "vitest";
import { computeConsolidationLayout } from "@/lib/consolidationLayout";
import { type AppRatItem } from "@/lib/appRationalizationCalc";

const item = (over: Partial<AppRatItem>): AppRatItem => ({
  id: "x", category: "dictation", annualSpend: 1_000_000, coveragePct: 80, transitionMonths: 12, ...over,
});

const coral = (l: ReturnType<typeof computeConsolidationLayout>) => l.ribbons.filter((r) => r.kind === "retired");
const grey = (l: ReturnType<typeof computeConsolidationLayout>) => l.ribbons.filter((r) => r.kind === "stays");
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

describe("computeConsolidationLayout", () => {
  it("ribbon thickness is proportional to the dollars it carries", () => {
    const l = computeConsolidationLayout([
      item({ id: "a", annualSpend: 1_800_000, coveragePct: 80 }), // retired 1.44M
      item({ id: "b", annualSpend: 1_000_000, coveragePct: 90 }), // retired 0.90M
    ]);
    const a = coral(l).find((r) => r.id === "a")!;
    const b = coral(l).find((r) => r.id === "b")!;
    expect(a.thickness / b.thickness).toBeCloseTo(1_440_000 / 900_000, 5);
  });

  it("the Abridge sink height equals the sum of coral ribbon thicknesses (filled exactly)", () => {
    const l = computeConsolidationLayout([
      item({ id: "a", annualSpend: 1_800_000, coveragePct: 80 }),
      item({ id: "b", annualSpend: 1_000_000, coveragePct: 90 }),
    ]);
    expect(sum(coral(l).map((r) => r.thickness))).toBeCloseTo(l.abridge.height, 5);
    expect(sum(grey(l).map((r) => r.thickness))).toBeCloseTo(l.stays.height, 5);
  });

  it("a 100%-coverage item produces no grey ribbon", () => {
    const l = computeConsolidationLayout([item({ id: "full", annualSpend: 700_000, coveragePct: 100 })]);
    expect(grey(l).some((r) => r.id === "full")).toBe(false);
    expect(coral(l).some((r) => r.id === "full")).toBe(true);
  });

  it("a 0%-coverage item produces no coral ribbon", () => {
    const l = computeConsolidationLayout([item({ id: "none", annualSpend: 500_000, coveragePct: 0 })]);
    expect(coral(l).some((r) => r.id === "none")).toBe(false);
    expect(grey(l).some((r) => r.id === "none")).toBe(true);
  });

  it("filters out items with zero spend and is empty-safe", () => {
    const l = computeConsolidationLayout([item({ id: "z", annualSpend: 0 })]);
    expect(l.sources).toHaveLength(0);
    expect(l.ribbons).toHaveLength(0);
    expect(l.abridge.height).toBe(0);
    expect(l.stays.height).toBe(0);
  });

  it("handles a single item", () => {
    const l = computeConsolidationLayout([item({ id: "solo", annualSpend: 1_000_000, coveragePct: 80 })]);
    expect(l.sources).toHaveLength(1);
    expect(coral(l)).toHaveLength(1);
    expect(grey(l)).toHaveLength(1);
    expect(l.sources[0].name).toBe("Dictation"); // no vendorName -> category label
  });

  it("coral ribbons land in source order (targets strictly increasing)", () => {
    const l = computeConsolidationLayout([
      item({ id: "a", annualSpend: 1_800_000, coveragePct: 80 }),
      item({ id: "b", annualSpend: 1_000_000, coveragePct: 90 }),
      item({ id: "c", annualSpend: 600_000, coveragePct: 75 }),
    ]);
    const ys = coral(l).map((r) => r.y2);
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
  });
});
