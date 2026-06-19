import { describe, it, expect } from "vitest";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { computeSettingDriverFormulas, scaledExploreStateFor } from "@/lib/presentFormulas";
import type { ProformaSettingSnapshot } from "@/pages/proforma/proformaTypes";

/**
 * The Present "show the math" formulas must RECONCILE to the dollar shown. The
 * proforma scales each driver's value by fullScale/pilot; per-unit rates are
 * scale-invariant, so re-deriving at full-scale volume must reproduce that same
 * scaled value. This guards the scaling premise + the proforma-id→engine-key map.
 */

const HOURS = 10_000;

const state: ExploreState = {
  ...DEFAULT_EXPLORE_STATE,
  careSetting: "outpatient",
  numberOfProviders: 100,
  annualEncounters: 200_000,
  utilizationPercent: 80,
  timeDriverInputs: {
    ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
    patientAccessEnabled: true,
    accessProviders: 100,
    capacityRealizationPercent: 25,
    visitDuration: 30,
    revenuePerVisit: 200,
  },
  docQualityInputs: {
    ...DEFAULT_EXPLORE_STATE.docQualityInputs,
    wrvuEnabled: true,
    wrvuScenario: "typical",
  },
};

// Minimal snapshot — the formula helpers only read these fields.
const setting = {
  careSetting: "outpatient",
  providerCount: 100,
  fullScaleProviders: 200, // factor = 2
  totalHoursSaved: HOURS,
  fullExploreState: state,
  drivers: [
    { id: "wrvu", name: "E/M Level Accuracy", value: 0, category: "documentation", quadrant: "Revenue", onset: "immediate" },
    { id: "patientAccess", name: "Patient Access", value: 0, category: "time", quadrant: "Capacity", onset: "delayed" },
  ],
} as unknown as ProformaSettingSnapshot;

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

describe("present formulas", () => {
  it("produces a formula string for the mapped drivers", () => {
    const formulas = computeSettingDriverFormulas(setting);
    expect(formulas.wrvu).toBeTruthy();
    expect(formulas.patientAccess).toBeTruthy();
  });

  it("re-derives at full scale to the same value the proforma displays (factor × pilot)", () => {
    const pilot = computeAllDriverValues(state, HOURS);
    const { state: scaled, hours } = scaledExploreStateFor(setting);
    const atScale = computeAllDriverValues(scaled, hours);

    // proforma value = round(pilot × factor); the formula is built from `atScale`.
    expect(fmtCompact(atScale.wrvu)).toBe(fmtCompact(Math.round(pilot.wrvu * 2)));
    expect(fmtCompact(atScale.patientAccess)).toBe(fmtCompact(Math.round(pilot.patientAccess * 2)));
    // sanity: both are real, non-zero numbers
    expect(atScale.wrvu).toBeGreaterThan(0);
    expect(atScale.patientAccess).toBeGreaterThan(0);
  });
});
