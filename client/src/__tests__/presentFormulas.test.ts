import { describe, it, expect } from "vitest";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/exploreState";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { computeSettingDriverFormulas, scaledExploreStateFor, summaryKeyFor } from "@/lib/presentFormulas";
import type { ProformaSettingSnapshot } from "@/pages/proforma/proformaTypes";

/**
 * The Present "show the math" formulas must RECONCILE to the dollar shown. The
 * proforma scales each driver's value by fullScale/pilot; per-unit rates are
 * scale-invariant, so re-deriving at full-scale volume must reproduce that same
 * scaled value. This guards the scaling premise AND the proforma-id→engine-key
 * map, across every care setting.
 */

function snap(
  careSetting: string,
  fullExploreState: ExploreState,
  driverIds: string[],
  providerCount: number,
  fullScaleProviders: number,
  totalHoursSaved = 0,
): ProformaSettingSnapshot {
  return {
    careSetting,
    providerCount,
    fullScaleProviders,
    totalHoursSaved,
    fullExploreState,
    drivers: driverIds.map(id => ({ id, name: id, value: 0, category: "time", quadrant: "Capacity", onset: "immediate" })),
  } as unknown as ProformaSettingSnapshot;
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

// Asserts: formula exists, value is real, and the at-scale re-derivation equals
// round(pilot × factor) — i.e. it ties out to what the proforma displays.
function expectReconciles(setting: ProformaSettingSnapshot, driverId: string, factor: number) {
  const formulas = computeSettingDriverFormulas(setting);
  expect(formulas[driverId], `${setting.careSetting}/${driverId}: formula present`).toBeTruthy();

  const key = summaryKeyFor(driverId, setting.careSetting)!;
  const pilot = computeAllDriverValues(setting.fullExploreState, setting.totalHoursSaved);
  const { state, hours } = scaledExploreStateFor(setting);
  const atScale = computeAllDriverValues(state, hours);

  expect(atScale[key], `${driverId}: nonzero`).toBeGreaterThan(0);
  expect(fmtCompact(atScale[key]), `${driverId}: ties out`).toBe(fmtCompact(Math.round(pilot[key] * factor)));
}

describe("present formulas — reconcile across all care settings", () => {
  it("outpatient: patient access, retention, and E/M (wRVU) tie out", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "outpatient",
      retentionMode: "counted",
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
        wellbeingEnabled: true,
        calculateRetentionValue: true,
      },
      docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, wrvuEnabled: true, wrvuScenario: "typical" },
    };
    const s = snap("outpatient", state, ["patientAccess", "retention", "wrvu"], 100, 200, 10_000);
    expectReconciles(s, "patientAccess", 2);
    expectReconciles(s, "retention", 2);
    expectReconciles(s, "wrvu", 2);
  });

  it("ED: denial prevention ties out", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "ed",
      numberOfProviders: 100,
      annualEncounters: 200_000,
      utilizationPercent: 80,
      docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, denialsEnabled: true },
    };
    expectReconciles(snap("ed", state, ["denials"], 100, 200), "denials", 2);
  });

  it("inpatient: DRG accuracy ties out", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "inpatient",
      numberOfProviders: 100,
      annualEncounters: 200_000,
      utilizationPercent: 80,
      docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, ipDrgEnabled: true },
    };
    expectReconciles(snap("inpatient", state, ["ipDrg"], 100, 200), "ipDrg", 2);
  });

  it("nursing: overtime reduction ties out (factor 1, beds=full scale)", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "nursing",
      numberOfProviders: 200,
      nursingStaffedBeds: 200,
      nursingOccupancyRate: 80,
      timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs, nursingOtEnabled: true },
    };
    expectReconciles(snap("nursing", state, ["nursingOt"], 200, 200), "nursingOt", 1);
  });

  it("does NOT emit a formula for inpatient/nursing retention (won't tie out)", () => {
    const ip = snap("inpatient", { ...DEFAULT_EXPLORE_STATE, careSetting: "inpatient" } as ExploreState, ["retention"], 100, 200);
    const nursing = snap("nursing", { ...DEFAULT_EXPLORE_STATE, careSetting: "nursing" } as ExploreState, ["retention"], 200, 200);
    expect(computeSettingDriverFormulas(ip).retention).toBeUndefined();
    expect(computeSettingDriverFormulas(nursing).retention).toBeUndefined();
  });
});
