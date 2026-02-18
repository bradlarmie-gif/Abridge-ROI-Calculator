import { useState, useMemo } from "react";
import { ArrowRight, DollarSign, TrendingDown, Tag, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { computePillars } from "@/lib/pillars/computePillars";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import type { ConfidenceLevel } from "@/lib/assessment/assessmentTypes";

interface StepPillarYieldProps {
  onNext: () => void;
  onBack: () => void;
}

const YIELD_PRESETS = [
  { label: "0%", value: 0 },
  { label: "+0.5%", value: 0.5 },
  { label: "+1.0%", value: 1.0 },
  { label: "+2.0%", value: 2.0 },
];

const FFS_PRESETS = [
  { label: "50%", value: 50 },
  { label: "70%", value: 70 },
  { label: "90%", value: 90 },
];

const CONFIDENCE_OPTIONS: { label: string; value: ConfidenceLevel }[] = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const LEVER_LABELS: Record<string, { label: string; description: string }> = {
  completeness: { label: "Completeness", description: "Closing documentation gaps across encounters" },
  specificity: { label: "Specificity", description: "Improving code precision and detail fidelity" },
  "risk capture": { label: "Risk Capture", description: "Surfacing HCC/RAF-relevant conditions accurately" },
};

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

export default function StepPillarYield({
  onNext,
  onBack,
}: StepPillarYieldProps) {
  const { state, dispatch } = useAssessment();
  const { inputs, pillarsMeta } = state;

  const [showCustomFFS, setShowCustomFFS] = useState(
    !FFS_PRESETS.some((p) => p.value === inputs.ffsSharePercent)
  );
  const [showConfidenceEdit, setShowConfidenceEdit] = useState(false);

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const handleFFSPreset = (value: number) => {
    setShowCustomFFS(false);
    updateInput("ffsSharePercent", value);
  };

  const handleCustomFFS = () => {
    setShowCustomFFS(true);
  };

  const yieldConfidence = pillarsMeta.yield.confidence;

  const pillarResult = useMemo(() => computePillars(state), [state]);
  const yieldDetails = pillarResult.pillars.yield.details;

  const safeNum = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const annualGain = safeNum(pillarResult.pillars.yield.valueAnnual);
  const leakageRemaining = safeNum(yieldDetails.leakageRemaining);
  const primaryLever = (yieldDetails.primaryLever as string) || "completeness";

  const hasYieldInputs =
    inputs.providers > 0 &&
    inputs.annualEncounters > 0 &&
    inputs.yieldUpliftPercent > 0 &&
    inputs.utilization > 0;

  const ffsFill = Math.round(inputs.ffsSharePercent);
  const vbcShare = 100 - inputs.ffsSharePercent;

  const leverInfo = LEVER_LABELS[primaryLever] || LEVER_LABELS.completeness;

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Revenue Integrity & Yield
        </h1>
        <p className="text-base text-[#666666] max-w-lg" data-testid="text-page-subtitle">
          Documentation fidelity determines yield accuracy — not just coding lift.
        </p>
      </div>

      <section className="space-y-5">
        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8] shadow-sm">
          <label className="block text-[11px] font-medium text-[#999999] uppercase tracking-wider mb-3">
            Yield Uplift (Modeled with Guardrails)
          </label>
          <div className="flex flex-wrap gap-2">
            {YIELD_PRESETS.map((p) => {
              const isActive = Math.abs(inputs.yieldUpliftPercent - p.value) < 0.01;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => updateInput("yieldUpliftPercent", p.value)}
                  data-testid={`pills-yield-${p.value}`}
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
          </div>
          <p className="text-[10px] text-[#999999] mt-2">
            Directional — capped at 2.0% per encounter to remain defensible.
          </p>
        </div>

        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8] shadow-sm">
          <label className="block text-[11px] font-medium text-[#999999] uppercase tracking-wider mb-3">
            Revenue Model Exposure
          </label>

          <div className="mb-3">
            <span className="text-xs text-[#666666] font-medium">Fee-for-Service (FFS) Share</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {FFS_PRESETS.map((p) => {
              const isActive = !showCustomFFS && inputs.ffsSharePercent === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handleFFSPreset(p.value)}
                  data-testid={`pills-ffs-${p.value}`}
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
              onClick={handleCustomFFS}
              data-testid="pills-ffs-custom"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                showCustomFFS
                  ? "bg-[#EA2C00] text-white shadow-sm"
                  : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
              }`}
            >
              Custom
            </button>
          </div>

          {showCustomFFS && (
            <div className="mt-3 bg-white rounded-lg p-4 border border-[#E5E7EB]">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={inputs.ffsSharePercent}
                    onChange={(e) => updateInput("ffsSharePercent", parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${ffsFill}%, #E0E0E0 ${ffsFill}%, #E0E0E0 100%)`,
                    }}
                    data-testid="slider-ffs"
                  />
                </div>
                <span className="text-lg font-bold text-[#1A1A1A] min-w-[48px] text-right">
                  {inputs.ffsSharePercent}%
                </span>
              </div>
            </div>
          )}

          <div className="mt-3 bg-white rounded-lg p-3 border border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-xs text-[#999999]">FFS</p>
                  <p className="text-sm font-bold text-[#1A1A1A]" data-testid="value-ffs-share">{inputs.ffsSharePercent}%</p>
                </div>
                <div className="w-px h-8 bg-[#E5E7EB]" />
                <div className="text-center">
                  <p className="text-xs text-[#999999]">VBC / Risk-Adjusted</p>
                  <p className="text-sm font-bold text-[#1A1A1A]" data-testid="value-vbc-share">{vbcShare}%</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 rounded-full bg-[#EA2C00]"
                  style={{ width: `${Math.max(8, ffsFill * 0.8)}px` }}
                />
                <div
                  className="h-2 rounded-full bg-[#999999]"
                  style={{ width: `${Math.max(8, vbcShare * 0.8)}px` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-medium text-[#999999] uppercase tracking-wider">
              Yield Confidence
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
                data-testid="value-yield-confidence"
              >
                {yieldConfidence}
              </span>
              <span className="text-[10px] text-[#999999]">— set in Pressure Map</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {CONFIDENCE_OPTIONS.map((opt) => {
                const isActive = yieldConfidence === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      dispatch(assessmentActions.updatePillarMeta("yield", "confidence", opt.value))
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

      {hasYieldInputs && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="yield-output-cards">
          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm text-center">
            <DollarSign className="w-5 h-5 text-[#EA2C00] mx-auto mb-2" />
            <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">Annual Yield Integrity Gain</p>
            <p className="text-2xl font-bold text-[#1A1A1A]" data-testid="value-yield-gain">
              {formatCurrency(Math.round(annualGain))}
            </p>
            <p className="text-[10px] text-[#999999] mt-0.5">directional, after confidence haircut</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm text-center">
            <TrendingDown className="w-5 h-5 text-[#999999] mx-auto mb-2" />
            <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">Leakage Remaining</p>
            <p className="text-2xl font-bold text-[#666666]" data-testid="value-leakage">
              {formatCurrency(Math.round(leakageRemaining))}
            </p>
            <p className="text-[10px] text-[#999999] mt-0.5">vs. benchmark (directional)</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] shadow-sm text-center">
            <Tag className="w-5 h-5 text-[#EA2C00] mx-auto mb-2" />
            <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">Primary Lever</p>
            <p className="text-lg font-bold text-[#1A1A1A] capitalize" data-testid="value-primary-lever">
              {leverInfo.label}
            </p>
            <p className="text-[10px] text-[#999999] mt-0.5">{leverInfo.description}</p>
          </div>
        </section>
      )}

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
          data-testid="button-next-yield"
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
