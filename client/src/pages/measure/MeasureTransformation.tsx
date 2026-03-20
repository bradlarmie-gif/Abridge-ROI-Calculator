import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  type DataSource,
  formatNumber,
  formatCurrency,
  deriveEngagementContext,
  computeDomainStatus,
  calculateConfirmedValue,
  type DomainStatus,
  getMonthsFromGoLive,
} from "@/lib/measureCalculator";
import { EngagementContextBar } from "@/components/measure/EngagementContextBar";
import NarrativePanel from "@/components/measure/NarrativePanel";
import { generateNarrative } from "@/lib/measureNarrative";
import { ABRIDGE_NATIVE_METRICS } from "@/lib/measureCareSettings";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface MeasureTransformationProps {
  state: MeasureState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  mode?: 'build' | 'present';
}

function DataSourceBadge({ source }: { source: DataSource }) {
  const config: Record<DataSource, { label: string; bg: string; text: string }> = {
    analytics: { label: 'Analytics Pull', bg: 'bg-green-100', text: 'text-green-700' },
    benchmark: { label: 'Partner Platform', bg: 'bg-blue-100', text: 'text-blue-700' },
    estimate: { label: 'Team Estimate', bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  const c = config[source] || config.estimate;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`} data-testid="badge-data-source">
      {c.label}
    </span>
  );
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

function AbridgeFootprintRow({ nativeData }: { nativeData: Partial<Record<string, number>> }) {
  const filledMetrics = ABRIDGE_NATIVE_METRICS.filter(m => (nativeData[m.key] ?? 0) > 0);
  if (filledMetrics.length === 0) return null;

  return (
    <motion.div
      className="flex items-center gap-4 flex-wrap mb-6 py-3 px-4 bg-[#F9F7F4] rounded-lg border border-[#E8E2DA]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.05 }}
      data-testid="abridge-footprint-row"
    >
      <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#999999]">Abridge Footprint</span>
      <span className="text-[#E5E5E5]">|</span>
      {filledMetrics.map((m) => (
        <div key={m.key} className="flex items-center gap-1">
          <span className="text-sm font-semibold text-[#1A1A1A]">
            {formatNumber(nativeData[m.key]!)}{m.suffix ? m.suffix : ''}
          </span>
          <span className="text-[10px] text-[#999999]">{m.label}</span>
        </div>
      ))}
    </motion.div>
  );
}

type TrendViewTab = 'point-in-time' | 'trend';

const TREND_METRIC_OPTIONS = [
  { key: 'timeInNotes', label: 'Time in Notes', unit: 'min' },
  { key: 'wrvu', label: 'wRVU', unit: '' },
  { key: 'emLevel', label: 'E/M Level', unit: '' },
  { key: 'sameDayClosure', label: 'Same-Day Closure', unit: '%' },
];

function TrendChart({ state, selectedMetric }: { state: MeasureState; selectedMetric: string }) {
  const data = state.trendConfig.monthlyData[selectedMetric as keyof typeof state.trendConfig.monthlyData] || [];
  if (data.length < 2) {
    return (
      <div className="h-[200px] flex items-center justify-center text-xs text-[#CCCCCC] italic">
        Add at least 2 months of trend data to see the chart
      </div>
    );
  }

  const chartData = data.map((val, i) => ({ month: `M${i + 1}`, value: val }));
  const metricDef = TREND_METRIC_OPTIONS.find(m => m.key === selectedMetric);
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);

  return (
    <div className="h-[220px]" data-testid="trend-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#999' }} />
          <YAxis tick={{ fontSize: 10, fill: '#999' }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E5E5' }}
            formatter={(value: number) => [`${value}${metricDef?.unit || ''}`, metricDef?.label || '']}
          />
          <Line type="monotone" dataKey="value" stroke="#EA2C00" strokeWidth={2} dot={{ fill: '#EA2C00', r: 3 }} />
          {months >= 3 && <ReferenceLine x="M3" stroke="#E5E5E5" strokeDasharray="3 3" label={{ value: 'Phase 2', fontSize: 9, fill: '#CCC' }} />}
          {months >= 6 && <ReferenceLine x="M6" stroke="#E5E5E5" strokeDasharray="3 3" label={{ value: 'Phase 3', fontSize: 9, fill: '#CCC' }} />}
          {months >= 18 && <ReferenceLine x="M18" stroke="#E5E5E5" strokeDasharray="3 3" label={{ value: 'Phase 4', fontSize: 9, fill: '#CCC' }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MeasureTransformation({ 
  state, 
  onNext, 
  onBack,
  onHome,
  mode = 'build',
}: MeasureTransformationProps) {
  const context = useMemo(() => deriveEngagementContext(state), [state]);
  const domainStatus = useMemo(() => computeDomainStatus(state), [state]);
  const confirmed = useMemo(() => calculateConfirmedValue(state), [state]);
  const narrative = useMemo(() => generateNarrative('confirmed', state), [state]);
  const careSetting = state.careSetting || "outpatient";
  const isInpatient = careSetting === "inpatient";
  const isED = careSetting === "ed";
  const isNursing = careSetting === "nursing";
  const inpatientMetrics = state.settingData?.inpatient || {};
  const nursingMetrics = state.settingData?.nursing || {};
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);

  const [viewTab, setViewTab] = useState<TrendViewTab>('point-in-time');
  const [trendMetric, setTrendMetric] = useState('timeInNotes');

  const hasTrendData = state.trendConfig.enabled && Object.values(state.trendConfig.monthlyData).some(arr => arr.length >= 2);

  const timeReclaimed = Math.max(0, state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith);
  const adoptedEncounters = Math.round(state.deployment.totalEncounters * (state.deployment.utilizationRate / 100));
  const nonAdoptedEncounters = state.deployment.totalEncounters - adoptedEncounters;

  const wrvuLift = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  const goLiveDisplay = state.goLiveDate
    ? new Date(state.goLiveDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : `${months} months ago`;

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
    if (isED) {
      if (state.timeEfficiency.sameDayClosureWithout > 0 || state.timeEfficiency.sameDayClosureWith > 0) {
        m.push({ label: 'LWBS rate', nonAbridge: state.timeEfficiency.sameDayClosureWithout, withAbridge: state.timeEfficiency.sameDayClosureWith, unit: '%' });
      }
    }
    if (!isED && !isNursing && (state.timeEfficiency.sameDayClosureWithout > 0 || state.timeEfficiency.sameDayClosureWith > 0)) {
      m.push({ label: 'Same-day closure', nonAbridge: state.timeEfficiency.sameDayClosureWithout, withAbridge: state.timeEfficiency.sameDayClosureWith, unit: '%' });
    }
    return m;
  }, [state, isED, isNursing]);

  const capacityLabel = isInpatient ? 'Patient Flow' : isED ? 'Throughput' : 'Capacity';
  const orgName = state.deployment.organizationName || 'Your Organization';

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={2}
        totalSteps={6}
        stepName="What Your Data Shows"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {mode === 'present' && (
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2" data-testid="text-present-org-name">
              {orgName}
            </h1>
            <p className="text-sm text-[#999999]">
              Partnership with Abridge {"·"} {months} months {"·"} {state.deployment.providers} {isNursing ? 'nurses' : 'providers'}
            </p>
          </motion.div>
        )}

        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={mode !== 'present' ? state.deployment.organizationName : undefined} />

        <AbridgeFootprintRow nativeData={state.abridgeNativeData} />

        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            What Your Data Shows
          </h1>
          <p className="text-base text-[#888888]" data-testid="text-page-subtitle">
            Based on what you{"'"}ve entered, here is the value we can attribute to Abridge during your deployment period.
          </p>
        </motion.div>

        <NarrativePanel narrative={narrative} mode={mode} />

        {hasTrendData && (
          <div className="flex items-center gap-2 mb-4" data-testid="trend-tab-selector">
            <button
              onClick={() => setViewTab('point-in-time')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${viewTab === 'point-in-time' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F0F0F0] text-[#999999] hover:text-[#666666]'}`}
              data-testid="tab-point-in-time"
            >
              Point-in-Time
            </button>
            <button
              onClick={() => setViewTab('trend')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${viewTab === 'trend' ? 'bg-[#1A1A1A] text-white' : 'bg-[#F0F0F0] text-[#999999] hover:text-[#666666]'}`}
              data-testid="tab-trend"
            >
              Trend
            </button>
          </div>
        )}

        {viewTab === 'trend' && hasTrendData ? (
          <motion.div
            className="rounded-lg border border-[#E5E5E5] p-5 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="section-trend-view"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A]">Month-over-Month Trend</h3>
              <div className="flex gap-1">
                {TREND_METRIC_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setTrendMetric(opt.key)}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${trendMetric === opt.key ? 'bg-[#EA2C00] text-white' : 'bg-[#F5F5F5] text-[#999999] hover:text-[#666666]'}`}
                    data-testid={`trend-metric-${opt.key}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <TrendChart state={state} selectedMetric={trendMetric} />
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <DomainSignalCard
              name="Quality"
              question="Has documentation quality traveled downstream?"
              stakeholder="CMO, Quality & CDI"
              status={domainStatus.quality}
              metrics={qualityMetrics}
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
        )}

        <motion.div
          className="rounded-lg border border-[#E5E5E5] p-5 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          data-testid="section-formula"
        >
          <p className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A] mb-3">How We Calculated This</p>
          <div className="h-px bg-[#E5E5E5] mb-3" />
          <div className="space-y-1.5 text-sm text-[#666666] font-mono">
            <p>{formatNumber(adoptedEncounters)} encounters {"×"} {timeReclaimed} min {"÷"} 60 {"×"} 50% efficiency {"×"} ${state.calibration.otHourlyRate}/hr</p>
            {wrvuLift > 0 && (
              <p>+ {wrvuLift.toFixed(2)} wRVU lift {"×"} {formatNumber(adoptedEncounters)} encounters {"×"} ${state.calibration.conversionFactor} CF {"×"} 50{"–"}75% attribution</p>
            )}
            {months !== 12 && <p className="text-[#999999]">{"×"} 12/{months} months (annualized)</p>}
            <p className="font-semibold text-[#1A1A1A]">= {formatCurrency(confirmed.low)} {"–"} {formatCurrency(confirmed.high)} / year</p>
          </div>
          <div className="h-px bg-[#E5E5E5] my-3" />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#999999]">
            <span>Deployment period: {goLiveDisplay} {"→"} today ({months} months)</span>
            <span className="flex items-center gap-1">Data source: <DataSourceBadge source={state.dataSource} /></span>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl p-8 text-center mb-6"
          style={{ backgroundColor: '#1A1A1A' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          data-testid="section-confirmed-hero"
        >
          <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[2px] mb-1">
            Based on the above, here{"'"}s the annual value
          </p>
          <p className="text-4xl md:text-5xl font-bold text-white mb-3" data-testid="text-confirmed-range">
            {formatCurrency(confirmed.low)} {"–"} {formatCurrency(confirmed.high)}
            <span className="text-lg font-normal text-white/50"> / year</span>
          </p>
          <div className="flex items-center justify-center gap-2 mb-3">
            <DataSourceBadge source={state.dataSource} />
          </div>
          <p className="text-sm text-white/50">
            Across {state.deployment.providers} {isNursing ? 'nurses' : 'providers'} {"·"} {formatNumber(adoptedEncounters)} Abridge-documented {isNursing ? 'shifts' : isInpatient ? 'discharges' : 'encounters'}
          </p>
          <p className="text-sm text-white/40 mt-1">
            {"≈"} {formatCurrency(confirmed.perProviderLow)} {"–"} {formatCurrency(confirmed.perProviderHigh)} per {isNursing ? 'nurse' : 'provider'} per year
          </p>
          <p className="text-[10px] text-white/30 mt-3">
            conservative (50%) {"–"} typical (75%) attribution
          </p>
        </motion.div>

        <motion.p
          className="text-sm text-[#666666] text-center mb-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          data-testid="text-conclusion"
        >
          This is the value your data can already support. What follows is where that value can grow.
        </motion.p>

        {(state.customMetrics || []).filter((cm) => cm.label.trim()).length > 0 && (
          <motion.div
            className="bg-white rounded-lg border border-[#E5E5E5] p-5 mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
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
                    delay={0.55 + i * 0.05}
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
          className="flex justify-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-see-scenarios"
          >
            What You Could Earn
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
