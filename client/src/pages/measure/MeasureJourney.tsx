import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
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
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: i < count ? '#EA2C00' : '#E5E5E5' }}
        />
      ))}
      <span className="text-xs text-[#999999] ml-1 tabular-nums">{count}/{max}</span>
    </div>
  );
}

function MetricBar({ label, before, after, lowerIsBetter, unit, template, whyItMatters, delay = 0 }: {
  label: string;
  before: number;
  after: number;
  lowerIsBetter: boolean;
  unit: string;
  template: string;
  whyItMatters?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [delay]);

  const higherIsBetter = !lowerIsBetter;
  const delta = after - before;
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  const deltaPercent = before !== 0 ? (delta / before) * 100 : 0;
  const afterRatio = before !== 0 ? Math.min((after / before) * 100, 150) : 100;
  const interpretation = interpolateTemplate(template, before, after);
  const unitSuffix = unit ? ` ${unit}` : '';

  return (
    <div ref={ref} className="mb-6" data-testid={`metric-bar-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between mb-1">
        <span className="text-sm font-medium text-[#1A1A1A]">{label}</span>
        {visible && Math.abs(deltaPercent) > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-baseline gap-1 mb-1"
            data-testid="badge-pct-change"
          >
            <span className={`text-2xl font-bold tabular-nums ${improved ? 'text-[#16A34A]' : 'text-[#F87171]'}`}>
              {lowerIsBetter ? (improved ? '↓' : '↑') : (improved ? '↑' : '↓')}{Math.abs(deltaPercent).toFixed(1)}%
            </span>
          </motion.div>
        )}
      </div>

      <div className="my-3 space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#CCCCCC] w-10 flex-shrink-0 text-right">Before</span>
          <div className="flex-1 h-2 bg-[#C8C2BB] rounded-full" />
          <span className="text-xs text-[#999999] w-16 text-right tabular-nums">
            {before}{unitSuffix}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#CCCCCC] w-10 flex-shrink-0 text-right">After</span>
          <div className="flex-1 h-2 bg-[#C8C2BB] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#EA2C00]"
              initial={{ width: '100%' }}
              animate={{ width: visible ? `${afterRatio}%` : '100%' }}
              transition={{ delay: delay / 1000, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="text-xs font-semibold text-[#1A1A1A] w-16 text-right tabular-nums">
            {after}{unitSuffix}
          </span>
        </div>
      </div>

      {interpretation && (
        <p className="text-xs text-[#999999] mt-2 leading-relaxed">{interpretation}</p>
      )}
      {whyItMatters && (
        <p className="text-[10px] text-[#999999] mt-1.5 leading-relaxed border-t border-[#EDE8E3] pt-1.5">
          <span className="font-medium text-[#CCCCCC] uppercase tracking-wider text-[9px] mr-1">Signal</span>
          {whyItMatters.split('.')[0]}.
        </p>
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
        <div className="mb-10" data-testid="page-hero">
          <p className="text-xs uppercase tracking-[2px] text-[#999999] mb-2">
            {[state.deployment.organizationName, settingLabels, state.goLiveDate ? `Live since ${state.goLiveDate}` : '', months > 0 ? `${months} months` : ''].filter(Boolean).join(' · ')}
          </p>
          <h1 className="text-3xl font-bold font-abridge uppercase tracking-tight text-[#1A1A1A] mb-6" data-testid="text-page-title">
            The Journey at Abridge
          </h1>
          <div className="flex gap-8 pb-6 border-b border-[#F0F0F0]" data-testid="summary-strip">
            {[
              { label: 'Domains signaling', value: `${domainsSignaling} of 4` },
              { label: 'Metrics active', value: String(totalMetrics) },
              { label: 'Providers', value: String(state.deployment.providers) },
              { label: 'Encounters documented', value: state.deployment.totalEncounters > 0 ? state.deployment.totalEncounters.toLocaleString() : '—' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-[11px] text-[#999999] mb-0.5">{stat.label}</p>
                <p className="text-xl font-bold text-[#1A1A1A]">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {domainSections.map((section, si) => {
            const hasData = section.metrics.length > 0;

            return (
              <div
                key={section.domainKey}
                className="rounded-2xl border border-gray-200 transition-all bg-[#F5F0EB]"
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
                  <p className="text-sm text-[#666666] mb-5">
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
                          whyItMatters={m.metricDef.whyItMatters}
                          delay={si * 200 + mi * 100}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-4">
                      <p className="text-xs text-[#CCCCCC] mb-3">No data entered for this domain.</p>
                      {section.allMetricNames.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {section.allMetricNames.slice(0, 3).map((name, idx) => (
                            <div key={name} className="flex items-center gap-2 opacity-25">
                              <div className="h-1.5 rounded-full bg-[#C8C2BB]" style={{ width: `${40 + (idx * 17) % 40}%` }} />
                              <span className="text-xs text-[#999999]">{name}</span>
                            </div>
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
