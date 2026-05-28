import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import {
  type Domain, type ActivationLevel,
  DOMAIN_ORDER, DOMAIN_LABELS, LEVEL_NAMES,
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
  capacity: 'Continue to Revenue →',
  revenue: 'Continue to Workforce →',
  workforce: 'Continue to Quality →',
  risk: 'Continue to Patient Experience →',
};

const DOMAIN_ABBREVS: Record<Domain, string> = {
  capacity: 'CAP',
  revenue: 'REV',
  workforce: 'WFO',
  risk: 'QUAL',
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
  transition?: string;
  reframe: string;
  cards: ActivationCard[];
  unlockTeasers?: Record<number, string>;
};

const DOMAIN_CONFIGS: Record<Domain, DomainConfig> = {
  capacity: {
    label: 'CAPACITY',
    headline: 'CAPACITY',
    subheadline: 'What happened to the recovered time?',
    reframe: "Time recovered from documentation is the starting point. What an organization builds on top of it — more patients, a different care model, protected teaching time, providers who leave on time — is where the strategic story begins. This domain traces how far that decision has traveled.",
    cards: [
      {
        level: 1,
        label: 'Time Recovered',
        description: 'Providers are documenting faster. That recovered time hasn\'t been formally directed anywhere yet — the clock is running, the value hasn\'t been assigned.',
      },
      {
        level: 2,
        label: 'Time Use Visible',
        description: 'The time is visibly going somewhere — more patients, earlier departures, extended visits, or protected teaching time. The direction is clear; the magnitude hasn\'t been calculated.',
      },
      {
        level: 3,
        label: 'Capacity Impact Measured',
        description: 'The financial or operational value of how recovered time is being used has been calculated. A defensible number exists for this domain.',
      },
      {
        level: 4,
        label: 'Capacity Intelligence',
        description: 'Recovered capacity is an organizational planning input — informing care model design, panel sizing, and workforce deployment. The organization can grow differently because of what ambient made possible.',
      },
    ],
    unlockTeasers: {
      2: 'Identify where recovered time is visibly going.',
      3: 'Calculate the financial or operational value of how recovered time is being used.',
      4: 'Use capacity data as an organizational planning input — care model design, panel growth, and workforce deployment.',
    },
  },
  revenue: {
    label: 'REVENUE',
    headline: 'REVENUE',
    subheadline: 'Has better documentation shown up in reimbursement?',
    transition: "This is the domain that surprises finance teams. Documentation quality almost always affects reimbursement — coding specificity, denial rates, wRVU per encounter. Most organizations just haven't run the analysis yet. This is what they find when they do.",
    reframe: "Documentation quality determines what gets coded, what gets paid, and what payers see. Organizations that connect their ambient deployment to revenue cycle consistently find the relationship was already generating — it just hadn't been examined. This domain is about how far that connection has been built.",
    cards: [
      {
        level: 1,
        label: 'Revenue Unrealized',
        description: 'Documentation quality is improving. Whether it\'s showing up in coding specificity, denial rates, or collections hasn\'t been examined — but it almost always is.',
      },
      {
        level: 2,
        label: 'Revenue Signals Visible',
        description: 'Directional movement is visible in billing data — wRVU trends, E&M distribution, denial rates, or collections per encounter. The before/after analysis that produces a defensible number hasn\'t been run yet.',
      },
      {
        level: 3,
        label: 'Revenue Impact Measured',
        description: 'A before/after analysis is complete. Documentation-driven revenue impact has a number — calculated from your data, defensible to your CFO.',
      },
      {
        level: 4,
        label: 'Revenue Intelligence',
        description: 'Documentation intelligence is embedded in how revenue runs — CDI strategy, payer positioning, and denial prevention are structurally informed by documentation quality.',
      },
    ],
    unlockTeasers: {
      2: 'Identify which revenue metrics are moving in your data.',
      3: 'Complete a before/after analysis to put a defensible number on the impact.',
      4: 'Embed documentation intelligence into CDI strategy, payer positioning, and financial planning.',
    },
  },
  workforce: {
    label: 'WORKFORCE',
    headline: 'WORKFORCE',
    subheadline: 'Has reduced documentation burden changed how providers live and work?',
    transition: 'Provider satisfaction and retention rarely appear in a value analysis. They show up in recruiting budgets, exit interviews, and unfilled positions.',
    reframe: "Provider experience has a financial shape that most organizations haven't fully mapped. The relationship between documentation burden, provider retention, and workforce economics is direct — and significant. This domain traces how far that connection has been built.",
    cards: [
      {
        level: 1,
        label: 'Burden Lifting',
        description: 'Providers are finishing their days differently — less documentation burden, more presence in the room. The change is visible but hasn\'t been connected to retention or financial outcomes.',
      },
      {
        level: 2,
        label: 'Behavioral Signals Visible',
        description: 'Observable changes in provider behavior — after-hours patterns, note completion, satisfaction scores — are documented. Real signal; not yet confirmed across the full provider population.',
      },
      {
        level: 3,
        label: 'Retention Impact Confirmed',
        description: 'Turnover rates have measurably changed. The financial value of improved retention is calculated and defensible to HR and finance leadership.',
      },
      {
        level: 4,
        label: 'Provider Experience as Advantage',
        description: 'Provider experience is a board-level asset — integrated into recruitment strategy, care model design, and workforce planning. The organization\'s relationship to the labor market has structurally changed.',
      },
    ],
    unlockTeasers: {
      2: 'Observe and document behavioral changes in provider patterns outside the clinic.',
      3: 'Connect burden reduction to before/after turnover rate changes.',
      4: 'Use provider experience data as a strategic workforce asset — recruitment, care model design, and executive workforce planning.',
    },
  },
  risk: {
    label: 'QUALITY',
    headline: 'QUALITY',
    subheadline: 'How far has documentation quality traveled downstream?',
    transition: "Documentation quality powers everything downstream — CDI accuracy, coding specificity, compliance, and the data foundation for clinical AI. Most organizations are generating these improvements. Most haven't connected the dots to the teams that benefit.",
    reframe: "Better documentation creates better signal across every downstream system that depends on it — coding, CDI, quality programs, risk adjustment, and eventually clinical AI. Each improvement compounds over time. This domain is about how far that signal has traveled, and who's using it.",
    cards: [
      {
        level: 1,
        label: 'Documentation Improving',
        description: 'Documentation quality has improved — note completeness, diagnostic specificity, clinical detail. What that improvement is worth downstream hasn\'t been formally assessed.',
      },
      {
        level: 2,
        label: 'Downstream Movement Visible',
        description: 'Quality improvements are showing up in downstream systems — CDI queries, coding accuracy, quality measure gaps. No financial figure established yet, but something is clearly moving.',
      },
      {
        level: 3,
        label: 'Downstream Value Connected',
        description: 'Documentation quality is connected to a downstream program with a measurable figure — CDI, coding, quality measures, or denial reduction.',
      },
      {
        level: 4,
        label: 'Documentation Intelligence Layer',
        description: 'Documentation quality is a governed intelligence layer — powering value-based care strategy, compliance governance, and clinical AI readiness.',
      },
    ],
    unlockTeasers: {
      2: 'Observe which downstream systems — CDI, coding, quality metrics — are showing movement.',
      3: 'Connect documentation quality to downstream programs — CDI, coding, HCC capture, or denial reduction.',
      4: 'Transform documentation into a governed intelligence layer — VBC strategy, compliance, and the foundation for clinical AI.',
    },
  },
};

const FUTURE_DESCRIPTIONS: Record<string, Record<number, string>> = {
  capacity: {
    3: 'Calculate the financial or operational value of how recovered time is being used.',
    4: 'Use capacity intelligence as an organizational planning input — care model design, panel sizing, service line strategy, and workforce deployment.',
  },
  revenue: {
    3: 'Complete a before/after analysis to quantify documentation-driven revenue impact.',
    4: 'Documentation intelligence drives revenue strategy, payer positioning, and financial planning.',
  },
  workforce: {
    2: 'Document observable behavioral changes — after-hours patterns, note completion, time at home.',
    3: 'Connect before/after turnover rate change to the financial value of improved retention.',
    4: 'Use provider experience as a strategic asset — recruitment positioning, care model design, and boardroom-level workforce planning.',
  },
  risk: {
    3: 'Connect documentation quality to a financial pathway — CDI, HCC capture, MIPS, or denial reduction.',
    4: 'Transform documentation quality into a governed organizational intelligence layer — the foundation for VBC strategy, compliance governance, and clinical AI.',
  },
};

function BenchmarkContext({ text }: { text: string }) {
  return <p className="text-xs text-[#999999] italic mt-2">{text}</p>;
}

// Frames number inputs as a distinct "enter your confirmed measurement" moment
function MeasurementBlock({
  hint,
  children,
  liveResult,
}: {
  hint: string;
  children: React.ReactNode;
  liveResult?: string | null;
}) {
  return (
    <div className="border-t border-[#E8E3DC] mt-5 pt-5">
      <p
        className="text-[10px] font-semibold text-[#888888] uppercase tracking-[2px] mb-1"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        Enter your measurement
      </p>
      <p
        className="text-xs text-[#AAAAAA] mb-4 leading-relaxed"
        style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
      >
        {hint}
      </p>
      {children}
      {liveResult && (
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-base font-bold text-[#EA2C00]">{liveResult}</span>
          <span className="text-xs text-[#AAAAAA]">/ yr estimated across your deployment</span>
        </div>
      )}
    </div>
  );
}



export default function Screen4Domains({ onNext, onBack, initialDomain }: Screen4Props) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;
  const [activeDomain, setActiveDomain] = useState<Domain>(initialDomain || 'capacity');
  const [teaserOpen, setTeaserOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ActivationLevel | null>(null);
  const [expandedLevel, setExpandedLevel] = useState<ActivationLevel | null>(
    (inputs.capacityActivationLevel as ActivationLevel | null) || null
  );

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
  const utilization = inputs.utilization || 0;
  const revenuePerVisit = inputs.revenuePerVisit || 200;
  const documentedEncounters = Math.round(annualEncounters * (utilization / 100));

  const currentState = domainStates[activeDomain];
  const config = DOMAIN_CONFIGS[activeDomain];

  const setActivation = useCallback((level: ActivationLevel) => {
    setDomainStates((prev) => ({
      ...prev,
      [activeDomain]: { ...prev[activeDomain], activationLevel: level },
    }));
    dispatch(assessmentActions.updateInput(`${activeDomain}ActivationLevel` as keyof typeof inputs, level));
    setExpandedLevel(level);
    // No scroll here — domain transitions handle their own scroll
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

  const resetActivation = useCallback(() => {
    setDomainStates(prev => ({
      ...prev,
      [activeDomain]: { ...prev[activeDomain], activationLevel: null },
    }));
    dispatch(assessmentActions.updateInput(
      `${activeDomain}ActivationLevel` as keyof typeof inputs,
      null as unknown as ActivationLevel
    ));
    setSelectedLevel(null);
    setExpandedLevel(null);
  }, [activeDomain, dispatch]);

  const inputsPanelRef = useRef<HTMLDivElement>(null);

  const handleLevelSelect = useCallback((level: ActivationLevel) => {
    setSelectedLevel(level);
    setActivation(level);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 80);
  }, [setActivation]);

  const [editingRevPerVisit, setEditingRevPerVisit] = useState(false);
  const [editRevRaw, setEditRevRaw] = useState('');
  const editRevRef = useRef<HTMLInputElement>(null);
  const [editingBenchmarkMin, setEditingBenchmarkMin] = useState(false);
  const [editBenchmarkRaw, setEditBenchmarkRaw] = useState('');
  const editBenchmarkRef = useRef<HTMLInputElement>(null);

  // Reset level selection whenever the active domain changes
  useEffect(() => {
    setSelectedLevel(null);
  }, [activeDomain]);


  // Focus rev-per-visit inline edit input
  useEffect(() => {
    if (editingRevPerVisit) {
      setEditRevRaw(revenuePerVisit > 0 ? revenuePerVisit.toString() : '200');
      setTimeout(() => editRevRef.current?.select(), 30);
    }
  }, [editingRevPerVisit]);

  // Focus benchmark minutes inline edit input
  useEffect(() => {
    if (editingBenchmarkMin) {
      const bm = (domainStates.capacity.inputs.timeSaved as number) || 1.5;
      setEditBenchmarkRaw(bm.toString());
      setTimeout(() => editBenchmarkRef.current?.select(), 30);
    }
  }, [editingBenchmarkMin]);

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


  const handleAdvance = (levelOverride?: ActivationLevel) => {
    const level = levelOverride ?? currentState.activationLevel;
    if (level) {
      const score = computeDomainScore(activeDomain, level, currentState.inputs);
      // Compute feedback with explicit level so we can call this before state flush
      const inp = currentState.inputs;
      const fb: DomainFeedback | null = (() => {
        switch (activeDomain) {
          case 'capacity': {
            const capInp = inp.timeSaved ? inp : { ...inp, timeSaved: inputs.timeSavedPerEncounter || 0 };
            return computeCapacityFeedback(level, capInp, providers, documentedEncounters, revenuePerVisit);
          }
          case 'revenue': return computeRevenueFeedback(level, inp, documentedEncounters, revenuePerVisit, inputs.conversionFactor || 33, providers);
          case 'workforce': return computeWorkforceFeedback(level, inp, providers);
          case 'risk': return computeRiskFeedback(level, inp, documentedEncounters, revenuePerVisit, providers);
        }
      })();
      dispatch(assessmentActions.updateInput(`${activeDomain}Score` as keyof typeof inputs, score));
      dispatch(assessmentActions.updateInput(`${activeDomain}Gap` as keyof typeof inputs, fb?.value || 0));
      dispatch(assessmentActions.updateInput(`${activeDomain}HasValue` as keyof typeof inputs, fb?.hasValue || false));
      dispatch(assessmentActions.updateInput(`${activeDomain}HeadlineMetric` as keyof typeof inputs, fb?.headlineMetric || ''));
      dispatch(assessmentActions.updateInput(`${activeDomain}Context` as keyof typeof inputs, fb?.context || ''));
      dispatch(assessmentActions.updateInput(`${activeDomain}Formula` as keyof typeof inputs, fb?.formula || ''));
      dispatch(assessmentActions.updateInput(`${activeDomain}Footnote` as keyof typeof inputs, fb?.footnote || ''));
      if (activeDomain === 'capacity') {
        const timeSaved = (currentState.inputs.timeSaved as number) || 0;
        dispatch(assessmentActions.updateInput('timeSavedPerEncounter', timeSaved));
      }
    }

    const idx = DOMAIN_ORDER.indexOf(activeDomain);
    if (idx < DOMAIN_ORDER.length - 1) {
      const nextDomain = DOMAIN_ORDER[idx + 1];
      setActiveDomain(nextDomain);
      setTeaserOpen(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onNext();
    }
  };

  const handleDomainBack = () => {
    const idx = DOMAIN_ORDER.indexOf(activeDomain);
    if (idx > 0) {
      const prevDomain = DOMAIN_ORDER[idx - 1];
      setActiveDomain(prevDomain);
      setTeaserOpen(false);
      setExpandedLevel(domainStates[prevDomain].activationLevel);
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

  const renderCapacityInputs = (levelOverride?: ActivationLevel) => {
    const level = levelOverride ?? currentState.activationLevel;
    if (!level) return null;

    const CAPACITY_TIME_SAVINGS_SIGNS = [
      'Providers finishing documentation before leaving the building',
      'After-hours documentation time visibly reduced',
      'Providers reporting more time between patients',
      'Scheduling or ops team noticing more available appointment slots',
    ];

    const benchmarkMin = (currentState.inputs.timeSaved as number) || 1.5;
    const commitBenchmarkMin = () => {
      const parsed = parseFloat(editBenchmarkRaw);
      if (!isNaN(parsed) && parsed > 0) setDomainInput('timeSaved', parsed);
      setEditingBenchmarkMin(false);
    };
    const benchmarkCard = documentedEncounters > 0 ? (
      <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-4 py-3">
        <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
          <span className="text-lg font-bold text-[#1A1A1A]">
            {Math.round(documentedEncounters * benchmarkMin / 60).toLocaleString()} hrs / yr
          </span>
          <span className="text-xs text-[#888888]">estimated time recovered</span>
        </div>
        <p className="text-xs text-[#AAAAAA] leading-relaxed">
          {documentedEncounters.toLocaleString()} encounters ×{' '}
          {editingBenchmarkMin ? (
            <input
              ref={editBenchmarkRef}
              type="text"
              value={editBenchmarkRaw}
              onChange={e => setEditBenchmarkRaw(e.target.value)}
              onBlur={commitBenchmarkMin}
              onKeyDown={e => { if (e.key === 'Enter') commitBenchmarkMin(); if (e.key === 'Escape') setEditingBenchmarkMin(false); }}
              className="inline text-xs text-[#1A1A1A] font-medium bg-transparent outline-none border-b border-[#EA2C00]"
              style={{ width: '36px' }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingBenchmarkMin(true)}
              className="text-xs font-medium text-[#777777] hover:text-[#EA2C00] underline decoration-dotted underline-offset-2 cursor-pointer bg-transparent border-none p-0"
            >
              {benchmarkMin} min
            </button>
          )}
          {' '}· Observed across Abridge deployments and industry partners — Abridge customers typically see ~2 min
        </p>
      </div>
    ) : null;

    if (level === 1) {
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-3">
              What signs are you seeing that providers are recovering time?
            </label>
            <div className="flex flex-col gap-2.5">
              {CAPACITY_TIME_SAVINGS_SIGNS.map((sign, i) => {
                const checked = isChecked('capacityTimeSigns', i);
                return (
                  <label key={i} htmlFor={`capacity-sign-${i}`}
                    className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'}`}
                  >
                    <Checkbox id={`capacity-sign-${i}`} checked={checked} onCheckedChange={() => toggleCheckboxItem('capacityTimeSigns', i)} data-testid={`checkbox-capacity-sign-${i}`} className="mt-0.5" />
                    <span className="text-sm text-[#1A1A1A] select-none leading-snug">{sign}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {benchmarkCard}
        </div>
      );
    }

    if (level === 2) {
      const decision = (currentState.inputs.capacityTimeDecision as string) || '';
      return (
        <div className="flex flex-col gap-5">

          {/* Q1: What is the recovered time being used for? (specifics first) */}
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-3">
              What is the recovered time being used for? <span className="text-[#888888] font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-col gap-2.5">
              {CAPACITY_TIME_USAGE_LABELS.map((label, i) => {
                const checked = isChecked('capacityTimeUsage', i);
                return (
                  <label key={i} htmlFor={`capacity-usage-${i}`}
                    className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'}`}
                    data-testid={`checkbox-capacity-usage-${i}`}
                  >
                    <Checkbox id={`capacity-usage-${i}`} checked={checked} onCheckedChange={() => toggleCheckboxItem('capacityTimeUsage', i)} className="mt-0.5" />
                    <span className="text-sm text-[#1A1A1A] select-none leading-snug">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Q2: Is this intentional or organic? (intentionality second) */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-3">
              Is this happening intentionally or organically?
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'directed',  label: 'Intentional — leadership has directed where the time should go' },
                { id: 'discussed', label: 'Discussed — it\'s on the agenda but no formal direction yet' },
                { id: 'organic',   label: 'Organic — providers are deciding individually, nothing coordinated' },
              ].map((opt) => (
                <button key={opt.id} type="button" onClick={() => setDomainInput('capacityTimeDecision', opt.id)}
                  className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${decision === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                  data-testid={`radio-capacity-decision-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${decision === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Benchmark hrs — context, no input */}
          {benchmarkCard}

        </div>
      );
    }

    if (level === 3) {
      const CAPACITY_CONFIRMATION_OPTIONS = [
        'An impact analysis has been completed',
        'Leadership has reviewed and signed off on the impact number',
        'A specific executive or operational leader owns this figure',
        'The analysis has been shared with finance or operations leadership',
      ];

      const PROVIDER_BUCKETS = [
        { id: 'handful',    label: 'A handful — fewer than 10%' },
        { id: 'quarter',    label: 'About a quarter' },
        { id: 'half',       label: 'About half' },
        { id: 'most',       label: 'More than three-quarters' },
        { id: 'nearly_all', label: 'All or nearly all' },
      ];
      const BUCKET_PROVIDER_FACTOR: Record<string, number> = {
        handful: 0.08, quarter: 0.25, half: 0.50, most: 0.75, nearly_all: 0.95,
      };

      const providerBucket = (currentState.inputs.capacityProviderBucket as string) || '';
      const bucketProviders = providerBucket
        ? Math.max(1, Math.round(providers * (BUCKET_PROVIDER_FACTOR[providerBucket] ?? 0.5)))
        : providers;

      return (
        <div className="flex flex-col gap-5">

          {/* 1. Confirmation maturity */}
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-3">
              What does your capacity impact measurement look like?
            </label>
            <div className="flex flex-col gap-2.5">
              {CAPACITY_CONFIRMATION_OPTIONS.map((opt, i) => {
                const checked = isChecked('capacityAccessConfirmation', i);
                return (
                  <label key={i} htmlFor={`capacity-confirm-${i}`}
                    className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'}`}
                    data-testid={`checkbox-capacity-confirm-${i}`}
                  >
                    <Checkbox id={`capacity-confirm-${i}`} checked={checked} onCheckedChange={() => toggleCheckboxItem('capacityAccessConfirmation', i)} className="mt-0.5" />
                    <span className="text-sm text-[#1A1A1A] select-none leading-snug">{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 2. Which capacity outcomes measured */}
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-3">
              Which capacity outcomes has your organization measured? <span className="text-[#888888] font-normal">(select all that apply)</span>
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                'Patient volume measurably increased — more encounters attributed to ambient',
                'Third-next-available or new patient wait times have decreased',
                'Panel sizes have grown across providers',
                'Same-day or urgent access slots have increased',
                'After-hours documentation time formally tracked and quantified',
                'Provider end-of-day departure time measurably earlier',
                'Teaching, supervision, or research hours documented and increased',
              ].map((opt, i) => {
                const checked = isChecked('capacityAccessMetrics', i);
                return (
                  <label key={i}
                    className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'}`}
                    data-testid={`checkbox-access-metric-${i}`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleCheckboxItem('capacityAccessMetrics', i)} className="mt-0.5" />
                    <span className="text-sm text-[#1A1A1A] select-none leading-snug">{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Provider coverage — buckets */}
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
              What proportion of your providers show measurable capacity impact?
            </label>
            <p className="text-xs text-[#888888] mb-3">Rough sense is fine — pick the closest bucket.</p>
            <div className="flex flex-col gap-2">
              {PROVIDER_BUCKETS.map((opt) => (
                <button key={opt.id} type="button" onClick={() => setDomainInput('capacityProviderBucket', opt.id)}
                  className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${providerBucket === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                  data-testid={`radio-capacity-bucket-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${providerBucket === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Access expansion pathway → live $ calc */}
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
              If your impact includes access expansion — additional patients per provider per month
            </label>
            <p className="text-xs text-[#888888] mb-3">Enter your measured figure to calculate access revenue. Skip if recovered time went elsewhere.</p>
            <div className="flex items-center gap-3 max-w-[200px]">
              <FormattedNumberInput
                value={(currentState.inputs.additionalPatientsPerMonth as number) || 0}
                onChange={(v) => setDomainInput('additionalPatientsPerMonth', Math.max(0, v))}
                placeholder="e.g. 2"
                className="w-full h-11 bg-white border-[#E5E7EB] rounded-xl text-base"
              />
              <span className="text-sm text-[#888888] flex-shrink-0">pts/mo</span>
            </div>
            {(() => {
              const pts = (currentState.inputs.additionalPatientsPerMonth as number) || 0;
              if (pts <= 0 || !providerBucket || providers <= 0) return null;
              const annual = Math.round(bucketProviders * pts * 12 * revenuePerVisit);
              return (
                <div className="mt-3 rounded-xl border border-[#EA2C00]/25 bg-[#FFF5F2] px-4 py-3">
                  <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                    <span className="text-lg font-bold text-[#EA2C00]">{formatDollar(annual)} / yr</span>
                    <span className="text-xs text-[#888888]">in access revenue</span>
                  </div>
                  <p className="text-xs text-[#AAAAAA] leading-relaxed">
                    ~{bucketProviders.toLocaleString()} providers × {pts} pts/mo × 12 × ${revenuePerVisit.toLocaleString()}/visit
                  </p>
                </div>
              );
            })()}
          </div>

        </div>
      );
    }

    const CAPACITY_STRATEGIC_DECISIONS = [
      'Care model redesign — how providers and care teams are structured',
      'Panel size optimization across specialties or sites',
      'New service line planning or market expansion',
      'Capital planning or facility investment decisions',
      'Workforce planning — staffing ratios or FTE decisions',
    ];

    const commitRevPerVisit = () => {
      const parsed = parseInt(editRevRaw.replace(/,/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0) {
        dispatch(assessmentActions.updateInput('revenuePerVisit', parsed));
      }
      setEditingRevPerVisit(false);
    };

    const leadershipEmbeddedness = (currentState.inputs.capacityLeadershipEmbeddedness as string) || '';
    const financialIntegration = (currentState.inputs.capacityFinancialIntegration as string) || '';
    const confirmedPts = (currentState.inputs.additionalPatientsPerMonth as number) || 0;

    return (
      <div className="flex flex-col gap-5">

        {/* 1. Governance — single combined question */}
        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
            How embedded is capacity strategy at the leadership level?
          </label>
          <div className="flex flex-col gap-2 mt-2">
            {[
              { id: 'full',         label: 'Named executive owner — and capacity data has been at the board or executive committee' },
              { id: 'owner_only',   label: 'Named executive owner — but not yet at board level' },
              { id: 'operational',  label: 'Lives at the operational level — no named strategic owner yet' },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => setDomainInput('capacityLeadershipEmbeddedness', opt.id)}
                className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${leadershipEmbeddedness === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                data-testid={`radio-capacity-leadership-${opt.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${leadershipEmbeddedness === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                  <span>{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Strategic decisions */}
        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-3">
            What organizational decisions has capacity data informed?
          </label>
          <div className="flex flex-col gap-2.5">
            {CAPACITY_STRATEGIC_DECISIONS.map((item, i) => {
              const checked = isChecked('capacityStrategicDecisions', i);
              return (
                <label key={i} htmlFor={`capacity-strategic-${i}`}
                  className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'}`}
                >
                  <Checkbox id={`capacity-strategic-${i}`} checked={checked} onCheckedChange={() => toggleCheckboxItem('capacityStrategicDecisions', i)} data-testid={`checkbox-capacity-strategic-${i}`} className="mt-0.5" />
                  <span className="text-sm text-[#1A1A1A] select-none leading-snug">{item}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 3. Financial planning integration — the L4-defining question */}
        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
            Has the capacity impact been formally incorporated into financial or strategic planning?
          </label>
          <p className="text-xs text-[#888888] mb-3">
            This is what separates demonstrated impact from organizational strategy.
          </p>
          <div className="flex flex-col gap-2">
            {[
              { id: 'yes',         label: 'Yes — embedded in the operating budget or capital plan' },
              { id: 'in_progress', label: 'In progress — being discussed for the next planning cycle' },
              { id: 'not_yet',     label: 'Not yet — the number exists but hasn\'t been formally embedded' },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => setDomainInput('capacityFinancialIntegration', opt.id)}
                className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${financialIntegration === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                data-testid={`radio-capacity-financial-${opt.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${financialIntegration === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                  <span>{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Capacity impact figure — confirm or enter */}
        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
            Capacity impact figure
          </label>
          <p className="text-xs text-[#888888] mb-3">
            If your impact includes access expansion — additional patients per provider per month. Confirm or adjust from your analysis.
          </p>
          <div className="flex items-center gap-3 max-w-[200px]">
            <FormattedNumberInput
              value={confirmedPts}
              onChange={(v) => setDomainInput('additionalPatientsPerMonth', Math.max(0, v))}
              placeholder="e.g. 3"
              className="w-full h-11 bg-white border-[#E5E7EB] rounded-xl text-base"
            />
            <span className="text-sm text-[#888888] flex-shrink-0">pts/mo</span>
          </div>
          {confirmedPts > 0 && providers > 0 && (() => {
            const annual = Math.round(providers * confirmedPts * 12 * revenuePerVisit);
            return (
              <div className="mt-3 rounded-xl border border-[#EA2C00]/25 bg-[#FFF5F2] px-4 py-3">
                <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                  <span className="text-lg font-bold text-[#EA2C00]">{formatDollar(annual)} / yr</span>
                  <span className="text-xs text-[#888888]">in access revenue</span>
                </div>
                <p className="text-xs text-[#AAAAAA] leading-relaxed">
                  {providers.toLocaleString()} providers × {confirmedPts} pts/mo × 12 ×{' '}
                  {editingRevPerVisit ? (
                    <input
                      ref={editRevRef}
                      type="text"
                      value={editRevRaw}
                      onChange={e => setEditRevRaw(e.target.value)}
                      onBlur={commitRevPerVisit}
                      onKeyDown={e => { if (e.key === 'Enter') commitRevPerVisit(); if (e.key === 'Escape') setEditingRevPerVisit(false); }}
                      className="inline text-xs text-[#1A1A1A] font-medium bg-transparent outline-none border-b border-[#EA2C00]"
                      style={{ width: '60px' }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingRevPerVisit(true)}
                      className="text-xs font-medium text-[#777777] hover:text-[#EA2C00] underline decoration-dotted underline-offset-2 cursor-pointer bg-transparent border-none p-0"
                    >
                      ${revenuePerVisit.toLocaleString()}/visit
                    </button>
                  )}
                  <span className="ml-1 text-[#CCCCCC]">— tap to adjust rate</span>
                </p>
              </div>
            );
          })()}
        </div>

      </div>
    );
  };

  const REVENUE_METRIC_OPTIONS = [
    { id: 'wrvu', label: 'wRVU per encounter' },
    { id: 'collections', label: 'Collections per encounter' },
    { id: 'denial_rate', label: 'Denial rate' },
    { id: 'hcc_capture', label: 'HCC capture rate (value-based populations)' },
  ];

  const REVENUE_METRIC_BENCHMARKS: Record<string, string> = {
    wrvu: 'Industry benchmark: 0.05\u20130.15 wRVU per encounter based on published ambient deployment data.',
    collections: 'Organizations at this level have reported $3\u2013$10 increase per encounter based on published ambient deployment data.',
    denial_rate: 'Organizations at this level have reported 5\u201315% reduction in documentation-related denials based on published ambient deployment data.',
  };

  const renderRevenueInputs = (levelOverride?: ActivationLevel) => {
    const level = levelOverride ?? currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      const REVENUE_SIGNALS_L1 = [
        'Revenue cycle or finance has informally noted that documentation improvements might be affecting billing performance',
        'Revenue cycle team has noticed fewer documentation-related denials',
        'Clinical or operational leadership has started asking whether ambient has affected revenue metrics',
        'No one has formally examined the documentation-to-revenue connection yet',
      ];
      const benchmarkLow = providers > 0 ? providers * 2000 : null;
      const benchmarkHigh = providers > 0 ? providers * 6000 : null;
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-3">
              What signals have you noticed around documentation quality and revenue?
            </label>
            <div className="flex flex-col gap-2.5">
              {REVENUE_SIGNALS_L1.map((signal, i) => {
                const checked = isChecked('revenueSignalsL1', i);
                return (
                  <label key={i} htmlFor={`revenue-signal-${i}`}
                    className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'}`}
                  >
                    <Checkbox id={`revenue-signal-${i}`} checked={checked} onCheckedChange={() => toggleCheckboxItem('revenueSignalsL1', i)} data-testid={`checkbox-revenue-signal-${i}`} className="mt-0.5" />
                    <span className="text-sm text-[#1A1A1A] select-none leading-snug">{signal}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {(benchmarkLow && benchmarkHigh) ? (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-4 py-3">
              <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                <span className="text-lg font-bold text-[#1A1A1A]">
                  {formatDollar(benchmarkLow)}–{formatDollar(benchmarkHigh)} / yr
                </span>
                <span className="text-xs text-[#888888]">unattributed opportunity</span>
              </div>
              <p className="text-xs text-[#AAAAAA] leading-relaxed">
                {providers.toLocaleString()} providers × $2K–$6K · Observed across Abridge deployments and industry partners — that number is in your data, it just hasn't been extracted yet.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-4 py-3">
              <p className="text-xs text-[#AAAAAA] leading-relaxed">
                Organizations typically find <strong className="text-[#1A1A1A]">$2,000–$6,000 per provider per year</strong> in documentation-driven revenue that was never formally attributed. That number is in your data — it just hasn't been extracted yet.
              </p>
            </div>
          )}
        </div>
      );
    }

    if (level === 2) {
      const OBSERVATION_AREAS = [
        'wRVU per encounter trending upward',
        'E&M level distribution shifting — more level 4 and 5 codes being documented',
        'ICD-10 coding accuracy improving — documentation supporting higher-specificity billing',
        'Denial rates trending downward',
        'Collections per encounter trending upward',
        'CDI query volume decreasing — fewer billing accuracy interventions needed from coding',
        'Coder productivity improving',
      ];
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-3">
              Which of these movements have you observed since deployment?
            </label>
            <div className="flex flex-col gap-2.5">
              {OBSERVATION_AREAS.map((area, i) => {
                const checked = isChecked('observedMovement', i);
                return (
                  <label
                    key={i}
                    htmlFor={`observed-movement-${i}`}
                    className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'
                    }`}
                  >
                    <Checkbox
                      id={`observed-movement-${i}`}
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('observedMovement', i)}
                      data-testid={`checkbox-observed-movement-${i}`}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-[#1A1A1A] select-none leading-snug">
                      {area}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-3">
              Is this happening intentionally or organically?
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'formal',   label: 'Intentional — finance or revenue cycle is actively tracking this connection' },
                { id: 'informal', label: 'Discussed — it\'s come up in leadership conversations but no one formally owns it' },
                { id: 'no',       label: 'Organic — it surfaced through a review or conversation, not deliberate tracking' },
              ].map((opt) => (
                <button key={opt.id} type="button" onClick={() => setDomainInput('revenueCFOEngaged', opt.id)}
                  className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${(currentState.inputs.revenueCFOEngaged as string) === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                  data-testid={`radio-revenue-cfo-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${(currentState.inputs.revenueCFOEngaged as string) === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional directional dollar estimate — unlocks the L2 revenue figure */}
          <div className="border-t border-[#E8E3DC] pt-5">
            <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-[2px] mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
              Optional — directional estimate
            </p>
            <p className="text-xs text-[#AAAAAA] mb-4 leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
              If you have an observed wRVU improvement per encounter, enter it here for a directional dollar figure. This is not the Demonstrated number — just a signal. Industry benchmark: 0.05–0.15 wRVU per encounter.
            </p>
            <div className="flex items-center gap-3 max-w-[200px]">
              <FormattedNumberInput
                value={(currentState.inputs.estimatedWrvuL2 as number) || 0}
                onChange={(v) => setDomainInput('estimatedWrvuL2', Math.max(0, v))}
                placeholder="e.g. 0.07"
                className="w-full h-11 bg-white border-[#E5E7EB] rounded-xl text-base"
                data-testid="input-estimated-wrvu-l2"
                step={0.01}
              />
              <span className="text-sm text-[#888888] flex-shrink-0">wRVU / enc</span>
            </div>
            {(() => {
              const wrvu = (currentState.inputs.estimatedWrvuL2 as number) || 0;
              if (wrvu <= 0 || documentedEncounters <= 0) return null;
              const cf = (inputs.conversionFactor as number) || 33;
              const val = Math.round(documentedEncounters * wrvu * cf);
              return (
                <div className="mt-2 mb-4 flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#EA2C00]">{formatDollar(val)} / yr</span>
                  <span className="text-xs text-[#BBBBBB]">· {documentedEncounters.toLocaleString()} enc × {wrvu} wRVU × ${cf}/wRVU</span>
                </div>
              );
            })()}
            {((currentState.inputs.estimatedWrvuL2 as number) || 0) > 0 && (
              <div>
                <p className="text-xs font-medium text-black mb-2">How confident are you in this figure?</p>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'directional', label: 'Directional — we\'re observing this but haven\'t run the numbers' },
                    { id: 'partial', label: 'Partial — based on a subset of providers or limited data' },
                  ].map((opt) => (
                    <button key={opt.id} type="button" onClick={() => setDomainInput('l2Confidence', opt.id)}
                      className={`rounded-lg p-3 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${(currentState.inputs.l2Confidence as string) === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                      data-testid={`radio-l2-confidence-${opt.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${(currentState.inputs.l2Confidence as string) === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                        <span>{opt.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
                {feedback?.hasValue && feedback.value && (
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-base font-bold text-[#EA2C00]">{formatDollar(feedback.value)}</span>
                    <span className="text-xs text-[#AAAAAA]">/ yr directional estimate</span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      );
    }

    if (level === 3) {
      const metricType = currentState.inputs.revenueMetricType as string | undefined;
      const analysisCompleted = (currentState.inputs.revenueAnalysisCompleted as string) || '';
      return (
        <div className="flex flex-col gap-5">

          {/* Gate: has a revenue impact analysis been completed? */}
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
              Has a revenue impact analysis been completed?
            </label>
            <p className="text-xs text-[#888888] mb-3">
              This is the line between Level 2 and Level 3 — a confirmed number from your own data, not a directional trend.
            </p>
            <div className="flex flex-col gap-2">
              {[
                { id: 'yes',      label: 'Yes — we have a completed revenue impact analysis' },
                { id: 'not_yet',  label: 'Not yet — we\'re observing trends but haven\'t completed an analysis' },
              ].map((opt) => (
                <button key={opt.id} type="button" onClick={() => setDomainInput('revenueAnalysisCompleted', opt.id)}
                  className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${analysisCompleted === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                  data-testid={`radio-revenue-analysis-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${analysisCompleted === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Redirect if not completed */}
          {analysisCompleted === 'not_yet' && (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-4 py-3">
              <p className="text-sm text-[#525252] leading-relaxed">
                If you're seeing directional movement in coding or collections but haven't completed an impact analysis, <strong>Level 2 — Revenue Signals Visible</strong> is the right fit. Come back to Level 3 once the analysis is done.
              </p>
            </div>
          )}

          {/* Measurement blocks — only shown once analysis is confirmed */}
          {analysisCompleted === 'yes' && (
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
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <MeasurementBlock
                  hint={`wRVU change per encounter your before/after analysis produced. Industry benchmark: 0.05–0.15 wRVU/encounter.`}
                  liveResult={feedback?.hasValue && feedback.value ? formatDollar(feedback.value) : null}
                >
                  <FormattedNumberInput
                    value={(currentState.inputs.measuredWrvuDelta as number) || 0}
                    onChange={(v) => setDomainInput('measuredWrvuDelta', Math.max(0, v))}
                    placeholder="e.g. 0.08"
                    className="w-full h-12 bg-white border-[#E5E7EB]"
                    data-testid="input-wrvu-delta"
                    step={0.01}
                  />
                  <p className="text-xs text-[#AAAAAA] mt-2 italic">
                    Using ${(inputs.conversionFactor as number) || 33}/wRVU conversion factor.
                  </p>
                  <div className="mt-3 flex gap-2">
                    {[{ id: 'increase', label: '↑ Improved' }, { id: 'decrease', label: '↓ Declined' }].map((opt) => (
                      <button key={opt.id} type="button" onClick={() => setDomainInput('revenueMetricDirection', opt.id)}
                        className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${(currentState.inputs.revenueMetricDirection as string) === opt.id ? opt.id === 'increase' ? 'bg-[#EA2C00] text-white font-medium' : 'bg-[#525252] text-white font-medium' : 'bg-[#F0EFED] text-[#525252] hover:bg-[#E5E3E0]'}`}
                        data-testid={`pill-direction-${opt.id}`}
                      >{opt.label}</button>
                    ))}
                  </div>
                </MeasurementBlock>
              </motion.div>
            )}

            {metricType === 'collections' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <MeasurementBlock
                  hint="Collections change per encounter your analysis found. Benchmark: $3–$10/encounter improvement from E&M uplift and denial reduction."
                  liveResult={feedback?.hasValue && feedback.value ? formatDollar(feedback.value) : null}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#888888]">$</span>
                    <FormattedNumberInput
                      value={(currentState.inputs.measuredCollectionsDelta as number) || 0}
                      onChange={(v) => setDomainInput('measuredCollectionsDelta', Math.max(0, v))}
                      placeholder="e.g. 5"
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-collections-delta"
                    />
                  </div>
                  <div className="mt-3 flex gap-2">
                    {[{ id: 'increase', label: '↑ Improved' }, { id: 'decrease', label: '↓ Declined' }].map((opt) => (
                      <button key={opt.id} type="button" onClick={() => setDomainInput('revenueMetricDirection', opt.id)}
                        className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${(currentState.inputs.revenueMetricDirection as string) === opt.id ? opt.id === 'increase' ? 'bg-[#EA2C00] text-white font-medium' : 'bg-[#525252] text-white font-medium' : 'bg-[#F0EFED] text-[#525252] hover:bg-[#E5E3E0]'}`}
                        data-testid={`pill-direction-${opt.id}`}
                      >{opt.label}</button>
                    ))}
                  </div>
                </MeasurementBlock>
              </motion.div>
            )}

            {metricType === 'denial_rate' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <MeasurementBlock
                  hint="Percentage point change in documentation-related denial rate. Industry average is 3–5%. A 1–2 point improvement is significant."
                  liveResult={feedback?.hasValue && feedback.value ? formatDollar(feedback.value) : null}
                >
                  <div className="flex items-center gap-2">
                    <FormattedNumberInput
                      value={(currentState.inputs.measuredDenialReduction as number) || 0}
                      onChange={(v) => setDomainInput('measuredDenialReduction', Math.min(100, Math.max(0, v)))}
                      placeholder="e.g. 2"
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-denial-reduction"
                      step={0.1}
                    />
                    <span className="text-sm text-[#888888] flex-shrink-0">pp</span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {[{ id: 'decrease', label: '↓ Improved' }, { id: 'increase', label: '↑ Worsened' }].map((opt) => (
                      <button key={opt.id} type="button" onClick={() => setDomainInput('revenueMetricDirection', opt.id)}
                        className={`px-4 py-2 rounded-full text-sm transition-all cursor-pointer ${(currentState.inputs.revenueMetricDirection as string) === opt.id ? opt.id === 'decrease' ? 'bg-[#EA2C00] text-white font-medium' : 'bg-[#525252] text-white font-medium' : 'bg-[#F0EFED] text-[#525252] hover:bg-[#E5E3E0]'}`}
                        data-testid={`pill-direction-${opt.id}`}
                      >{opt.label}</button>
                    ))}
                  </div>
                  {(currentState.inputs.measuredDenialReduction as number) > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#E8E3DC]">
                      <p className="text-xs text-[#AAAAAA] mb-3" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                        Monthly dollar value of documentation-related denials ($) — this is the total dollar amount denied per month due to documentation issues, not the number of denied claims. Your revenue cycle team tracks this figure.
                      </p>
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
                      <div className="flex items-center gap-2.5 mt-3">
                        <Checkbox id="no-denial-volume" checked={currentState.inputs.noDenialVolume === 'true'}
                          onCheckedChange={(checked) => setDomainInput('noDenialVolume', checked ? 'true' : 'false')}
                          data-testid="checkbox-no-denial-volume"
                        />
                        <label htmlFor="no-denial-volume" className="text-sm text-[#525252] cursor-pointer select-none">Don't have this figure yet</label>
                      </div>
                    </div>
                  )}
                </MeasurementBlock>
              </motion.div>
            )}

            {metricType === 'hcc_capture' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <MeasurementBlock
                  hint="Percentage point improvement in HCC capture rate. Benchmark: 2–8% in Year 1 of ambient deployment. Your VBC or risk adjustment team will have this figure."
                  liveResult={feedback?.hasValue && feedback.value ? formatDollar(feedback.value) : null}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <FormattedNumberInput
                      value={(currentState.inputs.measuredHccImprovement as number) || 0}
                      onChange={(v) => setDomainInput('measuredHccImprovement', Math.min(100, Math.max(0, v)))}
                      placeholder="e.g. 4"
                      className="w-full h-12 bg-white border-[#E5E7EB]"
                      data-testid="input-hcc-improvement"
                      step={0.1}
                    />
                    <span className="text-sm text-[#888888] flex-shrink-0">pp improvement</span>
                  </div>
                  {((currentState.inputs.measuredHccImprovement as number) || 0) > 0 && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-medium text-black mb-1">
                          Medicare Advantage / VBC lives
                        </label>
                        <p className="text-xs text-[#AAAAAA] mb-2">
                          Your total attributed MA or value-based care population. Used to calculate dollar impact from RAF score improvement.
                        </p>
                        <FormattedNumberInput
                          value={(currentState.inputs.maLivesRevenue as number) || 0}
                          onChange={(v) => setDomainInput('maLivesRevenue', Math.max(0, v))}
                          placeholder="e.g. 5000"
                          className="w-full h-11 bg-white border-[#E5E7EB]"
                          data-testid="input-ma-lives-revenue"
                        />
                      </div>
                      {((currentState.inputs.maLivesRevenue as number) || 0) > 0 && (
                        <div>
                          <label className="block text-xs font-medium text-black mb-1">
                            Average annual payment per member <span className="text-[#888888] font-normal">(default $13,000)</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#888888]">$</span>
                            <FormattedNumberInput
                              value={(currentState.inputs.avgAnnualPaymentRevenue as number) || 13000}
                              onChange={(v) => setDomainInput('avgAnnualPaymentRevenue', Math.max(0, v))}
                              placeholder="13000"
                              className="w-full h-11 bg-white border-[#E5E7EB]"
                              data-testid="input-avg-payment-revenue"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </MeasurementBlock>
              </motion.div>
            )}
          </AnimatePresence>


          </div>
          )}

        </div>
      );
    }

    const revenueLeadershipAlignment = (currentState.inputs.revenueLeadershipAlignment as string) || '';

    return (
      <div className="flex flex-col gap-5">

        {/* 1. Governance — ownership and alignment */}
        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
            How aligned are revenue cycle, CDI, and clinical leadership around documentation-driven revenue?
          </label>
          <div className="flex flex-col gap-2 mt-2">
            {[
              { id: 'aligned',  label: 'Formally aligned — named owner, shared reporting, and executive visibility' },
              { id: 'partial',  label: 'Partially aligned — CDI or rev cycle strategy exists but not fully connected to clinical leadership' },
              { id: 'siloed',   label: 'Still siloed — revenue cycle and clinical are operating separately' },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => setDomainInput('revenueLeadershipAlignment', opt.id)}
                className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${revenueLeadershipAlignment === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                data-testid={`radio-revenue-alignment-${opt.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${revenueLeadershipAlignment === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                  <span>{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Strategic integrations */}
        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-3">
            How is documentation quality being used strategically in revenue decisions?
          </label>
          <div className="flex flex-col gap-2.5">
            {REVENUE_INTEGRATIONS.map((item, i) => {
              const checked = isChecked('revenueIntegrations', i);
              return (
                <label
                  key={i}
                  htmlFor={`revenue-integration-${i}`}
                  className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                    checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'
                  }`}
                >
                  <Checkbox
                    id={`revenue-integration-${i}`}
                    checked={checked}
                    onCheckedChange={() => toggleCheckboxItem('revenueIntegrations', i)}
                    data-testid={`checkbox-revenue-integration-${i}`}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-[#1A1A1A] select-none leading-snug">{item}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* 3. Recognized revenue — confirmed figure */}
        <MeasurementBlock
          hint="Annual revenue your organization formally attributes to documentation improvements — a number your finance and revenue cycle teams would stand behind."
          liveResult={feedback?.hasValue && feedback.value && currentState.inputs.noConfirmedRevenue !== 'true' ? formatDollar(feedback.value) : null}
        >
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
              onCheckedChange={(checked) => setDomainInput('noConfirmedRevenue', checked ? 'true' : 'false')}
              data-testid="checkbox-no-confirmed-revenue"
            />
            <label htmlFor="no-confirmed-revenue" className="text-sm text-[#525252] cursor-pointer select-none">
              Don't have a confirmed number yet
            </label>
          </div>
          {currentState.inputs.noConfirmedRevenue === 'true' && (
            <p className="text-xs text-[#888888] italic mt-3 leading-relaxed bg-[#F5F0EB] p-3 rounded-lg">
              Benchmark: {providers > 0 ? `${providers.toLocaleString()} providers × $2K–$6K = ${formatDollar(providers * 2000)}–${formatDollar(providers * 6000)}/yr` : '$2K–$6K per provider/year'} in coding and denial impact. Source: AMA/MGMA coding benchmarks.
            </p>
          )}
        </MeasurementBlock>

      </div>
    );
  };

  const renderWorkforceInputs = (levelOverride?: ActivationLevel) => {
    const level = levelOverride ?? currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      const WORKFORCE_L1_SIGNALS = [
        'Providers mentioning they\'re finishing notes before leaving the building',
        'After-hours documentation time appears visibly reduced',
        'Providers reporting more time for patients, family, or themselves',
        'Positive feedback in huddles or rounds about documentation feeling easier',
        'Fewer documentation-burden complaints in engagement surveys or informal feedback',
        'Recruiting conversations noting the documentation experience as a differentiator',
      ];
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-3">
              What signs of provider relief have you observed since deployment?
            </label>
            <div className="flex flex-col gap-2.5">
              {WORKFORCE_L1_SIGNALS.map((signal, i) => {
                const checked = isChecked('workforceSignalsL1', i);
                return (
                  <label key={i} htmlFor={`workforce-signal-${i}`}
                    className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'}`}
                  >
                    <Checkbox id={`workforce-signal-${i}`} checked={checked} onCheckedChange={() => toggleCheckboxItem('workforceSignalsL1', i)} data-testid={`checkbox-workforce-signal-${i}`} className="mt-0.5" />
                    <span className="text-sm text-[#1A1A1A] select-none leading-snug">{signal}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {providers > 0 && (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-4 py-3">
              <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                <span className="text-lg font-bold text-[#1A1A1A]">
                  {Math.round(providers * 15 * 230 / 60).toLocaleString()} hrs / yr
                </span>
                <span className="text-xs text-[#888888]">estimated time returned</span>
              </div>
              <p className="text-xs text-[#AAAAAA] leading-relaxed">
                {providers.toLocaleString()} providers × 15 min/day × 230 clinical days · MGMA benchmark: 10–20 min/provider/day — Abridge customers typically see 15–20 min
              </p>
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
            <label className="block text-sm font-semibold text-[#EA2C00] mb-2">
              Which behavioral changes are you seeing as a consistent pattern across providers?
            </label>
            <div className="flex flex-col gap-2">
              {BEHAVIORAL_CHANGES.map((change, i) => {
                const checked = isChecked('observedBehaviors', i);
                return (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3.5 sm:p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'
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
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-3">
              Is this happening intentionally or organically?
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'yes',        label: 'Intentional — HR or operations is actively monitoring provider behavior changes' },
                { id: 'think_so',   label: 'Discussed — leadership is aware but there\'s no formal tracking yet' },
                { id: 'not_clearly',label: 'Organic — providers or managers are mentioning it, nothing coordinated' },
              ].map((opt) => (
                <button key={opt.id} type="button" onClick={() => setDomainInput('behaviorVisibility', opt.id)}
                  className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${(currentState.inputs.behaviorVisibility as string) === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                  data-testid={`radio-behavior-visibility-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${(currentState.inputs.behaviorVisibility as string) === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Average after-hours documentation time reduced per provider per week <span className="text-[#888888] font-normal">(optional)</span>
            </label>
            <p className="text-xs text-[#888888] mb-3">
              If providers are completing notes earlier and reclaiming time outside clinic hours, enter the average weekly reduction. Used to calculate total after-hours hours returned annually.
            </p>
            <div className="flex items-center gap-3 max-w-[220px]">
              <FormattedNumberInput
                value={(currentState.inputs.afterHoursReduction as number) || 0}
                onChange={(v) => setDomainInput('afterHoursReduction', Math.max(0, v))}
                placeholder="e.g. 2"
                className="w-full h-11 bg-white border-[#E5E7EB] rounded-xl text-base"
                data-testid="input-after-hours-reduction"
                step={0.5}
              />
              <span className="text-sm text-[#888888] flex-shrink-0">hrs/wk</span>
            </div>
            {(() => {
              const h = (currentState.inputs.afterHoursReduction as number) || 0;
              if (h <= 0 || providers <= 0) return null;
              const annual = Math.round(h * providers * 50);
              return (
                <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#EA2C00]">{annual.toLocaleString()} hrs / yr</span>
                  <span className="text-xs text-[#BBBBBB]">· {providers} providers × {h} hrs/wk × 50 wks</span>
                </div>
              );
            })()}
          </div>
        </div>
      );
    }

    if (level === 3) {
      const RETENTION_SIGNALS = [
        'Turnover rate has measurably changed since deployment',
        'Agency or locum spend has decreased since deployment',
        'Time-to-fill for open positions has improved',
        'Exit interview feedback has shifted — documentation burden mentioned less',
        'Recruitment acceptance rates have improved',
      ];
      const retentionFormalReview = (currentState.inputs.retentionFormalReview as string) || '';
      return (
        <div className="flex flex-col gap-5">
          <p className="text-xs text-[#888888] leading-relaxed bg-[#F5F0EB] p-3 rounded-lg">
            Retention value uses AMGA 2023 replacement cost as default ($350K blended average). Ranges by specialty: primary care $250–300K · medical specialists $350–450K · surgical $500–700K. Enter your organization's actual figure in the calculation to override.
          </p>

          {/* Gate: has a retention impact analysis been completed? */}
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
              Has a workforce retention impact analysis been completed?
            </label>
            <p className="text-xs text-[#888888] mb-3">
              This is the line between Level 2 and Level 3 — a confirmed change in retention metrics, not just behavioral observations.
            </p>
            <div className="flex flex-col gap-2">
              {[
                { id: 'yes',      label: 'Yes — we have confirmed retention data we can attribute to ambient' },
                { id: 'not_yet',  label: "Not yet — we're seeing behavioral signals but haven't confirmed retention impact" },
              ].map((opt) => (
                <button key={opt.id} type="button" onClick={() => setDomainInput('retentionFormalReview', opt.id)}
                  className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${retentionFormalReview === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                  data-testid={`radio-retention-review-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${retentionFormalReview === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Redirect if not completed */}
          {retentionFormalReview === 'not_yet' && (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-4 py-3">
              <p className="text-sm text-[#525252] leading-relaxed">
                If you're seeing behavioral changes but haven't yet confirmed retention impact, <strong>Level 2 — Behavioral Signals Visible</strong> is the right fit. Come back to Level 3 once the analysis is done.
              </p>
            </div>
          )}

          {/* Rest of L3 questions — only shown once retention analysis is confirmed */}
          {retentionFormalReview === 'yes' && (
          <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              Which retention outcomes have you confirmed since deployment?
            </label>
            <div className="flex flex-col gap-2.5">
              {RETENTION_SIGNALS.map((signal, i) => {
                const checked = isChecked('retentionSignals', i);
                return (
                  <label key={i}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'}`}
                    data-testid={`checkbox-retention-signal-${i}`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleCheckboxItem('retentionSignals', i)} className="mt-0.5" />
                    <span className="text-sm text-black">{signal}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Physician turnover rate before deployment
              </label>
              <p className="text-xs text-[#888888] mb-3">
                Annual voluntary turnover rate (%) for physicians before ambient deployment. National average is typically 6–10%. Your HR team will have this figure.
              </p>
              <div className="flex items-center gap-3 max-w-[200px]">
                <FormattedNumberInput
                  value={(currentState.inputs.beforeTurnoverRate as number) || 0}
                  onChange={(v) => setDomainInput('beforeTurnoverRate', Math.max(0, Math.min(100, v)))}
                  placeholder="e.g. 18"
                  className="w-full h-11 bg-white border-[#E5E7EB] rounded-xl text-base"
                  data-testid="input-before-turnover-rate"
                  step={0.1}
                />
                <span className="text-sm text-[#888888] flex-shrink-0">% before</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Physician turnover rate after deployment
              </label>
              <p className="text-xs text-[#888888] mb-3">
                Current or most recent annual turnover rate (%). Even a 1–2 percentage point improvement is significant — at $350K replacement cost, 1 provider retained = $350K.
              </p>
              <div className="flex items-center gap-3 max-w-[200px]">
                <FormattedNumberInput
                  value={(currentState.inputs.afterTurnoverRate as number) || 0}
                  onChange={(v) => setDomainInput('afterTurnoverRate', Math.max(0, Math.min(100, v)))}
                  placeholder="e.g. 15"
                  className="w-full h-11 bg-white border-[#E5E7EB] rounded-xl text-base"
                  data-testid="input-after-turnover-rate"
                  step={0.1}
                />
                <span className="text-sm text-[#888888] flex-shrink-0">% after</span>
              </div>
            </div>
            {((currentState.inputs.beforeTurnoverRate as number) > 0 || (currentState.inputs.afterTurnoverRate as number) > 0) && (
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Physician replacement cost <span className="text-[#888888] font-normal">(default $350,000)</span>
                </label>
                <p className="text-xs text-[#888888] mb-3">
                  AMGA 2023 blended average. Ranges by specialty: primary care $250–300K · medical specialists $350–450K · surgical $500–700K.
                </p>
                <div className="flex items-center gap-2 max-w-[200px]">
                  <span className="text-sm text-[#888888]">$</span>
                  <FormattedNumberInput
                    value={(currentState.inputs.replacementCost as number) || 350000}
                    onChange={(v) => setDomainInput('replacementCost', Math.max(0, v))}
                    placeholder="350000"
                    className="w-full h-11 bg-white border-[#E5E7EB] rounded-xl text-base"
                    data-testid="input-replacement-cost"
                  />
                </div>
              </div>
            )}
            {(() => {
              const before = (currentState.inputs.beforeTurnoverRate as number) || 0;
              const after = (currentState.inputs.afterTurnoverRate as number) || 0;
              const cost = (currentState.inputs.replacementCost as number) || 350000;
              const delta = before - after;
              if (delta <= 0 || providers <= 0) return null;
              const retained = providers * delta / 100;
              const val = Math.round(retained * cost);
              return (
                <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#EA2C00]">{formatDollar(val)} / yr</span>
                  <span className="text-xs text-[#BBBBBB]">· {retained.toFixed(1)} providers retained × {formatDollar(cost)}</span>
                </div>
              );
            })()}
          </div>
          </div>
          )}
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
      'Agency or locum reliance decreased',
      'Time-to-fill for positions decreased',
      'Provider satisfaction scores improved',
      'Burnout scores improved (Maslach, Mini-Z, or equivalent)',
      'Recruitment acceptance rates improved',
    ];
    const strategyCsv = (currentState.inputs.workforceStrategies as string) || '';
    const strategySet = new Set(strategyCsv.split(',').filter(Boolean));
    const outcomesStatus = (currentState.inputs.workforceOutcomesStatus as string) || '';
    const outcomesCsv = (currentState.inputs.workforceOutcomes as string) || '';
    const outcomeSet = new Set(outcomesCsv.split(',').filter(Boolean));
    const workforceLeadershipLevel = (currentState.inputs.workforceLeadershipLevel as string) || '';

    return (
      <div className="flex flex-col gap-5">

        {/* 1. Governance — leadership elevation */}
        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
            How elevated is provider experience data in your organization's leadership structure?
          </label>
          <div className="flex flex-col gap-2 mt-2">
            {[
              { id: 'board_level',      label: 'Board or executive committee — provider experience metrics are part of board reporting' },
              { id: 'executive_only',   label: 'Senior leadership level — executive ownership, not yet at the board' },
              { id: 'operational',      label: 'Operational level — tracked by HR or ops, not yet elevated to executive strategy' },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => setDomainInput('workforceLeadershipLevel', opt.id)}
                className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${workforceLeadershipLevel === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                data-testid={`radio-workforce-leadership-${opt.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${workforceLeadershipLevel === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                  <span>{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Strategic integrations */}
        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-2">
            Where is documentation burden data informing workforce strategy?
          </label>
          <div className="flex flex-col gap-2.5">
            {WORKFORCE_STRATEGIES.map((strategy, i) => {
              const checked = strategySet.has(String(i));
              return (
                <label
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'}`}
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
          <label className="block text-sm font-semibold text-[#EA2C00] mb-2">
            Which workforce outcomes has your organization formally attributed to ambient?
          </label>
          <div className="flex flex-col gap-2.5">
            {WORKFORCE_OUTCOMES.map((outcome, i) => {
              const checked = outcomeSet.has(String(i));
              return (
                <label
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'}`}
                  data-testid={`checkbox-workforce-outcome-${i}`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => { toggleCheckboxItem('workforceOutcomes', i); setDomainInput('workforceOutcomesStatus', 'yes'); }}
                  />
                  <span className="text-sm text-black">{outcome}</span>
                </label>
              );
            })}
          </div>
        </div>

        {outcomeSet.has('1') && (
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
              Average monthly reduction in agency or locum costs
            </label>
            <p className="text-xs text-[#888888] mb-3">Enter your monthly savings from reduced agency/locum spend. Used to calculate annual financial impact.</p>
            <div className="flex items-center gap-2 max-w-[280px]">
              <span className="text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={(currentState.inputs.agencyReduction as number) || 0}
                onChange={(v) => setDomainInput('agencyReduction', Math.max(0, v))}
                placeholder="e.g. 15000"
                className="w-full h-11 bg-white border-[#E5E7EB]"
                data-testid="input-agency-reduction"
              />
              <span className="text-sm text-[#888888] flex-shrink-0">/month</span>
            </div>
          </div>
        )}

        {outcomeSet.has('2') && (
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
              Average monthly savings from faster time-to-fill
            </label>
            <p className="text-xs text-[#888888] mb-3">Estimate the monthly cost savings from positions filling faster — reduced locum coverage, overtime, or productivity drag.</p>
            <div className="flex items-center gap-2 max-w-[280px]">
              <span className="text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={(currentState.inputs.timeFillReduction as number) || 0}
                onChange={(v) => setDomainInput('timeFillReduction', Math.max(0, v))}
                placeholder="e.g. 8000"
                className="w-full h-11 bg-white border-[#E5E7EB]"
                data-testid="input-time-fill-reduction"
              />
              <span className="text-sm text-[#888888] flex-shrink-0">/month</span>
            </div>
          </div>
        )}

      </div>
    );
  };

  const MONITORING_OPTIONS = [
    { id: 'spot_checks', label: 'Spot checks and informal review' },
    { id: 'systematic', label: 'Structured audits or dashboards' },
    { id: 'realtime', label: 'Real-time dashboard or automated quality reporting' },
  ];

  const renderRiskInputs = (levelOverride?: ActivationLevel) => {
    const level = levelOverride ?? currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      const QUALITY_IMPROVEMENTS = [
        'Note completeness has improved — history, exam, assessment, and plan all present',
        'Diagnostic specificity is sharper — more precise ICD-10 coding',
        'Clinical detail is richer — findings, reasoning, and context more thoroughly captured',
        'Notes are completed at point of care, not hours later',
        'Provider attestation and addendum rates have dropped',
        'Coder or CDI queries to clinical staff have decreased',
      ];
      const anyChecked = QUALITY_IMPROVEMENTS.some((_, i) => isChecked('qualityImprovements', i));
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              Which documentation quality improvements have you observed?
            </label>
            <div className="flex flex-col gap-2.5">
              {QUALITY_IMPROVEMENTS.map((item, i) => {
                const checked = isChecked('qualityImprovements', i);
                return (
                  <label
                    key={i}
                    htmlFor={`quality-improvement-${i}`}
                    className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'
                    }`}
                  >
                    <Checkbox
                      id={`quality-improvement-${i}`}
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('qualityImprovements', i)}
                      data-testid={`checkbox-quality-improvement-${i}`}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-[#1A1A1A] select-none leading-snug">{item}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {providers > 0 && (
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F7F5] px-4 py-3">
              <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                <span className="text-lg font-bold text-[#1A1A1A]">
                  {formatDollar(providers * 800)}–{formatDollar(providers * 1500)} / yr
                </span>
                <span className="text-xs text-[#888888]">directional CDI opportunity</span>
              </div>
              <p className="text-xs text-[#AAAAAA] leading-relaxed">
                {providers.toLocaleString()} providers × $800–$1,500 · Based on industry CDI attribution rates for documentation specificity improvement — not yet confirmed for this deployment.
              </p>
            </div>
          )}
        </div>
      );
    }

    if (level === 2) {
      const approach = currentState.inputs.monitoringApproach as string || '';
      const DOWNSTREAM_SIGNALS = [
        'CDI specialist query volume has decreased — fewer improvement requests from CDI team to clinical staff',
        'Documentation specificity has improved — diagnoses and conditions described with greater clinical precision',
        'Quality measure documentation gaps are closing faster',
        'Chart completion turnaround time has improved',
        'Coder clarification requests to clinical staff have decreased — notes require less follow-up for accurate coding',
        'Chronic condition documentation is more complete — conditions captured at point of care that were previously missed',
        'Quality audit scores are improving',
      ];
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              Which downstream changes have you observed since deploying ambient documentation?
            </label>
            <div className="flex flex-col gap-2.5">
              {DOWNSTREAM_SIGNALS.map((signal, i) => {
                const checked = isChecked('downstreamSignals', i);
                return (
                  <label
                    key={i}
                    htmlFor={`downstream-signal-${i}`}
                    className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'
                    }`}
                  >
                    <Checkbox
                      id={`downstream-signal-${i}`}
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('downstreamSignals', i)}
                      data-testid={`checkbox-downstream-signal-${i}`}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-[#1A1A1A] select-none leading-snug">{signal}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-3">
              Is this happening intentionally or organically?
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'directed',  label: 'Intentional — CDI, coding, or quality teams are actively tracking the downstream connection' },
                { id: 'discussed', label: 'Discussed — the connection has been noted but no one formally owns the monitoring' },
                { id: 'organic',   label: 'Organic — downstream teams noticed it independently, no coordinated approach yet' },
              ].map((opt) => (
                <button key={opt.id} type="button" onClick={() => setDomainInput('qualityIntentionality', opt.id)}
                  className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${(currentState.inputs.qualityIntentionality as string) === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${(currentState.inputs.qualityIntentionality as string) === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E8E3DC] pt-5">
            <label className="block text-sm font-medium text-black mb-3">
              How rigorously is documentation quality being monitored?
            </label>
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
                        className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                          checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'
                        }`}
                      >
                        <Checkbox
                          id={`quality-attr-${i}`}
                          checked={checked}
                          onCheckedChange={() => toggleCheckboxItem('qualityAttributes', i)}
                          data-testid={`checkbox-quality-${i}`}
                          className="mt-0.5"
                        />
                        <span className="text-sm text-[#1A1A1A] select-none leading-snug">
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
      const connectedWorkflowsCsv = (currentState.inputs.connectedWorkflows as string) || '';

      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#EA2C00] mb-2">
              Which downstream workflows have been connected to documentation quality?
            </label>
            <div className="flex flex-col gap-2.5">
              {DOWNSTREAM_WORKFLOWS.map((item, i) => {
                const checked = isChecked('connectedWorkflows', i);
                return (
                  <label
                    key={i}
                    htmlFor={`downstream-${i}`}
                    className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                      checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'
                    }`}
                  >
                    <Checkbox
                      id={`downstream-${i}`}
                      checked={checked}
                      onCheckedChange={() => toggleCheckboxItem('connectedWorkflows', i)}
                      data-testid={`checkbox-downstream-${i}`}
                      className="mt-0.5"
                    />
                    <span className="text-sm text-[#1A1A1A] select-none leading-snug">
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
                    { id: 'qualitative', label: 'Qualitative — visible improvements, nothing formally quantified yet', note: 'Reflects Emerging without a formal attribution statement below' },
                    { id: 'partial', label: 'Partially measured — some areas have data, others are anecdotal', note: null },
                    { id: 'measured', label: 'Measured — we have data and can quantify the impact', note: null },
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
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm text-[#525252]">{opt.label}</span>
                        {opt.note && (currentState.inputs.qualityMeasurementDepth as string) === opt.id && (
                          <span className="text-xs text-[#AAAAAA] italic">{opt.note}</span>
                        )}
                      </div>
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

          {/* Financial pathway calculators — shown when relevant workflows are checked */}
          {connectedWorkflowsCsv && (
            <div className="border-t border-[#E8E3DC] pt-5">
              <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-[2px] mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
                Financial pathway calculator
              </p>
              <p className="text-xs text-[#AAAAAA] mb-4 leading-relaxed" style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}>
                Optional — if you have underlying data for any of these pathways, enter it here to calculate a defensible figure. All inputs are optional and additive.
              </p>
              <div className="flex flex-col gap-5">

                {/* CDI pathway — shown if CDI workflow checked (index 0) */}
                {isChecked('connectedWorkflows', 0) && (
                  <div className="bg-[#F9F7F4] rounded-xl p-4">
                    <p className="text-xs font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wide">CDI Query Reduction</p>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-medium text-black mb-1">Monthly CDI queries before deployment</label>
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <FormattedNumberInput
                            value={(currentState.inputs.cdiQueriesBefore as number) || 0}
                            onChange={(v) => setDomainInput('cdiQueriesBefore', Math.max(0, v))}
                            placeholder="e.g. 50"
                            className="w-full h-10 bg-white border-[#E5E7EB]"
                            data-testid="input-cdi-queries-before"
                          />
                          <span className="text-xs text-[#888888] flex-shrink-0">queries/mo</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-black mb-1">Monthly CDI queries after deployment</label>
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <FormattedNumberInput
                            value={(currentState.inputs.cdiQueriesAfter as number) || 0}
                            onChange={(v) => setDomainInput('cdiQueriesAfter', Math.max(0, v))}
                            placeholder="e.g. 30"
                            className="w-full h-10 bg-white border-[#E5E7EB]"
                            data-testid="input-cdi-queries-after"
                          />
                          <span className="text-xs text-[#888888] flex-shrink-0">queries/mo</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-black mb-1">Cost per CDI query <span className="text-[#888888] font-normal">(default $100)</span></label>
                        <p className="text-xs text-[#AAAAAA] mb-1">Loaded cost including coder + CDI specialist time. Your CDI team will have this figure.</p>
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <span className="text-xs text-[#888888]">$</span>
                          <FormattedNumberInput
                            value={(currentState.inputs.cdiQueryCost as number) || 100}
                            onChange={(v) => setDomainInput('cdiQueryCost', Math.max(0, v))}
                            placeholder="100"
                            className="w-full h-10 bg-white border-[#E5E7EB]"
                            data-testid="input-cdi-query-cost"
                          />
                        </div>
                      </div>
                      {((currentState.inputs.cdiQueriesBefore as number) > 0 && (currentState.inputs.cdiQueriesAfter as number) >= 0) && (() => {
                        const before = (currentState.inputs.cdiQueriesBefore as number) || 0;
                        const after = (currentState.inputs.cdiQueriesAfter as number) || 0;
                        const cost = (currentState.inputs.cdiQueryCost as number) || 100;
                        const reduction = Math.max(0, before - after);
                        const annualSavings = Math.round(reduction * cost * 12);
                        return annualSavings > 0 ? (
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-base font-bold text-[#EA2C00]">{formatDollar(annualSavings)}</span>
                            <span className="text-xs text-[#AAAAAA]">/ yr CDI savings</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}

                {/* HCC pathway — shown if Risk adjustment workflow checked (index 5) */}
                {isChecked('connectedWorkflows', 5) && (
                  <div className="bg-[#F9F7F4] rounded-xl p-4">
                    <p className="text-xs font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wide">HCC / Risk Adjustment</p>
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-medium text-black mb-1">Medicare Advantage / VBC attributed lives</label>
                        <p className="text-xs text-[#AAAAAA] mb-1">Total MA or value-based care population. Your VBC or risk adjustment team will have this.</p>
                        <FormattedNumberInput
                          value={(currentState.inputs.maLives as number) || 0}
                          onChange={(v) => setDomainInput('maLives', Math.max(0, v))}
                          placeholder="e.g. 5000"
                          className="w-full h-10 bg-white border-[#E5E7EB]"
                          data-testid="input-ma-lives"
                        />
                      </div>
                      {((currentState.inputs.maLives as number) || 0) > 0 && (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">HCC capture rate improvement <span className="text-[#888888] font-normal">(percentage points)</span></label>
                            <p className="text-xs text-[#AAAAAA] mb-1">Benchmark: 2–8 pp improvement in Year 1. Your risk adjustment team will have this figure.</p>
                            <div className="flex items-center gap-2 max-w-[200px]">
                              <FormattedNumberInput
                                value={(currentState.inputs.hccImprovementPct as number) || 0}
                                onChange={(v) => setDomainInput('hccImprovementPct', Math.min(100, Math.max(0, v)))}
                                placeholder="e.g. 4"
                                className="w-full h-10 bg-white border-[#E5E7EB]"
                                data-testid="input-hcc-improvement-pct"
                                step={0.1}
                              />
                              <span className="text-xs text-[#888888] flex-shrink-0">pp</span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-black mb-1">Average annual payment per member <span className="text-[#888888] font-normal">(default $13,000)</span></label>
                            <div className="flex items-center gap-2 max-w-[200px]">
                              <span className="text-xs text-[#888888]">$</span>
                              <FormattedNumberInput
                                value={(currentState.inputs.avgAnnualPayment as number) || 13000}
                                onChange={(v) => setDomainInput('avgAnnualPayment', Math.max(0, v))}
                                placeholder="13000"
                                className="w-full h-10 bg-white border-[#E5E7EB]"
                                data-testid="input-avg-annual-payment"
                              />
                            </div>
                          </div>
                          {((currentState.inputs.hccImprovementPct as number) > 0) && (() => {
                            const lives = (currentState.inputs.maLives as number) || 0;
                            const payment = (currentState.inputs.avgAnnualPayment as number) || 13000;
                            const pct = (currentState.inputs.hccImprovementPct as number) || 0;
                            const hccValue = Math.round(lives * payment * (pct / 100));
                            return hccValue > 0 ? (
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-base font-bold text-[#EA2C00]">{formatDollar(hccValue)}</span>
                                <span className="text-xs text-[#AAAAAA]">/ yr HCC / risk-adjusted revenue</span>
                              </div>
                            ) : null;
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* MIPS / quality program pathway — shown if Quality measures workflow checked (index 2) */}
                {isChecked('connectedWorkflows', 2) && (
                  <div className="bg-[#F9F7F4] rounded-xl p-4">
                    <p className="text-xs font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wide">MIPS / Quality Program Value</p>
                    <div>
                      <label className="block text-xs font-medium text-black mb-1">Annual MIPS performance payment or penalty avoidance</label>
                      <p className="text-xs text-[#AAAAAA] mb-2">Your quality or compliance team will have this figure. Includes performance-based bonuses or avoided negative adjustments.</p>
                      <div className="flex items-center gap-2 max-w-[200px]">
                        <span className="text-xs text-[#888888]">$</span>
                        <FormattedNumberInput
                          value={(currentState.inputs.mipsValue as number) || 0}
                          onChange={(v) => setDomainInput('mipsValue', Math.max(0, v))}
                          placeholder=""
                          className="w-full h-10 bg-white border-[#E5E7EB]"
                          data-testid="input-mips-value"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-3">
              Has the financial impact of these documentation quality improvements been formally attributed — by finance, revenue cycle, or a quality program owner?
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'yes', label: 'Yes — there is a formal attribution or financial review in place' },
                { id: 'informal', label: 'Informally — we believe it\'s contributing but it\'s not formally quantified' },
                { id: 'no', label: 'Not yet — the connection hasn\'t been formally reviewed' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all active:scale-[0.99] ${
                    (currentState.inputs.downstreamFormalAttribution as string) === opt.id
                      ? 'border-[#EA2C00] bg-[#EA2C00]/5'
                      : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-downstream-attribution-${opt.id}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    (currentState.inputs.downstreamFormalAttribution as string) === opt.id ? 'border-[#EA2C00]' : 'border-[#D1D5DB]'
                  }`}>
                    {(currentState.inputs.downstreamFormalAttribution as string) === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[#EA2C00]" />}
                  </div>
                  <span className="text-sm text-[#525252]">{opt.label}</span>
                  <input type="radio" name="downstreamFormalAttribution" value={opt.id}
                    checked={(currentState.inputs.downstreamFormalAttribution as string) === opt.id}
                    onChange={() => setDomainInput('downstreamFormalAttribution', opt.id)} className="sr-only" />
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Annual value attributed to documentation quality improvements
            </label>
            <p className="text-xs text-[#888888] mb-3">
              Include CDI query reduction savings, HEDIS/MIPS performance payments, denial reduction, or any other formally attributed quality-driven financial impact. Leave blank if not yet quantified.
            </p>
            <div className="flex items-center gap-2 max-w-[280px]">
              <span className="text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={(currentState.inputs.qualityAttributedValue as number) || 0}
                onChange={(v) => setDomainInput('qualityAttributedValue', Math.max(0, v))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-quality-attributed-value"
                disabled={currentState.inputs.noQualityValue === 'true'}
              />
            </div>
            <div className="flex items-center gap-2.5 mt-3">
              <Checkbox
                id="no-quality-value"
                checked={currentState.inputs.noQualityValue === 'true'}
                onCheckedChange={(checked) => setDomainInput('noQualityValue', checked ? 'true' : 'false')}
                data-testid="checkbox-no-quality-value"
              />
              <label htmlFor="no-quality-value" className="text-sm text-[#525252] cursor-pointer select-none">
                Not yet quantified
              </label>
            </div>
          </div>
        </div>
      );
    }

    const executiveOwner = currentState.inputs.executiveOwner as string || '';
    const boardPresented = currentState.inputs.executiveBoardPresented as string || '';

    // Derive a single governance selection from the two underlying keys
    const docQualityGovernance =
      executiveOwner === 'yes' && boardPresented === 'yes' ? 'board_level' :
      executiveOwner === 'yes' && boardPresented === 'no'  ? 'owner_only' :
      executiveOwner === 'no' ? 'operational' : '';

    const handleDocQualityGovernance = (id: string) => {
      if (id === 'board_level') {
        setDomainInput('executiveOwner', 'yes');
        setDomainInput('executiveBoardPresented', 'yes');
      } else if (id === 'owner_only') {
        setDomainInput('executiveOwner', 'yes');
        setDomainInput('executiveBoardPresented', 'no');
      } else if (id === 'operational') {
        setDomainInput('executiveOwner', 'no');
        setDomainInput('executiveBoardPresented', 'no');
      }
    };

    return (
      <div className="flex flex-col gap-5">

        {/* 1. Governance — executive ownership and board visibility */}
        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
            How is documentation quality strategy owned and elevated in your organization?
          </label>
          <div className="flex flex-col gap-2 mt-2">
            {[
              { id: 'board_level',    label: 'Named executive owner — and documentation quality data has been at the board or executive committee' },
              { id: 'owner_only',     label: 'Named executive owner — but not yet elevated to the board' },
              { id: 'operational',    label: 'No named strategic owner yet — lives at the operational or department level' },
            ].map((opt) => (
              <button key={opt.id} type="button" onClick={() => handleDocQualityGovernance(opt.id)}
                className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${docQualityGovernance === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                data-testid={`radio-doc-quality-governance-${opt.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${docQualityGovernance === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                  <span>{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Strategic integrations */}
        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-2">
            Where is documentation quality embedded in your strategic programs?
          </label>
          <div className="flex flex-col gap-2.5">
            {STRATEGIC_INTEGRATIONS.map((item, i) => {
              const checked = isChecked('strategicIntegrations', i);
              return (
                <label
                  key={i}
                  htmlFor={`strategic-${i}`}
                  className={`flex items-start gap-3 rounded-lg border-2 px-3.5 py-3.5 cursor-pointer transition-all active:scale-[0.99] ${
                    checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[rgba(26,26,26,0.12)] bg-white hover:border-[rgba(26,26,26,0.25)]'
                  }`}
                >
                  <Checkbox
                    id={`strategic-${i}`}
                    checked={checked}
                    onCheckedChange={() => toggleCheckboxItem('strategicIntegrations', i)}
                    data-testid={`checkbox-strategic-${i}`}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-[#1A1A1A] select-none leading-snug">
                    {item}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
            Has documentation quality data been used in a value-based contract negotiation, risk corridor review, or payer performance report?
          </label>
          <div className="flex flex-col gap-2">
            {[
              { id: 'yes', label: 'Yes — documentation data has been used in a VBC or payer context' },
              { id: 'in_progress', label: 'In progress — this connection is being developed' },
              { id: 'no', label: 'Not yet' },
            ].map((opt) => {
              const val = (currentState.inputs.vbcContractUse as string) || '';
              return (
                <button key={opt.id} type="button" onClick={() => setDomainInput('vbcContractUse', opt.id)}
                  className={`rounded-lg p-3.5 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${val === opt.id ? 'bg-[#FFF5F2] border-2 border-[#EA2C00] text-[#1A1A1A] font-semibold' : 'bg-white border-2 border-[rgba(26,26,26,0.12)] text-[#1A1A1A] hover:border-[rgba(26,26,26,0.25)]'}`}
                  data-testid={`radio-vbc-contract-${opt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${val === opt.id ? 'border-[#EA2C00] bg-[#EA2C00]' : 'border-[#CCCCCC] bg-white'}`} />
                    <span>{opt.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#EA2C00] mb-1">
            Annual value attributed to documentation quality strategy
          </label>
          <p className="text-xs text-[#888888] mb-3">
            If your organization has formally attributed a dollar value to documentation quality programs — VBC performance, CDI savings, quality bonus payments, or penalty avoidance — enter it here.
          </p>
          <div className="flex items-center gap-2 max-w-[280px]">
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
              onCheckedChange={(checked) => setDomainInput('noConfirmedStrategicValue', checked ? 'true' : 'false')}
              data-testid="checkbox-no-confirmed-strategic-value"
            />
            <label htmlFor="no-confirmed-strategic-value" className="text-sm text-[#525252] cursor-pointer select-none">
              Not yet formally quantified
            </label>
          </div>
        </div>

      </div>
    );
  };

  const renderDomainInputs = (levelOverride?: ActivationLevel) => {
    switch (activeDomain) {
      case 'capacity': return renderCapacityInputs(levelOverride);
      case 'revenue': return renderRevenueInputs(levelOverride);
      case 'workforce': return renderWorkforceInputs(levelOverride);
      case 'risk': return renderRiskInputs(levelOverride);
    }
  };


  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>

      {/* ── DOMAIN HERO ── */}
      <motion.div
        className="bg-[#1A1A1A] rounded-2xl overflow-hidden mb-4"
        key={`hero-${activeDomain}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="px-6 sm:px-8 md:px-10 py-7 sm:py-9">

          {/* Counter + progress dots */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDomainBack}
                className="text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                aria-label="Back"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[9px] font-semibold uppercase tracking-[2px]" style={{ fontFamily: "'Manrope', sans-serif" }}>
                  Back
                </span>
              </button>
              <p
                className="text-[9px] font-semibold text-white/45 uppercase tracking-[3px]"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {String(activeIdx + 1).padStart(2, '0')} / 04
              </p>
            </div>
            <div className="flex items-center gap-2">
              {DOMAIN_ORDER.map((d) => {
                const isActive = d === activeDomain;
                const level = domainStates[d].activationLevel;
                return (
                  <button
                    key={d}
                    onClick={() => { setActiveDomain(d); setTeaserOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer flex-shrink-0"
                    style={{
                      background: isActive
                        ? 'rgba(255,255,255,1)'
                        : level !== null
                        ? 'rgba(234,44,0,0.14)'
                        : 'transparent',
                      border: isActive
                        ? 'none'
                        : level !== null
                        ? '1.5px solid rgba(234,44,0,0.50)'
                        : '1.5px solid rgba(255,255,255,0.16)',
                    }}
                    data-testid={`domain-label-${d}`}
                    title={DOMAIN_LABELS[d]}
                  >
                    {level !== null && !isActive ? (
                      <span
                        className="w-4 h-4 rounded-full bg-[#EA2C00] flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                        data-testid={`domain-dot-${d}`}
                      >
                        {level}
                      </span>
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-[#1A1A1A]" data-testid={`domain-dot-${d}`} />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20" data-testid={`domain-dot-${d}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Headline */}
          <h1
            className="font-abridge uppercase text-white leading-[1.04] mb-3"
            style={{ fontSize: 'clamp(2.2rem, 5vw, 3.8rem)' }}
            data-testid="text-domain-headline"
          >
            {config.headline}
          </h1>

          {/* Red rule */}
          <div className="w-10 h-[2px] bg-[#EA2C00] mb-3" />

          {/* Subheadline */}
          {config.subheadline && (
            <p
              className="text-white/70 leading-snug mb-5"
              style={{
                fontFamily: "'Manrope', sans-serif",
                fontWeight: 400,
                fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
              }}
              data-testid="text-domain-subheadline"
            >
              {config.subheadline}
            </p>
          )}

          {/* ── LEVEL CARDS or CONFIRMED BADGE ── */}
          {currentState.activationLevel ? (
            /* Confirmed badge + Continue action */
            <div className="flex flex-col gap-3">
              <div
                className="flex items-center gap-3 py-3 px-4 rounded-xl"
                style={{ background: 'rgba(234,44,0,0.08)', borderLeft: '3px solid #EA2C00' }}
              >
                <div className="w-6 h-6 rounded-full bg-[#EA2C00] flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[11px] uppercase tracking-[2px] mb-0.5"
                    style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, color: '#EA2C00' }}
                  >
                    Level {currentState.activationLevel} — Confirmed
                  </p>
                  <p
                    className="font-abridge uppercase text-white leading-tight"
                    style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.15rem)' }}
                  >
                    {config.cards[currentState.activationLevel - 1].label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetActivation}
                  className="text-[10px] text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
                  style={{ fontFamily: "'Manrope', sans-serif", background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            /* 4 level cards with intensity ramp */
            <div className="flex flex-col gap-2">
              {config.cards.map((card) => {
                const isSelected = selectedLevel === card.level;
                const BORDER_STYLES = [
                  { color: 'rgba(255,255,255,0.16)', width: '2px' },
                  { color: 'rgba(255,255,255,0.36)', width: '2px' },
                  { color: 'rgba(234,44,0,0.55)', width: '3px' },
                  { color: '#EA2C00', width: '3px' },
                ];
                const bs = BORDER_STYLES[card.level - 1];

                return (
                  <button
                    key={card.level}
                    type="button"
                    onClick={() => handleLevelSelect(card.level)}
                    className="w-full text-left flex items-start gap-3 py-3.5 pr-5 rounded-xl cursor-pointer transition-all duration-200 focus:outline-none"
                    style={{
                      paddingLeft: 0,
                      borderLeft: isSelected
                        ? '4px solid #EA2C00'
                        : `${bs.width} solid ${bs.color}`,
                      background: isSelected
                        ? 'rgba(255,255,255,0.13)'
                        : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {/* Level circle */}
                    <div
                      className="flex-shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
                      style={{
                        fontFamily: "'Manrope', sans-serif",
                        marginLeft: '16px',
                        background: isSelected ? '#EA2C00' : 'rgba(255,255,255,0.08)',
                        color: isSelected ? 'white' : 'rgba(255,255,255,0.42)',
                      }}
                    >
                      {card.level}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[11px] font-semibold uppercase tracking-[2px] mb-1"
                        style={{
                          fontFamily: "'Manrope', sans-serif",
                          color: isSelected ? '#EA2C00' : 'rgba(255,255,255,0.35)',
                        }}
                      >
                        Level {card.level}
                      </p>
                      <p
                        className="font-abridge uppercase leading-tight mb-1.5"
                        style={{ fontSize: 'clamp(0.95rem, 1.5vw, 1.15rem)', color: 'white' }}
                      >
                        {card.label}
                      </p>
                      <p
                        className="text-xs leading-relaxed"
                        style={{
                          fontFamily: "'Manrope', sans-serif",
                          fontWeight: 300,
                          color: 'rgba(255,255,255,0.60)',
                        }}
                      >
                        {card.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}


        </div>
      </motion.div>

      {/* ── INPUTS PANEL ── */}
      <div ref={inputsPanelRef} style={{ scrollMarginTop: '72px' }}>
          <div className="mb-8">
            <AnimatePresence mode="wait">
              {!currentState.activationLevel ? (
                /* ── Phase 1: Inputs for selected level ── */
                <motion.div
                  key={`picker-${activeDomain}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <AnimatePresence mode="wait">
                    {selectedLevel ? (
                      <motion.div
                        key={`inputs-${activeDomain}-${selectedLevel}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="pt-1"
                      >
                        <div className="mt-4 pt-6 border-t border-[#E0DBD5]">
                          {renderDomainInputs(selectedLevel)}
                          <div className="mt-6 pt-5 border-t border-[#E0DBD5] flex justify-end">
                            <button
                              type="button"
                              onClick={() => { setActivation(selectedLevel); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-full hover:bg-[#EA2C00] transition-colors duration-300 cursor-pointer border-none"
                              style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.3px', padding: '0.875rem 2rem' }}
                            >
                              Confirm — {config.cards[selectedLevel - 1].label}
                              <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                                <path d="M1 5L4.5 8.5L12 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="pt-4"
                      >
                        <p
                          className="text-sm text-[#BBBBBB]"
                          style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 300 }}
                        >
                          ↑ Select a level above to continue
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                /* ── Phase 2: Level confirmed ── */
                <motion.div
                  key={`confirmed-${activeDomain}-${currentState.activationLevel}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {/* Confirmed header */}
                  <div className="flex items-start gap-4 mb-7">
                    <div className="w-10 h-10 rounded-full bg-[#EA2C00] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8.5L6.5 12L13 5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[3px] mb-1"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                      >
                        Level {currentState.activationLevel} — Confirmed
                      </p>
                      <h3
                        className="font-abridge uppercase text-[#1A1A1A] leading-[1.04]"
                        style={{ fontSize: 'clamp(1.3rem, 2.5vw, 2rem)' }}
                      >
                        {config.cards[currentState.activationLevel - 1].label}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={resetActivation}
                      className="text-xs text-[#BBBBBB] hover:text-[#777777] transition-colors duration-200 flex-shrink-0 mt-2"
                      style={{ fontFamily: "'Manrope', sans-serif", background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Change
                    </button>
                  </div>

                  {/* Domain inputs */}
                  {feedback && feedback.headlineMetric && (
                    <p className="font-bold text-xl text-[#EA2C00] leading-none mb-4" data-testid="text-ladder-value">
                      {feedback.headlineMetric}
                    </p>
                  )}
                  {renderDomainInputs()}

                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* ── DOMAIN CLOSING BEAT ── */}
          <AnimatePresence>
            {currentState.activationLevel && feedback && feedback.hasValue && (
              <motion.div
                key={`closing-${activeDomain}-${currentState.activationLevel}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="bg-[#1A1A1A] rounded-xl p-5 sm:p-6 mb-6"
                data-testid={`domain-closing-beat-${activeDomain}`}
              >
                <p className="text-[11px] font-semibold text-white/60 uppercase tracking-[2px] mb-3">
                  What You've Mapped · {DOMAIN_LABELS[activeDomain]}
                </p>

                {(feedback.headlineMetric || (feedback.hasValue && feedback.value)) ? (
                  <p className="text-[#EA2C00] font-bold text-2xl leading-none mb-2" data-testid="closing-beat-value">
                    {feedback.headlineMetric || formatDollar(feedback.value!)}
                  </p>
                ) : null}

                <p className="text-white font-semibold text-sm leading-snug mb-3" data-testid="closing-beat-context">
                  {feedback.context}
                </p>

                {feedback.nextLevelTeaser && currentState.activationLevel < 4 && (
                  <div className="border-t border-white/[0.07] pt-3 mt-1">
                    <p className="text-[11px] font-semibold text-[#EA2C00]/80 uppercase tracking-[1.5px] mb-1">
                      Next Level Unlocks
                    </p>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {feedback.nextLevelTeaser}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {currentState.activationLevel && (
            <div className="pt-8">
              <button
                type="button"
                onClick={() => handleAdvance()}
                className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white rounded-full hover:bg-[#EA2C00] transition-colors duration-300 border-none cursor-pointer"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  letterSpacing: '0.3px',
                  padding: '1rem 2.25rem',
                }}
              >
                {DOMAIN_CTA[activeDomain]}
              </button>
            </div>
          )}
          <div className={STEP_FOOTER_SPACER_CLASS} />
      </div>
    </div>
  );
}
