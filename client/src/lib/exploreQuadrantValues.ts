import type { ExploreState, OtherFinancialBenefitItem } from "@/pages/explore/ExploreFlow";
import {
  wrvuScenariosFor,
  denialsScenariosFor,
  computeAllDriverValues,
  HCC_UPLIFT_SCENARIOS,
  IP_DRG_PROTECT_SCENARIOS,
  IP_OBS_PREVENTABLE_SCENARIOS,
} from "@/lib/exploreDriverCalcs";
import { EXPLORE_DRIVERS } from "@/lib/exploreDrivers";
import { calcHapi, calcFalls, calcCauti, calcClabsi, calcSepsis } from "@/lib/nursingQualityCalcs";

export interface QuadrantBreakdown {
  driverValues: Record<string, number>;
  annualBenefitsTotal: number;
  oneTimeBenefitsTotal: number;
  quadrantAnnualTotal: number;
}

type Quadrant = OtherFinancialBenefitItem["quadrant"];

function benefitsForQuadrant(state: ExploreState, quadrant: Quadrant): OtherFinancialBenefitItem[] {
  return (state.otherFinancialBenefits ?? []).filter(b => b.quadrant === quadrant);
}

function sumBenefits(benefits: OtherFinancialBenefitItem[], type: 'annual' | 'oneTime'): number {
  return benefits.filter(b => b.type === type).reduce((sum, b) => sum + (b.amount || 0), 0);
}

function buildResult(driverValues: Record<string, number>, benefits: OtherFinancialBenefitItem[]): QuadrantBreakdown {
  const annualBenefitsTotal = sumBenefits(benefits, 'annual');
  const oneTimeBenefitsTotal = sumBenefits(benefits, 'oneTime');
  const quadrantAnnualTotal =
    Object.values(driverValues).reduce((sum, v) => sum + v, 0) + annualBenefitsTotal;
  return { driverValues, annualBenefitsTotal, oneTimeBenefitsTotal, quadrantAnnualTotal };
}

export function computeCapacityBreakdown(state: ExploreState, totalHoursSaved: number): QuadrantBreakdown {
  const result: Record<string, number> = {};
  const td = state.timeDriverInputs;

  // Nursing's Capacity drivers (overtime, bedside time) are tag-pulled from the
  // registry, like Workforce. Nursing has no patient-access/ED capacity items, so
  // this never collides with the inline OP/ED logic below.
  if (state.careSetting === 'nursing') {
    Object.assign(result, driverValuesForQuadrant(state, totalHoursSaved, 'Capacity'));
  }

  if (td.patientAccessEnabled) {
    const effectiveAccessProviders = Math.min(td.accessProviders || state.numberOfProviders, state.numberOfProviders);
    const hrsPerProvPerWeek = state.numberOfProviders > 0 ? totalHoursSaved / state.numberOfProviders / 48 : 0;
    const reinvestRate = (td.capacityRealizationPercent ?? 25) / 100;
    const visitDurationHrs = (td.visitDuration ?? 30) / 60;
    const visitsPerWeek = visitDurationHrs > 0 ? Math.round((hrsPerProvPerWeek * reinvestRate / visitDurationHrs) * 10) / 10 : 0;
    const annualVisits = Math.round(visitsPerWeek * effectiveAccessProviders * 48);
    result.patientAccess = Math.round(annualVisits * td.revenuePerVisit);
  }

  if (td.edLwbsEnabled) {
    const lwbsPatients = state.annualEncounters * (td.edLwbsRate / 100);
    const recovered = lwbsPatients * (td.edLwbsReduction / 100);
    result.lwbsRecovery = Math.round(recovered * td.edRevenuePerVisit * (td.edLwbsRealization / 100));
  }

  if (td.edThroughputEnabled && td.edLwbsEnabled) {
    const lwbsPatients = state.annualEncounters * (td.edLwbsRate / 100);
    const recovered = lwbsPatients * (td.edLwbsReduction / 100);
    const admissions = recovered * (td.edAdmissionRate / 100);
    result.admissionCapture = Math.round(admissions * td.edAdmissionRevenue * (td.edAdmissionRealization / 100));
  }

  return buildResult(result, benefitsForQuadrant(state, 'Capacity'));
}

export function computeWorkforceBreakdown(state: ExploreState, totalHoursSaved: number): QuadrantBreakdown {
  // Single source of truth: pull the Workforce driver values straight from the
  // canonical engine so the screen total can't drift from the Model/PDF. This
  // previously re-derived each driver inline and silently OMITTED
  // scribeCostReduction (a Workforce driver for OP/ED), understating the screen.
  return buildResult(driverValuesForQuadrant(state, totalHoursSaved, 'Workforce'), benefitsForQuadrant(state, 'Workforce'));
}

function driverValuesForQuadrant(state: ExploreState, totalHoursSaved: number, quadrant: Quadrant): Record<string, number> {
  const all = computeAllDriverValues(state, totalHoursSaved);
  const result: Record<string, number> = {};
  if (!state.careSetting) return result;
  EXPLORE_DRIVERS.forEach(d => {
    if (d.quadrant === quadrant && d.settings.includes(state.careSetting!) && all[d.id] !== undefined) {
      result[d.id] = all[d.id];
    }
  });
  return result;
}

export function computeRevenueBreakdown(state: ExploreState, _totalHoursSaved: number): QuadrantBreakdown {
  // Mirrors ExploreRevenue.tsx driverValues exactly so the Quality page's
  // "Progress So Far" carry-forward stays in sync with the Revenue page total.
  const result: Record<string, number> = {};
  const dq = state.docQualityInputs;
  const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));
  const isED = state.careSetting === 'ed';
  const isOPorED = state.careSetting === 'outpatient' || state.careSetting === 'ed';
  const isIP = state.careSetting === 'inpatient';

  const wrvuScenarios = wrvuScenariosFor(isED, dq.wrvuCustomPercent);
  const denialsScenarios = denialsScenariosFor(isED, dq.denialsCustomPercent);

  if (dq.wrvuEnabled && isOPorED) {
    const lift = (dq.currentWrvu * wrvuScenarios[dq.wrvuScenario]) / 100;
    const value = eligibleEncounters * lift * dq.conversionFactor * (dq.wrvuRealization / 100);
    if (isED) result.edEmLevel = Math.round(value);
    else result.wrvu = Math.round(value);
  }
  if (dq.hccEnabled && state.careSetting === 'outpatient') {
    const upliftMap = HCC_UPLIFT_SCENARIOS;
    let totalGross = 0;
    // Clean recapture model — mirrors computeAllDriverValues exactly (no gapRate).
    for (const plan of dq.hccPlans) {
      const members = state.numberOfProviders * plan.panelSize;
      const upliftPp = plan.uplift === 'custom' ? (plan.upliftCustomPp ?? 5) : (upliftMap[plan.uplift] ?? 5);
      const effectiveUplift = Math.min(upliftPp, Math.max(0, 100 - plan.currentRecaptureRate));
      const recaptured = members * dq.avgHccs * (effectiveUplift / 100);
      const newlyIdentified = members * (plan.netNewAvgConditions ?? 0);
      totalGross += (recaptured + newlyIdentified) * plan.valuePerHcc;
    }
    result.hccCapture = Math.round(totalGross * (dq.hccRealization / 100));
  }
  if (dq.denialsEnabled && isOPorED) {
    const prev = denialsScenarios[dq.denialsScenario] / 100;
    const medNecessityDenials = eligibleEncounters * (dq.medNecessityDenialRate / 100);
    const prevented = medNecessityDenials * prev;
    result.denialPrevention = Math.round(prevented * dq.avgClaimValue * (dq.denialsRealization / 100));
  }
  if (isIP && dq.ipDrgEnabled) {
    // Clean CMI model — mirrors computeAllDriverValues (no at-risk/protect stacking).
    result.drgAccuracy = Math.round(
      eligibleEncounters * dq.ipDrgWeightIncrease * dq.ipDrgBasePayment * ((dq.ipDrgAttribution ?? 65) / 100) * (dq.ipDrgRealization / 100),
    );
  }
  if (isIP && dq.ipObsDefenseEnabled) {
    const preventablePct = (dq.ipObsDefensePreventableScenario === 'custom' ? (dq.ipObsDefenseCustomPercent ?? 40) : (IP_OBS_PREVENTABLE_SCENARIOS[dq.ipObsDefensePreventableScenario] ?? 40)) / 100;
    const downgrades = eligibleEncounters * (dq.ipObsDefenseDenialRate / 100);
    const gross = downgrades * dq.ipObsDefenseRevenueDelta * preventablePct;
    result.obsDefense = Math.round(gross * (dq.ipObsDefenseRealization / 100));
  }

  return buildResult(result, benefitsForQuadrant(state, 'Revenue'));
}

export function computeQualityBreakdown(state: ExploreState, _totalHoursSaved: number): QuadrantBreakdown {
  const result: Record<string, number> = {};
  const dq = state.docQualityInputs;
  const patientDays = state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;

  if (dq.nursingHapiEnabled) {
    result.nursingHapi = Math.round(
      calcHapi({
        patientDays,
        rate: dq.nursingHapiRate,
        preventionPct: dq.nursingHapiPreventionRate,
        cost: dq.nursingHapiCost,
      }).value,
    );
  }
  if (dq.nursingFallsEnabled) {
    result.nursingFalls = Math.round(
      calcFalls({
        patientDays,
        rate: dq.nursingFallsRate,
        preventionPct: dq.nursingFallsPreventionRate,
        cost: dq.nursingFallsCost,
      }).value,
    );
  }
  if (dq.nursingCautiEnabled) {
    result.nursingCauti = Math.round(
      calcCauti({
        patientDays,
        utilizationPct: dq.nursingCautiUtilizationRatio,
        rate: dq.nursingCautiRate,
        preventionPct: dq.nursingCautiPreventionRate,
        cost: dq.nursingCautiCost,
      }).value,
    );
  }
  if (dq.nursingClabsiEnabled) {
    result.nursingClabsi = Math.round(
      calcClabsi({
        patientDays,
        utilizationPct: dq.nursingClabsiUtilizationRatio,
        rate: dq.nursingClabsiRate,
        preventionPct: dq.nursingClabsiPreventionRate,
        cost: dq.nursingClabsiCost,
      }).value,
    );
  }
  if (dq.nursingSepsisEnabled) {
    result.nursingSepsis = Math.round(
      calcSepsis({
        patientDays,
        ratePerThousand: dq.nursingSepsisRatePerThousand,
        currentCompliancePct: dq.nursingSepsisCurrentCompliance,
        docLagPct: dq.nursingSepsisDocLagPercent,
        excessCostPerCase: dq.nursingSepsisExcessCostPerCase,
        realizationPct: dq.nursingSepsisRealization,
      }).value,
    );
  }

  return buildResult(result, benefitsForQuadrant(state, 'Quality'));
}

export interface PriorQuadrantEntry {
  key: 'capacity' | 'workforce' | 'revenue' | 'quality';
  label: string;
  value: number;
}
