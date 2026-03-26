import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type MeasureState,
  type MeasureCareSetting,
  getActiveMetrics,
  getMonthsFromGoLive,
} from "@/lib/measureCalculator";
import {
  CARE_SETTING_CONFIGS,
  DOMAIN_LABELS,
  getMetricsForSettings,
  type DomainKey,
  type MetricDefinition,
} from "@/lib/measureCareSettings";

const SETTING_DISPLAY_LABELS: Record<string, string> = {
  outpatient: 'Outpatient',
  ed: 'ED',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

interface MeasureJourneyProps {
  state: MeasureState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const FOURTH_DOMAIN_VARIANTS: DomainKey[] = ['capacity', 'throughput', 'patientFlow', 'staffing'];

function getFourthDomain(settings: MeasureCareSetting[]): { key: DomainKey; label: string } {
  const primary = settings[0] || 'outpatient';
  const config = CARE_SETTING_CONFIGS[primary];
  return { key: config.fourthDomainKey, label: config.fourthDomainLabel };
}

const DOMAIN_QUESTIONS: Record<string, string> = {
  quality: 'What changed in documentation quality?',
  workforce: 'How has clinician time and wellbeing shifted?',
  revenue: 'Has documentation quality reached the bottom line?',
  capacity: 'What is the organization doing with freed time?',
  throughput: 'How has patient throughput improved?',
  patientFlow: 'What is the impact on patient movement?',
  staffing: 'Has burden reduction improved staffing stability?',
  foundational: 'Is the Abridge platform being adopted effectively?',
};

function interpolateTemplate(template: string, before: number, after: number): string {
  const delta = Math.abs(after - before);
  const pctChange = before !== 0 ? Math.round(Math.abs((after - before) / before) * 100) : 0;
  let result = template;
  result = result.replace(/\{\{?before\}?\}/gi, String(before));
  result = result.replace(/\{\{?after\}?\}/gi, String(after));
  result = result.replace(/\{\{?delta\}?\}/gi, String(delta.toFixed(1)));
  result = result.replace(/\{\{?pctChange\}?\}/gi, `${pctChange}%`);
  result = result.replace(/\{\{?\w+\}?\}/g, '');
  result = result.replace(/\$[\d,.]+/g, '');
  result = result.replace(/\s{2,}/g, ' ').trim();
  if (!result || result.length < 5) return '';
  return result;
}

function SignalDots({ count, max = 4 }: { count: number; max?: number }) {
  return (
    <div className="flex items-center gap-1.5" data-testid="signal-dots">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-colors ${i < count ? 'bg-[#EA2C00]' : 'bg-gray-200'}`}
        />
      ))}
      <span className="text-xs text-gray-400 ml-1">{count} of {max} signals</span>
    </div>
  );
}

function MetricBar({ label, before, after, lowerIsBetter, unit, template, delay = 0 }: {
  label: string;
  before: number;
  after: number;
  lowerIsBetter: boolean;
  unit: string;
  template: string;
  delay?: number;
}) {
  const [animated, setAnimated] = useState(false);
  const [showDelta, setShowDelta] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer1: ReturnType<typeof setTimeout>;
    let timer2: ReturnType<typeof setTimeout>;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer1 = setTimeout(() => setAnimated(true), delay);
          timer2 = setTimeout(() => setShowDelta(true), delay + 800);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [delay]);

  const maxVal = Math.max(before, after);
  const beforeWidth = maxVal > 0 ? (before / maxVal) * 100 : 0;
  const afterWidth = maxVal > 0 ? (after / maxVal) * 100 : 0;

  const higherIsBetter = !lowerIsBetter;
  const delta = after - before;
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  const pctChange = before !== 0 ? Math.round(Math.abs(delta / before) * 100) : 0;
  const arrow = improved ? (delta < 0 ? '↓' : '↑') : (delta < 0 ? '↓' : '↑');
  const interpretation = interpolateTemplate(template, before, after);

  return (
    <div ref={ref} className="mb-6" data-testid={`metric-bar-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {showDelta && pctChange > 0 && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={`text-lg font-bold ${improved ? 'text-[#EA2C00]' : 'text-red-500'}`}
            data-testid="badge-pct-change"
          >
            {arrow} {pctChange}%
          </motion.span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-10 shrink-0">Before</span>
          <div className="flex-1 relative h-6 rounded bg-gray-100 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded bg-[#E5E5E5]"
              initial={{ width: 0 }}
              animate={{ width: animated ? `${beforeWidth}%` : 0 }}
              transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1], delay: delay / 1000 }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-500 w-16 text-right shrink-0">{before}{unit}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-10 shrink-0">After</span>
          <div className="flex-1 relative h-6 rounded bg-gray-100 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded bg-[#EA2C00]"
              initial={{ width: 0 }}
              animate={{ width: animated ? `${afterWidth}%` : 0 }}
              transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1], delay: (delay / 1000) + 0.15 }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-16 text-right shrink-0">{after}{unit}</span>
        </div>
      </div>

      {interpretation && (
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">{interpretation}</p>
      )}
    </div>
  );
}

interface DomainSectionData {
  domainKey: DomainKey;
  label: string;
  metrics: {
    metricDef: MetricDefinition;
    before: number;
    after: number;
    setting?: MeasureCareSetting;
  }[];
  allMetricNames: string[];
}

export default function MeasureJourney({
  state,
  onNext,
  onBack,
  onHome,
}: MeasureJourneyProps) {
  const activeSettings = state.activeCareSettings?.length
    ? state.activeCareSettings
    : [state.careSetting || 'outpatient'];

  const fourthDomain = useMemo(() => getFourthDomain(activeSettings), [activeSettings]);
  const allResolved = useMemo(() => getMetricsForSettings(activeSettings), [activeSettings]);
  const activeMetrics = useMemo(() => getActiveMetrics(state), [state]);

  const domainSections = useMemo(() => {
    const fourDomainKeys: DomainKey[] = ['quality', 'workforce', 'revenue', fourthDomain.key];
    const fourDomainLabels: Record<string, string> = {
      quality: 'Quality',
      workforce: 'Workforce',
      revenue: 'Revenue',
      [fourthDomain.key]: fourthDomain.label,
    };

    const metricDefMap = new Map<string, MetricDefinition>();
    for (const rm of allResolved) {
      metricDefMap.set(rm.metric.id, rm.metric);
    }

    const domainMetricNames = new Map<DomainKey, string[]>();
    for (const dk of fourDomainKeys) {
      domainMetricNames.set(dk, []);
    }
    for (const rm of allResolved) {
      const dk = rm.metric.domain as DomainKey;
      let targetDk: DomainKey;
      if (dk === 'foundational') {
        continue;
      } else if (FOURTH_DOMAIN_VARIANTS.includes(dk) && dk !== fourthDomain.key) {
        targetDk = fourthDomain.key;
      } else if (domainMetricNames.has(dk)) {
        targetDk = dk;
      } else {
        continue;
      }
      const names = domainMetricNames.get(targetDk)!;
      if (!names.includes(rm.metric.label)) {
        names.push(rm.metric.label);
      }
    }

    const sectionMap = new Map<DomainKey, DomainSectionData>();
    for (const dk of fourDomainKeys) {
      sectionMap.set(dk, {
        domainKey: dk,
        label: fourDomainLabels[dk] || DOMAIN_LABELS[dk] || dk,
        metrics: [],
        allMetricNames: domainMetricNames.get(dk) || [],
      });
    }

    for (const am of activeMetrics) {
      const def = metricDefMap.get(am.metricId);
      if (!def) continue;
      const dk = def.domain as DomainKey;

      let targetDk: DomainKey;
      if (dk === 'foundational') {
        continue;
      } else if (FOURTH_DOMAIN_VARIANTS.includes(dk) && dk !== fourthDomain.key) {
        targetDk = fourthDomain.key;
      } else if (sectionMap.has(dk)) {
        targetDk = dk;
      } else {
        continue;
      }

      sectionMap.get(targetDk)!.metrics.push({
        metricDef: def,
        before: am.before,
        after: am.after,
        setting: am.setting,
      });
    }

    return fourDomainKeys.map(dk => sectionMap.get(dk)!);
  }, [activeMetrics, allResolved, fourthDomain]);

  const domainsSignaling = domainSections.filter(ds => ds.metrics.length > 0).length;
  const totalMetrics = activeMetrics.length;
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);
  const settingLabels = activeSettings.map(s => SETTING_DISPLAY_LABELS[s] || s).join(' · ');

  return (
    <div className="min-h-screen bg-[#FAFAFA]" data-testid="page-journey">
      <UnifiedHeader
        pathType="measure"
        currentStep={3}
        totalSteps={5}
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            The Journey at Abridge
          </h1>
          <p className="text-sm text-gray-400">
            {[state.deployment.organizationName, settingLabels, months > 0 ? `${months} months` : ''].filter(Boolean).join(' · ')}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8 p-4 bg-[#FFF8F2] rounded-xl" data-testid="summary-strip">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow-sm">
            <span className="text-sm font-bold text-gray-800">{domainsSignaling}</span>
            <span className="text-xs text-gray-500">Signal{domainsSignaling !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow-sm">
            <span className="text-sm font-bold text-gray-800">{totalMetrics}</span>
            <span className="text-xs text-gray-500">Metric{totalMetrics !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow-sm">
            <span className="text-sm font-bold text-gray-800">{state.deployment.providers}</span>
            <span className="text-xs text-gray-500">Providers</span>
          </div>
          {state.deployment.totalEncounters > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg shadow-sm">
              <span className="text-sm font-bold text-gray-800">{state.deployment.totalEncounters.toLocaleString()}</span>
              <span className="text-xs text-gray-500">Encounters</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {domainSections.map((section, si) => {
            const hasData = section.metrics.length > 0;

            return (
              <div
                key={section.domainKey}
                className="rounded-2xl border border-gray-200 transition-all bg-white"
                style={{ borderLeftWidth: '4px', borderLeftColor: hasData ? '#EA2C00' : '#E5E5E5' }}
                data-testid={`journey-domain-${section.domainKey}`}
              >
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-bold uppercase tracking-tight text-[#1A1A1A] font-abridge">
                      {section.label}
                    </h3>
                    <SignalDots count={Math.min(section.metrics.length, 4)} />
                  </div>
                  <p className="text-xs text-gray-400 mb-5">
                    {DOMAIN_QUESTIONS[section.domainKey] || ''}
                  </p>

                  {hasData ? (
                    <div>
                      {section.metrics.map((m, mi) => (
                        <MetricBar
                          key={`${m.metricDef.id}-${m.setting || 'org'}`}
                          label={m.setting ? `${m.metricDef.label} (${SETTING_DISPLAY_LABELS[m.setting] || m.setting})` : m.metricDef.label}
                          before={m.before}
                          after={m.after}
                          lowerIsBetter={m.metricDef.lowerIsBetter}
                          unit={m.metricDef.unit}
                          template={m.metricDef.plainEnglishTemplate}
                          delay={si * 200 + mi * 100}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-2">
                      <p className="text-xs text-gray-300 mb-3">No data yet</p>
                      {section.allMetricNames.length > 0 && (
                        <div className="space-y-1 mb-4">
                          {section.allMetricNames.map(name => (
                            <p key={name} className="text-xs text-gray-300 opacity-30">· {name}</p>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={onBack}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#EA2C00] hover:text-[#D12800]"
                        data-testid={`link-add-metrics-${section.domainKey}`}
                      >
                        ← Back to add metrics
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalMetrics === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400 mb-4">No metrics have been measured yet.</p>
            <Button
              onClick={onBack}
              variant="outline"
              className="rounded-full"
              data-testid="button-go-back-add"
            >
              Go back and add metrics
            </Button>
          </div>
        )}

        {totalMetrics > 0 && (
          <div className="mt-10 flex flex-col items-center gap-3" data-testid="cta-section">
            <Button
              onClick={onNext}
              className="bg-[#EA2C00] hover:bg-[#D12800] text-white px-8 py-3 rounded-full text-sm font-semibold shadow-md"
              data-testid="button-next"
            >
              What Could This Mean Financially
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
