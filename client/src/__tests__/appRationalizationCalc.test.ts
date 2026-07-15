import { describe, it, expect } from "vitest";
import {
  APP_RAT_CATEGORIES, KNOWN_VENDORS, categoryLabel, makeItem, itemDisplayName,
  itemRetired, itemStays, computeTotals, searchApplications, type AppRatItem,
} from "@/lib/appRationalizationCalc";

const item = (over: Partial<AppRatItem> = {}): AppRatItem => ({
  id: "x", category: "dictation", annualSpend: 1_800_000, coveragePct: 80, when: "thisYear", ...over,
});

describe("appRationalizationCalc", () => {
  it("retired = round(spend * coverage%)", () => {
    expect(itemRetired(item())).toBe(1_440_000);
    expect(itemRetired(item({ annualSpend: 1_000_000, coveragePct: 90 }))).toBe(900_000);
  });
  it("stays = spend - retired", () => {
    expect(itemStays(item())).toBe(360_000);
    expect(itemStays(item({ coveragePct: 100 }))).toBe(0);
  });
  it("display name falls back to the category label when no vendor", () => {
    expect(itemDisplayName(item({ category: "scribe", vendorName: undefined }))).toBe("Medical scribe");
    expect(itemDisplayName(item({ vendorName: "Fluency" }))).toBe("Fluency");
  });
  it("computeTotals sums retired and stays and computes pct", () => {
    const t = computeTotals([
      item({ annualSpend: 1_800_000, coveragePct: 80 }),   // 1.44M / 0.36M
      item({ annualSpend: 1_000_000, coveragePct: 90 }),   // 0.90M / 0.10M
    ]);
    expect(t.stackTotal).toBe(2_800_000);
    expect(t.toAbridge).toBe(2_340_000);
    expect(t.stays).toBe(460_000);
    expect(t.pctToAbridge).toBe(84); // round(2.34/2.8*100)
  });
  it("computeTotals is zero-safe on an empty stack", () => {
    expect(computeTotals([])).toEqual({ stackTotal: 0, toAbridge: 0, stays: 0, pctToAbridge: 0 });
  });
  it("makeItem defaults to an 80% displace share, This year, and the given category", () => {
    const m = makeItem("id1", "cds");
    expect(m).toMatchObject({ id: "id1", category: "cds", coveragePct: 80, annualSpend: 0, when: "thisYear" });
  });
  it("categoryLabel resolves known ids", () => {
    expect(categoryLabel("cds")).toBe("Clinical decision support");
  });
  it("searchApplications: empty query returns all categories, no vendors", () => {
    const r = searchApplications("");
    expect(r.categories).toHaveLength(APP_RAT_CATEGORIES.length);
    expect(r.vendors).toHaveLength(0);
  });
  it("searchApplications: a vendor prefix surfaces the vendor and its category is filtered too", () => {
    const r = searchApplications("flu");
    expect(r.vendors.map((v) => v.name)).toContain("Fluency");
    // categories still filtered by substring; 'flu' matches no category label
    expect(r.categories).toHaveLength(0);
  });
  it("searchApplications: a category prefix surfaces the category", () => {
    const r = searchApplications("dict");
    expect(r.categories.map((c) => c.id)).toContain("dictation");
  });
  it("KNOWN_VENDORS all reference a real category", () => {
    const ids = new Set(APP_RAT_CATEGORIES.map((c) => c.id));
    for (const v of KNOWN_VENDORS) expect(ids.has(v.category)).toBe(true);
  });
});
