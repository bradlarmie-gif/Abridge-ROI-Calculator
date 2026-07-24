import { describe, it, expect } from "vitest";
import { DEFAULT_EXPLORE_STATE, type ExploreState } from "@/pages/explore/ExploreFlow";
import { buildExploreProformaDrivers, type ProformaDriverExtras } from "@/pages/explore/ExploreModel";
import { computeAllDriverValues, computeExploreTotals } from "@/lib/exploreDriverCalcs";

/**
 * Snapshot parity (see docs/superpowers/plans/2026-07-23-explore-one-source-of-truth.md,
 * Task 4). `buildExploreProformaDrivers` is the extracted, pure heart of
 * `ExploreModel.handleAddToProforma` — the code that builds the driver array
 * handed to the proforma. Extracting it lets this test exercise the REAL
 * handoff logic without rendering React (this repo has no jsdom).
 *
 * The bug: the handoff (a) omitted `physicianLocumAgency` entirely from the
 * "retention" bundle for OP/ED/IP, and (b) derived inpatient retention off the
 * generic turnover/burnout/replacement-cost fields instead of the ip*-aware
 * ones the engine (`computeAllDriverValues`) already uses. Both mean the sum
 * of the handoff's driver values could fall short of
 * `computeExploreTotals(...).totalAnnualValue` for a maximal inpatient/OP/ED
 * state with locum/agency spend enabled.
 *
 * `extras` covers the handful of driver values the helper does not re-derive
 * because they already read the engine identically (scribe cost reduction,
 * the five nursing-quality drivers) or are a direct passthrough of a raw
 * input with no engine key (patientAccess mirrors the engine's formula
 * exactly; cost reduction is a dead, UI-unreachable legacy field kept at 0
 * here so it can't mask the assertion).
 */

function extrasFor(state: ExploreState, hours: number): ProformaDriverExtras {
  const v = computeAllDriverValues(state, hours);
  return {
    patientAccessValue: v.patientAccess || 0,
    costReductionValue: 0,
    scribeCostValue: v.scribeCostReduction || 0,
    nursingHapiValue: v.nursingHapi || 0,
    nursingFallsValue: v.nursingFalls || 0,
    nursingCautiValue: v.nursingCauti || 0,
    nursingClabsiValue: v.nursingClabsi || 0,
    nursingSepsisValue: v.nursingSepsis || 0,
  };
}

/** Sum of driver values, and the same sum split by category — the handoff's
 *  stand-in for the Investment screen's time/doc (efficiency/documentation)
 *  split, since every "time" driver lands in Capacity/Workforce and every
 *  "documentation" driver lands in Revenue/Quality (see EXPLORE_DRIVERS). */
function summarize(drivers: ReturnType<typeof buildExploreProformaDrivers>["drivers"]) {
  const total = drivers.reduce((s, d) => s + d.value, 0);
  const time = drivers.filter((d) => d.category === "time").reduce((s, d) => s + d.value, 0);
  const documentation = drivers
    .filter((d) => d.category === "documentation")
    .reduce((s, d) => s + d.value, 0);
  return { total, time, documentation };
}

function assertTiesToEngine(state: ExploreState, hours: number) {
  const totals = computeExploreTotals(state, hours);
  const { drivers } = buildExploreProformaDrivers(state, hours, extrasFor(state, hours));
  const { total, time, documentation } = summarize(drivers);

  expect(Math.abs(total - totals.totalAnnualValue)).toBeLessThanOrEqual(1);
  expect(Math.abs(time - totals.efficiencyValue)).toBeLessThanOrEqual(1);
  expect(Math.abs(documentation - totals.documentationValue)).toBeLessThanOrEqual(1);
}

describe("Explore -> Proforma driver snapshot ties to the engine", () => {
  it("outpatient: handoff driver sum matches computeExploreTotals()", () => {
    const state = {
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
        wellbeingEnabled: true,
        calculateRetentionValue: true,
        annualTurnoverRate: 6,
        burnoutRelatedTurnover: 40,
        replacementCost: 400_000,
        retentionImpactScenario: "typical",
        physicianAgencyEnabled: true,
        physicianAgencyWeeksPerVacancy: 16,
        physicianAgencyWeeklyPremium: 5_000,
        scribeCostReductionEnabled: true,
        scribeBillingMode: "position",
        scribeHeadcount: 10,
        scribePositionsEliminated: 5,
        scribeCostPerPosition: 35_000,
      },
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        wrvuEnabled: true,
        wrvuScenario: "typical",
        currentWrvu: 1.8,
        conversionFactor: 33,
        wrvuRealization: 75,
        hccEnabled: true,
        denialsEnabled: true,
        denialsScenario: "typical",
        medNecessityDenialRate: 3,
        avgClaimValue: 200,
        denialsRealization: 60,
      },
    } as ExploreState;

    assertTiesToEngine(state, 8_000);
  });

  it("ed: handoff driver sum matches computeExploreTotals()", () => {
    const state = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "ed",
      numberOfProviders: 60,
      annualEncounters: 120_000,
      utilizationPercent: 100,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        edLwbsEnabled: true,
        edLwbsRate: 3,
        edLwbsReduction: 20,
        edRevenuePerVisit: 350,
        edLwbsRealization: 85,
        edThroughputEnabled: true,
        edAdmissionRate: 15,
        edAdmissionRevenue: 8_000,
        edAdmissionRealization: 75,
        wellbeingEnabled: true,
        calculateRetentionValue: true,
        annualTurnoverRate: 6,
        burnoutRelatedTurnover: 40,
        replacementCost: 400_000,
        retentionImpactScenario: "typical",
        physicianAgencyEnabled: true,
        physicianAgencyWeeksPerVacancy: 16,
        physicianAgencyWeeklyPremium: 5_000,
        scribeCostReductionEnabled: true,
        scribeBillingMode: "position",
        scribeHeadcount: 10,
        scribePositionsEliminated: 5,
        scribeCostPerPosition: 35_000,
      },
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        wrvuEnabled: true,
        wrvuScenario: "typical",
        currentWrvu: 1.8,
        conversionFactor: 33,
        wrvuRealization: 75,
        denialsEnabled: true,
        denialsScenario: "typical",
        medNecessityDenialRate: 3,
        avgClaimValue: 200,
        denialsRealization: 60,
      },
    } as ExploreState;

    assertTiesToEngine(state, 5_000);
  });

  it("inpatient: handoff driver sum matches computeExploreTotals() — the physicianLocumAgency + ip*-retention bug", () => {
    const state = {
      ...DEFAULT_EXPLORE_STATE,
      careSetting: "inpatient",
      numberOfProviders: 40,
      annualEncounters: 20_000,
      utilizationPercent: 60,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        wellbeingEnabled: true,
        calculateRetentionValue: true,
        // Deliberately different from the generic annualTurnoverRate/
        // burnoutRelatedTurnover/replacementCost fields below, so a handoff
        // that reads the wrong (generic) fields for inpatient produces a
        // different number than the engine, which is ip*-aware.
        annualTurnoverRate: 999,
        burnoutRelatedTurnover: 999,
        replacementCost: 1,
        ipAnnualTurnoverRate: 10,
        ipBurnoutRelatedTurnover: 45,
        ipReplacementCost: 400_000,
        retentionImpactScenario: "typical",
        physicianAgencyEnabled: true,
        physicianAgencyWeeksPerVacancy: 16,
        physicianAgencyWeeklyPremium: 5_000,
      },
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        ipDrgEnabled: true,
        ipDrgScenario: "typical",
        ipDrgAtRiskRate: 8,
        ipDrgWeightIncrease: 0.3,
        ipDrgBasePayment: 12_000,
        ipDrgRealization: 60,
        ipObsDefenseEnabled: true,
        ipObsDefensePreventableScenario: "typical",
        ipObsDefenseDenialRate: 6,
        ipObsDefenseRevenueDelta: 3_000,
        ipObsDefenseRealization: 65,
      },
    } as ExploreState;

    assertTiesToEngine(state, 0);
  });

  it("nursing: handoff driver sum matches computeExploreTotals()", () => {
    const state = {
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
        nursingAgencyEnabled: true,
        nursingAgencyWeeksPerVacancy: 12,
        nursingAgencyWeeklyPremium: 2_500,
        nursingOtEnabled: true,
        nursingOtHoursPerNurseWeek: 4,
        nursingOtReductionPercent: 15,
        nursingOtHourlyRate: 62,
      },
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        nursingHapiEnabled: true,
        nursingHapiRate: 2.5,
        nursingHapiPreventionRate: 6.5,
        nursingHapiCost: 25_000,
        nursingFallsEnabled: true,
        nursingFallsRate: 3.5,
        nursingFallsPreventionRate: 10,
        nursingFallsCost: 6_500,
        nursingCautiEnabled: true,
        nursingCautiUtilizationRatio: 30,
        nursingCautiRate: 1.8,
        nursingCautiPreventionRate: 12,
        nursingCautiCost: 13_000,
        nursingClabsiEnabled: true,
        nursingClabsiUtilizationRatio: 20,
        nursingClabsiRate: 0.8,
        nursingClabsiPreventionRate: 8,
        nursingClabsiCost: 20_000,
        nursingSepsisEnabled: true,
        nursingSepsisRatePerThousand: 2.0,
        nursingSepsisCurrentCompliance: 75,
        nursingSepsisDocLagPercent: 30,
        nursingSepsisExcessCostPerCase: 3_500,
        nursingSepsisRealization: 60,
      },
    } as ExploreState;

    assertTiesToEngine(state, 0);
  });
});
