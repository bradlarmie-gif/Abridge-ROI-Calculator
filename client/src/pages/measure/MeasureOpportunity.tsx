import { useState, useMemo } from "react";
import { Download, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MaturityStage,
  formatNumber,
  deriveEngagementContext,
  computeDomainStatus,
  getMonthsFromGoLive,
  getActiveMetrics,
} from "@/lib/measureCalculator";

const STAGES: { key: MaturityStage; label: string }[] = [
  { key: 'unmeasured', label: 'Unmeasured' },
  { key: 'signaling', label: 'Signaling' },
  { key: 'validated', label: 'Validated' },
  { key: 'strategic', label: 'Strategic' },
];

const STAGE_DESCRIPTIONS: Record<MaturityStage, string> = {
  unmeasured: 'Adoption is still ramping or baselines haven\'t been established yet.',
  signaling: 'One or two domains are showing before/after trends. Baselines are confirmed.',
  validated: 'Three or more domains have confirmed trends with at least 60% utilization.',
  strategic: 'Abridge is embedded in organizational strategy with board-ready proof.',
};

const SETTING_SUGGESTIONS: Record<string, { label: string; benchmarks: string[] }> = {
  outpatient: {
    label: 'Emergency Department',
    benchmarks: ['LWBS rate −0.6 to −1.2 pts', 'Door-to-doc time −18%', 'Note time −42%'],
  },
  ed: {
    label: 'Inpatient',
    benchmarks: ['CMI improvement +0.02–0.05', 'Note completion same-day +28%', 'Documentation time −35%'],
  },
  inpatient: {
    label: 'Outpatient',
    benchmarks: ['wRVU lift +0.15–0.40 per encounter', 'Note time −44%', 'After-hours work −1.2 hrs/day'],
  },
  nursing: {
    label: 'Inpatient',
    benchmarks: ['CMI improvement +0.02–0.05', 'Note completion same-day +28%', 'Documentation time −35%'],
  },
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

function fmtRange(low: number, high: number): string {
  if (low === high) return fmt(low);
  return `${fmt(low)} — ${fmt(high)}`;
}

function computeConfirmedRange(state: MeasureState, streamStates?: Record<string, boolean>): { low: number; high: number } {
  const activeSettings = state.activeCareSettings?.length > 0
    ? state.activeCareSettings
    : [state.careSetting || 'outpatient'];
  const primarySetting = activeSettings[0];
  const providers = state.deployment.providers || state.deployment.mruProviders || 0;
  const totalEncounters = state.deployment.totalEncounters || 0;
  const utilizationRate = state.deployment.utilizationRate || 0;
  const adoptedEncounters = Math.round(totalEncounters * (utilizationRate / 100));

  const attrLow = 0.50;
  const attrHigh = 0.75;
  const realLow = 0.70;
  const realHigh = 0.90;
  const cf = state.calibration.conversionFactor || 33;

  let billingLow = 0, billingHigh = 0;
  let recoveryLow = 0, recoveryHigh = 0;
  let pfLow = 0, pfHigh = 0;
  let capLow = 0, capHigh = 0;
  let costLow = 0, costHigh = 0;

  const activeMetrics = getActiveMetrics(state);

  const emEligibilityDefaults: Record<string, number> = {
    outpatient: 0.82, ed: 0.95, inpatient: 0.90, nursing: 0.00,
  };
  const emEligibilityRate = emEligibilityDefaults[primarySetting] ?? 0.80;

  for (const s of activeSettings) {
    const sSettingData = state.settingData?.[s] || {};
    const sAdoptedEncounters = Math.round(
      (sSettingData.deploy_totalEncounters || totalEncounters) * (utilizationRate / 100)
    );
    const effectiveAdopted = sAdoptedEncounters > 0 ? sAdoptedEncounters : adoptedEncounters;
    const emEligibleEncounters = Math.round(effectiveAdopted * emEligibilityRate);

    if (s === 'nursing') {
      continue;
    }

    const wrvuMetric = activeMetrics.find(m =>
      ['wrvu', 'wrvuPerEncounter'].includes(m.metricId) && (!m.setting || m.setting === s)
    );
    const wrvuDelta = (wrvuMetric?.after ?? (s === primarySetting ? (state.documentationQuality.wrvuWith ?? 0) : 0)) -
      (wrvuMetric?.before ?? (s === primarySetting ? (state.documentationQuality.wrvuWithout ?? 0) : 0));
    if (wrvuDelta > 0 && emEligibleEncounters > 0) {
      const base = wrvuDelta * emEligibleEncounters * cf;
      billingLow += base * attrLow * realLow;
      billingHigh += base * attrHigh * realHigh;
    }

    const emMetric = activeMetrics.find(m =>
      ['em_level', 'emLevel'].includes(m.metricId) && (!m.setting || m.setting === s)
    );
    const emDelta = (emMetric?.after ?? (s === primarySetting ? (state.documentationQuality.emLevelWith ?? 0) : 0)) -
      (emMetric?.before ?? (s === primarySetting ? (state.documentationQuality.emLevelWithout ?? 0) : 0));
    if (emDelta > 0 && emEligibleEncounters > 0) {
      const undercaptureRate = 0.35;
      const base = emDelta * emEligibleEncounters * undercaptureRate * 45;
      billingLow += base * attrLow * realLow;
      billingHigh += base * attrHigh * realHigh;
    }

    if (s === 'inpatient') {
      const cmiMetric = activeMetrics.find(m =>
        ['cmi', 'cmiScore', 'caseMixIndex'].includes(m.metricId)
      );
      const cmiDelta = Math.max(0, (cmiMetric?.after ?? sSettingData.cmi_after ?? 0) - (cmiMetric?.before ?? sSettingData.cmi_before ?? 0));
      if (cmiDelta > 0) {
        const discharges = sSettingData.deploy_totalEncounters || totalEncounters;
        const base = cmiDelta * discharges * 6800;
        billingLow += base * attrLow * realLow;
        billingHigh += base * attrHigh * realHigh;
      }
    }

    if (s === 'ed') {
      const edSettingData = state.settingData?.ed || {};
      const edTotalEncounters = edSettingData.deploy_totalEncounters || totalEncounters;
      const lwbsMetric = activeMetrics.find(m => m.metricId === 'lwbsRate');
      const lwbsDelta = (lwbsMetric?.before ?? edSettingData.lwbsRate_before ?? 0) - (lwbsMetric?.after ?? edSettingData.lwbsRate_after ?? 0);
      if (lwbsDelta > 0 && edTotalEncounters > 0) {
        const recovered = (lwbsDelta / 100) * edTotalEncounters * 12;
        recoveryLow += recovered * 480 * attrLow;
        recoveryHigh += recovered * 480 * attrHigh;
      }
    }
  }

  const afterHoursMetric = activeMetrics.find(m =>
    ['work_after_hours_perceived', 'workAfterHours', 'work_outside_work_empirical', 'afterHours', 'chartingAfterShift'].includes(m.metricId)
  );
  const afterHoursDelta = Math.max(0,
    (afterHoursMetric?.before ?? state.timeEfficiency.workOutsideWithout ?? 0) -
    (afterHoursMetric?.after ?? state.timeEfficiency.workOutsideWith ?? 0)
  );
  const isHourlyWorkforce = activeSettings.includes('nursing');
  if (afterHoursDelta > 0 && providers > 0 && isHourlyWorkforce) {
    const annual = afterHoursDelta * 5 * providers * 75 * 52;
    costLow += annual * attrLow;
    costHigh += annual * attrHigh;
  }

  const mv = state.metricValues || {};
  let hasBurnout = false;
  for (const k of Object.keys(mv)) {
    if (k.startsWith('burnout') || k.startsWith('likelihood')) {
      const e = mv[k];
      if (e && e.before != null && e.after != null) {
        if ((k.startsWith('burnout') && e.before > e.after) ||
            (k.startsWith('likelihood') && e.after > e.before)) {
          hasBurnout = true;
        }
      }
    }
  }
  if (hasBurnout) {
    const replacementCostRange: Record<string, { low: number; high: number }> = {
      outpatient: { low: 300_000, high: 500_000 },
      ed:         { low: 350_000, high: 500_000 },
      inpatient:  { low: 300_000, high: 500_000 },
      nursing:    { low: 50_000,  high: 100_000 },
    };
    const rc = replacementCostRange[primarySetting] ?? { low: 250_000, high: 400_000 };
    costLow += 1 * rc.low * attrLow;
    costHigh += 3 * rc.high * attrHigh;
  }

  if (streamStates) {
    if (streamStates.billingCapture === false) { billingLow = 0; billingHigh = 0; }
    if (streamStates.revenueRecovery === false) { recoveryLow = 0; recoveryHigh = 0; }
    if (streamStates.patientFlow === false) { pfLow = 0; pfHigh = 0; }
    if (streamStates.capacityRevenue === false) { capLow = 0; capHigh = 0; }
    if (streamStates.costReduction === false) { costLow = 0; costHigh = 0; }
  }

  return {
    low: billingLow + recoveryLow + pfLow + capLow + costLow,
    high: billingHigh + recoveryHigh + pfHigh + capHigh + costHigh,
  };
}

interface MeasureOpportunityProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureOpportunity({
  state,
  onBack,
  onHome,
}: MeasureOpportunityProps) {
  const ctx = useMemo(() => deriveEngagementContext(state), [state]);
  const domainStatus = useMemo(() => computeDomainStatus(state), [state]);
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);
  const orgName = state.deployment.organizationName || "Your Organization";
  const activeSettingsList = state.activeCareSettings?.length > 0
    ? state.activeCareSettings
    : [state.careSetting || 'outpatient'];
  const settingLabel = activeSettingsList.map((s: string) =>
    s === 'ed' ? 'ED' : s === 'inpatient' ? 'Inpatient' : s === 'nursing' ? 'Nursing' : 'Outpatient'
  ).join(' · ');
  const setting = activeSettingsList[0];

  const confirmed = useMemo(() => computeConfirmedRange(state), [state]);
  const enabledConfirmed = useMemo(() => computeConfirmedRange(state, state.streamStates), [state]);
  const hasConfirmedValue = confirmed.low > 0;

  const providers = state.deployment.providers || state.deployment.mruProviders || 0;
  const totalProviders = state.deployment.totalProviders || providers;
  const utilizationRate = state.deployment.utilizationRate || 0;
  const activeDomains = Object.values(domainStatus).filter(s => s === 'signaling' || s === 'validated').length;

  const activeMetricCount = useMemo(() => {
    const mv = state.metricValues || {};
    return Object.keys(mv).filter(k => {
      const e = mv[k];
      return e && (e.before != null || e.after != null);
    }).length;
  }, [state.metricValues]);

  const currentStageIdx = STAGES.findIndex(s => s.key === ctx.maturityStage);

  const nextStageActions = useMemo(() => {
    const actions: string[] = [];
    const stage = ctx.maturityStage;

    if (stage === 'unmeasured') {
      actions.push(`Reach 20% Abridge adoption (you're at ${Math.round(utilizationRate)}%)`);
      if (activeDomains < 1) actions.push('Establish before/after data in at least one domain');
    } else if (stage === 'signaling') {
      if (activeDomains < 3) {
        const missing = 3 - activeDomains;
        actions.push(`Establish before/after data in ${missing} more domain${missing > 1 ? 's' : ''}`);
      }
      if (utilizationRate < 60) actions.push(`Reach 60% utilization across the cohort (you're at ${Math.round(utilizationRate)}%)`);
      actions.push('Run a structured Abridge vs. non-Abridge encounter analysis');
    } else if (stage === 'validated') {
      actions.push('Document outcomes in a formal internal report for CFO/CMO review');
      if (utilizationRate < 70) actions.push(`Reach 70% adoption (you're at ${Math.round(utilizationRate)}%)`);
    } else if (stage === 'strategic') {
      actions.push('Publish findings — you have board-level proof');
    }

    return actions;
  }, [ctx.maturityStage, utilizationRate, activeDomains]);

  const showDeepenAdoption = utilizationRate < 75;
  const showExpandProviders = providers < totalProviders;
  const showAddSetting = (state.activeCareSettings || [setting]).length <= 1;
  const allFullyDeployed = !showDeepenAdoption && !showExpandProviders && !showAddSetting;

  const [pdfLoading, setPdfLoading] = useState(false);

  const minAdoptionTarget = Math.min(100, Math.max(Math.ceil(utilizationRate) + 5, 60));
  const [targetAdoption, setTargetAdoption] = useState(() =>
    Math.min(100, Math.max(minAdoptionTarget, 75))
  );
  const maxProviderTarget = Math.max(totalProviders, providers + 1);
  const [targetProviderCount, setTargetProviderCount] = useState(() =>
    totalProviders > providers ? totalProviders : providers + 1
  );

  const deepenValue = useMemo(() => {
    if (!hasConfirmedValue || utilizationRate <= 0 || targetAdoption <= utilizationRate) return null;
    const scale = targetAdoption / utilizationRate;
    return {
      additional: { low: Math.round(enabledConfirmed.low * (scale - 1)), high: Math.round(enabledConfirmed.high * (scale - 1)) },
      total: { low: Math.round(enabledConfirmed.low * scale), high: Math.round(enabledConfirmed.high * scale) },
    };
  }, [hasConfirmedValue, enabledConfirmed, utilizationRate, targetAdoption]);

  const additionalProviders = targetProviderCount - providers;
  const expandValue = useMemo(() => {
    if (!showExpandProviders || !hasConfirmedValue || providers <= 0 || targetProviderCount <= providers) return null;
    const perProviderLow = enabledConfirmed.low / providers;
    const perProviderHigh = enabledConfirmed.high / providers;
    return {
      additional: { low: Math.round(perProviderLow * additionalProviders), high: Math.round(perProviderHigh * additionalProviders) },
      total: { low: Math.round(enabledConfirmed.low + perProviderLow * additionalProviders), high: Math.round(enabledConfirmed.high + perProviderHigh * additionalProviders) },
      addedCount: additionalProviders,
    };
  }, [showExpandProviders, hasConfirmedValue, enabledConfirmed, providers, additionalProviders, targetProviderCount]);

  const additionalEncountersAtTarget = useMemo(() => {
    if (!showDeepenAdoption) return 0;
    const total = state.deployment.totalEncounters || 0;
    const current = Math.round(total * (utilizationRate / 100));
    const target = Math.round(total * 0.75);
    return Math.max(0, target - current);
  }, [showDeepenAdoption, state.deployment.totalEncounters, utilizationRate]);

  const additionalProvidersNeeded = useMemo(() => {
    if (!showDeepenAdoption || providers <= 0) return 0;
    const currentAdopted = Math.round(providers * (utilizationRate / 100));
    const targetAdopted = Math.round(providers * 0.75);
    return Math.max(0, targetAdopted - currentAdopted);
  }, [showDeepenAdoption, providers, utilizationRate]);

  const nextMoves = useMemo(() => {
    const moves: { label: string; detail: string }[] = [];

    if (utilizationRate < 40) {
      moves.push({ label: 'Drive adoption', detail: `${orgName} is at ${Math.round(utilizationRate)}% — next milestone is 40%. Schedule department-level Abridge sessions.` });
    }
    if (activeMetricCount < 4) {
      moves.push({ label: 'Add measurement depth', detail: 'You have data in fewer than 4 metrics. Broader coverage makes the story more defensible.' });
    }
    if (ctx.maturityStage === 'signaling') {
      moves.push({ label: 'Formalize the comparison', detail: 'Run a structured Abridge vs. non-Abridge encounter analysis for the CMO. The data is there.' });
    }
    if (ctx.maturityStage === 'validated' || ctx.maturityStage === 'strategic') {
      moves.push({ label: 'Publish internally', detail: 'Prepare a one-page findings brief for finance and quality leadership. Use this EBR as the source.' });
    }
    moves.push({ label: 'Set a 90-day goal', detail: 'Name one metric, one target, one owner. Schedule a check-in.' });

    return moves.slice(0, 4);
  }, [utilizationRate, activeMetricCount, ctx.maturityStage, orgName]);

  const handleExport = async () => {
    setPdfLoading(true);
    try {
      const mod = await import('@/components/measure/MeasurePDFExport');
      if (mod.generateMeasurePDF) {
        await mod.generateMeasurePDF(state);
      } else {
        window.print();
      }
    } catch {
      window.print();
    } finally {
      setPdfLoading(false);
    }
  };

  const suggestionData = SETTING_SUGGESTIONS[setting] || SETTING_SUGGESTIONS.outpatient;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader
        pathType="measure"
        currentStep={5}
        totalSteps={5}
        stepName="What's Next"
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
          What's Next
        </motion.h1>

        <motion.div
          className="bg-[#F5F0EB] rounded-2xl border border-[#E5E5E5] p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="section-maturity-stage"
        >
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#666666] mb-5">Maturity Stage</h2>

          <div className="flex items-center justify-between mb-6 px-2">
            {STAGES.map((s, i) => {
              const isCompleted = i < currentStageIdx;
              const isCurrent = i === currentStageIdx;
              const isFuture = i > currentStageIdx;

              return (
                <div key={s.key} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full flex items-center justify-center ${
                        isCurrent ? 'bg-[#EA2C00] ring-4 ring-[#EA2C00]/20' :
                        isCompleted ? 'bg-[#1A1A1A]' :
                        'bg-[#E5E5E5]'
                      }`}
                    >
                      {isCompleted && <Check className="w-2 h-2 text-white" />}
                    </div>
                    <span className={`text-[10px] mt-2 whitespace-nowrap ${
                      isCurrent ? 'font-bold text-[#1A1A1A]' :
                      isFuture ? 'text-[#999999]' :
                      'text-[#666666]'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={`flex-1 h-px mx-3 mb-5 ${
                      i < currentStageIdx ? 'bg-[#1A1A1A]' : 'bg-[#E5E5E5]'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {currentStageIdx >= 0 && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-[#999999]">↑ you are here</span>
            </div>
          )}

          <p className="text-sm text-[#666666] mb-4">
            {STAGE_DESCRIPTIONS[ctx.maturityStage]}
          </p>

          {nextStageActions.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#666666] mb-2">
                {ctx.maturityStage === 'strategic' ? 'Your next step' : `What gets you to ${ctx.maturityNext}`}
              </p>
              <ul className="space-y-1.5">
                {nextStageActions.map((action, i) => (
                  <li key={i} className="text-sm text-[#666666] flex items-start gap-2">
                    <span className="text-[#EA2C00] mt-0.5 flex-shrink-0">·</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#666666] mb-4">Expansion Opportunity</h2>

          {allFullyDeployed ? (
            <div className="bg-[#F5F0EB] rounded-2xl border border-[#E5E5E5] p-6 text-center">
              <p className="text-sm text-[#666666]">
                You've reached full deployment maturity. The work now is validation and publication.
              </p>
            </div>
          ) : (
              <div className="space-y-4">
                {showDeepenAdoption && (
                  <div className="bg-[#F5F0EB] rounded-2xl border border-[#E5E5E5] p-6" data-testid="lever-deepen">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#666666]">Deepen Adoption</h3>
                      <span className="text-xs text-[#999999]">currently {Math.round(utilizationRate)}%</span>
                    </div>
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#999999]">{Math.round(utilizationRate)}%</span>
                        <span className="text-sm font-bold text-[#1A1A1A]">
                          Target: <span className="text-[#EA2C00]">{Math.round(targetAdoption)}%</span>
                        </span>
                        <span className="text-xs text-[#999999]">100%</span>
                      </div>
                      <Slider
                        min={minAdoptionTarget}
                        max={100}
                        step={1}
                        value={[targetAdoption]}
                        onValueChange={([v]) => setTargetAdoption(v)}
                        className="[&_[data-slot=slider-track]]:bg-[#E5E5E5] [&_[data-slot=slider-range]]:bg-[#EA2C00] [&_[data-slot=slider-thumb]]:border-[#EA2C00] [&_[data-slot=slider-thumb]]:bg-white
  [&_[data-slot=slider-thumb]]:shadow-md"
                      />
                    </div>
                    <AnimatePresence mode="wait">
                      {deepenValue ? (
                        <motion.div
                          key={`deepen-${targetAdoption}`}
                          initial={{ opacity: 0.6 }}
                          animate={{ opacity: 1 }}
                          className="bg-white rounded-xl border border-[#E5E5E5] p-4"
                        >
                          <p className="text-xs text-[#999999] uppercase tracking-widest mb-3">
                            At {Math.round(targetAdoption)}% adoption
                          </p>
                          <div className="flex items-baseline justify-between mb-2">
                            <span className="text-xs text-[#666666]">Additional value</span>
                            <span className="text-xl font-bold text-[#EA2C00]" data-testid="text-deepen-value">
                              +{fmtRange(deepenValue.additional.low, deepenValue.additional.high)}<span className="text-sm font-normal text-[#999999]"> /yr</span>
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between pt-2 border-t border-[#F0EBE5]">
                            <span className="text-xs text-[#666666]">Total at target</span>
                            <span className="text-sm font-bold text-[#1A1A1A]">
                              {fmtRange(deepenValue.total.low, deepenValue.total.high)}<span className="text-xs font-normal text-[#999999]"> /yr</span>
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.p key="deepen-no-financial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[#999999] italic">
                          Enter financial metrics on the previous page to see projected value.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {showExpandProviders && (
                  <div className="bg-[#F5F0EB] rounded-2xl border border-[#E5E5E5] p-6" data-testid="lever-expand">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#666666]">Expand Provider Cohort</h3>
                      <span className="text-xs text-[#999999]">{providers} of {totalProviders} on Abridge now</span>
                    </div>
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#999999]">{providers}</span>
                        <span className="text-sm font-bold text-[#1A1A1A]">
                          Target: <span className="text-[#EA2C00]">{targetProviderCount} providers</span>
                        </span>
                        <span className="text-xs text-[#999999]">{maxProviderTarget}</span>
                      </div>
                      <Slider
                        min={providers + 1}
                        max={maxProviderTarget}
                        step={1}
                        value={[targetProviderCount]}
                        onValueChange={([v]) => setTargetProviderCount(v)}
                        className="[&_[data-slot=slider-track]]:bg-[#E5E5E5] [&_[data-slot=slider-range]]:bg-[#EA2C00] [&_[data-slot=slider-thumb]]:border-[#EA2C00] [&_[data-slot=slider-thumb]]:bg-white
  [&_[data-slot=slider-thumb]]:shadow-md"
                      />
                    </div>
                    <AnimatePresence mode="wait">
                      {expandValue ? (
                        <motion.div
                          key={`expand-${targetProviderCount}`}
                          initial={{ opacity: 0.6 }}
                          animate={{ opacity: 1 }}
                          className="bg-white rounded-xl border border-[#E5E5E5] p-4"
                        >
                          <p className="text-xs text-[#999999] uppercase tracking-widest mb-3">
                            Adding {expandValue.addedCount} provider{expandValue.addedCount !== 1 ? 's' : ''}
                          </p>
                          <div className="flex items-baseline justify-between mb-2">
                            <span className="text-xs text-[#666666]">Additional value</span>
                            <span className="text-xl font-bold text-[#EA2C00]" data-testid="text-expand-value">
                              +{fmtRange(expandValue.additional.low, expandValue.additional.high)}<span className="text-sm font-normal text-[#999999]"> /yr</span>
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between pt-2 border-t border-[#F0EBE5]">
                            <span className="text-xs text-[#666666]">Total at target</span>
                            <span className="text-sm font-bold text-[#1A1A1A]">
                              {fmtRange(expandValue.total.low, expandValue.total.high)}<span className="text-xs font-normal text-[#999999]"> /yr</span>
                            </span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.p key="expand-no-financial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-[#999999] italic">
                          Enter financial metrics on the previous page to see projected value.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {showAddSetting && (
                  <div className="bg-[#F5F0EB] rounded-2xl border border-[#E5E5E5] p-6" data-testid="lever-add-setting">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#666666] mb-3">Add a Care Setting</h3>
                    <p className="text-sm text-[#666666] mb-1">Currently measuring: {settingLabel}</p>
                    <p className="text-sm text-[#666666] mb-3">Next setting to consider: <span className="font-medium text-[#1A1A1A]">{suggestionData.label}</span></p>
                    <p className="text-xs text-[#999999] mb-2">{suggestionData.label} deployments at peer systems have shown:</p>
                    <ul className="space-y-1">
                      {suggestionData.benchmarks.map((b, i) => (
                        <li key={i} className="text-sm text-[#666666] flex items-start gap-2">
                          <span className="text-[#EA2C00] mt-0.5 flex-shrink-0">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
          )}
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-2xl border border-[#E5E5E5] p-6 mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="section-next-moves"
        >
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#666666] mb-4">Next Moves</h2>
          <div className="space-y-4">
            {nextMoves.map((move, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-[#EA2C00] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-white">{i + 1}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">{move.label}</p>
                  <p className="text-sm text-[#666666] mt-0.5">{move.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
          data-testid="section-export"
        >
          <Button
            onClick={handleExport}
            disabled={pdfLoading}
            className="w-full h-14 bg-[#1A1A1A] hover:bg-[#333333] text-white font-bold text-base rounded-xl gap-3"
            data-testid="button-export-pdf"
          >
            <Download className="w-5 h-5" />
            {pdfLoading ? 'Generating...' : 'Download EBR Summary — PDF'}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <button
            onClick={onBack}
            className="text-sm text-[#999999] hover:text-[#666666] transition-colors inline-flex items-center gap-1.5"
            data-testid="link-back-financial"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Financial Impact
          </button>
        </motion.div>
      </div>
    </div>
  );
}
