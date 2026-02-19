import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import OperationalPerformanceSnapshot from "@/components/OperationalPerformanceSnapshot";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
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

export default function StepPillarYield({
  onNext,
  onBack,
}: StepPillarYieldProps) {
  const { state, dispatch } = useAssessment();
  const { inputs, pillarsMeta } = state;

  const [showCustomFFS, setShowCustomFFS] = useState(
    !FFS_PRESETS.some((p) => p.value === inputs.ffsSharePercent),
  );
  const [showConfidenceEdit, setShowConfidenceEdit] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const handleFFSPreset = (value: number) => {
    setShowCustomFFS(false);
    updateInput("ffsSharePercent", value);
  };

  const pillarResult = useMemo(() => computePillars(state), [state]);
  const y = pillarResult.pillars.yield;
  const d = y.details;

  const safeNum = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const conservativeValue = y.valueAnnual;
  const modeledValue = safeNum(d.rawValue);
  const haircutMult = safeNum(d.confidenceHaircut);
  const haircutPct = Math.round((1 - haircutMult) * 100);
  const confidencePct = Math.round(haircutMult * 100);
  const isZero = conservativeValue === 0 && modeledValue === 0;

  const revenuePerEncounter = safeNum(d.revenuePerEncounter);
  const eUsed = safeNum(d.eUsed);
  const recognizedBase = eUsed * revenuePerEncounter;
  const yieldLiftPct = safeNum(d.yieldLiftPct);
  const eligibleExposure = recognizedBase * (yieldLiftPct / 100);

  const ffsShare = safeNum(d.ffsShare);
  const vbcShare = safeNum(d.vbcShare);
  const ffsFill = Math.round(inputs.ffsSharePercent);

  const yieldDeltaWeight = yieldLiftPct > 0 ? Math.min(100, Math.round((yieldLiftPct / 2) * 100)) : 0;
  const revenueModelWeight = Math.round(
    ffsShare * safeNum(d.ffsAttribution) * 100 * 0.6 +
    vbcShare * safeNum(d.vbcAttribution) * 100 * 0.4
  );
  const confidenceWeight = confidencePct;

  const yieldConfidence = pillarsMeta.yield.confidence;

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <div className="mb-10">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Revenue & Yield
        </h1>
        {!isZero && (
          <div className="mt-4 mb-2 space-y-2" data-testid="text-loss-frame">
            <p className="text-base text-[#1A1A1A] leading-relaxed">
              Your documentation fidelity is currently leaving approximately{" "}
              <span className="font-semibold tabular-nums">{formatCurrency(Math.round(conservativeValue))}</span> in reimbursement accuracy on the table.
            </p>
            <p className="text-sm text-[#666]">
              This is not revenue you haven't earned. It is revenue you've earned and failed to capture.
            </p>
          </div>
        )}
        {isZero && (
          <p className="text-base text-[#888] leading-relaxed max-w-lg" data-testid="text-page-subtitle">
            Documentation fidelity determines yield accuracy — not just coding lift.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-10">
        <div className="space-y-10">
          <div className="bg-[#F5F0EB] rounded-2xl p-6 border border-[#E8E0D8]" data-testid="hero-yield">
            {isZero ? (
              <div>
                <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-2">Conservative Value</p>
                <p className="text-4xl font-bold text-[#CCC] leading-none" data-testid="value-yield-conservative">
                  &mdash;
                </p>
                <p className="text-sm text-[#999] mt-3" data-testid="text-zero-prompt">
                  Set yield uplift and coverage to generate a modeled value.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-1.5">Conservative Value</p>
                  <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A] tabular-nums leading-none" data-testid="value-yield-conservative">
                    {formatCurrency(Math.round(conservativeValue))}
                  </p>
                  <p className="text-[11px] text-[#999] mt-2" data-testid="text-haircut-note">
                    Displayed after {haircutPct}% confidence adjustment.
                  </p>
                </div>

                <div className="mt-5">
                  <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-1">Modeled Value</p>
                  <p className="text-xl font-semibold text-[#888] tabular-nums leading-none" data-testid="value-yield-modeled">
                    {formatCurrency(Math.round(modeledValue))}
                  </p>
                  <p className="text-[11px] text-[#999] mt-1">Pre-adjustment model output</p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#E8E0D8] space-y-2">
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10px] text-[#999] uppercase tracking-wider">Recognized revenue base</p>
                    <p className="text-sm font-semibold text-[#1A1A1A] tabular-nums" data-testid="value-revenue-base">
                      {formatCurrency(Math.round(recognizedBase))}
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10px] text-[#999] uppercase tracking-wider">Eligible revenue exposure</p>
                    <p className="text-sm font-semibold text-[#1A1A1A] tabular-nums" data-testid="value-revenue-exposure">
                      {formatCurrency(Math.round(eligibleExposure))}
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
              label="Documentation yield delta"
              description={`${yieldLiftPct.toFixed(1)}% uplift per encounter from improved documentation`}
              pct={yieldDeltaWeight}
            />
            <DriverRow
              label="Revenue model exposure"
              description={`${Math.round(ffsShare * 100)}% FFS / ${Math.round(vbcShare * 100)}% VBC with attribution-weighted blending`}
              pct={revenueModelWeight}
            />
            <DriverRow
              label="Confidence baseline"
              description="Haircut applied to model output for defensibility"
              pct={confidenceWeight}
            />
          </div>

          <div className="hidden lg:block">
            <StepFooter onBack={onBack} onNext={onNext} nextLabel="See Workforce Impact" nextTestId="button-next-yield" />
          </div>
        </div>

        <div className="lg:sticky lg:top-24 self-start" data-testid="panel-assumptions">
          <div className="rounded-2xl border border-[#E8E0D8] bg-[#F9F7F4] p-4 space-y-4">
            <p className="text-[10px] font-medium text-[#AAA] uppercase tracking-wider">Assumptions</p>

            <div>
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Yield delta</label>
              <div className="flex flex-wrap gap-1.5">
                {YIELD_PRESETS.map((p) => {
                  const isActive = Math.abs(inputs.yieldUpliftPercent - p.value) < 0.01;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => updateInput("yieldUpliftPercent", p.value)}
                      data-testid={`pills-yield-${p.value}`}
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
              </div>
              <p className="text-[10px] text-[#999] mt-1">
                Capped at 2.0% per encounter to remain defensible.
              </p>
            </div>

            <div className="border-t border-[#E8E0D8]/60 pt-3">
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Revenue model exposure</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {FFS_PRESETS.map((p) => {
                  const isActive = !showCustomFFS && inputs.ffsSharePercent === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleFFSPreset(p.value)}
                      data-testid={`pills-ffs-${p.value}`}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        isActive
                          ? "bg-[#EA2C00] text-white"
                          : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                      }`}
                    >
                      FFS {p.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setShowCustomFFS(true)}
                  data-testid="pills-ffs-custom"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    showCustomFFS
                      ? "bg-[#EA2C00] text-white"
                      : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                  }`}
                >
                  Custom
                </button>
              </div>

              {showCustomFFS && (
                <div className="bg-white rounded-lg p-2.5 border border-[#E5E7EB] mt-1.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={inputs.ffsSharePercent}
                      onChange={(e) => updateInput("ffsSharePercent", parseFloat(e.target.value))}
                      className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${ffsFill}%, #E0E0E0 ${ffsFill}%, #E0E0E0 100%)`,
                      }}
                      data-testid="slider-ffs"
                    />
                    <span className="text-xs font-bold text-[#1A1A1A] min-w-[36px] text-right tabular-nums">
                      {inputs.ffsSharePercent}%
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 text-[10px] text-[#999]">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#EA2C00]" />
                  FFS {inputs.ffsSharePercent}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#999]" />
                  VBC {100 - inputs.ffsSharePercent}%
                </span>
              </div>
            </div>

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
                    data-testid="value-yield-confidence"
                  >
                    {yieldConfidence}
                  </span>
                  <span className="text-[10px] text-[#999]">inherited from calibration</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
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
        <StepFooter onBack={onBack} onNext={onNext} nextLabel="See Workforce Impact" nextTestId="button-next-yield" />
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
