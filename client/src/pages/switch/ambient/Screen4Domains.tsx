import { useState, useMemo, useCallback } from "react";
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
}

const DOMAIN_CTA: Record<Domain, string> = {
  capacity: 'See Revenue Impact →',
  revenue: 'See Workforce Impact →',
  workforce: 'See Quality Exposure →',
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
    subheadline: 'Ambient reduces documentation time. This section measures how that time is being used.',
    reframe: 'Recovered time can stay unmeasured, or it can be tracked, allocated, and converted into patient access. Each level reflects a different degree of organizational follow-through.',
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
    subheadline: 'Improved documentation can affect coding accuracy, denials, and reimbursement. This measures whether your revenue cycle is tracking it.',
    reframe: 'Documentation specificity improves with ambient. The revenue impact depends on whether your revenue cycle team is analyzing the change and has before/after data.',
    cards: [
      { level: 1, label: 'Disconnected', description: 'Revenue cycle has not reviewed documentation changes.' },
      { level: 2, label: 'Under Investigation', description: 'Revenue cycle is analyzing coding or denial trends.' },
      { level: 3, label: 'Impact Measured', description: 'Before/after revenue data has been collected and reviewed.' },
      { level: 4, label: 'Managed & Integrated', description: 'Revenue impact is tracked continuously in operations.' },
    ],
    framingQuestions: {
      1: 'Has your revenue cycle team reviewed documentation changes from ambient?',
      2: 'Which revenue areas are being analyzed?',
      3: undefined,
      4: 'How is revenue tracking integrated into ongoing operations?',
    },
    unlockTeasers: {
      2: 'Engage revenue cycle to review coding and denial trends.',
      3: 'Collect before/after data on wRVUs, collections, or denials.',
      4: 'Integrate documentation-revenue tracking into standard workflows.',
    },
  },
  workforce: {
    label: 'WORKFORCE',
    headline: 'WORKFORCE',
    subheadline: 'Reduced documentation burden affects provider time, satisfaction, and retention. This measures how far those effects have been tracked.',
    reframe: 'After-hours time returned is the starting point. Organizations further along are measuring in-clinic burden reduction, surveying providers, and connecting the data to turnover and labor costs.',
    cards: [
      { level: 1, label: 'Time Is Returning', description: 'Providers report less after-hours documentation time.' },
      { level: 2, label: 'Burden Measured', description: 'In-clinic time savings and provider sentiment are tracked.' },
      { level: 3, label: 'Retention Modeled', description: 'Turnover costs are modeled with documentation burden as a factor.' },
      { level: 4, label: 'Labor Line Impact', description: 'Agency or locum spend reduction is measured and attributed.' },
    ],
    framingQuestions: {
      1: undefined,
      2: undefined,
      3: undefined,
      4: 'What is the monthly reduction in agency or locum spend?',
    },
    unlockTeasers: {
      2: 'Measure in-clinic time savings and survey providers.',
      3: 'Model turnover costs with documentation burden as a variable.',
      4: 'Track agency and locum spend changes attributed to retention.',
    },
  },
  risk: {
    label: 'QUALITY',
    headline: 'QUALITY',
    subheadline: 'Better documentation produces more complete clinical records. This measures whether downstream teams — coding, quality, compliance — are seeing the difference.',
    reframe: 'Improved notes are the starting point. The operational value depends on whether that improvement reaches CDI, coding accuracy, quality reporting, or compliance workflows.',
    cards: [
      { level: 1, label: 'Notes Improving', description: 'Documentation quality has improved. Downstream teams have not yet been engaged.' },
      { level: 2, label: 'Actively Monitored', description: 'Documentation quality metrics are being tracked systematically.' },
      { level: 3, label: 'Downstream Connected', description: 'At least one downstream workflow shows measurable improvement.' },
      { level: 4, label: 'Operationally Embedded', description: 'Documentation quality is integrated into governance and strategy.' },
    ],
    framingQuestions: {
      1: 'Have any downstream teams reviewed documentation changes?',
      2: 'How are documentation quality metrics being tracked?',
      3: 'Which downstream workflows have shown measurable change?',
      4: 'Where is documentation quality embedded in governance?',
    },
    unlockTeasers: {
      2: 'Establish systematic tracking of documentation quality metrics.',
      3: 'Connect documentation improvements to a downstream workflow.',
      4: 'Embed documentation quality into governance and strategic planning.',
    },
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

export default function Screen4Domains({ onNext, onBack }: Screen4Props) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;
  const [activeDomain, setActiveDomain] = useState<Domain>('capacity');

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
  const providerRate = inputs.providerRate || 150;
  const documentedEncounters = Math.round(annualEncounters * (utilization / 100));

  const currentState = domainStates[activeDomain];
  const config = DOMAIN_CONFIGS[activeDomain];

  const setActivation = useCallback((level: ActivationLevel) => {
    setDomainStates((prev) => ({
      ...prev,
      [activeDomain]: { ...prev[activeDomain], activationLevel: level },
    }));
    dispatch(assessmentActions.updateInput(`${activeDomain}ActivationLevel` as keyof typeof inputs, level));
  }, [activeDomain, dispatch]);

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
        return computeCapacityFeedback(level, capacityInp, providers, documentedEncounters, revenuePerVisit, providerRate);
      }
      case 'revenue': return computeRevenueFeedback(level, inp, documentedEncounters, revenuePerVisit, inputs.conversionFactor || 33);
      case 'workforce': return computeWorkforceFeedback(level, inp, providers, providerRate);
      case 'risk': return computeRiskFeedback(level, inp, documentedEncounters, revenuePerVisit);
    }
  }, [activeDomain, currentState.activationLevel, currentState.inputs, providers, documentedEncounters, revenuePerVisit, providerRate, inputs.conversionFactor, inputs.timeSavedPerEncounter]);

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

  const unmeasuredTimeChecked = currentState.inputs.unmeasuredTime === 'true';

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

    const showUnmeasuredCheckbox = level === 1;

    const timeSavedSection = (
      <div className="mb-6" key="time-saved">
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
          Minutes returned per encounter
        </label>

        {!(showUnmeasuredCheckbox && unmeasuredTimeChecked) && (
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
        )}
        <BenchmarkContext text="Abridge observed benchmark: 2–3 min" />


        {showUnmeasuredCheckbox && (
          <>
            <div className="flex items-center gap-2.5 mt-4">
              <Checkbox
                id="unmeasured-time"
                checked={unmeasuredTimeChecked}
                onCheckedChange={(checked) => {
                  if (checked === true) {
                    setDomainInput('unmeasuredTime', 'true');
                  } else {
                    setDomainInput('unmeasuredTime', 'false');
                  }
                }}
                data-testid="checkbox-unmeasured-time"
              />
              <label htmlFor="unmeasured-time" className="text-sm text-[#525252] cursor-pointer select-none">
                Use benchmark (2–3 min)
              </label>
            </div>

            {unmeasuredTimeChecked && (
              <p className="text-sm text-[#888888] italic mt-2">
                Time savings not yet measured. This is the first metric to establish.
              </p>
            )}
          </>
        )}
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
          <BenchmarkContext text="Confirmed patient volume increase attributed to recovered time." />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">Downstream revenue per additional visit</label>
          <BenchmarkContext text="Referrals, follow-ups, and ancillary services. Typical range: $150–$500+." />
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.downstreamRevenuePerVisit as number) || 0}
              onChange={(v) => setDomainInput('downstreamRevenuePerVisit', Math.max(0, v))}
              placeholder="e.g. 200"
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-downstream-revenue-per-visit"
            />
          </div>
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
    wrvu: 'Abridge benchmark: 0.05\u20130.15 wRVU per encounter',
    collections: 'Abridge benchmark: $3\u2013$10 per encounter',
    revenue_pct: 'Abridge benchmark: 1\u20134% improvement',
    denial_rate: 'Abridge benchmark: 5\u201315% denial rate reduction',
  };

  const renderRevenueInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      const revenueCycleEngaged = currentState.inputs.revenueCycleEngaged as string | undefined;
      const revenueCycleStatus = currentState.inputs.revenueCycleStatus as string | undefined;
      const emComplexity = currentState.inputs.emComplexity as string | undefined;
      const docDeficiencyRate = currentState.inputs.docDeficiencyRate as number | undefined;
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              Where does this stand?
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

          <AnimatePresence>
            {revenueCycleEngaged === 'yes' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-3">
                  <label className="block text-sm font-medium text-black mb-3">
                    Where is that engagement?
                  </label>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { id: 'aware', label: 'Aware, no analysis yet' },
                      { id: 'analyzing', label: 'Analysis in progress' },
                      { id: 'measured', label: 'Before/after data exists' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDomainInput('revenueCycleStatus', opt.id)}
                        className={`rounded-lg p-3.5 sm:p-4 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                          revenueCycleStatus === opt.id
                            ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                            : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                        }`}
                        data-testid={`radio-revenue-status-${opt.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${revenueCycleStatus === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                          <span>{opt.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {revenueCycleStatus === 'analyzing' && (
                  <p className="text-sm text-[#EA2C00] font-medium mt-2">
                    It sounds like your team is already at Level 2. Jump there to capture what's being analyzed.
                  </p>
                )}
                {revenueCycleStatus === 'measured' && (
                  <p className="text-sm text-[#EA2C00] font-medium mt-2">
                    You have measured data — that puts you at Level 3. Jump there to enter your numbers.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Average E&M complexity level distribution
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'mostly_l3', label: 'Mostly Level 3' },
                { id: 'mix_l3_l4', label: 'Mix of Level 3–4' },
                { id: 'mostly_l4_l5', label: 'Mostly Level 4–5' },
                { id: 'unsure', label: 'Unsure' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDomainInput('emComplexity', opt.id)}
                  className={`rounded-lg p-3.5 sm:p-4 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                    emComplexity === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-em-complexity-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${emComplexity === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <BenchmarkContext text="Organizations with mostly L3 visits typically have the largest coding accuracy opportunity from better documentation." />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Documentation deficiency or query rate
            </label>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={docDeficiencyRate || 0}
                onChange={(v) => setDomainInput('docDeficiencyRate', Math.min(100, Math.max(0, v)))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-doc-deficiency-rate"
                step={0.1}
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
            <BenchmarkContext text="Industry average: 8–12% of charts with coding queries" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              HCC / risk adjustment value per member
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={(currentState.inputs.hccValuePerMember as number) || 0}
                onChange={(v) => setDomainInput('hccValuePerMember', Math.max(0, v))}
                placeholder="200"
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-hcc-value-per-member"
              />
            </div>
            <BenchmarkContext text="Average HCC gap closure value: $100–$400 per member per year (default: $200). Applies to value-based care populations." />
          </div>
        </div>
      );
    }

    if (level === 2) {
      const INVESTIGATION_AREAS = [
        'wRVU per encounter trends',
        'Coding specificity / ICD-10 distribution',
        'Denial rates tied to documentation',
        'Collections before vs. after',
        'CDI query volume',
        'Coder productivity',
      ];
      const duration = currentState.inputs.investigationDuration as string || '';
      const codingSpecificityImprovement = currentState.inputs.codingSpecificityImprovement as number | undefined;
      const currentDenialRate = currentState.inputs.currentDenialRate as number | undefined;
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3 sr-only">
              What is your revenue cycle team analyzing?
            </label>
            <div className="flex flex-col gap-2.5">
              {INVESTIGATION_AREAS.map((area, i) => {
                const checked = isChecked('investigationAreas', i);
                return (
                  <label
                    key={i}
                    htmlFor={`investigation-area-${i}`}
                    className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                    }`}
                  >
                    <Checkbox
                      id={`investigation-area-${i}`}
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('investigationAreas', i)}
                      data-testid={`checkbox-investigation-${i}`}
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
              How far along?
            </label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'under30', label: 'Early — under 30 days' },
                { id: '30to90', label: '30–90 days' },
                { id: '90plus', label: '90+ days' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDomainInput('investigationDuration', opt.id)}
                  className={`rounded-lg p-3 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                    duration === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-investigation-duration-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${duration === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Estimated coding specificity improvement
            </label>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={codingSpecificityImprovement || 0}
                onChange={(v) => setDomainInput('codingSpecificityImprovement', Math.min(100, Math.max(0, v)))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-coding-specificity-improvement"
                step={0.1}
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
            <BenchmarkContext text="Organizations typically see 5–15% improvement in coding specificity with ambient" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Current denial rate
            </label>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={currentDenialRate || 0}
                onChange={(v) => setDomainInput('currentDenialRate', Math.min(100, Math.max(0, v)))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-current-denial-rate"
                step={0.1}
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
            <BenchmarkContext text="Industry average: 5–10% denial rate. Documentation-driven denials are often 30–50% of total." />
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
                className="flex flex-col gap-4"
              >
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                    Denial rate before ambient deployment
                  </label>
                  <div className="flex items-center gap-2">
                    <FormattedNumberInput
                      value={(currentState.inputs.denialRateBefore as number) || 0}
                      onChange={(v) => setDomainInput('denialRateBefore', Math.min(100, Math.max(0, v)))}
                      placeholder=""
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-denial-before"
                      step={0.1}
                    />
                    <span className="text-sm text-[#888888]">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                    Denial rate after ambient deployment
                  </label>
                  <div className="flex items-center gap-2">
                    <FormattedNumberInput
                      value={(currentState.inputs.denialRateAfter as number) || 0}
                      onChange={(v) => setDomainInput('denialRateAfter', Math.min(100, Math.max(0, v)))}
                      placeholder=""
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-denial-after"
                      step={0.1}
                    />
                    <span className="text-sm text-[#888888]">%</span>
                  </div>
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
          <label className="block text-sm font-medium text-black mb-3 sr-only">
            How is documentation quality integrated into revenue cycle?
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
            Annual revenue attributed
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
              Abridge deployment benchmark at {documentedEncounters.toLocaleString()} encounters: organizations at this integration level typically attribute $200K–$600K annually. This can serve as a working estimate.
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

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                    Documentation burden score before
                  </label>
                  <p className="text-xs text-[#888888] mb-2">Scale of 1–10</p>
                  <FormattedNumberInput
                    value={(currentState.inputs.burdenScoreBefore as number) || 0}
                    onChange={(v) => setDomainInput('burdenScoreBefore', Math.min(10, Math.max(0, v)))}
                    placeholder=""
                    className="w-full h-12 bg-white border-[#E5E7EB]"
                    data-testid="input-burden-before"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                    Documentation burden score after
                  </label>
                  <p className="text-xs text-[#888888] mb-2">Scale of 1–10</p>
                  <FormattedNumberInput
                    value={(currentState.inputs.burdenScoreAfter as number) || 0}
                    onChange={(v) => setDomainInput('burdenScoreAfter', Math.min(10, Math.max(0, v)))}
                    placeholder=""
                    className="w-full h-12 bg-white border-[#E5E7EB]"
                    data-testid="input-burden-after"
                  />
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
        { value: 40, label: '40%+' },
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
            <div className="flex gap-2 mt-2 flex-wrap">
              {[
                { label: 'Conservative', value: 40 },
                { label: 'Research benchmark', value: 60 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setDomainInput('docBurdenShare', opt.value)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#D1D5DB] text-[#525252] hover:border-[#E8350A] hover:text-[#E8350A] transition-all"
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

    return (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
            Monthly reduction in agency or locum spend
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
          <BenchmarkContext text="Abridge benchmark: $5K–$30K/month" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
            Is this showing up in the labor line on a sustained basis?
          </label>
          <div className="flex flex-col gap-2.5">
            {[
              { id: 'yes', label: "Yes — it's in the numbers" },
              { id: 'tracking', label: "We're tracking it" },
              { id: 'not_yet', label: 'Not yet confirmed' },
            ].map((opt) => {
              const laborLineSustained = currentState.inputs.laborLineSustained as string | undefined;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDomainInput('laborLineSustained', opt.id)}
                  className={`rounded-lg p-3.5 sm:p-4 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                    laborLineSustained === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-labor-line-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${laborLineSustained === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
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

    const QUALITY_DOWNSTREAM_AREAS = [
      'CDI / coding accuracy',
      'Quality measure performance (HEDIS, MIPS, Stars)',
      'Compliance and audit readiness',
      'Prior authorization',
      'Care management / population health',
      'HCC / risk adjustment (if value-based contracts apply)',
    ];

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

          {downstreamConnected === 'yes' && (
            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                Which area has been engaged first?
              </label>
              <div className="flex flex-col gap-2">
                {QUALITY_DOWNSTREAM_AREAS.map((area, i) => {
                  const checked = isChecked('qualityDownstreamArea', i);
                  return (
                    <label
                      key={i}
                      className={`flex items-center gap-3 p-3.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                        checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                      }`}
                      data-testid={`checkbox-downstream-area-${i}`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleCheckboxItem('qualityDownstreamArea', i)}
                      />
                      <span className="text-sm text-black">{area}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Current chart completion rate
            </label>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={(currentState.inputs.chartCompletionRate as number) || 0}
                onChange={(v) => setDomainInput('chartCompletionRate', Math.min(100, Math.max(0, v)))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-chart-completion-rate"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
            <BenchmarkContext text="Target: 95%+" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
              Average coding accuracy
            </label>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={(currentState.inputs.codingAccuracy as number) || 0}
                onChange={(v) => setDomainInput('codingAccuracy', Math.min(100, Math.max(0, v)))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-coding-accuracy"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
            <BenchmarkContext text="Industry: 85–92%" />
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
                <BenchmarkContext text="Abridge benchmark: 15–30% improvement in completeness and specificity" />

                <div className="mt-5">
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                    What % of reviewed charts have documentation gaps?
                  </label>
                  <p className="text-xs text-[#888888] mb-2">Optional. Enter if your monitoring has produced a gap rate.</p>
                  <div className="flex items-center gap-2">
                    <FormattedNumberInput
                      value={(currentState.inputs.chartGapRate as number) || 0}
                      onChange={(v) => setDomainInput('chartGapRate', Math.min(100, Math.max(0, v)))}
                      placeholder=""
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-chart-gap-rate"
                    />
                    <span className="text-sm text-[#888888]">%</span>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                    Compliance audit pass rate
                  </label>
                  <div className="flex items-center gap-2">
                    <FormattedNumberInput
                      value={(currentState.inputs.complianceAuditPassRate as number) || 0}
                      onChange={(v) => setDomainInput('complianceAuditPassRate', Math.min(100, Math.max(0, v)))}
                      placeholder=""
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-compliance-audit-pass-rate"
                    />
                    <span className="text-sm text-[#888888]">%</span>
                  </div>
                  <BenchmarkContext text="Target: 90%+" />
                </div>

                <div className="mt-5">
                  <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
                    Average days to chart closure
                  </label>
                  <div className="flex items-center gap-2">
                    <FormattedNumberInput
                      value={(currentState.inputs.daysToChartClosure as number) || 0}
                      onChange={(v) => setDomainInput('daysToChartClosure', Math.max(0, v))}
                      placeholder=""
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-days-to-chart-closure"
                    />
                    <span className="text-sm text-[#888888]">days</span>
                  </div>
                  <BenchmarkContext text="Best practice: <3 days" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (level === 3) {
      const WORKFLOW_DELTA_FIELDS: Record<number, { fields: { key: string; label: string; suffix?: string; step?: number; sublabel?: string }[] }> = {
        0: { fields: [
          { key: 'cdiQueriesBefore', label: 'CDI queries/month before', suffix: '/mo' },
          { key: 'cdiQueriesAfter', label: 'CDI queries/month after', suffix: '/mo' },
          { key: 'cdiCostPerQuery', label: 'Cost per CDI query', suffix: '$', sublabel: 'Industry range: $20–$60 per query (default: $25)' },
        ] },
        1: { fields: [
          { key: 'riskDenialBefore', label: 'Denial rate before (%)', suffix: '%', step: 0.1 },
          { key: 'riskDenialAfter', label: 'Denial rate after (%)', suffix: '%', step: 0.1 },
        ] },
        2: { fields: [
          { key: 'priorAuthBefore', label: 'Prior auth approval rate before (%)', suffix: '%' },
          { key: 'priorAuthAfter', label: 'Prior auth approval rate after (%)', suffix: '%' },
        ] },
        3: { fields: [
          { key: 'qualityGapsClosed', label: 'Quality gaps closed per month', suffix: '/mo' },
          { key: 'qualityGapValue', label: 'Value per quality gap closed', suffix: '$', sublabel: 'VBC incentive or penalty per gap (default: $100)' },
        ] },
        4: { fields: [
          { key: 'abstractionHoursSaved', label: 'Abstraction hours saved per month', suffix: 'hrs/mo' },
        ] },
        5: { fields: [
          { key: 'rafChange', label: 'RAF score change', step: 0.01 },
          { key: 'vbcMembers', label: 'Members in VBC contracts' },
          { key: 'capitationRate', label: 'Annual capitation rate per member', suffix: '$' },
        ] },
      };

      return (
        <div className="flex flex-col gap-5">
          <div>
            <div className="flex flex-col gap-2.5">
              {DOWNSTREAM_WORKFLOWS.map((wf, i) => {
                const checked = isChecked('connectedWorkflows', i);
                return (
                  <div key={i}>
                    <label
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
                    {checked && WORKFLOW_DELTA_FIELDS[i] && (
                      <div className="ml-8 mt-2 mb-1 flex flex-col gap-2">
                        {WORKFLOW_DELTA_FIELDS[i].fields.map((f) => (
                          <div key={f.key}>
                            <div className="flex items-center gap-2">
                              {f.suffix === '$' && <span className="text-sm text-[#888888]">$</span>}
                              <FormattedNumberInput
                                value={(currentState.inputs[f.key] as number) || 0}
                                onChange={(v) => setDomainInput(f.key, Math.max(0, v))}
                                placeholder=""
                                className="w-full h-10 bg-white border-[#E5E7EB] text-sm"
                                data-testid={`input-${f.key}`}
                                step={f.step}
                              />
                              {f.suffix && f.suffix !== '$' && <span className="text-xs text-[#888888] whitespace-nowrap">{f.suffix}</span>}
                              <span className="text-xs text-[#888888] whitespace-nowrap min-w-[80px] sm:min-w-[100px]">{f.label}</span>
                            </div>
                            {f.sublabel && (
                              <p className="text-xs text-[#888888] mt-1 ml-0.5">{f.sublabel}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    const executiveOwner = currentState.inputs.executiveOwner as string || '';
    return (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">
            Is there a named executive owner?
          </label>
          <div className="flex flex-col gap-2">
            {[
              { id: 'yes', label: 'Yes' },
              { id: 'no', label: 'Not yet' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDomainInput('executiveOwner', opt.id)}
                className={`rounded-lg p-3 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                  executiveOwner === opt.id
                    ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                    : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                }`}
                data-testid={`radio-executive-owner-${opt.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${executiveOwner === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                  <span>{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {executiveOwner === 'yes' && (
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-1">Role</label>
            <div className="flex flex-col gap-2">
              {['CMO / CMIO', 'VP of Quality', 'CIO / CDO', 'VP of Revenue Cycle', 'Other'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setDomainInput('executiveOwnerRole', role)}
                  className={`rounded-lg p-3 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                    (currentState.inputs.executiveOwnerRole as string) === role
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-owner-role-${role}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        )}

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
            Annual strategic value attributed
          </label>
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
          {currentState.inputs.noConfirmedStrategicValue === 'true' && (
            <p className="text-xs text-[#888888] italic mt-2 leading-relaxed bg-[#F9FAFB] p-3 rounded-lg">
              At {documentedEncounters.toLocaleString()} encounters, enter the strategic value your organization attributes to documentation quality programs.
            </p>
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
        {config.subheadline ? (
          <p className="text-lg text-black/80 font-medium max-w-[560px] mx-auto mb-2" data-testid="text-domain-subheadline">
            {config.subheadline}
          </p>
        ) : null}
        <p className="text-base text-[#888888] max-w-[520px] mx-auto" data-testid="text-domain-reframe">
          {config.reframe}
        </p>
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
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2" data-testid="text-domain-label">
              Where is your organization today?
            </p>
            <p className="text-sm text-[#525252] mb-4" data-testid="text-level-instruction">
              Select the level that best describes your organization today.
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
                      return 'No stage selected';
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
                      return 'Not yet engaged';
                    }
                    if (card.level === 2) {
                      const areas = (inp.investigationAreas as string) || '';
                      const count = areas.split(',').filter(Boolean).length;
                      return count > 0 ? `${count} area${count !== 1 ? 's' : ''} analyzed` : null;
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
                  return null;
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
                    >
                      <div className="flex items-center gap-4 px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-[#EA2C00] flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span className="text-sm font-semibold text-[#1A1A1A]">{card.label}</span>
                        <div className="ml-auto flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#EA2C00]" data-testid={`completed-value-${activeDomain}-${card.level}`}>
                            {staircaseCompletedSummary || '—'}
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

                return (
                  <motion.div
                    key={card.level}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: cardIdx * 0.05, ease: "easeOut" }}
                    className="bg-[#FAF8F6] border border-dashed border-[#D9D3CB] rounded-xl mb-3 cursor-pointer hover:border-[#EA2C00]/40 hover:bg-white transition-all duration-200"
                    onClick={() => setActivation(card.level)}
                    data-testid={`activation-card-${activeDomain}-${card.level}`}
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="w-8 h-8 rounded-full bg-[#EAE5DF] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm text-[#AAAAAA]">{card.level}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#AAAAAA]">{card.label}</p>
                        {isFuture && config.unlockTeasers?.[card.level] && (
                          <p className="text-xs text-[#999999] mt-0.5">{config.unlockTeasers[card.level]}</p>
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
                    {activeDomain === 'capacity' ? (currentState.activationLevel === 4 ? `Measured access revenue — direct and downstream, based on confirmed patient volume.` : `Access revenue — based on additional patients seen with recovered time.`) :
                     activeDomain === 'revenue' ? `Revenue signal — based on your ${documentedEncounters.toLocaleString()} encounters at industry-observed coding improvement rates.` :
                     activeDomain === 'workforce' ? `Workforce impact — based on your ${providers.toLocaleString()} providers and your organization's data.` :
                     ''}
                  </p>
                )}

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

                {feedback.footnote && (
                  <p className="text-xs text-white/40 italic leading-relaxed">
                    {feedback.footnote}
                  </p>
                )}

                <FormulaDisplay formula={feedback.formula} />

                {feedback.nextLevelTeaser && (
                  <p className="text-xs text-white/70 italic leading-relaxed mt-3 pl-3 border-l border-[#EA2C00]/40" data-testid="text-next-level-teaser">
                    {feedback.nextLevelTeaser}
                  </p>
                )}

                {activeDomain === 'workforce' && currentState.activationLevel && (currentState.activationLevel === 3 || currentState.activationLevel === 4) && !feedback.hasValue && (
                  <p className="text-xs text-[#EA2C00]/80 italic mt-3 leading-relaxed" data-testid="text-workforce-score-note">
                    Enter {currentState.activationLevel === 3 ? 'turnover rate and replacement cost' : 'agency/locum spend'} to complete your score
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
                risk: `${documentedEncounters.toLocaleString()} encounters with improved documentation. Select the level that describes how far downstream teams have engaged.`,
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

              const mins = (inp.editTimeSaved as number) || 0;
              const clinicHrs = mins > 0 ? Math.round(mins * providers * 230 / 60) : 0;

              const tr = (inp.turnoverRate as number) || 0;
              const rcRaw = (inp.replacementCost as number) || 0;
              const rc = rcRaw > 0 ? rcRaw : 350000;
              const dbs = (inp.docBurdenShare as number) || 0;
              const retentionExposure = (tr > 0 && dbs > 0)
                ? Math.round(providers * (tr / 100) * rc * (dbs / 100))
                : null;

              const ar = (inp.agencyReduction as number) || 0;
              const agencyAnnual = ar > 0 ? Math.round(ar * 12) : null;

              const hasAnyValue = afterHoursHrs > 0 || clinicHrs > 0 || retentionExposure !== null || agencyAnnual !== null;
              if (!hasAnyValue) return null;

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
                        {clinicHrs > 0 ? `${clinicHrs.toLocaleString()} hrs/yr` : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Retention Exposure</span>
                      <span className="text-white font-medium" data-testid="text-workforce-summary-retention">
                        {retentionExposure !== null ? formatDollar(retentionExposure) : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Agency Reduction</span>
                      <span className="text-white font-medium" data-testid="text-workforce-summary-agency">
                        {agencyAnnual !== null ? formatDollar(agencyAnnual) : '—'}
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

            {activeDomain === 'capacity' && currentState.activationLevel && (() => {
              const inp = currentState.inputs;
              const ts = (inp.timeSaved as number) || (inputs.timeSavedPerEncounter as number) || 0;
              const recoveredHours = ts > 0 ? Math.round(documentedEncounters * ts / 60) : 0;
              const fte = ts > 0 ? (recoveredHours / ANNUAL_HOURS).toFixed(1) : null;

              const pts = (inp.additionalPatientsPerMonth as number) || 0;
              const rp = (inp.redesignedProviders as number) || providers;
              const accessRevenue = pts > 0 ? Math.round(pts * rp * 11 * revenuePerVisit) : null;

              const drpv = (inp.downstreamRevenuePerVisit as number) || 0;
              const downstreamRevenue = pts > 0 && drpv > 0 ? Math.round(pts * rp * 11 * drpv) : null;

              const hasAnyValue = recoveredHours > 0 || accessRevenue !== null || downstreamRevenue !== null;
              if (!hasAnyValue) return null;

              const totalDollar = (accessRevenue || 0) + (downstreamRevenue || 0);
              const hasDollarValue = accessRevenue !== null || downstreamRevenue !== null;

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
                      <span className="text-white/60">Downstream Revenue</span>
                      <span className="text-white font-medium" data-testid="text-capacity-summary-downstream">
                        {downstreamRevenue !== null ? formatDollar(downstreamRevenue) : '—'}
                      </span>
                    </div>
                    {hasDollarValue && (
                      <>
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold">Total Capacity</span>
                          <span className="text-[#EA2C00] font-bold" data-testid="text-capacity-summary-total">
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
