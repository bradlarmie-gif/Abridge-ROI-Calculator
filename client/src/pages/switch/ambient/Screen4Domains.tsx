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

const OPERATIONAL_CONDITIONS: Record<Domain, string> = {
  capacity: 'when recovered FTE equivalent enters staffing decisions',
  revenue: 'when documentation quality becomes a revenue input',
  workforce: 'when turnover risk is structurally measured',
  risk: 'when structured data feeds quality reporting',
};

const NUMERAL_OPACITIES: Record<number, number> = { 1: 0.15, 2: 0.35, 3: 0.65, 4: 1 };
const TITLE_COLORS: Record<number, string> = { 1: '#999999', 2: '#666666', 3: '#333333', 4: '#000000' };
const DESC_COLORS: Record<number, string> = { 1: '#aaaaaa', 2: '#888888', 3: '#555555', 4: '#333333' };

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
  framingQuestions?: Record<number, string>;
  unlockTeasers?: Record<number, string>;
};

const DOMAIN_CONFIGS: Record<Domain, DomainConfig> = {
  capacity: {
    label: 'CAPACITY',
    headline: 'CAPACITY',
    subheadline: 'The question isn\'t whether ambient saves time. It\'s what your organization does with it.',
    reframe: 'Most health systems treat recovered time as a productivity footnote. Leading organizations treat it as deployable capacity — and that distinction is worth millions annually.',
    cards: [
      { level: 1, label: 'Documentation Recovery Established', description: 'You know what you\'re getting back.' },
      { level: 2, label: 'Recovery Quantified and Escalated', description: 'Leadership knows the number.' },
      { level: 3, label: 'Capacity Deployed Into Patient Access', description: 'The time has a destination.' },
      { level: 4, label: 'Workforce Architecture Impact', description: 'Ambient is in your hiring model.' },
    ],
    framingQuestions: {
      1: 'Ambient is deployed and time is being returned. How much — and is that number formally on record anywhere?',
      2: 'Has your organization formally quantified total recovered capacity and brought it to leadership with a recommended use?',
      3: 'Has your organization confirmed that recovered time is being used to expand patient access — through additional appointments, panel growth, or scheduling redesign?',
      4: 'Has your organization formally attributed workforce planning decisions to ambient-enabled capacity — FTEs not hired, locums reduced, or panels rebalanced?',
    },
    unlockTeasers: {
      2: 'Unlock: quantify and escalate to leadership',
      3: 'Unlock: deploy time into patient access',
      4: 'Unlock: connect to workforce planning',
    },
  },
  revenue: {
    label: 'REVENUE',
    headline: 'Better documentation produces better coding. Better coding produces better reimbursement. The question is whether your organization is connecting those dots.',
    reframe: 'Every encounter is coded. The opportunity is in whether it\'s coded at the specificity your documentation now supports — and whether your revenue cycle team is part of that conversation.',
    cards: [
      { level: 1, label: 'Revenue Cycle Hasn\'t Been Brought In Yet.', description: 'Ambient is deployed, but the revenue cycle team hasn\'t been formally engaged on what it means for coding accuracy or reimbursement.' },
      { level: 2, label: 'The Analysis Is Underway.', description: 'Your revenue cycle team is actively analyzing the connection between documentation quality and coding or reimbursement outcomes.' },
      { level: 3, label: 'The Impact Has Been Measured.', description: 'Your organization has before/after data that connects ambient documentation to a specific revenue outcome — a number leadership can work with.' },
      { level: 4, label: 'Documentation Quality Is Built Into Revenue Cycle Operations.', description: 'Documentation quality and revenue cycle operate as a connected system — monitored, attributed, and factored into operational planning.' },
    ],
    framingQuestions: {
      1: 'Has your revenue cycle team been formally engaged on what ambient documentation means for coding accuracy or reimbursement?',
      2: 'What is your revenue cycle team analyzing — and how far along is the investigation?',
      3: 'What did your organization measure — and what does your data show?',
      4: 'How is documentation quality formally integrated into your revenue cycle operations — and what has your organization attributed to it?',
    },
    unlockTeasers: {
      2: 'Unlock: begin revenue cycle analysis',
      3: 'Unlock: measure before/after impact',
      4: 'Unlock: integrate into operations',
    },
  },
  workforce: {
    label: 'WORKFORCE',
    headline: 'Documentation burden is a leading driver of physician burnout and turnover risk.',
    reframe: 'At $100K–$1M per physician departure, documentation burden isn\'t a satisfaction issue — it\'s a financial exposure.',
    cards: [
      { level: 1, label: 'Providers Report Less After-Hours Work. Not Measured Yet.', description: 'After-hours documentation burden exists, but no formal measurement of its impact on provider experience or retention has been done.' },
      { level: 2, label: 'Burden Reduction Measured and Validated.', description: 'In-clinic and after-hours time formally quantified; survey data captured.' },
      { level: 3, label: 'Retention Risk Calculated Against Burden Reduction.', description: 'Turnover exposure modeled; documentation burden is a named variable in retention strategy.' },
      { level: 4, label: 'Labor Spend Is Structurally Declining.', description: 'Agency and locum costs measurably reduced; workforce economics improving.' },
    ],
  },
  risk: {
    label: 'QUALITY',
    headline: 'Your notes are better. But is anything downstream actually changing?',
    reframe: 'Every AI initiative your organization wants in the next three years runs on one foundation — structured, complete documentation at scale.',
    cards: [
      { level: 1, label: 'Documentation Quality Improved. Exposure Still Invisible.', description: 'Notes are better; no system is translating that into financial or compliance value.' },
      { level: 2, label: 'Documentation Quality Is Being Monitored.', description: 'Completeness, specificity, and HCC capture are tracked; gaps are visible.' },
      { level: 3, label: 'Documentation Quality Is Closing Revenue and Compliance Gaps.', description: 'CDI, coding, quality reporting, and prior auth workflows are actively using improved documentation.' },
      { level: 4, label: 'Documentation Is a Governed Strategic Asset.', description: 'Payer contracts, value-based care programs, compliance governance, and quality strategy are all built on documentation quality as a formal input.' },
    ],
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

  const nextLevelFeedback = useMemo((): DomainFeedback | null => {
    if (!currentState.activationLevel || currentState.activationLevel >= 4) return null;
    const nextLevel = (currentState.activationLevel + 1) as ActivationLevel;
    const inp = currentState.inputs;
    switch (activeDomain) {
      case 'capacity': {
        const capacityInp = inp.timeSaved ? inp : { ...inp, timeSaved: inputs.timeSavedPerEncounter || 0 };
        return computeCapacityFeedback(nextLevel, capacityInp, providers, documentedEncounters, revenuePerVisit, providerRate);
      }
      case 'revenue': return computeRevenueFeedback(nextLevel, inp, documentedEncounters, revenuePerVisit, inputs.conversionFactor || 33);
      case 'workforce': return computeWorkforceFeedback(nextLevel, inp, providers, providerRate);
      case 'risk': return computeRiskFeedback(nextLevel, inp, documentedEncounters, revenuePerVisit);
    }
  }, [activeDomain, currentState.activationLevel, currentState.inputs, providers, documentedEncounters, revenuePerVisit, providerRate, inputs.conversionFactor, inputs.timeSavedPerEncounter]);

  const incrementalValue = useMemo(() => {
    if (!feedback || !nextLevelFeedback) return 0;
    const currentVal = feedback.value || 0;
    const nextVal = nextLevelFeedback.value || 0;
    return Math.max(0, nextVal - currentVal);
  }, [feedback, nextLevelFeedback]);

  const handleAdvance = () => {
    if (currentState.activationLevel) {
      const score = computeDomainScore(activeDomain, currentState.activationLevel, currentState.inputs);
      const gapValue = feedback?.value || 0;
      const hasValue = feedback?.hasValue || false;
      dispatch(assessmentActions.updateInput(`${activeDomain}Score` as keyof typeof inputs, score));
      dispatch(assessmentActions.updateInput(`${activeDomain}Gap` as keyof typeof inputs, gapValue));
      dispatch(assessmentActions.updateInput(`${activeDomain}HasValue` as keyof typeof inputs, hasValue));
      dispatch(assessmentActions.updateInput(`${activeDomain}HeadlineMetric` as keyof typeof inputs, feedback?.headlineMetric || ''));
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
        <label className="block text-sm font-medium text-black mb-1">
          Minutes returned per documented encounter
        </label>
        <p className="text-sm text-[#888888] mb-3">The clinical time per visit that ambient returns to your providers — previously spent on typing, clicking, or after-visit dictation.</p>

        {!(showUnmeasuredCheckbox && unmeasuredTimeChecked) && (
          <div className="flex items-center gap-2 mb-3">
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

        <div className="flex items-center justify-center gap-3 flex-wrap mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[#F0EFED] border border-[#E5E7EB] text-[#888888]">
            <span className="font-bold">1–3 min</span> Industry range
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[#EA2C00]/8 border border-[#EA2C00]/25 text-[#EA2C00] font-semibold">
            <span className="font-bold">2–3 min</span> Abridge observed avg
          </span>
        </div>
        <BenchmarkContext text="Based on published industry data and aggregated deployment experience." />

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
                I haven't formally measured this — using the Abridge observed benchmark of 2–3 min
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
      const capacityAggregated = currentState.inputs.capacityAggregated as string | undefined;
      const capacityLeadershipDecision = currentState.inputs.capacityLeadershipDecision as string | undefined;
      return (
        <>
          {timeSavedSection}
          <div className="mb-5">
            <label className="block text-sm font-medium text-black mb-3">
              Has your organization aggregated total recovered hours across providers?
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'no', label: "No — time savings are known per encounter but not aggregated across the deployment" },
                { id: 'informal', label: "Informally — we have estimates but no formal reporting" },
                { id: 'yes', label: 'Yes — total recovered hours are formally quantified and reported' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDomainInput('capacityAggregated', opt.id)}
                  className={`rounded-lg p-3.5 sm:p-4 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                    capacityAggregated === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-aggregated-${opt.id}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {capacityAggregated === 'yes' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-5">
                  <label className="block text-sm font-medium text-black mb-3">
                    Has leadership made an operational decision about how to use this capacity?
                  </label>
                  <div className="flex flex-col gap-2.5">
                    {[
                      { id: 'no', label: "No — the number has been presented but no decision has been made" },
                      { id: 'partial', label: "In progress — leadership is evaluating options" },
                      { id: 'yes', label: 'Yes — there is a formal plan for deploying recovered capacity' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDomainInput('capacityLeadershipDecision', opt.id)}
                        className={`rounded-lg p-3.5 sm:p-4 text-left text-sm transition-all cursor-pointer active:scale-[0.99] ${
                          capacityLeadershipDecision === opt.id
                            ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                            : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                        }`}
                        data-testid={`radio-leadership-decision-${opt.id}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      );
    }

    if (level === 3) {
      const confidenceOptions = ['measured', 'estimated', 'aspirational'] as const;
      const currentConfidence = (currentState.inputs.capacityAccessConfidence as string) || 'estimated';
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Additional patients seen per provider per month
            </label>
            <p className="text-sm text-[#888888] mb-3">Appointments added due to scheduling redesign or panel expansion enabled by ambient. Enter what's confirmed or your best estimate.</p>
            <FormattedNumberInput
              value={(currentState.inputs.additionalPatientsPerMonth as number) || 0}
              onChange={(v) => setDomainInput('additionalPatientsPerMonth', v)}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-additional-patients"
            />
            <BenchmarkContext text="Organizations with structured access redesign have reported 3–8 additional patients per provider per month." />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">
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
            <label className="block text-sm font-medium text-black mb-1">
              Providers with redesigned schedules
            </label>
            <p className="text-xs text-[#888888] mb-2">Defaults to your total provider count. Override if only a subset has redesigned schedules.</p>
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

    const CAPACITY_PLANNING_OPTIONS = [
      'Avoided or deferred new hires',
      'Absorbed patient volume growth without adding FTEs',
      'Redeployed providers to underserved panels or new sites',
      'Factored into annual FTE / staffing model',
      'Used in business case for new service lines or locations',
    ];

    return (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-black mb-3">
            How is recovered capacity being used in planning?
          </label>
          <div className="flex flex-col gap-2.5">
            {CAPACITY_PLANNING_OPTIONS.map((item, i) => {
              const checked = isChecked('capacityPlanningAreas', i);
              return (
                <label
                  key={i}
                  htmlFor={`capacity-planning-${i}`}
                  className={`flex items-start gap-3 rounded-lg border px-3.5 py-3 cursor-pointer transition-all active:scale-[0.99] ${
                    checked ? 'border-[#EA2C00] bg-[#FFF5F2]' : 'border-[#E5E7EB] bg-white hover:border-[#D1D5DB]'
                  }`}
                >
                  <Checkbox
                    id={`capacity-planning-${i}`}
                    checked={checked}
                    onCheckedChange={() => toggleCheckboxItem('capacityPlanningAreas', i)}
                    data-testid={`checkbox-capacity-planning-${i}`}
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
          <label className="block text-sm font-medium text-black mb-1">FTEs avoided or deferred</label>
          <FormattedNumberInput
            value={(currentState.inputs.fteAvoided as number) || 0}
            onChange={(v) => setDomainInput('fteAvoided', Math.max(0, v))}
            placeholder=""
            className="w-full h-12 bg-white border-[#E5E7EB]"
            data-testid="input-fte-avoided"
          />
          <BenchmarkContext text="Organizations at this maturity level have reported 1–2 FTE equivalent in avoided or deferred hires." />
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1">Fully-loaded annual cost per FTE</label>
          <p className="text-xs text-[#888888] mb-2">Include salary, benefits, malpractice, and onboarding. AMGA benchmark: $350K–$450K for outpatient physician.</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.annualCostPerFte as number) || 0}
              onChange={(v) => setDomainInput('annualCostPerFte', Math.max(0, v))}
              placeholder="e.g. 350000"
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-annual-cost-per-fte"
            />
          </div>
        </div>
      </div>
    );
  };

  const REVENUE_METRIC_OPTIONS = [
    { id: 'wrvu', label: 'wRVU change per encounter (coding specificity improved)' },
    { id: 'collections', label: 'Collections change per encounter (dollars collected per visit)' },
    { id: 'revenue_pct', label: 'Overall revenue change (%) attributed to documentation' },
    { id: 'denial_rate', label: 'Denial rate reduction (documentation-related claims)' },
  ];

  const REVENUE_METRIC_BENCHMARKS: Record<string, string> = {
    wrvu: 'Organizations measuring wRVU impact have reported 0.05\u20130.15 wRVU increase per encounter.',
    collections: 'Organizations measuring collections impact have reported $3\u2013$10 increase per encounter.',
    revenue_pct: 'Organizations measuring overall revenue impact have reported 1\u20134% improvement.',
    denial_rate: 'Organizations measuring denial rates have reported 5\u201315% reduction in documentation-related denials.',
  };

  const renderRevenueInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      const revenueCycleEngaged = currentState.inputs.revenueCycleEngaged as string | undefined;
      const revenueCycleStatus = currentState.inputs.revenueCycleStatus as string | undefined;
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              Has your revenue cycle team been formally engaged?
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'no', label: 'Not yet — ambient and revenue cycle are operating independently' },
                { id: 'informal', label: 'Some awareness — conversations have started informally' },
                { id: 'yes', label: 'Yes — formally engaged and involved' },
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
                  {opt.label}
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
                      { id: 'aware', label: 'Aware but no formal analysis yet' },
                      { id: 'analyzing', label: 'Active analysis in progress → Level 2' },
                      { id: 'measured', label: 'We have before/after data → Level 3' },
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
                        {opt.label}
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
        </div>
      );
    }

    if (level === 2) {
      const INVESTIGATION_AREAS = [
        'wRVU per encounter trends',
        'ICD-10 coding specificity and code level distribution',
        'Claim denial rates related to documentation quality',
        'Collections per encounter before vs. after ambient',
        'CDI query volume before vs. after',
        'Coder productivity and turnaround time',
      ];
      const duration = currentState.inputs.investigationDuration as string || '';
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
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
            <label className="block text-sm font-medium text-black mb-2">
              How long has the analysis been in progress?
            </label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'under30', label: 'Less than 30 days' },
                { id: '30to90', label: '30–90 days' },
                { id: '90plus', label: '90+ days — findings are maturing' },
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
                  {opt.label}
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
                  {opt.label}
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
                <label className="block text-sm font-medium text-black mb-1">
                  Measured wRVU change per encounter
                </label>
                <p className="text-xs text-[#888888] mb-2">The average change in wRVU per encounter your coding team attributes to improved documentation specificity.</p>
                <FormattedNumberInput
                  value={(currentState.inputs.measuredWrvuDelta as number) || 0}
                  onChange={(v) => setDomainInput('measuredWrvuDelta', Math.max(0, v))}
                  placeholder=""
                  className="w-full h-12 bg-white border-[#E5E7EB]"
                  data-testid="input-wrvu-delta"
                  step={0.01}
                />
                <BenchmarkContext text="For context: ambient deployments with active CDI review have reported 0.05–0.15 wRVU improvement per encounter. Enter your measured value." />
              </motion.div>
            )}
            {metricType === 'collections' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-black mb-1">
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
                <label className="block text-sm font-medium text-black mb-1">
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
                  <label className="block text-sm font-medium text-black mb-1">
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
                  <label className="block text-sm font-medium text-black mb-1">
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
          <label className="block text-sm font-medium text-black mb-3">
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
          <label className="block text-sm font-medium text-black mb-1">
            Revenue formally attributed to documentation quality
          </label>
          <p className="text-xs text-[#888888] mb-2">
            The annual figure your organization attributes to ambient-enabled documentation improvements — a number your CFO or VP of Revenue Cycle has confirmed.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.recognizedRevenue as number) || 0}
              onChange={(v) => setDomainInput('recognizedRevenue', Math.max(0, v))}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-recognized-revenue"
            />
          </div>
          <BenchmarkContext text="Organizations with revenue cycle integration have reported $200K–$1M+ in attributed revenue." />
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
          <p className="text-sm text-[#888888] italic mb-4">
            Documentation burden affects provider retention and labor costs. The estimate below is auto-computed from your baseline data.
          </p>
          <label className="block text-sm font-medium text-black mb-1">
            Estimated hours per provider per week of after-hours documentation reduced
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
          <BenchmarkContext text="Organizations using ambient documentation have reported 1–3 hrs/week reduction in after-hours documentation." />
        </div>
      );
    }

    const SURVEY_OPTIONS = [
      { id: 'not_yet', label: 'Not yet' },
      { id: 'informal', label: 'Yes — informal pulse survey' },
      { id: 'structured', label: 'Yes — structured survey (e.g., burnout, satisfaction, documentation burden)' },
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
            <label className="block text-sm font-medium text-black mb-1">
              Minutes saved per provider per day in chart editing, correction, and reconciliation
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
            <BenchmarkContext text="Organizations at this stage have reported 10–20 min/day reduction in chart editing and review. Based on aggregated deployment experience." />
          </div>


          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Have you conducted a clinician survey since deploying ambient documentation?
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
                <label className="block text-sm font-medium text-black mb-2">
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
                  <label className="block text-sm font-medium text-black mb-1">
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
                  <label className="block text-sm font-medium text-black mb-1">
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
        { value: 10, label: '~10% — a contributing factor' },
        { value: 20, label: '~20% — a significant factor' },
        { value: 30, label: '~30% — a primary driver' },
        { value: 40, label: '40%+ — the dominant driver' },
      ];
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
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
            <BenchmarkContext text="National physician turnover averages 6–8% annually (AAMC)." />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Average cost to recruit and onboard a replacement
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#888888]">$</span>
              <FormattedNumberInput
                value={(currentState.inputs.replacementCost as number) || 0}
                onChange={(v) => setDomainInput('replacementCost', v)}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-replacement-cost"
              />
            </div>
            <BenchmarkContext text="Industry estimates for physician replacement range from $250K–$500K (AAMC, Physician Recruitment studies)." />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              What portion of turnover is driven or worsened by documentation burden?
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
                  {opt.label} ({opt.value}%)
                </button>
              ))}
            </div>
            <p className="text-xs text-[#888888] mt-2">Research benchmark: Documentation burden is a top-3 driver of physician burnout (Shanafelt et al.). Organizations report 20–40% of voluntary turnover attributed to workload and documentation fatigue.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-black mb-1">
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
          <BenchmarkContext text="Organizations at the highest maturity level have reported $5K–$30K/month in agency and locum spend reduction. Based on aggregated deployment experience." />
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            How many months has this reduction been sustained?
          </label>
          <FormattedNumberInput
            value={(currentState.inputs.monthsSustained as number) || 0}
            onChange={(v) => setDomainInput('monthsSustained', Math.max(0, v))}
            placeholder=""
            className="w-full h-12 bg-white border-[#E5E7EB]"
            data-testid="input-months-sustained"
          />
        </div>
      </div>
    );
  };

  const MONITORING_OPTIONS = [
    { id: 'not_yet', label: "Not yet — we know notes are better but haven't formalized tracking" },
    { id: 'spot_checks', label: 'Spot checks — informal review, anecdotal feedback from CDI or coding' },
    { id: 'systematic', label: 'Systematic tracking — structured audits or dashboards measuring documentation attributes' },
  ];

  const renderRiskInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      return (
        <div>
          <p className="text-sm text-[#888888] italic mb-4">
            Documentation quality improved, but nothing downstream has changed. The exposure below is auto-computed from your baseline data.
          </p>
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              What % of your patient panel is in value-based or risk contracts?
            </label>
            <p className="text-xs text-[#888888] mb-2">If unknown or primarily fee-for-service, leave at 0. HCC undercapture only applies to VBC/capitation populations.</p>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={(currentState.inputs.riskVbcPct as number) ?? 0}
                onChange={(v) => setDomainInput('riskVbcPct', Math.min(100, Math.max(0, v)))}
                placeholder="0"
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-risk-vbc-pct"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {[
                { label: 'Mostly fee-for-service', value: 8 },
                { label: 'Mixed payer mix', value: 28 },
                { label: 'VBC-heavy', value: 52 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setDomainInput('riskVbcPct', opt.value)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[#D1D5DB] text-[#525252] hover:border-[#E8350A] hover:text-[#E8350A] transition-all"
                >
                  {opt.label} (~{opt.value}%)
                </button>
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
            <label className="block text-sm font-medium text-black mb-3">
              How is your organization monitoring documentation quality?
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
                <BenchmarkContext text="Organizations that begin systematic monitoring have reported 15–30% improvement in documentation completeness and specificity. Based on aggregated deployment experience." />

                <div className="mt-5">
                  <label className="block text-sm font-medium text-black mb-1">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (level === 3) {
      const WORKFLOW_DELTA_FIELDS: Record<number, { fields: { key: string; label: string; suffix?: string; step?: number }[] }> = {
        0: { fields: [
          { key: 'cdiQueriesBefore', label: 'CDI queries/month before', suffix: '/mo' },
          { key: 'cdiQueriesAfter', label: 'CDI queries/month after', suffix: '/mo' },
        ] },
        1: { fields: [
          { key: 'riskDenialBefore', label: 'Denial rate before (%)', suffix: '%', step: 0.1 },
          { key: 'riskDenialAfter', label: 'Denial rate after (%)', suffix: '%', step: 0.1 },
        ] },
        2: { fields: [
          { key: 'qualityGapsClosed', label: 'Quality gaps closed per month', suffix: '/mo' },
        ] },
        3: { fields: [
          { key: 'priorAuthBefore', label: 'Prior auth approval rate before (%)', suffix: '%' },
          { key: 'priorAuthAfter', label: 'Prior auth approval rate after (%)', suffix: '%' },
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
            <label className="block text-sm font-medium text-black mb-3">
              Which downstream workflows have been impacted by improved documentation?
            </label>
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
                          <div key={f.key} className="flex items-center gap-2">
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
                            <span className="text-xs text-[#888888] whitespace-nowrap min-w-[100px]">{f.label}</span>
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
          <label className="block text-sm font-medium text-black mb-2">
            Is there a named executive owner of documentation quality strategy?
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
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {executiveOwner === 'yes' && (
          <div>
            <label className="block text-sm font-medium text-black mb-1">Role</label>
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
          <label className="block text-sm font-medium text-black mb-3">
            Where does documentation quality factor into organizational strategy?
          </label>
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
          <label className="block text-sm font-medium text-black mb-1">
            Recognized annual strategic value
          </label>
          <p className="text-xs text-[#888888] mb-2">
            The combined value of documentation-driven improvements across payer, quality, compliance, and risk programs.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.strategicValue as number) || 0}
              onChange={(v) => setDomainInput('strategicValue', Math.max(0, v))}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-strategic-value"
            />
          </div>
          <BenchmarkContext text="Organizations at this level have reported $200K–$1M+ in attributed strategic value." />
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
        <p className="font-bold text-2xl text-[#EA2C00] leading-[1.1] mb-4" data-testid="text-feedback-value">
          {fb.headlineMetric}
        </p>
      );
    }
    if (!fb.hasValue && fb.value === null) {
      return (
        <p className="font-bold text-2xl text-white/40 leading-[1.1] mb-4" data-testid="text-feedback-value">
          Not yet measured
        </p>
      );
    }
    if (fb.value === 0) {
      return (
        <p className="font-bold text-4xl text-white/50 leading-[1.1] mb-4" data-testid="text-feedback-value">
          $0
        </p>
      );
    }
    return (
      <p className="font-bold text-4xl text-[#EA2C00] leading-[1.1] mb-4" data-testid="text-feedback-value">
        {formatDollar(fb.value || 0)}
      </p>
    );
  };

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <div className="flex items-center justify-center gap-1.5 sm:gap-3 mb-10">
        {DOMAIN_ORDER.map((d, idx) => {
          const isActive = d === activeDomain;
          const isComplete = idx < activeIdx;

          return (
            <div key={d} className="flex items-center gap-1.5 sm:gap-3">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setActiveDomain(d)}
                  className={`text-[12px] sm:text-xs font-medium uppercase tracking-[1px] sm:tracking-[1.5px] mb-2 px-1 py-1 ${
                    isActive ? 'text-[#EA2C00]' : isComplete ? 'text-black cursor-pointer hover:text-[#EA2C00] transition-colors' : 'text-[#888888] cursor-not-allowed'
                  }`}
                  data-testid={`domain-label-${d}`}
                  disabled={!isComplete && !isActive}
                >
                  {DOMAIN_LABELS[d]}
                </button>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-[#EA2C00]' : isComplete ? 'bg-black' : 'bg-[#D1D5DB]'
                  }`}
                  data-testid={`domain-dot-${d}`}
                />
              </div>
              {idx < DOMAIN_ORDER.length - 1 && (
                <div className="w-4 sm:w-8 h-px bg-[#D1D5DB] mt-5" />
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
            {feedback ? (feedback.hasValue ? formatDollar(feedback.value || 0) : '$0') : '—'}
          </span>
        </div>
        <span className="text-[12px] text-white/40 uppercase tracking-wider">
          {activeIdx + 1} of {DOMAIN_ORDER.length}
        </span>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="flex-1 max-w-[700px]">
          <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-6 md:p-10 mb-8">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2" data-testid="text-domain-label">
              {activeDomain === 'capacity' ? 'YOUR CAPACITY MATURITY' : activeDomain === 'revenue' ? 'YOUR REVENUE MATURITY' : 'Where is your organization today?'}
            </p>

            {(activeDomain === 'capacity' || activeDomain === 'revenue') && (
              <div className="flex items-center justify-center gap-3 mb-4">
                {[1, 2, 3, 4].map((lvl) => {
                  const selectedLevel = currentState.activationLevel;
                  const isActive = selectedLevel === lvl;
                  const isComplete = selectedLevel !== null && lvl < selectedLevel;
                  return (
                    <div key={lvl} className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full transition-all ${
                          isActive ? 'bg-[#EA2C00] scale-125' : isComplete ? 'bg-[#EA2C00]/60' : 'bg-[#D1D5DB]'
                        }`}
                        data-testid={`${activeDomain}-dot-${lvl}`}
                      />
                      {lvl < 4 && <div className="w-6 h-px bg-[#D1D5DB]" />}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="h-px bg-[#E5E7EB] mb-6" />

            <div className="flex flex-col">
              {config.cards.map((card, cardIdx) => {
                const selectedLevel = currentState.activationLevel;
                const isSelected = selectedLevel === card.level;
                const isClaimed = selectedLevel !== null && card.level < selectedLevel;
                const isNextAbove = selectedLevel !== null && card.level === selectedLevel + 1 && selectedLevel < 4;
                const hasStaircase = activeDomain === 'capacity' || activeDomain === 'revenue';
                const isFuture = hasStaircase && selectedLevel !== null && card.level > selectedLevel && !isNextAbove;

                const leftBorderStyle = isSelected
                  ? '3px solid #EA2C00'
                  : isClaimed ? '2px solid rgba(234, 44, 0, 0.3)'
                  : card.level === 3 && !isClaimed ? '2px solid rgba(234, 44, 0, 0.3)'
                  : card.level === 4 && !isClaimed ? '2px solid #EA2C00'
                  : '2px solid transparent';

                const staircaseCompletedSummary = hasStaircase && isClaimed ? (() => {
                  const inp = currentState.inputs;
                  if (activeDomain === 'capacity') {
                    const ts = (inp.timeSaved as number) || 0;
                    if (card.level === 1 && ts > 0) {
                      const hrs = Math.round(documentedEncounters * ts / 60);
                      return `${hrs.toLocaleString()} hrs/yr`;
                    }
                    if (card.level === 2) {
                      const agg = inp.capacityAggregated as string;
                      const ld = inp.capacityLeadershipDecision as string;
                      let status = 'pending';
                      if (agg === 'yes' && ld === 'yes') status = 'confirmed';
                      else if (agg === 'yes' && ld === 'partial') status = 'in progress';
                      return `Decision ${status}`;
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

                return (
                  <div key={card.level}>
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: cardIdx * 0.05, ease: "easeOut" }}
                      onClick={() => {
                        if (hasStaircase && isFuture && !isClaimed) return;
                        setActivation(card.level);
                      }}
                      className={`w-full text-left transition-all bg-white ${
                        hasStaircase && isFuture && !isClaimed
                          ? 'opacity-40 cursor-not-allowed'
                          : 'cursor-pointer active:scale-[0.99] hover:bg-[#FAFAF8]'
                      }`}
                      style={{
                        borderLeft: leftBorderStyle,
                        padding: isClaimed ? '10px 16px' : '16px 16px',
                      }}
                      data-testid={`activation-card-${activeDomain}-${card.level}`}
                    >
                      <div className="flex items-start gap-4">
                        {isClaimed ? (
                          <Check size={18} className="text-[#EA2C00] mt-0.5 flex-shrink-0" />
                        ) : (
                          <span
                            className="flex-shrink-0 leading-none"
                            style={{
                              fontSize: '52px',
                              fontWeight: 300,
                              color: `rgba(234, 44, 0, ${isSelected ? 1 : NUMERAL_OPACITIES[card.level]})`,
                            }}
                          >
                            {card.level}
                          </span>
                        )}
                        <div className={`flex-1 ${isClaimed ? 'pt-0' : 'pt-2'}`}>
                          <p
                            className={`text-sm leading-snug ${isSelected || card.level === 4 ? 'font-bold' : 'font-semibold'}`}
                            style={{ color: isClaimed ? '#999999' : isSelected ? '#000000' : TITLE_COLORS[card.level] }}
                          >
                            {card.label}
                          </p>
                          {isClaimed && staircaseCompletedSummary && (
                            <p className="text-xs text-[#888888] mt-0.5">{staircaseCompletedSummary}</p>
                          )}
                          {!isClaimed && (
                            <p
                              className="text-sm leading-snug mt-1"
                              style={{ color: isSelected ? '#555555' : DESC_COLORS[card.level] }}
                            >
                              {card.description}
                            </p>
                          )}
                          {hasStaircase && isFuture && !isClaimed && config.unlockTeasers?.[card.level] && (
                            <p className="text-xs text-[#888888] italic mt-1">
                              {config.unlockTeasers[card.level]}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.button>

                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div
                            className="bg-white px-5 pb-5"
                            style={{ borderLeft: '3px solid #EA2C00' }}
                          >
                            {hasStaircase && config.framingQuestions?.[card.level] && (
                              <p className="text-[13px] text-[#666666] leading-relaxed mt-1 mb-3 italic">
                                {config.framingQuestions[card.level]}
                              </p>
                            )}
                            {!hasStaircase && card.level === 1 ? (
                              <p className="text-[13px] text-[#666666] leading-relaxed mt-1">
                                This is where most deployments begin. The value emerges as your organization decides what to do with the time recovered.
                              </p>
                            ) : !hasStaircase && feedback ? (
                              <div className="mt-1">
                                {feedback.headlineMetric ? (
                                  <p className="font-bold text-[28px] text-[#EA2C00] leading-none" data-testid="text-ladder-value">
                                    {feedback.headlineMetric}
                                  </p>
                                ) : feedback.hasValue && feedback.value ? (
                                  <p className="font-bold text-[28px] text-[#EA2C00] leading-none" data-testid="text-ladder-value">
                                    {formatDollar(feedback.value)}
                                  </p>
                                ) : null}
                                {feedback.context && (
                                  <p className="text-[13px] text-[#666666] leading-relaxed mt-2">
                                    {feedback.context.split('\n').filter(Boolean)[0]}
                                  </p>
                                )}
                              </div>
                            ) : hasStaircase && feedback ? (
                              <div className="mt-1">
                                {feedback.headlineMetric && (
                                  <p className="font-bold text-xl text-[#EA2C00] leading-none mb-2" data-testid="text-ladder-value">
                                    {feedback.headlineMetric}
                                  </p>
                                )}
                              </div>
                            ) : null}

                            <div className="mt-4 pt-4 border-t border-[#E8E4DC]">
                              {renderDomainInputs()}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {!hasStaircase && isNextAbove && incrementalValue > 0 && (
                      <div
                        className="bg-white/60 px-5 py-2"
                        style={{
                          borderLeft: card.level === 3 ? '2px solid rgba(234, 44, 0, 0.3)'
                            : card.level === 4 ? '2px solid #EA2C00'
                            : '2px solid transparent',
                        }}
                      >
                        <p className="text-[13px] leading-relaxed">
                          <span className="font-semibold" style={{ color: 'rgba(234, 44, 0, 0.7)' }}>
                            +{formatDollar(incrementalValue)} at this level
                          </span>
                          {' '}<span className="text-[#888888]">— {OPERATIONAL_CONDITIONS[activeDomain]}</span>
                        </p>
                      </div>
                    )}

                    {cardIdx < 3 && <div className="h-px bg-[#E8E4DC]" />}
                  </div>
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
                    {activeDomain === 'capacity' ? `Recoverable capacity value — based on your ${documentedEncounters.toLocaleString()} encounters and industry time estimates.` :
                     activeDomain === 'revenue' ? `Revenue signal — based on your ${documentedEncounters.toLocaleString()} encounters at industry-observed coding improvement rates.` :
                     activeDomain === 'workforce' ? `Turnover exposure — based on your ${providers.toLocaleString()} providers and AAMC replacement cost benchmarks.` :
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

                {feedback.costOfWaiting && activeDomain !== 'capacity' && activeDomain !== 'revenue' && (
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

                {(activeDomain === 'capacity' || activeDomain === 'revenue') && feedback.nextLevelTeaser && (
                  <p className="text-xs text-white/50 italic leading-relaxed mt-3" data-testid="text-next-level-teaser">
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
            ) : (
              <>
                <p className="font-bold text-2xl text-white/30 leading-[1.1] mb-4">—</p>
                <div className="h-px bg-white/10 my-4" />
                <p className="text-sm text-white/50 leading-relaxed">
                  Select your organization's maturity level to see estimated impact.
                </p>
              </>
            )}

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

            {activeDomain === 'capacity' && currentState.activationLevel && (() => {
              const inp = currentState.inputs;
              const ts = (inp.timeSaved as number) || 0;
              const recoveredHours = ts > 0 ? Math.round(documentedEncounters * ts / 60) : 0;
              const fte = ts > 0 ? (recoveredHours / 2080).toFixed(1) : null;

              const pts = (inp.additionalPatientsPerMonth as number) || 0;
              const rp = (inp.redesignedProviders as number) || providers;
              const accessRevenue = pts > 0 ? Math.round(pts * rp * 11 * revenuePerVisit) : null;

              const fteAvoided = (inp.fteAvoided as number) || 0;
              const annualCostPerFte = (inp.annualCostPerFte as number) || 0;
              const avoidedCost = fteAvoided > 0 && annualCostPerFte > 0 ? Math.round(fteAvoided * annualCostPerFte) : null;

              const hasAnyValue = recoveredHours > 0 || accessRevenue !== null || avoidedCost !== null;
              if (!hasAnyValue) return null;

              const totalDollar = (accessRevenue || 0) + (avoidedCost || 0);
              const hasDollarValue = accessRevenue !== null || avoidedCost !== null;

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
                      <span className="text-white/60">Avoided Cost</span>
                      <span className="text-white font-medium" data-testid="text-capacity-summary-avoided">
                        {avoidedCost !== null ? formatDollar(avoidedCost) : '—'}
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
