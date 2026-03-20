import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  formatNumber,
  deriveEngagementContext,
  computeDomainStatus,
  type DomainStatus,
  getMonthsFromGoLive,
} from "@/lib/measureCalculator";
import { EngagementContextBar } from "@/components/measure/EngagementContextBar";

interface MeasureTransformationProps {
  state: MeasureState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

function SignalBadge({ status }: { status: DomainStatus }) {
  if (status === 'signaling' || status === 'validated') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700" data-testid="badge-signal-active">Active</span>;
  }
  if (status === 'baseline-only') {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-700" data-testid="badge-signal-baseline">Baseline Set</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500" data-testid="badge-signal-presignal">Pre-Signal</span>;
}

function PointComparison({ label, nonAbridge, withAbridge, unit, delay = 0 }: {
  label: string;
  nonAbridge: number;
  withAbridge: number;
  unit?: string;
  delay?: number;
}) {
  if (nonAbridge === 0 && withAbridge === 0) return null;
  const delta = withAbridge - nonAbridge;
  const deltaPercent = nonAbridge !== 0 ? ((delta / nonAbridge) * 100) : 0;
  const improved = delta > 0;
  const suffix = unit || '';

  return (
    <motion.div
      className="flex items-center gap-3 py-1.5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
    >
      <span className="text-sm text-[#666666] w-[140px] flex-shrink-0 truncate">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-sm font-medium text-[#999999]">{nonAbridge.toFixed(nonAbridge % 1 ? 2 : 0)}{suffix}</span>
        <div className="flex-1 h-px bg-[#E5E5E5] relative mx-1">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#CCCCCC]" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#EA2C00]" />
        </div>
        <span className="text-sm font-semibold text-[#1A1A1A]">{withAbridge.toFixed(withAbridge % 1 ? 2 : 0)}{suffix}</span>
      </div>
      {delta !== 0 && (
        <span className={`text-xs font-medium ${improved ? 'text-green-600' : 'text-red-500'} flex-shrink-0`}>
          {improved ? '+' : ''}{delta.toFixed(delta % 1 ? 2 : 1)}{suffix} ({improved ? '+' : ''}{deltaPercent.toFixed(1)}%)
        </span>
      )}
    </motion.div>
  );
}

interface DomainCardProps {
  name: string;
  question: string;
  stakeholder: string;
  status: DomainStatus;
  metrics: { label: string; nonAbridge: number; withAbridge: number; unit?: string }[];
  phaseNote?: string;
  delay?: number;
}

function DomainSignalCard({ name, question, stakeholder, status, metrics, phaseNote, delay = 0 }: DomainCardProps) {
  const muted = status === 'no-data';

  return (
    <motion.div
      className={`rounded-lg border p-5 ${muted ? 'bg-[#FAFAFA] border-[#F0F0F0]' : 'bg-white border-[#E5E5E5]'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      data-testid={`domain-card-${name.toLowerCase()}`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className={`text-xs font-bold uppercase tracking-[1.5px] ${muted ? 'text-[#CCCCCC]' : 'text-[#1A1A1A]'}`}>{name}</h3>
        <SignalBadge status={status} />
      </div>
      <p className={`text-[11px] mb-3 ${muted ? 'text-[#CCCCCC]' : 'text-[#999999]'}`}>
        Stakeholder: {stakeholder}
      </p>

      {!muted && metrics.length > 0 ? (
        <div className="space-y-0">
          {metrics.map((m, i) => (
            <PointComparison key={m.label} label={m.label} nonAbridge={m.nonAbridge} withAbridge={m.withAbridge} unit={m.unit} delay={delay + 0.1 + i * 0.05} />
          ))}
        </div>
      ) : (
        <div className="py-3 text-center">
          <p className={`text-xs italic ${muted ? 'text-[#CCCCCC]' : 'text-[#999999]'}`}>
            {muted ? question : 'No data entered yet'}
          </p>
          {phaseNote && <p className="text-[10px] text-[#CCCCCC] mt-1">{phaseNote}</p>}
        </div>
      )}
    </motion.div>
  );
}

export default function MeasureTransformation({ 
  state, 
  onNext, 
  onBack,
  onHome,
}: MeasureTransformationProps) {
  const context = useMemo(() => deriveEngagementContext(state), [state]);
  const domainStatus = useMemo(() => computeDomainStatus(state), [state]);
  const careSetting = state.careSetting || "outpatient";
  const isInpatient = careSetting === "inpatient";
  const isED = careSetting === "ed";
  const isNursing = careSetting === "nursing";
  const inpatientMetrics = state.settingData?.inpatient || {};
  const nursingMetrics = state.settingData?.nursing || {};
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);

  const timeReclaimed = Math.max(0, state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith);
  const adoptedEncounters = Math.round(state.deployment.totalEncounters * (state.deployment.utilizationRate / 100));
  const nonAdoptedEncounters = state.deployment.totalEncounters - adoptedEncounters;
  const totalHoursSaved = (timeReclaimed * adoptedEncounters) / 60;
  const hoursPerProvider = state.deployment.providers > 0 ? Math.round(totalHoursSaved / state.deployment.providers) : 0;

  const qualityMetrics = useMemo(() => {
    const m: { label: string; nonAbridge: number; withAbridge: number; unit?: string }[] = [];
    if (state.documentationQuality.emLevelWithout > 0 || state.documentationQuality.emLevelWith > 0) {
      m.push({ label: 'E/M Level', nonAbridge: state.documentationQuality.emLevelWithout, withAbridge: state.documentationQuality.emLevelWith });
    }
    if (!isNursing && (state.documentationQuality.wrvuWithout > 0 || state.documentationQuality.wrvuWith > 0)) {
      m.push({ label: 'wRVU/encounter', nonAbridge: state.documentationQuality.wrvuWithout, withAbridge: state.documentationQuality.wrvuWith });
    }
    if (isInpatient) {
      const cb = inpatientMetrics.cdiQueriesPer100_before ?? 0;
      const ca = inpatientMetrics.cdiQueriesPer100_after ?? 0;
      if (cb > 0 || ca > 0) m.push({ label: 'CDI queries/100', nonAbridge: cb, withAbridge: ca });
    }
    return m;
  }, [state, isInpatient, isNursing, inpatientMetrics]);

  const workforceMetrics = useMemo(() => {
    const m: { label: string; nonAbridge: number; withAbridge: number; unit?: string }[] = [];
    if (state.timeEfficiency.timeInNotesWithout > 0 || state.timeEfficiency.timeInNotesWith > 0) {
      m.push({ label: isNursing ? 'Charting time' : 'Time in notes', nonAbridge: state.timeEfficiency.timeInNotesWithout, withAbridge: state.timeEfficiency.timeInNotesWith, unit: ' min' });
    }
    if (state.timeEfficiency.workOutsideWithout > 0 || state.timeEfficiency.workOutsideWith > 0) {
      m.push({ label: isNursing ? 'Overtime hrs' : 'After-hours work', nonAbridge: state.timeEfficiency.workOutsideWithout, withAbridge: state.timeEfficiency.workOutsideWith, unit: ' hrs' });
    }
    if (isNursing) {
      const tb = nursingMetrics.turnoverRate_before ?? 0;
      const ta = nursingMetrics.turnoverRate_after ?? 0;
      if (tb > 0 || ta > 0) m.push({ label: 'Turnover rate', nonAbridge: tb, withAbridge: ta, unit: '%' });
    }
    return m;
  }, [state, isNursing, nursingMetrics]);

  const revenueMetrics = useMemo(() => {
    const m: { label: string; nonAbridge: number; withAbridge: number; unit?: string }[] = [];
    if (!isNursing && (state.documentationQuality.wrvuWithout > 0 || state.documentationQuality.wrvuWith > 0)) {
      m.push({ label: 'wRVU/encounter', nonAbridge: state.documentationQuality.wrvuWithout, withAbridge: state.documentationQuality.wrvuWith });
    }
    if (isInpatient) {
      const cb = inpatientMetrics.cmi_before ?? 0;
      const ca = inpatientMetrics.cmi_after ?? 0;
      if (cb > 0 || ca > 0) m.push({ label: 'CMI', nonAbridge: cb, withAbridge: ca });
      const db = inpatientMetrics.denialsPer100_before ?? 0;
      const da = inpatientMetrics.denialsPer100_after ?? 0;
      if (db > 0 || da > 0) m.push({ label: 'Denials/100', nonAbridge: db, withAbridge: da });
    }
    if (isED) {
      if (state.documentationQuality.emLevelWithout > 0 || state.documentationQuality.emLevelWith > 0) {
        m.push({ label: 'E/M accuracy', nonAbridge: state.documentationQuality.emLevelWithout, withAbridge: state.documentationQuality.emLevelWith });
      }
    }
    return m;
  }, [state, isInpatient, isED, isNursing, inpatientMetrics]);

  const capacityMetrics = useMemo(() => {
    const m: { label: string; nonAbridge: number; withAbridge: number; unit?: string }[] = [];
    const settingData = state.settingData?.[careSetting] || {};
    if (isED) {
      if (state.timeEfficiency.sameDayClosureWithout > 0 || state.timeEfficiency.sameDayClosureWith > 0) {
        m.push({ label: 'LWBS rate', nonAbridge: state.timeEfficiency.sameDayClosureWithout, withAbridge: state.timeEfficiency.sameDayClosureWith, unit: '%' });
      }
    }
    if (!isED && !isNursing && (state.timeEfficiency.sameDayClosureWithout > 0 || state.timeEfficiency.sameDayClosureWith > 0)) {
      m.push({ label: 'Same-day closure', nonAbridge: state.timeEfficiency.sameDayClosureWithout, withAbridge: state.timeEfficiency.sameDayClosureWith, unit: '%' });
    }
    return m;
  }, [state, careSetting, isED, isNursing]);

  const capacityLabel = isInpatient ? 'Patient Flow' : isED ? 'Throughput' : 'Capacity';

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={2}
        totalSteps={5}
        stepName="What Your Data Shows"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={state.deployment.organizationName} />

        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            What Your Data Shows
          </h1>
          <p className="text-base text-[#888888]" data-testid="text-page-subtitle">
            Same providers. Same period. Abridge vs. non-Abridge encounters compared.
          </p>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-5 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          data-testid="section-stats-banner"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="border-l-4 border-[#EA2C00] pl-3 min-w-0">
              <p className="text-2xl md:text-3xl font-bold text-black truncate">{state.deployment.providers}</p>
              <p className="text-xs text-[#888888] uppercase tracking-[1.5px]">Providers</p>
            </div>
            <div className="border-l-4 border-[#EA2C00] pl-3 min-w-0">
              <p className="text-2xl md:text-3xl font-bold text-black truncate">{formatNumber(state.deployment.totalEncounters)}</p>
              <p className="text-xs text-[#888888] uppercase tracking-[1.5px]">{isInpatient ? "Discharges" : isNursing ? "Shifts" : "Encounters"}</p>
            </div>
            <div className="border-l-4 border-[#EA2C00] pl-3 min-w-0">
              <p className="text-2xl md:text-3xl font-bold text-black truncate">{state.deployment.utilizationRate}%</p>
              <p className="text-xs text-[#888888] uppercase tracking-[1.5px]">Adoption</p>
            </div>
            <div className="border-l-4 border-[#EA2C00] pl-3 min-w-0">
              <p className="text-2xl md:text-3xl font-bold text-black truncate">{months}mo</p>
              <p className="text-xs text-[#888888] uppercase tracking-[1.5px]">Since Go-Live</p>
            </div>
            <div className="border-l-4 border-[#EA2C00] pl-3 min-w-0">
              <p className="text-2xl md:text-3xl font-bold text-black truncate">{hoursPerProvider} hrs</p>
              <p className="text-xs text-[#888888] uppercase tracking-[1.5px]">Saved Per Provider</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <DomainSignalCard
            name="Quality"
            question="Has documentation quality traveled downstream?"
            stakeholder="CMO, Quality & CDI"
            status={domainStatus.quality}
            metrics={qualityMetrics}
            phaseNote={context.phase < 1 ? undefined : undefined}
            delay={0.15}
          />
          <DomainSignalCard
            name="Workforce"
            question="Has clinician relief translated into tangible benefits?"
            stakeholder="CHRO, CMO"
            status={domainStatus.workforce}
            metrics={workforceMetrics}
            phaseNote={context.phase < 2 ? "Signal expected at month 3+" : undefined}
            delay={0.2}
          />
          <DomainSignalCard
            name="Revenue"
            question="Has documentation quality reached the bottom line?"
            stakeholder="CFO, VP Revenue Cycle"
            status={domainStatus.revenue}
            metrics={revenueMetrics}
            phaseNote={context.phase < 2 ? "Signal expected at month 3+" : undefined}
            delay={0.25}
          />
          <DomainSignalCard
            name={capacityLabel}
            question="What is the organization doing with the freed time?"
            stakeholder="COO, Dept Chiefs"
            status={domainStatus.capacity}
            metrics={capacityMetrics}
            phaseNote={months < 6 ? "Signal expected at month 6+" : undefined}
            delay={0.3}
          />
        </div>

        <motion.p
          className="text-xs text-[#AAAAAA] text-center mb-6 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          These values compare concurrent encounters {"–"} same providers, same period, documented with and without Abridge.
        </motion.p>

        {(state.customMetrics || []).filter((cm) => cm.label.trim()).length > 0 && (
          <motion.div
            className="bg-white rounded-lg border border-[#E5E5E5] p-5 mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            data-testid="section-custom-metrics"
          >
            <h3 className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A] mb-3">Additional Metrics</h3>
            <div className="space-y-0">
              {(state.customMetrics || [])
                .filter((cm) => cm.label.trim())
                .map((cm, i) => (
                  <PointComparison
                    key={cm.id}
                    label={cm.label}
                    nonAbridge={cm.before}
                    withAbridge={cm.after}
                    delay={0.5 + i * 0.05}
                  />
                ))}
            </div>
          </motion.div>
        )}

        {state.deployment.utilizationRate < 100 && (
          <motion.div
            className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            data-testid="section-headroom"
          >
            <div className="flex items-start gap-3">
              <div className="w-1 bg-[#EA2C00] rounded-full self-stretch flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1.5px] mb-2">
                  At {state.deployment.utilizationRate}% Adoption
                </p>
                <p className="text-xs text-[#666666] leading-relaxed">
                  These results are based on {formatNumber(adoptedEncounters)} of your {formatNumber(state.deployment.totalEncounters)} {isInpatient ? "discharges" : isNursing ? "shifts" : "encounters"}. The remaining {formatNumber(nonAdoptedEncounters)} {isInpatient ? "discharges are" : isNursing ? "shifts are" : "encounters are"} still being documented without Abridge{"\u2014"}representing additional headroom within your current providers.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-base text-[#666666] italic">
            Here{"'"}s what this means for your organization.
          </p>
        </motion.div>

        <motion.div 
          className="flex justify-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-see-value"
          >
            See What It{"'"}s Worth
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
