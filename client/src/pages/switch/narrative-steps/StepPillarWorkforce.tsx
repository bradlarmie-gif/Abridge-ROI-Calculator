import { useState, useMemo } from "react";
import { ArrowRight, DollarSign, Clock, ShieldAlert, Briefcase, ChevronDown, ChevronUp, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { computePillars } from "@/lib/pillars/computePillars";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import type { ConfidenceLevel } from "@/lib/assessment/assessmentTypes";

interface StepPillarWorkforceProps {
  onNext: () => void;
  onBack: () => void;
}

const AFTER_HOURS_PRESETS = [
  { label: "1 hr", value: 1 },
  { label: "2 hrs", value: 2 },
  { label: "3 hrs", value: 3 },
  { label: "5 hrs", value: 5 },
];

const TURNOVER_OPTIONS: { label: string; value: "low" | "medium" | "high"; description: string }[] = [
  { label: "Low", value: "low", description: "Stable, low attrition" },
  { label: "Medium", value: "medium", description: "Industry-average churn" },
  { label: "High", value: "high", description: "Active retention concern" },
];

const OVERTIME_OPTIONS: { label: string; value: "minimal" | "some" | "material"; description: string }[] = [
  { label: "Minimal", value: "minimal", description: "Rare overtime or agency use" },
  { label: "Some", value: "some", description: "Periodic coverage pressure" },
  { label: "Material", value: "material", description: "Frequent OT or agency staffing" },
];

const SCRIBE_OPTIONS: { label: string; value: "none" | "some" | "heavy"; description: string }[] = [
  { label: "None", value: "none", description: "No scribe dependence" },
  { label: "Some", value: "some", description: "Partial scribe pool" },
  { label: "Heavy", value: "heavy", description: "Full-time scribes per provider" },
];

const CONFIDENCE_OPTIONS: { label: string; value: ConfidenceLevel }[] = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

export default function StepPillarWorkforce({
  onNext,
  onBack,
}: StepPillarWorkforceProps) {
  const { state, dispatch } = useAssessment();
  const { inputs, pillarsMeta } = state;

  const [showCustomAfterHours, setShowCustomAfterHours] = useState(
    !AFTER_HOURS_PRESETS.some((p) => p.value === inputs.afterHoursCharting) && inputs.afterHoursCharting > 0
  );
  const [showConfidenceEdit, setShowConfidenceEdit] = useState(false);
  const [showMethod, setShowMethod] = useState(false);

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const handleAfterHoursPreset = (value: number) => {
    setShowCustomAfterHours(false);
    updateInput("afterHoursCharting", value);
  };

  const handleCustomAfterHours = () => {
    setShowCustomAfterHours(true);
    if (inputs.afterHoursCharting === 0) updateInput("afterHoursCharting", 2);
  };

  const workforceConfidence = pillarsMeta.workforce.confidence;

  const pillarResult = useMemo(() => computePillars(state), [state]);
  const wfDetails = pillarResult.pillars.workforce.details;

  const safeNum = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const annualStability = safeNum(pillarResult.pillars.workforce.valueAnnual);
  const afterHoursRelief = safeNum(wfDetails.afterHoursReliefValue);
  const turnoverRiskValue = safeNum(wfDetails.turnoverRiskValue);
  const overtimeAgencyValue = safeNum(wfDetails.overtimeAgencyValue);

  const hasWorkforceInputs =
    inputs.providers > 0 &&
    inputs.annualEncounters > 0;

  const afterHoursFill = Math.round(((inputs.afterHoursCharting - 0) / (8 - 0)) * 100);

  const isAmbientPath = inputs.solution === "ambient-ai";

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Workforce Stability & Cost Pressure
        </h1>
        <p className="text-base text-[#666666] max-w-lg" data-testid="text-page-subtitle">
          Ambient reduces volatility — after-hours work, overtime pressure, and turnover risk.
        </p>
      </div>

      <section className="space-y-5">
        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8] shadow-sm">
          <label className="block text-[11px] font-medium text-[#999999] uppercase tracking-wider mb-3">
            After-Hours Charting Remaining (hrs/wk/provider)
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {AFTER_HOURS_PRESETS.map((p) => {
              const isActive = !showCustomAfterHours && inputs.afterHoursCharting === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleAfterHoursPreset(p.value)}
                  data-testid={`pills-afterhours-${p.value}`}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#EA2C00] text-white shadow-sm"
                      : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleCustomAfterHours}
              data-testid="pills-afterhours-custom"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                showCustomAfterHours
                  ? "bg-[#EA2C00] text-white shadow-sm"
                  : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
              }`}
            >
              Custom
            </button>
          </div>

          {showCustomAfterHours && (
            <div className="mt-3 bg-white rounded-lg p-4 border border-[#E5E7EB]">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={inputs.afterHoursCharting}
                    onChange={(e) => updateInput("afterHoursCharting", parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${afterHoursFill}%, #E0E0E0 ${afterHoursFill}%, #E0E0E0 100%)`,
                    }}
                    data-testid="slider-afterhours"
                  />
                </div>
                <span className="text-lg font-bold text-[#1A1A1A] min-w-[48px] text-right">
                  {inputs.afterHoursCharting} hrs
                </span>
              </div>
            </div>
          )}
          <p className="text-[10px] text-[#999999] mt-2">
            Average weekly after-hours charting per provider. Industry surveys report 2-5 hrs/wk.
          </p>
        </div>

        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8] shadow-sm">
          <label className="block text-[11px] font-medium text-[#999999] uppercase tracking-wider mb-3">
            Turnover Risk Indicator
          </label>
          <div className="flex flex-wrap gap-2">
            {TURNOVER_OPTIONS.map((opt) => {
              const isActive = inputs.turnoverRisk === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateInput("turnoverRisk", opt.value)}
                  data-testid={`pills-turnover-${opt.value}`}
                  className={`flex-1 min-w-[100px] text-left px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-[#EA2C00] text-white shadow-sm"
                      : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                  }`}
                >
                  <span className="text-sm font-medium block">{opt.label}</span>
                  <span className={`text-[11px] ${isActive ? "text-white/70" : "text-[#999999]"}`}>
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8] shadow-sm">
          <label className="block text-[11px] font-medium text-[#999999] uppercase tracking-wider mb-3">
            Overtime / Agency Sensitivity
          </label>
          <div className="flex flex-wrap gap-2">
            {OVERTIME_OPTIONS.map((opt) => {
              const isActive = inputs.overtimeSensitivity === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateInput("overtimeSensitivity", opt.value)}
                  data-testid={`pills-overtime-${opt.value}`}
                  className={`flex-1 min-w-[100px] text-left px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? "bg-[#EA2C00] text-white shadow-sm"
                      : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                  }`}
                >
                  <span className="text-sm font-medium block">{opt.label}</span>
                  <span className={`text-[11px] ${isActive ? "text-white/70" : "text-[#999999]"}`}>
                    {opt.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {isAmbientPath && (
          <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-medium text-[#999999] uppercase tracking-wider">
                Scribe Reliance (Optional)
              </label>
              <span className="text-[10px] text-[#999999]">Ambient AI comparison context</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SCRIBE_OPTIONS.map((opt) => {
                const isActive = inputs.scribeReliance === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateInput("scribeReliance", opt.value)}
                    data-testid={`pills-scribe-${opt.value}`}
                    className={`flex-1 min-w-[100px] text-left px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-[#EA2C00] text-white shadow-sm"
                        : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                    }`}
                  >
                    <span className="text-sm font-medium block">{opt.label}</span>
                    <span className={`text-[11px] ${isActive ? "text-white/70" : "text-[#999999]"}`}>
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-medium text-[#999999] uppercase tracking-wider">
              Workforce Confidence
            </label>
            <button
              type="button"
              onClick={() => setShowConfidenceEdit(!showConfidenceEdit)}
              className="flex items-center gap-1 text-[11px] text-[#EA2C00] font-medium hover:text-[#D12600] transition-colors"
              data-testid="button-toggle-confidence"
            >
              {showConfidenceEdit ? "Done" : "Change"}
              {showConfidenceEdit ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {!showConfidenceEdit ? (
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#EA2C00]" />
              <span
                className="text-sm font-medium text-[#1A1A1A] capitalize"
                data-testid="value-workforce-confidence"
              >
                {workforceConfidence}
              </span>
              <span className="text-[10px] text-[#999999]">— set in Pressure Map</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {CONFIDENCE_OPTIONS.map((opt) => {
                const isActive = workforceConfidence === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      dispatch(assessmentActions.updatePillarMeta("workforce", "confidence", opt.value))
                    }
                    data-testid={`pills-confidence-${opt.value}`}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#EA2C00] text-white shadow-sm"
                        : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {hasWorkforceInputs && (
        <section className="space-y-3" data-testid="workforce-output-cards">
          <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-sm text-center">
            <DollarSign className="w-6 h-6 text-[#EA2C00] mx-auto mb-2" />
            <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">Annual Stability Value</p>
            <p className="text-3xl font-bold text-[#1A1A1A]" data-testid="value-stability">
              {formatCurrency(Math.round(annualStability))}
            </p>
            <p className="text-[10px] text-[#999999] mt-1">directional, after confidence haircut</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm text-center">
              <Clock className="w-5 h-5 text-[#EA2C00] mx-auto mb-2" />
              <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">After-Hours Relief</p>
              <p className="text-xl font-bold text-[#1A1A1A]" data-testid="value-afterhours-relief">
                {formatCurrency(Math.round(afterHoursRelief))}
              </p>
              <p className="text-[10px] text-[#999999] mt-0.5">pressure reduction</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm text-center">
              <ShieldAlert className="w-5 h-5 text-[#EA2C00] mx-auto mb-2" />
              <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">Turnover Risk Avoided</p>
              <p className="text-xl font-bold text-[#1A1A1A]" data-testid="value-turnover-avoided">
                {formatCurrency(Math.round(turnoverRiskValue))}
              </p>
              <p className="text-[10px] text-[#999999] mt-0.5">retention value</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm text-center">
              <Briefcase className="w-5 h-5 text-[#999999] mx-auto mb-2" />
              <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">Overtime / Agency</p>
              <p className="text-xl font-bold text-[#666666]" data-testid="value-overtime-agency">
                {formatCurrency(Math.round(overtimeAgencyValue))}
              </p>
              <p className="text-[10px] text-[#999999] mt-0.5">directional</p>
            </div>
          </div>
        </section>
      )}

      <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMethod(!showMethod)}
          className="w-full flex items-center justify-between px-5 py-3 bg-[#FAFAFA] text-left transition-colors hover:bg-[#F5F5F5]"
          data-testid="button-toggle-method"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#999999]" />
            <span className="text-xs font-medium text-[#666666] uppercase tracking-wider">Method</span>
          </div>
          {showMethod ? <ChevronUp className="w-4 h-4 text-[#999999]" /> : <ChevronDown className="w-4 h-4 text-[#999999]" />}
        </button>
        {showMethod && (
          <div className="px-5 py-4 bg-white border-t border-[#E5E7EB] space-y-3" data-testid="method-content">
            <p className="text-sm text-[#666666] leading-relaxed">
              This model estimates workforce stability value — not FTE reduction. Ambient documentation
              reduces after-hours charting pressure, which correlates with burnout-driven turnover and
              overtime costs. We do not claim that ambient AI eliminates positions or reduces headcount.
            </p>
            <div className="bg-[#F5F0EB] rounded-lg p-3 space-y-2">
              <p className="text-xs text-[#666666]">
                <span className="font-semibold text-[#1A1A1A]">After-hours relief:</span>{" "}
                45% avoidable fraction applied to reported charting hours, valued at $150/hr fully-loaded rate.
              </p>
              <p className="text-xs text-[#666666]">
                <span className="font-semibold text-[#1A1A1A]">Turnover risk:</span>{" "}
                6% base turnover rate, 40% burnout-attributable, 12% documentation-related reduction,
                scaled by your risk indicator. Capped at 3 prevented departures at $200K replacement cost.
              </p>
              <p className="text-xs text-[#666666]">
                <span className="font-semibold text-[#1A1A1A]">Overtime / agency:</span>{" "}
                Base $8K/provider/year exposure, scaled by sensitivity level and 45% avoidable fraction.
                This is directional — actual savings depend on local labor dynamics.
              </p>
            </div>
            <p className="text-[10px] text-[#999999] italic">
              All values receive a confidence haircut (high: 100%, medium: 70%, low: 40%) before display.
              Conservative by design — we would rather understate than overstate workforce impact.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          onClick={onBack}
          className="text-sm text-[#666666] hover:text-[#1A1A1A] transition-colors"
          data-testid="button-back"
        >
          Back
        </button>
        <Button
          onClick={onNext}
          className="bg-[#EA2C00] hover:bg-[#D12600] text-white border-[#EA2C00] px-6"
          data-testid="button-next-workforce"
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
