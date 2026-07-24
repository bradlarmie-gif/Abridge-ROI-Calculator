import { describe, it, expect } from "vitest";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { scaledExploreStateFor, summaryKeyFor } from "@/lib/presentFormulas";
import { buildDriverFormula } from "@/lib/proformaDriverFormulaSteps";
import type { ProformaSettingSnapshot } from "@/pages/proforma/proformaTypes";

/**
 * The PDF's value-driver breakdown steps must RECONCILE to the dollar the row
 * shows — the intermediate numbers can't be a fiction next to a correct total
 * (the "4,000 visits × $200 = $288K" class of bug). This guards that the moved,
 * shared step builder ties out per driver so it can't silently drift again.
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

// The engine value the proforma would show for this driver, at full scale.
function scaledValue(setting: ProformaSettingSnapshot, driverId: string): number {
  const key = summaryKeyFor(driverId, setting.careSetting)!;
  const { state, hours } = scaledExploreStateFor(setting);
  return computeAllDriverValues(state, hours)[key];
}

// Pull the plain numbers out of a step string ("1,440 visits × $200/visit" -> [1440, 200]).
function nums(s: string): number[] {
  return [...s.matchAll(/([\d,]+(?:\.\d+)?)/g)].map(m => parseFloat(m[1].replace(/,/g, "")));
}

describe("proforma driver formula steps — reconcile to the value", () => {
  it("Patient Access: the visits × revenue in the result step equals the value", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "outpatient",
      numberOfProviders: 100,
      annualEncounters: 240_000,
      utilizationPercent: 30,
      minutesSavedPerEncounter: 2,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        patientAccessEnabled: true,
        accessProviders: 100,
        capacityRealizationPercent: 25,
        visitDuration: 30,
        revenuePerVisit: 200,
      },
    } as ExploreState;
    const s = snap("outpatient", state, ["patientAccess"], 100, 100, 8_000);
    const value = scaledValue(s, "patientAccess");
    const steps = buildDriverFormula("patientAccess", value, s);

    // last step ties to the value
    const last = steps[steps.length - 1];
    expect(last.isResult).toBe(true);
    expect(last.value).toBe(fmtCompact(value));

    // and the result step's OWN multiplicands must multiply to the value —
    // this is exactly what "4,000 visits × $200 = $288K" violated.
    const product = nums(last.label).reduce((a, b) => a * b, 1);
    expect(Math.abs(product - value) / value).toBeLessThan(0.03);
  });

  it("E/M (wRVU): last step ties out and an Abridge-utilization step is present", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "outpatient",
      numberOfProviders: 100,
      annualEncounters: 240_000,
      utilizationPercent: 30,
      docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, wrvuEnabled: true, wrvuScenario: "typical" },
    } as ExploreState;
    const s = snap("outpatient", state, ["wrvu"], 100, 100);
    const value = scaledValue(s, "wrvu");
    const steps = buildDriverFormula("wrvu", value, s);
    expect(steps[steps.length - 1].value).toBe(fmtCompact(value));
    expect(steps.some(st => /Abridge utilization/i.test(st.label))).toBe(true);
  });

  it("Nurse Retention: shows the 40% burnout factor and ties out", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "nursing",
      numberOfProviders: 300,
      nursingStaffedBeds: 300,
      nursingOccupancyRate: 85,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        nursingRetentionEnabled: true,
        nursingTurnoverRate: 30,
        nursingReplacementCost: 60_000,
        retentionImpactScenario: "typical",
      },
    } as ExploreState;
    const s = snap("nursing", state, ["nursingRetention"], 300, 300);
    // nursing retention isn't in summaryKeyFor; compute the engine value directly.
    const { state: scaled, hours } = scaledExploreStateFor(s);
    const value = computeAllDriverValues(scaled, hours).nursingRetention;
    const steps = buildDriverFormula("nursingRetention", value, s);
    expect(steps[steps.length - 1].value).toBe(fmtCompact(value));
    // 40% burnout-related must appear (its omission overstated the retained count)
    expect(steps.some(st => /40% burnout/i.test(st.label))).toBe(true);
    // and it must NOT re-derive nurses from beds×occupancy×2.5
    expect(steps.some(st => /occupancy/i.test(st.label))).toBe(false);
  });
});
