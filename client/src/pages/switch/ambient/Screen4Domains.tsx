import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
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
  type DomainFeedback,
  CLINICAL_WEEKS, ANNUAL_HOURS,
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
  framingQuestions?: Record<number, string | undefined>;
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
      { level: 2, label: 'Access Decision Made', description: 'Organization has decided to convert recovered time into patient access.' },
      { level: 3, label: 'Access Measured', description: 'Additional patients are being seen with recovered time.' },
      { level: 4, label: 'Access Impact Tracked', description: 'Downstream access outcomes are tracked and attributed to recovered time.' },
    ],
    framingQuestions: {
      1: undefined,
      2: 'Where does your organization stand on converting recovered time to patient access?',
      3: 'How many additional patients are being seen with recovered time?',
      4: 'Which downstream access outcomes are you tracking?',
    },
    unlockTeasers: {
      2: 'Decide how recovered time will be used for patient access.',
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
    framingQuestions: {
      1: 'Has your organization reviewed how documentation changes from ambient affect coding or reimbursement?',
      2: 'What movement has your team observed since deployment?',
      3: undefined,
      4: 'How is documentation quality being used strategically in revenue decisions?',
    },
    unlockTeasers: {
      2: 'Observe trends in coding, denials, and collections.',
      3: 'Complete a before/after analysis to quantify documentation-driven revenue impact.',
      4: 'Integrate documentation intelligence into revenue strategy and financial planning.',
    },
  },
  workforce: {
    label: 'WORKFORCE',
    headline: 'WORKFORCE',
    subheadline: 'Has reduced burden been connected to what turnover costs?',
    reframe: '',
    cards: [
      { level: 1, label: 'Time Is Returning', description: 'Providers report less after-hours documentation time.' },
      { level: 2, label: 'Burden Measured', description: 'In-clinic time savings and provider sentiment are tracked.' },
      { level: 3, label: 'Retention Modeled', description: 'Turnover costs are modeled with documentation burden as a factor.' },
      { level: 4, label: 'Workforce Strategically Managed', description: 'Documentation burden reduction is a variable in workforce strategy — recruitment, retention programs, and staffing decisions.' },
    ],
    framingQuestions: {
      1: undefined,
      2: undefined,
      3: undefined,
      4: 'Where is documentation burden data informing workforce strategy?',
    },
    unlockTeasers: {
      2: 'Measure in-clinic time savings and survey providers.',
      3: 'Model turnover costs with documentation burden as a variable.',
      4: 'Connect burden reduction to workforce strategy decisions.',
    },
  },
  risk: {
    label: 'QUALITY',
    headline: 'QUALITY',
    subheadline: 'How far has documentation quality traveled downstream?',
    reframe: '',
    cards: [
      { level: 1, label: 'Downstream Unmeasured', description: 'Documentation quality has improved. The teams that benefit from it — coding, CDI, compliance — haven\'t been formally connected to it yet.' },
      { level: 2, label: 'Actively Monitored', description: 'Documentation quality attributes are being tracked systematically.' },
      { level: 3, label: 'Downstream Connected', description: 'Documentation quality improvements are connected to at least one downstream program or workflow.' },
      { level: 4, label: 'Documentation as a Strategic Asset', description: 'Structured documentation informs organizational strategy — quality programs, value-based care, compliance governance, and AI readiness.' },
    ],
    framingQuestions: {
      1: 'Have any downstream teams — coding, CDI, compliance — started working with the improved documentation?',
      2: 'How are documentation quality metrics being tracked?',
      3: 'Which downstream areas have been connected to documentation quality improvements?',
      4: 'Where does documentation quality inform organizational strategy?',
    },
    unlockTeasers: {
      2: 'Establish systematic tracking of documentation quality attributes.',
      3: 'Connect documentation quality to at least one downstream program.',
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
    3: 'Model turnover costs with documentation burden as a contributing factor.',
    4: 'Documentation burden reduction informs recruitment, retention programs, and staffing decisions.',
  },
  risk: {
    3: 'Connect documentation quality improvements to downstream programs — CDI, coding, quality measures.',
    4: 'Structured documentation informs quality programs, value-based care, compliance, and AI readiness.',
  },
};

function BenchmarkContext({ text }: { text: string }) {
  return <p className="text-xs text-[#999999] italic mt-2">{text}</p>;
}

function FormulaDisplay({ formula }: { formula: string }) {
  if (!formula) return null;
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <p className="text-[12px] font-medium text-white/40 uppercase tracking-[1.5px] mb-2">Formula</p>
      {formula.split('\n').map((line, i) => (
        <p key={i} className="text-xs text-white/50 italic leading-relaxed font-mono">{line}</p>
      ))}
    </div>
  );
}

export default function Screen4Domains({ onNext, onBack, initialDomain }: Screen4Props) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;
  const [activeDomain, setActiveDomain] = useState<Domain>(initialDomain || 'capacity');

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
    const target = pendingScrollRef.current;
    pendingScrollRef.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-domain-level="${target}"]`);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 80;
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        }
      });
    });
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
      case 'revenue': return computeRevenueFeedback(level, inp, documentedEncounters, revenuePerVisit, inputs.conversionFactor || 33);
      case 'workforce': return computeWorkforceFeedback(level, inp, providers);
      case 'risk': return computeRiskFeedback(level, inp, documentedEncounters, revenuePerVisit);
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onNext();
    }
  };

  const handleDomainBack = () => {
    const idx = DOMAIN_ORDER.indexOf(activeDomain);
    if (idx > 0) {
      setActiveDomain(DOMAIN_ORDER[idx - 1]);
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
      const accessDecisionStage = currentState.inputs.accessDecisionStage as string | undefined;
      return (
        <div className="mb-5">
          <div className="flex flex-col gap-2.5">
            {[
              { id: 'evaluating', label: 'Evaluating — exploring whether recovered time can drive access' },
              { id: 'planning', label: 'Planning — scoping scheduling or template changes' },
              { id: 'piloting', label: 'Piloting — testing access changes with a subset of providers' },
              { id: 'implementing', label: 'Implementing — rolling out access redesign broadly' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDomainInput('accessDecisionStage', opt.id)}
                className={`rounded-lg p-3.5 sm:p-4 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                  accessDecisionStage === opt.id
                    ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                    : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                }`}
                data-testid={`radio-access-stage-${opt.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${accessDecisionStage === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                  <span>{opt.label}</span>
                </div>
              </button>
            ))}
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
            <BenchmarkContext text="Structured access redesign: 3–8 patients/provider/month" />
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
          <label className="block text-sm font-medium text-black mb-3">
            Which downstream access outcomes are you tracking?
          </label>
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
    { id: 'revenue_pct', label: 'Overall revenue change' },
    { id: 'denial_rate', label: 'Denial rate reduction' },
  ];

  const REVENUE_METRIC_BENCHMARKS: Record<string, string> = {
    wrvu: 'Abridge benchmark: 0.05\u20130.15 wRVU per encounter. Based on aggregated deployment experience.',
    collections: 'Organizations at this level have reported $3\u2013$10 increase per encounter. Based on aggregated deployment experience.',
    revenue_pct: 'Organizations at this level have reported 2\u20137% improvement. Based on aggregated deployment experience.',
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
      const directionalEstimate = currentState.inputs.directionalEstimate as string || '';
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              What has your organization observed?
            </label>
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
              What's your directional estimate of the revenue impact?
            </label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'under_1', label: 'Under 1% of encounter revenue' },
                { id: '1_3', label: '1–3% of encounter revenue' },
                { id: '3_5', label: '3–5% of encounter revenue' },
                { id: '5_plus', label: '5%+ of encounter revenue' },
                { id: 'not_sure', label: 'Not sure — we see movement but haven\'t estimated' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDomainInput('directionalEstimate', opt.id)}
                  className={`rounded-lg p-3 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                    directionalEstimate === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-directional-estimate-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${directionalEstimate === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (level === 3) {
      const metricType = currentState.inputs.revenueMetricType as string | undefined;
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              What did you measure?
            </label>
            <div className="flex flex-col gap-2.5">
              {REVENUE_METRIC_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDomainInput('revenueMetricType', opt.id)}
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
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
              </motion.div>
            )}
            {metricType === 'collections' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                  Measured collections change per encounter since deployment
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
                <BenchmarkContext text={REVENUE_METRIC_BENCHMARKS.collections} />
              </motion.div>
            )}
            {metricType === 'revenue_pct' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                  Measured revenue change (%) attributed to documentation
                </label>
                <div className="flex items-center gap-2">
                  <FormattedNumberInput
                    value={(currentState.inputs.measuredRevenuePct as number) || 0}
                    onChange={(v) => setDomainInput('measuredRevenuePct', Math.min(100, Math.max(0, v)))}
                    placeholder=""
                    className="w-full h-12 bg-white border-[#E5E7EB]"
                    data-testid="input-revenue-pct"
                  />
                  <span className="text-sm text-[#888888]">%</span>
                </div>
                <BenchmarkContext text={REVENUE_METRIC_BENCHMARKS.revenue_pct} />
              </motion.div>
            )}
            {metricType === 'denial_rate' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                  Measured denial rate reduction
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
                  <span className="text-sm text-[#888888]">%</span>
                </div>
                <BenchmarkContext text={REVENUE_METRIC_BENCHMARKS.denial_rate} />
              </motion.div>
            )}
          </AnimatePresence>
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
              Abridge deployment benchmark at {documentedEncounters.toLocaleString()} encounters with revenue cycle integration: $200K–$600K annually. This can serve as a working estimate.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderWorkforceInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      return (
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
            After-hours time returned
          </label>
          <div className="flex items-center gap-2">
            <FormattedNumberInput
              value={(currentState.inputs.afterHoursReduction as number) || 2.0}
              onChange={(v) => setDomainInput('afterHoursReduction', Math.max(0, v))}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-after-hours"
            />
            <span className="text-sm text-[#888888] whitespace-nowrap">hrs/wk</span>
          </div>
          <p className="text-xs text-[#888888] mt-1.5">Pre-filled from deployment benchmarks (2 hrs/week). Adjust to match your organization's data.</p>
          <BenchmarkContext text="Abridge benchmark: 1–3 hrs/week" />
        </div>
      );
    }

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

    if (level === 2) {
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
            <BenchmarkContext text="Abridge benchmark: 10–20 min/day" />
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
                    {surveyType === opt.id && <div className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full bg-[#EA2C00]" />}
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
              Informal feedback is a start. Consider a structured survey measuring documentation burden, satisfaction, and likelihood to stay — this data becomes critical at Level 3.
            </p>
          )}

          {surveyType === 'structured' && (
            <>
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

            </>
          )}
        </div>
      );
    }

    if (level === 3) {
      const docBurdenOptions = [
        { value: 10, label: '~10%' },
        { value: 20, label: '~20%' },
        { value: 30, label: '~30%' },
        { value: 40, label: '~40%' },
        { value: 60, label: '~60%' },
      ];
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Annual physician turnover rate
            </label>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={(currentState.inputs.turnoverRate as number) || 0}
                onChange={(v) => setDomainInput('turnoverRate', v)}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-turnover-rate"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
            <BenchmarkContext text="National average: 6–8% annually (AAMC)" />
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
            <BenchmarkContext text="AMGA benchmark midpoint: $350K. Industry range: $250K–$500K." />
            {((currentState.inputs.replacementCost as number) === 350000 || !(currentState.inputs.replacementCost as number)) && (
              <p className="text-[11px] text-[#999999] italic mt-1 leading-relaxed">
                Using AMGA benchmark default ($350K). Enter your organization's actual replacement cost for a more precise estimate.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              How much of turnover is burden-related?
            </label>
            <div className="flex flex-col gap-2">
              {docBurdenOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDomainInput('docBurdenShare', opt.value)}
                  className={`rounded-lg p-3 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                    (currentState.inputs.docBurdenShare as number) === opt.value
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-burden-share-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#888888] mt-2">Shanafelt et al.: documentation burden is a top-3 driver of voluntary turnover.</p>
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
          <BenchmarkContext text="Organizations at this level have reported $5K–$30K/month in agency and locum spend reduction. Based on aggregated deployment experience." />
        </div>
      </div>
    );
  };

  const MONITORING_OPTIONS = [
    { id: 'not_yet', label: "Not tracking formally yet" },
    { id: 'spot_checks', label: 'Spot checks and anecdotal' },
    { id: 'systematic', label: 'Structured audits or dashboards' },
  ];

  const renderRiskInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      const downstreamConnected = (currentState.inputs.qualityDownstreamConnected as string) || '';
      return (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-col gap-2">
              {[
                { id: 'no', label: 'Not yet' },
                { id: 'informal', label: 'Starting informally' },
                { id: 'yes', label: 'One team is formally in' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                    downstreamConnected === opt.id
                      ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                      : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-downstream-${opt.id}`}
                >
                  <div className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    downstreamConnected === opt.id ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                  }`}>
                    {downstreamConnected === opt.id && <div className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full bg-[#EA2C00]" />}
                  </div>
                  <span className="text-sm text-black">{opt.label}</span>
                  <input
                    type="radio"
                    name="qualityDownstreamConnected"
                    value={opt.id}
                    checked={downstreamConnected === opt.id}
                    onChange={() => setDomainInput('qualityDownstreamConnected', opt.id)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </div>
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
                    {approach === opt.id && <div className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full bg-[#EA2C00]" />}
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
            {approach === 'systematic' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-black mb-3">
                  What documentation attributes are you tracking?
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
      const depth = currentState.inputs.qualityMeasurementDepth as string || '';
      const noDownstreamValue = currentState.inputs.noDownstreamValue === 'true';

      return (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-col gap-2.5">
              {DOWNSTREAM_WORKFLOWS.map((wf, i) => {
                const checked = isChecked('connectedWorkflows', i);
                return (
                  <label
                    key={i}
                    htmlFor={`workflow-${i}`}
                    className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                    }`}
                  >
                    <Checkbox
                      id={`workflow-${i}`}
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('connectedWorkflows', i)}
                      data-testid={`checkbox-workflow-${i}`}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-[#525252] select-none leading-snug">
                      {wf}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              For connected areas, has the impact been measured?
            </label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'qualitative', label: 'Qualitatively — we can see improvement but haven\'t quantified it' },
                { id: 'partial', label: 'Partially — some areas have before/after data' },
                { id: 'measured', label: 'Yes — we have measured data for connected workflows' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                    depth === opt.id
                      ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                      : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-measurement-depth-${opt.id}`}
                >
                  <div className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    depth === opt.id ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                  }`}>
                    {depth === opt.id && <div className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full bg-[#EA2C00]" />}
                  </div>
                  <span className="text-sm text-[#525252]">{opt.label}</span>
                  <input
                    type="radio"
                    name="qualityMeasurementDepth"
                    value={opt.id}
                    checked={depth === opt.id}
                    onChange={() => setDomainInput('qualityMeasurementDepth', opt.id)}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Combined annual value of documentation quality improvements across connected workflows (optional)
            </label>
            <p className="text-xs text-[#888888] mb-2">
              This could include CDI efficiency gains, coding accuracy improvements, quality measure incentives captured, abstraction time saved, or other measurable downstream value.
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
                Don't have a combined number yet
              </label>
            </div>
          </div>
        </div>
      );
    }

    const executiveOwner = currentState.inputs.executiveOwner as string || '';
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
                  {executiveOwner === opt.id && <div className="w-2.5 h-2.5 sm:w-2 sm:h-2 rounded-full bg-[#EA2C00]" />}
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
            Annual strategic value attributed to documentation quality programs (optional)
          </label>
          <p className="text-xs text-[#888888] mb-2">
            This is hard to quantify precisely. If your organization can estimate the combined strategic value of documentation-driven quality, compliance, VBC, and AI initiatives — enter it here. If not, leave blank.
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

  const renderImpactValue = (fb: DomainFeedback) => {
    if (fb.headlineMetric) {
      return (
        <p className="font-bold text-xl sm:text-2xl text-[#EA2C00] leading-[1.1] mb-4" data-testid="text-feedback-value">
          {fb.headlineMetric}
        </p>
      );
    }
    if (!fb.hasValue && fb.value === null) {
      return (
        <p className="text-sm text-white/60 leading-relaxed italic mb-4" data-testid="text-feedback-value">
          {fb.context || "Enter the inputs above to see your estimated impact."}
        </p>
      );
    }
    if (fb.value === 0) {
      return (
        <p className="font-bold text-3xl sm:text-4xl text-white/50 leading-[1.1] mb-4" data-testid="text-feedback-value">
          $0
        </p>
      );
    }
    return (
      <p className="font-bold text-3xl sm:text-4xl text-[#EA2C00] leading-[1.1] mb-4" data-testid="text-feedback-value">
        {formatDollar(fb.value || 0)}
      </p>
    );
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
                  onClick={() => setActiveDomain(d)}
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

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
        <div className="flex-1 max-w-[700px]">
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
                      const stage = inp.accessDecisionStage as string;
                      if (stage) return stage.charAt(0).toUpperCase() + stage.slice(1);
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
                      const ahr = (inp.afterHoursReduction as number) || 2.0;
                      const hrs = Math.round(ahr * providers * CLINICAL_WEEKS);
                      return `${hrs.toLocaleString()} hrs/yr`;
                    }
                    if (card.level === 2) {
                      const mins = (inp.editTimeSaved as number) || 0;
                      if (mins > 0) {
                        const clinicHrs = Math.round(mins * providers * 230 / 60);
                        const cAfterHours = (inp.confirmedAfterHoursReduction as number) || (inp.afterHoursReduction as number) || 0;
                        const ahHrs = cAfterHours > 0 ? Math.round(cAfterHours * providers * CLINICAL_WEEKS) : 0;
                        const totalHrs = clinicHrs + ahHrs;
                        return `${totalHrs.toLocaleString()} hrs/yr`;
                      }
                    }
                    if (card.level === 3) {
                      const dbs = (inp.docBurdenShare as number) || 0;
                      const tr = (inp.turnoverRate as number) || 0;
                      const rc = (inp.replacementCost as number) || 0;
                      if (dbs > 0 && tr > 0 && rc > 0) {
                        const totalCost = Math.round(providers * (tr / 100) * rc);
                        const docDriven = Math.round(totalCost * (dbs / 100));
                        return formatDollar(docDriven);
                      }
                      if (tr > 0 && rc > 0) {
                        const departures = (providers * (tr / 100)).toFixed(1);
                        return `${departures} departures/yr`;
                      }
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
                        const fb = computeRevenueFeedback(3, inp, documentedEncounters, revenuePerVisit);
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
                        {config.framingQuestions?.[card.level] && (
                          <p className="text-sm font-semibold text-[#1A1A1A] mb-3 mt-1">
                            {config.framingQuestions[card.level].replace('{encounterCount}', documentedEncounters.toLocaleString())}
                          </p>
                        )}
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
                    className="bg-[#FAF8F6] border border-dashed border-[#D9D3CB] rounded-xl mb-3 cursor-pointer hover:border-[#EA2C00]/40 hover:bg-white transition-all duration-200"
                    onClick={() => setActivation(card.level)}
                    data-testid={`activation-card-${activeDomain}-${card.level}`}
                    data-domain-level={`${activeDomain}-${card.level}`}
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="w-8 h-8 rounded-full bg-[#EAE5DF] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm text-[#AAAAAA]">{card.level}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#AAAAAA]">{card.label}</p>
                        {isFuture && futureDesc && (
                          <p className="text-xs text-[#999999] mt-0.5 leading-relaxed">{futureDesc}</p>
                        )}
                      </div>
                      <span className="text-sm text-[#CCCCCC] ml-auto">→</span>
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
          />
          <div className={STEP_FOOTER_SPACER_CLASS} />
        </div>

        <motion.div
          className="w-full lg:w-[320px] flex-shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          key={`sidebar-${activeDomain}`}
        >
          <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24" data-testid="card-domain-feedback">
            <p className="text-xs font-medium text-white/70 uppercase tracking-[1.5px] mb-4">
              Estimated Impact
            </p>

            {feedback ? (
              <>
                {renderImpactValue(feedback)}

                {feedback.hasValue && feedback.value !== null && feedback.value > 0 && (
                  <p className="text-xs text-white/50 italic leading-relaxed mb-3">
                    {activeDomain === 'capacity' ? (currentState.activationLevel === 4 ? `Measured access revenue based on confirmed patient volume.` : `Access revenue — based on additional patients seen with recovered time.`) :
                     activeDomain === 'revenue' ? (currentState.activationLevel === 2 ? `Directional estimate — based on your team's assessment applied to ${documentedEncounters.toLocaleString()} encounters.` : currentState.activationLevel === 3 ? `Measured impact — based on your organization's data.` : `Attributed revenue — formally tracked and incorporated into financial planning.`) :
                     activeDomain === 'workforce' ? `Workforce impact — based on your ${providers.toLocaleString()} providers and your organization's data.` :
                     ''}
                  </p>
                )}

                {currentState.activationLevel && currentState.activationLevel >= 2 && (() => {
                  const journeyLines: Record<string, Record<number, string>> = {
                    capacity: {
                      2: 'Your organization has recovered documentation time. Here\'s where the access decision stands.',
                      3: 'Your organization has recovered time and decided to deploy it toward access. Here\'s what that\'s producing.',
                      4: 'Your organization has recovered time, deployed it toward access, and measured the results. Here\'s the downstream impact.',
                    },
                    revenue: {
                      2: 'Your organization has observed documentation affecting reimbursement. Here\'s your directional estimate.',
                      3: 'Your organization has observed signals and is now measuring impact. Here\'s what the data shows.',
                      4: 'Your organization has measured documentation-driven revenue. Here\'s how it informs strategy.',
                    },
                    workforce: {
                      2: 'Your organization is measuring in-clinic burden reduction. Here\'s what the data shows.',
                      3: 'Your organization has measured burden reduction and is modeling its effect on retention.',
                      4: 'Your organization has modeled retention and is integrating burden data into workforce strategy.',
                    },
                    risk: {
                      2: 'Your organization has observed documentation quality improving. Here\'s how it\'s being tracked.',
                      3: 'Your organization is actively monitoring documentation quality and connecting it to downstream workflows.',
                      4: 'Your organization has connected quality to downstream programs. Here\'s the strategic picture.',
                    },
                  };
                  const line = journeyLines[activeDomain]?.[currentState.activationLevel!];
                  if (!line) return null;
                  return (
                    <p className="text-sm text-white/60 leading-relaxed mb-3" data-testid="text-journey-context">
                      {line}
                    </p>
                  );
                })()}

                <div className="h-px bg-white/10 my-4" />

                <div className="text-sm text-white/80 leading-relaxed mb-4 space-y-2">
                  {feedback.context.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>

                {feedback.warningBanner && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5 mb-3" data-testid="text-warning-banner">
                    <p className="text-sm text-amber-400 font-medium leading-relaxed">
                      {feedback.warningBanner}
                    </p>
                  </div>
                )}

                {feedback.costOfWaiting && activeDomain !== 'capacity' && activeDomain !== 'revenue' && activeDomain !== 'workforce' && (
                  <div className="bg-[#EA2C00]/10 border border-[#EA2C00]/30 rounded-lg px-3 py-2.5 mb-3" data-testid="text-cost-of-waiting">
                    <p className="text-sm text-[#EA2C00] font-medium leading-relaxed">
                      {feedback.costOfWaiting}
                    </p>
                  </div>
                )}

                <FormulaDisplay formula={feedback.formula} />

                {feedback.footnote && (
                  <p className="text-xs text-white/40 italic leading-relaxed">
                    {feedback.footnote}
                  </p>
                )}

                {feedback.nextLevelTeaser && (
                  <p className="text-xs text-white/70 italic leading-relaxed mt-3 pl-3 border-l border-[#EA2C00]/40" data-testid="text-next-level-teaser">
                    {feedback.nextLevelTeaser}
                  </p>
                )}

                {activeDomain === 'workforce' && currentState.activationLevel && (currentState.activationLevel === 3 || currentState.activationLevel === 4) && !feedback.hasValue && (
                  <p className="text-xs text-[#EA2C00]/80 italic mt-3 leading-relaxed" data-testid="text-workforce-score-note">
                    Enter {currentState.activationLevel === 3 ? 'turnover rate and replacement cost' : 'strategy integrations or agency/locum spend'} to complete your score
                  </p>
                )}

                <p className="text-[12px] text-white/30 italic mt-3">
                  Estimates based on your inputs. Individual results vary.
                </p>
              </>
            ) : (() => {
              const timeSaved = (inputs.timeSavedPerEncounter as number) || 0;
              const hoursRecovered = Math.round(documentedEncounters * timeSaved / 60);
              const domainProvocations: Record<string, string> = {
                capacity: hoursRecovered > 0
                  ? `Based on your inputs, approximately ${hoursRecovered.toLocaleString()} hours recovered annually. Select the level that best describes your organization's current state.`
                  : 'Select a maturity level to estimate recovered capacity.',
                revenue: `${documentedEncounters.toLocaleString()} documented encounters annually. Select the level that describes your revenue cycle's engagement with documentation changes.`,
                workforce: hoursRecovered > 0
                  ? `${providers} providers, approximately ${hoursRecovered.toLocaleString()} hours of documentation time returned. Select the level that matches your organization.`
                  : `${providers} providers with reduced documentation burden. Select a level to estimate the workforce impact.`,
                risk: `${documentedEncounters.toLocaleString()} encounters with improved documentation. Select the level that best describes your organization today.`,
              };
              const provocation = domainProvocations[activeDomain] || "Select your organization's maturity level to see estimated impact.";
              return (
                <>
                  <p className="font-bold text-2xl text-white/30 leading-[1.1] mb-4">—</p>
                  <div className="h-px bg-white/10 my-4" />
                  <p className="text-sm text-white/60 leading-relaxed">
                    {provocation}
                  </p>
                </>
              );
            })()}

            <div className="h-px bg-white/10 my-5" />

            <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
              Domain Progress
            </p>
            <div className="space-y-2">
              {DOMAIN_ORDER.map((d) => {
                const isActive = d === activeDomain;
                const dState = domainStates[d];
                const hasLevel = dState.activationLevel !== null;
                return (
                  <div key={d} className="flex items-center justify-between text-sm">
                    <span className={isActive ? 'text-white font-medium' : 'text-white/50'}>
                      {DOMAIN_LABELS[d]}
                    </span>
                    <span className={hasLevel ? 'text-white font-semibold' : 'text-white/30'}>
                      {hasLevel ? `Level ${dState.activationLevel}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {activeDomain === 'workforce' && currentState.activationLevel && (() => {
              const inp = currentState.inputs;
              const ahr = (inp.afterHoursReduction as number) || 2.0;
              const afterHoursHrs = Math.round(ahr * providers * CLINICAL_WEEKS);

              const mins = currentState.activationLevel >= 2 ? ((inp.editTimeSaved as number) || 0) : 0;
              const clinicHrs = mins > 0 ? Math.round(mins * providers * 230 / 60) : 0;

              const tr = currentState.activationLevel >= 3 ? ((inp.turnoverRate as number) || 0) : 0;
              const rcRaw = (inp.replacementCost as number) || 0;
              const rc = rcRaw > 0 ? rcRaw : 350000;
              const dbs = currentState.activationLevel >= 3 ? ((inp.docBurdenShare as number) || 0) : 0;
              const retentionExposure = (currentState.activationLevel >= 3 && tr > 0 && dbs > 0)
                ? Math.round(providers * (tr / 100) * rc * (dbs / 100))
                : null;

              const strategyCsv = (inp.workforceStrategies as string) || '';
              const strategyCount = currentState.activationLevel >= 4 ? strategyCsv.split(',').filter(Boolean).length : 0;

              const ar = currentState.activationLevel >= 4 ? ((inp.agencyReduction as number) || 0) : 0;
              const agencyAnnual = ar > 0 ? Math.round(ar * 12) : null;

              const totalDollar = (retentionExposure || 0) + (agencyAnnual || 0);
              const hasDollarValue = retentionExposure !== null || agencyAnnual !== null;

              return (
                <>
                  <div className="h-px bg-white/10 my-5" />
                  <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3" data-testid="text-workforce-summary-label">
                    Workforce Summary
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">After-Hours Returned</span>
                      <span className="text-white font-medium" data-testid="text-workforce-summary-afterhours">
                        {afterHoursHrs > 0 ? `${afterHoursHrs.toLocaleString()} hrs/yr` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">In-Clinic Returned</span>
                      <span className="text-white font-medium" data-testid="text-workforce-summary-clinic">
                        {currentState.activationLevel >= 2 && clinicHrs > 0 ? `${clinicHrs.toLocaleString()} hrs/yr` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Retention Exposure</span>
                      <span className="text-white font-medium" data-testid="text-workforce-summary-retention">
                        {retentionExposure !== null ? formatDollar(retentionExposure) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Strategic Integrations</span>
                      <span className="text-white font-medium" data-testid="text-workforce-summary-strategies">
                        {currentState.activationLevel >= 4 ? `${strategyCount} of 6` : '—'}
                      </span>
                    </div>
                    {hasDollarValue && (
                      <>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold">Total Workforce Value</span>
                          <span className="text-[#EA2C00] font-bold" data-testid="text-workforce-summary-total">
                            {formatDollar(totalDollar)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            })()}

            {activeDomain === 'revenue' && currentState.activationLevel && (() => {
              const inp = currentState.inputs;
              const observedCsv = (inp.observedMovement as string) || '';
              const observedCount = observedCsv.split(',').filter(Boolean).length;

              const directionalEst = inp.directionalEstimate as string | undefined;
              const ESTIMATE_RANGES: Record<string, { lowPct: number; highPct: number }> = {
                'under_1': { lowPct: 0.005, highPct: 0.01 },
                '1_3': { lowPct: 0.01, highPct: 0.03 },
                '3_5': { lowPct: 0.03, highPct: 0.05 },
                '5_plus': { lowPct: 0.05, highPct: 0.07 },
              };
              let directionalRange: string | null = null;
              if (directionalEst && directionalEst !== 'not_sure' && ESTIMATE_RANGES[directionalEst]) {
                const r = ESTIMATE_RANGES[directionalEst];
                const low = Math.round(documentedEncounters * revenuePerVisit * r.lowPct);
                const high = Math.round(documentedEncounters * revenuePerVisit * r.highPct);
                directionalRange = `${formatDollar(low)}–${formatDollar(high)}`;
              }

              const metricType = inp.revenueMetricType as string | undefined;
              let measuredImpact: number | null = null;
              if (metricType === 'wrvu') {
                const d = (inp.measuredWrvuDelta as number) || 0;
                if (d > 0) measuredImpact = Math.round(d * documentedEncounters * ((inputs.conversionFactor as number) || 33));
              } else if (metricType === 'collections') {
                const d = (inp.measuredCollectionsDelta as number) || 0;
                if (d > 0) measuredImpact = Math.round(d * documentedEncounters);
              } else if (metricType === 'revenue_pct') {
                const d = (inp.measuredRevenuePct as number) || 0;
                if (d > 0) measuredImpact = Math.round(documentedEncounters * revenuePerVisit * (d / 100));
              }

              const attributedRevenue = (inp.recognizedRevenue as number) || 0;

              const totalDollar = attributedRevenue > 0 ? attributedRevenue : measuredImpact !== null ? measuredImpact : (directionalRange ? Math.round(documentedEncounters * revenuePerVisit * (ESTIMATE_RANGES[directionalEst!]?.highPct || 0)) : null);

              return (
                <>
                  <div className="h-px bg-white/10 my-5" />
                  <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3" data-testid="text-revenue-summary-label">
                    Revenue Summary
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Revenue Signals</span>
                      <span className="text-white font-medium" data-testid="text-revenue-summary-signals">
                        {observedCount > 0 ? `${observedCount} area${observedCount !== 1 ? 's' : ''}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Directional Estimate</span>
                      <span className="text-white font-medium" data-testid="text-revenue-summary-directional">
                        {directionalRange || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Measured Impact</span>
                      <span className="text-white font-medium" data-testid="text-revenue-summary-measured">
                        {measuredImpact !== null ? formatDollar(measuredImpact) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Attributed Revenue</span>
                      <span className="text-white font-medium" data-testid="text-revenue-summary-attributed">
                        {attributedRevenue > 0 ? formatDollar(attributedRevenue) : '—'}
                      </span>
                    </div>
                    {totalDollar !== null && totalDollar > 0 && (
                      <>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold">Total Revenue</span>
                          <span className="text-[#EA2C00] font-bold" data-testid="text-revenue-summary-total">
                            {formatDollar(totalDollar)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            })()}

            {activeDomain === 'capacity' && currentState.activationLevel && (() => {
              const inp = currentState.inputs;
              const ts = (inp.timeSaved as number) || (inputs.timeSavedPerEncounter as number) || 0;
              const recoveredHours = ts > 0 ? Math.round(documentedEncounters * ts / 60) : 0;
              const fte = ts > 0 ? (recoveredHours / ANNUAL_HOURS).toFixed(1) : null;

              const pts = (inp.additionalPatientsPerMonth as number) || 0;
              const rp = (inp.redesignedProviders as number) || providers;
              const accessRevenue = (currentState.activationLevel >= 3 && pts > 0) ? Math.round(pts * rp * 11 * revenuePerVisit) : null;

              const outcomesCsv = (inp.accessOutcomes as string) || '';
              const outcomeCount = currentState.activationLevel >= 4 ? outcomesCsv.split(',').filter(Boolean).length : 0;

              return (
                <>
                  <div className="h-px bg-white/10 my-5" />
                  <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3" data-testid="text-capacity-summary-label">
                    Capacity Summary
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Time Recovered</span>
                      <span className="text-white font-medium" data-testid="text-capacity-summary-hours">
                        {recoveredHours > 0 ? `${recoveredHours.toLocaleString()} hrs/yr${fte ? ` (${fte} FTE)` : ''}` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Access Revenue</span>
                      <span className="text-white font-medium" data-testid="text-capacity-summary-access">
                        {accessRevenue !== null ? formatDollar(accessRevenue) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Access Outcomes</span>
                      <span className="text-white font-medium" data-testid="text-capacity-summary-outcomes">
                        {currentState.activationLevel >= 4 && outcomeCount > 0 ? `${outcomeCount} of 6 tracked` : '—'}
                      </span>
                    </div>
                    {accessRevenue !== null && (
                      <>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold">Total Capacity</span>
                          <span className="text-[#EA2C00] font-bold" data-testid="text-capacity-summary-total">
                            {formatDollar(accessRevenue)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            })()}

            {activeDomain === 'risk' && currentState.activationLevel && (() => {
              const inp = currentState.inputs;
              const attrCsv = (inp.qualityAttributes as string) || '';
              const attrCount = currentState.activationLevel >= 2 ? attrCsv.split(',').filter(Boolean).length : 0;

              const wfCsv = (inp.connectedWorkflows as string) || '';
              const wfCount = currentState.activationLevel >= 3 ? wfCsv.split(',').filter(Boolean).length : 0;

              const siCsv = (inp.strategicIntegrations as string) || '';
              const siCount = currentState.activationLevel >= 4 ? siCsv.split(',').filter(Boolean).length : 0;

              const noDownstream = inp.noDownstreamValue === 'true';
              const noStrategic = inp.noConfirmedStrategicValue === 'true';
              const dv = (currentState.activationLevel >= 3 && !noDownstream) ? ((inp.downstreamValue as number) || 0) : 0;
              const sv = (currentState.activationLevel >= 4 && !noStrategic) ? ((inp.strategicValue as number) || 0) : 0;

              const totalDollar = dv + sv;
              const hasDollarValue = dv > 0 || sv > 0;

              return (
                <>
                  <div className="h-px bg-white/10 my-5" />
                  <p className="text-[12px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3" data-testid="text-quality-summary-label">
                    Quality Summary
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Quality Tracking</span>
                      <span className="text-white font-medium" data-testid="text-quality-summary-attributes">
                        {currentState.activationLevel >= 2 && attrCount > 0 ? `${attrCount} of 5` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Downstream Connected</span>
                      <span className="text-white font-medium" data-testid="text-quality-summary-downstream-count">
                        {currentState.activationLevel >= 3 && wfCount > 0 ? `${wfCount} of 6` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Strategic Areas</span>
                      <span className="text-white font-medium" data-testid="text-quality-summary-strategic-count">
                        {currentState.activationLevel >= 4 && siCount > 0 ? `${siCount} of 6` : '—'}
                      </span>
                    </div>
                    {hasDollarValue && (
                      <>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold">Total Quality Value</span>
                          <span className="text-[#EA2C00] font-bold" data-testid="text-quality-summary-total">
                            {formatDollar(totalDollar)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
