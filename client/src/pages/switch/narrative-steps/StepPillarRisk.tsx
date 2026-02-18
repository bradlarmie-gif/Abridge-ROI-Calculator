import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import OperationalPerformanceSnapshot from "@/components/OperationalPerformanceSnapshot";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { computePillars } from "@/lib/pillars/computePillars";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import type { ConfidenceLevel } from "@/lib/assessment/assessmentTypes";

interface StepPillarRiskProps {
  onNext: () => void;
  onBack: () => void;
}

const DEFENSIBILITY_OPTIONS: { label: string; value: "high" | "medium" | "low"; desc: string }[] = [
  { label: "High", value: "high", desc: "Audit-ready" },
  { label: "Medium", value: "medium", desc: "Some gaps" },
  { label: "Low", value: "low", desc: "Inconsistent" },
];

const FRICTION_OPTIONS: { label: string; value: "smooth" | "manageable" | "painful"; desc: string }[] = [
  { label: "Smooth", value: "smooth", desc: "Automated" },
  { label: "Manageable", value: "manageable", desc: "Some manual" },
  { label: "Painful", value: "painful", desc: "Heavy rework" },
];

const DATA_OPTIONS: { label: string; value: "yes" | "some" | "no"; desc: string }[] = [
  { label: "Yes", value: "yes", desc: "Feeds analytics" },
  { label: "Some", value: "some", desc: "Partial capture" },
  { label: "No", value: "no", desc: "Free-text only" },
];

const CONFIDENCE_OPTIONS: { label: string; value: ConfidenceLevel }[] = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const READINESS_STYLES: Record<string, string> = {
  "Ready": "text-green-700 bg-green-50 border-green-200",
  "Developing": "text-amber-700 bg-amber-50 border-amber-200",
  "Not Ready": "text-red-700 bg-red-50 border-red-200",
};

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

export default function StepPillarRisk({
  onNext,
  onBack,
}: StepPillarRiskProps) {
  const { state, dispatch } = useAssessment();
  const { inputs, pillarsMeta } = state;

  const [showConfidenceEdit, setShowConfidenceEdit] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const riskConfidence = pillarsMeta.risk.confidence;

  const pillarResult = useMemo(() => computePillars(state), [state]);
  const rk = pillarResult.pillars.risk;
  const d = rk.details;

  const safeNum = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const conservativeValue = rk.valueAnnual;
  const rawValue = safeNum(d.rawValue);
  const haircutMult = safeNum(d.confidenceHaircut);
  const haircutPct = Math.round((1 - haircutMult) * 100);
  const confidencePct = Math.round(haircutMult * 100);
  const isZero = conservativeValue === 0 && rawValue === 0;

  const hardCap = safeNum(d.hardCap);
  const wasCapped = Boolean(d.wasCapped);
  const grossRevenue = safeNum(d.grossRevenue);
  const cappedValue = safeNum(d.cappedValue);
  const capUsagePct = hardCap > 0 ? Math.min(100, Math.round((cappedValue / hardCap) * 100)) : 0;

  const readinessScore = safeNum(d.readinessScore);
  const readinessLabel = (d.readinessLabel as string) || "Developing";
  const readinessStyle = READINESS_STYLES[readinessLabel] || READINESS_STYLES["Developing"];

  const defScore = safeNum(d.defScore);
  const frictionScore = safeNum(d.frictionScore);
  const dataScore = safeNum(d.dataScore);

  const defWeight = 45;
  const frictionWeight = 30;
  const dataWeight = 25;

  const defPct = Math.round(defScore);
  const frictionPct = Math.round(frictionScore);
  const dataPct = Math.round(dataScore);

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <div className="mb-10">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Enterprise Risk Exposure
        </h1>
        <p className="text-base text-[#888] leading-relaxed max-w-lg" data-testid="text-page-subtitle">
          Ambient is infrastructure for audit posture, quality velocity, and downstream automation readiness.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-10">
        <div className="space-y-8">
          <div className="bg-[#F5F0EB] rounded-2xl p-6 border border-[#E8E0D8]" data-testid="hero-risk">
            {isZero ? (
              <div>
                <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-2">Conservative Value</p>
                <p className="text-4xl font-bold text-[#CCC] leading-none" data-testid="value-risk-conservative">
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
                  <p className="text-3xl md:text-4xl font-bold text-[#1A1A1A] tabular-nums leading-none" data-testid="value-risk-conservative">
                    {formatCurrency(Math.round(conservativeValue))}
                  </p>
                  <p className="text-[11px] text-[#999] mt-2" data-testid="text-haircut-note">
                    Displayed after {haircutPct}% confidence adjustment.
                  </p>
                </div>

                <div className="mt-5">
                  <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-1">Modeled Value</p>
                  <p className="text-xl font-semibold text-[#888] tabular-nums leading-none" data-testid="value-risk-modeled">
                    {formatCurrency(Math.round(rawValue))}
                  </p>
                  <p className="text-[11px] text-[#999] mt-1">Pre-cap model output</p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#E8E0D8]">
                  <p className="text-[11px] text-[#555] mb-2">
                    Modeled exposure capped at 0.2% of recognized revenue ({formatCurrency(Math.round(grossRevenue))}).
                  </p>
                  <div className="h-1.5 bg-[#EDEAE5] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${capUsagePct}%`,
                        backgroundColor: wasCapped ? "#EA2C00" : "#22C55E",
                      }}
                      data-testid="bar-cap-usage"
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-[#999]" data-testid="text-cap-note">
                      {formatCurrency(Math.round(cappedValue))} / {formatCurrency(Math.round(hardCap))} cap
                      {wasCapped ? " — cap applied" : ""}
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

          <div className="bg-[#F5F0EB] rounded-2xl p-5 border border-[#E8E0D8]" data-testid="section-readiness">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-medium text-[#999] uppercase tracking-wider mb-1">Readiness Score</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold text-[#1A1A1A] tabular-nums" data-testid="value-readiness-score">
                    {readinessScore}
                  </p>
                  <span className="text-sm text-[#999]">/ 100</span>
                </div>
              </div>
              <div
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${readinessStyle}`}
                data-testid="badge-readiness-label"
              >
                {readinessLabel}
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-[#EDEAE5] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${readinessScore}%`,
                  backgroundColor:
                    readinessScore >= 70 ? "#22C55E" : readinessScore >= 40 ? "#F59E0B" : "#EF4444",
                }}
                data-testid="bar-readiness"
              />
            </div>
            <p className="text-[11px] text-[#999] mt-2">
              Readiness influences downstream automation and audit defensibility.
            </p>
          </div>

          <div className="space-y-5" data-testid="section-drivers">
            <DriverRow
              label="Documentation defensibility"
              description={`Score: ${defPct}/100 — audit-readiness of clinical notes (${defWeight}% weight)`}
              pct={defPct}
            />
            <DriverRow
              label="Quality reporting friction"
              description={`Score: ${frictionPct}/100 — manual rework and addenda burden (${frictionWeight}% weight)`}
              pct={frictionPct}
            />
            <DriverRow
              label="Structured data usability"
              description={`Score: ${dataPct}/100 — downstream analytics and automation readiness (${dataWeight}% weight)`}
              pct={dataPct}
            />
          </div>

          <div className="hidden lg:block">
            <StepFooter onBack={onBack} onNext={onNext} nextTestId="button-next-risk" />
          </div>
        </div>

        <div className="lg:sticky lg:top-24 self-start" data-testid="panel-assumptions">
          <div className="rounded-2xl border border-[#E8E0D8] bg-[#F9F7F4] p-4 space-y-4">
            <p className="text-[10px] font-medium text-[#AAA] uppercase tracking-wider">Assumptions</p>

            <div>
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Documentation defensibility</label>
              <div className="flex flex-wrap gap-1.5">
                {DEFENSIBILITY_OPTIONS.map((opt) => {
                  const isActive = inputs.docDefensibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateInput("docDefensibility", opt.value)}
                      data-testid={`pills-defensibility-${opt.value}`}
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
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Reporting friction</label>
              <div className="flex flex-wrap gap-1.5">
                {FRICTION_OPTIONS.map((opt) => {
                  const isActive = inputs.qualityReportingFriction === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateInput("qualityReportingFriction", opt.value)}
                      data-testid={`pills-friction-${opt.value}`}
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
              <label className="block text-[11px] font-medium text-[#555] mb-1.5">Structured data</label>
              <div className="flex flex-wrap gap-1.5">
                {DATA_OPTIONS.map((opt) => {
                  const isActive = inputs.structuredDataUsability === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateInput("structuredDataUsability", opt.value)}
                      data-testid={`pills-data-${opt.value}`}
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
                    data-testid="value-risk-confidence"
                  >
                    {riskConfidence}
                  </span>
                  <span className="text-[10px] text-[#999]">inherited from calibration</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {CONFIDENCE_OPTIONS.map((opt) => {
                    const isActive = riskConfidence === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          dispatch(assessmentActions.updatePillarMeta("risk", "confidence", opt.value))
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
        <StepFooter onBack={onBack} onNext={onNext} nextTestId="button-next-risk" />
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
