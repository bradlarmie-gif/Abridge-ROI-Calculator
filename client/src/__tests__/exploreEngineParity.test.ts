import { describe, it, expect } from "vitest";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { computeRevenueBreakdown, computeWorkforceBreakdown } from "@/lib/exploreQuadrantValues";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";

/**
 * The per-screen engine (exploreQuadrantValues + driver cards) must agree with
 * the canonical headline/PDF engine (exploreDriverCalcs). They had drifted:
 * wRVU used different scenario tables, and inpatient wellbeing used different
 * turnover fields — so the screen showed one dollar figure and the Model/PDF
 * another for the same inputs.
 */

const HOURS = 3000;

describe("wRVU value parity (screen engine vs headline engine)", () => {
  it("matches for outpatient on the aggressive scenario", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "outpatient",
      numberOfProviders: 100,
      annualEncounters: 200000,
      utilizationPercent: 80,
      docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, wrvuEnabled: true, wrvuScenario: "aggressive" },
    };
    expect(computeRevenueBreakdown(state, HOURS).driverValues.wrvu)
      .toBe(computeAllDriverValues(state, HOURS).wrvu);
  });

  it("matches for ED on the aggressive scenario", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "ed",
      numberOfProviders: 100,
      annualEncounters: 200000,
      utilizationPercent: 80,
      docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, wrvuEnabled: true, wrvuScenario: "aggressive" },
    };
    expect(computeRevenueBreakdown(state, HOURS).driverValues.edEmLevel)
      .toBe(computeAllDriverValues(state, HOURS).edEmLevel);
  });
});

describe("inpatient provider-wellbeing parity (engine honors IP-specific fields)", () => {
  it("matches the screen engine, which uses ipAnnualTurnoverRate/ipBurnoutRelatedTurnover/ipReplacementCost", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "inpatient",
      numberOfProviders: 100,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        wellbeingEnabled: true,
        calculateRetentionValue: true,
      },
    };
    expect(computeAllDriverValues(state, HOURS).providerWellbeing)
      .toBe(computeWorkforceBreakdown(state, HOURS).driverValues.providerWellbeing);
  });
});
