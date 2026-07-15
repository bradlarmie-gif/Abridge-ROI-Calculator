import { describe, it, expect } from "vitest";
import { computeRoadmap } from "@/lib/appRationalizationRoadmap";
import { type AppRatItem } from "@/lib/appRationalizationCalc";

const mk = (o: Partial<AppRatItem>): AppRatItem => ({
  id: "x", category: "dictation", annualSpend: 0, coveragePct: 80, when: "thisYear", ...o,
});

// when -> year (term 3): thisYear->Y1, nextYear->Y2, year3->Y3, notSure->Y3
const stack: AppRatItem[] = [
  mk({ id: "flu", vendorName: "Fluency",    annualSpend: 1_800_000, coveragePct: 80,  when: "nextYear" }),
  mk({ id: "utd", vendorName: "UpToDate",   annualSpend: 1_000_000, coveragePct: 90,  when: "thisYear" }),
  mk({ id: "amb", vendorName: "Ambient AI", annualSpend:   700_000, coveragePct: 100, when: "thisYear" }),
  mk({ id: "iod", vendorName: "Iodine",     annualSpend:   600_000, coveragePct: 75,  when: "year3" }),
  mk({ id: "sta", vendorName: "Stanson",    annualSpend:   500_000, coveragePct: 70,  when: "year3" }),
];

describe("computeRoadmap (term 3, when-based)", () => {
  const rm = computeRoadmap(stack, 3);

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
  it("the read names the year with the largest delta and notes later scheduling", () => {
    expect(rm.read).toContain("Year 1");
    expect(rm.read.toLowerCase()).toContain("later");
  });
  it("filters zero-spend items and is empty-safe", () => {
    const rm0 = computeRoadmap([mk({ id: "z", annualSpend: 0 })], 3);
    expect(rm0.snapshots[0].perTool).toHaveLength(0);
    expect(rm0.totalRetired).toBe(0);
    expect(rm0.deltas.every((d) => d.amount === 0)).toBe(true);
  });
  it("reads clearly when nothing retires", () => {
    const rmNone = computeRoadmap([mk({ id: "n", annualSpend: 500_000, coveragePct: 0, when: "thisYear" })], 3);
    expect(rmNone.totalRetired).toBe(0);
    expect(rmNone.read.toLowerCase()).toContain("nothing");
  });
});
