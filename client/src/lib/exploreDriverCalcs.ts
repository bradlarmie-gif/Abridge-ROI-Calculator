import {
  calcHapi,
  calcFalls,
  calcCauti,
  calcClabsi,
  calcSepsis,
} from "@/lib/nursingQualityCalcs";
import type { ExploreState } from "@/pages/explore/ExploreFlow";
import { EXPLORE_DRIVERS, type ExploreQuadrant } from "@/lib/exploreDrivers";

/**
 * Pure helpers that compute every quantified Explore driver's:
 *
 *   1. Engine value (the rounded $ figure shown in the headline)
 *   2. Printed `calcSummary` formula string (the "A × B × C × $D × E%" line
 *      rendered on the PDF)
 *
 * Extracting both into pure functions has two benefits:
 *
 *   - `ExploreModel.tsx` and `ExplorePDFExport`/`ExploreNarrativePDF.tsx` can
 *     share one source of truth, eliminating the risk that one is updated
 *     without the other.
 *   - Tests (see `client/src/__tests__/exploreNarrativePdfReconciliation.test.ts`)
 *     can call them directly with a synthetic `ExploreState` and assert that
 *     parsing the printed formula's multiplicands reconciles to the engine
 *     value within a small currency tolerance.
 *
 * Nursing-quality math is delegated to the shared helpers in
 * `@/lib/nursingQualityCalcs` (which are independently covered by
 * `nursingPdfReconciliation.test.ts`); the OP / ED / IP math is inlined here
 * to mirror the original ExploreModel logic exactly.
 */

const RETENTION_SCENARIOS_PHYSICIAN_BASE: Record<string, number> = {
  conservative: 5,
  typical: 10,
  optimistic: 15,
};
const RETENTION_SCENARIOS_NURSING_BASE: Record<string, number> = {
  conservative: 10,
  typical: 15,
  optimistic: 25,
};
const retentionPhysician = (customPct: number): Record<string, number> => ({ ...RETENTION_SCENARIOS_PHYSICIAN_BASE, custom: customPct });
const retentionNursing = (customPct: number): Record<string, number> => ({ ...RETENTION_SCENARIOS_NURSING_BASE, custom: customPct });
const IP_DRG_PROTECT_SCENARIOS: Record<string, number> = {
  conservative: 15,
  typical: 20,
  aggressive: 25,
};
const IP_CDI_SCENARIOS: Record<string, number> = {
  conservative: 15,
  typical: 25,
  aggressive: 35,
};

// Canonical wRVU lift scenarios — single source of truth for both the headline
// engine and the per-screen Revenue breakdown / driver card.
export const wrvuScenariosFor = (isED: boolean, customPct?: number): Record<string, number> =>
  isED
    ? { conservative: 1, typical: 2.5, aggressive: 4, custom: customPct ?? 5 }
    : { conservative: 2, typical: 5, aggressive: 7, custom: customPct ?? 5 };

const denialsScenariosFor = (isED: boolean, customPct?: number): Record<string, number> =>
  isED
    ? { conservative: 15, typical: 30, aggressive: 50, custom: customPct ?? 25 }
    : { conservative: 25, typical: 50, aggressive: 75, custom: customPct ?? 25 };

const fmtN = (n: number) => Math.round(n).toLocaleString();
const fmtNd = (n: number) =>
  Number(n).toLocaleString(undefined, { maximumFractionDigits: 1 });
const fmt$ = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function computeAllDriverValues(
  state: ExploreState,
  totalHoursSaved: number,
): Record<string, number> {
  const result: Record<string, number> = {};
  const td = state.timeDriverInputs as any;
  const dq = state.docQualityInputs as any;
  const setting = state.careSetting;
  const eligibleEncounters = Math.round(
    state.annualEncounters * (state.utilizationPercent / 100),
  );
  const isED = setting === "ed";
  const isIP = setting === "inpatient";
  const isOP = setting === "outpatient";
  const isNursing = setting === "nursing";
  const isPhysician = isOP || isED || isIP;

  // ─── Capacity ───
  if (isOP && td.patientAccessEnabled) {
    const eff = Math.min(
      td.accessProviders || state.numberOfProviders,
      state.numberOfProviders,
    );
    const hrsPerProvWk =
      state.numberOfProviders > 0
        ? totalHoursSaved / state.numberOfProviders / 48
        : 0;
    const reinvest = (td.capacityRealizationPercent ?? 25) / 100;
    const visitHrs = (td.visitDuration ?? 30) / 60;
    const visitsPerWk =
      visitHrs > 0
        ? Math.round((hrsPerProvWk * reinvest / visitHrs) * 10) / 10
        : 0;
    result.patientAccess = Math.round(
      visitsPerWk * eff * 48 * td.revenuePerVisit,
    );
  }
  if (isED && td.edLwbsEnabled) {
    const lwbs = state.annualEncounters * (td.edLwbsRate / 100);
    const recovered = lwbs * (td.edLwbsReduction / 100);
    result.lwbsRecovery = Math.round(
      recovered * td.edRevenuePerVisit * (td.edLwbsRealization / 100),
    );
    if (td.edThroughputEnabled) {
      const adm = recovered * (td.edAdmissionRate / 100);
      result.admissionCapture = Math.round(
        adm * td.edAdmissionRevenue * (td.edAdmissionRealization / 100),
      );
    }
  }
  // ─── Workforce ───
  const RETENTION_SCENARIOS_PHYSICIAN = retentionPhysician(td.retentionCustomPercent ?? 10);
  const RETENTION_SCENARIOS_NURSING = retentionNursing(td.retentionCustomPercent ?? 10);
  if (isPhysician && td.wellbeingEnabled && td.calculateRetentionValue) {
    // Inpatient uses hospitalist-specific turnover/replacement inputs (the
    // fields the IP wellbeing card lets the user edit); other physician
    // settings use the generic fields. Mirrors exploreQuadrantValues.
    const turnover = (isIP ? td.ipAnnualTurnoverRate : td.annualTurnoverRate) / 100;
    const burnout = (isIP ? td.ipBurnoutRelatedTurnover : td.burnoutRelatedTurnover) / 100;
    const impact =
      RETENTION_SCENARIOS_PHYSICIAN[td.retentionImpactScenario] / 100;
    const retained = state.numberOfProviders * turnover * burnout * impact;
    result.providerWellbeing = Math.round(retained * (isIP ? td.ipReplacementCost : td.replacementCost));
    if (td.physicianAgencyEnabled) {
      result.physicianLocumAgency = Math.round(
        retained *
          td.physicianAgencyWeeksPerVacancy *
          td.physicianAgencyWeeklyPremium,
      );
    }
  }
  if (isNursing && td.nursingRetentionEnabled) {
    const turnover = td.nursingTurnoverRate / 100;
    const impact =
      RETENTION_SCENARIOS_NURSING[td.retentionImpactScenario] / 100;
    const burnoutDep = state.numberOfProviders * turnover * 0.4;
    const retained = burnoutDep * impact;
    result.nursingRetention = Math.round(retained * td.nursingReplacementCost);
    if (td.nursingAgencyEnabled) {
      result.nursingAgency = Math.round(
        retained *
          td.nursingAgencyWeeksPerVacancy *
          td.nursingAgencyWeeklyPremium,
      );
    }
  }
  if (isNursing && td.nursingOtEnabled) {
    const otHrs =
      td.nursingOtHoursPerNurseWeek *
      (td.nursingOtReductionPercent / 100) *
      state.numberOfProviders *
      52;
    result.nursingOvertime = Math.round(otHrs * td.nursingOtHourlyRate);
  }
  if ((isOP || isED) && td.scribeCostReductionEnabled) {
    if (td.scribeBillingMode === 'hourly') {
      const costPerVisit = (td.scribeHourlyRate || 0) * ((td.scribeMinutesPerNote || 0) / 60);
      const scribedVisits = state.annualEncounters * ((td.scribeCoveragePercent || 0) / 100);
      result.scribeCostReduction = Math.round(costPerVisit * scribedVisits * ((td.scribeVisitPercentEliminated || 0) / 100));
    } else {
      const eliminated = Math.min(td.scribePositionsEliminated || 0, td.scribeHeadcount || 0);
      result.scribeCostReduction = Math.round(eliminated * (td.scribeCostPerPosition || 0));
    }
  }

  // ─── Revenue ───
  const wrvuScenarios = wrvuScenariosFor(isED, dq.wrvuCustomPercent);
  const denialsScenarios = denialsScenariosFor(isED, dq.denialsCustomPercent);

  if (dq.wrvuEnabled && (isOP || isED)) {
    const lift = (dq.currentWrvu * wrvuScenarios[dq.wrvuScenario]) / 100;
    const value =
      eligibleEncounters * lift * dq.conversionFactor * (dq.wrvuRealization / 100);
    if (isED) result.edEmLevel = Math.round(value);
    else result.wrvu = Math.round(value);
  }
  if (dq.hccEnabled && isOP) {
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
  if (dq.denialsEnabled && (isOP || isED)) {
    const prev = denialsScenarios[dq.denialsScenario] / 100;
    const medNecessityDenials = eligibleEncounters * (dq.medNecessityDenialRate / 100);
    result.denialPrevention = Math.round(
      medNecessityDenials * prev * dq.avgClaimValue * (dq.denialsRealization / 100),
    );
  }
  if (isIP && dq.ipDrgEnabled) {
    const pct = IP_DRG_PROTECT_SCENARIOS[dq.ipDrgScenario] / 100;
    const atRisk = eligibleEncounters * (dq.ipDrgAtRiskRate / 100);
    result.drgAccuracy = Math.round(
      atRisk *
        pct *
        dq.ipDrgWeightIncrease *
        dq.ipDrgBasePayment *
        (dq.ipDrgRealization / 100),
    );
  }
  if (isIP && dq.ipCdiEnabled) {
    const pct = IP_CDI_SCENARIOS[dq.ipCdiScenario] / 100;
    const queries = eligibleEncounters * (dq.ipCdiQueryRate / 100);
    result.cdiQueryReduction = Math.round(
      queries * pct * dq.ipCdiCostPerQuery * (dq.ipCdiRealization / 100),
    );
  }
  if (isIP && dq.ipObsDefenseEnabled) {
    const preventableScenarios: Record<string, number> = { conservative: 25, typical: 40, aggressive: 55 };
    const preventablePct = (preventableScenarios[dq.ipObsDefensePreventableScenario] ?? 40) / 100;
    const downgrades = eligibleEncounters * (dq.ipObsDefenseDenialRate / 100);
    const gross = downgrades * dq.ipObsDefenseRevenueDelta * preventablePct;
    result.obsDefense = Math.round(gross * (dq.ipObsDefenseRealization / 100));
  }

  // ─── Quality (Nursing only quantified) ───
  // Math is delegated to the shared helpers in @/lib/nursingQualityCalcs
  // so the engine, the live UI, and the printed PDF stay in lockstep.
  if (isNursing) {
    const patientDays =
      state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
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
  }

  return result;
}

export function computeAllDriverCalcSummaries(
  state: ExploreState,
  totalHoursSaved: number,
): Record<string, string> {
  const out: Record<string, string> = {};
  const td = state.timeDriverInputs as any;
  const dq = state.docQualityInputs as any;
  const setting = state.careSetting;
  const eligibleEncounters = Math.round(
    state.annualEncounters * (state.utilizationPercent / 100),
  );
  const isED = setting === "ed";
  const isIP = setting === "inpatient";
  const isOP = setting === "outpatient";
  const isNursing = setting === "nursing";
  const isPhysician = isOP || isED || isIP;

  // Capacity
  if (isOP && td.patientAccessEnabled) {
    const eff = Math.min(
      td.accessProviders || state.numberOfProviders,
      state.numberOfProviders,
    );
    const hrsPerProvWk =
      state.numberOfProviders > 0
        ? totalHoursSaved / state.numberOfProviders / 48
        : 0;
    const reinvest = (td.capacityRealizationPercent ?? 25) / 100;
    const visitHrs = (td.visitDuration ?? 30) / 60;
    const visitsPerWk =
      visitHrs > 0
        ? Math.round((hrsPerProvWk * reinvest / visitHrs) * 10) / 10
        : 0;
    out.patientAccess = `${fmtN(eff)} providers × ${fmtNd(visitsPerWk)} visits/wk × 48 wks × ${fmt$(td.revenuePerVisit)}/visit`;
  }
  if (isED && td.edLwbsEnabled) {
    out.lwbsRecovery = `${fmtN(state.annualEncounters)} encounters × ${td.edLwbsRate}% LWBS × ${td.edLwbsReduction}% reduction × ${fmt$(td.edRevenuePerVisit)}/visit × ${td.edLwbsRealization}% realization`;
    if (td.edThroughputEnabled) {
      const recovered = Math.round(
        state.annualEncounters * (td.edLwbsRate / 100) * (td.edLwbsReduction / 100),
      );
      out.admissionCapture = `${fmtN(recovered)} recovered visits × ${td.edAdmissionRate}% admit rate × ${fmt$(td.edAdmissionRevenue)}/admit × ${td.edAdmissionRealization}% realization`;
    }
  }

  // Workforce
  const CS_RETENTION_PHYSICIAN = retentionPhysician(td.retentionCustomPercent ?? 10);
  const CS_RETENTION_NURSING = retentionNursing(td.retentionCustomPercent ?? 10);
  if (isPhysician && td.wellbeingEnabled && td.calculateRetentionValue) {
    const impactPct =
      CS_RETENTION_PHYSICIAN[td.retentionImpactScenario] ?? 0;
    // Inpatient prints its hospitalist-specific fields so the formula keeps
    // multiplying out to the engine value (which now uses them too).
    const wbTurnover = isIP ? td.ipAnnualTurnoverRate : td.annualTurnoverRate;
    const wbBurnout = isIP ? td.ipBurnoutRelatedTurnover : td.burnoutRelatedTurnover;
    const wbReplacement = isIP ? td.ipReplacementCost : td.replacementCost;
    out.providerWellbeing = `${fmtN(state.numberOfProviders)} providers × ${wbTurnover}% turnover × ${wbBurnout}% burnout × ${impactPct}% impact × ${fmt$(wbReplacement)}/replacement`;
    if (td.physicianAgencyEnabled) {
      // Print the full factor breakdown rather than a precomputed
      // `${fmtNd(retained)} retained` token. Rounding the retained-providers
      // sub-total to one decimal (e.g. 0.16 → "0.2") would silently inflate
      // the printed math by ~25% versus the engine value. Breaking the
      // formula down keeps the printed multiplicands in lockstep with the
      // engine's unrounded retained × weeks × premium product.
      out.physicianLocumAgency = `${fmtN(state.numberOfProviders)} providers × ${wbTurnover}% turnover × ${wbBurnout}% burnout × ${impactPct}% impact × ${td.physicianAgencyWeeksPerVacancy} wks/vacancy × ${fmt$(td.physicianAgencyWeeklyPremium)}/wk`;
    }
  }
  if (isNursing && td.nursingRetentionEnabled) {
    const impactPct =
      CS_RETENTION_NURSING[td.retentionImpactScenario] ?? 0;
    out.nursingRetention = `${fmtN(state.numberOfProviders)} nurses × ${td.nursingTurnoverRate}% turnover × 40% burnout × ${impactPct}% impact × ${fmt$(td.nursingReplacementCost)}/replacement`;
    if (td.nursingAgencyEnabled) {
      // Print the full factor breakdown rather than a precomputed
      // `${fmtNd(retained)} retained` token. Rounding the retained-nurses
      // sub-total to one decimal (e.g. 0.16 → "0.2") would silently inflate
      // the printed math by ~25% versus the engine value. Breaking the
      // formula down keeps the printed multiplicands in lockstep with the
      // engine's unrounded retained × weeks × premium product.
      out.nursingAgency = `${fmtN(state.numberOfProviders)} nurses × ${td.nursingTurnoverRate}% turnover × 40% burnout × ${impactPct}% impact × ${td.nursingAgencyWeeksPerVacancy} wks/vacancy × ${fmt$(td.nursingAgencyWeeklyPremium)}/wk`;
    }
  }
  if (isNursing && td.nursingOtEnabled) {
    out.nursingOvertime = `${fmtN(state.numberOfProviders)} nurses × ${td.nursingOtHoursPerNurseWeek} OT hrs/wk × ${td.nursingOtReductionPercent}% reduction × 52 wks × ${fmt$(td.nursingOtHourlyRate)}/hr`;
  }

  // Revenue
  const wrvuScenarios = wrvuScenariosFor(isED, dq.wrvuCustomPercent);
  const denialsScenarios = denialsScenariosFor(isED, dq.denialsCustomPercent);

  if (dq.wrvuEnabled && (isOP || isED)) {
    const liftPct = wrvuScenarios[dq.wrvuScenario] ?? 0;
    const summary = `${fmtN(eligibleEncounters)} encounters × ${dq.currentWrvu} current wRVU × ${liftPct}% lift × ${fmt$(dq.conversionFactor)}/wRVU × ${dq.wrvuRealization}% realization`;
    if (isED) out.edEmLevel = summary;
    else out.wrvu = summary;
  }
  if (dq.hccEnabled && isOP) {
    const upliftMap: Record<string, number> = { conservative: 3, typical: 5, optimistic: 10 };
    if (dq.hccPlans.length === 1) {
      const p = dq.hccPlans[0];
      const upliftPp = p.uplift === 'custom' ? (p.upliftCustomPp ?? 5) : (upliftMap[p.uplift] ?? 5);
      const effective = Math.min(upliftPp, Math.max(0, 90 - p.currentRecaptureRate));
      const projected = p.currentRecaptureRate + effective;
      const gapPatients = Math.round(state.numberOfProviders * p.panelSize * p.gapRate / 100);
      let formula = `${fmtN(gapPatients)} gap patients (${p.gapRate}% of ${fmtN(state.numberOfProviders * p.panelSize)} ${p.name} pts) × +${effective}pp Abridge uplift (${p.currentRecaptureRate}%→${projected}%) × ${dq.avgHccs} avg HCCs per patient × ${fmt$(p.valuePerHcc)} per captured HCC × ${dq.hccRealization}% realization`;
      if (p.netNewEnabled) {
        const netNewPts = Math.round(state.numberOfProviders * p.panelSize * (p.netNewDiscoveryRate / 100));
        formula += ` (+ ${fmtN(netNewPts)} pts × ${p.netNewAvgConditions} cond net new)`;
      }
      out.hccCapture = formula;
    } else {
      const planLines = dq.hccPlans.map((p: { name: string; panelSize: number; gapRate: number; currentRecaptureRate: number; uplift: string; upliftCustomPp?: number; netNewEnabled: boolean; netNewDiscoveryRate: number }) => {
        const upliftPp = p.uplift === 'custom' ? (p.upliftCustomPp ?? 5) : (upliftMap[p.uplift] ?? 5);
        const effective = Math.min(upliftPp, Math.max(0, 90 - p.currentRecaptureRate));
        const gapPts = Math.round(state.numberOfProviders * p.panelSize * p.gapRate / 100);
        return `${p.name}: ${fmtN(gapPts)} gap pts × +${effective}pp (${p.currentRecaptureRate}%→${p.currentRecaptureRate + effective}%)${p.netNewEnabled ? ` + net new` : ''}`;
      }).join(' | ');
      out.hccCapture = `${planLines} × ${dq.avgHccs} avg HCCs × ${dq.hccRealization}% realization`;
    }
  }
  if (dq.denialsEnabled && (isOP || isED)) {
    const prevPct = denialsScenarios[dq.denialsScenario] ?? 0;
    out.denialPrevention = `${fmtN(eligibleEncounters)} encounters × ${dq.medNecessityDenialRate}% medical necessity denial rate × ${prevPct}% reduction target × ${fmt$(dq.avgClaimValue)}/claim × ${dq.denialsRealization}% realization`;
  }
  if (isIP && dq.ipDrgEnabled) {
    const protectPct = IP_DRG_PROTECT_SCENARIOS[dq.ipDrgScenario] ?? 0;
    out.drgAccuracy = `${fmtN(eligibleEncounters)} encounters × ${dq.ipDrgAtRiskRate}% at-risk × ${protectPct}% protect × ${dq.ipDrgWeightIncrease} weight × ${fmt$(dq.ipDrgBasePayment)}/case × ${dq.ipDrgRealization}% realization`;
  }
  if (isIP && dq.ipCdiEnabled) {
    const reductionPct = IP_CDI_SCENARIOS[dq.ipCdiScenario] ?? 0;
    out.cdiQueryReduction = `${fmtN(eligibleEncounters)} encounters × ${dq.ipCdiQueryRate}% query rate × ${reductionPct}% reduction × ${fmt$(dq.ipCdiCostPerQuery)}/query × ${dq.ipCdiRealization}% realization`;
  }
  if (isIP && dq.ipObsDefenseEnabled) {
    const preventableScenarios: Record<string, number> = { conservative: 25, typical: 40, aggressive: 55 };
    const preventablePct = preventableScenarios[dq.ipObsDefensePreventableScenario] ?? 40;
    out.obsDefense = `${fmtN(eligibleEncounters)} encounters × ${dq.ipObsDefenseDenialRate}% downgrade rate × ${fmt$(dq.ipObsDefenseRevenueDelta)}/case delta × ${preventablePct}% doc-preventable × ${dq.ipObsDefenseRealization}% realization`;
  }

  // Quality (Nursing only quantified) — derive every multiplicand from the
  // shared helpers so the displayed formula and the engine value can never
  // disagree, even if a future haircut/multiplier is added to the math.
  if (isNursing && state.nursingStaffedBeds && state.nursingOccupancyRate) {
    const patientDays =
      state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365;
    if (dq.nursingHapiEnabled) {
      out.nursingHapi = `${fmtN(patientDays)} patient-days × ${dq.nursingHapiRate}/1k HAPI × ${dq.nursingHapiPreventionRate}% prevention × ${fmt$(dq.nursingHapiCost)}/case`;
    }
    if (dq.nursingFallsEnabled) {
      out.nursingFalls = `${fmtN(patientDays)} patient-days × ${dq.nursingFallsRate}/1k falls × ${dq.nursingFallsPreventionRate}% prevention × ${fmt$(dq.nursingFallsCost)}/case`;
    }
    if (dq.nursingCautiEnabled) {
      const cautiCalc = calcCauti({
        patientDays,
        utilizationPct: dq.nursingCautiUtilizationRatio,
        rate: dq.nursingCautiRate,
        preventionPct: dq.nursingCautiPreventionRate,
        cost: dq.nursingCautiCost,
      });
      out.nursingCauti = `${fmtN(cautiCalc.catheterDays)} cath-days × ${dq.nursingCautiRate}/1k CAUTI × ${dq.nursingCautiPreventionRate}% prevention × ${fmt$(dq.nursingCautiCost)}/case`;
    }
    if (dq.nursingClabsiEnabled) {
      const clabsiCalc = calcClabsi({
        patientDays,
        utilizationPct: dq.nursingClabsiUtilizationRatio,
        rate: dq.nursingClabsiRate,
        preventionPct: dq.nursingClabsiPreventionRate,
        cost: dq.nursingClabsiCost,
      });
      out.nursingClabsi = `${fmtN(clabsiCalc.lineDays)} line-days × ${dq.nursingClabsiRate}/1k CLABSI × ${dq.nursingClabsiPreventionRate}% prevention × ${fmt$(dq.nursingClabsiCost)}/case`;
    }
    if (dq.nursingSepsisEnabled) {
      const sepsisCalc = calcSepsis({
        patientDays,
        ratePerThousand: dq.nursingSepsisRatePerThousand,
        currentCompliancePct: dq.nursingSepsisCurrentCompliance,
        docLagPct: dq.nursingSepsisDocLagPercent,
        excessCostPerCase: dq.nursingSepsisExcessCostPerCase,
        realizationPct: dq.nursingSepsisRealization,
      });
      out.nursingSepsis = `${fmtN(patientDays)} patient-days × ${dq.nursingSepsisRatePerThousand}/1k sepsis × ${sepsisCalc.complianceGapPct}% non-compliance × ${dq.nursingSepsisDocLagPercent}% doc lag × ${fmt$(dq.nursingSepsisExcessCostPerCase)}/case × ${dq.nursingSepsisRealization}% realization`;
    }
  }

  return out;
}

export interface ExploreTotals {
  /** Per-quadrant driver totals (excludes "other financial benefits"). */
  valueByQuadrant: Record<ExploreQuadrant, number>;
  /** Recurring annual value: all driver values + annual other-financial-benefits. */
  totalAnnualValue: number;
  /** One-time value: one-time other-financial-benefits only. */
  totalOneTimeValue: number;
  /** Time/efficiency value shown on the Investment screen = Capacity + Workforce. */
  efficiencyValue: number;
  /** Documentation/quality value shown on the Investment screen = Revenue + Quality. */
  documentationValue: number;
}

/**
 * Single source of truth for the headline Explore totals. Both the
 * Investment screen (ExploreInvestment) and the Your Model screen
 * (ExploreModel) consume this so they can never disagree about Total Value or
 * ROI. The math mirrors ExploreModel's original quadrant aggregation:
 * driver values come from `computeAllDriverValues` summed by quadrant, plus
 * the user's "other financial benefits" (annual into the recurring total,
 * one-time tracked separately).
 *
 * The efficiency / documentation split is just a regrouping of the same
 * quadrants (Capacity+Workforce vs Revenue+Quality), so
 * `efficiencyValue + documentationValue === totalAnnualValue` always holds.
 */
export function computeExploreTotals(
  state: ExploreState,
  totalHoursSaved: number,
): ExploreTotals {
  const allDriverValues = computeAllDriverValues(state, totalHoursSaved);

  const valueByQuadrant: Record<ExploreQuadrant, number> = {
    Capacity: 0,
    Workforce: 0,
    Revenue: 0,
    Quality: 0,
  };
  if (state.careSetting) {
    EXPLORE_DRIVERS.forEach((d) => {
      if (d.settings.includes(state.careSetting!)) {
        valueByQuadrant[d.quadrant] += allDriverValues[d.id] || 0;
      }
    });
  }

  const annualBenefitByQuadrant: Record<ExploreQuadrant, number> = {
    Capacity: 0,
    Workforce: 0,
    Revenue: 0,
    Quality: 0,
  };
  let totalOneTimeValue = 0;
  (state.otherFinancialBenefits ?? []).forEach((b) => {
    if (b.label.trim() && b.amount > 0) {
      if (b.type === "annual") annualBenefitByQuadrant[b.quadrant] += b.amount;
      else totalOneTimeValue += b.amount;
    }
  });

  const driverSum =
    valueByQuadrant.Capacity +
    valueByQuadrant.Workforce +
    valueByQuadrant.Revenue +
    valueByQuadrant.Quality;
  const annualBenefitSum =
    annualBenefitByQuadrant.Capacity +
    annualBenefitByQuadrant.Workforce +
    annualBenefitByQuadrant.Revenue +
    annualBenefitByQuadrant.Quality;

  return {
    valueByQuadrant,
    totalAnnualValue: driverSum + annualBenefitSum,
    totalOneTimeValue,
    efficiencyValue:
      valueByQuadrant.Capacity +
      valueByQuadrant.Workforce +
      annualBenefitByQuadrant.Capacity +
      annualBenefitByQuadrant.Workforce,
    documentationValue:
      valueByQuadrant.Revenue +
      valueByQuadrant.Quality +
      annualBenefitByQuadrant.Revenue +
      annualBenefitByQuadrant.Quality,
  };
}
