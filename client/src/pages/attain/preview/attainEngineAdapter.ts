import { computeAllDriverValues } from "@/lib/exploreDriverCalcs";
import type { ExploreState } from "@/pages/explore/ExploreFlow";
import { econModel } from "./attainEconomics";

/**
 * THROWAWAY prototype adapter. Runs the CANONICAL ROI engine
 * (computeAllDriverValues) so every Attain "value in play" reconciles to the tool
 * of record instead of a hand-picked placeholder.
 *
 * The number is built from the PARTNER'S inputs, per category:
 *  - size (scope): providers / nurses covered — scales the whole setting
 *  - economics: their real money (e.g. margin per visit) — replaces typical defaults
 *  - stance: the realization % they'll stand behind — replaces the default haircut
 * Anything they haven't entered stays at a conservative typical default. Minutes
 * saved per note is seeded here and then MEASURED on Progress (never a funnel field).
 * Field names / enum values / formulas all mirror lib/exploreDriverCalcs.ts.
 */

export type CellInputs = {
  scope?: number; // providers / nurses / beds this category covers (Align scope)
  stancePct?: number; // realization stance for this category
  econ?: Record<string, number>; // per-category economics keyed by field key (e.g. perVisit)
  activeDriverKeys?: string[]; // multi-lever categories: the driver keys the live levers sum (overrides MAP)
  minSaved?: number; // seeded default per setting if unset
  // real Starting Point volume — the SIZE of the number comes from these, not from constants
  totalProviders?: number; // total providers/nurses entered on the Starting Point
  annualEncounters?: number; // total annual visits / discharges
  util?: number; // utilization %
  adoption?: number; // % of encounters documented with Abridge
  staffedBeds?: number; // nursing / inpatient beds
};

function run(setting: string, top: Record<string, unknown>, td: Record<string, unknown>, dq: Record<string, unknown>, totalHoursSaved: number): Record<string, number> {
  try {
    const state = { careSetting: setting, timeDriverInputs: td, docQualityInputs: dq, ...top } as unknown as ExploreState;
    return computeAllDriverValues(state, totalHoursSaved);
  } catch (e) {
    // Defensive: a throw here would blank the cell. Surface it in dev so a real engine
    // regression during iteration isn't silently indistinguishable from "not filled in".
    console.warn("[attain] engine compute failed for", setting, e);
    return {};
  }
}

// Encounters for the scoped slice: from their REAL Starting Point total when entered (their own
// per-head rate × the slice they scoped to), else fall back to a seeded per-provider rate.
function scaledEncounters(inp: CellInputs, providers: number, seedPerProvider: number): number {
  if (inp.annualEncounters && inp.annualEncounters > 0) {
    const total = inp.totalProviders && inp.totalProviders > 0 ? inp.totalProviders : providers;
    return Math.round((inp.annualEncounters / total) * providers);
  }
  return providers * seedPerProvider;
}

// ---- Outpatient (scope = providers) ----
const OP_PER_PROVIDER = 3300; // seeded visits / provider / yr (fallback only)
function opResults(inp: CellInputs) {
  const providers = inp.scope && inp.scope > 0 ? inp.scope : 40;
  const encounters = scaledEncounters(inp, providers, OP_PER_PROVIDER);
  const util = inp.util && inp.util > 0 ? inp.util : 70;
  const adoption = inp.adoption && inp.adoption > 0 ? inp.adoption : 70;
  const minSaved = inp.econ?.minSaved ?? inp.minSaved ?? 2;
  const hrs = Math.round((encounters * (adoption / 100) * minSaved) / 60);
  // HCC lever from the partner's own inputs (fallbacks match the model's seeds). We fold the whole
  // recaptured-conditions-per-patient figure into netNewAvgConditions and set avgHccs to 0, so the
  // engine computes exactly riskPatients × conditions/patient × $/condition × realization. panelSize
  // is back-solved from the scoped provider count so members reproduces the risk-patient total.
  const riskPatients = inp.econ?.riskPatients ?? 6_000;
  const hccPerPatient = inp.econ?.hccPerPatient ?? 0.6;
  const hccValue = inp.econ?.hccValue ?? 1_500;
  const hccPanelSize = providers > 0 ? riskPatients / providers : riskPatients;
  return run("outpatient", { numberOfProviders: providers, annualEncounters: encounters, utilizationPercent: util, encountersPerProvider: Math.round(encounters / providers) },
    {
      patientAccessEnabled: true, accessProviders: providers, capacityRealizationPercent: inp.stancePct ?? 25, visitDuration: inp.econ?.visitMin ?? 30, revenuePerVisit: inp.econ?.perVisit ?? 200,
      wellbeingEnabled: true, calculateRetentionValue: true, annualTurnoverRate: inp.econ?.turnover ?? 6, burnoutRelatedTurnover: inp.econ?.burnout ?? 40, replacementCost: inp.econ?.replacementCost ?? 400_000,
      retentionImpactScenario: inp.stancePct && inp.stancePct > 0 ? "custom" : "typical", retentionCustomPercent: inp.stancePct ?? 10,
      physicianAgencyEnabled: true, physicianAgencyWeeksPerVacancy: 16, physicianAgencyWeeklyPremium: 5_000,
    },
    {
      wrvuEnabled: true, currentWrvu: inp.econ?.wrvu ?? 1.5, wrvuScenario: inp.econ?.uplift != null ? "custom" : "typical", wrvuCustomPercent: inp.econ?.uplift ?? 5, conversionFactor: inp.econ?.cf ?? 33.4, wrvuRealization: inp.stancePct ?? 60,
      hccEnabled: true, avgHccs: 0, hccRealization: inp.stancePct ?? 60, hccPlans: [{ panelSize: hccPanelSize, valuePerHcc: hccValue, currentRecaptureRate: 0, uplift: "typical", netNewAvgConditions: hccPerPatient, netNewEnabled: true }],
      denialsEnabled: true, denialsScenario: "typical", medNecessityDenialRate: 5, avgClaimValue: 250, denialsRealization: inp.stancePct ?? 60,
    }, hrs);
}

// ---- ED (scope = providers) ----
const ED_PER_PROVIDER = 2000;
function edResults(inp: CellInputs) {
  const providers = inp.scope && inp.scope > 0 ? inp.scope : 30;
  const encounters = scaledEncounters(inp, providers, ED_PER_PROVIDER);
  const util = inp.util && inp.util > 0 ? inp.util : 70;
  const adoption = inp.adoption && inp.adoption > 0 ? inp.adoption : 70;
  const minSaved = inp.minSaved ?? 2;
  const hrs = Math.round((encounters * (adoption / 100) * minSaved) / 60);
  return run("ed", { numberOfProviders: providers, annualEncounters: encounters, utilizationPercent: util, encountersPerProvider: Math.round(encounters / providers) },
    {
      edLwbsEnabled: true, edLwbsRate: inp.econ?.lwbsRate ?? 3, edLwbsReduction: 10, edRevenuePerVisit: inp.econ?.edVisit ?? 480, edLwbsRealization: inp.stancePct ?? 80,
      edThroughputEnabled: true, edAdmissionRate: inp.econ?.admitRate ?? 18, edAdmissionRevenue: inp.econ?.admitMargin ?? 4_000, edAdmissionRealization: inp.stancePct ?? 60,
      wellbeingEnabled: true, calculateRetentionValue: true, annualTurnoverRate: inp.econ?.turnover ?? 6, burnoutRelatedTurnover: inp.econ?.burnout ?? 40, replacementCost: inp.econ?.replacementCost ?? 400_000,
      retentionImpactScenario: inp.stancePct && inp.stancePct > 0 ? "custom" : "typical", retentionCustomPercent: inp.stancePct ?? 10,
      physicianAgencyEnabled: true, physicianAgencyWeeksPerVacancy: 16, physicianAgencyWeeklyPremium: 5_000,
    },
    {
      wrvuEnabled: true, currentWrvu: inp.econ?.wrvu ?? 1.5, wrvuScenario: inp.econ?.uplift != null ? "custom" : "typical", wrvuCustomPercent: inp.econ?.uplift ?? 3, conversionFactor: inp.econ?.cf ?? 33.4, wrvuRealization: inp.stancePct ?? 60,
      denialsEnabled: true, denialsScenario: "typical", medNecessityDenialRate: inp.econ?.denialRate ?? 5, avgClaimValue: inp.econ?.avgClaim ?? 250, denialsRealization: inp.stancePct ?? 60,
    }, hrs);
}

// ---- Inpatient (scope = providers) ----
const IP_PER_PROVIDER = 500;
function ipResults(inp: CellInputs) {
  const providers = inp.scope && inp.scope > 0 ? inp.scope : 24;
  const encounters = scaledEncounters(inp, providers, IP_PER_PROVIDER);
  const util = inp.util && inp.util > 0 ? inp.util : 70;
  const base = run("inpatient", { numberOfProviders: providers, annualEncounters: encounters, utilizationPercent: util, encountersPerProvider: Math.round(encounters / providers) },
    {
      wellbeingEnabled: true, calculateRetentionValue: true, ipAnnualTurnoverRate: inp.econ?.turnover ?? 8, ipBurnoutRelatedTurnover: inp.econ?.burnout ?? 45, ipReplacementCost: inp.econ?.replacementCost ?? 300_000,
      retentionImpactScenario: inp.stancePct && inp.stancePct > 0 ? "custom" : "typical", retentionCustomPercent: inp.stancePct ?? 10,
      physicianAgencyEnabled: true, physicianAgencyWeeksPerVacancy: 16, physicianAgencyWeeklyPremium: 5_000,
    },
    {
      ipDrgEnabled: true, ipDrgScenario: "typical", ipDrgAtRiskRate: inp.econ?.atRisk ?? 15, ipDrgWeightIncrease: inp.econ?.weightInc ?? 0.03, ipDrgBasePayment: inp.econ?.drgBase ?? 6_000, ipDrgAttribution: inp.econ?.attribution ?? 65, ipDrgRealization: inp.stancePct ?? 60,
      ipObsDefenseEnabled: true, ipObsDefensePreventableScenario: "typical", ipObsDefenseDenialRate: inp.econ?.obsRate ?? 5, ipObsDefenseRevenueDelta: inp.econ?.obsDelta ?? 4_000, ipObsDefenseRealization: inp.stancePct ?? 60,
    }, 0);
  // CDI query reduction is NOT in the canonical engine (computeAllDriverValues has no CDI path),
  // so we fold it here the way opResults folds HCC: queries a complete note would avoid × cost per
  // query × the realization stance. Exposed as the synthetic driver key `ipCdiValue` the CDI lever sums.
  const cdiQueries = inp.econ?.cdiQueries ?? 1_500;
  const cdiCost = inp.econ?.cdiCost ?? 90;
  base.ipCdiValue = Math.round(cdiQueries * cdiCost * ((inp.stancePct ?? 60) / 100));
  // Inpatient capacity (discharge-before-noon readiness) is likewise NOT a canonical engine driver
  // (computeAllDriverValues has no throughput/discharge path), so we fold it the same way as ipCdiValue:
  // the documentation-gated share of discharges × the stance you can move × the value of an earlier bed
  // turn. Deliberately modest, because most discharge delay is placement, consults, and auth, not the
  // note, and this is an earlier bed turn, never a shorter length of stay. Synthetic key `ipDischargeCapacity`.
  const capDocShare = inp.econ?.dischargeDocShare ?? 8;
  const bedTurnValue = inp.econ?.bedTurnValue ?? 300;
  base.ipDischargeCapacity = Math.round(encounters * (capDocShare / 100) * ((inp.stancePct ?? 25) / 100) * bedTurnValue);
  return base;
}

// ---- Nursing (scope = nurses; beds scale with the nurse count) ----
function nursingResults(inp: CellInputs) {
  const nurses = inp.scope && inp.scope > 0 ? inp.scope : 260;
  const beds = inp.staffedBeds && inp.staffedBeds > 0 ? inp.staffedBeds : Math.max(1, Math.round(nurses * (180 / 260)));
  const occ = 85, util = inp.util && inp.util > 0 ? inp.util : 70, shifts = 156, minSaved = inp.minSaved ?? 5;
  const hrs = Math.round((nurses * shifts * (util / 100) * minSaved) / 60);
  return run("nursing", { numberOfProviders: nurses, nursingStaffedBeds: beds, nursingOccupancyRate: occ, nursingShiftsPerNurseYear: shifts, annualEncounters: 0, utilizationPercent: util },
    {
      nursingOtEnabled: true, nursingOtHoursPerNurseWeek: inp.econ?.otHours ?? 1.0, nursingOtReductionPercent: inp.stancePct ?? 40, nursingOtHourlyRate: inp.econ?.otRate ?? 75,
      nursingRetentionEnabled: true, nursingTurnoverRate: inp.econ?.turnover ?? 18, retentionImpactScenario: inp.stancePct && inp.stancePct > 0 ? "custom" : "typical", retentionCustomPercent: inp.stancePct ?? 15, nursingReplacementCost: inp.econ?.replacementCost ?? 56_300,
      nursingAgencyEnabled: true, nursingAgencyWeeksPerVacancy: 12, nursingAgencyWeeklyPremium: inp.econ?.agencyWk ?? 2_500,
    },
    {
      nursingHapiEnabled: true, nursingHapiRate: inp.econ?.hapiRate ?? 2.1, nursingHapiPreventionRate: inp.stancePct ?? 20, nursingHapiCost: 25_000,
      nursingFallsEnabled: true, nursingFallsRate: inp.econ?.fallsRate ?? 3.4, nursingFallsPreventionRate: inp.stancePct ?? 20, nursingFallsCost: 6_500,
      nursingClabsiEnabled: true, nursingClabsiUtilizationRatio: 15, nursingClabsiRate: inp.econ?.clabsiRate ?? 1.0, nursingClabsiPreventionRate: inp.stancePct ?? 20, nursingClabsiCost: 20_000,
      nursingSepsisEnabled: true, nursingSepsisRatePerThousand: inp.econ?.sepsisRate ?? 2.0, nursingSepsisCurrentCompliance: 70, nursingSepsisDocLagPercent: 30, nursingSepsisExcessCostPerCase: 3_500, nursingSepsisRealization: inp.stancePct ?? 60,
    }, hrs);
}

function resultsFor(setting: string, inp: CellInputs): Record<string, number> {
  switch (setting) {
    case "Outpatient": return opResults(inp);
    case "ED": return edResults(inp);
    case "Inpatient": return ipResults(inp);
    case "Nursing": return nursingResults(inp);
    default: return {};
  }
}

const sum = (r: Record<string, number>, keys: string[]) => keys.reduce((s, k) => s + (r[k] ?? 0), 0);

// which engine driver keys roll up to each Attain cell
const MAP: Record<string, string[]> = {
  "Outpatient|Patient Access": ["patientAccess"],
  "Outpatient|Provider Retention": ["providerWellbeing", "physicianLocumAgency"],
  "Outpatient|Revenue Capture": ["wrvu"], // FFS coding lift only; risk/HCC is tracked, not counted (no dollar driver)
  "ED|Patient Access": ["lwbsRecovery", "admissionCapture"],
  "ED|Provider Retention": ["providerWellbeing", "physicianLocumAgency"],
  "ED|Revenue Capture": ["edEmLevel", "denialPrevention"], // fallback only; live path passes activeDriverKeys per picked goals
  "Inpatient|Revenue Capture": ["drgAccuracy", "ipCdiValue", "obsDefense"], // fallback only; live path passes activeDriverKeys per picked goals
  "Inpatient|Provider Retention": ["providerWellbeing", "physicianLocumAgency"],
  "Inpatient|Inpatient Capacity": ["ipDischargeCapacity"], // synthetic, folded in ipResults (no canonical throughput driver)
  "Nursing|Quality & Safety": ["nursingFalls", "nursingHapi", "nursingClabsi", "nursingSepsis"],
  "Nursing|Provider Retention": ["nursingRetention", "nursingAgency"],
  "Nursing|Nursing Capacity": ["nursingOvertime"],
};

/** True once the partner has committed the two inputs that SIZE and TEMPER the number:
 * a scope and a stance. Detailed economics fields fall back to this adapter's conservative
 * typical defaults when not overridden (see the default-fallback design at the top of this file),
 * so a single blank field no longer zeroes an otherwise-committed category. A cell with no
 * economics model still shows nothing. */
export function cellInputsReady(setting: string, category: string, inp: CellInputs): boolean {
  const m = econModel(setting, category);
  if (!m) return false;
  if (!(inp.scope && inp.scope > 0)) return false;
  if (!(inp.stancePct && inp.stancePct > 0)) return false;
  // A multi-lever category also needs at least one live lever (a payer answer selected upstream);
  // with none picked the honest number is 0.
  if (m.levers && !(inp.activeDriverKeys && inp.activeDriverKeys.length > 0)) return false;
  return true;
}

/** The engine-computed value in play for an Attain cell, from the partner's inputs.
 * Returns 0 until the cell's inputs are ready (no fake numbers). */
export function engineValueInPlay(setting: string, category: string, inp: CellInputs = {}): number {
  if (!cellInputsReady(setting, category, inp)) return 0;
  // Multi-lever categories pass the driver keys their live levers sum; the rest use the static MAP.
  const keys = inp.activeDriverKeys ?? MAP[`${setting}|${category}`];
  if (!keys || !keys.length) return 0;
  return sum(resultsFor(setting, inp), keys);
}
