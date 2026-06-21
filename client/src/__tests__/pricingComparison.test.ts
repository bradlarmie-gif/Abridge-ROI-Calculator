import { describe, it, expect } from "vitest";
import { computeDealResult, makeDefaultDeal, effectiveProvisioned, type VolumeInputs } from "@/lib/pricingComparisonCalc";

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
