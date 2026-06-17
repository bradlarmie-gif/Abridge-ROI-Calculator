import { describe, it, expect } from "vitest";
import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { computeRevenueBreakdown, computeWorkforceBreakdown } from "@/lib/exploreQuadrantValues";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";

const td = (overrides: Partial<ExploreState["timeDriverInputs"]>): ExploreState["timeDriverInputs"] => ({
  ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
  ...overrides,
});

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

describe("scribe cost reduction — screen total includes it (was silently dropped)", () => {
  // Regression guard: scribeCostReduction is a Workforce driver for OP/ED. The
  // screen-side Workforce total used to re-derive drivers inline and OMIT scribe,
  // so the Workforce screen + carry-forward understated vs the Model/PDF.
  it("position billing: canonical value is correct AND the breakdown includes it", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "outpatient",
      numberOfProviders: 100,
      annualEncounters: 200000,
      utilizationPercent: 80,
      timeDriverInputs: td({
        scribeCostReductionEnabled: true,
        scribeBillingMode: "position",
        scribePositionsEliminated: 5,
        scribeHeadcount: 10,
        scribeCostPerPosition: 40000,
      }),
    };
    // min(5,10) × $40,000 = $200,000
    expect(computeAllDriverValues(state, HOURS).scribeCostReduction).toBe(200000);
    expect(computeWorkforceBreakdown(state, HOURS).driverValues.scribeCostReduction)
      .toBe(computeAllDriverValues(state, HOURS).scribeCostReduction);
  });

  it("hourly billing: canonical value is correct AND the breakdown includes it", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "ed",
      numberOfProviders: 100,
      annualEncounters: 200000,
      utilizationPercent: 80,
      timeDriverInputs: td({
        scribeCostReductionEnabled: true,
        scribeBillingMode: "hourly",
        scribeHourlyRate: 30,
        scribeMinutesPerNote: 20,
        scribeCoveragePercent: 100,
        scribeVisitPercentEliminated: 100,
      }),
    };
    // $30 × (20/60) × 200,000 visits × 100% = $2,000,000
    expect(computeAllDriverValues(state, HOURS).scribeCostReduction).toBe(2000000);
    expect(computeWorkforceBreakdown(state, HOURS).driverValues.scribeCostReduction)
      .toBe(computeAllDriverValues(state, HOURS).scribeCostReduction);
  });
});

describe("nursing workforce parity (screen breakdown vs canonical engine)", () => {
  const nursing: ExploreState = {
    ...DEFAULT_EXPLORE_STATE,
    careSetting: "nursing",
    numberOfProviders: 200,
    timeDriverInputs: td({
      nursingRetentionEnabled: true,
      nursingAgencyEnabled: true,
      nursingOtEnabled: true,
      retentionImpactScenario: "typical",
    }),
  };
  it.each(["nursingRetention", "nursingAgency", "nursingOvertime"])(
    "%s matches the canonical engine",
    (driverId) => {
      expect(computeWorkforceBreakdown(nursing, HOURS).driverValues[driverId])
        .toBe(computeAllDriverValues(nursing, HOURS)[driverId]);
    },
  );
});

describe("denials custom-scenario parity (screen vs canonical use the same map)", () => {
  it("matches when the user picks Custom", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "outpatient",
      numberOfProviders: 100,
      annualEncounters: 200000,
      utilizationPercent: 80,
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        denialsEnabled: true,
        denialsScenario: "custom",
        denialsCustomPercent: 42,
      },
    };
    expect(computeRevenueBreakdown(state, HOURS).driverValues.denialPrevention)
      .toBe(computeAllDriverValues(state, HOURS).denialPrevention);
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
