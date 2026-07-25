import { describe, it, expect } from "vitest";
import { buildConsolidationModel } from "@/components/forecast/ArConsolidationView";
import type { AppRatItem } from "@/lib/appRationalizationCalc";

const mk = (o: Partial<AppRatItem>): AppRatItem => ({
  id: "x", category: "ambientDoc", annualSpend: 0, coveragePct: 90,
  contractMonths: 12, sunsetMonths: 12, rampMonths: 3, ...o,
});

describe("buildConsolidationModel", () => {
  it("maps each tool onto a shared slot width and its freed share", () => {
    const m = buildConsolidationModel([
      mk({ id: "a", vendorName: "DAX", annualSpend: 200_000, coveragePct: 100 }),   // all freed
      mk({ id: "b", vendorName: "Scribe", annualSpend: 100_000, coveragePct: 50 }), // half freed
      mk({ id: "c", vendorName: "UpToDate", category: "cds", annualSpend: 100_000, coveragePct: 0 }), // stays only
    ]);

    expect(m.stackTotal).toBe(400_000);
    expect(m.freed).toBe(200_000 + 50_000); // 250,000
    expect(m.stays).toBe(0 + 50_000 + 100_000); // 150,000
    expect(m.vendorCount).toBe(3);

    // slot widths sum to 100 and are proportional to spend
    expect(m.rows.map((r) => Math.round(r.widthPct))).toEqual([50, 25, 25]);

    // within-slot coral share
    expect(m.rows[0].retiredPct).toBe(100);
    expect(m.rows[1].retiredPct).toBe(50);
    expect(m.rows[1].staysPct).toBe(50);

    // freed share = retired / freed
    expect(m.rows[0].freedSharePct).toBe(80); // 200k / 250k
    expect(m.rows[1].freedSharePct).toBe(20); // 50k / 250k

    // stays-only flag
    expect(m.rows[0].staysOnly).toBe(false);
    expect(m.rows[2].staysOnly).toBe(true);
    expect(m.rows[2].retiredPct).toBe(0);
  });

  it("drops zero-spend tools and is zero-safe when empty", () => {
    const m = buildConsolidationModel([mk({ id: "z", annualSpend: 0 })]);
    expect(m.rows).toEqual([]);
    expect(m.stackTotal).toBe(0);
    expect(m.freed).toBe(0);
    expect(m.vendorCount).toBe(0);
  });

  it("gives no freed share when nothing is freed", () => {
    const m = buildConsolidationModel([
      mk({ id: "a", vendorName: "UpToDate", category: "cds", annualSpend: 50_000, coveragePct: 0 }),
    ]);
    expect(m.freed).toBe(0);
    expect(m.rows[0].freedSharePct).toBe(0);
    expect(m.rows[0].staysOnly).toBe(true);
  });
});
