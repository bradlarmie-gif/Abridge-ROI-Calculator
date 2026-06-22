import { describe, it, expect } from "vitest";
import {
  computeDealResult, makeDefaultDeal, effectiveProvisioned, type VolumeInputs,
  vendorDisplacedAnnual, displacedInYear, computeNetResult, makeDefaultVendor,
  computeValueMetrics,
  type DisplacedVendor,
} from "@/lib/pricingComparisonCalc";

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

  it("displacedInYear respects each vendor's startYear (cost offset over years, proforma-style)", () => {
    const vendors: DisplacedVendor[] = [
      { ...makeDefaultVendor("a"), annualSpend: 1_000_000, displacementPct: 100, startYear: 1 },
      { ...makeDefaultVendor("b"), annualSpend: 500_000, displacementPct: 100, startYear: 2 },
    ];
    expect(displacedInYear(vendors, 1)).toBe(1_000_000); // only vendor a is live in yr 1
    expect(displacedInYear(vendors, 2)).toBe(1_500_000); // both live from yr 2
  });

  it("computeNetResult nets gross by year and reports % covered", () => {
    const volumes: VolumeInputs = { providerCount: 50, annualEncounters: 0, staffedBeds: 0 };
    const deal = makeDefaultDeal("A", "a");
    deal.unitPrice = 100; // 50 × $100 × 12 = $60,000/yr, 3yr gross = $180,000
    const result = computeDealResult(deal, volumes, 0);
    const vendors: DisplacedVendor[] = [
      { ...makeDefaultVendor("v"), annualSpend: 40_000, displacementPct: 100, startYear: 1 },
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
      { ...makeDefaultVendor("v"), annualSpend: 999_999, displacementPct: 100, startYear: 1 },
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
