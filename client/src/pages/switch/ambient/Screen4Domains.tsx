import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import {
  type Domain, type ActivationLevel,
  DOMAIN_ORDER, DOMAIN_LABELS,
  computeDomainScore,
  computeCapacityFeedback, computeRevenueFeedback,
  computeWorkforceFeedback, computeRiskFeedback,
  QUALITY_ATTRIBUTES, DOWNSTREAM_WORKFLOWS, STRATEGIC_INTEGRATIONS, REVENUE_INTEGRATIONS,
  CAPACITY_TIME_USAGE_LABELS,
  type DomainFeedback,
} from "./domainCalculations";

interface Screen4Props {
  onNext: () => void;
  onBack: () => void;
  initialDomain?: Domain;
}

const DOMAIN_CTA: Record<Domain, string> = {
  capacity: 'See Revenue Impact →',
  revenue: 'See Workforce Impact →',
  workforce: 'See Quality Impact →',
  risk: 'See My Score →',
};


type DomainState = {
  activationLevel: ActivationLevel | null;
  inputs: Record<string, number | string>;
};

type ActivationCard = {
  level: ActivationLevel;
  label: string;
  description: string;
};

type DomainConfig = {
  label: string;
  headline: string;
  subheadline?: string;
  reframe: string;
  cards: ActivationCard[];
  unlockTeasers?: Record<number, string>;
};

const DOMAIN_CONFIGS: Record<Domain, DomainConfig> = {
  capacity: {
    label: 'CAPACITY',
    headline: 'CAPACITY',
    subheadline: 'What happened to the recovered time?',
    reframe: '',
    cards: [
      { level: 1, label: 'Time Recovered', description: 'Providers report reduced documentation time. No operational decision made yet.' },
      { level: 2, label: 'Time Actively Used', description: 'Organization is actively directing recovered time toward patient access, research, teaching, or other priorities.' },
      { level: 3, label: 'Access Measured', description: 'Additional patients are being seen with recovered time.' },
      { level: 4, label: 'Access Impact Tracked', description: 'Downstream access outcomes are tracked and attributed to recovered time.' },
    ],
    unlockTeasers: {
      2: 'Identify how recovered time is actively being used.',
      3: 'Measure how many additional patients are seen with recovered time.',
      4: 'Track downstream access impact from recovered time.',
    },
  },
  revenue: {
    label: 'REVENUE',
    headline: 'REVENUE',
    subheadline: 'Has better documentation shown up in reimbursement?',
    reframe: '',
    cards: [
      { level: 1, label: 'Revenue Uncounted', description: 'Documentation quality has improved. Whether reimbursement followed has not been analyzed yet — which is where the opportunity lives.' },
      { level: 2, label: 'Directional Signal', description: 'Your organization has observed trends suggesting documentation is affecting reimbursement. Not yet formally validated.' },
      { level: 3, label: 'Impact Measured', description: 'Before/after analysis completed. Documentation-driven revenue impact quantified.' },
      { level: 4, label: 'Documentation as a Revenue Lever', description: 'Documentation intelligence drives revenue cycle strategy, payer positioning, and financial planning.' },
    ],
    unlockTeasers: {
      2: 'Observe trends in coding, denials, and collections.',
      3: 'Complete a before/after analysis to quantify documentation-driven revenue impact.',
      4: 'Integrate documentation intelligence into revenue strategy and financial planning.',
    },
  },
  workforce: {
    label: 'WORKFORCE',
    headline: 'WORKFORCE',
    subheadline: 'Has reduced documentation burden changed how providers live and work?',
    reframe: '',
    cards: [
      { level: 1, label: 'Provider Sentiment Measured', description: 'In-clinic time savings are tracked. Providers have been surveyed on burden, satisfaction, and intent to stay.' },
      { level: 2, label: 'Behavioral Change Visible', description: 'Observable changes in provider behavior — after-hours patterns, time at home, note completion — are visible and documented.' },
      { level: 3, label: 'Retention Confirmed', description: 'Turnover rate has measurably changed. The financial value of improved retention is calculated.' },
      { level: 4, label: 'Workforce Strategically Managed', description: 'Documentation burden data informs recruitment, retention program design, staffing models, and workforce planning at the organizational level.' },
    ],
    unlockTeasers: {
      2: 'Observe and document behavioral changes in provider patterns outside the clinic.',
      3: 'Connect burden reduction to before/after turnover rate changes.',
      4: 'Integrate documentation burden data into organizational workforce strategy.',
    },
  },
  risk: {
    label: 'QUALITY',
    headline: 'QUALITY',
    subheadline: 'How far has documentation quality traveled downstream?',
    reframe: '',
    cards: [
      { level: 1, label: 'Quality Improving — Downstream Not Yet Connected', description: 'Documentation quality has improved. The teams that benefit from it — coding, CDI, compliance — haven\'t been formally connected to it yet.' },
      { level: 2, label: 'Actively Monitored', description: 'Documentation quality dimensions are being actively tracked — completeness, specificity, HCC capture, compliance readiness.' },
      { level: 3, label: 'Downstream Connected', description: 'Documentation quality improvements are connected to downstream programs — CDI, coding accuracy, quality measures, HCC/risk adjustment, or denial reduction.' },
      { level: 4, label: 'Documentation as a Strategic Asset', description: 'Documentation quality informs organizational strategy — quality programs, value-based care, HCC/risk adjustment, compliance governance, and AI readiness.' },
    ],
    unlockTeasers: {
      2: 'Track which documentation quality dimensions are improving.',
      3: 'Connect documentation quality to downstream programs — CDI, coding, HCC capture, or denial reduction.',
      4: 'Position documentation quality as a strategic organizational asset.',
    },
  },
};

const FUTURE_DESCRIPTIONS: Record<string, Record<number, string>> = {
  capacity: {
    3: 'Measure how many additional patients are seen with recovered time and calculate access revenue.',
    4: 'Track downstream access outcomes — panel growth, referral conversion, third-next-available — attributed to recovered time.',
  },
  revenue: {
    3: 'Complete a before/after analysis to quantify documentation-driven revenue impact.',
    4: 'Documentation intelligence drives revenue strategy, payer positioning, and financial planning.',
  },
  workforce: {
    2: 'Document observable behavioral changes — after-hours patterns, note completion, time at home.',
    3: 'Connect before/after turnover rate change to the financial value of improved retention.',
    4: 'Documentation burden data informs recruitment, retention programs, staffing models, and workforce planning.',
  },
  risk: {
    3: 'Connect documentation quality to a financial pathway — MIPS performance or denial reduction.',
    4: 'Structured documentation informs quality programs, value-based care, compliance, and AI readiness.',
  },
};

function BenchmarkContext({ text }: { text: string }) {
  return <p className="text-xs text-[#999999] italic mt-2">{text}</p>;
}


export default function Screen4Domains({ onNext, onBack, initialDomain }: Screen4Props) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;
  const [activeDomain, setActiveDomain] = useState<Domain>(initialDomain || 'capacity');
  const [teaserOpen, setTeaserOpen] = useState(false);

  const parseDomainInputs = (json: string): Record<string, number | string> => {
    try { return JSON.parse(json); } catch { return {}; }
  };

  const [domainStates, setDomainStates] = useState<Record<Domain, DomainState>>(() => ({
    capacity: { activationLevel: (inputs.capacityActivationLevel as ActivationLevel | null), inputs: parseDomainInputs(inputs.capacityDomainInputs) },
    revenue: { activationLevel: (inputs.revenueActivationLevel as ActivationLevel | null), inputs: parseDomainInputs(inputs.revenueDomainInputs) },
    workforce: { activationLevel: (inputs.workforceActivationLevel as ActivationLevel | null), inputs: parseDomainInputs(inputs.workforceDomainInputs) },
    risk: { activationLevel: (inputs.riskActivationLevel as ActivationLevel | null), inputs: parseDomainInputs(inputs.riskDomainInputs) },
  }));

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 45;
  const revenuePerVisit = inputs.revenuePerVisit || 200;
  const documentedEncounters = Math.round(annualEncounters * (utilization / 100));

  const currentState = domainStates[activeDomain];
  const config = DOMAIN_CONFIGS[activeDomain];

  const pendingScrollRef = useRef<string | null>(null);

  const setActivation = useCallback((level: ActivationLevel) => {
    pendingScrollRef.current = `${activeDomain}-${level}`;
    setDomainStates((prev) => ({
      ...prev,
      [activeDomain]: { ...prev[activeDomain], activationLevel: level },
    }));
    dispatch(assessmentActions.updateInput(`${activeDomain}ActivationLevel` as keyof typeof inputs, level));
  }, [activeDomain, dispatch]);

  useEffect(() => {
    if (!pendingScrollRef.current) return;
    pendingScrollRef.current = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentState.activationLevel]);

  const setDomainInput = useCallback((key: string, value: number | string) => {
    setDomainStates((prev) => {
      const next = {
        ...prev,
        [activeDomain]: {
          ...prev[activeDomain],
          inputs: { ...prev[activeDomain].inputs, [key]: value },
        },
      };
      dispatch(assessmentActions.updateInput(`${activeDomain}DomainInputs` as keyof typeof inputs, JSON.stringify(next[activeDomain].inputs)));
      return next;
    });
  }, [activeDomain, dispatch]);

  const feedback = useMemo((): DomainFeedback | null => {
    if (!currentState.activationLevel) return null;
    const level = currentState.activationLevel;
    const inp = currentState.inputs;
    switch (activeDomain) {
      case 'capacity': {
        const capacityInp = inp.timeSaved ? inp : { ...inp, timeSaved: inputs.timeSavedPerEncounter || 0 };
        return computeCapacityFeedback(level, capacityInp, providers, documentedEncounters, revenuePerVisit);
      }
      case 'revenue': return computeRevenueFeedback(level, inp, documentedEncounters, revenuePerVisit, inputs.conversionFactor || 33, providers);
      case 'workforce': return computeWorkforceFeedback(level, inp, providers);
      case 'risk': return computeRiskFeedback(level, inp, documentedEncounters, revenuePerVisit, providers);
    }
  }, [activeDomain, currentState.activationLevel, currentState.inputs, providers, documentedEncounters, revenuePerVisit, inputs.conversionFactor, inputs.timeSavedPerEncounter]);

  const handleAdvance = () => {
    if (currentState.activationLevel) {
      const score = computeDomainScore(activeDomain, currentState.activationLevel, currentState.inputs);
      const gapValue = feedback?.value || 0;
      const hasValue = feedback?.hasValue || false;
      dispatch(assessmentActions.updateInput(`${activeDomain}Score` as keyof typeof inputs, score));
      dispatch(assessmentActions.updateInput(`${activeDomain}Gap` as keyof typeof inputs, gapValue));
      dispatch(assessmentActions.updateInput(`${activeDomain}HasValue` as keyof typeof inputs, hasValue));
      dispatch(assessmentActions.updateInput(`${activeDomain}HeadlineMetric` as keyof typeof inputs, feedback?.headlineMetric || ''));
      dispatch(assessmentActions.updateInput(`${activeDomain}Context` as keyof typeof inputs, feedback?.context || ''));
      dispatch(assessmentActions.updateInput(`${activeDomain}Formula` as keyof typeof inputs, feedback?.formula || ''));
      dispatch(assessmentActions.updateInput(`${activeDomain}Footnote` as keyof typeof inputs, feedback?.footnote || ''));
    }

    const idx = DOMAIN_ORDER.indexOf(activeDomain);
    if (idx < DOMAIN_ORDER.length - 1) {
      setActiveDomain(DOMAIN_ORDER[idx + 1]);
      setTeaserOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onNext();
    }
  };

  const handleDomainBack = () => {
    const idx = DOMAIN_ORDER.indexOf(activeDomain);
    if (idx > 0) {
      setActiveDomain(DOMAIN_ORDER[idx - 1]);
      setTeaserOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onBack();
    }
  };

  const activeIdx = DOMAIN_ORDER.indexOf(activeDomain);

  const toggleCheckboxItem = (key: string, index: number) => {
    const current = (currentState.inputs[key] as string) || '';
    const set = new Set(current.split(',').filter(Boolean));
    const idx = String(index);
    if (set.has(idx)) set.delete(idx); else set.add(idx);
    setDomainInput(key, Array.from(set).join(','));
  };

  const isChecked = (key: string, index: number): boolean => {
    const current = (currentState.inputs[key] as string) || '';
    return current.split(',').filter(Boolean).includes(String(index));
  };

  const renderCapacityInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    const timeSavedValue = (currentState.inputs.timeSaved as number) || (inputs.timeSavedPerEncounter as number) || 0;

    const timeSavedSection = (
      <div className="mb-6" key="time-saved">
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
          Minutes returned per encounter
        </label>

        <div className="flex items-center gap-2 mb-1">
          <FormattedNumberInput
            value={timeSavedValue}
            onChange={(v) => setDomainInput('timeSaved', Math.min(8, Math.max(0, v)))}
            placeholder=""
            className="w-full h-12 bg-white border-[#E5E7EB]"
            data-testid="input-time-saved"
          />
          <span className="text-sm text-[#888888]">min</span>
        </div>
      </div>
    );

    if (level === 1) {
      return timeSavedSection;
    }

    if (level === 2) {
      return (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-col gap-2.5">
              {CAPACITY_TIME_USAGE_LABELS.map((label, i) => {
                const checked = isChecked('capacityTimeUsage', i);
                return (
                  <label
                    key={i}
                    htmlFor={`capacity-usage-${i}`}
                    className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                    }`}
                    data-testid={`checkbox-capacity-usage-${i}`}
                  >
                    <Checkbox
                      id={`capacity-usage-${i}`}
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('capacityTimeUsage', i)}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-[#525252] select-none leading-snug">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (level === 3) {
      const confidenceOptions = ['measured', 'estimated', 'aspirational'] as const;
      const currentConfidence = (currentState.inputs.capacityAccessConfidence as string) || 'estimated';
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Additional patients per provider per month
            </label>
            <FormattedNumberInput
              value={(currentState.inputs.additionalPatientsPerMonth as number) || 0}
              onChange={(v) => setDomainInput('additionalPatientsPerMonth', v)}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-additional-patients"
            />
            <BenchmarkContext text="Benchmark: 1–3 additional patients/provider/month from scheduling efficiency and reduced LWBS (MGMA access benchmarks)" />
            <p className="text-xs text-[#888888] mt-1">
              Annualized over 11 clinical months (230 working days).
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Data confidence
            </label>
            <div className="flex gap-2">
              {confidenceOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDomainInput('capacityAccessConfidence', opt)}
                  className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                    currentConfidence === opt
                      ? 'bg-[#EA2C00] text-white font-medium'
                      : 'bg-[#F0EFED] text-[#525252] hover:bg-[#E5E3E0]'
                  }`}
                  data-testid={`pill-confidence-${opt}`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#888888] mt-2 leading-relaxed">
              <span className="font-semibold">Measured</span> — confirmed with scheduling data. <span className="font-semibold">Estimated</span> — your team's best assessment. <span className="font-semibold">Aspirational</span> — a planning target, not yet confirmed. Your choice here affects how this figure is labeled in your results.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Providers included
            </label>
            <FormattedNumberInput
              value={(currentState.inputs.redesignedProviders as number) || 0}
              onChange={(v) => setDomainInput('redesignedProviders', Math.max(0, v))}
              placeholder={`${providers}`}
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-redesigned-providers"
            />
          </div>
        </div>
      );
    }

    const ACCESS_OUTCOME_OPTIONS = [
      'Panel size increased',
      'New patient slots opened',
      'Same-day/urgent access expanded',
      'Referral-to-visit time reduced',
      'Third-next-available improved',
      'No-show backfill utilized',
    ];

    return (
      <div className="flex flex-col gap-5">
        <div>
          <div className="flex flex-col gap-2.5">
            {ACCESS_OUTCOME_OPTIONS.map((item, i) => {
              const checked = isChecked('accessOutcomes', i);
              return (
                <label
                  key={i}
                  htmlFor={`access-outcome-${i}`}
                  className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all active:scale-[0.99] ${
                    checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                >
                  <Checkbox
                    id={`access-outcome-${i}`}
                    checked={checked}
                    onCheckedChange={() => toggleCheckboxItem('accessOutcomes', i)}
                    data-testid={`checkbox-access-outcome-${i}`}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-[#525252] select-none leading-snug">
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">Confirmed additional patients per provider per month</label>
          <FormattedNumberInput
            value={(currentState.inputs.additionalPatientsPerMonth as number) || 0}
            onChange={(v) => setDomainInput('additionalPatientsPerMonth', Math.max(0, v))}
            placeholder=""
            className="w-full h-12 bg-white border-[#E5E7EB]"
            data-testid="input-l4-additional-patients"
          />
          <BenchmarkContext text="Carries from Level 3 if entered. This is the same input — Level 4 assumes you're still counting visits." />
        </div>
      </div>
    );
  };

  const REVENUE_METRIC_OPTIONS = [
    { id: 'wrvu', label: 'wRVU per encounter' },
    { id: 'collections', label: 'Collections per encounter' },
    { id: 'denial_rate', label: 'Denial rate' },
  ];

  const REVENUE_METRIC_BENCHMARKS: Record<string, string> = {
    wrvu: 'Abridge benchmark: 0.05\u20130.15 wRVU per encounter. Based on aggregated deployment experience.',
    collections: 'Organizations at this level have reported $3\u2013$10 increase per encounter. Based on aggregated deployment experience.',
    denial_rate: 'Organizations at this level have reported 5\u201315% reduction in documentation-related denials. Based on aggregated deployment experience.',
  };

  const renderRevenueInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      const revenueCycleEngaged = currentState.inputs.revenueCycleEngaged as string | undefined;
      const emComplexity = currentState.inputs.emComplexity as string | undefined;
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              Has your organization reviewed how documentation changes from ambient affect coding or reimbursement?
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'no', label: 'Not yet' },
                { id: 'informal', label: 'Conversations have started' },
                { id: 'yes', label: 'Formally engaged' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDomainInput('revenueCycleEngaged', opt.id)}
                  className={`rounded-lg p-3.5 sm:p-4 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                    revenueCycleEngaged === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-revenue-engaged-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${revenueCycleEngaged === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (level === 2) {
      const OBSERVATION_AREAS = [
        'wRVU per encounter trending upward',
        'Coding specificity improving (ICD-10 distribution shifting)',
        'Denial rates trending downward',
        'Collections per encounter trending upward',
        'CDI query volume decreasing',
        'Coder productivity improving',
      ];
      return (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-col gap-2.5">
              {OBSERVATION_AREAS.map((area, i) => {
                const checked = isChecked('observedMovement', i);
                return (
                  <label
                    key={i}
                    htmlFor={`observed-movement-${i}`}
                    className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                    }`}
                  >
                    <Checkbox
                      id={`observed-movement-${i}`}
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('observedMovement', i)}
                      data-testid={`checkbox-observed-movement-${i}`}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-[#525252] select-none leading-snug">
                      {area}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Estimated wRVU improvement per encounter
            </label>
            <FormattedNumberInput
              value={(currentState.inputs.estimatedWrvuL2 as number) || 0}
              onChange={(v) => setDomainInput('estimatedWrvuL2', Math.max(0, v))}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-estimated-wrvu-l2"
              step={0.01}
            />
            <BenchmarkContext text="Abridge benchmark: 0.05–0.15 wRVU per encounter. Enter 0 if you don't have a sense yet." />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Confidence in this estimate
            </label>
            <div className="flex gap-2">
              {(['directional', 'partial'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDomainInput('l2Confidence', opt)}
                  className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                    ((currentState.inputs.l2Confidence as string) || 'directional') === opt
                      ? 'bg-[#EA2C00] text-white font-medium'
                      : 'bg-[#F0EFED] text-[#525252] hover:bg-[#E5E3E0]'
                  }`}
                  data-testid={`pill-l2-confidence-${opt}`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#888888] mt-2 leading-relaxed">
              <span className="font-semibold">Directional</span> — a rough sense, not yet validated. <span className="font-semibold">Partial</span> — based on preliminary data your team has reviewed. Your choice adjusts how this figure is labeled in results.
            </p>
          </div>

        </div>
      );
    }

    if (level === 3) {
      const metricType = currentState.inputs.revenueMetricType as string | undefined;
      return (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-[#525252] italic leading-relaxed bg-[#F9FAFB] p-3 rounded-lg">
            Level 3 requires a completed before/after analysis — your organization has a confirmed number from formal measurement, not a directional estimate.
          </p>
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              What did you measure?
            </label>
            <div className="flex flex-col gap-2.5">
              {REVENUE_METRIC_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDomainInput('revenueMetricType', opt.id);
                    setDomainInput('revenueMetricDirection', '');
                  }}
                  className={`rounded-lg p-3.5 sm:p-4 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                    metricType === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-metric-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${metricType === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {metricType === 'wrvu' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                  Measured wRVU change per encounter
                </label>
                <FormattedNumberInput
                  value={(currentState.inputs.measuredWrvuDelta as number) || 0}
                  onChange={(v) => setDomainInput('measuredWrvuDelta', Math.max(0, v))}
                  placeholder=""
                  className="w-full h-12 bg-white border-[#E5E7EB]"
                  data-testid="input-wrvu-delta"
                  step={0.01}
                />
                <BenchmarkContext text="Abridge benchmark: 0.05–0.15 wRVU per encounter" />
                <p className="text-xs text-[#888888] mt-1 italic">
                  Using CMS conversion factor of ${(inputs.conversionFactor as number) || 33}/wRVU.{' '}
                  {inputs.conversionFactor && inputs.conversionFactor !== 33
                    ? `Updated to $${inputs.conversionFactor}.`
                    : 'Update in baseline settings if your contracts differ.'}
                </p>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-[#1A1A1A] mb-2">Direction</label>
                  <div className="flex gap-2">
                    {[{ id: 'increase', label: '↑ Increased' }, { id: 'decrease', label: '↓ Decreased' }].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDomainInput('revenueMetricDirection', opt.id)}
                        className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                          (currentState.inputs.revenueMetricDirection as string) === opt.id
                            ? opt.id === 'increase' ? 'bg-[#EA2C00] text-white font-medium' : 'bg-[#525252] text-white font-medium'
                            : 'bg-[#F0EFED] text-[#525252] hover:bg-[#E5E3E0]'
                        }`}
                        data-testid={`pill-direction-${opt.id}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {metricType === 'collections' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                  Collections change per encounter since deployment
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#888888]">$</span>
                  <FormattedNumberInput
                    value={(currentState.inputs.measuredCollectionsDelta as number) || 0}
                    onChange={(v) => setDomainInput('measuredCollectionsDelta', Math.max(0, v))}
                    placeholder=""
                    className="w-full h-12 bg-white border-[#E5E7EB]"
                    data-testid="input-collections-delta"
                  />
                </div>
                <BenchmarkContext text="Benchmark: $3–$10/encounter improvement in net collections from E&M level uplift and denial reduction (AMA/MGMA coding data)" />
                <div className="mt-3">
                  <label className="block text-xs font-medium text-[#1A1A1A] mb-2">Direction</label>
                  <div className="flex gap-2">
                    {[{ id: 'increase', label: '↑ Increased' }, { id: 'decrease', label: '↓ Decreased' }].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDomainInput('revenueMetricDirection', opt.id)}
                        className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                          (currentState.inputs.revenueMetricDirection as string) === opt.id
                            ? opt.id === 'increase' ? 'bg-[#EA2C00] text-white font-medium' : 'bg-[#525252] text-white font-medium'
                            : 'bg-[#F0EFED] text-[#525252] hover:bg-[#E5E3E0]'
                        }`}
                        data-testid={`pill-direction-${opt.id}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {metricType === 'denial_rate' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                      Denial rate change (percentage points)
                    </label>
                    <div className="flex items-center gap-2">
                      <FormattedNumberInput
                        value={(currentState.inputs.measuredDenialReduction as number) || 0}
                        onChange={(v) => setDomainInput('measuredDenialReduction', Math.min(100, Math.max(0, v)))}
                        placeholder=""
                        className="w-full h-12 bg-white border-[#E5E7EB]"
                        data-testid="input-denial-reduction"
                        step={0.1}
                      />
                      <span className="text-sm text-[#888888]">pp</span>
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-[#1A1A1A] mb-2">Direction</label>
                      <div className="flex gap-2">
                        {[{ id: 'decrease', label: '↓ Decreased (improved)' }, { id: 'increase', label: '↑ Increased (worsened)' }].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setDomainInput('revenueMetricDirection', opt.id)}
                            className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${
                              (currentState.inputs.revenueMetricDirection as string) === opt.id
                                ? opt.id === 'decrease' ? 'bg-[#EA2C00] text-white font-medium' : 'bg-[#525252] text-white font-medium'
                                : 'bg-[#F0EFED] text-[#525252] hover:bg-[#E5E3E0]'
                            }`}
                            data-testid={`pill-direction-${opt.id}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <BenchmarkContext text="Industry average: 3–5% documentation-related denial rate. A 1–2 point decrease is meaningful." />
                  </div>
                  {(currentState.inputs.measuredDenialReduction as number) > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                        Average monthly documentation-related denial volume ($)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#888888]">$</span>
                        <FormattedNumberInput
                          value={(currentState.inputs.monthlyDenialVolume as number) || 0}
                          onChange={(v) => setDomainInput('monthlyDenialVolume', Math.max(0, v))}
                          placeholder=""
                          className="w-full h-12 bg-white border-[#E5E7EB]"
                          data-testid="input-monthly-denial-volume"
                          disabled={currentState.inputs.noDenialVolume === 'true'}
                        />
                      </div>
                      <BenchmarkContext text="Your revenue cycle team will have this figure — total monthly value of documentation-related denied claims." />
                      <div className="flex items-center gap-2.5 mt-3">
                        <Checkbox
                          id="no-denial-volume"
                          checked={currentState.inputs.noDenialVolume === 'true'}
                          onCheckedChange={(checked) => setDomainInput('noDenialVolume', checked ? 'true' : 'false')}
                          data-testid="checkbox-no-denial-volume"
                        />
                        <label htmlFor="no-denial-volume" className="text-sm text-[#525252] cursor-pointer select-none">
                          Don't have this figure yet
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {metricType && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-[#1A1A1A] mb-2">
                How much of this improvement is attributable to ambient documentation?
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'high', label: 'Primarily — we compared pre/post with ambient as the main change' },
                  { id: 'medium', label: 'Partially — other factors also contributed' },
                  { id: 'low', label: 'Uncertain — we measured the outcome but haven\'t isolated the cause' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDomainInput('attributionConfidence', opt.id)}
                    className={`rounded-lg p-3 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                      (currentState.inputs.attributionConfidence as string || 'medium') === opt.id
                        ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                        : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                    }`}
                    data-testid={`radio-attribution-${opt.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        (currentState.inputs.attributionConfidence as string || 'medium') === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'
                      }`} />
                      <span>{opt.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#888888] italic mt-1.5">
                Applied as a multiplier to the measured value: High = 90%, Partial = 70%, Uncertain = 50%.
              </p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-black mb-3">
            How is documentation quality being used strategically in revenue decisions?
          </label>
          <div className="flex flex-col gap-2.5">
            {REVENUE_INTEGRATIONS.map((item, i) => {
              const checked = isChecked('revenueIntegrations', i);
              return (
                <label
                  key={i}
                  htmlFor={`revenue-integration-${i}`}
                  className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all active:scale-[0.99] ${
                    checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                >
                  <Checkbox
                    id={`revenue-integration-${i}`}
                    checked={checked}
                    onCheckedChange={() => toggleCheckboxItem('revenueIntegrations', i)}
                    data-testid={`checkbox-revenue-integration-${i}`}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-[#525252] select-none leading-snug">
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
            Annual revenue attributed to documentation improvements
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.recognizedRevenue as number) || 0}
              onChange={(v) => setDomainInput('recognizedRevenue', Math.max(0, v))}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-recognized-revenue"
              disabled={currentState.inputs.noConfirmedRevenue === 'true'}
            />
          </div>
          <p className="text-xs text-[#888888] mt-1 leading-relaxed">
            This should be a number your CFO and revenue cycle leadership would stand behind — formally tracked and incorporated into financial reporting.
          </p>
          <div className="flex items-center gap-2.5 mt-3">
            <Checkbox
              id="no-confirmed-revenue"
              checked={currentState.inputs.noConfirmedRevenue === 'true'}
              onCheckedChange={(checked) => {
                setDomainInput('noConfirmedRevenue', checked ? 'true' : 'false');
              }}
              data-testid="checkbox-no-confirmed-revenue"
            />
            <label htmlFor="no-confirmed-revenue" className="text-sm text-[#525252] cursor-pointer select-none">
              Don't have a confirmed number yet
            </label>
          </div>
          {currentState.inputs.noConfirmedRevenue === 'true' && (
            <p className="text-xs text-[#888888] italic mt-2 leading-relaxed bg-[#F9FAFB] p-3 rounded-lg">
              Planning estimate: {providers} providers × $2K–$6K per provider/year in coding and denial impact = {formatDollar(providers * 2000)}–{formatDollar(providers * 6000)} annually. Source: AMA/MGMA coding benchmarks and CDI program data.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderWorkforceInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    const SURVEY_OPTIONS = [
      { id: 'not_yet', label: 'Not yet' },
      { id: 'informal', label: 'Informal pulse survey' },
      { id: 'structured', label: 'Structured survey' },
    ];

    const SURVEY_FINDINGS = [
      'Reduced documentation burden reported',
      'Improved work-life balance reported',
      'Improved satisfaction with documentation workflow',
      'Increased likelihood to stay / reduced intent to leave',
      'More time with patients reported',
    ];

    if (level === 1) {
      const surveyType = (currentState.inputs.surveyType as string) || '';
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              In-clinic time returned per provider per day
            </label>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={(currentState.inputs.editTimeSaved as number) || 0}
                onChange={(v) => setDomainInput('editTimeSaved', Math.max(0, v))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-edit-time"
              />
              <span className="text-sm text-[#888888] whitespace-nowrap">min/day</span>
            </div>
            <BenchmarkContext text="Published benchmark: 10–20 min/day (MGMA Physician Productivity data)" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Have providers been surveyed?
            </label>
            <div className="flex flex-col gap-2">
              {SURVEY_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                    surveyType === opt.id
                      ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                      : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-survey-${opt.id}`}
                >
                  <div className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    surveyType === opt.id ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                  }`}>
                    {surveyType === opt.id && <div className="w-3 h-3 rounded-full bg-[#EA2C00]" />}
                  </div>
                  <span className="text-sm text-black">{opt.label}</span>
                  <input
                    type="radio"
                    name="surveyType"
                    value={opt.id}
                    checked={surveyType === opt.id}
                    onChange={() => setDomainInput('surveyType', opt.id)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </div>

          {surveyType === 'not_yet' && (
            <p className="text-xs text-[#888888] italic leading-relaxed bg-[#F9FAFB] p-3 rounded-lg">
              A clinician survey is the fastest way to validate what your operational data is showing. Without provider voice, burden reduction is an assumption.
            </p>
          )}

          {surveyType === 'informal' && (
            <p className="text-xs text-[#888888] italic leading-relaxed bg-[#F9FAFB] p-3 rounded-lg">
              Informal feedback is a start. Consider a structured survey measuring documentation burden, satisfaction, and likelihood to stay — this data becomes critical at Level 2.
            </p>
          )}

          {surveyType === 'structured' && (
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                What did your survey show?
              </label>
              <div className="flex flex-col gap-2">
                {SURVEY_FINDINGS.map((finding, i) => {
                  const checked = isChecked('surveyFindings', i);
                  return (
                    <label
                      key={i}
                      className={`flex items-center gap-3 p-3.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                        checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                      }`}
                      data-testid={`checkbox-survey-finding-${i}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleCheckboxItem('surveyFindings', i)}
                      />
                      <span className="text-sm text-black">{finding}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    const BEHAVIORAL_CHANGES = [
      'After-hours documentation time reduced',
      'Leaving clinic on time more consistently',
      'Taking lunch breaks resumed',
      'Work-outside-of-work documentation eliminated or reduced',
      'Weekend catch-up work reduced',
      'Notes completed before leaving the clinic',
      'More present at home / personal time reclaimed',
    ];

    if (level === 2) {
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Which behavioral changes have been observed?
            </label>
            <div className="flex flex-col gap-2">
              {BEHAVIORAL_CHANGES.map((change, i) => {
                const checked = isChecked('observedBehaviors', i);
                return (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                    }`}
                    data-testid={`checkbox-behavior-${i}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('observedBehaviors', i)}
                    />
                    <span className="text-sm text-black">{change}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              After-hours time returned (if quantified)
            </label>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={(currentState.inputs.afterHoursReduction as number) || 0}
                onChange={(v) => setDomainInput('afterHoursReduction', Math.max(0, v))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-after-hours"
              />
              <span className="text-sm text-[#888888] whitespace-nowrap">hrs/wk</span>
            </div>
            <BenchmarkContext text="Published range: 1–3 hrs/week of after-hours documentation time" />
          </div>
        </div>
      );
    }

    if (level === 3) {
      const isDefaultReplacementCost = !currentState.inputs.replacementCost || (currentState.inputs.replacementCost as number) === 350000;
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Annual turnover rate before Abridge
            </label>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={(currentState.inputs.beforeTurnoverRate as number) || 0}
                onChange={(v) => setDomainInput('beforeTurnoverRate', v)}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-turnover-before"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
            <BenchmarkContext text="National average: 6–8% annually (AAMC Physician Workforce data)" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Annual turnover rate with Abridge
            </label>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={(currentState.inputs.afterTurnoverRate as number) || 0}
                onChange={(v) => setDomainInput('afterTurnoverRate', v)}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-turnover-after"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Replacement cost per physician
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={(currentState.inputs.replacementCost as number) || 350000}
                onChange={(v) => setDomainInput('replacementCost', v)}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-replacement-cost"
              />
            </div>
            {isDefaultReplacementCost && (
              <p className="text-xs text-[#888888] mt-1.5 italic">Using AMGA benchmark of $350K per physician — update if your organization tracks this.</p>
            )}
            <BenchmarkContext text="AMGA Physician Retention Survey range: $250K–$500K per physician" />
          </div>
        </div>
      );
    }

    const WORKFORCE_STRATEGIES = [
      'Recruitment and hiring — ambient documentation is part of the value proposition to candidates',
      'Retention program design — burden reduction is a measured component of retention initiatives',
      'Time-to-fill tracking — positions are filling faster partly attributed to improved work environment',
      'Provider experience strategy — documentation burden metrics are tracked alongside satisfaction and engagement',
      'Staffing model decisions — documentation efficiency informs how shifts, panels, or coverage are structured',
      'Agency/locum spend actively managed against burden reduction trends',
    ];
    const WORKFORCE_OUTCOMES = [
      'Turnover rate decreased',
      'Time-to-fill for positions decreased',
      'Agency or locum reliance decreased',
      'Provider satisfaction scores improved',
      'Recruitment acceptance rates improved',
    ];
    const strategyCsv = (currentState.inputs.workforceStrategies as string) || '';
    const strategySet = new Set(strategyCsv.split(',').filter(Boolean));
    const outcomesStatus = (currentState.inputs.workforceOutcomesStatus as string) || '';
    const outcomesCsv = (currentState.inputs.workforceOutcomes as string) || '';
    const outcomeSet = new Set(outcomesCsv.split(',').filter(Boolean));

    return (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            Where is documentation burden data informing workforce strategy?
          </label>
          <div className="flex flex-col gap-2.5">
            {WORKFORCE_STRATEGIES.map((strategy, i) => {
              const checked = strategySet.has(String(i));
              return (
                <label
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all cursor-pointer"
                  data-testid={`checkbox-workforce-strategy-${i}`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleCheckboxItem('workforceStrategies', i)}
                  />
                  <span className="text-sm text-black">{strategy}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
            Has your organization seen measurable workforce outcomes attributed to documentation burden reduction?
          </label>
          <div className="flex flex-col gap-2.5">
            {[
              { id: 'not_yet', label: 'Not yet — too early to measure' },
              { id: 'anecdotal', label: "Anecdotally — we believe it's helping but haven't isolated the effect" },
              { id: 'yes', label: 'Yes — we can point to specific outcomes (turnover improvement, time-to-fill changes, agency spend reduction)' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDomainInput('workforceOutcomesStatus', opt.id)}
                className={`rounded-lg p-3.5 sm:p-4 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                  outcomesStatus === opt.id
                    ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                    : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                }`}
                data-testid={`radio-outcomes-status-${opt.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${outcomesStatus === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                  <span>{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {outcomesStatus === 'yes' && (
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Which outcomes have you measured?
            </label>
            <div className="flex flex-col gap-2.5">
              {WORKFORCE_OUTCOMES.map((outcome, i) => {
                const checked = outcomeSet.has(String(i));
                return (
                  <label
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all cursor-pointer"
                    data-testid={`checkbox-workforce-outcome-${i}`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('workforceOutcomes', i)}
                    />
                    <span className="text-sm text-black">{outcome}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
            Monthly agency or locum spend reduction (if tracking)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.agencyReduction as number) || 0}
              onChange={(v) => setDomainInput('agencyReduction', v)}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-agency-reduction"
            />
          </div>
          <BenchmarkContext text="Benchmark: $5K–$30K/month agency and locum reduction as permanent staff stabilize. Derive from your current spend × reduction rate." />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
            Monthly savings from reduced physician vacancy / time-to-fill (if tracking)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.timeFillReduction as number) || 0}
              onChange={(v) => setDomainInput('timeFillReduction', v)}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-time-fill-reduction"
            />
          </div>
          <BenchmarkContext text="Physician vacancy typically costs $15K–$40K/month in locum coverage or lost productivity. Enter monthly savings if time-to-fill has improved." />
        </div>
      </div>
    );
  };

  const MONITORING_OPTIONS = [
    { id: 'spot_checks', label: 'Spot checks and informal review' },
    { id: 'systematic', label: 'Structured audits or dashboards' },
    { id: 'realtime', label: 'Real-time dashboard or automated quality reporting' },
  ];

  const renderRiskInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      const reviewedReports = currentState.inputs.qualityReportsReviewed as string || '';
      const REVIEW_OPTIONS = [
        { id: 'no', label: 'Not yet — downstream teams haven\'t engaged with it yet' },
        { id: 'informal', label: 'Starting informally — conversations have begun with coding, CDI, or compliance' },
        { id: 'yes', label: 'One or more teams are formally engaged' },
      ];
      return (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              Have any downstream teams started engaging with the improved documentation?
            </label>
            <div className="flex flex-col gap-2.5">
              {REVIEW_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                    reviewedReports === opt.id
                      ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                      : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-quality-reviewed-${opt.id}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    reviewedReports === opt.id ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                  }`}>
                    {reviewedReports === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[#EA2C00]" />}
                  </div>
                  <span className="text-sm text-[#525252]">{opt.label}</span>
                  <input type="radio" name="qualityReportsReviewed" value={opt.id} checked={reviewedReports === opt.id}
                    onChange={() => setDomainInput('qualityReportsReviewed', opt.id)} className="sr-only" />
                </label>
              ))}
            </div>
          </div>
          <p className="text-xs text-[#888888] italic">
            The downstream teams that benefit — coding, CDI, compliance — aren't formally connected yet. That happens at Level 2 and above.
          </p>
        </div>
      );
    }

    if (level === 2) {
      const approach = currentState.inputs.monitoringApproach as string || '';
      return (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-col gap-2.5">
              {MONITORING_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                    approach === opt.id
                      ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                      : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-monitoring-${opt.id}`}
                >
                  <div className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    approach === opt.id ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                  }`}>
                    {approach === opt.id && <div className="w-3 h-3 rounded-full bg-[#EA2C00]" />}
                  </div>
                  <span className="text-sm text-[#525252]">{opt.label}</span>
                  <input
                    type="radio"
                    name="monitoringApproach"
                    value={opt.id}
                    checked={approach === opt.id}
                    onChange={() => setDomainInput('monitoringApproach', opt.id)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {approach && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-black mb-3">
                  Which quality dimensions are being tracked?
                </label>
                <div className="flex flex-col gap-2.5">
                  {QUALITY_ATTRIBUTES.map((attr, i) => {
                    const checked = isChecked('qualityAttributes', i);
                    return (
                      <label
                        key={i}
                        htmlFor={`quality-attr-${i}`}
                        className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all active:scale-[0.99] ${
                          checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                        }`}
                      >
                        <Checkbox
                          id={`quality-attr-${i}`}
                          checked={checked}
                          onCheckedChange={() => toggleCheckboxItem('qualityAttributes', i)}
                          data-testid={`checkbox-quality-${i}`}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-[#525252] select-none leading-snug">
                          {attr}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (level === 3) {
      const noDownstreamValue = currentState.inputs.noDownstreamValue === 'true';
      const connectedWorkflowsCsv = (currentState.inputs.connectedWorkflows as string) || '';
      const connectedSet = new Set(connectedWorkflowsCsv.split(',').filter(Boolean));
      const cdiChecked = connectedSet.has('0');
      const mipsChecked = connectedSet.has('2');
      const hccChecked = connectedSet.has('5');

      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              Which downstream workflows have been connected to documentation quality?
            </label>
            <div className="flex flex-col gap-2.5">
              {DOWNSTREAM_WORKFLOWS.map((item, i) => {
                const checked = isChecked('connectedWorkflows', i);
                return (
                  <label
                    key={i}
                    htmlFor={`downstream-${i}`}
                    className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                    }`}
                  >
                    <Checkbox
                      id={`downstream-${i}`}
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('connectedWorkflows', i)}
                      data-testid={`checkbox-downstream-${i}`}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-[#525252] select-none leading-snug">
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {connectedWorkflowsCsv && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-black mb-3">
                  How would you describe the depth of measurement?
                </label>
                <div className="flex flex-col gap-2.5">
                  {[
                    { id: 'qualitative', label: 'Qualitative — impact is visible but not formally measured' },
                    { id: 'partial', label: 'Partially measured — some areas have data, others are anecdotal' },
                    { id: 'measured', label: 'Measured — we have data and can quantify the impact' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                        (currentState.inputs.qualityMeasurementDepth as string) === opt.id
                          ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                          : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                      }`}
                      data-testid={`radio-measurement-depth-${opt.id}`}
                    >
                      <div className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        (currentState.inputs.qualityMeasurementDepth as string) === opt.id ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                      }`}>
                        {(currentState.inputs.qualityMeasurementDepth as string) === opt.id && <div className="w-3 h-3 rounded-full bg-[#EA2C00]" />}
                      </div>
                      <span className="text-sm text-[#525252]">{opt.label}</span>
                      <input
                        type="radio"
                        name="qualityMeasurementDepth"
                        value={opt.id}
                        checked={(currentState.inputs.qualityMeasurementDepth as string) === opt.id}
                        onChange={() => setDomainInput('qualityMeasurementDepth', opt.id)}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Combined annual value of documentation quality improvements (optional — or use calculators below)
            </label>
            <p className="text-xs text-[#888888] mb-2">
              Include CDI efficiency savings, HCC/risk adjustment revenue, quality measure incentives, or other downstream value. Do not include documentation-driven wRVU, collections, or denial reduction — those belong in the Revenue domain.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={(currentState.inputs.downstreamValue as number) || 0}
                onChange={(v) => setDomainInput('downstreamValue', Math.max(0, v))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-downstream-value"
                disabled={noDownstreamValue}
              />
              <span className="text-xs text-[#888888]">/year</span>
            </div>
            <div className="flex items-center gap-2.5 mt-3">
              <Checkbox
                id="no-downstream-value"
                checked={noDownstreamValue}
                onCheckedChange={(checked) => {
                  setDomainInput('noDownstreamValue', checked ? 'true' : 'false');
                }}
                data-testid="checkbox-no-downstream-value"
              />
              <label htmlFor="no-downstream-value" className="text-sm text-[#525252] cursor-pointer select-none">
                Don't have a confirmed number — use calculators below
              </label>
            </div>
          </div>

          {cdiChecked && (
            <div className="pt-4 border-t border-[#E5E7EB]">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-1">CDI query reduction calculator</p>
              <p className="text-xs text-[#888888] mb-3 leading-relaxed">
                Estimate annual CDI efficiency savings from reduced query volume. Your CDI team will have these numbers.
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">CDI queries per month — before Abridge</label>
                  <FormattedNumberInput
                    value={(currentState.inputs.cdiQueriesBefore as number) || 0}
                    onChange={(v) => setDomainInput('cdiQueriesBefore', Math.max(0, v))}
                    placeholder=""
                    className="w-full h-12 bg-white border-[#E5E7EB]"
                    data-testid="input-cdi-queries-before"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">CDI queries per month — with Abridge</label>
                  <FormattedNumberInput
                    value={(currentState.inputs.cdiQueriesAfter as number) || 0}
                    onChange={(v) => setDomainInput('cdiQueriesAfter', Math.max(0, v))}
                    placeholder=""
                    className="w-full h-12 bg-white border-[#E5E7EB]"
                    data-testid="input-cdi-queries-after"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Cost per CDI query to resolve ($)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#888888]">$</span>
                    <FormattedNumberInput
                      value={(currentState.inputs.cdiQueryCost as number) || 100}
                      onChange={(v) => setDomainInput('cdiQueryCost', Math.max(0, v))}
                      placeholder=""
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-cdi-query-cost"
                    />
                  </div>
                  <BenchmarkContext text="Industry benchmark: $50–$150 per query (physician + CDI analyst time). Default $100." />
                </div>
              </div>
            </div>
          )}

          {hccChecked && (
            <div className="pt-4 border-t border-[#E5E7EB]">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-1">HCC / risk adjustment calculator</p>
              <p className="text-xs text-[#888888] mb-3 leading-relaxed">
                Improved documentation specificity increases chronic condition capture rates — the most underestimated financial lever in an ambient deployment. Better notes reflect what physicians already know about their patients.
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Medicare Advantage / VBC lives under risk contract</label>
                  <FormattedNumberInput
                    value={(currentState.inputs.maLives as number) || 0}
                    onChange={(v) => setDomainInput('maLives', Math.max(0, v))}
                    placeholder=""
                    className="w-full h-12 bg-white border-[#E5E7EB]"
                    data-testid="input-ma-lives"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Average annual payment per member ($)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#888888]">$</span>
                    <FormattedNumberInput
                      value={(currentState.inputs.avgAnnualPayment as number) || 13000}
                      onChange={(v) => setDomainInput('avgAnnualPayment', Math.max(0, v))}
                      placeholder=""
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-avg-annual-payment"
                    />
                  </div>
                  <BenchmarkContext text="National Medicare Advantage average: ~$12,000–$15,000/member/year. Use your contracted PMPM × 12 if known." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Expected HCC capture improvement (%)</label>
                  <div className="flex items-center gap-2">
                    <FormattedNumberInput
                      value={(currentState.inputs.hccImprovementPct as number) || 0}
                      onChange={(v) => setDomainInput('hccImprovementPct', Math.min(20, Math.max(0, v)))}
                      placeholder=""
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-hcc-improvement-pct"
                      step={0.5}
                    />
                    <span className="text-sm text-[#888888]">%</span>
                  </div>
                  <BenchmarkContext text="Ambient documentation typically improves chronic condition capture by 3–8% in year 1 through improved specificity and completeness. Use a conservative estimate — validate with actual RAF score data after 12+ months." />
                </div>
              </div>
            </div>
          )}

          {mipsChecked && (
            <div className="pt-4 border-t border-[#E5E7EB]">
              <p className="text-sm font-semibold text-[#1A1A1A] mb-1">MIPS / quality program value</p>
              <p className="text-xs text-[#888888] mb-3 leading-relaxed">
                Include penalty avoidance, quality incentive payments, or Stars / HEDIS bonus payments. Your quality team will have this figure.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#888888]">$</span>
                <FormattedNumberInput
                  value={(currentState.inputs.mipsValue as number) || 0}
                  onChange={(v) => setDomainInput('mipsValue', Math.max(0, v))}
                  placeholder=""
                  className="w-full h-12 bg-white border-[#E5E7EB]"
                  data-testid="input-mips-value"
                />
              </div>
              <BenchmarkContext text="2024 MIPS maximum penalty: 9% of Medicare Part B payments for lowest performers. For a group with $2M in Part B billing, max penalty exposure = $180K. Enter your estimated annual value from quality program improvement." />
            </div>
          )}
        </div>
      );
    }

    const executiveOwner = currentState.inputs.executiveOwner as string || '';
    const boardPresented = currentState.inputs.executiveBoardPresented as string || '';
    return (
      <div className="flex flex-col gap-5">
        <div>
          <div className="flex flex-col gap-2.5">
            {STRATEGIC_INTEGRATIONS.map((item, i) => {
              const checked = isChecked('strategicIntegrations', i);
              return (
                <label
                  key={i}
                  htmlFor={`strategic-${i}`}
                  className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all active:scale-[0.99] ${
                    checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                >
                  <Checkbox
                    id={`strategic-${i}`}
                    checked={checked}
                    onCheckedChange={() => toggleCheckboxItem('strategicIntegrations', i)}
                    data-testid={`checkbox-strategic-${i}`}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-[#525252] select-none leading-snug">
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
            Is there a named executive owner of documentation quality strategy?
          </label>
          <div className="flex flex-col gap-2">
            {[
              { id: 'yes', label: 'Yes' },
              { id: 'no', label: 'Not yet' },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                  executiveOwner === opt.id
                    ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                    : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                }`}
                data-testid={`radio-executive-owner-${opt.id}`}
              >
                <div className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  executiveOwner === opt.id ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                }`}>
                  {executiveOwner === opt.id && <div className="w-3 h-3 rounded-full bg-[#EA2C00]" />}
                </div>
                <span className="text-sm text-black">{opt.label}</span>
                <input
                  type="radio"
                  name="executiveOwner"
                  value={opt.id}
                  checked={executiveOwner === opt.id}
                  onChange={() => setDomainInput('executiveOwner', opt.id)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
            Has documentation quality been presented to the executive committee or board?
          </label>
          <div className="flex flex-col gap-2">
            {[
              { id: 'yes', label: 'Yes — it has been presented at the executive or board level' },
              { id: 'no', label: 'Not yet — it lives at the operational or department level' },
            ].map((opt) => (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                  boardPresented === opt.id
                    ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                    : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                }`}
                data-testid={`radio-board-presented-${opt.id}`}
              >
                <div className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  boardPresented === opt.id ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                }`}>
                  {boardPresented === opt.id && <div className="w-3 h-3 rounded-full bg-[#EA2C00]" />}
                </div>
                <span className="text-sm text-black">{opt.label}</span>
                <input
                  type="radio"
                  name="executiveBoardPresented"
                  value={opt.id}
                  checked={boardPresented === opt.id}
                  onChange={() => setDomainInput('executiveBoardPresented', opt.id)}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[#525252] mb-2">
            What is this value primarily based on?
          </p>
          <div className="flex flex-col gap-2 mb-4">
            {[
              { id: 'quality_penalties', label: 'Quality penalty avoidance (CMS, payer)' },
              { id: 'vbc_performance', label: 'Value-based care contract performance' },
              { id: 'cdi_savings', label: 'CDI program cost savings' },
              { id: 'compliance', label: 'Compliance / audit risk reduction' },
              { id: 'other', label: 'Other (describe in finance review)' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDomainInput('strategicValueBasis', opt.id)}
                className={`rounded-lg p-3 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                  (currentState.inputs.strategicValueBasis as string) === opt.id
                    ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                    : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                }`}
                data-testid={`radio-strategic-basis-${opt.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                    (currentState.inputs.strategicValueBasis as string) === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'
                  }`} />
                  <span>{opt.label}</span>
                </div>
              </button>
            ))}
          </div>

          {currentState.inputs.strategicValueBasis && (
            <>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                Annual strategic value attributed to documentation quality programs
              </label>
              <p className="text-xs text-[#888888] mb-2">
                Enter incremental strategic value not already captured at Level 3 — this could include VBC contract performance, compliance governance, or quality program design outcomes. CDI and HCC values entered above should not be re-entered here.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#888888]">$</span>
                <FormattedNumberInput
                  value={(currentState.inputs.strategicValue as number) || 0}
                  onChange={(v) => setDomainInput('strategicValue', Math.max(0, v))}
                  placeholder=""
                  className="w-full h-12 bg-white border-[#E5E7EB]"
                  data-testid="input-strategic-value"
                  disabled={currentState.inputs.noConfirmedStrategicValue === 'true'}
                />
              </div>
              {(currentState.inputs.strategicValueBasis as string) === 'vbc_performance' &&
                domainStates.revenue.activationLevel !== null && domainStates.revenue.activationLevel >= 4 && (
                <p className="text-xs text-[#92400E] italic mt-1">
                  ⚠ VBC performance may overlap with your Revenue domain value. Confirm these are separate with your finance team.
                </p>
              )}
              <div className="flex items-center gap-2.5 mt-3">
                <Checkbox
                  id="no-confirmed-strategic-value"
                  checked={currentState.inputs.noConfirmedStrategicValue === 'true'}
                  onCheckedChange={(checked) => {
                    setDomainInput('noConfirmedStrategicValue', checked ? 'true' : 'false');
                  }}
                  data-testid="checkbox-no-confirmed-strategic-value"
                />
                <label htmlFor="no-confirmed-strategic-value" className="text-sm text-[#525252] cursor-pointer select-none">
                  Don't have a confirmed number yet
                </label>
              </div>
              {currentState.inputs.noConfirmedStrategicValue === 'true' && (
                <p className="text-xs text-[#888888] italic mt-2 leading-relaxed bg-[#F9FAFB] p-3 rounded-lg">
                  Organizations at this level typically find value across: quality penalty avoidance ($10K–$50K per at-risk provider), VBC contract performance improvements ($200K–$2M+ for risk-bearing populations), and compliance governance programs. If you already calculated CDI or HCC value at Level 3, do not include those here — enter only incremental strategic value beyond what was already quantified.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDomainInputs = () => {
    switch (activeDomain) {
      case 'capacity': return renderCapacityInputs();
      case 'revenue': return renderRevenueInputs();
      case 'workforce': return renderWorkforceInputs();
      case 'risk': return renderRiskInputs();
    }
  };

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <div className="flex items-center justify-center gap-1 sm:gap-3 mb-8 sm:mb-10">
        {DOMAIN_ORDER.map((d, idx) => {
          const isActive = d === activeDomain;
          const hasLevel = domainStates[d].activationLevel !== null;

          return (
            <div key={d} className="flex items-center gap-1 sm:gap-3">
              <div className="flex flex-col items-center min-w-0">
                <button
                  onClick={() => { setActiveDomain(d); setTeaserOpen(false); }}
                  className={`text-[10px] sm:text-xs font-medium uppercase tracking-[0.5px] sm:tracking-[1.5px] mb-2 px-0.5 sm:px-1 py-1 whitespace-nowrap cursor-pointer transition-colors ${
                    isActive ? 'text-[#EA2C00]' : 'text-[#888888] hover:text-[#EA2C00]'
                  }`}
                  data-testid={`domain-label-${d}`}
                >
                  {DOMAIN_LABELS[d]}
                </button>
                {hasLevel ? (
                  <div
                    className="flex items-center justify-center w-5 h-5 rounded-full bg-[#EA2C00] text-white text-[9px] font-bold font-abridge"
                    data-testid={`domain-dot-${d}`}
                  >
                    {domainStates[d].activationLevel}
                  </div>
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-[#EA2C00]' : 'bg-[#D1D5DB]'
                    }`}
                    data-testid={`domain-dot-${d}`}
                  />
                )}
              </div>
              {idx < DOMAIN_ORDER.length - 1 && (
                <div className="w-3 sm:w-8 h-px bg-[#D1D5DB] mt-5" />
              )}
            </div>
          );
        })}
      </div>

      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        key={`header-${activeDomain}`}
      >
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-domain-headline">
          {config.headline}
        </h1>
        {config.subheadline && (
          <p className="text-lg sm:text-xl text-[#333333] max-w-[480px] mx-auto mb-8 text-center leading-snug" data-testid="text-domain-subheadline">
            {config.subheadline}
          </p>
        )}
      </motion.div>

      <motion.div
        className="lg:hidden bg-[#1A1A1A] rounded-xl px-4 py-3 mb-6 flex items-center justify-between"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        key={`mobile-strip-${activeDomain}-${feedback?.value}`}
        data-testid="mobile-impact-strip"
      >
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-white/50 uppercase tracking-wider">{DOMAIN_LABELS[activeDomain]}</span>
          <div className="w-px h-4 bg-white/10" />
          <span className="text-sm font-bold text-white">
            {feedback ? (feedback.hasValue && feedback.value ? formatDollar(feedback.value) : '—') : '—'}
          </span>
        </div>
        <span className="text-[12px] text-white/40 uppercase tracking-wider">
          {activeIdx + 1} of {DOMAIN_ORDER.length}
        </span>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-10">
        <div className="flex-1 min-w-0">
          <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-6 md:p-10 mb-8">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4" data-testid="text-domain-label">
              Where is your organization today?
            </p>

            <div className="flex flex-col">
              {config.cards.map((card, cardIdx) => {
                const selectedLevel = currentState.activationLevel;
                const isSelected = selectedLevel === card.level;
                const isClaimed = selectedLevel !== null && card.level < selectedLevel;
                const isFuture = selectedLevel !== null && card.level > selectedLevel;

                const staircaseCompletedSummary = isClaimed ? (() => {
                  const inp = currentState.inputs;
                  if (activeDomain === 'capacity') {
                    const ts = (inp.timeSaved as number) || (inputs.timeSavedPerEncounter as number) || 0;
                    if (card.level === 1 && ts > 0) {
                      const hrs = Math.round(documentedEncounters * ts / 60);
                      return `${hrs.toLocaleString()} hrs/yr`;
                    }
                    if (card.level === 2) {
                      const usageCsv = (inp.capacityTimeUsage as string) || '';
                      const usageCount = usageCsv.split(',').filter(Boolean).length;
                      if (usageCount > 0) return `${usageCount} active use${usageCount !== 1 ? 's' : ''}`;
                      return 'Confirmed';
                    }
                    if (card.level === 3) {
                      const pts = (inp.additionalPatientsPerMonth as number) || 0;
                      const rp = (inp.redesignedProviders as number) || providers;
                      if (pts > 0) {
                        const val = Math.round(pts * rp * 11 * revenuePerVisit);
                        return formatDollar(val);
                      }
                    }
                  }
                  if (activeDomain === 'workforce') {
                    if (card.level === 1) {
                      const mins = (inp.editTimeSaved as number) || 0;
                      if (mins > 0) {
                        const clinicHrs = Math.round(mins * providers * 230 / 60);
                        return `${clinicHrs.toLocaleString()} hrs/yr`;
                      }
                    }
                    if (card.level === 2) {
                      const behaviorsCsv = (inp.observedBehaviors as string) || '';
                      const behaviorCount = behaviorsCsv.split(',').filter(Boolean).length;
                      if (behaviorCount > 0) return `${behaviorCount} change${behaviorCount !== 1 ? 's' : ''} observed`;
                    }
                    if (card.level === 3) {
                      const trBefore = (inp.beforeTurnoverRate as number) || 0;
                      const trAfter = (inp.afterTurnoverRate as number) || 0;
                      const rc = (inp.replacementCost as number) || 350000;
                      if (trBefore > 0 && trAfter < trBefore) {
                        const delta = trBefore - trAfter;
                        const retentionValue = Math.round(providers * (delta / 100) * rc);
                        return formatDollar(retentionValue);
                      }
                      if (trBefore > 0) {
                        return `${trBefore}% → enter after rate`;
                      }
                    }
                  }
                  if (activeDomain === 'risk') {
                    if (card.level === 2) {
                      const attrCsv = (inp.qualityAttributes as string) || '';
                      const attrCount = attrCsv.split(',').filter(Boolean).length;
                      const approach = inp.monitoringApproach as string;
                      const approachLabel = approach === 'realtime' ? 'Real-time' : approach === 'systematic' ? 'Structured' : approach === 'spot_checks' ? 'Informal' : '';
                      if (attrCount > 0) return `${attrCount} of 5${approachLabel ? ` · ${approachLabel}` : ''}`;
                      if (approachLabel) return approachLabel;
                    }
                    if (card.level === 3) {
                      const fp = inp.financialPathway as string;
                      if (fp === 'mips') return 'MIPS connected';
                      if (fp === 'denials') return 'Denials connected';
                      if (fp === 'none_yet') return 'No pathway yet';
                    }
                    if (card.level === 4) {
                      const siCsv = (inp.strategicIntegrations as string) || '';
                      const siCount = siCsv.split(',').filter(Boolean).length;
                      if (siCount > 0) return `${siCount} strategic area${siCount !== 1 ? 's' : ''}`;
                    }
                  }
                  if (activeDomain === 'revenue') {
                    if (card.level === 1) {
                      const engaged = inp.revenueCycleEngaged as string;
                      const status = inp.revenueCycleStatus as string;
                      if (engaged === 'yes' && status === 'measured') return 'Engaged — has data';
                      if (engaged === 'yes' && status === 'analyzing') return 'Engaged — analyzing';
                      if (engaged === 'yes') return 'Engaged';
                      if (engaged === 'informal') return 'Informally aware';
                      return 'Confirmed';
                    }
                    if (card.level === 2) {
                      const areas = (inp.observedMovement as string) || '';
                      const count = areas.split(',').filter(Boolean).length;
                      return count > 0 ? `${count} signal${count !== 1 ? 's' : ''} observed` : 'Confirmed';
                    }
                    if (card.level === 3) {
                      const metricType = inp.revenueMetricType as string;
                      if (metricType) {
                        const fb = computeRevenueFeedback(3, inp, documentedEncounters, revenuePerVisit, inputs.conversionFactor || 33, providers);
                        if (fb.hasValue && fb.value) return formatDollar(fb.value);
                        return metricType === 'wrvu' ? 'wRVU measured' : metricType === 'collections' ? 'Collections measured' : metricType === 'denial_rate' ? 'Denial rate measured' : 'Revenue measured';
                      }
                    }
                  }
                  return 'Confirmed';
                })() : null;

                if (isClaimed) {
                  return (
                    <motion.div
                      key={card.level}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: cardIdx * 0.05, ease: "easeOut" }}
                      className="group bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl mb-2 cursor-pointer hover:border-[#EA2C00]/30 transition-all duration-200"
                      onClick={() => setActivation(card.level)}
                      data-testid={`activation-card-${activeDomain}-${card.level}`}
                      data-domain-level={`${activeDomain}-${card.level}`}
                    >
                      <div className="flex items-center gap-4 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-[#EA2C00] flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span className="text-sm font-semibold text-[#1A1A1A]">{card.label}</span>
                        <div className="ml-auto flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#EA2C00]" data-testid={`completed-value-${activeDomain}-${card.level}`}>
                            {staircaseCompletedSummary}
                          </span>
                          <span className="text-xs text-[#AAAAAA] opacity-0 group-hover:opacity-100 transition-opacity duration-200">Edit</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                if (isSelected) {
                  return (
                    <motion.div
                      key={card.level}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: cardIdx * 0.05, ease: "easeOut" }}
                      className="bg-white border-2 border-[#EA2C00] rounded-xl mb-3 shadow-[0_6px_28px_rgba(234,44,0,0.14)] overflow-hidden ring-1 ring-[#EA2C00]/10"
                      data-testid={`activation-card-${activeDomain}-${card.level}`}
                      data-domain-level={`${activeDomain}-${card.level}`}
                    >
                      <div className="px-5 pt-5 pb-4 border-b border-[#F5F0EB]">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#EA2C00] flex items-center justify-center flex-shrink-0">
                            <span className="text-base font-bold text-white font-abridge">{card.level}</span>
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-base font-semibold text-[#1A1A1A]">{card.label}</p>
                            <p className="text-xs text-[#888888] italic mt-0.5">{card.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="px-5 pb-6 pt-5">
                        {feedback && feedback.headlineMetric && (
                          <p className="font-bold text-xl text-[#EA2C00] leading-none mb-4" data-testid="text-ladder-value">
                            {feedback.headlineMetric}
                          </p>
                        )}
                        {renderDomainInputs()}
                      </div>
                    </motion.div>
                  );
                }

                const futureDesc = (card.level >= 3) ? FUTURE_DESCRIPTIONS[activeDomain]?.[card.level] : config.unlockTeasers?.[card.level];

                return (
                  <motion.div
                    key={card.level}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: cardIdx * 0.05, ease: "easeOut" }}
                    className="bg-white border border-[#D9D3CB] rounded-xl mb-3 cursor-pointer hover:border-[#EA2C00]/50 hover:shadow-sm transition-all duration-200"
                    onClick={() => setActivation(card.level)}
                    data-testid={`activation-card-${activeDomain}-${card.level}`}
                    data-domain-level={`${activeDomain}-${card.level}`}
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="w-8 h-8 rounded-full bg-[#F0ECE6] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-[#666666]">{card.level}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#444444]">{card.label}</p>
                        {isFuture && futureDesc && (
                          <p className="text-xs text-[#777777] mt-0.5 leading-relaxed">{futureDesc}</p>
                        )}
                      </div>
                      <span className="text-sm text-[#AAAAAA] ml-auto">→</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <StepFooter
            onBack={handleDomainBack}
            onNext={handleAdvance}
            nextLabel={DOMAIN_CTA[activeDomain]}
            nextDisabled={!currentState.activationLevel}
            showBack={false}
          />
          <div className={STEP_FOOTER_SPACER_CLASS} />
        </div>

        <motion.div
          className="w-full md:w-[300px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          key={`sidebar-${activeDomain}`}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-5 md:sticky md:top-20 space-y-4" data-testid="card-domain-feedback">

            <div>
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[2px] mb-2">
                Estimated Impact
              </p>
              {feedback ? (
                <p className="font-bold text-2xl text-[#EA2C00] leading-tight" data-testid="text-feedback-value">
                  {feedback.headlineMetric || (feedback.hasValue && feedback.value !== null && feedback.value !== undefined ? formatDollar(feedback.value) : '—')}
                </p>
              ) : (
                <p className="font-bold text-2xl text-white/20 leading-tight">—</p>
              )}
            </div>

            {(() => {
              const inp = currentState.inputs;
              const level = currentState.activationLevel;
              if (!level) return null;

              const items: string[] = [];

              if (activeDomain === 'capacity') {
                const ts = (inp.timeSaved as number) || (inputs.timeSavedPerEncounter as number) || 0;
                if (ts > 0) items.push(`${ts} min saved per encounter`);
                if (level >= 2) {
                  const csv = (inp.capacityTimeUsage as string) || '';
                  csv.split(',').filter(Boolean).forEach(i => {
                    const label = CAPACITY_TIME_USAGE_LABELS[parseInt(i)];
                    if (label) items.push(label);
                  });
                }
                if (level >= 3) {
                  const pts = (inp.additionalPatientsPerMonth as number) || 0;
                  if (pts > 0) items.push(`${pts} additional patients/provider/mo`);
                  const conf = (inp.capacityAccessConfidence as string) || '';
                  if (conf) items.push(`${conf.charAt(0).toUpperCase() + conf.slice(1)} confidence`);
                }
                if (level >= 4) {
                  const csv = (inp.accessOutcomes as string) || '';
                  csv.split(',').filter(Boolean).forEach(i => {
                    const opts = ['Panel size increased','New patient slots opened','Same-day/urgent access expanded','Referral-to-visit time reduced','Third-next-available improved','No-show backfill utilized'];
                    if (opts[parseInt(i)]) items.push(opts[parseInt(i)]);
                  });
                }
              }

              if (activeDomain === 'revenue') {
                if (level >= 2) {
                  const csv = (inp.observedMovement as string) || '';
                  csv.split(',').filter(Boolean).forEach(i => {
                    const opts = ['wRVU per encounter trending upward','Coding specificity improving (ICD-10 distribution shifting)','Denial rates trending downward','Collections per encounter trending upward','CDI query volume decreasing','Coder productivity improving'];
                    if (opts[parseInt(i)]) items.push(opts[parseInt(i)]);
                  });
                }
                if (level >= 3) {
                  const mt = inp.revenueMetricType as string;
                  if (mt === 'wrvu') { const d = (inp.measuredWrvuDelta as number) || 0; if (d > 0) items.push(`+${d} wRVU delta per encounter`); }
                  if (mt === 'collections') { const d = (inp.measuredCollectionsDelta as number) || 0; if (d > 0) items.push(`+$${d} collections per encounter`); }
                  if (mt === 'denial_rate') { const d = (inp.measuredDenialReduction as number) || 0; if (d > 0) items.push(`${d}% denial reduction`); }
                }
              }

              if (activeDomain === 'workforce') {
                const mins = (inp.editTimeSaved as number) || 0;
                if (mins > 0) items.push(`${mins} min saved per encounter`);
                if (level >= 2) {
                  const csv = (inp.observedBehaviors as string) || '';
                  const behaviorLabels = [
                    'After-hours documentation time reduced',
                    'Leaving clinic on time more consistently',
                    'Taking lunch breaks resumed',
                    'Work-outside-of-work documentation eliminated or reduced',
                    'Weekend catch-up work reduced',
                    'Notes completed before leaving the clinic',
                    'More present at home / personal time reclaimed',
                  ];
                  csv.split(',').filter(Boolean).forEach(i => {
                    if (behaviorLabels[parseInt(i)]) items.push(behaviorLabels[parseInt(i)]);
                  });
                  const ahr = (inp.afterHoursReduction as number) || 0;
                  if (ahr > 0) items.push(`${ahr} after-hours hrs/provider/wk reduced`);
                }
                if (level >= 3) {
                  const trB = (inp.beforeTurnoverRate as number) || 0;
                  const trA = (inp.afterTurnoverRate as number) || 0;
                  if (trB > 0) items.push(`Turnover: ${trB}% → ${trA > 0 ? trA + '%' : 'entering after rate'}`);
                }
                if (level >= 4) {
                  const csv = (inp.workforceStrategies as string) || '';
                  const stratLabels = [
                    'Recruitment and hiring — ambient documentation is part of the value proposition to candidates',
                    'Retention program design — burden reduction is a measured component of retention initiatives',
                    'Time-to-fill tracking — positions are filling faster partly attributed to improved work environment',
                    'Provider experience strategy — documentation burden metrics are tracked alongside satisfaction and engagement',
                    'Staffing model decisions — documentation efficiency informs how shifts, panels, or coverage are structured',
                    'Agency/locum spend actively managed against burden reduction trends',
                  ];
                  csv.split(',').filter(Boolean).forEach(i => {
                    if (stratLabels[parseInt(i)]) items.push(stratLabels[parseInt(i)]);
                  });
                }
              }

              if (activeDomain === 'risk') {
                if (level >= 2) {
                  const approach = inp.monitoringApproach as string;
                  if (approach) items.push(`Monitoring: ${approach.replace('_', ' ')}`);
                  const csv = (inp.qualityAttributes as string) || '';
                  csv.split(',').filter(Boolean).forEach(i => {
                    if (QUALITY_ATTRIBUTES[parseInt(i)]) items.push(QUALITY_ATTRIBUTES[parseInt(i)]);
                  });
                }
                if (level >= 3) {
                  const csv = (inp.connectedWorkflows as string) || '';
                  csv.split(',').filter(Boolean).forEach(i => {
                    if (DOWNSTREAM_WORKFLOWS[parseInt(i)]) items.push(DOWNSTREAM_WORKFLOWS[parseInt(i)]);
                  });
                  const depth = inp.qualityMeasurementDepth as string;
                  if (depth) items.push(`Measurement: ${depth}`);
                  const dv = inp.downstreamValue as number;
                  if (dv > 0) items.push(`Downstream value: $${dv.toLocaleString()}`);
                }
                if (level >= 4) {
                  const csv = (inp.strategicIntegrations as string) || '';
                  csv.split(',').filter(Boolean).forEach(i => {
                    if (STRATEGIC_INTEGRATIONS[parseInt(i)]) items.push(STRATEGIC_INTEGRATIONS[parseInt(i)]);
                  });
                }
              }

              if (items.length === 0) return null;

              return (
                <div>
                  <div className="h-px bg-white/[0.08] mb-3" />
                  <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[2px] mb-2">
                    What you told us
                  </p>
                  <div className="space-y-1.5">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[#EA2C00] text-[10px] mt-0.5 shrink-0">✓</span>
                        <span className="text-xs text-white/70 leading-snug">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {feedback?.context && (
              <div>
                <div className="h-px bg-white/[0.08]" />
                <p className="text-xs text-white/50 leading-relaxed pt-3">
                  {feedback.context.split(/\.\s+/)[0].replace(/\.$/, '')}.
                </p>
              </div>
            )}

            {feedback?.nextLevelTeaser && (
              <div>
                <button
                  onClick={() => setTeaserOpen(v => !v)}
                  className="flex items-center gap-1.5 text-[11px] text-white/35 hover:text-white/60 transition-colors"
                  data-testid="btn-teaser-toggle"
                >
                  <span>What unlocks next</span>
                  <svg className={`w-3 h-3 transition-transform ${teaserOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {teaserOpen && (
                  <p className="text-xs text-white/50 italic leading-relaxed mt-2 pl-3 border-l border-[#EA2C00]/40" data-testid="text-next-level-teaser">
                    {feedback.nextLevelTeaser}
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="h-px bg-white/[0.08] mb-3" />
              <p className="text-[10px] font-semibold text-white/30 uppercase tracking-[2px] mb-2">
                Progress
              </p>
              <div className="space-y-2">
                {DOMAIN_ORDER.map((d) => {
                  const isActive = d === activeDomain;
                  const dState = domainStates[d];
                  const level = dState.activationLevel;
                  const gapValue = (inputs as any)[`${d}Gap`] as number || 0;
                  const hasVal = (inputs as any)[`${d}HasValue`] as boolean;
                  const levelColors: Record<number, string> = { 1: 'text-white/40', 2: 'text-[#F59E0B]', 3: 'text-[#EA2C00]', 4: 'text-[#EA2C00]' };
                  return (
                    <div key={d} className={`flex items-center justify-between text-xs ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                      <span className={`font-medium ${isActive ? 'text-white' : 'text-white/50'}`}>
                        {DOMAIN_LABELS[d]}
                      </span>
                      <div className="flex items-center gap-2">
                        {level ? (
                          <span className={`text-[10px] font-bold ${levelColors[level] || 'text-white/40'}`}>L{level}</span>
                        ) : (
                          <span className="text-white/20 text-[10px]">—</span>
                        )}
                        {hasVal && gapValue > 0 ? (
                          <span className="text-white/70 font-semibold">{formatDollar(gapValue)}</span>
                        ) : level ? (
                          <span className="text-white/25 text-[10px]">no value</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(() => {
                const total = (['capacity','revenue','workforce','risk'] as Domain[]).reduce((sum, d) => {
                  const v = (inputs as any)[`${d}Gap`] as number || 0;
                  return sum + v;
                }, 0);
                if (total <= 0) return null;
                return (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.08]">
                    <span className="text-[10px] font-semibold text-white/30 uppercase tracking-[1.5px]">Running Total</span>
                    <span className="text-sm font-bold text-[#EA2C00]">{formatDollar(total)}</span>
                  </div>
                );
              })()}
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
