import { useState, useMemo } from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  formatCurrency,
  formatNumber,
  deriveEngagementContext,
  calculateConfirmedValue,
  getActiveMetrics,
  getMonthsFromGoLive,
} from "@/lib/measureCalculator";
import { getMetricsForSettings, type MetricDefinition } from "@/lib/measureCareSettings";
import { EngagementContextBar } from "@/components/measure/EngagementContextBar";
import NarrativePanel from "@/components/measure/NarrativePanel";
import { generateNarrative } from "@/lib/measureNarrative";
import { useCountUp } from "@/hooks/useCountUp";

const DOMAIN_COLORS: Record<string, string> = {
  quality:    '#6366F1',
  workforce:  '#0EA5E9',
  revenue:    '#EA2C00',
  capacity:   '#10B981',
  throughput: '#10B981',
  patientFlow:'#10B981',
  staffing:   '#10B981',
  foundational: '#F59E0B',
};

const DOMAIN_DISPLAY_LABELS: Record<string, string> = {
  quality:    'Quality',
  workforce:  'Workforce',
  revenue:    'Revenue',
  capacity:   'Capacity',
  throughput: 'Throughput',
  patientFlow:'Patient Flow',
  staffing:   'Staffing',
  foundational: 'Foundational',
};

interface MetricCardProps {
  metricDef: MetricDefinition;
  before: number;
  after: number;
  monthlyData?: number[];
  settingLabel?: string;
  multiSettingRows?: { setting: string; before: number; after: number }[];
  isOrgWide: boolean;
  isFiltered: boolean;
  animationDelay: number;
  providers: number;
  encounters: number;
}

function MetricCard({
  metricDef,
  before,
  after,
  monthlyData,
  settingLabel,
  multiSettingRows,
  isOrgWide,
  isFiltered,
  animationDelay,
  providers,
  encounters,
}: MetricCardProps) {
  const [expanded, setExpanded] = useState(false);

  const delta = after - before;
  const deltaPercent = before !== 0 ? (delta / before) * 100 : 0;
  const higherIsBetter = !metricDef.lowerIsBetter;
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  const barFill = before !== 0 ? Math.min((after / before) * 100, 100) : 0;
  const domainColor = DOMAIN_COLORS[metricDef.domain] ?? '#EA2C00';

  const hasMonthly = monthlyData && monthlyData.length > 1;
  const monthlyPoints = hasMonthly
    ? monthlyData!.map((v, i) => ({ month: `M${i + 1}`, value: v }))
    : [];

  const plainEnglish = useMemo(() => {
    if (!metricDef.plainEnglishTemplate) return null;
    return metricDef.plainEnglishTemplate
      .replace(/\{\{?before\}?\}/g, String(before))
      .replace(/\{\{?after\}?\}/g, String(after))
      .replace(/\{\{?delta\}?\}/g, Math.abs(delta).toFixed(metricDef.unit === '%' ? 1 : 0))
      .replace(/\{\{?deltaPercent\}?\}/g, Math.abs(deltaPercent).toFixed(1))
      .replace(/\{\{?providers\}?\}/g, String(providers))
      .replace(/\{\{?encounters\}?\}/g, formatNumber(encounters))
      .replace(/\{\{?totalHours\}?\}/g, formatNumber(Math.round(Math.abs(delta) * encounters / 60)));
  }, [metricDef, before, after, delta, deltaPercent, providers, encounters]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: isFiltered ? 0.25 : 1,
        y: 0,
        boxShadow: isFiltered ? 'none' : undefined,
      }}
      transition={{ delay: animationDelay, duration: 0.3, opacity: { duration: 0.15 } }}
      className={`rounded-xl border bg-white cursor-pointer select-none ${
        isFiltered ? 'pointer-events-none' : 'hover:shadow-md'
      } ${expanded ? 'shadow-md' : 'border-[#E5E5E5]'}`}
      style={expanded ? { borderColor: domainColor + '40' } : {}}
      onClick={() => !isFiltered && setExpanded(e => !e)}
      data-testid={`metric-card-${metricDef.id}`}
    >
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#999999] mb-0.5">
              {DOMAIN_DISPLAY_LABELS[metricDef.domain] ?? metricDef.domain}
            </p>
            <h3 className="text-sm font-bold text-[#1A1A1A] leading-tight">{metricDef.label}</h3>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {isOrgWide && (
              <span className="text-[9px] uppercase tracking-wider text-[#999999] bg-[#F5F5F5] px-2 py-0.5 rounded-full">
                All settings
              </span>
            )}
            {settingLabel && !isOrgWide && (
              <span className="text-[9px] uppercase tracking-wider text-[#999999] bg-[#F5F5F5] px-2 py-0.5 rounded-full capitalize">
                {settingLabel}
              </span>
            )}
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: domainColor }} />
          </div>
        </div>

        {multiSettingRows && multiSettingRows.length > 0 ? (
          <div className="space-y-2">
            {multiSettingRows.map(row => {
              const rowDelta = row.after - row.before;
              const rowPct = row.before !== 0 ? (rowDelta / row.before) * 100 : 0;
              const rowImproved = higherIsBetter ? rowDelta > 0 : rowDelta < 0;
              return (
                <div key={row.setting} className="flex items-center gap-3">
                  <span className="text-[10px] text-[#999999] w-20 flex-shrink-0 capitalize">{row.setting}</span>
                  <span className="text-xs text-[#999999]">{row.before}{metricDef.unit ? ` ${metricDef.unit}` : ''}</span>
                  <span className="text-[10px] text-[#CCCCCC]">{'\u2192'}</span>
                  <span className="text-xs font-semibold text-[#1A1A1A]">{row.after}{metricDef.unit ? ` ${metricDef.unit}` : ''}</span>
                  <span className={`text-xs font-medium ml-auto ${rowImproved ? 'text-green-600' : 'text-red-500'}`}>
                    {rowImproved ? '\u2193' : '\u2191'} {Math.abs(rowPct).toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        ) : hasMonthly ? (
          <div>
            <ResponsiveContainer width="100%" height={60}>
              <AreaChart data={monthlyPoints} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${metricDef.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={domainColor} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={domainColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={domainColor}
                  strokeWidth={2}
                  fill={`url(#spark-${metricDef.id})`}
                  dot={false}
                  isAnimationActive
                  animationDuration={600}
                />
                <ReferenceLine y={before} stroke="#CCCCCC" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-[#999999]">
                Baseline: {before}{metricDef.unit ? ` ${metricDef.unit}` : ''}
                <span className="mx-2 text-[#E5E5E5]">{'\u2500\u2500'}</span>
                Now: {after}{metricDef.unit ? ` ${metricDef.unit}` : ''}
              </span>
              <span className={`text-sm font-bold ${improved ? 'text-green-600' : 'text-red-500'}`}>
                {improved ? '\u2193' : '\u2191'} {Math.abs(deltaPercent).toFixed(1)}%
              </span>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-[#999999] flex-shrink-0">
                {before}{metricDef.unit ? ` ${metricDef.unit}` : ''}
              </span>
              <div className="flex-1 relative h-3 bg-[#F0F0F0] rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: domainColor }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${barFill}%` }}
                  transition={{ delay: animationDelay + 0.2, duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-bold text-[#1A1A1A] flex-shrink-0">
                {after}{metricDef.unit ? ` ${metricDef.unit}` : ''}
              </span>
            </div>
            <div className="flex justify-end">
              <span className={`text-sm font-bold ${improved ? 'text-green-600' : 'text-red-500'}`}>
                {improved ? '\u2193' : '\u2191'} {Math.abs(deltaPercent).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-3 flex items-center justify-between">
        <span className="text-[10px] text-[#CCCCCC]">{expanded ? 'Less detail' : 'See detail'}</span>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-[#CCCCCC]" />
          : <ChevronDown className="w-3.5 h-3.5 text-[#CCCCCC]" />
        }
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-[#F0F0F0] pt-4 space-y-4">
              {plainEnglish && (
                <p className="text-sm text-[#444444] leading-relaxed">{plainEnglish}</p>
              )}

              {hasMonthly && (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyPoints} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                      <XAxis dataKey="month" tick={{ fill: '#999999', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#999999', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E5E5',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                      <ReferenceLine y={before} stroke="#CCCCCC" strokeDasharray="4 4" label={{ value: 'Baseline', fill: '#CCCCCC', fontSize: 9 }} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={domainColor}
                        strokeWidth={2.5}
                        dot={{ fill: domainColor, r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: domainColor }}
                        isAnimationActive
                        animationDuration={600}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <p className="text-[11px] text-[#999999] leading-relaxed border-t border-[#F5F5F5] pt-3">
                {metricDef.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface MeasureTransformationProps {
  state: MeasureState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureTransformation({ state, onNext, onBack, onHome }: MeasureTransformationProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const context = useMemo(() => deriveEngagementContext(state), [state]);
  const confirmed = useMemo(() => calculateConfirmedValue(state), [state]);
  const narrative = useMemo(() => generateNarrative('confirmed', state), [state]);
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);
  const activeMetrics = useMemo(() => getActiveMetrics(state), [state]);

  const animatedLow = useCountUp(confirmed.low);
  const animatedHigh = useCountUp(confirmed.high);

  const settings = useMemo(() => {
    return state.activeCareSettings?.length > 0
      ? state.activeCareSettings
      : [state.careSetting || 'outpatient' as MeasureCareSetting];
  }, [state.activeCareSettings, state.careSetting]);

  const allMetricDefs = useMemo(() => {
    const defs = getMetricsForSettings(settings);
    const map = new Map<string, MetricDefinition>();
    defs.forEach(({ metric }) => map.set(metric.id, metric));
    return map;
  }, [settings]);

  const cardData = useMemo(() => {
    const grouped = new Map<string, {
      metricDef: MetricDefinition;
      before: number;
      after: number;
      monthlyData?: number[];
      isOrgWide: boolean;
      settingLabel?: string;
      multiSettingRows?: { setting: string; before: number; after: number }[];
    }>();

    for (const m of activeMetrics) {
      const def = allMetricDefs.get(m.metricId);
      if (!def) continue;

      if (grouped.has(m.metricId)) {
        const existing = grouped.get(m.metricId)!;
        if (!existing.multiSettingRows) {
          existing.multiSettingRows = [
            { setting: existing.settingLabel || 'outpatient', before: existing.before, after: existing.after },
          ];
        }
        existing.multiSettingRows.push({
          setting: m.setting || '',
          before: m.before,
          after: m.after,
        });
      } else {
        grouped.set(m.metricId, {
          metricDef: def,
          before: m.before,
          after: m.after,
          monthlyData: m.monthlyData,
          isOrgWide: m.isOrgWide,
          settingLabel: m.setting,
        });
      }
    }

    return Array.from(grouped.values());
  }, [activeMetrics, allMetricDefs]);

  const activeDomains = useMemo(() => {
    const seen = new Set<string>();
    const domains: string[] = [];
    for (const c of cardData) {
      if (!seen.has(c.metricDef.domain)) {
        seen.add(c.metricDef.domain);
        domains.push(c.metricDef.domain);
      }
    }
    return domains;
  }, [cardData]);

  const goLiveDisplay = state.goLiveDate
    ? new Date(state.goLiveDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : `${months} months ago`;

  const isNursing = settings.includes('nursing');
  const isInpatient = settings.includes('inpatient');
  const adoptedEncounters = Math.round(state.deployment.totalEncounters * (state.deployment.utilizationRate / 100));
  const nonAdoptedEncounters = state.deployment.totalEncounters - adoptedEncounters;
  const timeReclaimed = Math.max(0, (state.timeEfficiency?.timeInNotesWithout ?? 0) - (state.timeEfficiency?.timeInNotesWith ?? 0));
  const wrvuLift = (state.documentationQuality?.wrvuWith ?? 0) - (state.documentationQuality?.wrvuWithout ?? 0);

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

      <div className="max-w-[860px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <EngagementContextBar context={context} dataSource={state.dataSource} organizationName={state.deployment.organizationName} />
        <NarrativePanel narrative={narrative} />

        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-page-title"
          >
            What Your Data Shows
          </h1>
          <div className="flex items-center justify-center gap-2 flex-wrap text-sm text-[#888888]">
            {state.deployment.organizationName && (
              <span className="font-medium text-[#1A1A1A]">{state.deployment.organizationName}</span>
            )}
            {settings.map(s => (
              <span key={s} className="bg-[#F5F0EB] text-[#666666] px-2.5 py-0.5 rounded-full text-xs capitalize">
                {s}
              </span>
            ))}
            <span>{'\u00B7'}</span>
            <span>{months} months with Abridge</span>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl p-8 text-center mb-8"
          style={{ backgroundColor: '#1A1A1A' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          data-testid="hero-confirmed-value"
        >
          <p className="text-[11px] font-semibold text-white/50 uppercase tracking-[2px] mb-2">
            Confirmed Value {'\u2014'} {months} Months
          </p>
          <p className="text-4xl md:text-5xl font-bold text-white mb-3 tabular-nums">
            {formatCurrency(animatedLow)}
            <span className="text-white/30 mx-3">{'\u2014'}</span>
            {formatCurrency(animatedHigh)}
            <span className="text-lg font-normal text-white/40 ml-1">/ year</span>
          </p>
          <p className="text-sm text-white/40">
            {state.deployment.providers} {isNursing ? 'nurses' : 'providers'}
            {' \u00B7 '}
            {formatNumber(adoptedEncounters)} Abridge-documented {isNursing ? 'shifts' : isInpatient ? 'discharges' : 'encounters'}
            {' \u00B7 '}
            {goLiveDisplay} {'\u2192'} today
          </p>
          <p className="text-xs text-white/25 mt-2">
            conservative (50%) {'\u2014'} typical (75%) attribution
          </p>
        </motion.div>

        {cardData.length === 0 && (
          <div className="text-center py-16 text-[#999999]" data-testid="empty-state">
            <p className="text-sm">No metrics entered yet.</p>
            <button onClick={onBack} className="mt-3 text-sm text-[#EA2C00] underline" data-testid="button-go-back">
              Go back to add metrics
            </button>
          </div>
        )}

        {cardData.length > 0 && activeDomains.length > 1 && (
          <motion.div
            className="flex items-center gap-2 mb-6 flex-wrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            data-testid="domain-filter-strip"
          >
            <button
              onClick={() => setActiveFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeFilter === null
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-[#F5F5F5] text-[#666666] hover:bg-[#EBEBEB]'
              }`}
              data-testid="filter-all"
            >
              All
            </button>
            {activeDomains.map(domain => (
              <button
                key={domain}
                onClick={() => setActiveFilter(domain === activeFilter ? null : domain)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeFilter === domain
                    ? 'text-white'
                    : 'bg-[#F5F5F5] text-[#666666] hover:bg-[#EBEBEB]'
                }`}
                style={activeFilter === domain ? { backgroundColor: DOMAIN_COLORS[domain] ?? '#EA2C00' } : {}}
                data-testid={`filter-${domain}`}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: activeFilter === domain ? 'white' : DOMAIN_COLORS[domain] ?? '#EA2C00' }}
                />
                {DOMAIN_DISPLAY_LABELS[domain] ?? domain}
              </button>
            ))}
          </motion.div>
        )}

        {cardData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8" data-testid="metric-cards-grid">
            {cardData.map((card, i) => (
              <div
                key={card.metricDef.id}
                className={card.monthlyData && card.monthlyData.length > 1 ? 'md:col-span-2' : ''}
              >
                <MetricCard
                  metricDef={card.metricDef}
                  before={card.before}
                  after={card.after}
                  monthlyData={card.monthlyData}
                  settingLabel={card.settingLabel}
                  multiSettingRows={card.multiSettingRows}
                  isOrgWide={card.isOrgWide}
                  isFiltered={activeFilter !== null && card.metricDef.domain !== activeFilter}
                  animationDelay={0.15 + i * 0.05}
                  providers={state.deployment.providers}
                  encounters={state.deployment.totalEncounters}
                />
              </div>
            ))}
          </div>
        )}

        <motion.div
          className="rounded-lg border border-[#E5E5E5] mb-8 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          data-testid="methodology-section"
        >
          <button
            className="w-full flex items-center justify-between px-5 py-4 bg-white"
            onClick={() => setMethodologyOpen(o => !o)}
            data-testid="methodology-toggle"
          >
            <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#1A1A1A]">Methodology</span>
            {methodologyOpen
              ? <ChevronUp className="w-4 h-4 text-[#999999]" />
              : <ChevronDown className="w-4 h-4 text-[#999999]" />
            }
          </button>

          <AnimatePresence>
            {methodologyOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 border-t border-[#F0F0F0] pt-4 space-y-4">
                  <div className="space-y-1.5 text-sm text-[#666666] font-mono">
                    <p>{formatNumber(adoptedEncounters)} encounters {'\u00D7'} {timeReclaimed} min {'\u00F7'} 60 {'\u00D7'} 50% efficiency {'\u00D7'} ${state.calibration?.otHourlyRate ?? 150}/hr</p>
                    {wrvuLift > 0 && (
                      <p>+ {wrvuLift.toFixed(2)} wRVU lift {'\u00D7'} {formatNumber(adoptedEncounters)} encounters {'\u00D7'} ${state.calibration?.conversionFactor ?? 52} CF {'\u00D7'} 50{'\u2013'}75% attribution</p>
                    )}
                    {months !== 12 && (
                      <p className="text-[#999999]">{'\u00D7'} 12/{months} months (annualized)</p>
                    )}
                    <p className="font-semibold text-[#1A1A1A]">
                      = {formatCurrency(confirmed.low)} {'\u2014'} {formatCurrency(confirmed.high)} / year
                    </p>
                  </div>

                  {state.deployment.utilizationRate < 100 && (
                    <div className="bg-[#F5F0EB] rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-1 bg-[#EA2C00] rounded-full self-stretch flex-shrink-0" />
                        <p className="text-xs text-[#666666] leading-relaxed">
                          At {state.deployment.utilizationRate}% adoption, these results reflect {formatNumber(adoptedEncounters)} of {formatNumber(state.deployment.totalEncounters)} total {isNursing ? 'shifts' : isInpatient ? 'discharges' : 'encounters'}. The remaining {formatNumber(nonAdoptedEncounters)} represent additional headroom at current provider count.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={onNext}
            className="h-[52px] px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-next"
          >
            What You Could Earn
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
