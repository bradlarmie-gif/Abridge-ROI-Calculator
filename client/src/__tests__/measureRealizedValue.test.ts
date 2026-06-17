import { describe, it, expect } from "vitest";
import { computeRealizedDriverValue, type MeasureDriverEntry } from "@/lib/measureCalculator";
import type { ExploreDriver } from "@/lib/exploreDrivers";

/**
 * Single source of truth for a Measure driver's realized $ value. The Measure
 * output screen and its exported PDF must agree — previously the PDF builder
 * omitted the per-encounter multiplier, understating per-encounter drivers by
 * the encounter count (e.g. $1.5M on screen rendered as ~$5 in the PDF).
 */

function driver(measureDefaults: any, visibility: "quantified" | "qualitative" = "quantified"): ExploreDriver {
  return {
    id: "x",
    label: "X",
    shortDescription: "",
    quadrant: "Revenue",
    settings: ["outpatient"],
    visibility,
    measureDefaults,
  } as unknown as ExploreDriver;
}

function entry(overrides: Partial<MeasureDriverEntry>): MeasureDriverEntry {
  return {
    driverId: "x",
    withoutAbridge: 0,
    withAbridge: 0,
    valuePerUnit: 0,
    attributionPercent: 100,
    realizationPercent: 100,
    expanded: false,
    ...overrides,
  } as MeasureDriverEntry;
}

describe("computeRealizedDriverValue", () => {
  it("scales a per-encounter driver by the abridge encounter count", () => {
    const d = driver({ isPerEncounterRate: true, lowerIsBetter: false });
    const e = entry({ withAbridge: 5, withoutAbridge: 4, valuePerUnit: 33, attributionPercent: 50 });
    // (5-4) * 33 * 300,000 * 0.5 = 4,950,000  (NOT 16.5 — the old PDF bug)
    expect(computeRealizedDriverValue(d, e, 300000)).toBe(4_950_000);
  });

  it("falls back to scaleValue/scaleDivisor for a per-encounter driver with 0 encounters", () => {
    const d = driver({ isPerEncounterRate: true });
    const e = entry({ withAbridge: 5, withoutAbridge: 4, valuePerUnit: 33, attributionPercent: 50 });
    // no encounters -> scale = 1 -> 1 * 33 * 1 * 0.5 = 16.5 -> 17
    expect(computeRealizedDriverValue(d, e, 0)).toBe(17);
  });

  it("uses scaleValue/scaleDivisor for a non-per-encounter driver", () => {
    const d = driver({ isPerEncounterRate: false });
    const e = entry({ withAbridge: 2, withoutAbridge: 1, valuePerUnit: 10, attributionPercent: 100, scaleValue: 100, scaleDivisor: 2 });
    // scale = 100/2 = 50 -> 1 * 10 * 50 * 1 = 500
    expect(computeRealizedDriverValue(d, e, 999999)).toBe(500);
  });

  it("respects lowerIsBetter (improvement = without - with)", () => {
    const d = driver({ isPerEncounterRate: false, lowerIsBetter: true });
    const e = entry({ withAbridge: 3, withoutAbridge: 8, valuePerUnit: 100, attributionPercent: 100 });
    // delta = 8 - 3 = 5 -> 5 * 100 * 1 * 1 = 500
    expect(computeRealizedDriverValue(d, e, 0)).toBe(500);
  });

  it("returns 0 for a non-quantified driver", () => {
    const d = driver({ isPerEncounterRate: true }, "qualitative");
    const e = entry({ withAbridge: 5, withoutAbridge: 4, valuePerUnit: 33, attributionPercent: 100 });
    expect(computeRealizedDriverValue(d, e, 300000)).toBe(0);
  });

  it("applies realization% as a discount (the lever actually moves the number)", () => {
    const d = driver({ isPerEncounterRate: false });
    const e = entry({ withAbridge: 2, withoutAbridge: 1, valuePerUnit: 100, attributionPercent: 100, realizationPercent: 50 });
    // delta 1 × $100 × scale 1 × 100% attribution × 50% realization = 50
    expect(computeRealizedDriverValue(d, e, 0)).toBe(50);
  });
});
