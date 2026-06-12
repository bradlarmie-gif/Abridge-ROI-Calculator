import { describe, it, expect } from "vitest";
import {
  computeAllDriverValues,
  computeExploreTotals,
} from "@/lib/exploreDriverCalcs";
import { EXPLORE_DRIVERS, type ExploreQuadrant } from "@/lib/exploreDrivers";
import {
  DEFAULT_EXPLORE_STATE,
  type ExploreState,
} from "@/pages/explore/ExploreFlow";

/**
 * Guardrail against the "two value engines" bug: the Investment screen
 * (ExploreInvestment) and the Your Model screen (ExploreModel) must report the
 * same Total Value for the same state.
 *
 * The Model screen derives its total from `computeAllDriverValues` summed by
 * quadrant plus annual "other financial benefits". `computeExploreTotals` is
 * the single source of truth both screens now consume. These tests assert that
 * helper reproduces the Model engine's total and that its efficiency /
 * documentation split always sums back to the total (so the breakdown rows on
 * the Investment screen can never disagree with the headline).
 */

// A representative outpatient model that exercises Capacity (patient access),
// Workforce (retention), and a Revenue annual benefit + a Quality one-time.
const TOTAL_HOURS_SAVED = 3000;

const state: ExploreState = {
  ...DEFAULT_EXPLORE_STATE,
  careSetting: "outpatient",
  numberOfProviders: 100,
  annualEncounters: 200000,
  utilizationPercent: 80,
  minutesSavedPerEncounter: 2,
  timeDriverInputs: {
    ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
    patientAccessEnabled: true,
    wellbeingEnabled: true,
    calculateRetentionValue: true,
  },
  otherFinancialBenefits: [
    { id: "b1", label: "Revenue benefit", amount: 50000, type: "annual", quadrant: "Revenue" },
    { id: "b2", label: "Quality one-time", amount: 20000, type: "oneTime", quadrant: "Quality" },
  ],
};

// Re-derive the Model screen's quadrant totals independently in the test so we
// are asserting against the canonical engine, not against the helper itself.
function modelQuadrantTotals(s: ExploreState, hours: number) {
  const allDriverValues = computeAllDriverValues(s, hours);
  const byQuadrant: Record<ExploreQuadrant, number> = {
    Capacity: 0,
    Workforce: 0,
    Revenue: 0,
    Quality: 0,
  };
  EXPLORE_DRIVERS.forEach((d) => {
    if (s.careSetting && d.settings.includes(s.careSetting)) {
      byQuadrant[d.quadrant] += allDriverValues[d.id] || 0;
    }
  });
  return byQuadrant;
}

describe("computeExploreTotals", () => {
  it("matches the Model screen's driver-engine total (Investment screen agrees with Model screen)", () => {
    const byQuadrant = modelQuadrantTotals(state, TOTAL_HOURS_SAVED);
    const expectedDriverSum =
      byQuadrant.Capacity + byQuadrant.Workforce + byQuadrant.Revenue + byQuadrant.Quality;
    const expectedAnnualBenefits = 50000; // Revenue annual benefit
    const expectedTotalAnnual = expectedDriverSum + expectedAnnualBenefits;

    const totals = computeExploreTotals(state, TOTAL_HOURS_SAVED);

    expect(totals.totalAnnualValue).toBe(expectedTotalAnnual);
    expect(totals.totalOneTimeValue).toBe(20000);
  });

  it("efficiency + documentation split always sums to the total annual value", () => {
    const totals = computeExploreTotals(state, TOTAL_HOURS_SAVED);
    expect(totals.efficiencyValue + totals.documentationValue).toBe(totals.totalAnnualValue);
  });

  it("maps Capacity+Workforce to efficiency and Revenue+Quality to documentation", () => {
    const byQuadrant = modelQuadrantTotals(state, TOTAL_HOURS_SAVED);
    const totals = computeExploreTotals(state, TOTAL_HOURS_SAVED);

    // efficiency = Capacity + Workforce drivers (no annual benefits in those quadrants here)
    expect(totals.efficiencyValue).toBe(byQuadrant.Capacity + byQuadrant.Workforce);
    // documentation = Revenue + Quality drivers + the $50k Revenue annual benefit
    expect(totals.documentationValue).toBe(byQuadrant.Revenue + byQuadrant.Quality + 50000);
  });
});
