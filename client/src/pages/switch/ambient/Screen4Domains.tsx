import { useState, useMemo, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { DS } from "./designTokens";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

interface Screen4Props {
  onNext: () => void;
  onBack: () => void;
}

type Domain = 'capacity' | 'revenue' | 'workforce' | 'risk';
type ActivationLevel = 1 | 2 | 3 | 4;
const DOMAIN_ORDER: Domain[] = ['capacity', 'revenue', 'workforce', 'risk'];
const DOMAIN_LABELS: Record<Domain, string> = {
  capacity: 'Capacity',
  revenue: 'Revenue',
  workforce: 'Workforce',
  risk: 'Risk',
};

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

function computeCapacityFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  providers: number,
  timeSavings: number,
) {
  const totalCapacityValue = providers * 2000 * (4.0 - timeSavings) / 60 * 150 * 0.25;
  const totalHours = Math.round(providers * 2000 * (4.0 - timeSavings) / 60);
  const fte = (totalHours / 2080).toFixed(1);

  if (level === 1) {
    return {
      label: 'Estimated undeployed capacity value',
      value: Math.round(totalCapacityValue),
      context: `At your scale, undeployed recovered time represents an estimated ${totalHours.toLocaleString()} hours annually \u2014 ${fte} FTE of clinical capacity currently evaporating.`,
      footnote: 'Based on Abridge benchmark: 4.0 min avg time returned',
    };
  }
  if (level === 2) {
    const redeployment = (inputs.redeployment as number) || 20;
    const captured = Math.round(totalCapacityValue * (redeployment / 100));
    const gap = Math.round(totalCapacityValue - captured);
    return {
      label: 'Estimated undeployed capacity value',
      value: Math.max(0, gap),
      context: `At ${redeployment}% redeployment, approximately ${formatDollar(captured)} is being captured. ${formatDollar(gap)} remains undeployed annually.`,
      footnote: 'Based on Abridge benchmark: 4.0 min avg time returned',
    };
  }
  if (level === 3) {
    const monthlyOT = (inputs.monthlyOT as number) || 0;
    const monthlyPatients = (inputs.monthlyPatients as number) || 0;
    const annualOT = monthlyOT * 12;
    const annualBacklog = monthlyPatients * 200 * 12;
    const total = annualOT + annualBacklog;
    const nextLayer = Math.max(0, Math.round(totalCapacityValue - total));
    return {
      label: 'Estimated remaining capacity opportunity',
      value: nextLayer,
      context: `You're capturing the efficiency layer. Systematic capacity deployment could add an estimated ${formatDollar(nextLayer)} annually.`,
      footnote: 'Based on Abridge benchmark: 4.0 min avg time returned',
    };
  }
  const additionalPatients = (inputs.additionalPatients as number) || 0;
  const revenuePerVisit = (inputs.revenuePerVisit as number) || 200;
  const annualValue = Math.round(additionalPatients * revenuePerVisit * 12);
  return {
    label: 'Estimated capacity deployment value',
    value: annualValue,
    context: `Strong activation. Your capacity deployment is generating an estimated ${formatDollar(annualValue)} annually.`,
    footnote: 'Based on Abridge benchmark: 4.0 min avg time returned',
  };
}

function computeRevenueFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  annualEncounters: number,
  utilization: number,
) {
  const util = utilization / 100;
  if (level === 1) {
    const denialLeakage = annualEncounters * 0.07 * 0.35 * 0.30 * 250;
    const codingLeakage = annualEncounters * util * 0.015 * 33;
    const hccLeakage = annualEncounters * util * 0.12 * 25;
    const total = Math.round(denialLeakage + codingLeakage + hccLeakage);
    const low = formatDollar(Math.round(total * 0.7));
    const high = formatDollar(Math.round(total * 1.3));
    return {
      label: 'Estimated revenue leakage',
      value: total,
      context: `At your encounter volume, documentation-driven revenue leakage is estimated at ${low}\u2013${high} annually across denials, undercoding, and HCC capture.`,
      footnote: 'Based on industry benchmarks for denial, coding, and HCC rates',
    };
  }
  if (level === 2) {
    const denialRate = (inputs.denialRate as number) || 7;
    const docDenialCost = annualEncounters * util * (denialRate / 100) * 0.35 * 250;
    const benchmarkCost = annualEncounters * util * 0.04 * 0.35 * 250;
    const gap = Math.max(0, Math.round(docDenialCost - benchmarkCost));
    return {
      label: 'Estimated denial gap',
      value: gap,
      context: `At ${denialRate}% denial rate, documentation-related denials are costing approximately ${formatDollar(gap)} more than benchmark annually.`,
      footnote: 'Benchmark denial rate: 4%',
    };
  }
  if (level === 3) {
    const hccValue = Math.round(annualEncounters * util * 0.12 * 25);
    const codingValue = Math.round(annualEncounters * util * 0.015 * 33);
    const remainingGap = hccValue + codingValue;
    return {
      label: 'Estimated remaining revenue opportunity',
      value: remainingGap,
      context: `Denial management is active. Remaining opportunity in HCC capture and E/M accuracy: estimated ${formatDollar(remainingGap)} annually.`,
      footnote: 'Based on industry HCC and coding benchmarks',
    };
  }
  const wrvuImprovement = (inputs.wrvuImprovement as number) || 0;
  const hccImprovement = (inputs.hccImprovement as number) || 0;
  const wrvuValue = annualEncounters * util * (wrvuImprovement / 100) * 1.5 * 33;
  const hccValue = annualEncounters * util * 0.30 * (hccImprovement / 100) * 1200;
  const total = Math.round(wrvuValue + hccValue);
  return {
    label: 'Estimated revenue activation value',
    value: total,
    context: `Strong revenue activation. Documentation intelligence is generating an estimated ${formatDollar(total)} in annual revenue integrity.`,
    footnote: 'Based on wRVU and HCC improvement rates provided',
  };
}

function computeWorkforceFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  providers: number,
) {
  if (level === 1) {
    const afterHours = (inputs.afterHours as number) || 3;
    const annualBurden = Math.round(afterHours * providers * 52);
    const retentionLiability = Math.round(providers * 0.08 * 0.25 * 400000);
    return {
      label: 'Estimated retention liability',
      value: retentionLiability,
      context: `At ${afterHours} hrs/week, your providers carry ${annualBurden.toLocaleString()} hours of after-hours burden annually. Estimated retention liability: ${formatDollar(retentionLiability)}`,
      footnote: 'Based on $400K average physician replacement cost',
    };
  }
  if (level === 2) {
    const turnoverRate = (inputs.turnoverRate as number) || 8;
    const turnoverCost = providers * (turnoverRate / 100) * 400000;
    const docAttributable = Math.round(turnoverCost * 0.25);
    return {
      label: 'Estimated documentation-attributable turnover cost',
      value: docAttributable,
      context: `At ${turnoverRate}% turnover, documentation-attributable departures represent approximately ${formatDollar(docAttributable)} in annual replacement cost.`,
      footnote: 'Documentation burden attributed to 25% of physician turnover',
    };
  }
  if (level === 3) {
    const turnoverRate = (inputs.turnoverRate as number) || 8;
    const remainingLiability = Math.round(providers * (turnoverRate / 100) * 0.20 * 400000);
    return {
      label: 'Estimated remaining workforce exposure',
      value: remainingLiability,
      context: `Meaningful progress. Remaining after-hours burden still represents ${formatDollar(remainingLiability)} in workforce stability exposure.`,
      footnote: 'Based on $400K average physician replacement cost',
    };
  }
  const turnoverReduction = (inputs.turnoverReduction as number) || 0;
  const otSavings = (inputs.otSavings as number) || 0;
  const turnoverSavings = Math.round(providers * (turnoverReduction / 100) * 400000);
  const total = turnoverSavings + (otSavings * 12);
  return {
    label: 'Estimated workforce stability value',
    value: total,
    context: `Strong workforce activation. Documentation intelligence is generating ${formatDollar(total)} in workforce stability value annually.`,
    footnote: 'Based on turnover savings and OT/agency spend reduction',
  };
}

function computeRiskFeedback(
  level: ActivationLevel,
  inputs: Record<string, number | string>,
  annualEncounters: number,
  utilization: number,
) {
  const util = utilization / 100;
  if (level === 1) {
    const defensibility = (inputs.defensibility as string) || 'Medium';
    const multiplier: Record<string, number> = { Low: 0.012, Medium: 0.007, High: 0.003 };
    const annualRevenue = annualEncounters * 200;
    const exposure = Math.round(annualRevenue * (multiplier[defensibility] || 0.007));
    return {
      label: 'Estimated compliance exposure',
      value: exposure,
      context: `Organizations at this defensibility level carry an estimated ${formatDollar(exposure)} in annual audit and quality reporting exposure \u2014 plus structural limitations on automation readiness.`,
      footnote: 'Based on industry audit exposure benchmarks',
    };
  }
  if (level === 2) {
    const auditReady = (inputs.auditReady as number) || 50;
    const gap = 100 - auditReady;
    const exposureValue = Math.round(annualEncounters * util * (gap / 100) * 15);
    return {
      label: 'Estimated compliance exposure',
      value: exposureValue,
      context: `At ${auditReady}% audit readiness, your compliance exposure is approximately ${formatDollar(exposureValue)} annually. Automation readiness remains the larger long-term gap.`,
      footnote: 'Based on per-encounter audit exposure rate',
    };
  }
  if (level === 3) {
    const queryRate = (inputs.queryRate as number) || 15;
    const queryCost = (inputs.queryCost as number) || 45;
    const cdiCost = (annualEncounters / 1000) * queryRate * queryCost;
    const benchmarkCost = (annualEncounters / 1000) * 8 * queryCost;
    const gap = Math.max(0, Math.round(cdiCost - benchmarkCost));
    return {
      label: 'Estimated CDI gap',
      value: gap,
      context: `Solid risk posture. Primary remaining exposure is automation readiness \u2014 the structured data foundation for your next-generation initiatives.`,
      footnote: 'CDI benchmark: 8 queries per 1,000 encounters',
    };
  }
  const initiatives = (inputs.initiatives as string) || '1\u20132';
  const initiativeMultiplier: Record<string, number> = { '1\u20132': 1, '3\u20135': 2.5, '5+': 4 };
  const foundationValue = Math.round(annualEncounters * 0.002 * (initiativeMultiplier[initiatives] || 1) * 1000);
  return {
    label: 'Estimated infrastructure foundation value',
    value: foundationValue,
    context: `Your documentation infrastructure is actively building the foundation for ${initiatives} planned initiatives. This is the highest-leverage infrastructure investment in your roadmap.`,
    footnote: 'Based on initiative count and encounter volume',
  };
}

function computeDomainScore(domain: Domain, level: ActivationLevel, inputs: Record<string, number | string>): number {
  if (domain === 'capacity') {
    const base: Record<number, number> = { 1: 15, 2: 35, 3: 65, 4: 90 };
    const b = base[level] || 0;
    if (level === 2) {
      const redeployment = (inputs.redeployment as number) || 20;
      return Math.round(b + (redeployment / 100) * 20);
    }
    if (level === 3) {
      const monthlyOT = (inputs.monthlyOT as number) || 0;
      const monthlyPatients = (inputs.monthlyPatients as number) || 0;
      const inputScore = Math.min(20, Math.round((monthlyOT + monthlyPatients * 200) / 1000));
      return Math.min(85, b + inputScore);
    }
    return b;
  }
  if (domain === 'revenue') {
    return ({ 1: 10, 2: 30, 3: 62, 4: 88 } as Record<number, number>)[level] || 0;
  }
  if (domain === 'workforce') {
    return ({ 1: 20, 2: 40, 3: 65, 4: 85 } as Record<number, number>)[level] || 0;
  }
  return ({ 1: 15, 2: 38, 3: 62, 4: 90 } as Record<number, number>)[level] || 0;
}

const inputFieldStyle: React.CSSProperties = {
  fontFamily: DS.font, fontWeight: 600, fontSize: 18, color: DS.black,
  backgroundColor: DS.white, border: `1.5px solid ${DS.border}`, borderRadius: 10,
  padding: '14px 18px', width: '100%', outline: 'none', transition: 'border-color 150ms ease',
};

function InputField({ label, description, prefix, suffix, value, onChange, placeholder, testId }: {
  label: string; description: string; prefix?: string; suffix?: string;
  value: number; onChange: (v: number) => void; placeholder?: string; testId: string;
}) {
  return (
    <div>
      <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-1.5">{label}</p>
      <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }} className="mb-3">{description}</p>
      <div className="flex items-center gap-2">
        {prefix && <span style={{ fontSize: 15, color: DS.muted, fontFamily: DS.font }}>{prefix}</span>}
        <FormattedNumberInput
          value={value}
          onChange={onChange}
          placeholder={placeholder || '0'}
          style={inputFieldStyle}
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
      <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-1.5">{label}</p>
      <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }} className="mb-3">{description}</p>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 accent-[#EA2C00]"
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
      <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-1.5">{label}</p>
      <p style={{ fontSize: 15, color: DS.body, fontFamily: DS.font }} className="mb-3">{description}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              fontFamily: DS.font, fontWeight: value === opt ? 700 : 600, fontSize: 14,
              padding: '10px 22px', borderRadius: DS.radius.pill,
              border: `1.5px solid ${value === opt ? DS.black : DS.border}`,
              backgroundColor: value === opt ? DS.white : DS.bg,
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
        backgroundColor: DS.white, border: `1px solid ${DS.border}`, borderLeft: `4px solid ${DS.red}`,
        borderRadius: 12, padding: '24px 24px 24px 20px', boxShadow: DS.shadow,
      }}
      data-testid="card-domain-feedback"
    >
      <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-2">{label}</p>
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
      <div className="flex items-center justify-center mb-12" style={{ gap: 0 }}>
        {DOMAIN_ORDER.map((d, idx) => {
          const isActive = d === activeDomain;
          const isComplete = idx < activeIdx;
          const isUpcoming = idx > activeIdx;

          return (
            <div key={d} className="flex items-center">
              <div className="flex flex-col items-center" style={{ minWidth: 80 }}>
                <span
                  style={{
                    fontFamily: DS.font, fontSize: 13,
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

      <div className="max-w-[600px] mx-auto">
        <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-2.5" data-testid="text-domain-label">
          {config.label}
        </p>
        <h1 style={{ fontWeight: 700, fontSize: 'clamp(32px, 4vw, 48px)', color: DS.black, lineHeight: 1.15, fontFamily: DS.font }} className="mb-4" data-testid="text-domain-headline">
          {config.headline}
        </h1>
        <p style={{ fontSize: 17, color: DS.body, lineHeight: 1.75, fontFamily: DS.font, maxWidth: 520 }} className="mb-12" data-testid="text-domain-reframe">
          {config.reframe}
        </p>

        <p style={{ fontWeight: 600, fontSize: 11, color: DS.muted, letterSpacing: '2.5px', textTransform: 'uppercase', fontFamily: DS.font }} className="mb-4">
          Where is your organization today?
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {config.cards.map((card) => {
            const isSelected = currentState.activationLevel === card.level;
            return (
              <button
                key={card.level}
                type="button"
                onClick={() => setActivation(card.level)}
                className="text-left"
                style={{
                  backgroundColor: isSelected ? DS.white : DS.bg,
                  border: isSelected ? `1px solid ${DS.border}` : `1px solid ${DS.border}`,
                  borderLeft: isSelected ? `4px solid ${DS.red}` : `1px solid ${DS.border}`,
                  borderRadius: 12,
                  padding: isSelected ? '20px 20px 20px 16px' : '20px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.backgroundColor = '#F0F0EE'; e.currentTarget.style.borderColor = '#D0D0D0'; } }}
                onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.backgroundColor = DS.bg; e.currentTarget.style.borderColor = DS.border; } }}
                data-testid={`activation-card-${activeDomain}-${card.level}`}
              >
                <p style={{ fontFamily: DS.font, fontWeight: 700, fontSize: 28, color: isSelected ? DS.red : DS.border, lineHeight: 1, marginBottom: 8 }}>
                  {String(card.level).padStart(2, '0')}
                </p>
                <p style={{ fontFamily: DS.font, fontWeight: 500, fontSize: 13, color: DS.body, marginBottom: 4 }}>
                  {card.label}
                </p>
                <p style={{ fontFamily: DS.font, fontWeight: 400, fontSize: 12, color: DS.muted, lineHeight: 1.4 }}>
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

            {activeDomain === 'capacity' && currentState.activationLevel === 2 && (
              <div className="mb-6">
                <SliderField
                  label="Estimated Redeployment"
                  description="What % of recovered time is being redeployed productively?"
                  value={(currentState.inputs.redeployment as number) || 20}
                  onChange={(v) => setDomainInput('redeployment', v)}
                  min={0} max={100} step={1}
                  display={`${(currentState.inputs.redeployment as number) || 20}%`}
                  testId="slider-redeployment"
                />
              </div>
            )}
            {activeDomain === 'capacity' && currentState.activationLevel === 3 && (
              <div className="flex flex-col gap-5 mb-6">
                <InputField label="Monthly OT Reduction" description="Estimated overtime savings per month ($)" prefix="$" value={(currentState.inputs.monthlyOT as number) || 0} onChange={(v) => setDomainInput('monthlyOT', v)} testId="input-monthly-ot" />
                <InputField label="Backlog Reduction" description="Additional patients seen per month" value={(currentState.inputs.monthlyPatients as number) || 0} onChange={(v) => setDomainInput('monthlyPatients', v)} testId="input-monthly-patients" />
              </div>
            )}
            {activeDomain === 'capacity' && currentState.activationLevel === 4 && (
              <div className="flex flex-col gap-5 mb-6">
                <InputField label="Additional Patients / Month" description="New patients seen due to recovered capacity" value={(currentState.inputs.additionalPatients as number) || 0} onChange={(v) => setDomainInput('additionalPatients', v)} testId="input-additional-patients" />
                <InputField label="Revenue Per Visit" description="Average visit revenue ($)" prefix="$" value={(currentState.inputs.revenuePerVisit as number) || 200} onChange={(v) => setDomainInput('revenuePerVisit', v)} testId="input-revenue-per-visit" />
              </div>
            )}

            {activeDomain === 'revenue' && currentState.activationLevel === 2 && (
              <div className="mb-6">
                <SliderField
                  label="Current Denial Rate"
                  description="Your overall claim denial rate (%)"
                  value={(currentState.inputs.denialRate as number) || 7}
                  onChange={(v) => setDomainInput('denialRate', v)}
                  min={1} max={20} step={1}
                  display={`${(currentState.inputs.denialRate as number) || 7}%`}
                  testId="slider-denial-rate"
                />
              </div>
            )}
            {activeDomain === 'revenue' && currentState.activationLevel === 3 && (
              <div className="flex flex-col gap-5 mb-6">
                <InputField label="Current Denial Rate (%)" description="Your overall claim denial rate" suffix="%" value={(currentState.inputs.denialRate as number) || 7} onChange={(v) => setDomainInput('denialRate', v)} testId="input-denial-rate" />
                <InputField label="Average Claim Value ($)" description="Average claim value" prefix="$" value={(currentState.inputs.claimValue as number) || 250} onChange={(v) => setDomainInput('claimValue', v)} testId="input-claim-value" />
              </div>
            )}
            {activeDomain === 'revenue' && currentState.activationLevel === 4 && (
              <div className="flex flex-col gap-5 mb-6">
                <InputField label="wRVU Improvement Since Deployment (%)" description="Improvement in wRVU since deployment" suffix="%" value={(currentState.inputs.wrvuImprovement as number) || 0} onChange={(v) => setDomainInput('wrvuImprovement', v)} testId="input-wrvu-improvement" />
                <InputField label="HCC Capture Improvement (%)" description="Improvement in HCC capture rate" suffix="%" value={(currentState.inputs.hccImprovement as number) || 0} onChange={(v) => setDomainInput('hccImprovement', v)} testId="input-hcc-improvement" />
              </div>
            )}

            {activeDomain === 'workforce' && currentState.activationLevel === 1 && (
              <div className="mb-6">
                <SliderField
                  label="After-Hours Charting"
                  description="Estimated hours per provider per week spent documenting outside clinic hours"
                  value={(currentState.inputs.afterHours as number) || 3}
                  onChange={(v) => setDomainInput('afterHours', v)}
                  min={0} max={8} step={0.5}
                  display={`${(currentState.inputs.afterHours as number) || 3} hrs / week`}
                  testId="slider-after-hours"
                />
              </div>
            )}
            {activeDomain === 'workforce' && currentState.activationLevel === 2 && (
              <div className="mb-6">
                <InputField label="Current Annual Turnover Rate (%)" description="Your physician turnover rate" suffix="%" value={(currentState.inputs.turnoverRate as number) || 8} onChange={(v) => setDomainInput('turnoverRate', v)} testId="input-turnover-rate" />
              </div>
            )}
            {activeDomain === 'workforce' && currentState.activationLevel === 3 && (
              <div className="flex flex-col gap-5 mb-6">
                <InputField label="After-Hours Reduction (hrs/week/provider)" description="Hours per week reduced per provider" value={(currentState.inputs.afterHoursReduction as number) || 0} onChange={(v) => setDomainInput('afterHoursReduction', v)} testId="input-afterhours-reduction" />
                <InputField label="Current Turnover Rate (%)" description="Current physician turnover rate" suffix="%" value={(currentState.inputs.turnoverRate as number) || 8} onChange={(v) => setDomainInput('turnoverRate', v)} testId="input-turnover-rate" />
              </div>
            )}
            {activeDomain === 'workforce' && currentState.activationLevel === 4 && (
              <div className="flex flex-col gap-5 mb-6">
                <InputField label="Turnover Rate Change (%)" description="Reduction in turnover rate since deployment" suffix="%" value={(currentState.inputs.turnoverReduction as number) || 0} onChange={(v) => setDomainInput('turnoverReduction', v)} testId="input-turnover-reduction" />
                <InputField label="OT / Agency Spend Reduction ($)" description="Monthly reduction in overtime and agency spend" prefix="$" value={(currentState.inputs.otSavings as number) || 0} onChange={(v) => setDomainInput('otSavings', v)} testId="input-ot-savings" />
              </div>
            )}

            {activeDomain === 'risk' && currentState.activationLevel === 1 && (
              <div className="mb-6">
                <PillSelector
                  label="Documentation Defensibility"
                  description="How would you rate your current note defensibility?"
                  options={['Low', 'Medium', 'High']}
                  value={(currentState.inputs.defensibility as string) || 'Medium'}
                  onChange={(v) => setDomainInput('defensibility', v)}
                  testId="pill-defensibility"
                />
              </div>
            )}
            {activeDomain === 'risk' && currentState.activationLevel === 2 && (
              <div className="mb-6">
                <SliderField
                  label="Audit-Ready Notes (%)"
                  description="What percentage of notes would you consider audit-ready today?"
                  value={(currentState.inputs.auditReady as number) || 50}
                  onChange={(v) => setDomainInput('auditReady', v)}
                  min={0} max={100} step={1}
                  display={`${(currentState.inputs.auditReady as number) || 50}%`}
                  testId="slider-audit-ready"
                />
              </div>
            )}
            {activeDomain === 'risk' && currentState.activationLevel === 3 && (
              <div className="flex flex-col gap-5 mb-6">
                <InputField label="CDI Query Rate (per 1,000 encounters)" description="Clinical documentation improvement queries" value={(currentState.inputs.queryRate as number) || 15} onChange={(v) => setDomainInput('queryRate', v)} testId="input-query-rate" />
                <InputField label="Average CDI Query Cost ($)" description="Cost per CDI query" prefix="$" value={(currentState.inputs.queryCost as number) || 45} onChange={(v) => setDomainInput('queryCost', v)} testId="input-query-cost" />
              </div>
            )}
            {activeDomain === 'risk' && currentState.activationLevel === 4 && (
              <div className="mb-6">
                <PillSelector
                  label="AI / Automation Initiatives Planned"
                  description="Major clinical AI initiatives planned in next 24 months"
                  options={['1\u20132', '3\u20135', '5+']}
                  value={(currentState.inputs.initiatives as string) || '1\u20132'}
                  onChange={(v) => setDomainInput('initiatives', v)}
                  testId="pill-initiatives"
                />
              </div>
            )}

            {feedback && (
              <FeedbackCard
                label={feedback.label}
                value={feedback.value}
                context={feedback.context}
                footnote={feedback.footnote}
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-between" style={{ marginTop: currentState.activationLevel ? 32 : 56 }}>
          <button onClick={handleDomainBack} style={{ fontSize: 15, color: DS.body, textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: DS.font, fontWeight: 500 }} data-testid="button-back">
            Back
          </button>
          <button
            onClick={handleAdvance}
            disabled={!currentState.activationLevel}
            className="inline-flex items-center gap-2"
            style={{
              fontFamily: DS.font, fontWeight: 600, fontSize: 15, padding: '15px 36px', borderRadius: DS.radius.input,
              backgroundColor: currentState.activationLevel ? DS.red : DS.border,
              color: currentState.activationLevel ? DS.white : DS.muted,
              border: 'none', cursor: currentState.activationLevel ? 'pointer' : 'not-allowed',
              transition: 'background 150ms ease',
            }}
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
