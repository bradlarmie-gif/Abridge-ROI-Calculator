import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import {
  type Domain, type ActivationLevel,
  DOMAIN_ORDER, DOMAIN_LABELS,
  computeDomainScore,
  computeCapacityFeedback, computeRevenueFeedback,
  computeWorkforceFeedback, computeRiskFeedback,
} from "./domainCalculations";

interface Screen4Props {
  onNext: () => void;
  onBack: () => void;
}

const DOMAIN_CTA: Record<Domain, string> = {
  capacity: 'See Revenue Impact',
  revenue: 'See Workforce Impact',
  workforce: 'See Risk Exposure',
  risk: 'See My Score',
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
  reframe: string;
  cards: ActivationCard[];
};

const DOMAIN_CONFIGS: Record<Domain, DomainConfig> = {
  capacity: {
    label: 'CAPACITY',
    headline: 'Where does recovered time actually go?',
    reframe: 'Most organizations measure ambient AI by physician satisfaction. The real question is what happened to the time it returned \u2014 and whether your organization has a system for capturing it.',
    cards: [
      { level: 1, label: 'Not yet captured', description: 'Time returned but not systematically redeployed' },
      { level: 2, label: 'Informally tracked', description: 'Some backlog reduction, ad hoc improvements' },
      { level: 3, label: 'Actively managed', description: 'Measurable OT reduction and backlog clearance' },
      { level: 4, label: 'Systematically deployed', description: 'Recovered time drives panel growth and revenue' },
    ],
  },
  revenue: {
    label: 'REVENUE',
    headline: 'What is documentation fidelity worth to your revenue cycle?',
    reframe: 'Revenue cycle can only work with what documentation gives them. Every encounter is either capturing the revenue it earned \u2014 or leaking it.',
    cards: [
      { level: 1, label: 'Not connected', description: 'Documentation quality not linked to revenue strategy' },
      { level: 2, label: 'Some improvement', description: 'Noticed coding lift, informal connection' },
      { level: 3, label: 'Actively managed', description: 'Denial reduction and E/M accuracy tracked' },
      { level: 4, label: 'Revenue infrastructure', description: 'Documentation drives revenue strategy systematically' },
    ],
  },
  workforce: {
    label: 'WORKFORCE',
    headline: 'What is documentation burden costing your workforce?',
    reframe: 'Physician satisfaction surveys tell you what already happened. After-hours documentation burden tells you what is about to happen.',
    cards: [
      { level: 1, label: 'Surveys only', description: 'We measure satisfaction scores and survey results' },
      { level: 2, label: 'Scores improved', description: 'Survey improvement since ambient deployment' },
      { level: 3, label: 'Burden measured', description: 'After-hours charting is tracked and trending down' },
      { level: 4, label: 'Retention connected', description: 'Documentation burden linked to retention metrics' },
    ],
  },
  risk: {
    label: 'RISK',
    headline: 'Is your documentation infrastructure ready for what comes next?',
    reframe: 'Every AI initiative your organization wants in the next three years runs on one foundation \u2014 structured, complete, defensible documentation at scale.',
    cards: [
      { level: 1, label: 'Not connected', description: 'Documentation quality not linked to risk or compliance strategy' },
      { level: 2, label: 'Note completeness', description: 'Improved note quality, some audit readiness' },
      { level: 3, label: 'Audit ready', description: 'Active quality management and defensibility tracking' },
      { level: 4, label: 'Future ready', description: 'Documentation infrastructure supports AI and automation roadmap' },
    ],
  },
};

function InputField({ label, description, prefix, suffix, value, onChange, placeholder, testId }: {
  label: string; description: string; prefix?: string; suffix?: string;
  value: number; onChange: (v: number) => void; placeholder?: string; testId: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-black mb-1">{label}</label>
      <p className="text-sm text-[#888888] mb-2">{description}</p>
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm text-[#888888]">{prefix}</span>}
        <FormattedNumberInput
          value={value}
          onChange={onChange}
          placeholder={placeholder || '0'}
          className="w-full h-12 bg-white border-[#E5E7EB]"
          data-testid={testId}
        />
        {suffix && <span className="text-sm text-[#888888]">{suffix}</span>}
      </div>
    </div>
  );
}

function SliderField({ label, description, value, onChange, min, max, step, display, testId }: {
  label: string; description: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; display: string; testId: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-black mb-1">{label}</label>
      <p className="text-sm text-[#888888] mb-3">{description}</p>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full accent-[#1A1A1A] h-1 flex-1"
          data-testid={testId}
        />
        <span className="font-bold text-lg text-black min-w-[60px] text-right">{display}</span>
      </div>
    </div>
  );
}

function PillSelector({ label, description, options, value, onChange, testId }: {
  label: string; description: string; options: string[]; value: string;
  onChange: (v: string) => void; testId: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-black mb-1">{label}</label>
      <p className="text-sm text-[#888888] mb-3">{description}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full px-5 py-2.5 text-sm cursor-pointer transition-all ${
              value === opt
                ? "border-2 border-[#EA2C00] bg-[#EA2C00]/5 font-bold text-black"
                : "border border-[#E5E7EB] bg-white font-medium text-black/80 hover:border-[#D1D5DB]"
            }`}
            data-testid={`${testId}-${opt}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function FeedbackCard({ label, value, context, footnote }: {
  label: string; value: number; context: string; footnote: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-[#F5F0EB] rounded-lg p-6 mt-6"
      data-testid="card-domain-feedback"
    >
      <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">{label}</p>
      <p className="font-bold text-4xl text-[#EA2C00] leading-[1.1] mb-2" data-testid="text-feedback-value">
        {formatDollar(Math.max(0, value))}
      </p>
      <p className="text-sm text-black leading-relaxed mb-3">{context}</p>
      <p className="text-xs text-[#888888] italic">{footnote}</p>
    </motion.div>
  );
}

export default function Screen4Domains({ onNext, onBack }: Screen4Props) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;
  const [activeDomain, setActiveDomain] = useState<Domain>('capacity');

  const [domainStates, setDomainStates] = useState<Record<Domain, DomainState>>({
    capacity: { activationLevel: null, inputs: {} },
    revenue: { activationLevel: null, inputs: {} },
    workforce: { activationLevel: null, inputs: {} },
    risk: { activationLevel: null, inputs: {} },
  });

  const providers = inputs.providers || 0;
  const annualEncounters = inputs.annualEncounters || 0;
  const utilization = inputs.utilization || 45;
  const timeSavings = inputs.timeSavedPerEncounter || 2.0;

  const currentState = domainStates[activeDomain];
  const config = DOMAIN_CONFIGS[activeDomain];

  const setActivation = useCallback((level: ActivationLevel) => {
    setDomainStates((prev) => ({
      ...prev,
      [activeDomain]: { ...prev[activeDomain], activationLevel: level },
    }));
  }, [activeDomain]);

  const setDomainInput = useCallback((key: string, value: number | string) => {
    setDomainStates((prev) => ({
      ...prev,
      [activeDomain]: {
        ...prev[activeDomain],
        inputs: { ...prev[activeDomain].inputs, [key]: value },
      },
    }));
  }, [activeDomain]);

  const feedback = useMemo(() => {
    if (!currentState.activationLevel) return null;
    const level = currentState.activationLevel;
    const inp = currentState.inputs;
    switch (activeDomain) {
      case 'capacity': return computeCapacityFeedback(level, inp, providers, timeSavings);
      case 'revenue': return computeRevenueFeedback(level, inp, annualEncounters, utilization);
      case 'workforce': return computeWorkforceFeedback(level, inp, providers);
      case 'risk': return computeRiskFeedback(level, inp, annualEncounters, utilization);
    }
  }, [activeDomain, currentState.activationLevel, currentState.inputs, providers, annualEncounters, utilization, timeSavings]);

  const handleAdvance = () => {
    if (currentState.activationLevel && feedback) {
      const score = computeDomainScore(activeDomain, currentState.activationLevel, currentState.inputs);
      dispatch(assessmentActions.updateInput(`${activeDomain}Score` as keyof typeof inputs, score));
      dispatch(assessmentActions.updateInput(`${activeDomain}Gap` as keyof typeof inputs, feedback.value));
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

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <div className="flex items-center justify-center gap-3 mb-10">
        {DOMAIN_ORDER.map((d, idx) => {
          const isActive = d === activeDomain;
          const isComplete = idx < activeIdx;

          return (
            <div key={d} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`text-xs font-medium uppercase tracking-[1.5px] mb-2 ${
                    isActive ? 'text-[#EA2C00]' : isComplete ? 'text-black' : 'text-[#888888]'
                  }`}
                  data-testid={`domain-label-${d}`}
                >
                  {DOMAIN_LABELS[d]}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-[#EA2C00]' : isComplete ? 'bg-black' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid={`domain-dot-${d}`}
                />
              </div>
              {idx < DOMAIN_ORDER.length - 1 && (
                <div className="w-8 h-px bg-[#D1D5DB] mt-5" />
              )}
            </div>
          );
        })}
      </div>

      <div className="max-w-[700px] mx-auto">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight" data-testid="text-domain-headline">
            {config.headline}
          </h1>
          <p className="text-base text-[#888888] max-w-[520px] mx-auto" data-testid="text-domain-reframe">
            {config.reframe}
          </p>
        </motion.div>

        <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10 mb-8">
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2" data-testid="text-domain-label">
            Where is your organization today?
          </p>
          <div className="h-px bg-[#E5E7EB] mb-6" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.cards.map((card, cardIdx) => {
              const isSelected = currentState.activationLevel === card.level;
              return (
                <motion.button
                  key={card.level}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: cardIdx * 0.06, ease: "easeOut" }}
                  onClick={() => setActivation(card.level)}
                  className={`rounded-lg p-5 text-left min-h-[110px] transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#EA2C00]/5 border-2 border-[#EA2C00]"
                      : "bg-white/80 border border-[#E5E7EB] hover:border-[#D1D5DB]"
                  }`}
                  data-testid={`activation-card-${activeDomain}-${card.level}`}
                >
                  <p className={`font-bold text-2xl leading-none mb-2 ${isSelected ? 'text-[#EA2C00]' : 'text-[#D1D5DB]'}`}>
                    {card.level}
                  </p>
                  <p className={`text-sm text-black mb-1 ${isSelected ? 'font-bold' : 'font-semibold'}`}>
                    {card.label}
                  </p>
                  <p className={`text-sm leading-snug ${isSelected ? 'text-black/80' : 'text-[#888888]'}`}>
                    {card.description}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {currentState.activationLevel && (
            <motion.div
              key={`${activeDomain}-${currentState.activationLevel}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mb-8"
            >
              <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10">
                {activeDomain === 'capacity' && currentState.activationLevel === 2 && (
                  <SliderField label="Estimated Redeployment" description="What % of recovered time is being redeployed productively?" value={(currentState.inputs.redeployment as number) || 20} onChange={(v) => setDomainInput('redeployment', v)} min={0} max={100} step={1} display={`${(currentState.inputs.redeployment as number) || 20}%`} testId="slider-redeployment" />
                )}
                {activeDomain === 'capacity' && currentState.activationLevel === 3 && (
                  <div className="flex flex-col gap-5">
                    <InputField label="Monthly OT Reduction" description="Estimated overtime savings per month ($)" prefix="$" value={(currentState.inputs.monthlyOT as number) || 0} onChange={(v) => setDomainInput('monthlyOT', v)} testId="input-monthly-ot" />
                    <InputField label="Backlog Reduction" description="Additional patients seen per month" value={(currentState.inputs.monthlyPatients as number) || 0} onChange={(v) => setDomainInput('monthlyPatients', v)} testId="input-monthly-patients" />
                  </div>
                )}
                {activeDomain === 'capacity' && currentState.activationLevel === 4 && (
                  <div className="flex flex-col gap-5">
                    <InputField label="Additional Patients / Month" description="New patients seen due to recovered capacity" value={(currentState.inputs.additionalPatients as number) || 0} onChange={(v) => setDomainInput('additionalPatients', v)} testId="input-additional-patients" />
                    <InputField label="Revenue Per Visit" description="Average visit revenue ($)" prefix="$" value={(currentState.inputs.revenuePerVisit as number) || 200} onChange={(v) => setDomainInput('revenuePerVisit', v)} testId="input-revenue-per-visit" />
                  </div>
                )}
                {activeDomain === 'revenue' && currentState.activationLevel === 2 && (
                  <SliderField label="Current Denial Rate" description="Your overall claim denial rate (%)" value={(currentState.inputs.denialRate as number) || 7} onChange={(v) => setDomainInput('denialRate', v)} min={1} max={20} step={1} display={`${(currentState.inputs.denialRate as number) || 7}%`} testId="slider-denial-rate" />
                )}
                {activeDomain === 'revenue' && currentState.activationLevel === 3 && (
                  <div className="flex flex-col gap-5">
                    <InputField label="Current Denial Rate (%)" description="Your overall claim denial rate" suffix="%" value={(currentState.inputs.denialRate as number) || 7} onChange={(v) => setDomainInput('denialRate', v)} testId="input-denial-rate" />
                    <InputField label="Average Claim Value ($)" description="Average claim value" prefix="$" value={(currentState.inputs.claimValue as number) || 250} onChange={(v) => setDomainInput('claimValue', v)} testId="input-claim-value" />
                  </div>
                )}
                {activeDomain === 'revenue' && currentState.activationLevel === 4 && (
                  <div className="flex flex-col gap-5">
                    <InputField label="wRVU Improvement Since Deployment (%)" description="Improvement in wRVU since deployment" suffix="%" value={(currentState.inputs.wrvuImprovement as number) || 0} onChange={(v) => setDomainInput('wrvuImprovement', v)} testId="input-wrvu-improvement" />
                    <InputField label="HCC Capture Improvement (%)" description="Improvement in HCC capture rate" suffix="%" value={(currentState.inputs.hccImprovement as number) || 0} onChange={(v) => setDomainInput('hccImprovement', v)} testId="input-hcc-improvement" />
                  </div>
                )}
                {activeDomain === 'workforce' && currentState.activationLevel === 1 && (
                  <SliderField label="After-Hours Charting" description="Estimated hours per provider per week spent documenting outside clinic hours" value={(currentState.inputs.afterHours as number) || 3} onChange={(v) => setDomainInput('afterHours', v)} min={0} max={8} step={0.5} display={`${(currentState.inputs.afterHours as number) || 3} hrs / week`} testId="slider-after-hours" />
                )}
                {activeDomain === 'workforce' && currentState.activationLevel === 2 && (
                  <InputField label="Current Annual Turnover Rate (%)" description="Your physician turnover rate" suffix="%" value={(currentState.inputs.turnoverRate as number) || 8} onChange={(v) => setDomainInput('turnoverRate', v)} testId="input-turnover-rate" />
                )}
                {activeDomain === 'workforce' && currentState.activationLevel === 3 && (
                  <div className="flex flex-col gap-5">
                    <InputField label="After-Hours Reduction (hrs/week/provider)" description="Hours per week reduced per provider" value={(currentState.inputs.afterHoursReduction as number) || 0} onChange={(v) => setDomainInput('afterHoursReduction', v)} testId="input-afterhours-reduction" />
                    <InputField label="Current Turnover Rate (%)" description="Current physician turnover rate" suffix="%" value={(currentState.inputs.turnoverRate as number) || 8} onChange={(v) => setDomainInput('turnoverRate', v)} testId="input-turnover-rate" />
                  </div>
                )}
                {activeDomain === 'workforce' && currentState.activationLevel === 4 && (
                  <div className="flex flex-col gap-5">
                    <InputField label="Turnover Rate Change (%)" description="Reduction in turnover rate since deployment" suffix="%" value={(currentState.inputs.turnoverReduction as number) || 0} onChange={(v) => setDomainInput('turnoverReduction', v)} testId="input-turnover-reduction" />
                    <InputField label="OT / Agency Spend Reduction ($)" description="Monthly reduction in overtime and agency spend" prefix="$" value={(currentState.inputs.otSavings as number) || 0} onChange={(v) => setDomainInput('otSavings', v)} testId="input-ot-savings" />
                  </div>
                )}
                {activeDomain === 'risk' && currentState.activationLevel === 1 && (
                  <PillSelector label="Documentation Defensibility" description="How would you rate your current note defensibility?" options={['Low', 'Medium', 'High']} value={(currentState.inputs.defensibility as string) || 'Medium'} onChange={(v) => setDomainInput('defensibility', v)} testId="pill-defensibility" />
                )}
                {activeDomain === 'risk' && currentState.activationLevel === 2 && (
                  <SliderField label="Audit-Ready Notes" description="What % of notes would pass an audit today?" value={(currentState.inputs.auditReady as number) || 50} onChange={(v) => setDomainInput('auditReady', v)} min={0} max={100} step={1} display={`${(currentState.inputs.auditReady as number) || 50}%`} testId="slider-audit-ready" />
                )}
                {activeDomain === 'risk' && currentState.activationLevel === 3 && (
                  <div className="flex flex-col gap-5">
                    <InputField label="CDI Query Rate (per 1,000)" description="Average CDI queries per 1,000 encounters" value={(currentState.inputs.queryRate as number) || 15} onChange={(v) => setDomainInput('queryRate', v)} testId="input-query-rate" />
                    <InputField label="CDI Query Cost ($)" description="Average cost per CDI query" prefix="$" value={(currentState.inputs.queryCost as number) || 45} onChange={(v) => setDomainInput('queryCost', v)} testId="input-query-cost" />
                  </div>
                )}
                {activeDomain === 'risk' && currentState.activationLevel === 4 && (
                  <PillSelector label="AI Initiatives Planned (24mo)" description="How many AI initiatives are planned in the next 24 months?" options={['1\u20132', '3\u20135', '5+']} value={(currentState.inputs.initiatives as string) || '1\u20132'} onChange={(v) => setDomainInput('initiatives', v)} testId="pill-initiatives" />
                )}
                {activeDomain === 'capacity' && currentState.activationLevel === 1 && (
                  <p className="text-sm text-[#888888] italic">
                    No additional inputs needed. We'll use benchmarks for this activation level.
                  </p>
                )}
                {activeDomain === 'revenue' && currentState.activationLevel === 1 && (
                  <p className="text-sm text-[#888888] italic">
                    No additional inputs needed. We'll use benchmarks for this activation level.
                  </p>
                )}
              </div>

              {feedback && (
                <FeedbackCard
                  label="Estimated Impact"
                  value={feedback.value}
                  context={feedback.context}
                  footnote={feedback.footnote}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <StepFooter
          onBack={handleDomainBack}
          onNext={handleAdvance}
          nextLabel={DOMAIN_CTA[activeDomain]}
          nextDisabled={!currentState.activationLevel}
        />
        <div className={STEP_FOOTER_SPACER_CLASS} />
      </div>
    </div>
  );
}
