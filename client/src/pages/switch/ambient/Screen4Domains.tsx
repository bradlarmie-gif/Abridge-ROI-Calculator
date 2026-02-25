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
  QUALITY_ATTRIBUTES, DOWNSTREAM_WORKFLOWS, STRATEGIC_INTEGRATIONS,
  type DomainFeedback,
} from "./domainCalculations";

interface Screen4Props {
  onNext: () => void;
  onBack: () => void;
}

const DOMAIN_CTA: Record<Domain, string> = {
  capacity: 'See Revenue Impact →',
  revenue: 'See Workforce Impact →',
  workforce: 'See Risk Exposure →',
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
    headline: 'Where does recovered time actually go?',
    reframe: 'Most organizations measure ambient AI by physician satisfaction. The real question is what happened to the time it returned — and whether your organization has a system for capturing it.',
    cards: [
      { level: 1, label: 'Time Saved, Not Deployed', description: 'Providers are faster. Schedules and panels are unchanged.' },
      { level: 2, label: 'Informal Access Absorption', description: 'Recovered time informally absorbed. No scheduling redesign.' },
      { level: 3, label: 'Structured Access Expansion', description: 'Schedules and templates redesigned around recovered time.' },
      { level: 4, label: 'Institutionalized Capacity Strategy', description: 'Capacity targets embedded in panel planning and FTE models.' },
    ],
  },
  revenue: {
    label: 'REVENUE',
    headline: 'What is documentation fidelity worth to your revenue cycle?',
    reframe: 'Revenue cycle can only work with what documentation gives them. Every encounter is either capturing the revenue it earned — or leaking it.',
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
      { level: 2, label: 'In-Clinic Burden Reduced', description: 'Chart editing and reconciliation workload measurably lower.' },
      { level: 3, label: 'Turnover Risk Managed', description: 'Attrition tracked against documentation burden reduction.' },
      { level: 4, label: 'Labor Volatility Strategically Reduced', description: 'Agency and overtime exposure structurally declining.' },
    ],
  },
  risk: {
    label: 'RISK',
    headline: 'Is your documentation infrastructure ready for what comes next?',
    reframe: 'Every AI initiative your organization wants in the next three years runs on one foundation — structured, complete, defensible documentation at scale.',
    cards: [
      { level: 1, label: 'Better Notes, Same Infrastructure', description: 'Documentation quality improved. Nothing downstream has changed.' },
      { level: 2, label: 'Active Quality Monitoring', description: 'Documentation completeness and specificity are being tracked.' },
      { level: 3, label: 'Downstream Systems Connected', description: 'Quality reporting, CDI, or coding workflows are leveraging improved documentation.' },
      { level: 4, label: 'Documentation as Strategic Data Asset', description: 'Structured documentation informs payer, quality, and compliance strategy.' },
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
      <p className="text-[10px] font-medium text-white/40 uppercase tracking-[1.5px] mb-2">Formula</p>
      {formula.split('\n').map((line, i) => (
        <p key={i} className="text-[11px] text-white/50 italic leading-relaxed font-mono">{line}</p>
      ))}
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

  const feedback = useMemo((): DomainFeedback | null => {
    if (!currentState.activationLevel) return null;
    const level = currentState.activationLevel;
    const inp = currentState.inputs;
    switch (activeDomain) {
      case 'capacity': return computeCapacityFeedback(level, inp, providers, documentedEncounters, revenuePerVisit, providerRate);
      case 'revenue': return computeRevenueFeedback(level, inp, documentedEncounters, revenuePerVisit);
      case 'workforce': return computeWorkforceFeedback(level, inp, providers, providerRate);
      case 'risk': return computeRiskFeedback(level, inp);
    }
  }, [activeDomain, currentState.activationLevel, currentState.inputs, providers, documentedEncounters, revenuePerVisit, providerRate]);

  const handleAdvance = () => {
    if (currentState.activationLevel) {
      const score = computeDomainScore(activeDomain, currentState.activationLevel, currentState.inputs);
      const gapValue = feedback?.value || 0;
      const hasValue = feedback?.hasValue || false;
      dispatch(assessmentActions.updateInput(`${activeDomain}Score` as keyof typeof inputs, score));
      dispatch(assessmentActions.updateInput(`${activeDomain}Gap` as keyof typeof inputs, gapValue));
      dispatch(assessmentActions.updateInput(`${activeDomain}HasValue` as keyof typeof inputs, hasValue));
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

  const renderCapacityInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    const timeSavedValue = (currentState.inputs.timeSaved as number) || 0;

    const timeSavedSection = (
      <div className="mb-6" key="time-saved">
        <label className="block text-sm font-medium text-black mb-1">
          Time saved per documented encounter
        </label>
        <p className="text-sm text-[#888888] mb-3">Minutes recovered per encounter using ambient documentation</p>

        {!unmeasuredTimeChecked && (
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
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] bg-[#F0EFED] border border-[#E5E7EB] text-[#888888]">
            <span className="font-bold">1.5–2.5 min</span> Most tools
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] bg-[#EA2C00]/8 border border-[#EA2C00]/25 text-[#EA2C00] font-semibold">
            <span className="font-bold">3.0 min</span> Abridge avg
          </span>
        </div>
        <BenchmarkContext text="Based on published industry data and Abridge deployment experience." />

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
      </div>
    );

    if (level === 1) {
      return timeSavedSection;
    }

    if (level === 2) {
      return (
        <>
          {timeSavedSection}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Estimated redeployment rate
            </label>
            <p className="text-sm text-[#888888] mb-3">What % of recovered time is being used for additional patient access?</p>
            <div className="flex items-center gap-2">
              <FormattedNumberInput
                value={(currentState.inputs.redeploymentRate as number) || 0}
                onChange={(v) => setDomainInput('redeploymentRate', Math.min(100, Math.max(0, v)))}
                placeholder=""
                className="w-full h-12 bg-white border-[#E5E7EB]"
                data-testid="input-redeployment"
              />
              <span className="text-sm text-[#888888]">%</span>
            </div>
            <BenchmarkContext text="Organizations at this stage typically report 15–25%. Without scheduling changes, absorption is limited." />
          </div>
        </>
      );
    }

    if (level === 3) {
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Additional patients per provider per month
          </label>
          <p className="text-sm text-[#888888] mb-3">Additional patients seen per provider per month due to scheduling redesign</p>
          <FormattedNumberInput
            value={(currentState.inputs.additionalPatientsPerMonth as number) || 0}
            onChange={(v) => setDomainInput('additionalPatientsPerMonth', v)}
            placeholder=""
            className="w-full h-12 bg-white border-[#E5E7EB]"
            data-testid="input-additional-patients"
          />
          <BenchmarkContext text="Abridge customers with structured access redesign report 3–8 additional patients/provider/month" />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Net visit growth per provider per month
          </label>
          <p className="text-sm text-[#888888] mb-2">Net visit growth per provider per month driven by recovered capacity</p>
          <FormattedNumberInput
            value={(currentState.inputs.netVisitGrowth as number) || 0}
            onChange={(v) => setDomainInput('netVisitGrowth', v)}
            placeholder=""
            className="w-full h-12 bg-white border-[#E5E7EB]"
            data-testid="input-net-visit-growth"
          />
          <BenchmarkContext text="Top-performing Abridge deployments model 5–10 net visits/provider/month in capacity planning" />
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Providers in capacity model
          </label>
          <p className="text-sm text-[#888888] mb-2">May differ from total provider count if capacity modeling is phased</p>
          <FormattedNumberInput
            value={(currentState.inputs.providersInModel as number) || providers}
            onChange={(v) => setDomainInput('providersInModel', v)}
            placeholder={String(providers)}
            className="w-full h-12 bg-white border-[#E5E7EB]"
            data-testid="input-providers-in-model"
          />
        </div>
      </div>
    );
  };

  const renderRevenueInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      return (
        <p className="text-sm text-[#888888] italic">
          No additional inputs at this level. Your organization has not yet measured documentation-driven revenue impact.
        </p>
      );
    }

    if (level === 2) {
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Estimated improvement in coding yield
          </label>
          <p className="text-sm text-[#888888] mb-3">Estimated improvement in coding yield since deployment</p>
          <div className="flex items-center gap-2">
            <FormattedNumberInput
              value={(currentState.inputs.yieldImprovement as number) || 0}
              onChange={(v) => setDomainInput('yieldImprovement', Math.min(100, Math.max(0, v)))}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-yield-improvement"
            />
            <span className="text-sm text-[#888888]">%</span>
          </div>
          <BenchmarkContext text="Abridge customers reporting anecdotal lift estimate 1–3%" />
        </div>
      );
    }

    if (level === 3) {
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Measured yield lift or wRVU delta since deployment
          </label>
          <div className="flex items-center gap-2">
            <FormattedNumberInput
              value={(currentState.inputs.measuredYieldLift as number) || 0}
              onChange={(v) => setDomainInput('measuredYieldLift', v)}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-measured-yield"
            />
            <span className="text-sm text-[#888888]">%</span>
          </div>
          <BenchmarkContext text="Abridge customers with measured yield tracking report 1.5–4% verified improvement" />
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-black mb-1">
          Recognized revenue change attributed to documentation improvements
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#888888]">$</span>
          <FormattedNumberInput
            value={(currentState.inputs.recognizedRevenue as number) || 0}
            onChange={(v) => setDomainInput('recognizedRevenue', v)}
            placeholder=""
            className="w-full h-12 bg-white border-[#E5E7EB]"
            data-testid="input-recognized-revenue"
          />
        </div>
        <BenchmarkContext text="Abridge enterprise customers with financial governance report $200K–$1M+ in recognized documentation-driven revenue" />
      </div>
    );
  };

  const renderWorkforceInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      return (
        <div>
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
          <BenchmarkContext text="Abridge deployments report 1–3 hrs/week reduction in after-hours documentation" />
        </div>
      );
    }

    if (level === 2) {
      return (
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
          <BenchmarkContext text="Abridge deployments report 10–20 min/day reduction in chart editing and review" />
        </div>
      );
    }

    if (level === 3) {
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
            <BenchmarkContext text="National physician turnover averages 6–8% annually" />
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
            <BenchmarkContext text="Industry average: $250K–$500K per physician replacement" />
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
          <BenchmarkContext text="Abridge enterprise customers report $5K–$30K/month in agency spend reduction" />
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Monthly reduction in overtime spend
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.overtimeReduction as number) || 0}
              onChange={(v) => setDomainInput('overtimeReduction', v)}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-overtime-reduction"
            />
          </div>
          <BenchmarkContext text="Abridge enterprise customers report $5K–$20K/month in overtime reduction" />
        </div>
      </div>
    );
  };

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
        <p className="text-sm text-[#888888] italic">
          No additional inputs at this level. Documentation quality improved. Nothing downstream has changed.
        </p>
      );
    }

    if (level === 2) {
      const approach = currentState.inputs.monitoringApproach as string | undefined;
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              How is your organization monitoring documentation quality?
            </label>
            <div className="flex flex-col gap-2.5">
              {MONITORING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDomainInput('monitoringApproach', opt.id)}
                  className={`rounded-lg p-4 text-left text-sm transition-all cursor-pointer ${
                    approach === opt.id
                      ? 'bg-[#EA2C00]/5 border-2 border-[#EA2C00] text-black font-medium'
                      : 'bg-white/80 border border-[#E5E7EB] text-[#525252] hover:border-[#D1D5DB]'
                  }`}
                  data-testid={`radio-monitoring-${opt.id}`}
                >
                  {opt.label}
                </button>
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
                  {QUALITY_ATTRIBUTES.map((attr, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Checkbox
                        id={`quality-attr-${i}`}
                        checked={isChecked('qualityAttributes', i)}
                        onCheckedChange={() => toggleCheckboxItem('qualityAttributes', i)}
                        data-testid={`checkbox-quality-${i}`}
                      />
                      <label htmlFor={`quality-attr-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                        {attr}
                      </label>
                    </div>
                  ))}
                </div>
                <BenchmarkContext text="Abridge customers who begin systematic monitoring typically discover 15–30% improvement in documentation completeness and specificity." />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (level === 3) {
      return (
        <div className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-black mb-3">
              Which downstream workflows have been impacted by improved documentation?
            </label>
            <div className="flex flex-col gap-2.5">
              {DOWNSTREAM_WORKFLOWS.map((wf, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`workflow-${i}`}
                    checked={isChecked('connectedWorkflows', i)}
                    onCheckedChange={() => toggleCheckboxItem('connectedWorkflows', i)}
                    data-testid={`checkbox-workflow-${i}`}
                  />
                  <label htmlFor={`workflow-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                    {wf}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Estimated total hours saved per month across connected workflows
            </label>
            <FormattedNumberInput
              value={(currentState.inputs.workflowHoursSaved as number) || 0}
              onChange={(v) => setDomainInput('workflowHoursSaved', Math.max(0, v))}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-workflow-hours"
            />
            <BenchmarkContext text="Abridge customers with connected workflows report 10–40 hrs/month in combined efficiency gains" />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-black mb-3">
            Where does documentation quality factor into organizational strategy?
          </label>
          <div className="flex flex-col gap-2.5">
            {STRATEGIC_INTEGRATIONS.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Checkbox
                  id={`strategic-${i}`}
                  checked={isChecked('strategicIntegrations', i)}
                  onCheckedChange={() => toggleCheckboxItem('strategicIntegrations', i)}
                  data-testid={`checkbox-strategic-${i}`}
                />
                <label htmlFor={`strategic-${i}`} className="text-sm text-[#525252] cursor-pointer select-none leading-snug">
                  {item}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Can you estimate the annual strategic value?
          </label>
          <p className="text-xs text-[#888888] mb-2">
            This is hard to quantify precisely. If you can estimate the combined value of documentation-driven improvements across payer, quality, compliance, and risk programs — enter it here. If not, leave blank.
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
          <BenchmarkContext text="Abridge enterprise customers at this level report $100K–$500K+ in attributed strategic value" />
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
        key={`header-${activeDomain}`}
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
            <p className="text-[11px] font-medium text-white/70 uppercase tracking-[1.5px] mb-4">
              Estimated Impact
            </p>

            {feedback ? (
              <>
                {renderImpactValue(feedback)}

                <div className="h-px bg-white/10 my-4" />

                <div className="text-sm text-white/80 leading-relaxed mb-4 space-y-2">
                  {feedback.context.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>

                {feedback.footnote && (
                  <p className="text-xs text-white/40 italic leading-relaxed">
                    {feedback.footnote}
                  </p>
                )}

                <FormulaDisplay formula={feedback.formula} />
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

            <p className="text-[10px] font-medium text-white/50 uppercase tracking-[1.5px] mb-3">
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
