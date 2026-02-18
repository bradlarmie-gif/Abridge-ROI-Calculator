import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Users, CalendarPlus, DollarSign } from "lucide-react";
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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000).toLocaleString()}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

export default function StepPillarCapacity({
  onNext,
  onBack,
}: StepPillarCapacityProps) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;

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
  const capacityDetails = pillarResult.pillars.capacity.details;

  const safeNum = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const fteUnlocked = safeNum(capacityDetails.deployableHours) / 2080;
  const additionalVisits = safeNum(capacityDetails.additionalVisits);
  const annualContribution = safeNum(pillarResult.pillars.capacity.valueAnnual);

  const showVisitMetric = inputs.deployIntent === "grow-visits" || inputs.deployIntent === "reduce-backlog";

  const hasCapacityInputs =
    inputs.providers > 0 &&
    inputs.annualEncounters > 0 &&
    (inputs.utilization > 0 || inputs.timeSavedPerEncounter > 0);

  const coverageFill = Math.round(((inputs.utilization - 0) / (100 - 0)) * 100);
  const savedFill = Math.round(((inputs.timeSavedPerEncounter - 0) / (10 - 0)) * 100);
  const editFill = Math.round(((inputs.editTimePerEncounter - 0) / (5 - 0)) * 100);

  return (
    <div className={`space-y-10 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Clinical Capacity Engine
        </h1>
        <p className="text-base text-[#888888] leading-relaxed max-w-lg" data-testid="text-page-subtitle">
          Capacity is the scarce resource. Ambient unlocks deployable clinical supply.
        </p>
      </div>

      <section className="space-y-5">
        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]">
          <label className="block text-[11px] font-medium text-[#999999] uppercase tracking-wider mb-3">
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
              onClick={handleCustomCoverage}
              data-testid="pills-coverage-custom"
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                showCustomCoverage
                  ? "bg-[#EA2C00] text-white shadow-sm"
                  : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
              }`}
            >
              Custom
            </button>
          </div>

          {showCustomCoverage && (
            <div className="mt-3 bg-white rounded-lg p-4 border border-[#E5E7EB]">
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
                <span className="text-lg font-bold text-[#1A1A1A] min-w-[48px] text-right">
                  {inputs.utilization}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-medium text-[#999999] uppercase tracking-wider">
              Net Documentation Friction Change
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
                const labels: Record<string, string> = {
                  flat: "Flat",
                  modest: "Modest",
                  strong: "Strong",
                };
                const descriptions: Record<string, string> = {
                  flat: "0 net min",
                  modest: "1.5 net min",
                  strong: "3.0 net min",
                };
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleFrictionPreset(key)}
                    data-testid={`pills-friction-${key}`}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#EA2C00] text-white shadow-sm"
                        : "bg-white text-[#666666] border border-[#E5E7EB] hover:border-[#EA2C00]/30 hover:text-[#1A1A1A]"
                    }`}
                  >
                    <span>{labels[key]}</span>
                    <span className="ml-1 text-[10px] opacity-70">({descriptions[key]})</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 border border-[#E5E7EB] space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#666666]">Minutes saved per encounter</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">{inputs.timeSavedPerEncounter} min</span>
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
                  <span className="text-xs text-[#666666]">Edit time per encounter</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">{inputs.editTimePerEncounter} min</span>
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
              <div className="text-[11px] text-[#999999] pt-1 border-t border-[#E5E7EB]">
                Net impact: <span className="font-semibold text-[#1A1A1A]">
                  {Math.max(0, inputs.timeSavedPerEncounter - inputs.editTimePerEncounter).toFixed(1)} min
                </span> reclaimed per encounter
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]">
          <label className="block text-[11px] font-medium text-[#999999] uppercase tracking-wider mb-3">
            Deployment Intent
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
      </section>

      {hasCapacityInputs && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="output-cards">
          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] text-center">
            <Users className="w-5 h-5 text-[#EA2C00] mx-auto mb-2" />
            <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">FTE Capacity Unlocked</p>
            <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A]" data-testid="value-fte">
              {fteUnlocked.toFixed(1)}
            </p>
            <p className="text-[10px] text-[#999999] mt-0.5">provider-equivalents</p>
          </div>

          {showVisitMetric && (
            <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] text-center">
              <CalendarPlus className="w-5 h-5 text-[#EA2C00] mx-auto mb-2" />
              <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">Incremental Visits/Year</p>
              <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A]" data-testid="value-visits">
                {formatNumber(additionalVisits)}
              </p>
              <p className="text-[10px] text-[#999999] mt-0.5">additional appointments</p>
            </div>
          )}

          <div className="bg-white rounded-xl p-4 border border-[#E5E7EB] text-center">
            <DollarSign className="w-5 h-5 text-[#EA2C00] mx-auto mb-2" />
            <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">Annual Contribution</p>
            <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A]" data-testid="value-contribution">
              {formatCurrency(Math.round(annualContribution))}
            </p>
            <p className="text-[10px] text-[#999999] mt-0.5">capacity-driven value</p>
          </div>
        </section>
      )}

      <StepFooter onBack={onBack} onNext={onNext} nextTestId="button-next-capacity" />
    </div>
  );
}