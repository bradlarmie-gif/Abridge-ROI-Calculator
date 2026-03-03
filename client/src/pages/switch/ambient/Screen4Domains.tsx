import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Checkbox } from "@/components/ui/checkbox";
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
    headline: 'You\'re recovering time. But is anyone deciding what to do with it?',
    reframe: 'The difference between a productivity tool and a strategic asset is whether recovered time converts to measurable capacity.',
    cards: [
      { level: 1, label: 'Time Recovered. No Decision Made About It.', description: 'Ambient AI is deployed and time is being saved in clinic, but no operational decision has followed about where that time goes.' },
      { level: 2, label: 'Total Recovery Quantified. Opportunity Identified.', description: 'Aggregate hours known and presented to leadership.' },
      { level: 3, label: 'Capacity Redeployed Into Patient Access.', description: 'Schedules, panels, or slots changed based on the recovered time.' },
      { level: 4, label: 'Capacity Drives Staffing and Growth Decisions.', description: 'Recovered FTE equivalent is a variable in hiring, expansion, and build planning.' },
    ],
  },
  revenue: {
    label: 'REVENUE',
    headline: 'Is documentation fidelity worth anything to your revenue cycle — or is no one asking?',
    reframe: 'Every encounter either captures or leaks revenue through your documentation infrastructure. The question is whether anyone is measuring which.',
    cards: [
      { level: 1, label: 'Revenue Cycle Has Not Been Asked.', description: 'No one has connected ambient deployment to coding or billing.' },
      { level: 2, label: 'Revenue Cycle Is Investigating.', description: 'CDI, coding, or billing leadership has an active analysis in progress.' },
      { level: 3, label: 'Revenue Impact Measured and Attributed.', description: 'Before/after analysis complete; a dollar number exists that leadership can stand behind.' },
      { level: 4, label: 'Documentation Quality Is a Managed Revenue Input.', description: 'Ongoing, real-time integration between documentation quality and revenue cycle operations.' },
    ],
  },
  workforce: {
    label: 'WORKFORCE',
    headline: 'Documentation burden is driving turnover. Do you know how much it\'s costing?',
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
          Time saved per documented encounter
        </label>
        <p className="text-sm text-[#888888] mb-3">Minutes recovered per encounter using ambient documentation</p>

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
                I haven't measured this precisely
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
      const calculatedHours = timeSavedValue > 0 ? Math.round(documentedEncounters * timeSavedValue / 60) : 0;
      return (
        <>
          {timeSavedSection}
          <div className="mb-5">
            <label className="block text-sm font-medium text-black mb-3">
              Have you calculated total recovered capacity across your deployment?
            </label>
            <div className="flex flex-col gap-2.5">
              {[
                { id: 'no', label: "No — we have time-per-encounter data but haven't aggregated it" },
                { id: 'yes', label: 'Yes — we know our total recovered hours' },
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
                <label className="block text-sm font-medium text-black mb-1">
                  Confirmed recovered hours annually
                </label>
                <p className="text-xs text-[#888888] mb-2">Calculated from your inputs. Adjust if your organization has measured a different number.</p>
                <FormattedNumberInput
                  value={(currentState.inputs.confirmedHours as number) || calculatedHours}
                  onChange={(v) => setDomainInput('confirmedHours', Math.max(0, v))}
                  placeholder=""
                  className="w-full h-12 bg-white border-[#E5E7EB]"
                  data-testid="input-confirmed-hours"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      );
    }

    if (level === 3) {
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Additional patients seen per provider per month
            </label>
            <p className="text-sm text-[#888888] mb-3">Due to scheduling redesign, template changes, or panel expansion</p>
            <FormattedNumberInput
              value={(currentState.inputs.additionalPatientsPerMonth as number) || 0}
              onChange={(v) => setDomainInput('additionalPatientsPerMonth', v)}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-additional-patients"
            />
            <BenchmarkContext text="Organizations with structured access redesign have reported 3–8 additional patients/provider/month." />
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
          <label className="block text-sm font-medium text-black mb-1">Annual cost per physician FTE</label>
          <p className="text-xs text-[#888888] mb-2">Fully-loaded cost including salary, benefits, and recruitment. Default $350,000.</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.annualCostPerFte as number) || 350000}
              onChange={(v) => setDomainInput('annualCostPerFte', Math.max(0, v))}
              placeholder="350000"
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-annual-cost-per-fte"
            />
          </div>
        </div>
      </div>
    );
  };

  const REVENUE_METRIC_OPTIONS = [
    { id: 'wrvu', label: 'wRVU change per encounter' },
    { id: 'collections', label: 'Collections change per encounter' },
    { id: 'revenue_pct', label: 'Overall revenue change (%) attributed to documentation' },
    { id: 'denial_rate', label: 'Denial rate reduction (%)' },
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
      return (
        <div>
          <p className="text-sm text-[#888888] italic mb-4">
            Your revenue cycle hasn't been asked to evaluate documentation changes from ambient. The numbers below are auto-computed from your baseline data.
          </p>
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              What % of patients are in value-based contracts?
            </label>
            <p className="text-xs text-[#888888] mb-2">Used to estimate HCC/risk adjustment exposure. Default 30%.</p>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={(currentState.inputs.vbcSharePct as number) || 30}
                onChange={(v) => setDomainInput('vbcSharePct', Math.min(100, Math.max(0, v)))}
                placeholder="30"
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-revenue-vbc-pct"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
          </div>
        </div>
      );
    }

    if (level === 2) {
      const INVESTIGATION_AREAS = [
        'CDI query volume before vs. after',
        'ICD-10 coding specificity',
        'HCC/risk adjustment capture rates',
        'Claim denial rates related to documentation',
        'wRVU per encounter trends',
        'Collections per encounter',
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
                  Measured wRVU change per encounter since deployment
                </label>
                <FormattedNumberInput
                  value={(currentState.inputs.measuredWrvuDelta as number) || 0}
                  onChange={(v) => setDomainInput('measuredWrvuDelta', Math.max(0, v))}
                  placeholder=""
                  className="w-full h-12 bg-white border-[#E5E7EB]"
                  data-testid="input-wrvu-delta"
                  step={0.01}
                />
                <BenchmarkContext text={REVENUE_METRIC_BENCHMARKS.wrvu} />
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
            Recognized annual revenue attributed to documentation quality
          </label>
          <p className="text-xs text-[#888888] mb-2">
            Annual revenue impact that your organization formally attributes to documentation improvements. This should be a number your leadership team or revenue cycle VP would stand behind.
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
          <BenchmarkContext text="Organizations with revenue cycle integration have reported $200K\u2013$1M+ in attributed revenue." />
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
                { label: 'Shanafelt benchmark', value: 60 },
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
            <p className="text-xs text-[#888888] mt-2">Shanafelt et al. found documentation burden is a top-3 driver of physician burnout. Most organizations use 40–60%.</p>
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
              Where is your organization today?
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                    className={`rounded-lg p-4 sm:p-5 text-left min-h-[110px] transition-all cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? "bg-[#EA2C00]/5 border-2 border-[#EA2C00] shadow-sm"
                        : "bg-white/80 border border-[#E5E7EB] hover:border-[#D1D5DB]"
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
                <div className="bg-[#F5F0EB] rounded-lg p-5 sm:p-6 md:p-10">
                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                    Refine Your Inputs
                  </p>
                  <div className="h-px bg-[#E5E7EB] mb-6" />
                  {renderDomainInputs()}
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

                {feedback.costOfWaiting && (
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}
