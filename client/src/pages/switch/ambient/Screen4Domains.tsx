import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { formatDollar } from "./ambientCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import {
  type Domain, type ActivationLevel,
  DOMAIN_ORDER, DOMAIN_LABELS,
  computeDomainScore,
  computeCapacityFeedback, computeRevenueFeedback,
  computeWorkforceFeedback, computeRiskFeedback,
  type DomainFeedback,
} from "./domainCalculations";

interface Screen4Props {
  onNext: () => void;
  onBack: () => void;
}

const DOMAIN_CTA: Record<Domain, string> = {
  capacity: 'See Revenue Impact \u2192',
  revenue: 'See Workforce Impact \u2192',
  workforce: 'See Risk Exposure \u2192',
  risk: 'See My Score \u2192',
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
      { level: 1, label: 'Cleaner Clinical Notes', description: 'Note quality improved. Audit posture unchanged.' },
      { level: 2, label: 'Audit Awareness', description: 'Documentation defensibility actively under review.' },
      { level: 3, label: 'Compliance Reporting Streamlined', description: 'Reporting and abstraction workload measurably reduced.' },
      { level: 4, label: 'Governed Compliance Infrastructure', description: 'Compliance review integrated with structured data strategy.' },
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

  const timeSavedSliderSet = (currentState.inputs.timeSaved as number) > 0;
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

        <div className="text-center mb-3">
          {timeSavedSliderSet && !unmeasuredTimeChecked ? (
            <span className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{timeSavedValue.toFixed(1)} min</span>
          ) : (
            <span className="text-3xl font-bold text-[#CCCCCC]">— min</span>
          )}
        </div>

        {!unmeasuredTimeChecked && (
          <Slider
            min={1}
            max={8}
            step={0.5}
            value={[timeSavedValue || 3]}
            onValueChange={(v) => setDomainInput('timeSaved', v[0])}
            className="w-full mb-3"
            dormant={!timeSavedSliderSet}
            data-testid="slider-time-saved"
          />
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
      const redeploySet = (currentState.inputs.redeploymentRate as number) > 0;
      return (
        <>
          {timeSavedSection}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              Estimated redeployment rate
            </label>
            <p className="text-sm text-[#888888] mb-3">What % of recovered time is being used for additional patient access?</p>
            <div className="text-center mb-3">
              {redeploySet ? (
                <span className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{currentState.inputs.redeploymentRate}%</span>
              ) : (
                <span className="text-3xl font-bold text-[#CCCCCC]">— %</span>
              )}
            </div>
            <Slider
              min={5}
              max={50}
              step={1}
              value={[(currentState.inputs.redeploymentRate as number) || 15]}
              onValueChange={(v) => setDomainInput('redeploymentRate', v[0])}
              className="w-full"
              dormant={!redeploySet}
              data-testid="slider-redeployment"
            />
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
      const yieldSet = (currentState.inputs.yieldImprovement as number) > 0;
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Estimated improvement in coding yield
          </label>
          <p className="text-sm text-[#888888] mb-3">Estimated improvement in coding yield since deployment</p>
          <div className="text-center mb-3">
            {yieldSet ? (
              <span className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{currentState.inputs.yieldImprovement}%</span>
            ) : (
              <span className="text-3xl font-bold text-[#CCCCCC]">— %</span>
            )}
          </div>
          <Slider
            min={0.5}
            max={5}
            step={0.1}
            value={[(currentState.inputs.yieldImprovement as number) || 1]}
            onValueChange={(v) => setDomainInput('yieldImprovement', v[0])}
            className="w-full"
            dormant={!yieldSet}
            data-testid="slider-yield-improvement"
          />
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
      const afterHoursSet = (currentState.inputs.afterHoursReduction as number) > 0;
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Estimated hours per provider per week of after-hours documentation reduced
          </label>
          <div className="text-center mb-3">
            {afterHoursSet ? (
              <span className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{currentState.inputs.afterHoursReduction} hrs/wk</span>
            ) : (
              <span className="text-3xl font-bold text-[#CCCCCC]">— hrs/wk</span>
            )}
          </div>
          <Slider
            min={0.5}
            max={5}
            step={0.5}
            value={[(currentState.inputs.afterHoursReduction as number) || 2]}
            onValueChange={(v) => setDomainInput('afterHoursReduction', v[0])}
            className="w-full"
            dormant={!afterHoursSet}
            data-testid="slider-after-hours"
          />
          <BenchmarkContext text="Abridge deployments report 1–3 hrs/week reduction in after-hours documentation" />
        </div>
      );
    }

    if (level === 2) {
      const editTimeSet = (currentState.inputs.editTimeSaved as number) > 0;
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Minutes saved per provider per day in chart editing, correction, and reconciliation
          </label>
          <div className="text-center mb-3">
            {editTimeSet ? (
              <span className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{currentState.inputs.editTimeSaved} min/day</span>
            ) : (
              <span className="text-3xl font-bold text-[#CCCCCC]">— min/day</span>
            )}
          </div>
          <Slider
            min={5}
            max={30}
            step={1}
            value={[(currentState.inputs.editTimeSaved as number) || 15]}
            onValueChange={(v) => setDomainInput('editTimeSaved', v[0])}
            className="w-full"
            dormant={!editTimeSet}
            data-testid="slider-edit-time"
          />
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

  const renderRiskInputs = () => {
    const level = currentState.activationLevel;
    if (!level) return null;

    if (level === 1) {
      return (
        <p className="text-sm text-[#888888] italic">
          No additional inputs at this level. Documentation quality has improved, but audit infrastructure hasn't changed.
        </p>
      );
    }

    if (level === 2) {
      const defenseSet = (currentState.inputs.defensibilityImprovement as number) > 0;
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Estimated improvement in documentation defensibility since deployment
          </label>
          <div className="text-center mb-3">
            {defenseSet ? (
              <span className="text-3xl font-bold text-[#1A1A1A] tabular-nums">{currentState.inputs.defensibilityImprovement}%</span>
            ) : (
              <span className="text-3xl font-bold text-[#CCCCCC]">— %</span>
            )}
          </div>
          <Slider
            min={5}
            max={30}
            step={1}
            value={[(currentState.inputs.defensibilityImprovement as number) || 10]}
            onValueChange={(v) => setDomainInput('defensibilityImprovement', v[0])}
            className="w-full"
            dormant={!defenseSet}
            data-testid="slider-defensibility"
          />
          <BenchmarkContext text="Abridge customers actively reviewing defensibility estimate 10–20% improvement" />
        </div>
      );
    }

    if (level === 3) {
      return (
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Hours saved per month in compliance/quality reporting and chart abstraction
          </label>
          <FormattedNumberInput
            value={(currentState.inputs.reportingHoursSaved as number) || 0}
            onChange={(v) => setDomainInput('reportingHoursSaved', v)}
            placeholder=""
            className="w-full h-12 bg-white border-[#E5E7EB]"
            data-testid="input-reporting-hours"
          />
          <BenchmarkContext text="Abridge customers report 10–40 hrs/month in compliance reporting and abstraction time savings" />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Reduction in documentation-related audit findings since deployment
          </label>
          <div className="flex items-center gap-2">
            <FormattedNumberInput
              value={(currentState.inputs.auditFindingsReduced as number) || 0}
              onChange={(v) => setDomainInput('auditFindingsReduced', v)}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-audit-findings"
            />
            <span className="text-sm text-[#888888]">%</span>
          </div>
          <BenchmarkContext text="Abridge enterprise customers report 15–30% reduction in documentation-related audit findings" />
        </div>
        <div>
          <label className="block text-sm font-medium text-black mb-1">
            Estimated annual compliance exposure
          </label>
          <p className="text-xs text-[#888888] mb-2">Revenue change tied to documentation improvements, recognized in financial reporting</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#888888]">$</span>
            <FormattedNumberInput
              value={(currentState.inputs.complianceExposure as number) || 0}
              onChange={(v) => setDomainInput('complianceExposure', v)}
              placeholder=""
              className="w-full h-12 bg-white border-[#E5E7EB]"
              data-testid="input-compliance-exposure"
            />
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

                <p className="text-sm text-white/80 leading-relaxed mb-4">
                  {feedback.context}
                </p>

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
