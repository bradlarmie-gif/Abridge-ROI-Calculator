import { useState, useMemo } from "react";
import { ArrowRight, BarChart2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  formatCurrency,
  formatNumber,
  getMonthsFromGoLive,
  getActiveMetrics,
  EM_TO_WRVU,
} from "@/lib/measureCalculator";
import { useCountUp } from "@/hooks/useCountUp";

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function fmtRange(low: number, high: number): string {
  if (low === high) return fmt(low);
  return `${fmt(low)} — ${fmt(high)}`;
}

interface Assumptions {
  attribution: number;
  realization: number;
  conversionFactor: number;
  otPremiumRate: number;
  edRevenuePerVisit: number;
  drgBaseRate: number;
  costPerBedDay: number;
  revenuePerVisit: number;
  emUndercaptureRate: number;
  emEligibilityRate: number;
  revenuePerNewAdmission: number;
  censusConstrained: boolean;
}

const EM_ELIGIBILITY_DEFAULTS: Record<string, number> = {
  outpatient: 82,
  ed: 95,
  inpatient: 90,
  nursing: 0,
};

const ATTRIBUTION_PRESETS = [
  {
    id: 'conservative',
    label: 'Conservative',
    value: 50,
    realization: 70,
    description: 'About half the improvement attributed to the tool',
  },
  {
    id: 'standard',
    label: 'Standard',
    value: 62,
    realization: 80,
    description: 'Typical for well-deployed Abridge accounts',
  },
  {
    id: 'favorable',
    label: 'Favorable',
    value: 75,
    realization: 90,
    description: 'High utilization, clean data, strong correlation',
  },
] as const;

type AttributionPresetId = typeof ATTRIBUTION_PRESETS[number]['id'];

const UNQUANTIFIED_OUTCOME_TRIGGERS: {
  id: string;
  metricIds: string[];
  title: string;
  body: string;
}[] = [
  {
    id: 'retention-intent',
    metricIds: ['likelihood_to_stay', 'burnout_assessment', 'work_outside_work_empirical', 'work_after_hours_perceived'],
    title: 'Retention intent is a leading indicator',
    body: "The model captures replacement cost. It doesn't capture the 6-month productivity ramp of a new hire, the institutional knowledge that leaves with them, or the scheduling gaps while a search is open.",
  },
  {
    id: 'provider-presence',
    metricIds: ['time_to_close', 'time_in_note', 'effort_reduction'],
    title: 'Documentation burden and provider presence',
    body: "Minutes recovered from documentation are minutes the provider is present with the patient. That changes diagnostic quality, patient experience, and provider satisfaction in ways that don't appear in any cost model.",
  },
  {
    id: 'clinical-record',
    metricIds: ['note_star_rating', 'diagnosis_capture', 'diagnosis_specificity'],
    title: 'The clinical record as a downstream asset',
    body: "Documentation quality affects every system that touches the record — quality reporting, risk stratification, population health analytics, and continuity of care. The billing impact is one expression of that. The rest doesn't have a line item.",
  },
  {
    id: 'admin-friction',
    metricIds: ['clean_claim_rate', 'initial_denial_rate', 'net_collection_rate'],
    title: 'Administrative friction reduction',
    body: "Fewer denied claims means less staff time on rework, fewer provider abrasions from audit queries, and faster cash conversion. The human cost of a denied claim rarely shows up in a cost model.",
  },
  {
    id: 'access',
    metricIds: ['patients_per_provider_month', 'visits_per_clinician_hour'],
    title: 'Access as a community asset',
    body: "More patients seen per provider isn't just revenue — it's reduced wait times, shorter appointment lead times, and more community members who can actually see their doctor this month.",
  },
  {
    id: 'risk-adjustment',
    metricIds: ['hcc_capture', 'hcc_capture_rate', 'wrvu', 'em_level'],
    title: 'Population health data accuracy',
    body: "Better documentation affects how payers understand your patient population's acuity. Undercaptured conditions mean underfunded care — and a population that looks healthier on paper than it actually is.",
  },
];

const DEFAULT_ASSUMPTIONS: Assumptions = {
  attribution: 62,
  realization: 80,
  conversionFactor: 33,
  otPremiumRate: 75,
  edRevenuePerVisit: 480,
  drgBaseRate: 6800,
  costPerBedDay: 2500,
  revenuePerVisit: 200,
  emUndercaptureRate: 35,
  emEligibilityRate: 80,
  revenuePerNewAdmission: 8000,
  censusConstrained: false,
};

function computeFinancials(state: MeasureState, assumptions: Assumptions) {
  if (!state) {
    return {
      setting: 'outpatient', isED: false, isInpatient: false, providers: 0,
      adoptedEncounters: 0, totalEncounters: 0, utilizationRate: 0,
      activeSettings: ['outpatient'], hasBillingCapture: false,
      billingCaptureLow: 0, billingCaptureHigh: 0, billingDetails: [],
      hasRevenueRecovery: false, revenueRecoveryLow: 0, revenueRecoveryHigh: 0,
      recoveryDetails: [], hasCostReduction: false, costReductionLow: 0,
      costReductionHigh: 0, hasAfterHours: false,
      afterHoursDelta: 0,
      afterHoursAnnual: 0, retentionBenchmarkLabel: 'AMGA physician replacement benchmark',
      effectiveReplacementCost: { low: 250_000, high: 500_000 },
      hasRetentionSignal: false, burnoutDelta: 0,
      likelihoodDelta: 0, retentionLow: 0, retentionHigh: 0,
      hasPhysicianRetentionOverride: false, retentionOverrideProviders: 0,
      retentionOverrideDelta: 0, hasPatientFlow: false, patientFlowLow: 0,
      patientFlowHigh: 0, patientFlowDetails: [], hasCapacityRevenue: false,
      capacityRevenueLow: 0, capacityRevenueHigh: 0,
      hasHccCapture: false, hccCaptureLow: 0, hccCaptureHigh: 0, hccDetails: [],
      hasAgencySavings: false,
      agencySavingsAmount: 0, totalLow: 0, totalHigh: 0, hasAnyFinancial: false,
      attrLow: 0.30, attrHigh: 0.75,
    };
  }
  const activeSettings = state.activeCareSettings?.length > 0
    ? state.activeCareSettings
    : [state.careSetting || 'outpatient'];
  const primarySetting = activeSettings[0];
  const isED = activeSettings.includes('ed');
  const isInpatient = activeSettings.includes('inpatient');
  const setting = primarySetting;
  const dep = state.deployment || {};
  const providers = dep.providers || dep.mruProviders || 0;
  const totalEncounters = dep.totalEncounters || 0;
  const utilizationRate = dep.utilizationRate || 0;
  const adoptedEncounters = Math.round(totalEncounters * (utilizationRate / 100));

  const attrPct = assumptions.attribution / 100;
  const realPct = assumptions.realization / 100;
  const attrLow = Math.max(0.30, attrPct - 0.12);
  const attrHigh = Math.min(0.95, attrPct + 0.12);
  const realLow = Math.max(0.40, realPct - 0.10);
  const realHigh = Math.min(0.99, realPct + 0.10);

  const activeMetrics = getActiveMetrics(state);
  const multiSetting = activeSettings.length > 1;

  const providerSettings = activeSettings.filter(s => s !== 'nursing');
  const providerSettingCount = Math.max(1, providerSettings.length);

  const resolveSettingCounts = (s: string) => {
    const sData = (state.settingData as Record<string, Record<string, number>>)?.[s] || {};
    const splitCount = s === 'nursing' ? 1 : providerSettingCount;
    const sProviders = sData.deploy_providers
      ?? (multiSetting ? Math.round(providers / splitCount) : providers);
    const sEncounters = sData.deploy_totalEncounters
      ?? (multiSetting ? Math.round(totalEncounters / splitCount) : totalEncounters);
    const sAdopted = Math.round(sEncounters * (utilizationRate / 100));
    return { sProviders, sEncounters, sAdopted };
  };

  const settingTotals: Record<string, { providers: number; encounters: number; low: number; high: number }> = {};
  for (const s of activeSettings) {
    const { sProviders, sEncounters } = resolveSettingCounts(s);
    settingTotals[s] = { providers: sProviders, encounters: sEncounters, low: 0, high: 0 };
  }

  const afterHoursMetric = activeMetrics.find(m =>
    ['work_after_hours_perceived', 'workAfterHours', 'work_outside_work_empirical', 'afterHours', 'chartingAfterShift', 'afterHoursWork', 'workOutsideHours', 'wowTime'].includes(m.metricId)
  );
  const afterHoursWithout = afterHoursMetric?.before ?? state.timeEfficiency?.workOutsideWithout ?? 0;
  const afterHoursWith = afterHoursMetric?.after ?? state.timeEfficiency?.workOutsideWith ?? 0;

  let billingCaptureLow = 0;
  let billingCaptureHigh = 0;
  const billingDetails: { label: string; detail: string; formula: string }[] = [];

  const emEligibilityPct = assumptions.emEligibilityRate / 100;

  for (const s of activeSettings) {
    const sSettingData = state.settingData?.[s] || {};
    const { sProviders: _sP, sEncounters: _sE, sAdopted: sAdoptedEncounters } = resolveSettingCounts(s);
    const effectiveAdopted = sAdoptedEncounters > 0 ? sAdoptedEncounters : adoptedEncounters;
    const emEligibleEncounters = Math.round(effectiveAdopted * emEligibilityPct);

    if (s === 'nursing') {
      continue;
    }

    const wrvuMetric = activeMetrics.find(m =>
      ['wrvu', 'wrvuPerEncounter'].includes(m.metricId) && (!m.setting || m.setting === s)
    );
    const wrvuB = wrvuMetric?.before ?? (s === primarySetting ? (state.documentationQuality?.wrvuWithout ?? 0) : 0);
    const wrvuA = wrvuMetric?.after ?? (s === primarySetting ? (state.documentationQuality?.wrvuWith ?? 0) : 0);
    const measuredWrvuD = wrvuA - wrvuB;

    const emMetric = activeMetrics.find(m =>
      ['em_level', 'emLevel'].includes(m.metricId) && (!m.setting || m.setting === s)
    );
    const emB = emMetric?.before ?? (s === primarySetting ? (state.documentationQuality?.emLevelWithout ?? 0) : 0);
    const emA = emMetric?.after ?? (s === primarySetting ? (state.documentationQuality?.emLevelWith ?? 0) : 0);
    const impliedWrvuDelta = (EM_TO_WRVU[Math.round(emA)] ?? 0) - (EM_TO_WRVU[Math.round(emB)] ?? 0);

    const wrvuD = measuredWrvuD > 0 ? measuredWrvuD : Math.max(0, impliedWrvuDelta);
    const wrvuSource = measuredWrvuD > 0 ? 'measured' : (impliedWrvuDelta > 0 ? 'implied from E/M levels' : null);

    if (wrvuD > 0 && emEligibleEncounters > 0) {
      const base = wrvuD * emEligibleEncounters * assumptions.conversionFactor;
      const lo = base * attrLow * realLow;
      const hi = base * attrHigh * realHigh;
      billingCaptureLow += lo;
      billingCaptureHigh += hi;
      if (settingTotals[s]) { settingTotals[s].low += lo; settingTotals[s].high += hi; }
      const sourceNote = wrvuSource === 'implied from E/M levels'
        ? ` (implied from E/M ${emB.toFixed(0)}→${emA.toFixed(0)})`
        : '';
      billingDetails.push({
        label: `wRVU lift: +${wrvuD.toFixed(2)} per encounter${sourceNote}${multiSetting ? ` (${s === 'ed' ? 'ED' : s.charAt(0).toUpperCase() + s.slice(1)})` : ''}`,
        detail: `${formatNumber(emEligibleEncounters)} E/M-billable encounters/yr — ${assumptions.emEligibilityRate}% haircut applied (${formatNumber(effectiveAdopted)} adopted total)`,
        formula: `+${wrvuD.toFixed(2)} wRVU × ${formatNumber(emEligibleEncounters)} E/M encounters × $${assumptions.conversionFactor} = ${fmt(base)} base → × ${Math.round(assumptions.realization)}% realization × ${Math.round(attrLow * 100)}–${Math.round(attrHigh * 100)}% attribution = ${fmt(lo)}–${fmt(hi)}`,
      });
    }

    if (s === 'inpatient') {
      const cmiMetric = activeMetrics.find(m => ['cmi', 'cmiScore', 'caseMixIndex'].includes(m.metricId));
      const cmiB = cmiMetric?.before ?? (sSettingData.cmi_before ?? 0);
      const cmiA = cmiMetric?.after ?? (sSettingData.cmi_after ?? 0);
      const cmiD = Math.max(0, cmiA - cmiB);
      if (cmiD > 0) {
        const discharges = sSettingData.deploy_totalEncounters || _sE;
        const base = cmiD * discharges * assumptions.drgBaseRate;
        const lo = base * attrLow * realLow;
        const hi = base * attrHigh * realHigh;
        billingCaptureLow += lo;
        billingCaptureHigh += hi;
        if (settingTotals[s]) { settingTotals[s].low += lo; settingTotals[s].high += hi; }
        billingDetails.push({
          label: `CMI improvement: +${cmiD.toFixed(3)}${multiSetting ? ' (Inpatient)' : ''}`,
          detail: `${formatNumber(discharges)} annual discharges × $${formatNumber(assumptions.drgBaseRate)} DRG base rate`,
          formula: `+${cmiD.toFixed(3)} CMI × ${formatNumber(discharges)} × $${formatNumber(assumptions.drgBaseRate)} = ${fmt(base)}`,
        });
      }
    }
  }

  const hasBillingCapture = billingCaptureLow > 0;

  let revenueRecoveryLow = 0;
  let revenueRecoveryHigh = 0;
  const recoveryDetails: { label: string; detail: string }[] = [];

  if (activeSettings.includes('ed')) {
    const edSettingData = state.settingData?.ed || {};
    const edTotalEncounters = edSettingData.deploy_totalEncounters || resolveSettingCounts('ed').sEncounters;

    const lwbsMetric = activeMetrics.find(m => m.metricId === 'lwbsRate');
    const lwbsB = lwbsMetric?.before ?? (edSettingData.lwbsRate_before ?? 0);
    const lwbsA = lwbsMetric?.after ?? (edSettingData.lwbsRate_after ?? 0);
    const lwbsD = lwbsB - lwbsA;

    if (lwbsD > 0 && edTotalEncounters > 0) {
      const annualVisits = edTotalEncounters * 12;
      const recovered = (lwbsD / 100) * annualVisits;
      const lo = recovered * assumptions.edRevenuePerVisit * attrLow;
      const hi = recovered * assumptions.edRevenuePerVisit * attrHigh;
      revenueRecoveryLow += lo;
      revenueRecoveryHigh += hi;
      if (settingTotals.ed) { settingTotals.ed.low += lo; settingTotals.ed.high += hi; }
      recoveryDetails.push({
        label: `LWBS reduction: ${lwbsB.toFixed(1)}% → ${lwbsA.toFixed(1)}% (−${lwbsD.toFixed(1)} pts)`,
        detail: `Monthly ED visits: ${formatNumber(edTotalEncounters)} · Revenue per visit: $${assumptions.edRevenuePerVisit}`,
      });
    }
  }

  for (const s of activeSettings) {
    const sData = state.settingData?.[s] || {};
    const { sEncounters: resolvedEncounters } = resolveSettingCounts(s);
    const effectiveEncounters = sData.deploy_totalEncounters || resolvedEncounters;

    const denialMetric = activeMetrics.find(m =>
      ['initialDenialRate', 'initial_denial_rate', 'medicalNecessityDenialRate', 'denialRate', 'claimDenialRate'].includes(m.metricId)
      && (!m.setting || m.setting === s)
    );
    const denialB = denialMetric?.before ??
      (sData.initial_denial_rate_before ?? sData.medicalNecessityDenialRate_before ?? sData.denialRate_before ?? 0);
    const denialA = denialMetric?.after ??
      (sData.initial_denial_rate_after ?? sData.medicalNecessityDenialRate_after ?? sData.denialRate_after ?? 0);
    const denialDelta = denialB - denialA;

    if (denialDelta > 0 && effectiveEncounters > 0) {
      const avgDenialCost = s === 'inpatient' ? 3_500 : s === 'ed' ? 500 : 350;
      const base = (denialDelta / 100) * effectiveEncounters * avgDenialCost;
      const lo = base * attrLow;
      const hi = base * attrHigh;
      revenueRecoveryLow += lo;
      revenueRecoveryHigh += hi;
      if (settingTotals[s]) { settingTotals[s].low += lo; settingTotals[s].high += hi; }
      recoveryDetails.push({
        label: `Denial rate reduction: −${denialDelta.toFixed(1)} pts${activeSettings.length > 1 ? ` (${s === 'ed' ? 'ED' : s.charAt(0).toUpperCase() + s.slice(1)})` : ''}`,
        detail: `${formatNumber(effectiveEncounters)} encounters · avg denial cost: $${avgDenialCost.toLocaleString()}/case`,
      });
    }
  }

  for (const s of activeSettings) {
    const sData2 = state.settingData?.[s] || {};
    const { sEncounters: resolvedEnc2 } = resolveSettingCounts(s);
    const effectiveEnc2 = sData2.deploy_totalEncounters || resolvedEnc2;

    const netCollMetric = activeMetrics.find(m =>
      ['netCollectionRate', 'net_collection_rate'].includes(m.metricId) && (!m.setting || m.setting === s)
    );
    const netCollB = netCollMetric?.before ?? (sData2.netCollectionRate_before ?? 0);
    const netCollA = netCollMetric?.after ?? (sData2.netCollectionRate_after ?? 0);
    const netCollDelta = Math.max(0, netCollA - netCollB);

    if (netCollDelta > 0 && effectiveEnc2 > 0) {
      const annualBillableRevenue = effectiveEnc2 * assumptions.revenuePerVisit;
      const base = (netCollDelta / 100) * annualBillableRevenue;
      const lo = base * attrLow;
      const hi = base * attrHigh;
      revenueRecoveryLow += lo;
      revenueRecoveryHigh += hi;
      if (settingTotals[s]) { settingTotals[s].low += lo; settingTotals[s].high += hi; }
      recoveryDetails.push({
        label: `Net collection rate improvement: +${netCollDelta.toFixed(1)} pts${activeSettings.length > 1 ? ` (${s === 'ed' ? 'ED' : s.charAt(0).toUpperCase() + s.slice(1)})` : ''}`,
        detail: `${formatNumber(effectiveEnc2)} encounters × $${assumptions.revenuePerVisit}/visit billable revenue`,
      });
    }
  }

  const hasRevenueRecovery = revenueRecoveryLow > 0;

  let hccCaptureLow = 0;
  let hccCaptureHigh = 0;
  let hasHccCapture = false;
  const hccDetails: { label: string; detail: string }[] = [];

  for (const s of activeSettings) {
    if (s === 'nursing') continue;
    const sData3 = state.settingData?.[s] || {};
    const hccMetric = activeMetrics.find(m =>
      ['hccCaptureRate', 'hcc_capture_rate'].includes(m.metricId) && (!m.setting || m.setting === s)
    );
    const hccB = hccMetric?.before ?? (sData3.hccCaptureRate_before ?? 0);
    const hccA = hccMetric?.after ?? (sData3.hccCaptureRate_after ?? 0);
    const hccDelta = Math.max(0, hccA - hccB);
    const maEncounterPct = state.maEncounterPct ?? 0;
    const { sAdopted: sAdopted3 } = resolveSettingCounts(s);
    const effectiveAdopted3 = sAdopted3 > 0 ? sAdopted3 : adoptedEncounters;
    const maEncounters = Math.round(effectiveAdopted3 * (maEncounterPct / 100));
    const avgHccPointValue = 1200;

    if (hccDelta > 0 && maEncounters > 0) {
      hasHccCapture = true;
      const base = (hccDelta / 100) * maEncounters * avgHccPointValue;
      const lo = Math.round(base * attrLow * realLow);
      const hi = Math.round(base * attrHigh * realHigh);
      hccCaptureLow += lo;
      hccCaptureHigh += hi;
      if (settingTotals[s]) { settingTotals[s].low += lo; settingTotals[s].high += hi; }
      hccDetails.push({
        label: `HCC capture rate: +${hccDelta.toFixed(1)} pts${activeSettings.length > 1 ? ` (${s === 'ed' ? 'ED' : s.charAt(0).toUpperCase() + s.slice(1)})` : ''}`,
        detail: `${formatNumber(maEncounters)} MA encounters (${maEncounterPct}% of adopted) · $${formatNumber(avgHccPointValue)}/HCC point`,
      });
    }
  }

  let patientFlowLow = 0;
  let patientFlowHigh = 0;
  const patientFlowDetails: { label: string; detail: string; formula: string }[] = [];

  if (activeSettings.includes('inpatient')) {
    const alosMetric = activeMetrics.find(m =>
      ['lengthOfStay', 'alos', 'averageLengthOfStay'].includes(m.metricId)
    );
    const ipData = state.settingData?.inpatient || {};
    const alosBefore = alosMetric?.before ?? (ipData.lengthOfStay_before ?? 0);
    const alosAfter = alosMetric?.after ?? (ipData.lengthOfStay_after ?? 0);
    const alosDelta = Math.max(0, alosBefore - alosAfter);

    const ipEncounters = ipData.deploy_totalEncounters || resolveSettingCounts('inpatient').sEncounters;

    if (alosDelta > 0 && ipEncounters > 0) {
      const costBase = alosDelta * ipEncounters * assumptions.costPerBedDay;
      const costLo = costBase * attrLow;
      const costHi = costBase * attrHigh;
      patientFlowLow += costLo;
      patientFlowHigh += costHi;
      if (settingTotals.inpatient) { settingTotals.inpatient.low += costLo; settingTotals.inpatient.high += costHi; }
      patientFlowDetails.push({
        label: `ALOS cost avoidance: ${alosBefore.toFixed(1)} → ${alosAfter.toFixed(1)} days (−${alosDelta.toFixed(1)} days/admission)`,
        detail: `${formatNumber(ipEncounters)} annual admissions · cost per bed day: $${assumptions.costPerBedDay.toLocaleString()}`,
        formula: `${alosDelta.toFixed(1)} days × ${formatNumber(ipEncounters)} admissions × $${assumptions.costPerBedDay.toLocaleString()} = ${fmt(costBase)}`,
      });

      if (assumptions.censusConstrained) {
        const revBase = alosDelta * ipEncounters * assumptions.revenuePerNewAdmission * 0.3;
        const revLo = revBase * attrLow;
        const revHi = revBase * attrHigh;
        patientFlowLow += revLo;
        patientFlowHigh += revHi;
        if (settingTotals.inpatient) { settingTotals.inpatient.low += revLo; settingTotals.inpatient.high += revHi; }
        patientFlowDetails.push({
          label: `ALOS throughput revenue: freed beds → new admissions (census-constrained)`,
          detail: `30% bed refill rate × $${assumptions.revenuePerNewAdmission.toLocaleString()} per new admission`,
          formula: `${alosDelta.toFixed(1)} days × ${formatNumber(ipEncounters)} × $${assumptions.revenuePerNewAdmission.toLocaleString()} × 30% refill = ${fmt(revBase)}`,
        });
      }
    }

    const readmitMetric = activeMetrics.find(m =>
      ['readmissionRate', 'readmission_rate', '30dayReadmission'].includes(m.metricId)
    );
    const readmitB = readmitMetric?.before ?? (ipData.readmissionRate_before ?? 0);
    const readmitA = readmitMetric?.after ?? (ipData.readmissionRate_after ?? 0);
    const readmitDelta = Math.max(0, readmitB - readmitA);
    const avgReadmissionCost = 15_000;

    if (readmitDelta > 0 && ipEncounters > 0) {
      const base = (readmitDelta / 100) * ipEncounters * avgReadmissionCost;
      const rLo = base * attrLow;
      const rHi = base * attrHigh;
      patientFlowLow += rLo;
      patientFlowHigh += rHi;
      if (settingTotals.inpatient) { settingTotals.inpatient.low += rLo; settingTotals.inpatient.high += rHi; }
      patientFlowDetails.push({
        label: `Readmission reduction: −${readmitDelta.toFixed(1)} pts`,
        detail: `${formatNumber(ipEncounters)} annual discharges · CMS HRRP benchmark: $${formatNumber(avgReadmissionCost)}/readmission`,
        formula: `${readmitDelta.toFixed(1)}% × ${formatNumber(ipEncounters)} discharges × $${formatNumber(avgReadmissionCost)} = ${fmt(base)}`,
      });
    }
  }

  const hasPatientFlow = patientFlowLow > 0;

  let capacityRevenueLow = 0;
  let capacityRevenueHigh = 0;
  let hasCapacityRevenue = false;

  if (activeSettings.includes('outpatient')) {
    const patientsMetric = activeMetrics.find(m =>
      ['patients_per_provider_month', 'patientsPerProviderMonth'].includes(m.metricId)
    );
    if (patientsMetric && patientsMetric.before != null && patientsMetric.after != null) {
      const patientDelta = patientsMetric.after - patientsMetric.before;
      const opProviders = resolveSettingCounts('outpatient').sProviders;
      if (patientDelta > 0 && opProviders > 0) {
        hasCapacityRevenue = true;
        const annualAdditionalVisits = patientDelta * opProviders * 12;
        const base = annualAdditionalVisits * assumptions.revenuePerVisit;
        capacityRevenueLow = base * attrLow * realLow;
        capacityRevenueHigh = base * attrHigh * realHigh;
        if (settingTotals.outpatient) { settingTotals.outpatient.low += capacityRevenueLow; settingTotals.outpatient.high += capacityRevenueHigh; }
      }
    }
  }

  let costReductionLow = 0;
  let costReductionHigh = 0;

  const afterHoursDelta = Math.max(0, afterHoursWithout - afterHoursWith);
  const isHourlyWorkforce = activeSettings.includes('nursing');

  const hasAfterHours = afterHoursDelta > 0;
  const afterHoursAnnual = 0;

  let hasRetentionSignal = false;
  let burnoutDelta = 0;
  let likelihoodDelta = 0;
  let retentionLow = 0;
  let retentionHigh = 0;

  const mv = state.metricValues || {};
  const burnoutKeys = Object.keys(mv).filter(k => k.startsWith('burnout'));
  const likelihoodKeys = Object.keys(mv).filter(k => k.startsWith('likelihood'));

  for (const k of burnoutKeys) {
    const e = mv[k];
    if (e && e.before != null && e.after != null && e.before > e.after) {
      burnoutDelta = Math.max(burnoutDelta, e.before - e.after);
    }
  }
  for (const k of likelihoodKeys) {
    const e = mv[k];
    if (e && e.before != null && e.after != null && e.after > e.before) {
      likelihoodDelta = Math.max(likelihoodDelta, e.after - e.before);
    }
  }

  if (state.customMetrics && state.customMetrics.length > 0) {
    for (const cm of state.customMetrics) {
      if (cm.section === 'workforce' && cm.before > 0 && cm.after > 0) {
        if (cm.label.toLowerCase().includes('burnout') && cm.before > cm.after) {
          burnoutDelta = Math.max(burnoutDelta, cm.before - cm.after);
        }
        if (cm.label.toLowerCase().includes('stay') && cm.after > cm.before) {
          likelihoodDelta = Math.max(likelihoodDelta, cm.after - cm.before);
        }
      }
    }
  }

  const replacementCostRange: Record<string, { low: number; high: number }> = {
    outpatient: { low: 300_000, high: 500_000 },
    ed:         { low: 350_000, high: 500_000 },
    inpatient:  { low: 300_000, high: 500_000 },
    nursing:    { low: 50_000,  high: 100_000 },
  };
  const effectiveReplacementCost = replacementCostRange[primarySetting] ?? { low: 250_000, high: 500_000 };
  const isNursingSetting = activeSettings.includes('nursing') && !activeSettings.some(s => ['outpatient', 'ed', 'inpatient'].includes(s));
  const retentionBenchmarkLabel = isNursingSetting ? 'NSI Nursing Solutions turnover cost benchmark' : 'AMGA physician replacement benchmark';

  if (burnoutDelta > 0 || likelihoodDelta > 0) {
    hasRetentionSignal = true;
    retentionLow = 1 * effectiveReplacementCost.low * attrLow;
    retentionHigh = 3 * effectiveReplacementCost.high * attrHigh;
    costReductionLow += retentionLow;
    costReductionHigh += retentionHigh;
  }

  let hasPhysicianRetentionOverride = false;
  let retentionOverrideProviders = 0;
  let retentionOverrideDelta = 0;

  const physicianRetentionMetric = activeMetrics.find(m =>
    ['physicianRetention', 'physician_retention'].includes(m.metricId)
  );

  if (physicianRetentionMetric && physicianRetentionMetric.before != null && physicianRetentionMetric.after != null) {
    const retentionDelta = physicianRetentionMetric.after - physicianRetentionMetric.before;
    if (retentionDelta > 0 && providers > 0) {
      hasRetentionSignal = true;
      const turnoversAvoided = (retentionDelta / 100) * providers;
      const newRetentionLow = turnoversAvoided * effectiveReplacementCost.low * attrLow;
      const newRetentionHigh = turnoversAvoided * effectiveReplacementCost.high * attrHigh;
      if (newRetentionLow > retentionLow) {
        hasPhysicianRetentionOverride = true;
        retentionOverrideProviders = providers;
        retentionOverrideDelta = retentionDelta;
        costReductionLow = costReductionLow - retentionLow + newRetentionLow;
        costReductionHigh = costReductionHigh - retentionHigh + newRetentionHigh;
        retentionLow = newRetentionLow;
        retentionHigh = newRetentionHigh;
      }
    }
  }

  const agencyMetric = activeMetrics.find(m =>
    ['agencyLocumSpend', 'agency_locum_spend'].includes(m.metricId)
  );
  let hasAgencySavings = false;
  let agencySavingsAmount = 0;
  if (agencyMetric && agencyMetric.before != null && agencyMetric.after != null) {
    const agencySavings = Math.max(0, agencyMetric.before - agencyMetric.after);
    if (agencySavings > 0) {
      hasAgencySavings = true;
      agencySavingsAmount = agencySavings;
      costReductionLow += agencySavings * attrLow;
      costReductionHigh += agencySavings * attrHigh;
    }
  }

  const hasCostReduction = hasAfterHours || hasRetentionSignal || hasAgencySavings;

  const totalLow = billingCaptureLow + revenueRecoveryLow + hccCaptureLow + patientFlowLow + capacityRevenueLow + costReductionLow;
  const totalHigh = billingCaptureHigh + revenueRecoveryHigh + hccCaptureHigh + patientFlowHigh + capacityRevenueHigh + costReductionHigh;
  const hasAnyFinancial = totalLow > 0;

  const settingBreakdown = activeSettings.map(s => {
    const st = settingTotals[s] || { providers: 0, encounters: 0, low: 0, high: 0 };
    return {
      setting: s,
      label: s === 'ed' ? 'Emergency Dept' : s === 'inpatient' ? 'Inpatient' : s === 'nursing' ? 'Nursing' : 'Outpatient',
      providers: st.providers,
      encounters: st.encounters,
      totalLow: st.low,
      totalHigh: st.high,
    };
  });

  return {
    setting,
    isED,
    isInpatient,
    providers,
    adoptedEncounters,
    totalEncounters,
    utilizationRate,
    activeSettings,
    settingBreakdown,
    hasBillingCapture,
    billingCaptureLow,
    billingCaptureHigh,
    billingDetails,
    hasRevenueRecovery,
    revenueRecoveryLow,
    revenueRecoveryHigh,
    recoveryDetails,
    hasCostReduction,
    costReductionLow,
    costReductionHigh,
    hasAfterHours,
    afterHoursDelta,
    afterHoursAnnual,
    retentionBenchmarkLabel,
    effectiveReplacementCost,
    hasRetentionSignal,
    burnoutDelta,
    likelihoodDelta,
    retentionLow,
    retentionHigh,
    hasPhysicianRetentionOverride,
    retentionOverrideProviders,
    retentionOverrideDelta,
    hasPatientFlow,
    patientFlowLow,
    patientFlowHigh,
    patientFlowDetails,
    hasCapacityRevenue,
    capacityRevenueLow,
    capacityRevenueHigh,
    hasHccCapture,
    hccCaptureLow,
    hccCaptureHigh,
    hccDetails,
    hasAgencySavings,
    agencySavingsAmount,
    totalLow,
    totalHigh,
    hasAnyFinancial,
    attrLow,
    attrHigh,
  };
}

interface MeasureAllocateProps {
  state: MeasureState;
  updateState?: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureAllocate({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: MeasureAllocateProps) {
  const primaryCareSetting = (state?.activeCareSettings?.length > 0 ? state.activeCareSettings[0] : state?.careSetting) || 'outpatient';
  const [assumptions, setAssumptions] = useState<Assumptions>({
    ...DEFAULT_ASSUMPTIONS,
    conversionFactor: state?.calibration?.conversionFactor || 33,
    otPremiumRate: state?.calibration?.otHourlyRate || 75,
    emEligibilityRate: EM_ELIGIBILITY_DEFAULTS[primaryCareSetting] ?? 80,
    censusConstrained: state?.censusConstrained ?? false,
  });
  const [sensitivityOpen, setSensitivityOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [streamStates, setStreamStates] = useState<Record<string, boolean>>(() => ({
    billingCapture: true,
    revenueRecovery: true,
    hccCapture: true,
    patientFlow: true,
    capacityRevenue: true,
    costReduction: true,
    afterHours: true,
    physicianRetention: false,
    ...state?.streamStates,
  }));

  const [selectedPreset, setSelectedPreset] = useState<AttributionPresetId>('standard');

  const selectPreset = (presetId: AttributionPresetId) => {
    const preset = ATTRIBUTION_PRESETS.find(p => p.id === presetId)!;
    setSelectedPreset(presetId);
    setAssumptions(prev => ({ ...prev, attribution: preset.value, realization: preset.realization }));
  };

  const toggleStream = (id: string) => {
    setStreamStates(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (updateState) updateState({ streamStates: next });
      return next;
    });
  };

  const fin = useMemo(() => computeFinancials(state, assumptions), [state, assumptions]);
  const months = getMonthsFromGoLive(state?.goLiveDate ?? null, state?.deployment?.monthsOnAbridge ?? 0);
  const orgName = state?.deployment?.organizationName || "Your Organization";
  const activeSettingsList = fin.activeSettings || [fin.setting];
  const settingLabel = activeSettingsList.map((s: string) =>
    s === 'ed' ? 'ED' : s === 'inpatient' ? 'Inpatient' : s === 'nursing' ? 'Nursing' : 'Outpatient'
  ).join(' · ');

  const toggledTotal = useMemo(() => {
    let low = 0;
    let high = 0;
    let enabledCount = 0;
    let totalCount = 0;

    const streams = [
      { id: 'billingCapture', has: fin.hasBillingCapture, low: fin.billingCaptureLow, high: fin.billingCaptureHigh },
      { id: 'revenueRecovery', has: fin.hasRevenueRecovery, low: fin.revenueRecoveryLow, high: fin.revenueRecoveryHigh },
      { id: 'hccCapture', has: fin.hasHccCapture, low: fin.hccCaptureLow, high: fin.hccCaptureHigh },
      { id: 'patientFlow', has: fin.hasPatientFlow, low: fin.patientFlowLow, high: fin.patientFlowHigh },
      { id: 'capacityRevenue', has: fin.hasCapacityRevenue, low: fin.capacityRevenueLow, high: fin.capacityRevenueHigh },
      { id: 'costReduction', has: fin.hasCostReduction, low: fin.costReductionLow, high: fin.costReductionHigh },
    ];

    for (const s of streams) {
      if (s.has) {
        totalCount++;
        if (streamStates[s.id] !== false) {
          enabledCount++;
          low += s.low;
          high += s.high;
        }
      }
    }
    return { low, high, enabledCount, totalCount };
  }, [fin, streamStates]);

  const heroLow = useCountUp(Math.round(toggledTotal.low), 1200, 300);
  const heroHigh = useCountUp(Math.round(toggledTotal.high), 1200, 500);

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateAssumption = (key: keyof Assumptions, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  const unquantifiedItems = useMemo(() => {
    const activeMids = new Set(getActiveMetrics(state).map(m => m.metricId));

    const triggered = UNQUANTIFIED_OUTCOME_TRIGGERS.filter(t =>
      t.metricIds.some(id => activeMids.has(id))
    );

    const recruitment = {
      id: 'recruitment',
      title: 'Recruitment differentiation',
      body: "Candidates increasingly ask about ambient documentation during interviews. An Abridge deployment changes the talent conversation before a contract is signed — and that doesn't appear in any cost model.",
    };

    const all = [...triggered, recruitment];
    return all.slice(0, 4);
  }, [state]);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader
        pathType="measure"
        currentStep={4}
        totalSteps={5}
        stepName="Financial Impact"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2"
        >
          <p className="text-xs text-[#999999] uppercase tracking-widest font-medium">
            {orgName} · {settingLabel} · {months} month{months !== 1 ? 's' : ''} with Abridge
          </p>
        </motion.div>

        <motion.h1
          className="text-2xl md:text-3xl font-bold text-[#1A1A1A] font-abridge uppercase tracking-tight mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          data-testid="text-page-title"
        >
          What Could This Mean Financially
        </motion.h1>

        {fin.hasAnyFinancial ? (
          <motion.div
            className="bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-8 text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            data-testid="section-hero-value"
          >
            <p className="text-4xl md:text-5xl font-bold text-[#1A1A1A] font-abridge mb-2" data-testid="text-hero-value">
              {fmt(heroLow)} <span className="font-normal text-[#999999] text-2xl md:text-3xl">—</span> {fmt(heroHigh)}
            </p>
            <p className="text-sm text-[#666666] mb-1">modeled annual value range</p>
            <p className="text-xs text-[#999999]">
              {formatNumber(fin.providers)} providers · {ATTRIBUTION_PRESETS.find(p => p.id === selectedPreset)?.label ?? 'Standard'} attribution
            </p>
            <p className="text-xs text-[#888888] mt-2">
              Based on {toggledTotal.enabledCount} of {toggledTotal.totalCount} value streams.
              Toggle streams below to include or exclude.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-12 text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            data-testid="section-empty-prompt"
          >
            <BarChart2 className="w-10 h-10 text-[#999999] mx-auto mb-4" />
            <p className="text-[#999999] text-sm leading-relaxed max-w-md mx-auto">
              Add wRVU, E/M, CMI, LWBS, or after-hours data on the previous page to see estimated financial impact.
            </p>
          </motion.div>
        )}

        <div className="flex gap-3 mb-8" data-testid="attribution-presets">
          {ATTRIBUTION_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectPreset(preset.id)}
              data-testid={`preset-${preset.id}`}
              className={`flex-1 rounded-xl border px-4 py-3 text-left transition-all ${
                selectedPreset === preset.id
                  ? 'border-[#1A1A1A] bg-white shadow-sm'
                  : 'border-[#E5E5E5] bg-[#FAFAFA] hover:border-[#CCCCCC]'
              }`}
            >
              <p className={`text-sm font-semibold mb-0.5 ${selectedPreset === preset.id ? 'text-[#1A1A1A]' : 'text-[#666666]'}`}>
                {preset.label}
              </p>
              <p className="text-[11px] text-[#999999] leading-snug">{preset.description}</p>
            </button>
          ))}
        </div>

        {fin.activeSettings.length > 1 && fin.settingBreakdown && (
          <div className="mt-6 mb-8 rounded-xl border border-[#E5E5E5] overflow-hidden" data-testid="table-setting-breakdown">
            <p className="text-[10px] text-[#AAAAAA] px-3 pt-2">
              All value streams included (toggle streams below to adjust)
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F0EB]">
                  <th className="text-left p-3 text-[11px] font-semibold text-[#666666] uppercase tracking-wide">Setting</th>
                  <th className="text-right p-3 text-[11px] font-semibold text-[#666666] uppercase tracking-wide">Providers</th>
                  <th className="text-right p-3 text-[11px] font-semibold text-[#666666] uppercase tracking-wide">Encounters</th>
                  <th className="text-right p-3 text-[11px] font-semibold text-[#666666] uppercase tracking-wide">Value Range</th>
                </tr>
              </thead>
              <tbody>
                {fin.settingBreakdown.map(row => (
                  <tr key={row.setting} className="border-t border-[#E5E5E5]">
                    <td className="p-3 font-medium text-black">{row.label}</td>
                    <td className="p-3 text-right text-[#525252]">{row.providers.toLocaleString()}</td>
                    <td className="p-3 text-right text-[#525252]">{row.encounters.toLocaleString()}</td>
                    <td className="p-3 text-right font-semibold text-black">
                      {fmt(row.totalLow)}–{fmt(row.totalHigh)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[#1A1A1A] bg-[#F5F0EB]">
                  <td className="p-3 font-bold text-black" colSpan={3}>Total</td>
                  <td className="p-3 text-right font-bold text-black">
                    {fmt(fin.totalLow)}–{fmt(fin.totalHigh)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="space-y-4 mb-8">
          {fin.hasBillingCapture && (
            <motion.div
              className={`bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6 ${streamStates.billingCapture === false ? 'opacity-50' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              data-testid="row-billing-capture"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStream('billingCapture')}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${streamStates.billingCapture !== false ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'}`}
                    aria-label={streamStates.billingCapture !== false ? 'Exclude from total' : 'Include in total'}
                    data-testid="toggle-billing-capture"
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${streamStates.billingCapture !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${streamStates.billingCapture !== false ? 'text-[#666666]' : 'text-[#AAAAAA] line-through'}`}>Billing Capture</h3>
                </div>
                {streamStates.billingCapture !== false && (
                  <span className="text-sm font-bold text-black">{fmtRange(Math.round(fin.billingCaptureLow), Math.round(fin.billingCaptureHigh))}</span>
                )}
              </div>

              {fin.billingDetails.map((d, i) => (
                <div key={i} className="mb-3">
                  <p className="text-sm font-medium text-[#1A1A1A]">{d.label}</p>
                  <p className="text-xs text-[#999999]">{d.detail}</p>
                  {d.label.includes('wRVU') && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#999999]">Conversion factor:</span>
                      <span className="text-xs font-medium text-[#1A1A1A]">${assumptions.conversionFactor}/wRVU</span>
                      <span className="text-xs text-[#999999]">·</span>
                      <span className="text-xs text-[#999999]">Realization:</span>
                      <span className="text-xs font-medium text-[#1A1A1A]">{assumptions.realization}%</span>
                    </div>
                  )}
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                <p className="text-sm text-[#666666]">Estimated impact:</p>
                <p className="text-xl font-bold text-[#EA2C00]" data-testid="text-billing-value">
                  {fmtRange(Math.round(fin.billingCaptureLow), Math.round(fin.billingCaptureHigh))} / year
                </p>
              </div>

              <button
                className="mt-3 text-xs text-[#999999] hover:text-[#666666] flex items-center gap-1 transition-colors"
                onClick={() => toggleRow('billing')}
                data-testid="button-billing-expand"
              >
                How we calculated this
                <ChevronDown className={`w-3 h-3 transition-transform ${expandedRows.has('billing') ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {expandedRows.has('billing') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-3 bg-[#FAFAFA] rounded-lg border border-[#E5E5E5]">
                      {fin.billingDetails.map((d, i) => (
                        <p key={i} className="text-xs text-[#666666] font-mono leading-relaxed">{d.formula}</p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {fin.hasRevenueRecovery && (
            <motion.div
              className={`bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6 ${streamStates.revenueRecovery === false ? 'opacity-50' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              data-testid="row-revenue-recovery"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStream('revenueRecovery')}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${streamStates.revenueRecovery !== false ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'}`}
                    aria-label={streamStates.revenueRecovery !== false ? 'Exclude from total' : 'Include in total'}
                    data-testid="toggle-revenue-recovery"
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${streamStates.revenueRecovery !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${streamStates.revenueRecovery !== false ? 'text-[#666666]' : 'text-[#AAAAAA] line-through'}`}>Revenue Recovery</h3>
                </div>
                {streamStates.revenueRecovery !== false && (
                  <span className="text-sm font-bold text-black">{fmtRange(Math.round(fin.revenueRecoveryLow), Math.round(fin.revenueRecoveryHigh))}</span>
                )}
              </div>

              {fin.recoveryDetails.map((d, i) => (
                <div key={i} className="mb-3">
                  <p className="text-sm font-medium text-[#1A1A1A]">{d.label}</p>
                  <p className="text-xs text-[#999999]">{d.detail}</p>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                <p className="text-sm text-[#666666]">Estimated impact:</p>
                <p className="text-xl font-bold text-[#EA2C00]" data-testid="text-recovery-value">
                  {fmtRange(Math.round(fin.revenueRecoveryLow), Math.round(fin.revenueRecoveryHigh))} / year
                </p>
              </div>
            </motion.div>
          )}

          {fin.hasHccCapture && (
            <motion.div
              className={`bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6 ${streamStates.hccCapture === false ? 'opacity-50' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.21 }}
              data-testid="row-hcc-capture"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStream('hccCapture')}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${streamStates.hccCapture !== false ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'}`}
                    aria-label={streamStates.hccCapture !== false ? 'Exclude from total' : 'Include in total'}
                    data-testid="toggle-hcc-capture"
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${streamStates.hccCapture !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${streamStates.hccCapture !== false ? 'text-[#666666]' : 'text-[#AAAAAA] line-through'}`}>HCC Capture</h3>
                </div>
                {streamStates.hccCapture !== false && (
                  <span className="text-sm font-bold text-black">{fmtRange(Math.round(fin.hccCaptureLow), Math.round(fin.hccCaptureHigh))}</span>
                )}
              </div>
              {fin.hccDetails.map((d: { label: string; detail: string }, i: number) => (
                <div key={i} className="mb-3">
                  <p className="text-sm font-medium text-[#1A1A1A]">{d.label}</p>
                  <p className="text-xs text-[#999999]">{d.detail}</p>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                <p className="text-sm text-[#666666]">Estimated impact:</p>
                <p className="text-xl font-bold text-[#EA2C00]" data-testid="text-hcc-value">
                  {fmtRange(Math.round(fin.hccCaptureLow), Math.round(fin.hccCaptureHigh))} / year
                </p>
              </div>
            </motion.div>
          )}

          {fin.hasPatientFlow && (
            <motion.div
              className={`bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6 ${streamStates.patientFlow === false ? 'opacity-50' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              data-testid="row-patient-flow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStream('patientFlow')}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${streamStates.patientFlow !== false ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'}`}
                    aria-label={streamStates.patientFlow !== false ? 'Exclude from total' : 'Include in total'}
                    data-testid="toggle-patient-flow"
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${streamStates.patientFlow !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${streamStates.patientFlow !== false ? 'text-[#666666]' : 'text-[#AAAAAA] line-through'}`}>Patient Flow</h3>
                </div>
                {streamStates.patientFlow !== false && (
                  <span className="text-sm font-bold text-black">{fmtRange(Math.round(fin.patientFlowLow), Math.round(fin.patientFlowHigh))}</span>
                )}
              </div>
              {fin.patientFlowDetails.map((d, i) => (
                <div key={i} className="mb-3">
                  <p className="text-sm font-medium text-[#1A1A1A]">{d.label}</p>
                  <p className="text-xs text-[#999999]">{d.detail}</p>
                </div>
              ))}
              {fin.activeSettings?.includes('inpatient') && (
                <label className="flex items-center gap-2 mt-3 mb-1 cursor-pointer" data-testid="toggle-census-constrained">
                  <input
                    type="checkbox"
                    checked={assumptions.censusConstrained}
                    onChange={(e) => {
                      setAssumptions(prev => ({ ...prev, censusConstrained: e.target.checked }));
                      if (updateState) updateState({ censusConstrained: e.target.checked });
                    }}
                    className="w-4 h-4 rounded border-[#D1D5DB] text-[#EA2C00] accent-[#EA2C00]"
                  />
                  <span className="text-xs text-[#666666]">This hospital is census-constrained — freed beds are typically refilled</span>
                </label>
              )}
              <div className="mt-4 pt-4 border-t border-[#E5E5E5] flex items-center justify-between">
                <span className="text-xs text-[#666666]">Estimated impact</span>
                <span className="text-lg font-bold text-[#EA2C00]">{fmtRange(Math.round(fin.patientFlowLow), Math.round(fin.patientFlowHigh))} / year</span>
              </div>
            </motion.div>
          )}

          {fin.hasCapacityRevenue && (
            <motion.div
              className={`bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6 ${streamStates.capacityRevenue === false ? 'opacity-50' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.23 }}
              data-testid="row-capacity-revenue"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStream('capacityRevenue')}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${streamStates.capacityRevenue !== false ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'}`}
                    aria-label={streamStates.capacityRevenue !== false ? 'Exclude from total' : 'Include in total'}
                    data-testid="toggle-capacity-revenue"
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${streamStates.capacityRevenue !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${streamStates.capacityRevenue !== false ? 'text-[#666666]' : 'text-[#AAAAAA] line-through'}`}>Capacity Revenue</h3>
                </div>
                {streamStates.capacityRevenue !== false && (
                  <span className="text-sm font-bold text-black">{fmtRange(Math.round(fin.capacityRevenueLow), Math.round(fin.capacityRevenueHigh))}</span>
                )}
              </div>
              <div className="mb-3">
                <p className="text-sm font-medium text-[#1A1A1A]">Additional patient capacity converted to revenue</p>
                <p className="text-xs text-[#999999]">{fin.providers} providers · ${assumptions.revenuePerVisit}/visit</p>
              </div>
              <div className="mt-4 pt-4 border-t border-[#E5E5E5] flex items-center justify-between">
                <span className="text-xs text-[#666666]">Estimated impact</span>
                <span className="text-lg font-bold text-[#EA2C00]">{fmtRange(Math.round(fin.capacityRevenueLow), Math.round(fin.capacityRevenueHigh))} / year</span>
              </div>
            </motion.div>
          )}

          {fin.hasCostReduction && (
            <motion.div
              className={`bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6 ${streamStates.costReduction === false ? 'opacity-50' : ''}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              data-testid="row-cost-reduction"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleStream('costReduction')}
                    className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${streamStates.costReduction !== false ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'}`}
                    aria-label={streamStates.costReduction !== false ? 'Exclude from total' : 'Include in total'}
                    data-testid="toggle-cost-reduction"
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${streamStates.costReduction !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${streamStates.costReduction !== false ? 'text-[#666666]' : 'text-[#AAAAAA] line-through'}`}>Actual Cost Reduction</h3>
                </div>
                {streamStates.costReduction !== false && (
                  <span className="text-sm font-bold text-black">{fmtRange(Math.round(fin.costReductionLow), Math.round(fin.costReductionHigh))}</span>
                )}
              </div>

              {fin.hasAfterHours && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#888888] mb-2">After-hours reduction</p>
                  <p className="text-sm text-[#1A1A1A]">
                    After-hours documentation eliminated: {fin.afterHoursDelta.toFixed(1)} hrs/day per provider
                  </p>
                  <p className="text-xs text-[#92400E] italic mt-1">
                    Tracked as capacity recovered and wellbeing signal — not monetized for salaried providers
                  </p>
                </div>
              )}

              {fin.hasAgencySavings && (
                <div className={fin.hasAfterHours ? "pt-4 border-t border-[#E5E5E5] mb-4" : "mb-4"}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#888888] mb-2">Agency / locum spend reduction</p>
                  <p className="text-sm text-[#1A1A1A]">
                    Observed reduction: <span className="font-bold">{fmt(fin.agencySavingsAmount)}</span>
                  </p>
                  <p className="text-sm font-bold text-[#1A1A1A] mt-2">
                    Attributed savings: <span className="text-[#EA2C00]">{fmtRange(
                      Math.round(fin.agencySavingsAmount * fin.attrLow),
                      Math.round(fin.agencySavingsAmount * fin.attrHigh)
                    )} / year</span>
                  </p>
                </div>
              )}

              {fin.hasRetentionSignal && (
                <div className={(fin.hasAfterHours || fin.hasAgencySavings) ? "pt-4 border-t border-[#E5E5E5]" : ""}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#888888] mb-2">
                    {fin.hasPhysicianRetentionOverride ? 'Physician retention' : 'Retention signal'}
                  </p>
                  {!fin.hasPhysicianRetentionOverride && (
                    <div className="flex items-center gap-4 mb-2">
                      {fin.burnoutDelta > 0 && (
                        <p className="text-sm text-[#1A1A1A]">Burnout signal: <span className="font-bold">−{Math.round(fin.burnoutDelta)} pts</span></p>
                      )}
                      {fin.likelihoodDelta > 0 && (
                        <p className="text-sm text-[#1A1A1A]">Likelihood to stay: <span className="font-bold">+{Math.round(fin.likelihoodDelta)}%</span></p>
                      )}
                    </div>
                  )}
                  {fin.hasPhysicianRetentionOverride && (
                    <p className="text-sm text-[#1A1A1A] mb-2">
                      Retention rate improvement: <span className="font-bold">+{fin.retentionOverrideDelta} pts</span> across {fin.retentionOverrideProviders} providers
                    </p>
                  )}
                  <p className="text-sm font-bold text-[#1A1A1A]">
                    Estimated retention value: <span className="text-[#EA2C00]">{fmtRange(Math.round(fin.retentionLow), Math.round(fin.retentionHigh))} / year</span>
                  </p>
                  <p className="text-[10px] text-[#999999] mt-0.5">
                    Source: {fin.retentionBenchmarkLabel}
                  </p>
                  {fin.hasPhysicianRetentionOverride ? (
                    <p className="text-[10px] text-[#999999] mt-1 leading-relaxed">
                      ({(fin.retentionOverrideDelta / 100 * fin.retentionOverrideProviders).toFixed(1)}) turnovers avoided × {fmt(fin.effectiveReplacementCost.low)}–{fmt(fin.effectiveReplacementCost.high)} replacement cost × attribution
                    </p>
                  ) : (
                    <>
                      <p className="text-[10px] text-[#999999] mt-1 leading-relaxed">
                        Low = 1 turnover avoided × {fmt(fin.effectiveReplacementCost.low)} replacement cost × {Math.round(fin.attrLow * 100)}% attribution<br />
                        High = 3 turnovers avoided × {fmt(fin.effectiveReplacementCost.high)} replacement cost × {Math.round(fin.attrHigh * 100)}% attribution
                      </p>
                      <p className="text-[10px] text-[#AAAAAA] mt-1.5 italic">
                        (AMGA benchmark: $250K–$500K per physician)
                      </p>
                    </>
                  )}
                </div>
              )}

              {(fin.costReductionLow > 0 || fin.costReductionHigh > 0) && (
                <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                  <p className="text-sm text-[#666666]">Combined cost reduction:</p>
                  <p className="text-xl font-bold text-[#EA2C00]" data-testid="text-cost-value">
                    {fmtRange(Math.round(fin.costReductionLow), Math.round(fin.costReductionHigh))} / year
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <motion.div
          className="bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          data-testid="section-sensitivity"
        >
          <button
            className="w-full flex items-center justify-between p-5 text-left"
            onClick={() => setSensitivityOpen(!sensitivityOpen)}
            data-testid="button-sensitivity-toggle"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-[#666666]">Adjust assumptions</span>
            <ChevronDown className={`w-4 h-4 text-[#999999] transition-transform ${sensitivityOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {sensitivityOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-[#666666]">Realization rate</label>
                      <span className="text-sm font-bold text-[#1A1A1A]">{assumptions.realization}%</span>
                    </div>
                    <Slider
                      value={[assumptions.realization]}
                      onValueChange={([v]) => updateAssumption('realization', v)}
                      min={50}
                      max={95}
                      step={1}
                      className="w-full"
                      data-testid="slider-realization"
                    />
                    <div className="flex justify-between text-[10px] text-[#CCCCCC] mt-1">
                      <span>50%</span>
                      <span>95%</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-[#666666]">Conversion factor ($/wRVU)</label>
                    </div>
                    <FormattedNumberInput
                      value={assumptions.conversionFactor}
                      onChange={v => updateAssumption('conversionFactor', v)}
                      className="h-9 bg-white border-[#E5E5E5] text-sm"
                      data-testid="input-conversion-factor"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-[#525252] mb-1">
                      E/M undercapture rate (% encounters coded below appropriate level before Abridge)
                    </p>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[assumptions.emUndercaptureRate]}
                        onValueChange={([v]) => updateAssumption('emUndercaptureRate', v)}
                        min={10}
                        max={80}
                        step={5}
                        className="flex-1"
                        data-testid="slider-em-undercapture"
                      />
                      <span className="text-sm font-bold text-[#1A1A1A] w-10 text-right">{assumptions.emUndercaptureRate}%</span>
                    </div>
                    <p className="text-[10px] text-[#AAAAAA] italic mt-1">
                      Default 35% — from coding audit literature. Adjust based on your pre-Abridge coding quality.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#525252] font-medium">E/M eligible encounters</span>
                      <span className="text-xs font-bold text-[#1A1A1A]">{assumptions.emEligibilityRate}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[assumptions.emEligibilityRate]}
                        onValueChange={([v]) => updateAssumption('emEligibilityRate', v)}
                        min={40}
                        max={100}
                        step={5}
                        className="flex-1"
                        data-testid="slider-em-eligibility"
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[#AAAAAA]">40% (surgical mix)</span>
                      <span className="text-[10px] text-[#AAAAAA]">100% (ED / primary care)</span>
                    </div>
                    <p className="text-[10px] text-[#AAAAAA] italic mt-1">
                      % of Abridge encounters that resulted in an E/M bill. From your billing system.
                      Default {EM_ELIGIBILITY_DEFAULTS[primaryCareSetting] ?? 80}% for {primaryCareSetting === 'ed' ? 'ED' : primaryCareSetting.charAt(0).toUpperCase() + primaryCareSetting.slice(1)} — adjust to match your specialty mix.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-[#666666]">OT premium rate ($/hr)</label>
                    </div>
                    <FormattedNumberInput
                      value={assumptions.otPremiumRate}
                      onChange={v => updateAssumption('otPremiumRate', v)}
                      className="h-9 bg-white border-[#E5E5E5] text-sm"
                      data-testid="input-ot-rate"
                    />
                  </div>

                  {fin.isED && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-[#666666]">ED revenue per visit</label>
                      </div>
                      <FormattedNumberInput
                        value={assumptions.edRevenuePerVisit}
                        onChange={v => updateAssumption('edRevenuePerVisit', v)}
                        className="h-9 bg-white border-[#E5E5E5] text-sm"
                        data-testid="input-ed-revenue"
                      />
                    </div>
                  )}

                  {fin.isInpatient && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-[#666666]">DRG base rate ($)</label>
                      </div>
                      <FormattedNumberInput
                        value={assumptions.drgBaseRate}
                        onChange={v => updateAssumption('drgBaseRate', v)}
                        className="h-9 bg-white border-[#E5E5E5] text-sm"
                        data-testid="input-drg-rate"
                      />
                    </div>
                  )}

                  {fin.activeSettings.includes('inpatient') && (
                    <div>
                      <label className="text-xs font-medium text-[#666666] block mb-1">Cost per bed day</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#999999]">$</span>
                        <FormattedNumberInput
                          value={assumptions.costPerBedDay}
                          onChange={v => updateAssumption('costPerBedDay', v)}
                          className="h-9 w-28 text-sm"
                          data-testid="input-cost-per-bed-day"
                        />
                      </div>
                      <p className="text-[10px] text-[#AAAAAA] mt-1">Direct variable cost per inpatient day. Range: $1,500–$5,000</p>
                    </div>
                  )}

                  {fin.activeSettings.includes('outpatient') && (
                    <div>
                      <label className="text-xs font-medium text-[#666666] block mb-1">Revenue per visit ($)</label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#999999]">$</span>
                        <FormattedNumberInput
                          value={assumptions.revenuePerVisit}
                          onChange={v => updateAssumption('revenuePerVisit', v)}
                          className="h-9 w-28 text-sm"
                          data-testid="input-revenue-per-visit"
                        />
                      </div>
                      <p className="text-[10px] text-[#AAAAAA] mt-1">Average outpatient visit revenue for capacity calculation</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {unquantifiedItems.length > 0 && (
          <motion.div
            className="border-t border-[#F0F0F0] pt-8 mb-8"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            data-testid="section-not-counted"
          >
            <p className="text-[11px] uppercase tracking-[2px] text-[#999999] font-semibold mb-6">
              What the model doesn't capture
            </p>
            <div className="space-y-6">
              {unquantifiedItems.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-0.5 rounded-full bg-[#E5E5E5] flex-shrink-0 self-stretch" />
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A] mb-1">{item.title}</p>
                    <p className="text-sm text-[#666666] leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          className="flex justify-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-next"
          >
            What Adoption Could Mean
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
