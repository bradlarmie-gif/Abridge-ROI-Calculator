import { useState, useMemo } from "react";
import { ArrowRight, BarChart2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  formatCurrency,
  formatNumber,
  getMonthsFromGoLive,
  getActiveMetrics,
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
}

const DEFAULT_ASSUMPTIONS: Assumptions = {
  attribution: 62,
  realization: 80,
  conversionFactor: 33,
  otPremiumRate: 75,
  edRevenuePerVisit: 480,
  drgBaseRate: 6800,
  costPerBedDay: 2500,
  revenuePerVisit: 200,
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
      costReductionHigh: 0, hasAfterHours: false, afterHoursDelta: 0,
      afterHoursAnnual: 0, hasRetentionSignal: false, burnoutDelta: 0,
      likelihoodDelta: 0, retentionLow: 0, retentionHigh: 0,
      hasPhysicianRetentionOverride: false, retentionOverrideProviders: 0,
      retentionOverrideDelta: 0, hasPatientFlow: false, patientFlowLow: 0,
      patientFlowHigh: 0, patientFlowDetails: [], hasCapacityRevenue: false,
      capacityRevenueLow: 0, capacityRevenueHigh: 0, hasAgencySavings: false,
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

  const afterHoursMetric = activeMetrics.find(m =>
    ['work_after_hours_perceived', 'workAfterHours', 'work_outside_work_empirical', 'afterHours', 'chartingAfterShift', 'afterHoursWork', 'workOutsideHours', 'wowTime'].includes(m.metricId)
  );
  const afterHoursWithout = afterHoursMetric?.before ?? state.timeEfficiency?.workOutsideWithout ?? 0;
  const afterHoursWith = afterHoursMetric?.after ?? state.timeEfficiency?.workOutsideWith ?? 0;

  let billingCaptureLow = 0;
  let billingCaptureHigh = 0;
  const billingDetails: { label: string; detail: string; formula: string }[] = [];

  for (const s of activeSettings) {
    const sSettingData = state.settingData?.[s] || {};
    const sAdoptedEncounters = Math.round(
      (sSettingData.deploy_totalEncounters || totalEncounters) * (utilizationRate / 100)
    );
    const effectiveAdopted = sAdoptedEncounters > 0 ? sAdoptedEncounters : adoptedEncounters;

    const wrvuMetric = activeMetrics.find(m =>
      ['wrvu', 'wrvuPerEncounter'].includes(m.metricId) && (!m.setting || m.setting === s)
    );
    const wrvuB = wrvuMetric?.before ?? (s === primarySetting ? (state.documentationQuality?.wrvuWithout ?? 0) : 0);
    const wrvuA = wrvuMetric?.after ?? (s === primarySetting ? (state.documentationQuality?.wrvuWith ?? 0) : 0);
    const wrvuD = wrvuA - wrvuB;

    if (wrvuD > 0 && effectiveAdopted > 0) {
      const base = wrvuD * effectiveAdopted * assumptions.conversionFactor;
      billingCaptureLow += base * attrLow * realLow;
      billingCaptureHigh += base * attrHigh * realHigh;
      billingDetails.push({
        label: `wRVU lift: +${wrvuD.toFixed(2)} per encounter${multiSetting ? ` (${s === 'ed' ? 'ED' : s.charAt(0).toUpperCase() + s.slice(1)})` : ''}`,
        detail: `Adopted encounters: ${formatNumber(effectiveAdopted)}/yr`,
        formula: `+${wrvuD.toFixed(2)} wRVU × ${formatNumber(effectiveAdopted)} × $${assumptions.conversionFactor} × ${Math.round(assumptions.realization)}% = ${fmt(base * (assumptions.realization / 100))}`,
      });
    }

    const emMetric = activeMetrics.find(m =>
      ['em_level', 'emLevel'].includes(m.metricId) && (!m.setting || m.setting === s)
    );
    const emB = emMetric?.before ?? (s === primarySetting ? (state.documentationQuality?.emLevelWithout ?? 0) : 0);
    const emA = emMetric?.after ?? (s === primarySetting ? (state.documentationQuality?.emLevelWith ?? 0) : 0);
    const emD = emA - emB;

    if (emD > 0 && effectiveAdopted > 0) {
      const avgEmValue = 45;
      const base = emD * effectiveAdopted * avgEmValue;
      billingCaptureLow += base * attrLow * realLow;
      billingCaptureHigh += base * attrHigh * realHigh;
      billingDetails.push({
        label: `E/M level improvement: +${emD.toFixed(1)} levels${multiSetting ? ` (${s === 'ed' ? 'ED' : s.charAt(0).toUpperCase() + s.slice(1)})` : ''}`,
        detail: `${formatNumber(effectiveAdopted)} adopted encounters`,
        formula: `+${emD.toFixed(1)} E/M × ${formatNumber(effectiveAdopted)} × ~$${avgEmValue}/level = ${fmt(base)}`,
      });
    }

    if (s === 'inpatient') {
      const cmiMetric = activeMetrics.find(m => ['cmi', 'cmiScore', 'caseMixIndex'].includes(m.metricId));
      const cmiB = cmiMetric?.before ?? (sSettingData.cmi_before ?? 0);
      const cmiA = cmiMetric?.after ?? (sSettingData.cmi_after ?? 0);
      const cmiD = Math.max(0, cmiA - cmiB);
      if (cmiD > 0) {
        const discharges = sSettingData.deploy_totalEncounters || totalEncounters;
        const base = cmiD * discharges * assumptions.drgBaseRate;
        billingCaptureLow += base * attrLow * realLow;
        billingCaptureHigh += base * attrHigh * realHigh;
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
    const edTotalEncounters = edSettingData.deploy_totalEncounters || totalEncounters;

    const lwbsMetric = activeMetrics.find(m => m.metricId === 'lwbsRate');
    const lwbsB = lwbsMetric?.before ?? (edSettingData.lwbsRate_before ?? 0);
    const lwbsA = lwbsMetric?.after ?? (edSettingData.lwbsRate_after ?? 0);
    const lwbsD = lwbsB - lwbsA;

    if (lwbsD > 0 && edTotalEncounters > 0) {
      const annualVisits = edTotalEncounters * 12;
      const recovered = (lwbsD / 100) * annualVisits;
      revenueRecoveryLow += recovered * assumptions.edRevenuePerVisit * attrLow;
      revenueRecoveryHigh += recovered * assumptions.edRevenuePerVisit * attrHigh;
      recoveryDetails.push({
        label: `LWBS reduction: ${lwbsB.toFixed(1)}% → ${lwbsA.toFixed(1)}% (−${lwbsD.toFixed(1)} pts)`,
        detail: `Monthly ED visits: ${formatNumber(edTotalEncounters)} · Revenue per visit: $${assumptions.edRevenuePerVisit}`,
      });
    }
  }

  for (const s of activeSettings) {
    const sData = state.settingData?.[s] || {};
    const effectiveEncounters = sData.deploy_totalEncounters || totalEncounters;

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
      revenueRecoveryLow += base * attrLow;
      revenueRecoveryHigh += base * attrHigh;
      recoveryDetails.push({
        label: `Denial rate reduction: −${denialDelta.toFixed(1)} pts${activeSettings.length > 1 ? ` (${s === 'ed' ? 'ED' : s.charAt(0).toUpperCase() + s.slice(1)})` : ''}`,
        detail: `${formatNumber(effectiveEncounters)} encounters · avg denial cost: $${avgDenialCost.toLocaleString()}/case`,
      });
    }
  }

  const hasRevenueRecovery = revenueRecoveryLow > 0;

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

    const ipEncounters = ipData.deploy_totalEncounters || (activeSettings.length === 1 ? totalEncounters : 0);

    if (alosDelta > 0 && ipEncounters > 0) {
      const base = alosDelta * ipEncounters * assumptions.costPerBedDay;
      patientFlowLow += base * attrLow;
      patientFlowHigh += base * attrHigh;
      patientFlowDetails.push({
        label: `ALOS reduction: ${alosBefore.toFixed(1)} → ${alosAfter.toFixed(1)} days (−${alosDelta.toFixed(1)} days/admission)`,
        detail: `${formatNumber(ipEncounters)} annual admissions · cost per bed day: $${assumptions.costPerBedDay.toLocaleString()}`,
        formula: `${alosDelta.toFixed(1)} days × ${formatNumber(ipEncounters)} admissions × $${assumptions.costPerBedDay.toLocaleString()} = ${fmt(base)}`,
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
      if (patientDelta > 0 && providers > 0) {
        hasCapacityRevenue = true;
        const annualAdditionalVisits = patientDelta * providers * 12;
        const base = annualAdditionalVisits * assumptions.revenuePerVisit;
        capacityRevenueLow = base * attrLow * realLow;
        capacityRevenueHigh = base * attrHigh * realHigh;
      }
    }
  }

  let costReductionLow = 0;
  let costReductionHigh = 0;

  const afterHoursDelta = Math.max(0, afterHoursWithout - afterHoursWith);

  let hasAfterHours = false;
  let afterHoursAnnual = 0;
  if (afterHoursDelta > 0 && providers > 0) {
    hasAfterHours = true;
    afterHoursAnnual = afterHoursDelta * 5 * providers * assumptions.otPremiumRate * 52;
    costReductionLow += afterHoursAnnual * attrLow;
    costReductionHigh += afterHoursAnnual * attrHigh;
  }

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

  if (burnoutDelta > 0 || likelihoodDelta > 0) {
    hasRetentionSignal = true;
    const mdReplacementLow = 50_000;
    const mdReplacementHigh = 150_000;
    retentionLow = 1 * mdReplacementLow * attrLow;
    retentionHigh = 3 * mdReplacementHigh * attrHigh;
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
      const replacementCostLow = 300_000;
      const replacementCostHigh = 750_000;
      const newRetentionLow = turnoversAvoided * replacementCostLow * attrLow;
      const newRetentionHigh = turnoversAvoided * replacementCostHigh * attrHigh;
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

  const totalLow = billingCaptureLow + revenueRecoveryLow + patientFlowLow + capacityRevenueLow + costReductionLow;
  const totalHigh = billingCaptureHigh + revenueRecoveryHigh + patientFlowHigh + capacityRevenueHigh + costReductionHigh;
  const hasAnyFinancial = totalLow > 0;

  return {
    setting,
    isED,
    isInpatient,
    providers,
    adoptedEncounters,
    totalEncounters,
    utilizationRate,
    activeSettings,
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
  onNext,
  onBack,
  onHome,
}: MeasureAllocateProps) {
  const [assumptions, setAssumptions] = useState<Assumptions>({
    ...DEFAULT_ASSUMPTIONS,
    conversionFactor: state?.calibration?.conversionFactor || 33,
    otPremiumRate: state?.calibration?.otHourlyRate || 75,
  });
  const [sensitivityOpen, setSensitivityOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fin = useMemo(() => computeFinancials(state, assumptions), [state, assumptions]);
  const months = getMonthsFromGoLive(state?.goLiveDate ?? null, state?.deployment?.monthsOnAbridge ?? 0);
  const orgName = state?.deployment?.organizationName || "Your Organization";
  const activeSettingsList = fin.activeSettings || [fin.setting];
  const settingLabel = activeSettingsList.map((s: string) =>
    s === 'ed' ? 'ED' : s === 'inpatient' ? 'Inpatient' : s === 'nursing' ? 'Nursing' : 'Outpatient'
  ).join(' · ');

  const heroLow = useCountUp(Math.round(fin.totalLow), 1200, 300);
  const heroHigh = useCountUp(Math.round(fin.totalHigh), 1200, 500);

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
            <p className="text-sm text-[#666666] mb-1">confirmed annual value range</p>
            <p className="text-xs text-[#999999]">
              {formatNumber(fin.providers)} providers · attribution: {assumptions.attribution}%
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

        <div className="space-y-4 mb-8">
          {fin.hasBillingCapture && (
            <motion.div
              className="bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              data-testid="row-billing-capture"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#666666]">Billing Capture</h3>
                <span className="text-[10px] font-medium bg-[#EA2C00]/10 text-[#EA2C00] px-2.5 py-1 rounded-full">Revenue</span>
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
              className="bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              data-testid="row-revenue-recovery"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#666666]">Revenue Recovery</h3>
                <span className="text-[10px] font-medium bg-[#EA2C00]/10 text-[#EA2C00] px-2.5 py-1 rounded-full">Throughput</span>
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

          {fin.hasPatientFlow && (
            <motion.div
              className="bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              data-testid="row-patient-flow"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#666666]">Patient Flow</h3>
                <span className="text-[10px] font-medium bg-[#EA2C00]/10 text-[#EA2C00] px-2.5 py-1 rounded-full">Inpatient</span>
              </div>
              {fin.patientFlowDetails.map((d, i) => (
                <div key={i} className="mb-3">
                  <p className="text-sm font-medium text-[#1A1A1A]">{d.label}</p>
                  <p className="text-xs text-[#999999]">{d.detail}</p>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-[#E5E5E5] flex items-center justify-between">
                <span className="text-xs text-[#666666]">Estimated impact</span>
                <span className="text-lg font-bold text-[#EA2C00]">{fmtRange(Math.round(fin.patientFlowLow), Math.round(fin.patientFlowHigh))} / year</span>
              </div>
            </motion.div>
          )}

          {fin.hasCapacityRevenue && (
            <motion.div
              className="bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.23 }}
              data-testid="row-capacity-revenue"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#666666]">Capacity Revenue</h3>
                <span className="text-[10px] font-medium bg-[#EA2C00]/10 text-[#EA2C00] px-2.5 py-1 rounded-full">Outpatient</span>
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
              className="bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              data-testid="row-cost-reduction"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#666666]">Actual Cost Reduction</h3>
                <span className="text-[10px] font-medium bg-[#EA2C00]/10 text-[#EA2C00] px-2.5 py-1 rounded-full">Workforce</span>
              </div>

              {fin.hasAfterHours && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#888888] mb-2">After-hours payroll</p>
                  <p className="text-sm text-[#1A1A1A]">
                    After-hours eliminated: {fin.afterHoursDelta.toFixed(1)} hrs/day per provider
                  </p>
                  <p className="text-xs text-[#999999]">
                    OT premium rate: ${assumptions.otPremiumRate}/hr · Providers on Abridge: {fin.providers}
                  </p>
                  <p className="text-sm font-bold text-[#1A1A1A] mt-2">
                    Annual OT cost avoided: <span className="text-[#EA2C00]">{fmtRange(
                      Math.round(fin.afterHoursAnnual * fin.attrLow),
                      Math.round(fin.afterHoursAnnual * fin.attrHigh)
                    )} / year</span>
                  </p>
                  <p className="text-[10px] text-[#999999] mt-1 font-mono">
                    {fin.afterHoursDelta.toFixed(1)} hrs/day × 5 days × {fin.providers} providers × ${assumptions.otPremiumRate}/hr × 52 weeks
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
                    Estimated retention value{fin.hasPhysicianRetentionOverride ? '' : ' (MGMA benchmarks)'}: <span className="text-[#EA2C00]">{fmtRange(Math.round(fin.retentionLow), Math.round(fin.retentionHigh))} / year</span>
                  </p>
                  {fin.hasPhysicianRetentionOverride ? (
                    <p className="text-[10px] text-[#999999] mt-1 leading-relaxed">
                      ({(fin.retentionOverrideDelta / 100 * fin.retentionOverrideProviders).toFixed(1)}) turnovers avoided × $300K–$750K replacement cost × attribution
                    </p>
                  ) : (
                    <>
                      <p className="text-[10px] text-[#999999] mt-1 leading-relaxed">
                        Low = 1 turnover avoided × $50K/MD replacement cost × 50% attribution<br />
                        High = 3 turnovers avoided × $150K/MD replacement cost × 75% attribution
                      </p>
                      <p className="text-[10px] text-[#AAAAAA] mt-1.5 italic">
                        Not a direct calculation — a signal-based range using published MGMA benchmarks ($50K–$150K per physician)
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                <p className="text-sm text-[#666666]">Combined cost reduction:</p>
                <p className="text-xl font-bold text-[#EA2C00]" data-testid="text-cost-value">
                  {fmtRange(Math.round(fin.costReductionLow), Math.round(fin.costReductionHigh))} / year
                </p>
              </div>
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
                      <label className="text-sm text-[#666666]">Attribution confidence</label>
                      <span className="text-sm font-bold text-[#1A1A1A]">{assumptions.attribution}%</span>
                    </div>
                    <Slider
                      value={[assumptions.attribution]}
                      onValueChange={([v]) => updateAssumption('attribution', v)}
                      min={50}
                      max={75}
                      step={1}
                      className="w-full"
                      data-testid="slider-attribution"
                    />
                    <div className="flex justify-between text-[10px] text-[#CCCCCC] mt-1">
                      <span>50%</span>
                      <span>75%</span>
                    </div>
                  </div>

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
                    <Input
                      type="number"
                      value={assumptions.conversionFactor}
                      onChange={e => updateAssumption('conversionFactor', Number(e.target.value) || 0)}
                      className="h-9 bg-white border-[#E5E5E5] text-sm"
                      data-testid="input-conversion-factor"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm text-[#666666]">OT premium rate ($/hr)</label>
                    </div>
                    <Input
                      type="number"
                      value={assumptions.otPremiumRate}
                      onChange={e => updateAssumption('otPremiumRate', Number(e.target.value) || 0)}
                      className="h-9 bg-white border-[#E5E5E5] text-sm"
                      data-testid="input-ot-rate"
                    />
                  </div>

                  {fin.isED && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm text-[#666666]">ED revenue per visit</label>
                      </div>
                      <Input
                        type="number"
                        value={assumptions.edRevenuePerVisit}
                        onChange={e => updateAssumption('edRevenuePerVisit', Number(e.target.value) || 0)}
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
                      <Input
                        type="number"
                        value={assumptions.drgBaseRate}
                        onChange={e => updateAssumption('drgBaseRate', Number(e.target.value) || 0)}
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
                        <Input
                          type="number"
                          value={assumptions.costPerBedDay}
                          onChange={e => updateAssumption('costPerBedDay', Number(e.target.value) || 0)}
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
                        <Input
                          type="number"
                          value={assumptions.revenuePerVisit}
                          onChange={e => updateAssumption('revenuePerVisit', Number(e.target.value) || 0)}
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

        <motion.div
          className="bg-[#F5F0EB] rounded-xl border border-[#E5E5E5] p-5 mb-8 max-w-lg mx-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          data-testid="section-not-counted"
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#999999] mb-3">Also Real. Not Quantified.</h3>
          <div className="space-y-2">
            {[
              'Provider satisfaction and intent to stay',
              'Recruitment advantage ("physicians ask about Abridge")',
              'Reduced administrative backlog and prior auth delays',
              'Audit readiness and documentation defensibility',
            ].map((item) => (
              <p key={item} className="text-sm text-[#888888] leading-relaxed">{"\u2022"} {item}</p>
            ))}
          </div>
        </motion.div>

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
