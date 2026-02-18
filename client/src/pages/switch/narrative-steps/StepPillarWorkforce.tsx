import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import OperationalPerformanceSnapshot from "@/components/OperationalPerformanceSnapshot";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
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

const TURNOVER_OPTIONS: { label: string; value: "low" | "medium" | "high"; desc: string }[] = [
  { label: "Low", value: "low", desc: "Stable" },
  { label: "Medium", value: "medium", desc: "Avg churn" },
  { label: "High", value: "high", desc: "Active concern" },
];

const OVERTIME_OPTIONS: { label: string; value: "minimal" | "some" | "material"; desc: string }[] = [
  { label: "Minimal", value: "minimal", desc: "Rare OT" },
  { label: "Some", value: "some", desc: "Periodic" },
  { label: "Material", value: "material", desc: "Frequent" },
];

const SCRIBE_OPTIONS: { label: string; value: "none" | "some" | "heavy"; desc: string }[] = [
  { label: "None", value: "none", desc: "No scribes" },
  { label: "Some", value: "some", desc: "Partial pool" },
  { label: "Heavy", value: "heavy", desc: "Full-time" },
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

function DriverRow({
  label,
  description,
  pct,
}: {
  label: string;
  description: string;
  pct: number;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-medium text-[#1A1A1A]">{label}</span>
          <p className="text-[11px] text-[#999] leading-tight mt-0.5">{description}</p>
        </div>
        <span className="text-xs font-semibold text-[#555] tabular-nums shrink-0">{clamped}%</span>
      </div>
      <div className="h-1 bg-[#EDEAE5] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#EA2C00] rounded-full transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default function StepPillarWorkforce({
  onNext,
  onBack,
}: StepPillarWorkforceProps) {
  const { state, dispatch } = useAssessment();
  const { inputs, pillarsMeta } = state;

  const [showCustomAfterHours, setShowCustomAfterHours] = useState(
    !AFTER_HOURS_PRESETS.some((p) => p.value === inputs.afterHoursCharting) && inputs.afterHoursCharting > 0,
  );
  const [showConfidenceEdit, setShowConfidenceEdit] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const handleAfterHoursPreset = (value: number) => {
    setShowCustomAfterHours(false);
    updateInput("afterHoursCharting", value);
  };

  const pillarResult = useMemo(() => computePillars(state), [state]);
  const wf = pillarResult.pillars.workforce;
  const d = wf.details;

  const safeNum = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const conservativeValue = wf.valueAnnual;
  const rawValue = safeNum(d.rawValue);
  const haircutMult = safeNum(d.confidenceHaircut);
  const confidencePct = Math.round(haircutMult * 100);
  const isZero = conservativeValue === 0 && rawValue === 0;

  const afterHoursRelief = safeNum(d.afterHoursReliefValue);
  const turnoverRiskValue = safeNum(d.turnoverRiskValue);
  const overtimeAgencyValue = safeNum(d.overtimeAgencyValue);
  const scribeSavings = safeNum(d.scribeSavings);

  const totalVolatility = afterHoursRelief + turnoverRiskValue + overtimeAgencyValue + scribeSavings;
  const avoidablePortion = rawValue;

  const totalForWeight = afterHoursRelief + turnoverRiskValue + overtimeAgencyValue + scribeSavings;
  const afterHoursWeight = totalForWeight > 0 ? Math.round((afterHoursRelief / totalForWeight) * 100) : 33;
  const turnoverWeight = totalForWeight > 0 ? Math.round((turnoverRiskValue / totalForWeight) * 100) : 33;
  const premiumWeight = totalForWeight > 0 ? Math.round(((overtimeAgencyValue + scribeSavings) / totalForWeight) * 100) : 34;

  const workforceConfidence = pillarsMeta.workforce.confidence;
  const afterHoursFill = Math.round((inputs.afterHoursCharting / 8) * 100);
  const isAmbientPath = inputs.solution === "ambient-ai";

  // Fix: inline the haircutPct computation properly
  const haircutPctVal = Math.round((1 - haircutMult) * 100);

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <div className="mb-10">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Workforce Stability Impact
        </h1>
        <p className="text-base text-[#888] leading-relaxed max-w-lg" data-testid="text-page-subtitle">
          Ambient reduces labor volatility — after-hours burden, turnover exposure, and premium staffing pressure.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-10">
        <div className="space-y-10">
          <div className="bg-[#F5F0EB] rounded-2xl p-6 border border-[#E8E0D8]" data-testid="hero-workforce">
            {isZero ? (
              <div>
                <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-2">Conservative Value</p>
                <p className="text-4xl font-bold text-[#CCC] leading-none" data-testid="value-wf-conservative">
                  &mdash;
                </p>
                <p className="text-sm text-[#999] mt-3" data-testid="text-zero-prompt">
                  Enter baseline assumptions to generate modeled value.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-1.5">Conservative Value</p>
                  <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A] tabular-nums leading-none" data-testid="value-wf-conservative">
                    {formatCurrency(Math.round(conservativeValue))}
                  </p>
                  <p className="text-[11px] text-[#999] mt-2" data-testid="text-haircut-note">
                    Displayed after {haircutPctVal}% confidence adjustment.
                  </p>
                </div>

                <div className="mt-5">
                  <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-1">Modeled Value</p>
                  <p className="text-xl font-semibold text-[#888] tabular-nums leading-none" data-testid="value-wf-modeled">
                    {formatCurrency(Math.round(rawValue))}
                  </p>
                  <p className="text-[11px] text-[#999] mt-1">Pre-adjustment model output</p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#E8E0D8] space-y-2">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10px] text-[#999] uppercase tracking-wider">Annual labor volatility exposure</p>
                    <p className="text-sm font-semibold text-[#1A1A1A] tabular-nums" data-testid="value-volatility">
                      {formatCurrency(Math.round(totalVolatility))}
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10px] text-[#999] uppercase tracking-wider">Avoidable portion modeled</p>
                    <p className="text-sm font-semibold text-[#1A1A1A] tabular-nums" data-testid="value-avoidable">
                      {formatCurrency(Math.round(avoidablePortion))}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E8E0D8]">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider">Confidence baseline: {confidencePct}%</p>
                    <p className="text-[11px] text-[#999]" data-testid="text-confidence-value">Displayed value reflects conservative haircut.</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-5" data-testid="section-drivers">
            <DriverRow
              label="After-hours burden"
              description={`${inputs.afterHoursCharting} hrs/wk charting pressure per provider, 45% avoidable`}
              pct={afterHoursWeight}
            />
            <DriverRow
              label="Turnover exposure"
              description={`${inputs.turnoverRisk ?? "medium"} risk indicator — burnout-driven departure avoidance`}
              pct={turnoverWeight}
            />
            <DriverRow
              label="Premium labor sensitivity"
              description={`Overtime, agency staffing${scribeSavings > 0 ? ", and scribe displacement" : ""} pressure`}
              pct={premiumWeight}
            />
          </div>

          <div className="hidden lg:block">
            <StepFooter onBack={onBack} onNext={onNext} nextTestId="button-next-workforce" />
          </div>
        </div>

        <div className="lg:sticky lg:top-24 self-start" data-testid="panel-assumptions">
          <div className="rounded-2xl border border-[#E8E0D8] bg-[#F9F7F4] p-4 space-y-4">
            <p className="text-[10px] font-medium text-[#AAA] uppercase tracking-wider">Assumptions</p>

            <div>
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">After-hours charting</label>
              <div className="flex flex-wrap gap-1.5">
                {AFTER_HOURS_PRESETS.map((p) => {
                  const isActive = !showCustomAfterHours && inputs.afterHoursCharting === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleAfterHoursPreset(p.value)}
                      data-testid={`pills-afterhours-${p.value}`}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        isActive
                          ? "bg-[#EA2C00] text-white"
                          : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomAfterHours(true);
                    if (inputs.afterHoursCharting === 0) updateInput("afterHoursCharting", 2);
                  }}
                  data-testid="pills-afterhours-custom"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    showCustomAfterHours
                      ? "bg-[#EA2C00] text-white"
                      : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                  }`}
                >
                  Custom
                </button>
              </div>
              {showCustomAfterHours && (
                <div className="bg-white rounded-lg p-2.5 border border-[#E5E7EB] mt-1.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={0.5}
                      value={inputs.afterHoursCharting}
                      onChange={(e) => updateInput("afterHoursCharting", parseFloat(e.target.value))}
                      className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${afterHoursFill}%, #E0E0E0 ${afterHoursFill}%, #E0E0E0 100%)`,
                      }}
                      data-testid="slider-afterhours"
                    />
                    <span className="text-xs font-bold text-[#1A1A1A] min-w-[40px] text-right tabular-nums">
                      {inputs.afterHoursCharting} hrs
                    </span>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-[#999] mt-1">hrs/wk/provider remaining after-hours</p>
            </div>

            <div className="border-t border-[#E8E0D8]/60 pt-3">
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Turnover risk</label>
              <div className="flex flex-wrap gap-1.5">
                {TURNOVER_OPTIONS.map((opt) => {
                  const isActive = inputs.turnoverRisk === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateInput("turnoverRisk", opt.value)}
                      data-testid={`pills-turnover-${opt.value}`}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        isActive
                          ? "bg-[#EA2C00] text-white"
                          : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                      }`}
                    >
                      {opt.label} <span className="opacity-70 ml-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#E8E0D8]/60 pt-3">
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Overtime / agency</label>
              <div className="flex flex-wrap gap-1.5">
                {OVERTIME_OPTIONS.map((opt) => {
                  const isActive = inputs.overtimeSensitivity === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateInput("overtimeSensitivity", opt.value)}
                      data-testid={`pills-overtime-${opt.value}`}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        isActive
                          ? "bg-[#EA2C00] text-white"
                          : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                      }`}
                    >
                      {opt.label} <span className="opacity-70 ml-0.5">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isAmbientPath && (
              <div className="border-t border-[#E8E0D8]/60 pt-3">
                <label className="block text-[11px] font-medium text-[#555] mb-1.5">Scribe reliance</label>
                <div className="flex flex-wrap gap-1.5">
                  {SCRIBE_OPTIONS.map((opt) => {
                    const isActive = inputs.scribeReliance === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateInput("scribeReliance", opt.value)}
                        data-testid={`pills-scribe-${opt.value}`}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          isActive
                            ? "bg-[#EA2C00] text-white"
                            : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                        }`}
                      >
                        {opt.label} <span className="opacity-70 ml-0.5">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-[#E8E0D8]/60 pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-[#555]">Confidence</label>
                <button
                  type="button"
                  onClick={() => setShowConfidenceEdit(!showConfidenceEdit)}
                  className="flex items-center gap-0.5 text-[10px] text-[#EA2C00] font-medium hover:text-[#D12600] transition-colors"
                  data-testid="button-toggle-confidence"
                >
                  {showConfidenceEdit ? "Done" : "Adjust"}
                  {showConfidenceEdit ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {!showConfidenceEdit ? (
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-semibold text-[#1A1A1A] capitalize"
                    data-testid="value-workforce-confidence"
                  >
                    {workforceConfidence}
                  </span>
                  <span className="text-[10px] text-[#999]">inherited from calibration</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
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
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          isActive
                            ? "bg-[#EA2C00] text-white"
                            : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[#E8E0D8]/60 pt-3">
              <button
                type="button"
                onClick={() => setShowSnapshot(true)}
                className="flex items-center gap-1.5 text-[10px] text-[#999] hover:text-[#EA2C00] transition-colors w-full justify-center"
                data-testid="button-advanced-inputs"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Advanced Inputs</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden mt-10">
        <StepFooter onBack={onBack} onNext={onNext} nextTestId="button-next-workforce" />
      </div>

      {showSnapshot && (
        <OperationalPerformanceSnapshot
          inputs={state.inputs}
          updateInput={updateInput}
          onClose={() => setShowSnapshot(false)}
        />
      )}
    </div>
  );
}
