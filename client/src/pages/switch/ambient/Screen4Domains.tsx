import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Slider } from "@/components/ui/slider";
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
      { level: 1, label: 'Time Saved, Not Deployed', description: 'Providers are faster. Schedules and panels are unchanged.' },
      { level: 2, label: 'Ad Hoc Access Relief', description: 'Recovered time informally absorbed. No scheduling redesign.' },
      { level: 3, label: 'Structured Access Expansion', description: 'Schedules and templates redesigned around recovered time.' },
      { level: 4, label: 'Institutionalized Capacity Strategy', description: 'Capacity targets embedded in panel planning and FTE models.' },
    ],
  },
  revenue: {
    label: 'REVENUE',
    headline: 'What is documentation fidelity worth to your revenue cycle?',
    reframe: 'Revenue cycle can only work with what documentation gives them. Every encounter is either capturing the revenue it earned \u2014 or leaking it.',
    cards: [
      { level: 1, label: 'Documentation Neutral', description: 'Workflow improved. Revenue impact not yet measured.' },
      { level: 2, label: 'Anecdotal Coding Lift', description: 'Coding improvements observed but not systematically tracked.' },
      { level: 3, label: 'Measured Yield Integrity', description: 'Yield variance actively measured against documentation changes.' },
      { level: 4, label: 'Financial Governance Embedded', description: 'Documentation integrated into revenue cycle oversight.' },
    ],
  },
  workforce: {
    label: 'WORKFORCE',
    headline: 'What is documentation burden costing your workforce?',
    reframe: 'Physician satisfaction surveys tell you what already happened. After-hours documentation burden tells you what is about to happen.',
    cards: [
      { level: 1, label: 'Pajama Time Reduced', description: 'Less after-hours charting. Labor strategy unchanged.' },
      { level: 2, label: 'Work Out of Work Reduced', description: 'Chart editing and reconciliation workload measurably lower.' },
      { level: 3, label: 'Turnover Risk Managed', description: 'Attrition tracked against documentation burden reduction.' },
      { level: 4, label: 'Labor Volatility Strategically Reduced', description: 'Agency and overtime exposure structurally declining.' },
    ],
  },
  risk: {
    label: 'RISK',
    headline: 'Is your documentation infrastructure ready for what comes next?',
    reframe: 'Every AI initiative your organization wants in the next three years runs on one foundation \u2014 structured, complete, defensible documentation at scale.',
    cards: [
      { level: 1, label: 'Cleaner Clinical Notes', description: 'Note quality improved. Audit posture unchanged.' },
      { level: 2, label: 'Audit Awareness', description: 'Documentation defensibility actively under review.' },
      { level: 3, label: 'Reporting Friction Reduced', description: 'Reporting and abstraction workload measurably reduced.' },
      { level: 4, label: 'Governed Compliance Infrastructure', description: 'Compliance review integrated with structured data strategy.' },
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
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(v) => onChange(v[0])}
          className="flex-1"
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

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 max-w-[700px]">
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
                        : "bg-white/80 border border-[#E5E7EB]"
                    }`}
                    data-testid={`activation-card-${activeDomain}-${card.level}`}
                  >
                    <p className={`font-bold text-2xl leading-none mb-2 ${isSelected ? 'text-[#EA2C00]' : 'text-[#E5E7EB]'}`}>
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
                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                    Refine Your Inputs
                  </p>
                  <div className="h-px bg-[#E5E7EB] mb-6" />
                  {/* CAPACITY inputs */}
                  {activeDomain === 'capacity' && currentState.activationLevel === 1 && (
                    <p className="text-sm text-[#888888] italic">
                      No additional inputs required. You are experiencing efficiency, not capacity.
                    </p>
                  )}
                  {activeDomain === 'capacity' && currentState.activationLevel === 2 && (
                    <SliderField label="Estimated Redeployment" description="What % of recovered time is being used for additional visits?" value={(currentState.inputs.redeployment as number) || 10} onChange={(v) => setDomainInput('redeployment', v)} min={0} max={25} step={1} display={`${(currentState.inputs.redeployment as number) || 10}%`} testId="slider-redeployment" />
                  )}
                  {activeDomain === 'capacity' && currentState.activationLevel === 3 && (
                    <div className="flex flex-col gap-5">
                      <InputField label="Additional Patients per Month" description="New patients seen due to schedule or template changes" value={(currentState.inputs.additionalPatients as number) || 0} onChange={(v) => setDomainInput('additionalPatients', v)} testId="input-additional-patients" />
                      <InputField label="Revenue per Visit" description="Average visit revenue ($)" prefix="$" value={(currentState.inputs.revenuePerVisit as number) || 200} onChange={(v) => setDomainInput('revenuePerVisit', v)} testId="input-revenue-per-visit" />
                    </div>
                  )}
                  {activeDomain === 'capacity' && currentState.activationLevel === 4 && (
                    <div className="flex flex-col gap-5">
                      <InputField label="Net Visit Growth per Provider per Month" description="Additional visits per provider driven by recovered capacity" value={(currentState.inputs.visitGrowthPerProvider as number) || 0} onChange={(v) => setDomainInput('visitGrowthPerProvider', v)} testId="input-visit-growth" />
                      <InputField label="Revenue per Visit" description="Average visit revenue ($)" prefix="$" value={(currentState.inputs.revenuePerVisit as number) || 200} onChange={(v) => setDomainInput('revenuePerVisit', v)} testId="input-revenue-per-visit" />
                    </div>
                  )}

                  {/* REVENUE inputs */}
                  {activeDomain === 'revenue' && currentState.activationLevel === 1 && (
                    <p className="text-sm text-[#888888] italic">
                      No additional inputs required. Conservative baseline yield only.
                    </p>
                  )}
                  {activeDomain === 'revenue' && currentState.activationLevel === 2 && (
                    <SliderField label="Estimated Yield Delta" description="Estimated improvement in coding yield since deployment (%)" value={(currentState.inputs.yieldDelta as number) || 2} onChange={(v) => setDomainInput('yieldDelta', v)} min={0} max={10} step={0.5} display={`${(currentState.inputs.yieldDelta as number) || 2}%`} testId="slider-yield-delta" />
                  )}
                  {activeDomain === 'revenue' && currentState.activationLevel === 3 && (
                    <div className="flex flex-col gap-5">
                      <InputField label="Measured Yield Lift or wRVU Delta (%)" description="Measured improvement in yield or wRVU since deployment" suffix="%" value={(currentState.inputs.measuredYieldLift as number) || 0} onChange={(v) => setDomainInput('measuredYieldLift', v)} testId="input-measured-yield" />
                    </div>
                  )}
                  {activeDomain === 'revenue' && currentState.activationLevel === 4 && (
                    <div className="flex flex-col gap-5">
                      <InputField label="Recognized Revenue Change ($)" description="Revenue change tied to documentation improvements, recognized in financial reporting" prefix="$" value={(currentState.inputs.recognizedRevenue as number) || 0} onChange={(v) => setDomainInput('recognizedRevenue', v)} testId="input-recognized-revenue" />
                    </div>
                  )}

                  {/* WORKFORCE inputs */}
                  {activeDomain === 'workforce' && currentState.activationLevel === 1 && (
                    <SliderField label="After-Hours Reduction" description="Estimated hours per provider per week of after-hours documentation reduced" value={(currentState.inputs.afterHoursReduction as number) || 2} onChange={(v) => setDomainInput('afterHoursReduction', v)} min={0} max={8} step={0.5} display={`${(currentState.inputs.afterHoursReduction as number) || 2} hrs / week`} testId="slider-after-hours" />
                  )}
                  {activeDomain === 'workforce' && currentState.activationLevel === 2 && (
                    <SliderField label="Edit / Review Time Saved" description="Minutes saved per provider per day in editing, correction, and chart reconciliation" value={(currentState.inputs.editTimeSaved as number) || 15} onChange={(v) => setDomainInput('editTimeSaved', v)} min={0} max={60} step={5} display={`${(currentState.inputs.editTimeSaved as number) || 15} min / day`} testId="slider-edit-time" />
                  )}
                  {activeDomain === 'workforce' && currentState.activationLevel === 3 && (
                    <div className="flex flex-col gap-5">
                      <InputField label="Current Turnover Rate (%)" description="Annual physician turnover rate" suffix="%" value={(currentState.inputs.turnoverRate as number) || 8} onChange={(v) => setDomainInput('turnoverRate', v)} testId="input-turnover-rate" />
                      <InputField label="Replacement Cost per Provider ($)" description="Average cost to recruit and onboard a replacement" prefix="$" value={(currentState.inputs.replacementCost as number) || 400000} onChange={(v) => setDomainInput('replacementCost', v)} testId="input-replacement-cost" />
                    </div>
                  )}
                  {activeDomain === 'workforce' && currentState.activationLevel === 4 && (
                    <div className="flex flex-col gap-5">
                      <InputField label="Agency Spend Avoided ($/month)" description="Monthly reduction in agency or locum spend" prefix="$" value={(currentState.inputs.agencyAvoided as number) || 0} onChange={(v) => setDomainInput('agencyAvoided', v)} testId="input-agency-avoided" />
                      <InputField label="Overtime Reduction ($/month)" description="Monthly reduction in overtime spend" prefix="$" value={(currentState.inputs.overtimeReduction as number) || 0} onChange={(v) => setDomainInput('overtimeReduction', v)} testId="input-overtime-reduction" />
                    </div>
                  )}

                  {/* RISK inputs */}
                  {activeDomain === 'risk' && currentState.activationLevel === 1 && (
                    <p className="text-sm text-[#888888] italic">
                      No additional inputs required. Cleaner clinical notes are the baseline.
                    </p>
                  )}
                  {activeDomain === 'risk' && currentState.activationLevel === 2 && (
                    <SliderField label="Estimated Defensibility Improvement" description="Estimated improvement in documentation defensibility since deployment (%)" value={(currentState.inputs.defensibilityImprovement as number) || 10} onChange={(v) => setDomainInput('defensibilityImprovement', v)} min={0} max={50} step={5} display={`${(currentState.inputs.defensibilityImprovement as number) || 10}%`} testId="slider-defensibility" />
                  )}
                  {activeDomain === 'risk' && currentState.activationLevel === 3 && (
                    <InputField label="Reporting Hours Reduced per Month" description="Hours saved in quality reporting and chart abstraction per month" value={(currentState.inputs.reportingHoursReduced as number) || 0} onChange={(v) => setDomainInput('reportingHoursReduced', v)} testId="input-reporting-hours" />
                  )}
                  {activeDomain === 'risk' && currentState.activationLevel === 4 && (
                    <div className="flex flex-col gap-5">
                      <InputField label="Audit Findings Reduced (%)" description="Reduction in audit findings since deployment" suffix="%" value={(currentState.inputs.auditFindingsReduced as number) || 0} onChange={(v) => setDomainInput('auditFindingsReduced', v)} testId="input-audit-findings" />
                      <InputField label="Compliance Exposure Estimate ($)" description="Estimated annual compliance exposure reduced" prefix="$" value={(currentState.inputs.complianceExposure as number) || 0} onChange={(v) => setDomainInput('complianceExposure', v)} testId="input-compliance-exposure" />
                    </div>
                  )}
                </div>
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

        {feedback && (
          <motion.div
            className="w-full lg:w-[320px] flex-shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            key={`feedback-${activeDomain}-${currentState.activationLevel}`}
          >
            <div className="bg-[#1A1A1A] rounded-xl p-6 lg:sticky lg:top-24" data-testid="card-domain-feedback">
              <p className="text-[11px] font-medium text-white/70 uppercase tracking-[1.5px] mb-4">
                Estimated Impact
              </p>

              <p className="font-bold text-4xl text-[#EA2C00] leading-[1.1] mb-4" data-testid="text-feedback-value">
                {formatDollar(Math.max(0, feedback.value))}
              </p>

              <div className="h-px bg-white/10 my-4" />

              <p className="text-sm text-white/80 leading-relaxed mb-4">
                {feedback.context}
              </p>

              <p className="text-xs text-white/40 italic leading-relaxed">
                {feedback.footnote}
              </p>

              <div className="h-px bg-white/10 my-5" />

              <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
                Domain Progress
              </p>
              <div className="space-y-2">
                {DOMAIN_ORDER.map((d) => {
                  const isActive = d === activeDomain;
                  const dState = domainStates[d];
                  const hasValue = dState.activationLevel !== null;
                  return (
                    <div key={d} className="flex items-center justify-between text-sm">
                      <span className={isActive ? 'text-white font-medium' : 'text-white/50'}>
                        {DOMAIN_LABELS[d]}
                      </span>
                      <span className={hasValue ? 'text-white font-semibold' : 'text-white/30'}>
                        {hasValue ? `Level ${dState.activationLevel}` : '\u2014'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
