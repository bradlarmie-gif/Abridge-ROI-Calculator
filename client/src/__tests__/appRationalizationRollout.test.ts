import { describe, it, expect } from "vitest";
import { buildRollout, type AppRatItem, type AppRatWhen } from "@/lib/appRationalizationCalc";

const tool = (
  id: string,
  when: AppRatWhen,
  annualSpend: number,
  coveragePct: number,
  vendorName?: string,
): AppRatItem => ({ id, category: "dictation", annualSpend, coveragePct, when, vendorName });

describe("buildRollout (phases for the calm beat)", () => {
  it("groups sunsetting tools by contract year, sorted, with the run-rate reached at the last", () => {
    const items = [
      tool("a", "thisYear", 400_000, 80, "Dragon"),       // sunsets 320k, year 1
      tool("b", "nextYear", 110_000, 80, "ScribeAmerica"),// sunsets 88k, year 2
      tool("c", "thisYear", 60_000, 90, "UpToDate"),      // sunsets 54k, year 1
      tool("d", "year3", 50_000, 60, "Solventum"),        // sunsets 30k, year 3
    ];
    const r = buildRollout(items, 3, 0);
    expect(r.hasRollout).toBe(true);
    expect(r.phases.map((p) => p.year)).toEqual([1, 2, 3]);
    // year 1 keeps input order (Dragon before UpToDate)
    expect(r.phases[0]).toMatchObject({ year: 1, label: "This year", tools: ["Dragon", "UpToDate"] });
    expect(r.phases[1]).toMatchObject({ year: 2, label: "Next year", tools: ["ScribeAmerica"] });
    expect(r.phases[2]).toMatchObject({ year: 3, label: "Year 3", tools: ["Solventum"] });
    expect(r.reachedYear).toBe(3);
    expect(r.runRate).toBe(320_000 + 88_000 + 54_000 + 30_000); // 492k, net of $0 price
  });

  it("nets the Abridge price into the run-rate (matches the waterfall hero)", () => {
    const items = [tool("a", "thisYear", 400_000, 80)]; // sunsets 320k
    expect(buildRollout(items, 3, 400_000).runRate).toBe(320_000 - 400_000); // net cost
    expect(buildRollout(items, 3, 100_000).runRate).toBe(220_000);
  });

  it("excludes tools that do not sunset (0% displace or no spend)", () => {
    const items = [
      tool("a", "thisYear", 400_000, 0),   // displaces nothing
      tool("b", "nextYear", 0, 90),        // no spend
      tool("c", "thisYear", 60_000, 90, "UpToDate"),
    ];
    const r = buildRollout(items, 3, 0);
    expect(r.phases).toHaveLength(1);
    expect(r.phases[0].tools).toEqual(["UpToDate"]);
  });

  it("collapses to a single phase when everything comes off this year", () => {
    const items = [
      tool("a", "thisYear", 400_000, 80, "Dragon"),
      tool("b", "thisYear", 60_000, 90, "UpToDate"),
    ];
    const r = buildRollout(items, 3, 0);
    expect(r.phases).toHaveLength(1);
    expect(r.reachedYear).toBe(1);
  });

  it("reports no rollout when nothing sunsets", () => {
    const r = buildRollout([tool("a", "thisYear", 400_000, 0)], 3, 0);
    expect(r.hasRollout).toBe(false);
    expect(r.phases).toEqual([]);
    expect(r.reachedYear).toBe(0);
  });

  it("falls back to the category label when a tool is unnamed", () => {
    const r = buildRollout([tool("a", "thisYear", 400_000, 80)], 3, 0);
    expect(r.phases[0].tools).toEqual(["Dictation"]);
  });
});
