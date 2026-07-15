import { describe, it, expect } from "vitest";
import { computeRoadmap } from "@/lib/appRationalizationRoadmap";
import { type AppRatItem } from "@/lib/appRationalizationCalc";

const mk = (o: Partial<AppRatItem>): AppRatItem => ({
  id: "x", category: "dictation", annualSpend: 0, coveragePct: 80, transitionMonths: 12, ...o,
});

// Renewals mapped with currentYear=2026, term=3:
// UpToDate "Open term"->Y1, Ambient "2026"->Y1, Fluency "Mid 2027"->Y2, Iodine "2028"->Y3, Stanson "2028"->Y3
const stack: AppRatItem[] = [
  mk({ id: "flu", vendorName: "Fluency", annualSpend: 1_800_000, coveragePct: 80, renewal: "Mid 2027" }),
  mk({ id: "utd", vendorName: "UpToDate", annualSpend: 1_000_000, coveragePct: 90, renewal: "Open term" }),
  mk({ id: "amb", vendorName: "Ambient AI", annualSpend: 700_000, coveragePct: 100, renewal: "2026" }),
  mk({ id: "iod", vendorName: "Iodine", annualSpend: 600_000, coveragePct: 75, renewal: "2028" }),
  mk({ id: "sta", vendorName: "Stanson", annualSpend: 500_000, coveragePct: 70, renewal: "2028" }),
];

describe("computeRoadmap (currentYear 2026, term 3)", () => {
  const rm = computeRoadmap(stack, 3, 2026);

  it("has term+1 snapshots labelled Today then Year 1..N", () => {
    expect(rm.snapshots.map((s) => s.label)).toEqual(["Today", "Year 1", "Year 2", "Year 3"]);
  });
  it("snapshot totals step down as tools retire", () => {
    expect(rm.snapshots.map((s) => s.total)).toEqual([4_600_000, 3_000_000, 1_560_000, 760_000]);
  });
  it("per-year deltas sum the retired amounts and carry tool names", () => {
    expect(rm.deltas.map((d) => d.amount)).toEqual([1_600_000, 1_440_000, 800_000]);
    expect(rm.deltas[0].tools.sort()).toEqual(["Ambient AI", "UpToDate"]);
    expect(rm.deltas[1].tools).toEqual(["Fluency"]);
  });
  it("running totals accumulate", () => {
    expect(rm.deltas.map((d) => d.running)).toEqual([1_600_000, 3_040_000, 3_840_000]);
  });
  it("reports totalRetired and endStays", () => {
    expect(rm.totalRetired).toBe(3_840_000);
    expect(rm.endStays).toBe(760_000);
  });
  it("the read names the year with the largest delta and notes renewal gating", () => {
    expect(rm.read).toContain("Year 1");
    expect(rm.read.toLowerCase()).toContain("renewal");
  });
  it("filters zero-spend items and is empty-safe", () => {
    const rm0 = computeRoadmap([mk({ id: "z", annualSpend: 0 })], 3, 2026);
    expect(rm0.snapshots[0].perTool).toHaveLength(0);
    expect(rm0.totalRetired).toBe(0);
    expect(rm0.deltas.every((d) => d.amount === 0)).toBe(true);
  });
  it("reads clearly when nothing retires", () => {
    const rmNone = computeRoadmap([mk({ id: "n", annualSpend: 500_000, coveragePct: 0, renewal: "Open term" })], 3, 2026);
    expect(rmNone.totalRetired).toBe(0);
    expect(rmNone.read.toLowerCase()).toContain("nothing");
  });
});
