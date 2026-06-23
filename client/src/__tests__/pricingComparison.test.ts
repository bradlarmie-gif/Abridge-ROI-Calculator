import { describe, it, expect } from "vitest";
import {
  computeDealResult, makeDefaultDeal, effectiveProvisioned, type VolumeInputs,
  vendorDisplacedAnnual, displacedInYear, computeNetResult, makeDefaultVendor,
  computeValueMetrics,
  buildDealInsight,
  type DisplacedVendor,
} from "@/lib/pricingComparisonCalc";

// Plain money formatter for deterministic insight assertions.
const m = (n: number) => `$${Math.round(n).toLocaleString()}`;

describe("buildDealInsight — reads the configured deal back in plain English", () => {
  it("leads with the cheapest deal, its model, cost, term, and savings vs the runner-up", () => {
    const s = buildDealInsight({
      cheapestLabel: "Option B", cheapestModelLabel: "Platform + encounter",
      cheapestCost: 1_180_000, termYears: 3, savings: 240_000, runnerUpLabel: "Option A",
      displaced: 0, pctCovered: 0, termVtc: null, fmtMoney: m,
    });
    expect(s).toContain("Option B");
    expect(s).toContain("Platform + encounter");
    expect(s).toContain("$1,180,000");
    expect(s).toContain("3 years");
    expect(s).toContain("$240,000");
    expect(s).toContain("Option A");
  });

  it("omits the savings clause when it's a tie (savings = 0)", () => {
    const s = buildDealInsight({
      cheapestLabel: "Option B", cheapestModelLabel: "Per provider",
      cheapestCost: 900_000, termYears: 2, savings: 0, runnerUpLabel: "Option A",
      displaced: 0, pctCovered: 0, termVtc: null, fmtMoney: m,
    });
    expect(s).not.toContain("under");
  });

  it("adds the displacement coverage clause when spend is retired", () => {
    const s = buildDealInsight({
      cheapestLabel: "Option B", cheapestModelLabel: "Platform + encounter",
      cheapestCost: 1_180_000, termYears: 3, savings: 240_000, runnerUpLabel: "Option A",
      displaced: 540_000, pctCovered: 62, termVtc: null, fmtMoney: m,
    });
    expect(s).toContain("$540,000");
    expect(s).toContain("62%");
    expect(s.toLowerCase()).toContain("retire");
  });

  it("adds the return multiple only when a value estimate is present", () => {
    const withVtc = buildDealInsight({
      cheapestLabel: "B", cheapestModelLabel: "Per provider", cheapestCost: 100, termYears: 1,
      savings: 0, runnerUpLabel: null, displaced: 0, pctCovered: 0, termVtc: 5.2, fmtMoney: m,
    });
    expect(withVtc).toContain("5.2×");
    const without = buildDealInsight({
      cheapestLabel: "B", cheapestModelLabel: "Per provider", cheapestCost: 100, termYears: 1,
      savings: 0, runnerUpLabel: null, displaced: 0, pctCovered: 0, termVtc: null, fmtMoney: m,
    });
    expect(without).not.toContain("×");
  });
});

/**
 * The fix that made Compare Pricing work: the Organization Volume entered once at
 * the top flows into every deal as the default billing volume. A per-year
 * provisioned override (advanced) wins when set. Previously deals billed against
 * a per-year field that defaulted to 0, so everything showed $0.
 */
const volumes: VolumeInputs = { providerCount: 50, annualEncounters: 200_000, staffedBeds: 0 };

describe("pricing comparison — org volume flows into deals", () => {
  it("uses the org provider count when there's no per-year override", () => {
    const deal = makeDefaultDeal("A", "a"); // per-provider/mo, 3yr, no overrides
    deal.unitPrice = 100; // $100 / provider / mo
    const r = computeDealResult(deal, volumes, 0);
    expect(r.years[0].annualCost).toBe(60_000); // 50 × $100 × 12
    expect(r.totalContractCost).toBe(180_000);  // flat across 3 years
  });

  it("a per-year override beats the org default for that year only", () => {
    const deal = makeDefaultDeal("A", "a");
    deal.unitPrice = 100;
    deal.yearConfigs[0] = { provisionedVolume: 80 }; // override Yr1
    const r = computeDealResult(deal, volumes, 0);
    expect(r.years[0].annualCost).toBe(96_000); // 80 × $100 × 12 (override)
    expect(r.years[1].annualCost).toBe(60_000); // Yr2 falls back to org 50
  });

  it("effectiveProvisioned = override if set, else org volume", () => {
    const deal = makeDefaultDeal("A", "a");
    deal.yearConfigs[0] = { provisionedVolume: 80 };
    expect(effectiveProvisioned(deal, volumes, 0)).toBe(80);
    expect(effectiveProvisioned(deal, volumes, 1)).toBe(50);
  });
});

describe("pricing comparison — vendor displacement (switch savings)", () => {
  it("a vendor's displaced annual = annualSpend × displacementPct", () => {
    const v: DisplacedVendor = { ...makeDefaultVendor("v"), annualSpend: 2_400_000, displacementPct: 90 };
    expect(vendorDisplacedAnnual(v)).toBe(2_160_000);
    expect(vendorDisplacedAnnual({ ...v, displacementPct: 0 })).toBe(0);
  });

  it("displacedInYear uses the proforma monthly ramp averaged per year", () => {
    const ramp12: DisplacedVendor[] = [
      { ...makeDefaultVendor("a"), annualSpend: 1_000_000, displacementPct: 100, transitionMonths: 12 },
    ];
    expect(displacedInYear(ramp12, 1)).toBe(541_667);   // avg of a 12-mo linear ramp over yr 1
    expect(displacedInYear(ramp12, 2)).toBe(1_000_000); // fully ramped by yr 2
    expect(displacedInYear(ramp12, 3)).toBe(1_000_000); // stays full

    const immediate: DisplacedVendor[] = [
      { ...makeDefaultVendor("b"), annualSpend: 1_000_000, displacementPct: 100, transitionMonths: 0 },
    ];
    expect(displacedInYear(immediate, 1)).toBe(1_000_000); // 0 months = immediate full
  });

  it("computeNetResult nets gross by year and reports % covered", () => {
    const volumes: VolumeInputs = { providerCount: 50, annualEncounters: 0, staffedBeds: 0 };
    const deal = makeDefaultDeal("A", "a");
    deal.unitPrice = 100; // 50 × $100 × 12 = $60,000/yr, 3yr gross = $180,000
    const result = computeDealResult(deal, volumes, 0);
    const vendors: DisplacedVendor[] = [
      { ...makeDefaultVendor("v"), annualSpend: 40_000, displacementPct: 100, transitionMonths: 0 },
    ];
    const net = computeNetResult(result, vendors);
    expect(net.displacedByYear).toEqual([40_000, 40_000, 40_000]);
    expect(net.totalDisplaced).toBe(120_000);
    expect(net.netByYear).toEqual([20_000, 20_000, 20_000]); // 60k − 40k
    expect(net.netTotalContract).toBe(60_000);               // 180k − 120k
    expect(Math.round(net.pctCovered)).toBe(67);             // 120k / 180k
  });

  it("net never goes below zero in a year (over-displacement is capped)", () => {
    const volumes: VolumeInputs = { providerCount: 50, annualEncounters: 0, staffedBeds: 0 };
    const deal = makeDefaultDeal("A", "a");
    deal.unitPrice = 100; // $60k/yr
    const result = computeDealResult(deal, volumes, 0);
    const vendors: DisplacedVendor[] = [
      { ...makeDefaultVendor("v"), annualSpend: 999_999, displacementPct: 100, transitionMonths: 0 },
    ];
    const net = computeNetResult(result, vendors);
    expect(net.netByYear.every((n) => n >= 0)).toBe(true);
  });
});

describe("value metrics reflect NET cost when displacement is on (ROI/payback fix)", () => {
  it("net cost yields better value-to-cost and faster payback than gross", () => {
    // value $120k/yr over 3 yr = $360k total value.
    const gross = computeValueMetrics([60_000, 60_000, 60_000], 180_000, 36, 120_000);
    const net = computeValueMetrics([20_000, 20_000, 20_000], 60_000, 36, 120_000);
    expect(gross.termVtc!).toBeCloseTo(2.0, 5); // 360 / 180
    expect(net.termVtc!).toBeCloseTo(6.0, 5);   // 360 / 60 — much better once cost is net
    expect(net.paybackMonths!).toBeLessThanOrEqual(gross.paybackMonths!);
  });

  it("computeDealResult value layer matches computeValueMetrics on gross (refactor parity)", () => {
    const volumes: VolumeInputs = { providerCount: 50, annualEncounters: 0, staffedBeds: 0 };
    const deal = makeDefaultDeal("A", "a");
    deal.unitPrice = 100; // $60k/yr, $180k over 3 yr
    const r = computeDealResult(deal, volumes, 120_000);
    const m = computeValueMetrics(r.years.map((y) => y.annualCost), r.totalContractCost, deal.contractTermMonths, 120_000);
    expect(r.termVtc).toBe(m.termVtc);
    expect(r.annualRoiPct).toBe(m.annualRoiPct);
    expect(r.paybackMonths).toBe(m.paybackMonths);
  });
});
