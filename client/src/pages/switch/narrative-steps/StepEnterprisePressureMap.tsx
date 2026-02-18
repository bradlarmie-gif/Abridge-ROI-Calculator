import { useState, useMemo } from "react";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import type { PrimaryPressure, PressureLevel, ConfidenceLevel } from "@/lib/assessment";
import type { PillarId } from "@/lib/pillars/computePillars";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { ChevronDown, ChevronUp, Users, DollarSign, Stethoscope, ShieldCheck } from "lucide-react";

interface StepEnterprisePressureMapProps {
  onNext: () => void;
  onBack: () => void;
}

const FOCUS_OPTIONS: {
  value: PrimaryPressure;
  title: string;
  description: string;
}[] = [
  {
    value: "access",
    title: "Access & Throughput",
    description: "Capacity constraints, wait times, or panel growth are the primary concern.",
  },
  {
    value: "revenue",
    title: "Revenue Performance",
    description: "Coding accuracy, wRVU capture, or reimbursement leakage is under scrutiny.",
  },
  {
    value: "retention",
    title: "Clinician Retention",
    description: "Burnout, after-hours documentation burden, or turnover risk is the focus.",
  },
  {
    value: "compliance",
    title: "Compliance & Audit Posture",
    description: "Documentation defensibility, quality reporting, or audit readiness needs attention.",
  },
  {
    value: "none",
    title: "No Single Driver",
    description: "Balanced evaluation across all value engines.",
  },
];

interface RankedPillar {
  id: PillarId;
  rank: number;
  name: string;
  shortDesc: string;
  icon: typeof Users;
  pressure: PressureLevel;
}

const RANK_MAP: Record<PrimaryPressure, PillarId[]> = {
  access:     ["capacity", "workforce", "yield", "risk"],
  revenue:    ["yield", "capacity", "risk", "workforce"],
  retention:  ["workforce", "capacity", "risk", "yield"],
  compliance: ["risk", "yield", "workforce", "capacity"],
  none:       ["capacity", "yield", "workforce", "risk"],
};

const PILLAR_INFO: Record<PillarId, { name: string; shortDesc: string; icon: typeof Users }> = {
  capacity:  { name: "Capacity Creation",    shortDesc: "Time recovered enables more patient access.",    icon: Users },
  yield:     { name: "Revenue Yield",        shortDesc: "Complete documentation drives better capture.",  icon: DollarSign },
  workforce: { name: "Workforce Stability",  shortDesc: "Reduced burden improves retention and morale.", icon: Stethoscope },
  risk:      { name: "Risk & Compliance",    shortDesc: "Higher quality lowers audit exposure.",          icon: ShieldCheck },
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

const PRESSURE_LABEL: Record<PressureLevel, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const PRESSURE_COLOR: Record<PressureLevel, string> = {
  high: "text-[#EA2C00]",
  medium: "text-[#F59E0B]",
  low: "text-[#94A3B8]",
};

export default function StepEnterprisePressureMap({
  onNext,
  onBack,
}: StepEnterprisePressureMapProps) {
  const { state, dispatch } = useAssessment();
  const { pillarsMeta, primaryPressure } = state;
  const confidenceBaseline = state.inputs.confidenceBaseline;
  const [showOverride, setShowOverride] = useState(false);

  const handleSelectFocus = (value: PrimaryPressure) => {
    dispatch(assessmentActions.setPrimaryPressure(value));
  };

  const rankedPillars: RankedPillar[] = useMemo(() => {
    const order = RANK_MAP[primaryPressure] || RANK_MAP.none;
    return order.map((id, idx) => ({
      id,
      rank: idx + 1,
      ...PILLAR_INFO[id],
      pressure: pillarsMeta[id].pressure,
    }));
  }, [primaryPressure, pillarsMeta]);

  const handlePressureChange = (pillarId: PillarId, value: PressureLevel) => {
    dispatch(assessmentActions.updatePillarMeta(pillarId, "pressure", value));
  };

  const handleConfidenceChange = (pillarId: PillarId, value: ConfidenceLevel) => {
    dispatch(assessmentActions.updatePillarMeta(pillarId, "confidence", value));
  };

  return (
    <div className={`space-y-10 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Enterprise Value Diagnostic
        </h1>
        <p className="text-base text-[#888888] leading-relaxed max-w-xl" data-testid="text-page-subtitle">
          Ambient value is created across four economic engines. We'll prioritize based on where your organization faces the most strategic pressure.
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-[#1A1A1A] mb-4" data-testid="text-focus-question">
          Where is ambient under the most scrutiny internally?
        </p>
        <div className="space-y-3">
          {FOCUS_OPTIONS.map((opt) => {
            const isSelected = primaryPressure === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectFocus(opt.value)}
                data-testid={`tile-focus-${opt.value}`}
                className={`w-full text-left rounded-2xl p-5 transition-all duration-200 relative overflow-hidden border ${
                  isSelected
                    ? "bg-[#F5F0EB] border-[#E8E0D8] scale-[1.003]"
                    : "bg-white border-[#E8E0D8] hover:bg-[#FAFAF7]"
                }`}
              >
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300 ${
                    isSelected ? "bg-[#EA2C00]" : "bg-transparent"
                  }`}
                />
                <div className="pl-3">
                  <span className="text-base font-semibold text-[#1A1A1A]">{opt.title}</span>
                  <p className="text-sm text-[#555]/80 mt-0.5">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider mb-4" data-testid="text-ranked-label">
          Prioritized value engines
        </p>
        <div className="space-y-3">
          {rankedPillars.map((pillar, idx) => {
            const isFirst = idx === 0 && primaryPressure !== "none";
            return (
              <div
                key={pillar.id}
                data-testid={`ranked-pillar-${pillar.id}`}
                className={`rounded-xl border transition-all duration-300 ${
                  isFirst
                    ? "bg-[#F5F0EB] border-[#E8E0D8] p-5"
                    : "bg-white border-[#E8E0D8] p-4"
                }`}
                style={{
                  animationDelay: `${idx * 60}ms`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 rounded-lg flex items-center justify-center font-bold tabular-nums ${
                    isFirst
                      ? "w-9 h-9 bg-[#EA2C00] text-white text-base"
                      : "w-8 h-8 bg-[#F0F0F0] text-[#888] text-sm"
                  }`}>
                    {pillar.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold ${isFirst ? "text-base text-[#1A1A1A]" : "text-sm text-[#1A1A1A]"}`}>
                        {pillar.name}
                      </span>
                      <span className={`text-[11px] font-medium ${PRESSURE_COLOR[pillar.pressure]}`}>
                        {PRESSURE_LABEL[pillar.pressure]} pressure
                      </span>
                    </div>
                    <p className={`mt-0.5 ${isFirst ? "text-sm text-[#666]" : "text-[13px] text-[#999]"}`}>
                      {pillar.shortDesc}
                    </p>
                    {isFirst && (
                      <div className="flex items-center gap-4 mt-2 text-[12px] text-[#999]">
                        <span>Confidence baseline: <span className="font-medium text-[#1A1A1A] tabular-nums">{confidenceBaseline.toFixed(2)}</span></span>
                      </div>
                    )}
                  </div>
                  <pillar.icon className={`shrink-0 ${isFirst ? "w-5 h-5 text-[#EA2C00]" : "w-4 h-4 text-[#CCC]"}`} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[12px] text-[#999] mt-3 text-center">
          Modeled value appears in the next steps.
        </p>
      </div>

      <div className="border border-[#E8E0D8] rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOverride(!showOverride)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-[#F5F0EB] hover:bg-[#EDE6DE] transition-colors"
          data-testid="button-override-toggle"
        >
          <span className="text-sm font-medium text-[#666]">Adjust pressure manually</span>
          {showOverride ? (
            <ChevronUp className="w-4 h-4 text-[#999]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#999]" />
          )}
        </button>
        {showOverride && (
          <div className="p-5 bg-white space-y-4">
            {(["capacity", "yield", "workforce", "risk"] as PillarId[]).map((id) => {
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

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Quantify My Opportunity" nextTestId="button-quantify-opportunity" />
    </div>
  );
}
