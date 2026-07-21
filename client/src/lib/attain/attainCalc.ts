import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { calcHapi, calcClabsi } from "@/lib/nursingQualityCalcs";
import {
  DEFAULT_EXPLORE_STATE,
  type ExploreState,
} from "@/pages/explore/ExploreFlow";
import type {
  AmbitionKey,
  AttainScope,
  AttainSetting,
  AttainState,
  GoalId,
} from "./attainTypes";

/**
 * Attain target / attainment math.
 *
 * `computeGoalTarget` synthesizes a minimal `ExploreState` for the chosen
 * (setting, goal, scope, ambition) and calls the existing
 * `computeAllDriverValues` (the same engine the Explore path uses) so the
 * dollar figure a partner sees in their Attain plan always reconciles with
 * the rest of the app, rather than being a separately invented number.
 *
 * The benchmark inputs below (encounters per provider, revenue per visit,
 * turnover rates, etc.) are illustrative planning defaults, the same kind of
 * stand-in figures the locked mockups use (see attainGoals.ts sourcing
 * notes). The Scope step (Task 5) supplies the one number a partner
 * actually edits here: how many providers/beds/nurses are in scope.
 * Everything else is a defensible, conservative default until a later task
 * lets the partner tune it directly.
 */

export interface GoalTargetResult {
  count: number;
  margin: number;
  label: string;
}

const AMBITION_ORDER: AmbitionKey[] = ["conservative", "typical", "ambitious"];

function clampScope(scope: AttainScope): number {
  return Math.max(0, Math.round(scope.unitCount || 0));
}

/** Base state shared by every synthesized calculation: every boolean driver
 * flag off, so only the one driver a given goal cares about gets enabled. */
function baseState(setting: AttainSetting): ExploreState {
  const careSetting = setting === "outpatient" ? "outpatient" : setting;
  return {
    ...DEFAULT_EXPLORE_STATE,
    careSetting,
    timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs },
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
  };
}

// ────────────────────────────────────────────────────────────────────────
// Per (setting, goal) synthesis
// ────────────────────────────────────────────────────────────────────────

function accessTarget(
  setting: AttainSetting,
  scope: AttainScope,
  ambitionKey: AmbitionKey,
): GoalTargetResult {
  const units = clampScope(scope);
  if (units === 0) return { count: 0, margin: 0, label: "0 net-new visits/year" };

  if (setting === "outpatient") {
    // Conservative / typical / ambitious reinvestment of freed time into
    // the schedule (the rest stays as workforce relief, tracked
    // separately so the two buckets never double-count).
    const reinvestByAmbition: Record<AmbitionKey, number> = {
      conservative: 25,
      typical: 40,
      ambitious: 55,
    };
    const annualEncounters = units * 600; // ~12 visits/wk/provider benchmark
    const minutesSavedPerEncounter = 12;
    const totalMinutes = annualEncounters * minutesSavedPerEncounter;
    const totalHoursSaved = Math.round(totalMinutes / 60);

    const state: ExploreState = {
      ...baseState(setting),
      numberOfProviders: units,
      annualEncounters,
      utilizationPercent: 100,
      minutesSavedPerEncounter,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        patientAccessEnabled: true,
        accessProviders: 0,
        capacityRealizationPercent: reinvestByAmbition[ambitionKey],
        visitDuration: 30,
        revenuePerVisit: 200,
      },
      docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
    };

    const values = computeAllDriverValues(state, totalHoursSaved);
    const hrsPerProvWk = totalHoursSaved / units / 48;
    const reinvest = reinvestByAmbition[ambitionKey] / 100;
    const visitHrs = state.timeDriverInputs.visitDuration / 60;
    const visitsPerWk = Math.round(((hrsPerProvWk * reinvest) / visitHrs) * 10) / 10;
    const netNewVisits = Math.round(visitsPerWk * units * 48);

    return {
      count: netNewVisits,
      margin: values.patientAccess ?? 0,
      label: `${netNewVisits.toLocaleString()} net-new visits/year`,
    };
  }

  // ED: LWBS recovery + admission capture on the recovered subset.
  const reductionByAmbition: Record<AmbitionKey, number> = {
    conservative: 15,
    typical: 30,
    ambitious: 45,
  };
  const annualEncounters = units * 2_200; // ED visits/provider/yr benchmark
  const edLwbsRate = 8;
  const edLwbsReduction = reductionByAmbition[ambitionKey];

  const state: ExploreState = {
    ...baseState(setting),
    numberOfProviders: units,
    annualEncounters,
    utilizationPercent: 100,
    timeDriverInputs: {
      ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
      edLwbsEnabled: true,
      edLwbsRate,
      edLwbsReduction,
      edRevenuePerVisit: 450,
      edLwbsRealization: 70,
      edThroughputEnabled: true,
      edAdmissionRate: 20,
      edAdmissionRevenue: 4_000,
      edAdmissionRealization: 70,
    },
  };

  const values = computeAllDriverValues(state, 0);
  const recovered = Math.round(annualEncounters * (edLwbsRate / 100) * (edLwbsReduction / 100));
  const margin = (values.lwbsRecovery ?? 0) + (values.admissionCapture ?? 0);

  return {
    count: recovered,
    margin,
    label: `${recovered.toLocaleString()} recovered visits/year`,
  };
}

function retentionTarget(
  setting: AttainSetting,
  scope: AttainScope,
  ambitionKey: AmbitionKey,
): GoalTargetResult {
  const units = clampScope(scope);
  if (units === 0) return { count: 0, margin: 0, label: "0 departures avoided/year" };

  const impactScenarioByAmbition: Record<AmbitionKey, "conservative" | "typical" | "optimistic"> = {
    conservative: "conservative",
    typical: "typical",
    ambitious: "optimistic",
  };
  const impactScenario = impactScenarioByAmbition[ambitionKey];

  if (setting === "nursing") {
    const turnoverRate = 19;
    const replacementCost = 55_000;
    const state: ExploreState = {
      ...baseState(setting),
      numberOfProviders: units,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        nursingRetentionEnabled: true,
        nursingTurnoverRate: turnoverRate,
        nursingReplacementCost: replacementCost,
        retentionImpactScenario: impactScenario,
      },
    };
    const values = computeAllDriverValues(state, 0);
    const impactMap: Record<string, number> = { conservative: 10, typical: 15, optimistic: 25 };
    const burnoutDep = units * (turnoverRate / 100) * 0.4;
    const retained = burnoutDep * (impactMap[impactScenario] / 100);
    const count = Math.round(retained);
    return {
      count,
      margin: values.nursingRetention ?? 0,
      label: `${count.toLocaleString()} departures avoided/year`,
    };
  }

  // Physician retention: outpatient / ed / inpatient. Inpatient uses the
  // hospitalist-specific ip* fields in the engine; the others use the
  // generic fields.
  const isIP = setting === "inpatient";
  const turnoverRate = isIP ? 16 : setting === "ed" ? 18 : 14;
  const burnoutShare = isIP ? 45 : setting === "ed" ? 50 : 40;
  const replacementCost = isIP ? 375_000 : setting === "ed" ? 450_000 : 375_000;

  const state: ExploreState = {
    ...baseState(setting),
    numberOfProviders: units,
    timeDriverInputs: {
      ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
      wellbeingEnabled: true,
      calculateRetentionValue: true,
      annualTurnoverRate: turnoverRate,
      burnoutRelatedTurnover: burnoutShare,
      replacementCost,
      ipAnnualTurnoverRate: turnoverRate,
      ipBurnoutRelatedTurnover: burnoutShare,
      ipReplacementCost: replacementCost,
      retentionImpactScenario: impactScenario,
    },
  };

  const values = computeAllDriverValues(state, 0);
  const impactMap: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15 };
  const retained = units * (turnoverRate / 100) * (burnoutShare / 100) * (impactMap[impactScenario] / 100);
  const count = Math.round(retained);

  return {
    count,
    margin: values.providerWellbeing ?? 0,
    label: `${count.toLocaleString()} departures avoided/year`,
  };
}

function revenueTarget(
  setting: AttainSetting,
  scope: AttainScope,
  ambitionKey: AmbitionKey,
): GoalTargetResult {
  const units = clampScope(scope);
  if (units === 0) return { count: 0, margin: 0, label: "0 wRVUs captured" };

  if (setting === "inpatient") {
    // DRG accuracy: comorbidity/severity specificity that survives into a
    // higher-weight DRG.
    const drgScenarioByAmbition: Record<AmbitionKey, "conservative" | "typical" | "aggressive"> = {
      conservative: "conservative",
      typical: "typical",
      ambitious: "aggressive",
    };
    const annualEncounters = units * 180; // admissions/hospitalist/yr benchmark
    const state: ExploreState = {
      ...baseState(setting),
      numberOfProviders: units,
      annualEncounters,
      utilizationPercent: 100,
      docQualityInputs: {
        ...DEFAULT_EXPLORE_STATE.docQualityInputs,
        ipDrgEnabled: true,
        ipDrgScenario: drgScenarioByAmbition[ambitionKey],
        ipDrgAtRiskRate: 35,
        ipDrgWeightIncrease: 0.35,
        ipDrgBasePayment: 6_500,
        ipDrgRealization: 70,
      },
    };
    const values = computeAllDriverValues(state, 0);
    const protectPctMap: Record<string, number> = { conservative: 15, typical: 20, aggressive: 25 };
    const eligibleEncounters = Math.round(annualEncounters * 1);
    const atRisk = eligibleEncounters * 0.35;
    const cases = Math.round(atRisk * (protectPctMap[drgScenarioByAmbition[ambitionKey]] / 100));
    return {
      count: cases,
      margin: values.drgAccuracy ?? 0,
      label: `${cases.toLocaleString()} admissions DRG-corrected/year`,
    };
  }

  // Outpatient / ED: wRVU capture from documentation completeness closing
  // the gap between delivered complexity and the coded level.
  const isED = setting === "ed";
  const wrvuScenarioByAmbition: Record<AmbitionKey, "conservative" | "typical" | "aggressive"> = {
    conservative: "conservative",
    typical: "typical",
    ambitious: "aggressive",
  };
  const annualEncounters = units * (isED ? 1_700 : 2_300);
  const currentWrvu = isED ? 1.9 : 1.4;
  const conversionFactor = 36;

  const state: ExploreState = {
    ...baseState(setting),
    numberOfProviders: units,
    annualEncounters,
    utilizationPercent: 100,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      wrvuEnabled: true,
      wrvuScenario: wrvuScenarioByAmbition[ambitionKey],
      currentWrvu,
      conversionFactor,
      wrvuRealization: 70,
    },
  };

  const values = computeAllDriverValues(state, 0);
  const liftMap: Record<string, number> = isED
    ? { conservative: 1, typical: 3, aggressive: 6 }
    : { conservative: 2, typical: 5, aggressive: 9 };
  const liftPct = liftMap[wrvuScenarioByAmbition[ambitionKey]];
  const lift = (currentWrvu * liftPct) / 100;
  const eligibleEncounters = Math.round(annualEncounters * 1);
  const wrvusCaptured = Math.round(eligibleEncounters * lift);
  const marginKey = isED ? "edEmLevel" : "wrvu";

  return {
    count: wrvusCaptured,
    margin: values[marginKey] ?? 0,
    label: `${wrvusCaptured.toLocaleString()} wRVUs captured`,
  };
}

function qualityTarget(
  scope: AttainScope,
  ambitionKey: AmbitionKey,
): GoalTargetResult {
  const beds = clampScope(scope);
  if (beds === 0) return { count: 0, margin: 0, label: "0 events prevented/year" };

  const preventionByAmbition: Record<AmbitionKey, number> = {
    conservative: 30,
    typical: 42,
    ambitious: 55,
  };
  const preventionPct = preventionByAmbition[ambitionKey];
  const occupancyRate = 85;
  const patientDays = beds * (occupancyRate / 100) * 365;

  const hapi = calcHapi({ patientDays, rate: 2.8, preventionPct, cost: 18_000 });
  const clabsi = calcClabsi({
    patientDays,
    utilizationPct: 22,
    rate: 1.1,
    preventionPct,
    cost: 46_000,
  });

  const state: ExploreState = {
    ...baseState("nursing"),
    nursingStaffedBeds: beds,
    nursingOccupancyRate: occupancyRate,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      nursingHapiEnabled: true,
      nursingHapiRate: 2.8,
      nursingHapiPreventionRate: preventionPct,
      nursingHapiCost: 18_000,
      nursingClabsiEnabled: true,
      nursingClabsiUtilizationRatio: 22,
      nursingClabsiRate: 1.1,
      nursingClabsiPreventionRate: preventionPct,
      nursingClabsiCost: 46_000,
    },
  };

  const values = computeAllDriverValues(state, 0);
  const eventsPrevented = Math.round(hapi.prevented + clabsi.prevented);
  const margin = (values.nursingHapi ?? 0) + (values.nursingClabsi ?? 0);

  return {
    count: eventsPrevented,
    margin,
    label: `${eventsPrevented.toLocaleString()} events prevented/year`,
  };
}

/** Target/attainment math. Ties a chosen goal + setting + scope + ambition
 * to a dollar figure reconciled through the same driver engine the Explore
 * path uses (`computeAllDriverValues`), so the numbers a partner sees in
 * their Attain plan never disagree with the rest of the app. */
export function computeGoalTarget(
  goal: GoalId,
  setting: AttainSetting,
  scope: AttainScope,
  ambitionKey: AmbitionKey,
): GoalTargetResult {
  switch (goal) {
    case "access":
      return accessTarget(setting, scope, ambitionKey);
    case "retention":
      return retentionTarget(setting, scope, ambitionKey);
    case "revenue":
      return revenueTarget(setting, scope, ambitionKey);
    case "quality":
      return qualityTarget(scope, ambitionKey);
    default:
      return { count: 0, margin: 0, label: "" };
  }
}

// ────────────────────────────────────────────────────────────────────────
// Attainment
// ────────────────────────────────────────────────────────────────────────

export interface AttainmentResult {
  pct: number;
  onPacePct: number;
  marginToDate: number;
}

/**
 * Where a plan stands against its own curve.
 *
 * `onPacePct` models the plan's expected progress at `monthsElapsed` of
 * `totalMonths` as a gentle ease-in curve (`t^0.85`): early months lag
 * slightly behind linear while adoption ramps, then the curve catches up as
 * the chain matures, mirroring the coral "plan" line in the locked mockup
 * curve. `progressRatio` (0-1, from the Path/Baseline steps once those are
 * built) captures how well the partner is actually converting the fragile
 * middle: at 1.0 the plan is exactly on pace; below 1.0 it drifts toward
 * "what usually happens," never above the plan's own on-pace ceiling.
 */
export function computeAttainment(state: AttainState): AttainmentResult {
  if (!state.goal || !state.setting || !state.ambitionKey) {
    return { pct: 0, onPacePct: 0, marginToDate: 0 };
  }

  const target = computeGoalTarget(state.goal, state.setting, state.scope, state.ambitionKey);
  const totalMonths = Math.max(1, state.totalMonths);
  const t = Math.min(1, Math.max(0, state.monthsElapsed / totalMonths));
  const onPacePct = Math.round(100 * Math.pow(t, 0.85));
  const progressRatio = Math.min(1, Math.max(0, state.progressRatio));
  const pct = Math.round(onPacePct * progressRatio);
  const marginToDate = Math.round(target.margin * (pct / 100));

  return { pct, onPacePct, marginToDate };
}
