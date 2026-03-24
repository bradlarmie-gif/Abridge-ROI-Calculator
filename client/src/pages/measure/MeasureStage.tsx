import { useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  type MaturityStage,
  type DomainStatus,
  deriveEngagementContext,
  computeDomainStatus,
  deriveSettingStage,
  type SettingStage,
} from "@/lib/measureCalculator";
import { EngagementContextBar } from "@/components/measure/EngagementContextBar";
import NarrativePanel from "@/components/measure/NarrativePanel";
import { generateNarrative } from "@/lib/measureNarrative";

interface MeasureStageProps {
  state: MeasureState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const STAGE_ORDER: MaturityStage[] = ['unmeasured', 'signaling', 'validated', 'strategic'];
const STAGE_LABELS: Record<MaturityStage, string> = {
  unmeasured: 'UNMEASURED',
  signaling: 'SIGNALING',
  validated: 'VALIDATED',
  strategic: 'STRATEGIC',
};

function StageDotsRow({ currentStage }: { currentStage: MaturityStage }) {
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  return (
    <div className="flex items-center gap-3 mb-5">
      {STAGE_ORDER.map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center
              ${i === currentIdx ? 'border-[#EA2C00] bg-[#EA2C00]' : i < currentIdx ? 'border-white bg-white' : 'border-white/40 bg-transparent'}`}
            >
              {i < currentIdx && <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A]" />}
            </div>
            <span className={`text-[10px] mt-1.5 ${i === currentIdx ? 'text-[#EA2C00] font-semibold' : 'text-[#666666]'}`}>
              {STAGE_LABELS[s]}
            </span>
          </div>
          {i < STAGE_ORDER.length - 1 && (
            <div className={`w-8 h-px ${i < currentIdx ? 'bg-white' : 'bg-[#444444]'} mb-4`} />
          )}
        </div>
      ))}
    </div>
  );
}

function DomainStatusCard({ name, status, stakeholder }: {
  name: string;
  status: DomainStatus;
  stakeholder: string;
}) {
  const isActive = status === 'signaling' || status === 'validated';
  const isSignaling = status === 'signaling';
  const borderColor = isActive ? '#EA2C00' : isSignaling ? '#F5C4B8' : '#E0E0E0';

  return (
    <div
      className="bg-white rounded-lg border p-3 flex-1 min-w-[120px]"
      style={{ borderTop: `3px solid ${borderColor}`, borderColor: '#E5E5E5' }}
      data-testid={`domain-status-${name.toLowerCase().replace(/\s/g, '-')}`}
    >
      <p className="text-[10px] font-bold text-[#1A1A1A] mb-1">{name}</p>
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold mb-1
        ${isActive ? 'bg-green-100 text-green-700' : status === 'baseline-only' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
        {isActive ? 'Active' : status === 'baseline-only' ? 'Baseline' : 'Pre-Signal'}
      </span>
      <p className="text-[9px] text-[#AAAAAA] mt-1">{stakeholder}</p>
    </div>
  );
}

function getMetricDelta(state: MeasureState, domain: string): string | null {
  const te = state.timeEfficiency;
  const dq = state.documentationQuality;
  switch (domain) {
    case 'workforce': {
      const d = te.timeInNotesWithout - te.timeInNotesWith;
      return d > 0 ? `${d} min/note saved` : null;
    }
    case 'quality': {
      const d = dq.emLevelWith - dq.emLevelWithout;
      return d > 0 ? `+${d.toFixed(2)} E/M improvement` : null;
    }
    case 'revenue': {
      const d = dq.wrvuWith - dq.wrvuWithout;
      return d > 0 ? `+${d.toFixed(2)} wRVU lift` : null;
    }
    case 'capacity': {
      const d = te.sameDayClosureWith - te.sameDayClosureWithout;
      return d > 0 ? `+${d}% same-day closure` : null;
    }
    default: return null;
  }
}

function getHowYouGotHere(stage: SettingStage, state: MeasureState): string {
  const domainStatus = stage.domainStatus;
  const strongest = Object.entries(domainStatus).reduce((best, [k, v]) => {
    const p = v === 'validated' ? 4 : v === 'signaling' ? 3 : v === 'baseline-only' ? 2 : 1;
    return p > best.p ? { key: k, p } : best;
  }, { key: 'workforce', p: 0 }).key;

  const strongestName = strongest.charAt(0).toUpperCase() + strongest.slice(1);
  const delta = getMetricDelta(state, strongest) || 'positive trends';

  const prevStage = STAGE_ORDER.indexOf(stage.maturityStage) > 0
    ? STAGE_LABELS[STAGE_ORDER[STAGE_ORDER.indexOf(stage.maturityStage) - 1]]
    : 'baseline';

  return `Your ${strongestName} signal (${delta}) confirmed across ${stage.months} months is what moves you from ${prevStage} to ${STAGE_LABELS[stage.maturityStage]}.`;
}

function StageCard({ stage, state, compact = false }: { stage: SettingStage; state: MeasureState; compact?: boolean }) {
  const howYouGotHere = getHowYouGotHere(stage, state);
  const isNursing = stage.setting === 'nursing';
  const isInpatient = stage.setting === 'inpatient';
  const isED = stage.setting === 'ed';

  const domainStakeholders: Record<string, string> = {
    quality: 'CMO, Quality',
    workforce: 'CHRO, CMO',
    revenue: 'CFO, Revenue Cycle',
    capacity: 'COO, Dept Chiefs',
  };

  const capacityLabel = isInpatient ? 'Patient Flow' : isED ? 'Throughput' : 'Capacity';

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {compact && (
        <p className="text-xs font-bold uppercase tracking-[1.5px] text-[#999999] mb-2">{stage.settingLabel}</p>
      )}

      <div className="bg-[#1A1A1A] rounded-xl p-6" data-testid={`stage-card-${stage.setting}`}>
        <StageDotsRow currentStage={stage.maturityStage} />

        <h2 className="text-2xl font-bold text-white font-abridge uppercase tracking-tight mb-2">
          {STAGE_LABELS[stage.maturityStage]}
        </h2>

        <p className="text-sm text-white/60 mb-4 leading-relaxed">
          {stage.defensibleClaims.slice(0, 2).join('. ')}.
        </p>

        <div className="h-px bg-white/10 mb-4" />

        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[1.5px] mb-2">WHAT YOUR DATA SUPPORTS</p>
        <div className="space-y-1.5 mb-4">
          {stage.defensibleClaims.map((claim, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-[#EA2C00] mt-0.5 flex-shrink-0" />
              <span className="text-[11px] text-white/70">{claim}</span>
            </div>
          ))}
        </div>

        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-[1.5px] mb-2">HOW YOU GOT HERE</p>
        <p className="text-[11px] text-white/50 italic leading-relaxed">{howYouGotHere}</p>
      </div>

      <div className="flex gap-3 mt-4">
        <DomainStatusCard
          name="Quality"
          status={stage.domainStatus.quality}
          stakeholder={domainStakeholders.quality}
        />
        <DomainStatusCard
          name="Workforce"
          status={stage.domainStatus.workforce}
          stakeholder={domainStakeholders.workforce}
        />
        <DomainStatusCard
          name="Revenue"
          status={stage.domainStatus.revenue}
          stakeholder={domainStakeholders.revenue}
        />
        <DomainStatusCard
          name={capacityLabel}
          status={stage.domainStatus.capacity}
          stakeholder={domainStakeholders.capacity}
        />
      </div>
    </motion.div>
  );
}

export default function MeasureStage({
  state,
  onNext,
  onBack,
  onHome,
}: MeasureStageProps) {
  const context = useMemo(() => deriveEngagementContext(state), [state]);
  const narrative = useMemo(() => generateNarrative('stage', state), [state]);
  const careSetting = state.careSetting || 'outpatient';

  const activeSettings = useMemo(() => {
    if (state.activeCareSettings?.length > 0) return state.activeCareSettings;
    const settings: MeasureCareSetting[] = [];
    const all: MeasureCareSetting[] = ['outpatient', 'ed', 'inpatient', 'nursing'];
    for (const s of all) {
      const d = state.settingData[s];
      if (d) {
        const hasMetricData = Object.entries(d).some(([k, v]) =>
          (k.endsWith('_before') || k.endsWith('_after')) && v !== 0
        );
        if (hasMetricData) settings.push(s);
      }
    }
    if (settings.length === 0 && careSetting) settings.push(careSetting);
    return settings;
  }, [state, careSetting]);

  const stages = useMemo(() => activeSettings.map(s => deriveSettingStage(state, s)), [state, activeSettings]);
  const multiSetting = activeSettings.length > 1;

  const highestStage = useMemo(() => {
    let best: MaturityStage = 'unmeasured';
    for (const s of stages) {
      if (STAGE_ORDER.indexOf(s.maturityStage) > STAGE_ORDER.indexOf(best)) {
        best = s.maturityStage;
      }
    }
    return best;
  }, [stages]);

  const newestSetting = useMemo(() => {
    if (!multiSetting) return null;
    return stages.reduce((min, s) => s.months < min.months ? s : min, stages[0]);
  }, [stages, multiSetting]);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={4}
        totalSteps={7}
        stepName="Your Stage"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={state.deployment.organizationName} deployment={state.deployment} />

        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            Your Stage
          </h1>
          <p className="text-base text-[#888888]" data-testid="text-page-subtitle">
            Based on what the data shows, here{"'"}s where each setting stands in the Abridge maturity journey.
          </p>
        </motion.div>

        <NarrativePanel narrative={narrative} />

        {stages.map(stage => (
          <StageCard
            key={stage.setting}
            stage={stage}
            state={state}
            compact={multiSetting}
          />
        ))}

        {multiSetting && newestSetting && (
          <motion.div
            className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            data-testid="section-combined-stage-summary"
          >
            <p className="text-sm text-[#666666] leading-relaxed">
              Across {activeSettings.length} settings, your most advanced stage is{' '}
              <span className="font-semibold text-[#1A1A1A]">{STAGE_LABELS[highestStage]}</span>.
              {' '}Your newest setting ({newestSetting.settingLabel}) is {newestSetting.months} months in {"\u2014"}{' '}
              {newestSetting.maturityLabel} and tracking toward {newestSetting.maturityNext}.
            </p>
          </motion.div>
        )}

        <motion.div
          className="flex justify-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-next"
          >
            Your Estimated Impact
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
