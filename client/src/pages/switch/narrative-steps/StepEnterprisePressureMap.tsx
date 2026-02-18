import { useState, useMemo, useEffect } from "react";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import type { PrimaryPressure, PressureLevel, ConfidenceLevel } from "@/lib/assessment";
import type { PillarId } from "@/lib/pillars/computePillars";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import OperationalPerformanceSnapshot from "@/components/OperationalPerformanceSnapshot";
import { ChevronDown, ChevronUp, Users, DollarSign, Stethoscope, ShieldCheck, SlidersHorizontal } from "lucide-react";

interface StepEnterprisePressureMapProps {
  onNext: () => void;
  onBack: () => void;
}

const FOCUS_OPTIONS: {
  value: PrimaryPressure;
  title: string;
  description: string;
}[] = [
  { value: "access", title: "Access & Throughput", description: "Capacity constraints, wait times, or panel growth." },
  { value: "revenue", title: "Revenue Performance", description: "Coding accuracy, wRVU capture, or reimbursement leakage." },
  { value: "retention", title: "Clinician Retention", description: "Burnout, after-hours burden, or turnover risk." },
  { value: "compliance", title: "Compliance & Audit Posture", description: "Documentation defensibility or audit readiness." },
  { value: "none", title: "No Single Driver", description: "Balanced evaluation across all engines." },
];

const PRIMARY_ENGINE_MAP: Record<PrimaryPressure, PillarId> = {
  access: "capacity",
  revenue: "yield",
  retention: "workforce",
  compliance: "risk",
  none: "capacity",
};

const RANK_MAP: Record<PrimaryPressure, PillarId[]> = {
  access:     ["capacity", "workforce", "yield", "risk"],
  revenue:    ["yield", "capacity", "risk", "workforce"],
  retention:  ["workforce", "capacity", "risk", "yield"],
  compliance: ["risk", "yield", "workforce", "capacity"],
  none:       ["capacity", "yield", "workforce", "risk"],
};

const PILLAR_INFO: Record<PillarId, { name: string; shortDesc: string; icon: typeof Users }> = {
  capacity:  { name: "Capacity Creation",   shortDesc: "Time recovered enables more patient access.",    icon: Users },
  yield:     { name: "Revenue Yield",       shortDesc: "Complete documentation drives better capture.",  icon: DollarSign },
  workforce: { name: "Workforce Stability", shortDesc: "Reduced burden improves retention and morale.", icon: Stethoscope },
  risk:      { name: "Risk & Compliance",   shortDesc: "Higher quality lowers audit exposure.",          icon: ShieldCheck },
};

const PRESSURE_OPTIONS: { label: string; value: PressureLevel }[] = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const CONFIDENCE_OPTIONS: { label: string; value: ConfidenceLevel }[] = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

function SegmentedPills<T extends string>({
  options,
  selected,
  onChange,
  testIdPrefix,
}: {
  options: { label: string; value: T }[];
  selected: T;
  onChange: (value: T) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            data-testid={`${testIdPrefix}-${opt.value}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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
  );
}

function computeRecommendation(inputs: {
  careSetting: string;
  annualEncounters: number;
  dataMode: string;
  specialtyMix: string;
  confidenceBaseline: number;
}): PrimaryPressure {
  const { careSetting, annualEncounters, dataMode, specialtyMix, confidenceBaseline } = inputs;

  if (careSetting === "ed" || careSetting === "inpatient") {
    if (confidenceBaseline < 0.6 || dataMode === "benchmark") return "compliance";
    return "access";
  }

  if (specialtyMix === "specialty" || specialtyMix === "procedural") {
    return "revenue";
  }

  if (annualEncounters > 40000) {
    return "access";
  }

  if (confidenceBaseline < 0.6 && dataMode === "benchmark") {
    return "compliance";
  }

  if (careSetting === "nursing") {
    return "retention";
  }

  return "access";
}

export default function StepEnterprisePressureMap({
  onNext,
  onBack,
}: StepEnterprisePressureMapProps) {
  const { state, dispatch } = useAssessment();
  const { pillarsMeta, primaryPressure } = state;
  const confidenceBaseline = state.inputs.confidenceBaseline;

  const recommendation = useMemo(
    () => computeRecommendation(state.inputs),
    [state.inputs],
  );

  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  useEffect(() => {
    if (primaryPressure === "none") {
      dispatch(assessmentActions.setPrimaryPressure(recommendation));
    }
  }, []);

  const activePressure = primaryPressure === "none" ? recommendation : primaryPressure;
  const activeEngine = useMemo(() => {
    const id = PRIMARY_ENGINE_MAP[activePressure];
    return { id, ...PILLAR_INFO[id] };
  }, [activePressure]);

  const handleConfirm = () => {
    setConfirmed(true);
    dispatch(assessmentActions.setPrimaryPressure(recommendation));
  };

  const handleOverride = () => {
    setConfirmed(false);
  };

  const handleSelectFocus = (value: PrimaryPressure) => {
    dispatch(assessmentActions.setPrimaryPressure(value));
  };

  const rankedPillars = useMemo(() => {
    const order = RANK_MAP[activePressure] || RANK_MAP.none;
    return order.map((id, idx) => ({
      id,
      rank: idx + 1,
      ...PILLAR_INFO[id],
      pressure: pillarsMeta[id].pressure,
    }));
  }, [activePressure, pillarsMeta]);

  const handlePressureChange = (pillarId: PillarId, value: PressureLevel) => {
    dispatch(assessmentActions.updatePillarMeta(pillarId, "pressure", value));
  };

  const handleConfidenceChange = (pillarId: PillarId, value: ConfidenceLevel) => {
    dispatch(assessmentActions.updatePillarMeta(pillarId, "confidence", value));
  };

  const recommendedEngine = useMemo(() => {
    const id = PRIMARY_ENGINE_MAP[recommendation];
    return { id, ...PILLAR_INFO[id] };
  }, [recommendation]);

  return (
    <div className={`space-y-14 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Enterprise Focus
        </h1>
        <p className="text-base text-[#888888] leading-relaxed max-w-xl" data-testid="text-page-subtitle">
          Ambient value concentrates where enterprise pressure is highest.
        </p>
      </div>

      <div>
        <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider mb-5" data-testid="text-recommended-label">
          Recommended enterprise focus
        </p>
        <div
          className="bg-[#F5F0EB] rounded-2xl p-7 border border-[#E8E0D8]"
          data-testid="card-recommendation"
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-white border border-[#E8E0D8] flex items-center justify-center shrink-0">
              <recommendedEngine.icon className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-lg font-semibold text-[#1A1A1A]" data-testid="text-recommendation-name">
                {recommendedEngine.name}
              </span>
              <p className="text-sm text-[#666] mt-1">{recommendedEngine.shortDesc}</p>
              <div className="flex items-center gap-4 mt-3 text-[12px] text-[#999]">
                <span>
                  Confidence baseline:{" "}
                  <span className="font-medium text-[#1A1A1A] tabular-nums" data-testid="text-recommendation-confidence">
                    {confidenceBaseline.toFixed(2)}
                  </span>
                </span>
              </div>
              <p className="text-[12px] text-[#888] mt-2">
                Based on your baseline inputs and measurement mode.
              </p>
            </div>
          </div>
        </div>
      </div>

      {confirmed === null && (
        <div data-testid="section-confirm">
          <p className="text-base font-medium text-[#1A1A1A] mb-5" data-testid="text-confirm-question">
            Does this reflect internal reality?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              data-testid="button-confirm-yes"
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors"
            >
              Yes, proceed with this focus
            </button>
            <button
              type="button"
              onClick={handleOverride}
              data-testid="button-confirm-no"
              className="px-6 py-3 rounded-xl text-sm font-semibold border border-[#E8E0D8] text-[#555] bg-white hover:bg-[#FAFAF7] transition-colors"
            >
              No, adjust focus
            </button>
          </div>
        </div>
      )}

      {confirmed === false && (
        <div data-testid="section-override-tiles">
          <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider mb-4">
            Select primary focus
          </p>
          <div className="space-y-3">
            {FOCUS_OPTIONS.map((opt) => {
              const isSelected = primaryPressure === opt.value;
              const someSelected = primaryPressure !== "none";
              const dimmed = someSelected && !isSelected;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectFocus(opt.value)}
                  data-testid={`tile-focus-${opt.value}`}
                  className={`w-full text-left rounded-2xl py-5 px-6 transition-all duration-200 relative overflow-hidden border ${
                    isSelected
                      ? "bg-[#F5F0EB] border-[#E8E0D8]"
                      : "bg-white border-[#E8E0D8] hover:bg-[#FAFAF7]"
                  } ${dimmed ? "opacity-60" : "opacity-100"}`}
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300 ${
                      isSelected ? "bg-[#EA2C00]" : "bg-transparent"
                    }`}
                  />
                  <div className="pl-3">
                    <span className="text-base font-semibold text-[#1A1A1A]">{opt.title}</span>
                    <p className="text-sm text-[#555]/70 mt-0.5">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(confirmed === true || (confirmed === false && primaryPressure !== "none")) && (
        <div
          className="bg-[#F5F0EB] rounded-2xl p-6 border border-[#E8E0D8]"
          data-testid="card-primary-engine"
        >
          <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider mb-3">
            Primary value engine identified
          </p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-[#E8E0D8] flex items-center justify-center shrink-0">
              <activeEngine.icon className="w-4 h-4 text-[#EA2C00]" />
            </div>
            <div>
              <span className="text-base font-semibold text-[#1A1A1A]" data-testid="text-engine-name">
                {activeEngine.name}
              </span>
              <div className="flex items-center gap-4 mt-0.5 text-[12px] text-[#999]">
                <span>
                  Confidence:{" "}
                  <span className="font-medium text-[#1A1A1A] tabular-nums" data-testid="text-engine-confidence">
                    {confidenceBaseline.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <p className="text-[12px] text-[#999] mt-3">
            Other engines will still be modeled.
          </p>
        </div>
      )}

      <div className="border border-[#E8E0D8] rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOverride(!showOverride)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-[#F5F0EB] hover:bg-[#EDE6DE] transition-colors"
          data-testid="button-override-toggle"
        >
          <span className="text-sm font-medium text-[#666]">Adjust engine weighting manually</span>
          {showOverride ? (
            <ChevronUp className="w-4 h-4 text-[#999]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#999]" />
          )}
        </button>
        {showOverride && (
          <div className="p-5 bg-white space-y-4">
            {rankedPillars.map(({ id }) => {
              const meta = pillarsMeta[id];
              const info = PILLAR_INFO[id];
              return (
                <div key={id} className="flex flex-col sm:flex-row sm:items-center gap-3 pb-3 border-b border-[#F0F0F0] last:border-b-0 last:pb-0">
                  <div className="sm:w-40 shrink-0">
                    <span className="text-sm font-medium text-[#1A1A1A]">{info.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="block text-[10px] font-medium text-[#999] uppercase tracking-wider mb-1">Pressure</label>
                      <SegmentedPills
                        options={PRESSURE_OPTIONS}
                        selected={meta.pressure}
                        onChange={(v) => handlePressureChange(id, v)}
                        testIdPrefix={`pills-pressure-${id}`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-[#999] uppercase tracking-wider mb-1">Confidence</label>
                      <SegmentedPills
                        options={CONFIDENCE_OPTIONS}
                        selected={meta.confidence}
                        onChange={(v) => handleConfidenceChange(id, v)}
                        testIdPrefix={`pills-confidence-${id}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={() => setShowSnapshot(true)}
          className="flex items-center gap-1.5 text-xs text-[#999] hover:text-[#EA2C00] transition-colors"
          data-testid="button-advanced-inputs"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Advanced Inputs: Operational Performance</span>
        </button>
      </div>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Build Enterprise Value Map" nextTestId="button-build-value-map" />

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
