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
  { label: "Protect clinician time", value: "protect-time", description: "Let providers keep reclaimed time" },
  { label: "Not sure yet", value: "not-sure", description: "Use a conservative blend" },
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

function ImpactBar({ label, value, maxValue, note }: { label: string; value: number; maxValue: number; note: string }) {
  const pct = maxValue > 0 ? Math.min(100, Math.round((value / maxValue) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#555]">{label}</span>
        <span className="text-sm font-semibold text-[#1A1A1A] tabular-nums">{value > 0 ? formatNumber(value) : "—"}</span>
      </div>
      <div className="h-2 bg-[#F0ECE6] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#EA2C00] rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-[#999]">{note}</p>
    </div>
  );
}

export default function StepPillarCapacity({
  onNext,
  onBack,
}: StepPillarCapacityProps) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;

  const [showAssumptions, setShowAssumptions] = useState(false);
  const [showCustomCoverage, setShowCustomCoverage] = useState(
    !COVERAGE_PRESETS.some((p) => p.value === inputs.utilization) && inputs.utilization > 0
  );
  const [showAdvancedFriction, setShowAdvancedFriction] = useState(false);

  const activeFrictionPreset = useMemo((): FrictionPreset => {
    if (showAdvancedFriction) return "custom";
    for (const [key, val] of Object.entries(FRICTION_MAP)) {
      if (
        Math.abs(inputs.timeSavedPerEncounter - val.saved) < 0.01 &&
        Math.abs(inputs.editTimePerEncounter - val.edit) < 0.01
      ) {
        return key as FrictionPreset;
      }
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
    const map = FRICTION_MAP[preset];
    updateInput("timeSavedPerEncounter", map.saved);
    updateInput("editTimePerEncounter", map.edit);
  };

  const pillarResult = useMemo(() => computePillars(state), [state]);
  const cap = pillarResult.pillars.capacity;
  const details = cap.details;

  const safeNum = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const conservativeValue = cap.valueAnnual;
  const modeledValue = safeNum(details.rawValue);
  const haircutPct = Math.round((1 - safeNum(details.confidenceHaircut)) * 100);
  const fteUnlocked = safeNum(details.deployableHours) / 2080;
  const additionalVisits = safeNum(details.additionalVisits);

  const coverageFill = Math.round(((inputs.utilization) / 100) * 100);
  const savedFill = Math.round(((inputs.timeSavedPerEncounter) / 10) * 100);
  const editFill = Math.round(((inputs.editTimePerEncounter) / 5) * 100);

  const maxUtilEncounters = Math.round(inputs.annualEncounters * 0.85);
  const maxNetMin = 4;
  const maxDeployHours = Math.round((maxUtilEncounters * maxNetMin) / 60 * 0.25);

  return (
    <div className={`space-y-14 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Capacity Creation Potential
        </h1>
        <p className="text-base text-[#888888] leading-relaxed max-w-lg" data-testid="text-page-subtitle">
          Ambient unlocks deployable clinical supply from existing encounters.
        </p>
      </div>

      <div className="bg-[#F5F0EB] rounded-2xl p-8 border border-[#E8E0D8]" data-testid="hero-capacity">
        <div className="flex flex-col sm:flex-row sm:items-end gap-8 sm:gap-12">
          <div>
            <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider mb-2">Conservative Value</p>
            <p className="text-4xl md:text-5xl font-bold text-[#1A1A1A] tabular-nums leading-none" data-testid="value-conservative">
              {formatCurrency(Math.round(conservativeValue))}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider mb-2">Modeled Value</p>
            <p className="text-2xl md:text-3xl font-semibold text-[#888] tabular-nums leading-none" data-testid="value-modeled">
              {formatCurrency(Math.round(modeledValue))}
            </p>
          </div>
        </div>

        <p className="text-[12px] text-[#999] mt-4" data-testid="text-haircut-note">
          Displayed after {haircutPct}% confidence adjustment.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 mt-6 pt-5 border-t border-[#E8E0D8]">
          <div>
            <p className="text-[11px] text-[#999] uppercase tracking-wider mb-0.5">Equivalent provider capacity</p>
            <p className="text-lg font-semibold text-[#1A1A1A] tabular-nums" data-testid="value-fte">
              {fteUnlocked.toFixed(1)} FTE
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[#999] uppercase tracking-wider mb-0.5">Incremental visits/year</p>
            <p className="text-lg font-semibold text-[#1A1A1A] tabular-nums" data-testid="value-visits">
              {formatNumber(additionalVisits)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6" data-testid="section-drivers">
        <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider">
          What drives this
        </p>
        <ImpactBar
          label="Coverage (utilization)"
          value={safeNum(details.eUsed)}
          maxValue={maxUtilEncounters}
          note={`${inputs.utilization}% of ${formatNumber(inputs.annualEncounters)} encounters flow through ambient`}
        />
        <ImpactBar
          label="Net documentation friction change"
          value={safeNum(details.totalHoursReclaimed)}
          maxValue={maxDeployHours * 4}
          note={`${safeNum(details.netMinutesPerEncounter).toFixed(1)} net min reclaimed per encounter`}
        />
        <ImpactBar
          label="Deployment allocation"
          value={safeNum(details.deployableHours)}
          maxValue={maxDeployHours}
          note={`${Math.round(safeNum(details.deployFactor) * 100)}% of reclaimed time converted to capacity`}
        />
      </div>

      <div className="border border-[#E8E0D8] rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-[#F5F0EB] hover:bg-[#EDE6DE] transition-colors"
          data-testid="button-toggle-assumptions"
        >
          <span className="text-sm font-medium text-[#666]">Adjust assumptions</span>
          {showAssumptions ? (
            <ChevronUp className="w-4 h-4 text-[#999]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#999]" />
          )}
        </button>
        {showAssumptions && (
          <div className="p-5 bg-white space-y-6">
            <div>
              <label className="block text-[11px] font-medium text-[#999] uppercase tracking-wider mb-3">
                Coverage (Utilization)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COVERAGE_PRESETS.map((p) => {
                  const isActive = !showCustomCoverage && inputs.utilization === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleCoveragePreset(p.value)}
                      data-testid={`pills-coverage-${p.value}`}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
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
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    showCustomCoverage
                      ? "bg-[#EA2C00] text-white"
                      : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                  }`}
                >
                  Custom
                </button>
              </div>
              {showCustomCoverage && (
                <div className="mt-3 bg-[#FAFAF7] rounded-lg p-4 border border-[#E5E7EB]">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={inputs.utilization}
                        onChange={(e) => updateInput("utilization", parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${coverageFill}%, #E0E0E0 ${coverageFill}%, #E0E0E0 100%)`,
                        }}
                        data-testid="slider-coverage"
                      />
                    </div>
                    <span className="text-lg font-bold text-[#1A1A1A] min-w-[48px] text-right tabular-nums">
                      {inputs.utilization}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#F0F0F0] pt-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-medium text-[#999] uppercase tracking-wider">
                  Net Documentation Friction
                </label>
                <button
                  type="button"
                  onClick={() => setShowAdvancedFriction(!showAdvancedFriction)}
                  className="flex items-center gap-1 text-[11px] text-[#EA2C00] font-medium hover:text-[#D12600] transition-colors"
                  data-testid="button-toggle-advanced"
                >
                  Advanced
                  {showAdvancedFriction ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {!showAdvancedFriction ? (
                <div className="flex flex-wrap gap-2">
                  {(["flat", "modest", "strong"] as const).map((key) => {
                    const isActive = activeFrictionPreset === key;
                    const labels: Record<string, string> = { flat: "Flat", modest: "Modest", strong: "Strong" };
                    const descriptions: Record<string, string> = { flat: "0 net min", modest: "1.5 net min", strong: "3.0 net min" };
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleFrictionPreset(key)}
                        data-testid={`pills-friction-${key}`}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          isActive
                            ? "bg-[#EA2C00] text-white"
                            : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                        }`}
                      >
                        <span>{labels[key]}</span>
                        <span className="ml-1 text-[10px] opacity-70">({descriptions[key]})</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#FAFAF7] rounded-lg p-4 border border-[#E5E7EB] space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#666]">Minutes saved per encounter</span>
                      <span className="text-sm font-bold text-[#1A1A1A] tabular-nums">{inputs.timeSavedPerEncounter} min</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={inputs.timeSavedPerEncounter}
                      onChange={(e) => updateInput("timeSavedPerEncounter", parseFloat(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${savedFill}%, #E0E0E0 ${savedFill}%, #E0E0E0 100%)`,
                      }}
                      data-testid="slider-time-saved"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#666]">Edit time per encounter</span>
                      <span className="text-sm font-bold text-[#1A1A1A] tabular-nums">{inputs.editTimePerEncounter} min</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={0.5}
                      value={inputs.editTimePerEncounter}
                      onChange={(e) => updateInput("editTimePerEncounter", parseFloat(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #EA2C00 0%, #EA2C00 ${editFill}%, #E0E0E0 ${editFill}%, #E0E0E0 100%)`,
                      }}
                      data-testid="slider-edit-time"
                    />
                  </div>
                  <div className="text-[11px] text-[#999] pt-1 border-t border-[#E5E7EB]">
                    Net impact: <span className="font-semibold text-[#1A1A1A] tabular-nums">
                      {Math.max(0, inputs.timeSavedPerEncounter - inputs.editTimePerEncounter).toFixed(1)} min
                    </span> reclaimed per encounter
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#F0F0F0] pt-5">
              <label className="block text-[11px] font-medium text-[#999] uppercase tracking-wider mb-3">
                Deployment Allocation
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEPLOY_OPTIONS.map((opt) => {
                  const isActive = inputs.deployIntent === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateInput("deployIntent", opt.value)}
                      data-testid={`button-deploy-${opt.value}`}
                      className={`text-left px-4 py-3 rounded-lg transition-all ${
                        isActive
                          ? "bg-[#EA2C00] text-white"
                          : "bg-white text-[#666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                      }`}
                    >
                      <span className="text-sm font-medium block">{opt.label}</span>
                      <span className={`text-[11px] ${isActive ? "text-white/70" : "text-[#999]"}`}>
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <StepFooter onBack={onBack} onNext={onNext} nextTestId="button-next-capacity" />
    </div>
  );
}
