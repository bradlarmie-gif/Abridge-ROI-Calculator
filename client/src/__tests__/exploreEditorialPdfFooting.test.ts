import { describe, it, expect } from "vitest";
import { SAMPLE_EXPLORE_PDF_DATA } from "@/components/explore/ExploreEditorialPdf";

/**
 * EXPLORE PDF — footing guard (the same class the Proforma footing bug was in:
 * parts must sum to the whole, on a consistent included/excluded basis).
 *
 * The Explore PDF splits value into quadrant tiles and a grand total. Two
 * invariants are drift-prone and, before this, unguarded — the hand-maintained
 * sample below (what renders in the throwaway ?explorepdf review route) already
 * had to be regenerated once:
 *
 *   1. Each quadrant's annualTotal == the sum of its INCLUDED drivers only.
 *      Excluded drivers (isIncluded: false, e.g. locum avoidance) must not count.
 *   2. totalAnnualValue == the sum of every quadrant's annualTotal. The proof
 *      layer (Quality for outpatient) contributes 0 and is thus excluded.
 */

describe("Explore PDF data foots (parts sum to the whole)", () => {
  const data = SAMPLE_EXPLORE_PDF_DATA;

  it("each quadrant annualTotal equals the sum of its INCLUDED drivers", () => {
    for (const q of data.quadrants) {
      const includedSum = q.drivers
        .filter((d) => d.isIncluded)
        .reduce((s, d) => s + d.value, 0);
      expect(
        Math.abs(q.annualTotal - includedSum),
        `${q.quadrant}: annualTotal ${q.annualTotal} != sum of included drivers ${includedSum}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("totalAnnualValue equals the sum of all quadrant annualTotals", () => {
    const quadrantSum = data.quadrants.reduce((s, q) => s + q.annualTotal, 0);
    expect(Math.abs(data.totalAnnualValue - quadrantSum)).toBeLessThanOrEqual(1);
  });

  it("excluded drivers exist in the sample and are genuinely left out of the totals", () => {
    // Guards the guard: if every driver were included, invariant #1 could pass
    // trivially. The sample must actually exercise the excluded path.
    const excluded = data.quadrants.flatMap((q) => q.drivers).filter((d) => !d.isIncluded && d.value > 0);
    expect(excluded.length, "sample has no excluded-but-nonzero driver to exercise the basis check").toBeGreaterThan(0);
    // and that excluded value is NOT in the grand total
    const excludedValue = excluded.reduce((s, d) => s + d.value, 0);
    const allDriverValue = data.quadrants.flatMap((q) => q.drivers).reduce((s, d) => s + d.value, 0);
    expect(data.totalAnnualValue).toBeLessThanOrEqual(allDriverValue - excludedValue + 1);
  });
});
