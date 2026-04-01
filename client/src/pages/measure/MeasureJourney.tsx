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

function computeDomainNarrative(
  domainKey: string,
  metrics: { metricDef: MetricDefinition; before: number; after: number }[],
  months: number,
  providers: number,
): string {
  const ids = new Set(metrics.map(m => m.metricDef.id));
  const get = (id: string) => metrics.find(m => m.metricDef.id === id);
  const absDelta = (b: number, a: number) => Math.abs(a - b).toFixed(1);
  const monthsLabel = months > 0 ? `over the past ${months} months` : 'since go-live';

  if (domainKey === 'quality') {
    const star = get('note_star_rating');
    const cap = get('diagnosis_capture');
    const spec = get('diagnosis_specificity');

    if (star && cap && spec)
      return `Note quality, diagnosis capture, and coding specificity are all moving in the right direction since go-live. That\u2019s not one thing \u2014 that\u2019s the documentation itself getting better in ways that touch quality programs, billing, and risk adjustment all at once.`;
    if (cap && spec)
      return `Two things happen when documentation improves: more diagnoses get captured, and they get coded more precisely. Both are moving here. Capture is up ${absDelta(cap.before, cap.after)}pp, specificity is up ${absDelta(spec.before, spec.after)}pp. What used to get missed or undercoded is now showing up in the record.`;
    if (star && cap)
      return `Note quality ratings moved from ${star.before} to ${star.after} stars, and diagnosis capture improved ${absDelta(cap.before, cap.after)}pp \u2014 both ${monthsLabel}. When providers rate notes highly and more diagnoses make it into the record, the documentation is doing its job.`;
    if (star)
      return `Note star rating is how your providers score the quality of what Abridge generates \u2014 accuracy, completeness, clinical tone. When it\u2019s high, providers are using the note with minimal edits. Yours moved from ${star.before} to ${star.after} ${monthsLabel}. That\u2019s the foundation everything else builds on.`;
    if (cap)
      return `Diagnosis capture measures how many of the conditions discussed in a visit actually make it into the coded record. When it\u2019s low, you\u2019re having clinical conversations that disappear \u2014 they don\u2019t show up in billing, in quality data, or in risk scores. Yours improved ${absDelta(cap.before, cap.after)}pp since go-live. More of what\u2019s being said in those rooms is now documented and codeable.`;
    if (spec)
      return `ICD-10 has thousands of codes, and there\u2019s usually a vague version and a precise version of the same diagnosis. Coders can only use what\u2019s in the note. Specificity measures how often you\u2019re hitting the precise one. Yours is up ${absDelta(spec.before, spec.after)}pp \u2014 more conditions are being captured at their highest ICD-10 level, which matters for reimbursement accuracy and quality measure credit.`;
  }

  if (domainKey === 'workforce') {
    const ttc = get('time_to_close');
    const ahp = get('work_after_hours_perceived');
    const ahe = get('work_outside_work_empirical');
    const burn = get('burnout_assessment');
    const lts = get('likelihood_to_stay');
    const ah = ahp || ahe;

    if (ttc && ah && lts)
      return `Three workforce metrics moved since go-live. Documentation time is down, after-hours burden is down, and provider sentiment about staying improved. That\u2019s not noise \u2014 three signals moving in the same direction, over ${months} months, is a pattern worth naming in the room.`;
    if (ttc && lts)
      return `Time to close dropped from ${ttc.before} to ${ttc.after} hours \u2014 that\u2019s the burden measure. Likelihood to stay improved ${absDelta(lts.before, lts.after)}pp \u2014 that\u2019s the sentiment measure. These two don\u2019t usually move together unless something fundamental changed about how providers experience documentation. Both moved here.`;
    if (ttc && ah)
      return `Two things moved here. Time to close dropped from ${ttc.before} to ${ttc.after} hours \u2014 that\u2019s the in-clinic side. And the share of providers reporting after-hours documentation work fell from ${ah.before}% to ${ah.after}% \u2014 that\u2019s the after-clinic side. When both move together, it means the burden shift is real, not just perceived.`;
    if (ttc)
      return `Time to close is how long it takes from the end of a patient visit to a signed note. It\u2019s the most direct measure of documentation burden \u2014 it\u2019s what providers think about when they talk about staying late, finishing charts at home. Yours dropped from ${ttc.before} to ${ttc.after} hours ${monthsLabel}. Across ${providers} providers seeing patients every day, that\u2019s a meaningful change in how their time is actually spent.`;
    if (ah && lts)
      return `After-hours documentation burden fell from ${ah.before}% to ${ah.after}% of the provider cohort, and likelihood to stay improved ${absDelta(lts.before, lts.after)}pp. Burden and retention sentiment moving together is a meaningful signal \u2014 one typically precedes the other.`;
    if (lts)
      return `Likelihood to stay comes from asking providers directly: do you expect to still be here in 12 months? It\u2019s a leading indicator \u2014 it moves before turnover shows up in the data. The reason it matters financially is that every physician departure costs roughly $350K\u2013$500K in recruitment, onboarding, and productivity loss. Yours improved ${absDelta(lts.before, lts.after)}pp across the cohort. That shift in sentiment is worth watching.`;
    if (ah)
      return `This measures what percentage of your providers are doing documentation work outside scheduled hours \u2014 evenings, weekends, from home. It\u2019s not just about productivity. It\u2019s about where work ends. That share fell from ${ah.before}% to ${ah.after}% since go-live. For ${providers} providers, that\u2019s a change in what their evenings look like.`;
    if (burn)
      return `Burnout scores come from validated instruments that ask about emotional exhaustion and sense of effectiveness. High scores predict departure intent. Yours moved ${absDelta(burn.before, burn.after)} points in the right direction since go-live. One data point isn\u2019t a conclusion \u2014 but it\u2019s the right kind of early signal.`;
  }

  if (domainKey === 'revenue') {
    const wrvu = get('wrvu');
    const em = get('em_level');
    const hcc = get('hcc_capture');
    const cc = get('clean_claim_rate');

    if (wrvu && hcc)
      return `Both wRVU and HCC capture have moved since go-live \u2014 that\u2019s fee-for-service and risk adjustment moving together. wRVU is up ${absDelta(wrvu.before, wrvu.after)}, HCC capture improved ${absDelta(hcc.before, hcc.after)}pp. The documentation is supporting more complete coding across two distinct financial pathways at the same time.`;
    if (wrvu && em)
      return `Two billing metrics are moving in the right direction. wRVU per encounter is up ${absDelta(wrvu.before, wrvu.after)} and average E/M level shifted from ${em.before} to ${em.after}. Both are consistent with documentation that gives coders more clinical detail to work with. The visits didn\u2019t change \u2014 the documentation supporting them did.`;
    if (wrvu)
      return `A wRVU \u2014 work relative value unit \u2014 is how Medicare prices the complexity of physician work. Each E/M code maps to a wRVU value, and that\u2019s what insurers pay against. More complete documentation means coders can justify higher values for the same visit. Yours moved from ${wrvu.before} to ${wrvu.after} per encounter ${monthsLabel}. More of what your providers actually did is now showing up in what you bill.`;
    if (em)
      return `E/M levels run 99211 to 99215 \u2014 they\u2019re the billing codes for office visits, differentiated by clinical complexity and documentation thoroughness. Coders can only code to what the note supports. Yours moved from ${em.before} to ${em.after} since go-live. The visits didn\u2019t change \u2014 the documentation supporting them did.`;
    if (hcc)
      return `HCC stands for Hierarchical Condition Category \u2014 it\u2019s how Medicare Advantage plans get paid by CMS based on how sick their enrolled population is, documented. When a chronic condition gets coded, it contributes to the risk score. When it doesn\u2019t, that revenue goes uncaptured. Your capture rate improved ${absDelta(hcc.before, hcc.after)}pp since go-live. More of those risk-adjustable conditions are making it into the record.`;
    if (cc)
      return `A clean claim is one accepted on first submission without correction. When it\u2019s denied, someone has to rework it \u2014 that costs time and delays payment. Your clean claim rate improved ${absDelta(cc.before, cc.after)}pp since go-live. Documentation quality is reducing the most common reason claims come back.`;
  }

  if (['capacity', 'throughput', 'patientFlow', 'staffing'].includes(domainKey)) {
    const tin = get('time_in_note');
    const eff = get('effort_reduction');
    const ppp = get('patients_per_provider_month');
    const vph = get('visits_per_clinician_hour');

    if (tin && ppp)
      return `These two numbers tell the capacity story. Documentation time per appointment dropped from ${tin.before} to ${tin.after} minutes \u2014 that\u2019s the input. Patients seen per provider per month moved from ${ppp.before} to ${ppp.after} \u2014 that\u2019s the output. Less time in the note, more time with patients.`;
    if (tin)
      return `This measures how many minutes a provider spends actively in the note per appointment \u2014 typing, reviewing, editing. It\u2019s the input side of the capacity equation. Yours dropped from ${tin.before} to ${tin.after} minutes per visit ${monthsLabel}. The question that follows naturally is: where does that time go? The next screen gets at that.`;
    if (ppp)
      return `This is the output side of the capacity equation \u2014 how many patients a provider sees per month. When documentation time comes down, this is where it shows up if the organization directs that time back into access. Yours moved from ${ppp.before} to ${ppp.after} per provider per month. That\u2019s ${absDelta(ppp.before, ppp.after)} additional patients per provider.`;
    if (vph)
      return `Visits per clinician hour measures how efficiently providers move through patient volume. More visits per hour without additional staff is a direct capacity lever. Yours moved from ${vph.before} to ${vph.after} since go-live.`;
    if (eff)
      return `This is a self-reported measure \u2014 providers estimating how much lighter the documentation burden feels compared to before. It\u2019s directional, not precise. But ${eff.after}% reported reduction across ${providers} providers is a signal worth including. Perceived burden is what shows up in retention surveys before it shows up in turnover data.`;
  }

  return '';
}

const DOMAIN_FINANCIAL_FOOTER: Record<string, string> = {
  quality: 'Diagnosis capture and specificity connect to billing capture and HCC value on the next screen',
  workforce: 'Time and sentiment data feed the workforce retention cost model on the next screen',
  revenue: 'This data feeds directly into the financial calculation on the next screen',
  capacity: 'Capacity data connects to the access revenue calculation on the next screen',
  throughput: 'Throughput data connects to the access revenue calculation on the next screen',
  patientFlow: 'Patient flow data connects to the capacity calculation on the next screen',
  staffing: 'Staffing data connects to the workforce cost model on the next screen',
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

function MetricBar({ label, before, after, lowerIsBetter, unit, template, delay = 0 }: {
  label: string;
  before: number;
  after: number;
  lowerIsBetter: boolean;
  unit: string;
  template: string;
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
  const interpretation = interpolateTemplate(template, before, after);
  const unitSuffix = unit ? ` ${unit}` : '';

  const maxVal = Math.max(before, after, 0.001);
  const beforePct = (before / maxVal) * 100;
  const afterPct = (after / maxVal) * 100;

  const arrow = lowerIsBetter
    ? (improved ? '\u2193' : '\u2191')
    : (improved ? '\u2191' : '\u2193');

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
            <span className={`text-2xl font-bold tabular-nums ${improved ? 'text-[#EA2C00]' : 'text-[#F87171]'}`}>
              {arrow}{Math.abs(deltaPercent).toFixed(1)}%
            </span>
          </motion.div>
        )}
      </div>

      <div className="my-3 space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#CCCCCC] w-10 flex-shrink-0 text-right">Before</span>
          <div className="flex-1 relative h-2">
            <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-[#EDE8E3]" />
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-[#C8C2BB]"
              initial={{ width: '0%' }}
              animate={{ width: visible ? `${beforePct}%` : '0%' }}
              transition={{ delay: delay / 1000, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="text-xs text-[#999999] w-16 text-right tabular-nums">
            {before}{unitSuffix}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#CCCCCC] w-10 flex-shrink-0 text-right">After</span>
          <div className="flex-1 relative h-2">
            <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-[#EDE8E3]" />
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-[#EA2C00]"
              initial={{ width: '0%' }}
              animate={{ width: visible ? `${afterPct}%` : '0%' }}
              transition={{ delay: delay / 1000 + 0.12, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
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
  const settingLabels = activeSettings.map(s => SETTING_DISPLAY_LABELS[s] || s).join(' \u00b7 ');

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
          <p className="text-xs uppercase tracking-[2px] text-[#999999] mb-3">
            {[
              state.deployment.organizationName,
              settingLabels,
              months > 0 ? `${months} months with Abridge` : null,
            ].filter(Boolean).join(' \u00b7 ')}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold font-abridge uppercase tracking-tight text-[#1A1A1A] mb-5" data-testid="text-page-title">
            Here's what changed.
          </h1>
          <div className="flex flex-wrap gap-6 pb-6 border-b border-[#EEEBE7]" data-testid="summary-strip">
            {[
              { label: 'Providers', value: String(state.deployment.providers || '\u2014') },
              { label: 'Encounters documented', value: state.deployment.totalEncounters > 0 ? state.deployment.totalEncounters.toLocaleString() : '\u2014' },
              { label: 'Domains with data', value: `${domainsSignaling} of 4` },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-[11px] text-[#AAAAAA] mb-0.5">{stat.label}</p>
                <p className="text-lg font-bold text-[#1A1A1A]">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-10">
          {domainSections.map((section, si) => {
            const hasData = section.metrics.length > 0;
            const narrative = hasData
              ? computeDomainNarrative(
                  section.domainKey,
                  section.metrics,
                  months,
                  state.deployment.providers || 0,
                )
              : '';
            const footer = DOMAIN_FINANCIAL_FOOTER[section.domainKey];

            if (!hasData) {
              return (
                <div key={section.domainKey} className="flex items-center gap-3 py-2" data-testid={`journey-domain-${section.domainKey}`}>
                  <span className="text-xs font-bold uppercase tracking-[1.5px] text-[#CCCCCC]">{section.label}</span>
                  <span className="text-xs text-[#DDDDDD]">&mdash;</span>
                  <span className="text-xs text-[#CCCCCC]">not yet measured</span>
                </div>
              );
            }

            return (
              <div key={section.domainKey} data-testid={`journey-domain-${section.domainKey}`}>

                <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-3">
                  {section.label}
                </p>

                {narrative && (
                  <p className="text-[15px] text-[#1A1A1A] leading-relaxed mb-6 max-w-[640px]">
                    {narrative}
                  </p>
                )}

                <div className="space-y-1">
                  {section.metrics.map((m, mi) => (
                    <MetricBar
                      key={`${m.metricDef.id}-${m.setting || 'org'}`}
                      label={m.setting ? `${m.metricDef.label} (${SETTING_DISPLAY_LABELS[m.setting] || m.setting})` : m.metricDef.label}
                      before={m.before}
                      after={m.after}
                      lowerIsBetter={m.metricDef.lowerIsBetter}
                      unit={m.metricDef.unit}
                      template={m.metricDef.plainEnglishTemplate}
                      delay={si * 150 + mi * 80}
                    />
                  ))}
                </div>

                {footer && (
                  <p className="text-[11px] text-[#BBBBBB] mt-4 flex items-center gap-1.5">
                    <span className="text-[#EA2C00]">&rarr;</span>
                    {footer}
                  </p>
                )}

                <div className="border-b border-[#F0EDE8] mt-8" />
              </div>
            );
          })}
        </div>

        {totalMetrics === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-[#AAAAAA] mb-4">No metrics have been entered yet.</p>
            <button
              onClick={onBack}
              className="text-sm font-medium text-[#EA2C00] hover:text-[#D12800]"
              data-testid="button-go-back-add"
            >
              &larr; Go back and add metrics
            </button>
          </div>
        )}

        {totalMetrics > 0 && (
          <div className="mt-12 flex flex-col items-center gap-3" data-testid="cta-section">
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
