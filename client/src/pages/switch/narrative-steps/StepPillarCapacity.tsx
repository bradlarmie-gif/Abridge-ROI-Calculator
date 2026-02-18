import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { computePillars } from "@/lib/pillars/computePillars";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import type { DeployIntentOption } from "@/lib/switchGapCalculator";

interface StepPillarCapacityProps {
  onNext: () => void;
  onBack: () => void;
}

const COVERAGE_PRESETS = [
  { label: "40%", value: 40 },
  { label: "60%", value: 60 },
  { label: "75%", value: 75 },
  { label: "85%", value: 85 },
];

type FrictionPreset = "flat" | "modest" | "strong" | "custom";

const FRICTION_MAP: Record<Exclude<FrictionPreset, "custom">, { saved: number; edit: number }> = {
  flat: { saved: 0, edit: 0 },
  modest: { saved: 2.5, edit: 1 },
  strong: { saved: 4, edit: 1 },
};

const DEPLOY_OPTIONS: { label: string; value: DeployIntentOption; description: string }[] = [
  { label: "Reduce backlog", value: "reduce-backlog", description: "Clear scheduling backlog" },
  { label: "Grow visits", value: "grow-visits", description: "Add net new patients" },
  { label: "Protect clinician time", value: "protect-time", description: "Keep reclaimed time" },
  { label: "Not sure yet", value: "not-sure", description: "Conservative blend" },
];

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString()}K`;
  return n.toLocaleString();
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

export default function StepPillarCapacity({
  onNext,
  onBack,
}: StepPillarCapacityProps) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;

  const [showCustomCoverage, setShowCustomCoverage] = useState(
    !COVERAGE_PRESETS.some((p) => p.value === inputs.utilization) && inputs.utilization > 0,
  );
  const [showAdvancedFriction, setShowAdvancedFriction] = useState(false);

  const activeFrictionPreset = useMemo((): FrictionPreset => {
    if (showAdvancedFriction) return "custom";
    for (const [key, val] of Object.entries(FRICTION_MAP)) {
      if (
        Math.abs(inputs.timeSavedPerEncounter - val.saved) < 0.01 &&
        Math.abs(inputs.editTimePerEncounter - val.edit) < 0.01
      )
        return key as FrictionPreset;
    }
    return "custom";
  }, [inputs.timeSavedPerEncounter, inputs.editTimePerEncounter, showAdvancedFriction]);

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const handleCoveragePreset = (value: number) => {
    setShowCustomCoverage(false);
    updateInput("utilization", value);
  };
  const handleCustomCoverage = () => {
    setShowCustomCoverage(true);
    if (inputs.utilization === 0) updateInput("utilization", 50);
  };
  const handleFrictionPreset = (preset: Exclude<FrictionPreset, "custom">) => {
    setShowAdvancedFriction(false);
    const m = FRICTION_MAP[preset];
    updateInput("timeSavedPerEncounter", m.saved);
    updateInput("editTimePerEncounter", m.edit);
  };

  const pillarResult = useMemo(() => computePillars(state), [state]);
  const cap = pillarResult.pillars.capacity;
  const d = cap.details;

  const safe = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const conservativeValue = cap.valueAnnual;
  const modeledValue = safe(d.rawValue);
  const haircutMult = safe(d.confidenceHaircut);
  const haircutPct = Math.round((1 - haircutMult) * 100);
  const confidencePct = Math.round(haircutMult * 100);
  const fteUnlocked = safe(d.deployableHours) / 2080;
  const additionalVisits = safe(d.additionalVisits);
  const isZero = conservativeValue === 0 && modeledValue === 0;

  const coveragePct = inputs.utilization;
  const netMin = safe(d.netMinutesPerEncounter);
  const deployFactorPct = Math.round(safe(d.deployFactor) * 100);

  const coverageFill = Math.round((inputs.utilization / 100) * 100);
  const savedFill = Math.round((inputs.timeSavedPerEncounter / 10) * 100);
  const editFill = Math.round((inputs.editTimePerEncounter / 5) * 100);

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <div className="mb-10">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Capacity Creation Potential
        </h1>
        <p className="text-base text-[#888] leading-relaxed max-w-lg" data-testid="text-page-subtitle">
          Ambient unlocks deployable clinical supply from existing encounters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-10">
        <div className="space-y-10">
          <div className="bg-[#F5F0EB] rounded-2xl p-6 border border-[#E8E0D8]" data-testid="hero-capacity">
            {isZero ? (
              <div>
                <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-2">Conservative Value</p>
                <p className="text-4xl font-bold text-[#CCC] leading-none" data-testid="value-conservative">
                  &mdash;
                </p>
                <p className="text-sm text-[#999] mt-3" data-testid="text-zero-prompt">
                  Set coverage and documentation friction to generate a modeled value.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-1.5">Conservative Value</p>
                  <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A] tabular-nums leading-none" data-testid="value-conservative">
                    {formatCurrency(Math.round(conservativeValue))}
                  </p>
                  <p className="text-[11px] text-[#999] mt-2" data-testid="text-haircut-note">
                    Displayed after {haircutPct}% confidence adjustment.
                  </p>
                </div>

                <div className="mt-5">
                  <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-1">Modeled Value</p>
                  <p className="text-xl font-semibold text-[#888] tabular-nums leading-none" data-testid="value-modeled">
                    {formatCurrency(Math.round(modeledValue))}
                  </p>
                  <p className="text-[11px] text-[#999] mt-1">Pre-adjustment model output</p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#E8E0D8]">
                  <div className="flex items-baseline justify-between gap-4 mb-3">
                    <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider">Confidence baseline: {confidencePct}%</p>
                    <p className="text-[11px] text-[#999]" data-testid="text-confidence-value">Displayed value reflects conservative haircut.</p>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] text-[#999] uppercase tracking-wider mb-0.5">Provider capacity</p>
                      <p className="text-base font-semibold text-[#1A1A1A] tabular-nums" data-testid="value-fte">
                        {fteUnlocked.toFixed(1)} FTE
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#999] uppercase tracking-wider mb-0.5">Visits/year</p>
                      <p className="text-base font-semibold text-[#1A1A1A] tabular-nums" data-testid="value-visits">
                        {formatNumber(additionalVisits)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-5" data-testid="section-drivers">
            <DriverRow
              label="Coverage"
              description={`${coveragePct}% of encounters flow through ambient`}
              pct={coveragePct}
            />
            <DriverRow
              label="Net documentation friction"
              description={`${netMin.toFixed(1)} net minutes reclaimed per encounter`}
              pct={Math.min(100, Math.round((netMin / 4) * 100))}
            />
            <DriverRow
              label="Deployment allocation"
              description={`${deployFactorPct}% of reclaimed time converted to capacity`}
              pct={deployFactorPct}
            />
          </div>

          <div className="hidden lg:block">
            <StepFooter onBack={onBack} onNext={onNext} nextTestId="button-next-capacity" />
          </div>
        </div>

        <div className="lg:sticky lg:top-24 self-start" data-testid="panel-assumptions">
          <div className="rounded-2xl border border-[#E8E0D8] bg-[#F9F7F4] p-4 space-y-4">
            <p className="text-[10px] font-medium text-[#AAA] uppercase tracking-wider">Assumptions</p>

            <div>
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Coverage</label>
              <div className="flex flex-wrap gap-1.5">
                {COVERAGE_PRESETS.map((p) => {
                  const isActive = !showCustomCoverage && inputs.utilization === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleCoveragePreset(p.value)}
                      data-testid={`pills-coverage-${p.value}`}
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
                  onClick={handleCustomCoverage}
                  data-testid="pills-coverage-custom"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    showCustomCoverage
                      ? "bg-[#EA2C00] text-white"
                      : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                  }`}
                >
                  Custom
                </button>
              </div>
              {showCustomCoverage && (
                <div className="bg-white rounded-lg p-2.5 border border-[#E5E7EB] mt-1.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={inputs.utilization}
                      onChange={(e) => updateInput("utilization", parseFloat(e.target.value))}
                      className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${coverageFill}%, #E0E0E0 ${coverageFill}%, #E0E0E0 100%)`,
                      }}
                      data-testid="slider-coverage"
                    />
                    <span className="text-xs font-bold text-[#1A1A1A] min-w-[36px] text-right tabular-nums">
                      {inputs.utilization}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#E8E0D8]/60 pt-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-medium text-[#555]">Documentation friction</label>
                <button
                  type="button"
                  onClick={() => setShowAdvancedFriction(!showAdvancedFriction)}
                  className="flex items-center gap-0.5 text-[10px] text-[#EA2C00] font-medium hover:text-[#D12600] transition-colors"
                  data-testid="button-toggle-advanced"
                >
                  Advanced
                  {showAdvancedFriction ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {!showAdvancedFriction ? (
                <div className="flex flex-wrap gap-1.5">
                  {(["flat", "modest", "strong"] as const).map((key) => {
                    const isActive = activeFrictionPreset === key;
                    const labels: Record<string, string> = { flat: "Flat", modest: "Modest", strong: "Strong" };
                    const descs: Record<string, string> = { flat: "0 min", modest: "+1.5 min", strong: "+3.0 min" };
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleFrictionPreset(key)}
                        data-testid={`pills-friction-${key}`}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          isActive
                            ? "bg-[#EA2C00] text-white"
                            : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                        }`}
                      >
                        {labels[key]} <span className="opacity-70 ml-0.5">{descs[key]}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-2.5 border border-[#E5E7EB] space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#666]">Saved/encounter</span>
                      <span className="text-[11px] font-bold text-[#1A1A1A] tabular-nums">{inputs.timeSavedPerEncounter} min</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={inputs.timeSavedPerEncounter}
                      onChange={(e) => updateInput("timeSavedPerEncounter", parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${savedFill}%, #E0E0E0 ${savedFill}%, #E0E0E0 100%)`,
                      }}
                      data-testid="slider-time-saved"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[#666]">Edit time/encounter</span>
                      <span className="text-[11px] font-bold text-[#1A1A1A] tabular-nums">{inputs.editTimePerEncounter} min</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.5}
                      value={inputs.editTimePerEncounter}
                      onChange={(e) => updateInput("editTimePerEncounter", parseFloat(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${editFill}%, #E0E0E0 ${editFill}%, #E0E0E0 100%)`,
                      }}
                      data-testid="slider-edit-time"
                    />
                  </div>
                  <div className="text-[10px] text-[#999] pt-1.5 border-t border-[#E5E7EB]">
                    Net: <span className="font-semibold text-[#1A1A1A] tabular-nums">
                      {Math.max(0, inputs.timeSavedPerEncounter - inputs.editTimePerEncounter).toFixed(1)} min
                    </span> reclaimed
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#E8E0D8]/60 pt-3">
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Deployment</label>
              <div className="grid grid-cols-2 gap-1.5">
                {DEPLOY_OPTIONS.map((opt) => {
                  const isActive = inputs.deployIntent === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateInput("deployIntent", opt.value)}
                      data-testid={`button-deploy-${opt.value}`}
                      className={`text-left px-2.5 py-1.5 rounded-lg transition-all ${
                        isActive
                          ? "bg-[#EA2C00] text-white"
                          : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                      }`}
                    >
                      <span className="text-[11px] font-medium block">{opt.label}</span>
                      <span className={`text-[10px] leading-tight ${isActive ? "text-white/70" : "text-[#999]"}`}>
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden mt-10">
        <StepFooter onBack={onBack} onNext={onNext} nextTestId="button-next-capacity" />
      </div>
    </div>
  );
}
