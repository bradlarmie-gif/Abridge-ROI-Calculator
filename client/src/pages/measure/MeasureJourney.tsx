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

const DOMAIN_FINANCIAL_FOOTER: Record<string, string> = {
  quality: 'Billing capture \u00b7 HCC value \u00b7 denial recovery',
  workforce: 'Clinician retention \u00b7 recruitment cost avoidance',
  revenue: 'Direct revenue \u2014 shows up in billing',
  capacity: 'Patient access revenue \u00b7 utilization',
  throughput: 'Revenue per available hour',
  patientFlow: 'Length-of-stay cost \u00b7 bed utilization',
  staffing: 'Recruitment cost avoidance \u00b7 vacancy burden',
};

function computeDomainNarrative(
  domainKey: DomainKey,
  metrics: { metricDef: MetricDefinition; before: number; after: number }[],
  _months: number,
  _providers: number,
): string {
  if (metrics.length === 0) return '';

  const has = (id: string) => metrics.some(m => m.metricDef.id === id);
  const get = (id: string) => metrics.find(m => m.metricDef.id === id);

  if (domainKey === 'quality') {
    if (has('note_star_rating') && has('diagnosis_capture')) {
      const star = get('note_star_rating')!;
      const cap = get('diagnosis_capture')!;
      return `Provider note ratings are the first signal that documentation is actually changing \u2014 a higher rating means less manual editing and more clinical detail surviving into the record. Since go-live, note ratings moved from ${star.before} to ${star.after} stars; diagnosis capture from ${cap.before}% to ${cap.after}%.`;
    }
    if (has('note_star_rating')) {
      const star = get('note_star_rating')!;
      return `Provider note ratings are the first signal that documentation is actually changing \u2014 a higher rating means less manual editing and more clinical detail surviving into the record downstream. Yours moved from ${star.before} to ${star.after} stars since go-live.`;
    }
    if (has('diagnosis_capture') && has('diagnosis_specificity')) {
      const cap = get('diagnosis_capture')!;
      const spec = get('diagnosis_specificity')!;
      return `When a diagnosis discussed in the room doesn\u2019t make it into the coded record, it\u2019s invisible to payers. Capture rate moved from ${cap.before}% to ${cap.after}%; specificity from ${spec.before}% to ${spec.after}% \u2014 meaning more of the clinical picture is reaching billing.`;
    }
    if (has('diagnosis_capture')) {
      const cap = get('diagnosis_capture')!;
      return `Diagnoses that are discussed but not documented never reach billing. Capture rate moved from ${cap.before}% to ${cap.after}% since go-live \u2014 more of what\u2019s happening in the visit is making it into the coded record.`;
    }
    if (has('diagnosis_specificity')) {
      const spec = get('diagnosis_specificity')!;
      return `Diagnosis specificity determines whether a claim reflects the actual complexity of the visit. Specificity moved from ${spec.before}% to ${spec.after}% \u2014 more encounters coded at the level of detail that supports accurate reimbursement.`;
    }
    return `Documentation quality is shifting. The metrics below show where the signal is strongest.`;
  }

  if (domainKey === 'workforce') {
    if (has('work_outside_work_empirical') && has('burnout_assessment')) {
      const wow = get('work_outside_work_empirical')!;
      const burn = get('burnout_assessment')!;
      return `Documentation burden is the primary driver of physician burnout \u2014 and burnout is the primary driver of turnover. After-hours documentation dropped from ${wow.before} to ${wow.after} hrs/week; burnout scores moved from ${burn.before} to ${burn.after}.`;
    }
    if (has('likelihood_to_stay')) {
      const lts = get('likelihood_to_stay')!;
      const delta = lts.after - lts.before;
      const sign = delta > 0 ? '+' : '';
      return `Retention intent is the leading indicator \u2014 it typically shifts before actual departures do. Likelihood to stay moved from ${lts.before}% to ${lts.after}%, a ${sign}${delta.toFixed(0)}pp shift in the population most likely to be making that decision right now.`;
    }
    if (has('work_outside_work_empirical')) {
      const wow = get('work_outside_work_empirical')!;
      return `Documentation done outside scheduled hours is a direct proxy for documentation burden \u2014 it\u2019s what providers measure when they say the tool \u201cgives me my evenings back.\u201d Empirical after-hours documentation dropped from ${wow.before} to ${wow.after} hrs/week.`;
    }
    if (has('time_to_close')) {
      const ttc = get('time_to_close')!;
      return `Encounter close time measures how long the documentation tail follows a patient visit. The shorter it is, the less cognitive carry-over providers bring into the next room. Time to close moved from ${ttc.before} to ${ttc.after} hours.`;
    }
    if (has('burnout_assessment')) {
      const burn = get('burnout_assessment')!;
      return `Burnout scores measure the accumulated weight of documentation burden over time \u2014 they move slowly, so when they do move, the signal is meaningful. Score moved from ${burn.before} to ${burn.after} on a 100-point scale.`;
    }
    if (has('work_after_hours_perceived')) {
      const wah = get('work_after_hours_perceived')!;
      return `Perceived after-hours burden is a leading indicator of burnout even before the empirical hours change \u2014 the psychological tax of knowing work is waiting at home. The share reporting after-hours work moved from ${wah.before}% to ${wah.after}%.`;
    }
    return `Clinician time and wellbeing metrics are shifting. The bars below show where the signal is strongest.`;
  }

  if (domainKey === 'revenue') {
    if (has('wrvu') && has('hcc_capture')) {
      const wrvu = get('wrvu')!;
      const hcc = get('hcc_capture')!;
      return `Better documentation reaches billing two ways: visit complexity (wRVU) and chronic condition documentation (HCC). wRVU per encounter moved from ${wrvu.before} to ${wrvu.after}; HCC capture rate from ${hcc.before}% to ${hcc.after}%.`;
    }
    if (has('wrvu')) {
      const wrvu = get('wrvu')!;
      return `wRVU capture is how documentation quality becomes a billing number \u2014 more specific notes support higher complexity coding at the encounter level. wRVU per encounter moved from ${wrvu.before} to ${wrvu.after} since go-live.`;
    }
    if (has('initial_denial_rate') && has('clean_claim_rate')) {
      const denial = get('initial_denial_rate')!;
      const clean = get('clean_claim_rate')!;
      return `Denials and rework are symptoms of documentation gaps \u2014 claims get kicked back when the clinical support isn\u2019t in the note. Denial rate moved from ${denial.before}% to ${denial.after}%; clean claim rate from ${clean.before}% to ${clean.after}%.`;
    }
    if (has('hcc_capture')) {
      const hcc = get('hcc_capture')!;
      return `In risk-adjusted contracts, undocumented HCCs translate directly to underfunded capitation \u2014 conditions discussed but not coded don\u2019t exist to payers. HCC capture rate moved from ${hcc.before}% to ${hcc.after}%.`;
    }
    if (has('em_level')) {
      const em = get('em_level')!;
      return `E/M level is the billing expression of visit complexity \u2014 documentation that captures the full clinical picture supports more accurate level assignment. Average E/M moved from ${em.before} to ${em.after}.`;
    }
    if (has('clean_claim_rate')) {
      const clean = get('clean_claim_rate')!;
      return `Clean claim rate is the billing efficiency signal \u2014 when documentation supports the claim, it goes through first try without rework or resubmission. Rate moved from ${clean.before}% to ${clean.after}%.`;
    }
    return `Revenue cycle metrics are shifting \u2014 documentation quality changes are beginning to show up downstream in billing.`;
  }

  if (domainKey === 'capacity') {
    if (has('time_in_note') && has('patients_per_provider_month')) {
      const tin = get('time_in_note')!;
      const ppm = get('patients_per_provider_month')!;
      return `Documentation time savings only generate revenue when they\u2019re reinvested in access. Time in note moved from ${tin.before} to ${tin.after} min/encounter; providers went from ${ppm.before} to ${ppm.after} patients per month.`;
    }
    if (has('time_in_note')) {
      const tin = get('time_in_note')!;
      return `Time in note is the primary capacity metric \u2014 every minute recovered per encounter compounds across the full appointment schedule. Note time moved from ${tin.before} to ${tin.after} min/encounter.`;
    }
    if (has('patients_per_provider_month')) {
      const ppm = get('patients_per_provider_month')!;
      return `Patients per provider per month is the downstream expression of documentation efficiency \u2014 when notes get faster, the recovered time becomes available for more appointments. Volume moved from ${ppm.before} to ${ppm.after} patients/month.`;
    }
    if (has('visits_per_clinician_hour')) {
      const vph = get('visits_per_clinician_hour')!;
      return `Visits per clinician hour is the scheduling-level signal that documentation savings are translating to access. Throughput moved from ${vph.before} to ${vph.after} visits per hour scheduled.`;
    }
    return `Capacity and efficiency metrics are shifting since go-live. The bars below show where.`;
  }

  if (domainKey === 'throughput') {
    return `Patient throughput metrics have shifted since go-live \u2014 the bars below show where efficiency gains are appearing.`;
  }

  if (domainKey === 'patientFlow') {
    return `Patient flow metrics have shifted since go-live \u2014 the bars below show where gains are appearing.`;
  }

  if (domainKey === 'staffing') {
    if (has('likelihood_to_stay')) {
      const lts = get('likelihood_to_stay')!;
      return `Staff retention intent is the leading indicator of actual turnover \u2014 when it improves, the recruitment and onboarding cost risk shifts before anyone has actually left. Likelihood to stay moved from ${lts.before}% to ${lts.after}%.`;
    }
    return `Staffing stability metrics have shifted since go-live.`;
  }

  return '';
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

  const domainsWithData = domainSections.filter(ds => ds.metrics.length > 0).length;
  const totalMetrics = activeMetrics.length;
  const months = getMonthsFromGoLive(state.goLiveDate, state.deployment.monthsOnAbridge);
  const settingLabels = activeSettings.map(s => SETTING_DISPLAY_LABELS[s] || s).join(' \u00b7 ');

  return (
    <div className="min-h-screen bg-white" data-testid="page-journey">
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
            {[state.deployment.organizationName, settingLabels, state.goLiveDate ? `Live since ${state.goLiveDate}` : '', months > 0 ? `${months} months` : ''].filter(Boolean).join(' \u00b7 ')}
          </p>
          <h1 className="text-3xl font-bold font-abridge uppercase tracking-tight text-[#1A1A1A] mb-6" data-testid="text-page-title">
            Here's what changed.
          </h1>
          <div className="flex gap-8 pb-6 border-b border-[#F0F0F0]" data-testid="summary-strip">
            {[
              { label: 'Providers', value: String(state.deployment.providers) },
              { label: 'Encounters documented', value: state.deployment.totalEncounters > 0 ? state.deployment.totalEncounters.toLocaleString() : '\u2014' },
              { label: 'Domains with data', value: `${domainsWithData} of 4` },
              { label: 'Metrics active', value: String(totalMetrics) },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-[11px] text-[#999999] mb-0.5">{stat.label}</p>
                <p className="text-xl font-bold text-[#1A1A1A]">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          {domainSections.map((section, si) => {
            const hasData = section.metrics.length > 0;
            const narrative = computeDomainNarrative(
              section.domainKey,
              section.metrics,
              months,
              state.deployment.providers,
            );
            const footer = DOMAIN_FINANCIAL_FOOTER[section.domainKey];

            if (!hasData) {
              return (
                <div
                  key={section.domainKey}
                  className="py-6 border-b border-[#F0F0F0]"
                  data-testid={`journey-domain-${section.domainKey}-empty`}
                >
                  <p className="text-[11px] uppercase tracking-[2px] text-[#CCCCCC] font-semibold">
                    {section.label.toUpperCase()} &mdash; not yet measured
                  </p>
                </div>
              );
            }

            return (
              <div
                key={section.domainKey}
                className="py-10 border-b border-[#F0F0F0]"
                data-testid={`journey-domain-${section.domainKey}`}
              >
                <p className="text-[11px] uppercase tracking-[2px] text-[#EA2C00] font-semibold mb-3">
                  {section.label.toUpperCase()}
                </p>

                {narrative && (
                  <p className="text-base text-[#1A1A1A] leading-relaxed mb-7 max-w-[640px]">
                    {narrative}
                  </p>
                )}

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
                      delay={si * 150 + mi * 80}
                    />
                  ))}
                </div>

                {footer && (
                  <p className="text-[11px] text-[#CCCCCC] mt-2">
                    &rarr; Connects to: {footer}
                  </p>
                )}
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
