import { useState, useMemo, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { DS, labelStyle, bodyStyle, cardStyle, featuredCardStyle, primaryButtonStyle, backLinkStyle, inputFieldStyle } from "./designTokens";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
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

const domainInputStyle: React.CSSProperties = {
  ...inputFieldStyle,
  fontSize: 18,
};

function InputField({ label, description, prefix, suffix, value, onChange, placeholder, testId }: {
  label: string; description: string; prefix?: string; suffix?: string;
  value: number; onChange: (v: number) => void; placeholder?: string; testId: string;
}) {
  return (
    <div>
      <p style={labelStyle} className="mb-1.5">{label}</p>
      <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }} className="mb-3">{description}</p>
      <div className="flex items-center gap-2">
        {prefix && <span style={{ fontSize: 15, color: DS.muted, fontFamily: DS.font }}>{prefix}</span>}
        <FormattedNumberInput
          value={value}
          onChange={onChange}
          placeholder={placeholder || '0'}
          style={domainInputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = DS.red; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = DS.border; }}
          data-testid={testId}
        />
        {suffix && <span style={{ fontSize: 15, color: DS.muted, fontFamily: DS.font }}>{suffix}</span>}
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
      <p style={labelStyle} className="mb-1.5">{label}</p>
      <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }} className="mb-3">{description}</p>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 accent-[#0F0F0F]"
          style={{ height: 4 }}
          data-testid={testId}
        />
        <span style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 18, color: DS.black, minWidth: 60, textAlign: 'right' }}>{display}</span>
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
      <p style={labelStyle} className="mb-1.5">{label}</p>
      <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }} className="mb-3">{description}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              fontFamily: DS.font, fontWeight: value === opt ? 700 : 500, fontSize: 14,
              padding: '10px 22px', borderRadius: DS.radius.pill,
              border: `1.5px solid ${value === opt ? DS.black : DS.border}`,
              backgroundColor: DS.white,
              color: value === opt ? DS.black : DS.body,
              cursor: 'pointer', transition: 'all 150ms ease',
            }}
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
    <div
      style={{
        ...featuredCardStyle,
        marginTop: 16,
      }}
      data-testid="card-domain-feedback"
    >
      <p style={labelStyle} className="mb-2">{label}</p>
      <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 36, color: DS.black, lineHeight: 1.1 }} className="mb-2" data-testid="text-feedback-value">
        {formatDollar(Math.max(0, value))}
      </p>
      <p style={{ fontSize: 15, color: DS.body, lineHeight: 1.6, fontFamily: DS.font }} className="mb-3">{context}</p>
      <p style={{ fontSize: 12, color: DS.muted, fontStyle: 'italic', fontFamily: DS.font }}>{footnote}</p>
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
    <div style={{ fontFamily: DS.font, paddingTop: 40, paddingBottom: 80 }}>
      <div className="flex items-center justify-center mb-12" style={{ gap: 0, backgroundColor: DS.white, borderBottom: `1px solid ${DS.border}`, padding: '16px 0' }}>
        {DOMAIN_ORDER.map((d, idx) => {
          const isActive = d === activeDomain;
          const isComplete = idx < activeIdx;

          return (
            <div key={d} className="flex items-center">
              <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
                <span
                  style={{
                    fontFamily: DS.font, fontSize: 14,
                    fontWeight: isActive ? 700 : isComplete ? 600 : 400,
                    color: isActive ? DS.red : isComplete ? DS.black : DS.muted,
                    marginBottom: 8,
                  }}
                  data-testid={`domain-label-${d}`}
                >
                  {DOMAIN_LABELS[d]}
                </span>
                <span
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: isActive ? DS.red : isComplete ? DS.black : DS.border,
                    display: 'block',
                  }}
                  data-testid={`domain-dot-${d}`}
                />
              </div>
              {idx < DOMAIN_ORDER.length - 1 && (
                <div style={{ width: 40, height: 1, backgroundColor: DS.border, marginTop: 20 }} />
              )}
            </div>
          );
        })}
      </div>

      <div className="max-w-[640px] mx-auto">
        <p style={labelStyle} className="mb-3" data-testid="text-domain-label">
          {config.label}
        </p>
        <h1 style={{ fontWeight: 700, fontSize: 44, color: DS.black, lineHeight: 1.15, fontFamily: DS.font }} className="mb-4 hidden md:block" data-testid="text-domain-headline">
          {config.headline}
        </h1>
        <h1 style={{ fontWeight: 700, fontSize: 32, color: DS.black, lineHeight: 1.15, fontFamily: DS.font }} className="mb-4 block md:hidden">
          {config.headline}
        </h1>
        <p style={{ ...bodyStyle, maxWidth: 520 }} className="mb-12" data-testid="text-domain-reframe">
          {config.reframe}
        </p>

        <p style={labelStyle} className="mb-4">
          Where is your organization today?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {config.cards.map((card) => {
            const isSelected = currentState.activationLevel === card.level;
            return (
              <button
                key={card.level}
                type="button"
                onClick={() => setActivation(card.level)}
                className="text-left"
                style={{
                  backgroundColor: DS.white,
                  border: `1.5px solid ${DS.border}`,
                  borderLeft: isSelected ? `5px solid ${DS.red}` : `1.5px solid ${DS.border}`,
                  borderRadius: DS.radius.card,
                  padding: isSelected ? '24px 24px 24px 19px' : '24px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? DS.shadow : 'none',
                  transition: 'all 150ms ease',
                  minHeight: 120,
                }}
                onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = DS.muted; e.currentTarget.style.backgroundColor = '#FAFAF9'; } }}
                onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = DS.border; e.currentTarget.style.backgroundColor = DS.white; } }}
                data-testid={`activation-card-${activeDomain}-${card.level}`}
              >
                <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 32, color: isSelected ? DS.red : DS.border, lineHeight: 1, marginBottom: 8 }}>
                  {card.level}
                </p>
                <p style={{ fontFamily: DS.font, fontWeight: isSelected ? 700 : 600, fontSize: 15, color: DS.black, marginBottom: 4 }}>
                  {card.label}
                </p>
                <p style={{ fontFamily: DS.font, fontWeight: 400, fontSize: 13, color: isSelected ? DS.body : DS.muted, lineHeight: 1.4 }}>
                  {card.description}
                </p>
              </button>
            );
          })}
        </div>

        {currentState.activationLevel && (
          <div
            className="mb-8"
            style={{ animation: 'fadeInUp 200ms ease-out forwards' }}
          >
            <style>{`
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            <div style={{ ...cardStyle, marginTop: 24 }}>
              {activeDomain === 'capacity' && currentState.activationLevel === 2 && (
                <SliderField
                  label="Estimated Redeployment"
                  description="What % of recovered time is being redeployed productively?"
                  value={(currentState.inputs.redeployment as number) || 20}
                  onChange={(v) => setDomainInput('redeployment', v)}
                  min={0} max={100} step={1}
                  display={`${(currentState.inputs.redeployment as number) || 20}%`}
                  testId="slider-redeployment"
                />
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
                <SliderField
                  label="Current Denial Rate"
                  description="Your overall claim denial rate (%)"
                  value={(currentState.inputs.denialRate as number) || 7}
                  onChange={(v) => setDomainInput('denialRate', v)}
                  min={1} max={20} step={1}
                  display={`${(currentState.inputs.denialRate as number) || 7}%`}
                  testId="slider-denial-rate"
                />
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
                <SliderField
                  label="After-Hours Charting"
                  description="Estimated hours per provider per week spent documenting outside clinic hours"
                  value={(currentState.inputs.afterHours as number) || 3}
                  onChange={(v) => setDomainInput('afterHours', v)}
                  min={0} max={8} step={0.5}
                  display={`${(currentState.inputs.afterHours as number) || 3} hrs / week`}
                  testId="slider-after-hours"
                />
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
                <PillSelector
                  label="Documentation Defensibility"
                  description="How would you rate your current note defensibility?"
                  options={['Low', 'Medium', 'High']}
                  value={(currentState.inputs.defensibility as string) || 'Medium'}
                  onChange={(v) => setDomainInput('defensibility', v)}
                  testId="pill-defensibility"
                />
              )}
              {activeDomain === 'risk' && currentState.activationLevel === 2 && (
                <SliderField
                  label="Audit-Ready Notes"
                  description="What % of notes would pass an audit today?"
                  value={(currentState.inputs.auditReady as number) || 50}
                  onChange={(v) => setDomainInput('auditReady', v)}
                  min={0} max={100} step={1}
                  display={`${(currentState.inputs.auditReady as number) || 50}%`}
                  testId="slider-audit-ready"
                />
              )}
              {activeDomain === 'risk' && currentState.activationLevel === 3 && (
                <div className="flex flex-col gap-5">
                  <InputField label="CDI Query Rate (per 1,000)" description="Average CDI queries per 1,000 encounters" value={(currentState.inputs.queryRate as number) || 15} onChange={(v) => setDomainInput('queryRate', v)} testId="input-query-rate" />
                  <InputField label="CDI Query Cost ($)" description="Average cost per CDI query" prefix="$" value={(currentState.inputs.queryCost as number) || 45} onChange={(v) => setDomainInput('queryCost', v)} testId="input-query-cost" />
                </div>
              )}
              {activeDomain === 'risk' && currentState.activationLevel === 4 && (
                <PillSelector
                  label="AI Initiatives Planned (24mo)"
                  description="How many AI initiatives are planned in the next 24 months?"
                  options={['1\u20132', '3\u20135', '5+']}
                  value={(currentState.inputs.initiatives as string) || '1\u20132'}
                  onChange={(v) => setDomainInput('initiatives', v)}
                  testId="pill-initiatives"
                />
              )}

              {activeDomain === 'capacity' && currentState.activationLevel === 1 && (
                <p style={{ fontSize: 13, color: DS.muted, fontStyle: 'italic', fontFamily: DS.font }}>
                  No additional inputs needed. We'll use benchmarks for this activation level.
                </p>
              )}
              {activeDomain === 'revenue' && currentState.activationLevel === 1 && (
                <p style={{ fontSize: 13, color: DS.muted, fontStyle: 'italic', fontFamily: DS.font }}>
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
          </div>
        )}

        <div className="flex items-center justify-between" style={{ marginTop: currentState.activationLevel ? 32 : 56 }}>
          <button onClick={handleDomainBack} style={backLinkStyle} data-testid="button-back">
            Back
          </button>
          <button
            onClick={handleAdvance}
            disabled={!currentState.activationLevel}
            className="inline-flex items-center gap-2"
            style={primaryButtonStyle(!!currentState.activationLevel)}
            onMouseEnter={(e) => currentState.activationLevel && (e.currentTarget.style.backgroundColor = DS.redHover)}
            onMouseLeave={(e) => currentState.activationLevel && (e.currentTarget.style.backgroundColor = DS.red)}
            data-testid="button-domain-next"
          >
            {DOMAIN_CTA[activeDomain]}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
