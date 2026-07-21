import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import { calcHapi, calcFalls, calcSepsis } from "@/lib/nursingQualityCalcs";
import {
  DEFAULT_EXPLORE_STATE,
  type ExploreState,
} from "@/pages/explore/ExploreFlow";
import type { AttainScope, AttainSetting, GoalId } from "./attainTypes";

/**
 * Attain - lever layer.
 *
 * A "lever" is one concrete thing a partner can do for a goal (open a
 * service line, dial up a percent, set a coverage level). Each lever carries
 * a `realityStart`, the value that represents "current reality, doing
 * nothing new." Every lever's dollar contribution is computed as a DELTA
 * off that baseline, run through the same `ExploreState` synthesis plus
 * `computeAllDriverValues` engine the rest of the Attain path
 * (`attainCalc.ts`) already uses. That is what keeps the figures reconciled
 * with the rest of the app rather than inventing a separate math model.
 *
 * CONTRIBUTION MODEL - how the levers combine
 * --------------------------------------------
 * Each lever's dollar contribution is computed as an INDEPENDENT channel: a
 * small synthesized `ExploreState` that sweeps ONLY that lever's own value,
 * holding every other input at a fixed reference constant (not at another
 * lever's chosen value). Each lever's engine value is that channel's result
 * MINUS the same channel evaluated at the lever's own `realityStart`, so a
 * lever that is already partly active today (e.g. "Fill the new slots"
 * starts at ~60%) is only credited for movement above where the partner
 * already is. `totalMargin` sums every lever's delta at its CHOSEN value;
 * `marginalMargin` for a lever is that same sum minus the sum with just
 * that one lever reset to its `realityStart` (the exact leave-one-out
 * subtraction called for by the spec). Because each channel only depends on
 * its own lever, this leave-one-out subtraction always isolates exactly
 * that lever's own delta, with no cross terms, and "doing nothing new"
 * (every lever at its realityStart) always nets to exactly 0.
 *
 * This decomposition is a deliberate simplification, not a literal
 * multiplicative reproduction of a single combined ExploreState. A single
 * shared formula (e.g. one patientAccess call fed by all 4 access levers at
 * once) is mathematically an AND-gate: if any one lever sits at a
 * realityStart of 0 (e.g. "reinvest freed time" hasn't started yet), every
 * OTHER lever's marginal effect would also read as 0 whenever swept alone
 * from the full-reality baseline, even though it is a genuinely separate
 * decision. Modeling each lever as its own channel (with the other inputs
 * held at a defensible reference value, not zero) avoids that false
 * dependency and gives an honest, independent "moving this decision from
 * where you are today adds ~$X" figure per lever, while every channel is
 * still computed by the same `computeAllDriverValues` engine used
 * everywhere else in the app.
 *
 * Per-goal driver mappings (documented per the plan's mapping-decision
 * requirement):
 *  - access (outpatient): all 4 levers feed the single `patientAccess`
 *    field via `accessProviders` (scope) and `capacityRealizationPercent`
 *    (reinvestment). "Open slots on the template" and "Fill the new slots"
 *    have no dedicated fields in the engine, so they are modeled as an
 *    equivalent reinvestment percentage (slots/4 * 100%, then scaled by
 *    fill%), an explicit simplification, not a literal slot/fill driver.
 *  - access (ED): "reinvest" maps to `edLwbsReduction` (converting freed
 *    charting time into recovered walk-outs), "open slots"/"fill" map to
 *    `edAdmissionRate`/`edAdmissionRealization` (the admission-capture leg),
 *    reusing `lwbsRecovery` + `admissionCapture`.
 *  - retention (all settings): all 4 levers sweep the existing
 *    `retentionImpactScenario: 'custom'` + `retentionCustomPercent` knob,
 *    scaled against each setting's optimistic-scenario ceiling (15pp
 *    physician, 25pp nursing), "backfill coverage gaps" and "sustain it"
 *    have no dedicated fields, so they are modeled as fractions of that same
 *    ceiling (documented simplification).
 *  - revenue (outpatient/ED): "act on documented complexity" sweeps
 *    `wrvuCustomPercent`; "close queries fast" sweeps `wrvuRealization`
 *    (faster closure -> more of the coded lift survives, so days convert to
 *    a realization percent, inverted: fewer days -> higher realization);
 *    "protect against downcoding" is a separate, genuinely additive
 *    mechanism using the existing `denialsEnabled`/`denialsRealization`
 *    field (booked once, alongside wRVU, never blended into one number).
 *  - revenue (inpatient): "act on documented complexity" sweeps
 *    `ipDrgCustomPercent`; "close queries fast" sweeps `ipCdiRealization`
 *    (the CDI query-cost-avoidance channel, the inpatient analog of a
 *    query); "protect against downcoding" sweeps `ipDrgRealization`
 *    (protecting the captured DRG weight from audit downgrade).
 *  - quality (nursing): "close real-time gaps" sweeps
 *    `nursingHapiPreventionRate`; "tie deterioration signals to a response"
 *    sweeps `nursingSepsisRealization` (the SEP-1 early-warning bundle is
 *    the natural home for "deterioration signal -> response"); "lift bundle
 *    compliance" sweeps `nursingFallsPreventionRate` (the mobility/turning
 *    bundle). Three genuinely distinct, already-wired nursing-quality
 *    drivers, one per lever, so no double count.
 *
 * Every "lines" lever (scope) uses a per-(setting, goal) preset list in
 * `LINE_PRESETS` below; `realityStart: []` means no lines are committed to
 * the plan yet, distinct from the deal's total addressable scope collected
 * earlier in the Scope step.
 */

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

export interface Lever {
  id: string;
  label: string; // the decision, phrased as an action the partner takes
  help: string; // one plain sentence teaching how it moves the bottom line
  control: "percent" | "countPerUnit" | "lines" | "toggleLevel";
  unit: string;
  min: number;
  max: number;
  step: number;
  realityStart: number | string[];
  ownerRole: string;
  defaultDue: string;
}

export type LeverValues = Record<string, number | string[]>;

export interface LeverContribution {
  id: string;
  marginalMargin: number;
  marginalCount: number;
  pctOfTotal: number;
}

export interface LeverContributionsResult {
  perLever: LeverContribution[];
  totalMargin: number;
  totalCount: number;
}

// ────────────────────────────────────────────────────────────────────────
// LEVERS catalog
// ────────────────────────────────────────────────────────────────────────

export const LEVERS: Record<GoalId, Lever[]> = {
  access: [
    {
      id: "accessLines",
      label: "Which service lines you open access in",
      help: "Committing a service line to the plan puts its provider capacity in scope for every decision below it.",
      control: "lines",
      unit: "service lines",
      min: 0,
      max: 4,
      step: 1,
      realityStart: [],
      ownerRole: "Service-line chief",
      defaultDue: "Month 1",
    },
    {
      id: "accessReinvest",
      label: "Reinvest freed time into visits",
      help: "Every point of freed time committed to the schedule instead of relief becomes a fraction of a visit, priced at your revenue per visit.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Ambulatory operations",
      defaultDue: "Month 2",
    },
    {
      id: "accessSlots",
      label: "Open slots on the template",
      help: "Each added slot per provider per week is new capacity on the schedule itself, on top of whatever freed time gets reinvested.",
      control: "countPerUnit",
      unit: "slots/provider/wk",
      min: 0,
      max: 4,
      step: 0.5,
      realityStart: 0,
      ownerRole: "Ambulatory operations",
      defaultDue: "Month 2",
    },
    {
      id: "accessFill",
      label: "Fill the new slots",
      help: "An open slot only pays back once a referral or backlog patient is actually scheduled into it. This is the fill rate above where you are today.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 60,
      ownerRole: "Access / referral ops",
      defaultDue: "Month 3",
    },
  ],
  retention: [
    {
      id: "retentionLines",
      label: "Departments in scope",
      help: "Each department brought into the plan adds its provider count to the pool this plan is working to keep from leaving.",
      control: "lines",
      unit: "departments",
      min: 0,
      max: 4,
      step: 1,
      realityStart: [],
      ownerRole: "Department leadership",
      defaultDue: "Month 1",
    },
    {
      id: "retentionFloor",
      label: "Hold an after-hours relief floor",
      help: "A protected floor on after-hours documentation is what keeps freed time from being quietly absorbed back into a bigger panel.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Department leadership",
      defaultDue: "Month 2",
    },
    {
      id: "retentionBackfill",
      label: "Backfill coverage gaps",
      help: "Backfilling an open shift or panel before the remaining staff absorb it is what keeps relief from being clawed back.",
      control: "toggleLevel",
      unit: "coverage level",
      min: 0,
      max: 2,
      step: 1,
      realityStart: 0,
      ownerRole: "Ops / staffing",
      defaultDue: "Month 2",
    },
    {
      id: "retentionSustain",
      label: "Sustain it",
      help: "Relief that holds for more months compounds into a larger share of the departures this plan is working to avoid.",
      control: "countPerUnit",
      unit: "months sustained",
      min: 0,
      max: 12,
      step: 1,
      realityStart: 0,
      ownerRole: "Department chiefs",
      defaultDue: "Month 3",
    },
  ],
  revenue: [
    {
      id: "revenueLines",
      label: "Specialties in scope",
      help: "Each specialty brought into the plan adds its encounter volume to the pool of visits with documented complexity not yet coded.",
      control: "lines",
      unit: "specialties",
      min: 0,
      max: 4,
      step: 1,
      realityStart: [],
      ownerRole: "Revenue cycle / coding",
      defaultDue: "Month 1",
    },
    {
      id: "revenueUptake",
      label: "Act on documented complexity in coding",
      help: "Complexity that is documented but never coded is not revenue. This is the share of the documented detail coding actually acts on.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 30,
      ownerRole: "Revenue cycle / coding",
      defaultDue: "Month 2",
    },
    {
      id: "revenueQueryDays",
      label: "Close provider queries fast",
      help: "A query that ages past a week gets answered from memory or dropped. This is the target turnaround, in days.",
      control: "countPerUnit",
      unit: "days",
      min: 1,
      max: 21,
      step: 1,
      realityStart: 14,
      ownerRole: "CDI + providers",
      defaultDue: "Month 2",
    },
    {
      id: "revenueProtect",
      label: "Protect against downcoding",
      help: "A captured level that gets downgraded on appeal never reaches the bank. This is the share of captured levels protected from downcoding.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Billing",
      defaultDue: "Month 3",
    },
  ],
  quality: [
    {
      id: "qualityLines",
      label: "Units in scope",
      help: "Each unit brought into the plan adds its patient-days to the pool this plan is working to keep safe.",
      control: "lines",
      unit: "units",
      min: 0,
      max: 4,
      step: 1,
      realityStart: [],
      ownerRole: "Unit leadership",
      defaultDue: "Month 1",
    },
    {
      id: "qualityRealTime",
      label: "Close real-time gaps during the shift",
      help: "A missed bundle step closed during the shift prevents an event before it happens. This is the share of gaps closed in real time, above where you are today.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 55,
      ownerRole: "Charge nurses / unit leads",
      defaultDue: "Month 2",
    },
    {
      id: "qualityResponse",
      label: "Tie deterioration signals to a response",
      help: "An early-warning signal with no named responder is just a note. This sets how reliably a signal turns into an actual intervention.",
      control: "toggleLevel",
      unit: "response level",
      min: 0,
      max: 2,
      step: 1,
      realityStart: 0,
      ownerRole: "Rapid response / unit",
      defaultDue: "Month 2",
    },
    {
      id: "qualityBundle",
      label: "Lift bundle compliance",
      help: "Bundle compliance above today's audited rate is what turns a documented step into a prevented event.",
      control: "percent",
      unit: "%",
      min: 0,
      max: 100,
      step: 5,
      realityStart: 0,
      ownerRole: "Unit leadership",
      defaultDue: "Month 3",
    },
  ],
};

/** All levers at their `realityStart`, the plan before the partner has
 * decided to do anything new. */
export function defaultLeverValues(goal: GoalId): LeverValues {
  const values: LeverValues = {};
  for (const lever of LEVERS[goal]) {
    values[lever.id] = lever.realityStart;
  }
  return values;
}

// ────────────────────────────────────────────────────────────────────────
// Line presets, per (setting, goal), the service lines/departments/units a
// "lines" lever can select from. Not every setting supports every goal; see
// `SETTING_GOAL_MATRIX` in attainGoals.ts.
// ────────────────────────────────────────────────────────────────────────

const LINE_PRESETS: Record<AttainSetting, Partial<Record<GoalId, string[]>>> = {
  outpatient: {
    access: ["Cardiology", "Orthopedics", "Primary Care", "Endocrinology"],
    retention: ["Primary Care", "Cardiology", "Endocrinology", "Specialty Clinics"],
    revenue: ["Cardiology", "Endocrinology", "Primary Care"],
  },
  ed: {
    access: ["General ED", "Fast Track", "Observation Unit", "Behavioral Health"],
    retention: ["General ED", "Fast Track", "Observation Unit"],
    revenue: ["General ED", "Fast Track", "Observation Unit"],
  },
  inpatient: {
    revenue: ["Med-Surg", "ICU", "Telemetry"],
    retention: ["Med-Surg", "ICU", "Telemetry"],
  },
  nursing: {
    quality: ["Med-Surg", "ICU", "Step-Down"],
    retention: ["Med-Surg", "ICU", "Step-Down"],
  },
};

function presetsFor(setting: AttainSetting, goal: GoalId): string[] {
  return LINE_PRESETS[setting]?.[goal] ?? [];
}

/** Every line/department/unit option a "lines" lever can select from for
 * this (goal, setting), or [] if this combination has no lines lever. Used
 * by the Build the Case step to render the multi-select chips; this is the
 * one export the UI layer needs on top of the LINE_PRESETS table above. */
export function lineOptions(goal: GoalId, setting: AttainSetting): string[] {
  return presetsFor(setting, goal);
}

function linesFraction(setting: AttainSetting, goal: GoalId, selected: string[]): number {
  const presets = presetsFor(setting, goal);
  if (presets.length === 0) return 0;
  const valid = selected.filter((s) => presets.includes(s));
  return Math.min(1, valid.length / presets.length);
}

// ────────────────────────────────────────────────────────────────────────
// Shared helpers
// ────────────────────────────────────────────────────────────────────────

function clampUnits(scope: AttainScope): number {
  return Math.max(0, Math.round(scope.unitCount || 0));
}

function asNum(raw: number | string[] | undefined): number {
  return typeof raw === "number" ? raw : 0;
}

function asLines(raw: number | string[] | undefined): string[] {
  return Array.isArray(raw) ? raw : [];
}

function mkState(setting: AttainSetting): ExploreState {
  return {
    ...DEFAULT_EXPLORE_STATE,
    careSetting: setting,
    timeDriverInputs: { ...DEFAULT_EXPLORE_STATE.timeDriverInputs },
    docQualityInputs: { ...DEFAULT_EXPLORE_STATE.docQualityInputs },
  };
}

/** Days -> realization %. Fewer days (faster query turnaround) survives as
 * a higher realization of the coded/DRG lift; this is the one lever whose
 * raw value improves by going DOWN, so the mapping is inverted here. */
function realizationFromDays(days: number): number {
  const clamped = Math.min(21, Math.max(1, days));
  return Math.max(0, Math.min(100, 100 - clamped * 4));
}

interface ChannelValue {
  margin: number;
  count: number;
}

const ZERO: ChannelValue = { margin: 0, count: 0 };

// ────────────────────────────────────────────────────────────────────────
// ACCESS channels
// ────────────────────────────────────────────────────────────────────────

function opPatientAccessValue(eff: number, reinvestPct: number): ChannelValue {
  if (eff <= 0 || reinvestPct <= 0) return ZERO;
  const annualEncounters = eff * 600;
  const minutesSavedPerEncounter = 12;
  const totalHoursSaved = Math.round((annualEncounters * minutesSavedPerEncounter) / 60);
  const state: ExploreState = {
    ...mkState("outpatient"),
    numberOfProviders: eff,
    annualEncounters,
    utilizationPercent: 100,
    minutesSavedPerEncounter,
    timeDriverInputs: {
      ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
      patientAccessEnabled: true,
      accessProviders: eff,
      capacityRealizationPercent: reinvestPct,
      visitDuration: 30,
      revenuePerVisit: 200,
    },
  };
  const values = computeAllDriverValues(state, totalHoursSaved);
  const hrsPerProvWk = totalHoursSaved / eff / 48;
  const reinvest = reinvestPct / 100;
  const visitHrs = 30 / 60;
  const visitsPerWk = Math.round(((hrsPerProvWk * reinvest) / visitHrs) * 10) / 10;
  const netNewVisits = Math.round(visitsPerWk * eff * 48);
  return { margin: values.patientAccess ?? 0, count: netNewVisits };
}

function opAccessChannel(units: number, leverId: string, raw: number | string[] | undefined): ChannelValue {
  switch (leverId) {
    case "accessLines": {
      const fraction = linesFraction("outpatient", "access", asLines(raw));
      return opPatientAccessValue(Math.round(units * fraction), 20);
    }
    case "accessReinvest":
      return opPatientAccessValue(Math.round(units * 0.5), asNum(raw));
    case "accessSlots": {
      const pctEq = Math.min(100, (asNum(raw) / 4) * 100);
      return opPatientAccessValue(Math.round(units * 0.5), pctEq);
    }
    case "accessFill": {
      const basePct = 25; // reference "1 slot/provider/wk already on template"
      return opPatientAccessValue(Math.round(units * 0.5), basePct * (asNum(raw) / 100));
    }
    default:
      return ZERO;
  }
}

function edLwbsValue(
  eff: number,
  reductionPct: number,
  admitRatePct: number,
  admitRealizationPct: number,
): ChannelValue {
  if (eff <= 0 || reductionPct <= 0) return ZERO;
  const annualEncounters = eff * 2_200;
  const state: ExploreState = {
    ...mkState("ed"),
    numberOfProviders: eff,
    annualEncounters,
    utilizationPercent: 100,
    timeDriverInputs: {
      ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
      edLwbsEnabled: true,
      edLwbsRate: 8,
      edLwbsReduction: reductionPct,
      edRevenuePerVisit: 450,
      edLwbsRealization: 70,
      edThroughputEnabled: true,
      edAdmissionRate: admitRatePct,
      edAdmissionRevenue: 4_000,
      edAdmissionRealization: admitRealizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const recovered = Math.round(annualEncounters * (8 / 100) * (reductionPct / 100));
  const margin = (values.lwbsRecovery ?? 0) + (values.admissionCapture ?? 0);
  return { margin, count: recovered };
}

function edAccessChannel(units: number, leverId: string, raw: number | string[] | undefined): ChannelValue {
  switch (leverId) {
    case "accessLines": {
      const fraction = linesFraction("ed", "access", asLines(raw));
      return edLwbsValue(Math.round(units * fraction), 25, 20, 70);
    }
    case "accessReinvest":
      return edLwbsValue(Math.round(units * 0.5), asNum(raw), 20, 70);
    case "accessSlots": {
      const admitRate = Math.min(100, asNum(raw) * 5); // 0-4 slots -> 0-20% admit rate
      return edLwbsValue(Math.round(units * 0.5), 25, admitRate, 70);
    }
    case "accessFill":
      return edLwbsValue(Math.round(units * 0.5), 25, 20, asNum(raw));
    default:
      return ZERO;
  }
}

function accessChannel(setting: AttainSetting, units: number, leverId: string, raw: number | string[] | undefined): ChannelValue {
  return setting === "ed" ? edAccessChannel(units, leverId, raw) : opAccessChannel(units, leverId, raw);
}

// ────────────────────────────────────────────────────────────────────────
// RETENTION channels
// ────────────────────────────────────────────────────────────────────────

function retentionValue(setting: AttainSetting, eff: number, impactCustomPct: number): ChannelValue {
  if (eff <= 0 || impactCustomPct <= 0) return ZERO;
  if (setting === "nursing") {
    const turnoverRate = 19;
    const replacementCost = 55_000;
    const state: ExploreState = {
      ...mkState("nursing"),
      numberOfProviders: eff,
      timeDriverInputs: {
        ...DEFAULT_EXPLORE_STATE.timeDriverInputs,
        nursingRetentionEnabled: true,
        nursingTurnoverRate: turnoverRate,
        nursingReplacementCost: replacementCost,
        retentionImpactScenario: "custom",
        retentionCustomPercent: impactCustomPct,
      },
    };
    const values = computeAllDriverValues(state, 0);
    const retained = eff * (turnoverRate / 100) * 0.4 * (impactCustomPct / 100);
    return { margin: values.nursingRetention ?? 0, count: Math.round(retained) };
  }

  const isIP = setting === "inpatient";
  const turnoverRate = isIP ? 16 : setting === "ed" ? 18 : 14;
  const burnoutShare = isIP ? 45 : setting === "ed" ? 50 : 40;
  const replacementCost = isIP ? 375_000 : setting === "ed" ? 450_000 : 375_000;
  const state: ExploreState = {
    ...mkState(setting),
    numberOfProviders: eff,
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
      retentionImpactScenario: "custom",
      retentionCustomPercent: impactCustomPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const retained = eff * (turnoverRate / 100) * (burnoutShare / 100) * (impactCustomPct / 100);
  return { margin: values.providerWellbeing ?? 0, count: Math.round(retained) };
}

function retentionChannel(setting: AttainSetting, units: number, leverId: string, raw: number | string[] | undefined): ChannelValue {
  const ceiling = setting === "nursing" ? 25 : 15; // matches each setting's optimistic-scenario ceiling
  switch (leverId) {
    case "retentionLines": {
      const fraction = linesFraction(setting, "retention", asLines(raw));
      return retentionValue(setting, Math.round(units * fraction), 8);
    }
    case "retentionFloor":
      return retentionValue(setting, Math.round(units * 0.5), (asNum(raw) / 100) * ceiling);
    case "retentionBackfill": {
      const level = Math.min(2, Math.max(0, Math.round(asNum(raw))));
      const impactPct = [0, ceiling * 0.4, ceiling * 0.8][level];
      return retentionValue(setting, Math.round(units * 0.5), impactPct);
    }
    case "retentionSustain": {
      const months = Math.min(12, Math.max(0, asNum(raw)));
      return retentionValue(setting, Math.round(units * 0.5), ceiling * (months / 12));
    }
    default:
      return ZERO;
  }
}

// ────────────────────────────────────────────────────────────────────────
// REVENUE channels
// ────────────────────────────────────────────────────────────────────────

function wrvuValue(setting: AttainSetting, eff: number, liftPct: number, realizationPct: number): ChannelValue {
  if (eff <= 0 || liftPct <= 0 || realizationPct <= 0) return ZERO;
  const isED = setting === "ed";
  const annualEncounters = eff * (isED ? 1_700 : 2_300);
  const currentWrvu = isED ? 1.9 : 1.4;
  const conversionFactor = 36;
  const state: ExploreState = {
    ...mkState(setting),
    numberOfProviders: eff,
    annualEncounters,
    utilizationPercent: 100,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      wrvuEnabled: true,
      wrvuScenario: "custom",
      wrvuCustomPercent: liftPct,
      currentWrvu,
      conversionFactor,
      wrvuRealization: realizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const lift = (currentWrvu * liftPct) / 100;
  const wrvusCaptured = Math.round(annualEncounters * lift);
  return { margin: isED ? values.edEmLevel ?? 0 : values.wrvu ?? 0, count: wrvusCaptured };
}

function denialsValue(setting: AttainSetting, eff: number, realizationPct: number): ChannelValue {
  if (eff <= 0 || realizationPct <= 0) return ZERO;
  const isED = setting === "ed";
  const annualEncounters = eff * (isED ? 1_700 : 2_300);
  const state: ExploreState = {
    ...mkState(setting),
    numberOfProviders: eff,
    annualEncounters,
    utilizationPercent: 100,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      denialsEnabled: true,
      denialsScenario: "typical",
      medNecessityDenialRate: 5,
      avgClaimValue: 800,
      denialsRealization: realizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const prevented = Math.round(annualEncounters * 0.05 * (isED ? 0.3 : 0.5));
  return { margin: values.denialPrevention ?? 0, count: prevented };
}

function opEdRevenueChannel(setting: AttainSetting, units: number, leverId: string, raw: number | string[] | undefined): ChannelValue {
  const isED = setting === "ed";
  const maxLift = isED ? 6 : 9;
  switch (leverId) {
    case "revenueLines": {
      const fraction = linesFraction(setting, "revenue", asLines(raw));
      return wrvuValue(setting, Math.round(units * fraction), 3, 50);
    }
    case "revenueUptake":
      return wrvuValue(setting, Math.round(units * 0.5), (asNum(raw) / 100) * maxLift, 50);
    case "revenueQueryDays":
      return wrvuValue(setting, Math.round(units * 0.5), 3, realizationFromDays(asNum(raw)));
    case "revenueProtect":
      return denialsValue(setting, Math.round(units * 0.5), asNum(raw));
    default:
      return ZERO;
  }
}

function drgValue(eff: number, protectPct: number, realizationPct: number): ChannelValue {
  if (eff <= 0 || protectPct <= 0 || realizationPct <= 0) return ZERO;
  const annualEncounters = eff * 180;
  const state: ExploreState = {
    ...mkState("inpatient"),
    numberOfProviders: eff,
    annualEncounters,
    utilizationPercent: 100,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      ipDrgEnabled: true,
      ipDrgScenario: "custom",
      ipDrgCustomPercent: protectPct,
      ipDrgAtRiskRate: 35,
      ipDrgWeightIncrease: 0.35,
      ipDrgBasePayment: 6_500,
      ipDrgRealization: realizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const atRisk = annualEncounters * 0.35;
  const cases = Math.round(atRisk * (protectPct / 100));
  return { margin: values.drgAccuracy ?? 0, count: cases };
}

function cdiValue(eff: number, cdiPct: number, realizationPct: number): ChannelValue {
  if (eff <= 0 || cdiPct <= 0 || realizationPct <= 0) return ZERO;
  const annualEncounters = eff * 180;
  const state: ExploreState = {
    ...mkState("inpatient"),
    numberOfProviders: eff,
    annualEncounters,
    utilizationPercent: 100,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      ipCdiEnabled: true,
      ipCdiScenario: "custom",
      ipCdiCustomPercent: cdiPct,
      ipCdiQueryRate: 30,
      ipCdiCostPerQuery: 50,
      ipCdiRealization: realizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const queries = annualEncounters * 0.3;
  const closed = Math.round(queries * (cdiPct / 100));
  return { margin: values.cdiQueryReduction ?? 0, count: closed };
}

function ipRevenueChannel(units: number, leverId: string, raw: number | string[] | undefined): ChannelValue {
  switch (leverId) {
    case "revenueLines": {
      const fraction = linesFraction("inpatient", "revenue", asLines(raw));
      return drgValue(Math.round(units * fraction), 15, 50);
    }
    case "revenueUptake":
      return drgValue(Math.round(units * 0.5), (asNum(raw) / 100) * 25, 50);
    case "revenueQueryDays":
      return cdiValue(Math.round(units * 0.5), 25, realizationFromDays(asNum(raw)));
    case "revenueProtect":
      return drgValue(Math.round(units * 0.5), 15, asNum(raw));
    default:
      return ZERO;
  }
}

function revenueChannel(setting: AttainSetting, units: number, leverId: string, raw: number | string[] | undefined): ChannelValue {
  return setting === "inpatient"
    ? ipRevenueChannel(units, leverId, raw)
    : opEdRevenueChannel(setting, units, leverId, raw);
}

// ────────────────────────────────────────────────────────────────────────
// QUALITY channels (nursing only, per SETTING_GOAL_MATRIX)
// ────────────────────────────────────────────────────────────────────────

function bedsToPatientDays(beds: number): number {
  return beds * 0.85 * 365;
}

function hapiValue(eff: number, preventionPct: number): ChannelValue {
  if (eff <= 0 || preventionPct <= 0) return ZERO;
  const state: ExploreState = {
    ...mkState("nursing"),
    nursingStaffedBeds: eff,
    nursingOccupancyRate: 85,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      nursingHapiEnabled: true,
      nursingHapiRate: 2.8,
      nursingHapiPreventionRate: preventionPct,
      nursingHapiCost: 18_000,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const hapi = calcHapi({ patientDays: bedsToPatientDays(eff), rate: 2.8, preventionPct, cost: 18_000 });
  return { margin: values.nursingHapi ?? 0, count: Math.round(hapi.prevented) };
}

function sepsisValue(eff: number, realizationPct: number): ChannelValue {
  if (eff <= 0 || realizationPct <= 0) return ZERO;
  const state: ExploreState = {
    ...mkState("nursing"),
    nursingStaffedBeds: eff,
    nursingOccupancyRate: 85,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      nursingSepsisEnabled: true,
      nursingSepsisRatePerThousand: 2.0,
      nursingSepsisCurrentCompliance: 75,
      nursingSepsisDocLagPercent: 30,
      nursingSepsisExcessCostPerCase: 3_500,
      nursingSepsisRealization: realizationPct,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const sepsis = calcSepsis({
    patientDays: bedsToPatientDays(eff),
    ratePerThousand: 2.0,
    currentCompliancePct: 75,
    docLagPct: 30,
    excessCostPerCase: 3_500,
    realizationPct,
  });
  return { margin: values.nursingSepsis ?? 0, count: Math.round(sepsis.prevented) };
}

function fallsValue(eff: number, preventionPct: number): ChannelValue {
  if (eff <= 0 || preventionPct <= 0) return ZERO;
  const state: ExploreState = {
    ...mkState("nursing"),
    nursingStaffedBeds: eff,
    nursingOccupancyRate: 85,
    docQualityInputs: {
      ...DEFAULT_EXPLORE_STATE.docQualityInputs,
      nursingFallsEnabled: true,
      nursingFallsRate: 3.5,
      nursingFallsPreventionRate: preventionPct,
      nursingFallsCost: 6_500,
    },
  };
  const values = computeAllDriverValues(state, 0);
  const falls = calcFalls({ patientDays: bedsToPatientDays(eff), rate: 3.5, preventionPct, cost: 6_500 });
  return { margin: values.nursingFalls ?? 0, count: Math.round(falls.prevented) };
}

function qualityChannel(units: number, leverId: string, raw: number | string[] | undefined): ChannelValue {
  switch (leverId) {
    case "qualityLines": {
      const fraction = linesFraction("nursing", "quality", asLines(raw));
      return hapiValue(Math.round(units * fraction), 20);
    }
    case "qualityRealTime":
      return hapiValue(Math.round(units * 0.5), asNum(raw));
    case "qualityResponse": {
      const level = Math.min(2, Math.max(0, Math.round(asNum(raw))));
      const realizationPct = [0, 55, 80][level];
      return sepsisValue(Math.round(units * 0.5), realizationPct);
    }
    case "qualityBundle":
      return fallsValue(Math.round(units * 0.5), asNum(raw));
    default:
      return ZERO;
  }
}

// ────────────────────────────────────────────────────────────────────────
// Combined contribution math
// ────────────────────────────────────────────────────────────────────────

function channelValue(
  goal: GoalId,
  setting: AttainSetting,
  units: number,
  leverId: string,
  raw: number | string[] | undefined,
): ChannelValue {
  switch (goal) {
    case "access":
      return accessChannel(setting, units, leverId, raw);
    case "retention":
      return retentionChannel(setting, units, leverId, raw);
    case "revenue":
      return revenueChannel(setting, units, leverId, raw);
    case "quality":
      return qualityChannel(units, leverId, raw);
    default:
      return ZERO;
  }
}

/**
 * Every lever's live dollar/count contribution for a goal, reconciled
 * through the same engine `computeGoalTarget` uses. See the module header
 * for the contribution model and per-goal driver mappings.
 */
export function computeLeverContributions(
  goal: GoalId,
  setting: AttainSetting,
  scope: AttainScope,
  values: LeverValues,
): LeverContributionsResult {
  const levers = LEVERS[goal];
  const units = clampUnits(scope);

  // Each lever's contribution is the delta between its chosen value and its
  // OWN realityStart, not its raw channel value. Several levers have a
  // nonzero realityStart (e.g. "Fill the new slots" already runs at ~60%
  // today) - counting their raw channel value would credit the plan for
  // work the partner already does, breaking "doing nothing new adds
  // nothing." Subtracting each lever's own baseline here is what makes that
  // property hold while still letting every lever's marginalMargin (the
  // leave-one-out subtraction below) isolate exactly that lever's delta.
  const engineValue = (vals: LeverValues): ChannelValue => {
    let margin = 0;
    let count = 0;
    for (const lever of levers) {
      const chosen = channelValue(goal, setting, units, lever.id, vals[lever.id]);
      const baseline = channelValue(goal, setting, units, lever.id, lever.realityStart);
      margin += chosen.margin - baseline.margin;
      count += chosen.count - baseline.count;
    }
    return { margin, count };
  };

  const chosen = engineValue(values);
  const rawPerLever = levers.map((lever) => {
    const withoutLever = engineValue({ ...values, [lever.id]: lever.realityStart });
    return {
      id: lever.id,
      marginalMargin: chosen.margin - withoutLever.margin,
      marginalCount: chosen.count - withoutLever.count,
    };
  });

  const marginalSum = rawPerLever.reduce((sum, l) => sum + Math.max(0, l.marginalMargin), 0);
  const perLever: LeverContribution[] = rawPerLever.map((l) => ({
    ...l,
    pctOfTotal: marginalSum > 0 ? Math.max(0, l.marginalMargin) / marginalSum : 0,
  }));

  return { perLever, totalMargin: chosen.margin, totalCount: chosen.count };
}
