import { describe, it, expect } from "vitest";
import { computeAllDriverValues, computeExploreTotals } from "@/lib/exploreDriverCalcs";
import { computeRevenueBreakdown, computeWorkforceBreakdown, computeCapacityBreakdown } from "@/lib/exploreQuadrantValues";
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
  it.each(["nursingRetention", "nursingAgency"])(
    "%s matches the canonical engine (Workforce)",
    (driverId) => {
      expect(computeWorkforceBreakdown(nursing, HOURS).driverValues[driverId])
        .toBe(computeAllDriverValues(nursing, HOURS)[driverId]);
    },
  );
  // Overtime is a Capacity driver for nursing (documentation time → payroll), per
  // the methodology — so it must show up in the Capacity breakdown, not Workforce.
  it("nursingOvertime matches the canonical engine (Capacity)", () => {
    expect(computeCapacityBreakdown(nursing, HOURS).driverValues.nursingOvertime)
      .toBe(computeAllDriverValues(nursing, HOURS).nursingOvertime);
    expect(computeWorkforceBreakdown(nursing, HOURS).driverValues.nursingOvertime)
      .toBeUndefined();
  });

  // The headline rollup (valueByQuadrant) feeds the Model totals and the PDF
  // domain tiles. Overtime must land in Capacity there too — and Workforce must
  // be retention + agency only (guards against the old double-count where OT was
  // summed into Workforce while the Capacity tile also showed it).
  it("rolls nursing overtime into Capacity, not Workforce", () => {
    const all = computeAllDriverValues(nursing, HOURS);
    const { valueByQuadrant } = computeExploreTotals(nursing, HOURS);
    expect(all.nursingOvertime).toBeGreaterThan(0);
    expect(valueByQuadrant.Workforce).toBe((all.nursingRetention ?? 0) + (all.nursingAgency ?? 0));
    expect(valueByQuadrant.Capacity).toBe(all.nursingOvertime);
  });
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

describe("inpatient DRG / Obs-defense and outpatient HCC parity (screen vs canonical engine)", () => {
  // Locks the behavior of the still-hand-copied scenario maps in
  // exploreQuadrantValues.ts (HCC {3,5,10}, DRG {15,20,25}, Obs {25,40,55})
  // BEFORE they're replaced with imports of the exported
  // HCC_UPLIFT_SCENARIOS / IP_DRG_PROTECT_SCENARIOS /
  // IP_OBS_PREVENTABLE_SCENARIOS constants, so a refactor can't silently
  // change a screen number.
  //
  // (The quantified CDI query-reduction driver / IP_CDI_SCENARIOS was removed
  // as a product decision — avoided CDI queries aren't cash unless CDI
  // staffing is cut, and it double-counted with drgAccuracy. There is no
  // longer a parity case for it.)
  const inpatientBase: ExploreState = {
    ...DEFAULT_EXPLORE_STATE,
    careSetting: "inpatient",
    numberOfProviders: 100,
    annualEncounters: 200000,
    utilizationPercent: 80,
  };

  it("drgAccuracy matches for inpatient DRG on the typical scenario", () => {
    const state: ExploreState = {
      ...inpatientBase,
      docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, ipDrgEnabled: true, ipDrgScenario: "typical" },
    };
    expect(computeRevenueBreakdown(state, HOURS).driverValues.drgAccuracy)
      .toBe(computeAllDriverValues(state, HOURS).drgAccuracy);
  });

  it("obsDefense matches for inpatient Obs defense on the conservative scenario", () => {
    const state: ExploreState = {
      ...inpatientBase,
      docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs, ipObsDefenseEnabled: true, ipObsDefensePreventableScenario: "conservative" },
    };
    expect(computeRevenueBreakdown(state, HOURS).driverValues.obsDefense)
      .toBe(computeAllDriverValues(state, HOURS).obsDefense);
  });

  it("hccCapture matches for outpatient HCC on the optimistic scenario", () => {
    const state: ExploreState = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "outpatient",
      numberOfProviders: 100,
      annualEncounters: 200000,
      utilizationPercent: 80,
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        hccEnabled: true,
        hccPlans: DEFAULT_EXPLORE_STATE.docQualityInputs.hccPlans.map(p => ({ ...p, uplift: "optimistic" as const })),
      },
    };
    expect(computeRevenueBreakdown(state, HOURS).driverValues.hccCapture)
      .toBe(computeAllDriverValues(state, HOURS).hccCapture);
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
