import type { ExploreState, OtherFinancialBenefitItem } from "@/pages/explore/ExploreFlow";

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

  if (state.careSetting === 'inpatient' && td.ipDischargePlanningEnabled) {
    const annualDischarges = td.ipAnnualDischarges >= 100
      ? td.ipAnnualDischarges
      : td.ipStaffedBeds > 0 && td.ipAlos > 0
        ? Math.round(td.ipStaffedBeds * (td.ipOccupancyRate / 100) * 365 / td.ipAlos)
        : state.annualEncounters;
    const affected = annualDischarges * (td.ipDischargeLagAffectedRate / 100);
    const dbnUplift = affected * (td.ipDbnCrossNoonRate / 100);
    const incrementalAdmissions = dbnUplift * (td.ipBedFillRate / 100);
    result.ipDischargePlanning = Math.round(incrementalAdmissions * td.ipNetRevenuePerAdmission);
  }

  return buildResult(result, benefitsForQuadrant(state, 'Capacity'));
}

export function computeWorkforceBreakdown(state: ExploreState, _totalHoursSaved: number): QuadrantBreakdown {
  const result: Record<string, number> = {};
  const td = state.timeDriverInputs;
  const retentionScenarios: Record<string, number> = { conservative: 5, typical: 10, optimistic: 15, custom: td.retentionCustomPercent ?? 10 };
  const nursingScenarios: Record<string, number> = { conservative: 10, typical: 15, optimistic: 25, custom: td.retentionCustomPercent ?? 10 };

  if (td.wellbeingEnabled && td.calculateRetentionValue) {
    const isIP = state.careSetting === 'inpatient';
    const turnover = (isIP ? td.ipAnnualTurnoverRate : td.annualTurnoverRate) / 100;
    const burnout = (isIP ? td.ipBurnoutRelatedTurnover : td.burnoutRelatedTurnover) / 100;
    const impact = retentionScenarios[td.retentionImpactScenario] / 100;
    const retained = state.numberOfProviders * turnover * burnout * impact;
    result.providerWellbeing = Math.round(retained * (isIP ? td.ipReplacementCost : td.replacementCost));

    if (td.physicianAgencyEnabled) {
      result.physicianLocumAgency = Math.round(retained * td.physicianAgencyWeeksPerVacancy * td.physicianAgencyWeeklyPremium);
    }
  }

  if (td.nursingRetentionEnabled) {
    const turnover = td.nursingTurnoverRate / 100;
    const impact = nursingScenarios[td.retentionImpactScenario] / 100;
    const burnoutDepartures = state.numberOfProviders * turnover * 0.40;
    const retained = burnoutDepartures * impact;
    result.nursingRetention = Math.round(retained * td.nursingReplacementCost);

    if (td.nursingAgencyEnabled) {
      result.nursingAgency = Math.round(retained * td.nursingAgencyWeeksPerVacancy * td.nursingAgencyWeeklyPremium);
    }
  }

  if (td.nursingOtEnabled) {
    const otHours = td.nursingOtHoursPerNurseWeek * (td.nursingOtReductionPercent / 100) * state.numberOfProviders * 52;
    result.nursingOvertime = Math.round(otHours * td.nursingOtHourlyRate);
  }

  return buildResult(result, benefitsForQuadrant(state, 'Workforce'));
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

  const wrvuScenarios: Record<string, number> = isED
    ? { conservative: 2, typical: 5, aggressive: 9, custom: dq.wrvuCustomPercent ?? 5 }
    : { conservative: 2, typical: 5, aggressive: 9, custom: dq.wrvuCustomPercent ?? 5 };
  const denialsScenarios: Record<string, number> = isED
    ? { conservative: 15, typical: 30, aggressive: 50 }
    : { conservative: 25, typical: 50, aggressive: 75 };
  const hccScenarios: Record<string, number> = { conservative: 6, typical: 10, aggressive: 15 };

  if (dq.wrvuEnabled && isOPorED) {
    const lift = (dq.currentWrvu * wrvuScenarios[dq.wrvuScenario]) / 100;
    const value = eligibleEncounters * lift * dq.conversionFactor * (dq.wrvuRealization / 100);
    if (isED) result.edEmLevel = Math.round(value);
    else result.wrvu = Math.round(value);
  }
  if (dq.hccEnabled && state.careSetting === 'outpatient') {
    const upliftMap: Record<string, number> = { conservative: 3, typical: 5, optimistic: 10 };
    let totalGross = 0;
    for (const plan of dq.hccPlans) {
      const upliftPp = plan.uplift === 'custom' ? (plan.upliftCustomPp ?? 5) : (upliftMap[plan.uplift] ?? 5);
      const effectiveUplift = Math.min(upliftPp, Math.max(0, 90 - plan.currentRecaptureRate));
      const gapPts = state.numberOfProviders * plan.panelSize * plan.gapRate / 100;
      totalGross += gapPts * (effectiveUplift / 100) * dq.avgHccs * plan.valuePerHcc;
      if (plan.netNewEnabled) {
        const netNewPts = state.numberOfProviders * plan.panelSize * plan.netNewDiscoveryRate / 100;
        totalGross += netNewPts * plan.netNewAvgConditions * plan.valuePerHcc;
      }
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
    const protectScenarios: Record<string, number> = { conservative: 15, typical: 20, aggressive: 25 };
    const pct = protectScenarios[dq.ipDrgScenario] / 100;
    const atRisk = eligibleEncounters * (dq.ipDrgAtRiskRate / 100);
    result.drgAccuracy = Math.round(atRisk * pct * dq.ipDrgWeightIncrease * dq.ipDrgBasePayment * (dq.ipDrgRealization / 100));
  }
  if (isIP && dq.ipCdiEnabled) {
    const cdiScenarios: Record<string, number> = { conservative: 15, typical: 25, aggressive: 35 };
    const pct = cdiScenarios[dq.ipCdiScenario] / 100;
    const totalQueries = eligibleEncounters * (dq.ipCdiQueryRate / 100);
    const avoided = totalQueries * pct;
    result.cdiQueryReduction = Math.round(avoided * dq.ipCdiCostPerQuery * (dq.ipCdiRealization / 100));
  }
  if (isIP && dq.ipObsDefenseEnabled) {
    const preventableScenarios: Record<string, number> = { conservative: 25, typical: 40, aggressive: 55 };
    const preventablePct = preventableScenarios[dq.ipObsDefensePreventableScenario] / 100;
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
    const hapisPerYear = (patientDays / 1000) * dq.nursingHapiRate;
    const prevented = hapisPerYear * (dq.nursingHapiPreventionRate / 100);
    result.nursingHapi = Math.round(prevented * dq.nursingHapiCost);
  }
  if (dq.nursingFallsEnabled) {
    const fallsPerYear = (patientDays / 1000) * dq.nursingFallsRate;
    const prevented = fallsPerYear * (dq.nursingFallsPreventionRate / 100);
    result.nursingFalls = Math.round(prevented * dq.nursingFallsCost);
  }
  if (dq.nursingCautiEnabled) {
    const catheterDays = patientDays * (dq.nursingCautiUtilizationRatio / 100);
    const cautisPerYear = (catheterDays / 1000) * dq.nursingCautiRate;
    const prevented = cautisPerYear * (dq.nursingCautiPreventionRate / 100);
    result.nursingCauti = Math.round(prevented * dq.nursingCautiCost);
  }
  if (dq.nursingClabsiEnabled) {
    const lineDays = patientDays * (dq.nursingClabsiUtilizationRatio / 100);
    const clabsiPerYear = (lineDays / 1000) * dq.nursingClabsiRate;
    const prevented = clabsiPerYear * (dq.nursingClabsiPreventionRate / 100);
    result.nursingClabsi = Math.round(prevented * dq.nursingClabsiCost);
  }
  if (dq.nursingSepsisEnabled) {
    const sepsisPerYear = (patientDays / 1000) * dq.nursingSepsisRatePerThousand;
    const nonCompliant = sepsisPerYear * ((100 - dq.nursingSepsisCurrentCompliance) / 100);
    const docLagCases = nonCompliant * (dq.nursingSepsisDocLagPercent / 100);
    result.nursingSepsis = Math.round(
      docLagCases * dq.nursingSepsisExcessCostPerCase * (dq.nursingSepsisRealization / 100)
    );
  }

  return buildResult(result, benefitsForQuadrant(state, 'Quality'));
}

export interface PriorQuadrantEntry {
  key: 'capacity' | 'workforce' | 'revenue' | 'quality';
  label: string;
  value: number;
}
