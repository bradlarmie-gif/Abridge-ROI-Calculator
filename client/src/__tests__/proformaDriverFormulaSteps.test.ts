import { describe, it, expect } from "vitest";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { scaledExploreStateFor } from "@/lib/presentFormulas";
import { buildDriverFormula } from "@/lib/proformaDriverFormulaSteps";
import type { ProformaSettingSnapshot } from "@/pages/proforma/proformaTypes";

/**
 * The PDF's value-driver breakdown steps must RECONCILE to the dollar the row
 * shows — the intermediate numbers can't be a fiction next to a correct total
 * (the "4,000 visits × $200 = $288K" class of bug). This guards the shared step
 * builder per driver so it can't silently drift from the engine again.
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

// proforma driver id -> engine result key
const ENGINE_KEY: Record<string, string> = {
  patientAccess: "patientAccess",
  edLwbs: "lwbsRecovery",
  edAdmission: "admissionCapture",
  wrvu: "wrvu",
  edEmLevel: "edEmLevel",
  hcc: "hccCapture",
  denials: "denialPrevention",
  ipDrg: "drgAccuracy",
  ipObsDefense: "obsDefense",
  retention: "providerWellbeing",
  nursingRetention: "nursingRetention",
  nursingOt: "nursingOvertime",
  nursingHapi: "nursingHapi",
  nursingFalls: "nursingFalls",
  nursingSepsis: "nursingSepsis",
};

function engineValue(setting: ProformaSettingSnapshot, driverId: string): number {
  const { state, hours } = scaledExploreStateFor(setting);
  return computeAllDriverValues(state, hours)[ENGINE_KEY[driverId]];
}

// Numeric factors implied by a string: "1,200 visits × $200 × 85% realization"
// -> [1200, 200, 0.85]. Handles commas, $, K/M, and % (as /100).
function factorsIn(s: string): number[] {
  return [...s.matchAll(/\$?([\d,]+(?:\.\d+)?)\s*(%|K|M)?/g)].map(m => {
    let v = parseFloat(m[1].replace(/,/g, ""));
    if (m[2] === "%") v /= 100;
    if (m[2] === "K") v *= 1000;
    if (m[2] === "M") v *= 1_000_000;
    return v;
  });
}

// The product implied by the result step (seeding with the prior step's
// intermediate when the result references it by name). null = not fully
// displayed as numbers (some factors are prose), so arithmetic can't be checked.
function resultProduct(steps: { label: string; value: string }[]): number | null {
  if (steps.length === 0) return null;
  const r = steps[steps.length - 1];
  const factors = factorsIn(r.label);
  if (!/^\s*[\d$]/.test(r.label) && steps.length >= 2) {
    const prior = factorsIn(steps[steps.length - 2].value)[0];
    if (prior != null) factors.unshift(prior);
  }
  if (factors.length < 2) return null;
  return factors.reduce((a, b) => a * b, 1);
}

/**
 * Structural + (where the math is fully displayed as numbers) arithmetic
 * reconciliation. `checkArithmetic=false` for drivers whose result legitimately
 * carries a prose factor that isn't a single number (e.g. HCC's "value per HCC"
 * varies per plan), so their steps can't be multiplied out from the display.
 */
function expectDriverReconciles(setting: ProformaSettingSnapshot, driverId: string, checkArithmetic = true) {
  const value = engineValue(setting, driverId);
  expect(value, `${driverId}: engine value > 0`).toBeGreaterThan(0);
  const steps = buildDriverFormula(driverId, value, setting);
  expect(steps.length, `${driverId}: has steps`).toBeGreaterThan(0);
  const last = steps[steps.length - 1];
  expect(last.isResult, `${driverId}: last step is the result`).toBe(true);
  expect(last.value, `${driverId}: result shows the value`).toBe(fmtCompact(value));
  const product = resultProduct(steps);
  if (checkArithmetic && product != null) {
    expect(Math.abs(product - value) / value, `${driverId}: steps multiply to the value`).toBeLessThan(0.03);
  }
  return steps;
}

describe("proforma driver formula steps — reconcile to the value, every driver", () => {
  it("outpatient: patientAccess, wrvu, hcc, denials", () => {
    const state = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "outpatient",
      numberOfProviders: 100,
      annualEncounters: 240_000,
      utilizationPercent: 30,
      minutesSavedPerEncounter: 2,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        patientAccessEnabled: true, accessProviders: 100, capacityRealizationPercent: 25, visitDuration: 30, revenuePerVisit: 200,
      },
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        wrvuEnabled: true, wrvuScenario: "typical",
        hccEnabled: true,
        denialsEnabled: true, denialsScenario: "typical",
      },
    } as ExploreState;
    const s = snap("outpatient", state, ["patientAccess", "wrvu", "hcc", "denials"], 100, 100, 8_000);

    expectDriverReconciles(s, "patientAccess");
    expectDriverReconciles(s, "wrvu");
    // HCC must show real covered lives (from hccPlans), not the old "0 MA lives".
    // Arithmetic isn't display-checkable (value-per-HCC is prose, varies per plan).
    const hcc = expectDriverReconciles(s, "hcc", false);
    // a real, non-zero covered-lives count (the old bug printed "0 MA lives")
    expect(hcc.some(st => /^[1-9][\d,]*\s+covered lives/.test(st.value))).toBe(true);
    // denials must apply utilization (Abridge encounters), not the raw total.
    const den = expectDriverReconciles(s, "denials");
    expect(den.some(st => /Abridge utilization/i.test(st.label))).toBe(true);
  });

  it("ED: LWBS recovery + admission capture", () => {
    const state = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "ed",
      numberOfProviders: 60,
      annualEncounters: 120_000,
      utilizationPercent: 100,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        edLwbsEnabled: true, edLwbsRate: 3, edLwbsReduction: 20, edRevenuePerVisit: 350, edLwbsRealization: 85,
        edThroughputEnabled: true, edAdmissionRate: 15, edAdmissionRevenue: 8_000, edAdmissionRealization: 75,
      },
    } as ExploreState;
    const s = snap("ed", state, ["edLwbs", "edAdmission"], 60, 60);
    expectDriverReconciles(s, "edLwbs");
    expectDriverReconciles(s, "edAdmission");
  });

  it("inpatient: DRG accuracy + Obs defense + provider retention", () => {
    const state = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "inpatient",
      numberOfProviders: 40,
      annualEncounters: 20_000,
      utilizationPercent: 60,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        wellbeingEnabled: true, calculateRetentionValue: true,
        ipAnnualTurnoverRate: 10, ipBurnoutRelatedTurnover: 45, ipReplacementCost: 400_000, retentionImpactScenario: "typical",
      },
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        ipDrgEnabled: true, ipDrgScenario: "typical", ipDrgAtRiskRate: 8, ipDrgWeightIncrease: 0.3, ipDrgBasePayment: 12_000, ipDrgRealization: 60,
        ipObsDefenseEnabled: true, ipObsDefensePreventableScenario: "typical", ipObsDefenseDenialRate: 6, ipObsDefenseRevenueDelta: 3_000, ipObsDefenseRealization: 65,
      },
    } as ExploreState;
    const s = snap("inpatient", state, ["ipDrg", "ipObsDefense", "retention"], 40, 40);
    expectDriverReconciles(s, "ipDrg");
    expectDriverReconciles(s, "ipObsDefense");
    // retention: engine value exists; steps present and value shown
    const val = engineValue(s, "retention");
    if (val > 0) {
      const steps = buildDriverFormula("retention", val, s);
      expect(steps[steps.length - 1].value).toBe(fmtCompact(val));
    }
  });

  it("nursing: retention, overtime, HAPI, falls, sepsis", () => {
    const state = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "nursing",
      numberOfProviders: 300,
      nursingStaffedBeds: 300,
      nursingOccupancyRate: 85,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        nursingRetentionEnabled: true, nursingTurnoverRate: 30, nursingReplacementCost: 60_000, retentionImpactScenario: "typical",
        nursingOtEnabled: true, nursingOtHoursPerNurseWeek: 4, nursingOtReductionPercent: 15, nursingOtHourlyRate: 62,
      },
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        nursingHapiEnabled: true, nursingFallsEnabled: true, nursingSepsisEnabled: true,
      },
    } as ExploreState;
    const s = snap("nursing", state, ["nursingRetention", "nursingOt", "nursingHapi", "nursingFalls", "nursingSepsis"], 300, 300);

    const ret = expectDriverReconciles(s, "nursingRetention");
    expect(ret.some(st => /40% burnout/i.test(st.label))).toBe(true);
    expect(ret.some(st => /occupancy/i.test(st.label))).toBe(false);
    expectDriverReconciles(s, "nursingOt");
    expectDriverReconciles(s, "nursingHapi");
    expectDriverReconciles(s, "nursingFalls");
    expectDriverReconciles(s, "nursingSepsis");
  });
});
