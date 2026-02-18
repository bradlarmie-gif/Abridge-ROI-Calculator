import { useState, useMemo } from "react";
import { ArrowRight, ShieldCheck, ChevronDown, ChevronUp, Shield, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { computePillars } from "@/lib/pillars/computePillars";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import type { ConfidenceLevel } from "@/lib/assessment/assessmentTypes";

interface StepPillarRiskProps {
  onNext: () => void;
  onBack: () => void;
}

const DEFENSIBILITY_OPTIONS: { label: string; value: "high" | "medium" | "low"; description: string }[] = [
  { label: "High", value: "high", description: "Audit-ready, structured notes" },
  { label: "Medium", value: "medium", description: "Mostly complete, some gaps" },
  { label: "Low", value: "low", description: "Inconsistent, unstructured" },
];

const FRICTION_OPTIONS: { label: string; value: "smooth" | "manageable" | "painful"; description: string }[] = [
  { label: "Smooth", value: "smooth", description: "Automated, minimal rework" },
  { label: "Manageable", value: "manageable", description: "Some manual steps" },
  { label: "Painful", value: "painful", description: "Heavy manual effort" },
];

const DATA_OPTIONS: { label: string; value: "yes" | "some" | "no"; description: string }[] = [
  { label: "Yes", value: "yes", description: "Feeds analytics & automation" },
  { label: "Some", value: "some", description: "Partial structured capture" },
  { label: "No", value: "no", description: "Free-text only, no downstream use" },
];

const CONFIDENCE_OPTIONS: { label: string; value: ConfidenceLevel }[] = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const READINESS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Ready": { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "Developing": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "Not Ready": { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000).toLocaleString()}K`;
  return `$${n.toLocaleString()}`;
}

export default function StepPillarRisk({
  onNext,
  onBack,
}: StepPillarRiskProps) {
  const { state, dispatch } = useAssessment();
  const { inputs, pillarsMeta } = state;

  const [showConfidenceEdit, setShowConfidenceEdit] = useState(false);
  const [showMethod, setShowMethod] = useState(false);

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const riskConfidence = pillarsMeta.risk.confidence;

  const pillarResult = useMemo(() => computePillars(state), [state]);
  const riskDetails = pillarResult.pillars.risk.details;

  const safeNum = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const annualRiskProtection = safeNum(pillarResult.pillars.risk.valueAnnual);
  const hardCap = safeNum(riskDetails.hardCap);
  const wasCapped = Boolean(riskDetails.wasCapped);
  const readinessScore = safeNum(riskDetails.readinessScore);
  const readinessLabel = (riskDetails.readinessLabel as string) || "Developing";
  const grossRevenue = safeNum(riskDetails.grossRevenue);

  const hasInputs = inputs.providers > 0 && inputs.annualEncounters > 0;

  const capUsagePct = hardCap > 0 ? Math.min(100, Math.round((annualRiskProtection / hardCap) * 100)) : 0;

  const readinessColors = READINESS_COLORS[readinessLabel] || READINESS_COLORS["Developing"];

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Enterprise Risk & Strategic Readiness
        </h1>
        <p className="text-base text-[#666666] max-w-lg" data-testid="text-page-subtitle">
          Ambient is infrastructure for audit posture, quality velocity, and downstream automation readiness.
        </p>
      </div>

      <section className="space-y-5">
        <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8] shadow-sm">
          <label className="block text-[11px] font-medium text-[#999999] uppercase tracking-wider mb-3">
            Documentation Defensibility Confidence
          </label>
          <div className="flex flex-wrap gap-2">
            {DEFENSIBILITY_OPTIONS.map((opt) => {
              const isActive = inputs.docDefensibility === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateInput("docDefensibility", opt.value)}
                  data-testid={`pills-defensibility-${opt.value}`}
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
            Quality Reporting Friction
          </label>
          <div className="flex flex-wrap gap-2">
            {FRICTION_OPTIONS.map((opt) => {
              const isActive = inputs.qualityReportingFriction === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateInput("qualityReportingFriction", opt.value)}
                  data-testid={`pills-friction-${opt.value}`}
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
            Structured Data Usability Downstream
          </label>
          <div className="flex flex-wrap gap-2">
            {DATA_OPTIONS.map((opt) => {
              const isActive = inputs.structuredDataUsability === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateInput("structuredDataUsability", opt.value)}
                  data-testid={`pills-data-${opt.value}`}
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
          <div className="flex items-center justify-between mb-3">
            <label className="text-[11px] font-medium text-[#999999] uppercase tracking-wider">
              Risk Confidence
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
                data-testid="value-risk-confidence"
              >
                {riskConfidence}
              </span>
              <span className="text-[10px] text-[#999999]">— set in Pressure Map</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
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

      {hasInputs && (
        <section className="space-y-3" data-testid="risk-output-cards">
          <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-sm">
            <div className="text-center mb-4">
              <ShieldCheck className="w-6 h-6 text-[#EA2C00] mx-auto mb-2" />
              <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">Annual Risk Protection Value</p>
              <p className="text-3xl font-bold text-[#1A1A1A]" data-testid="value-risk-protection">
                {formatCurrency(Math.round(annualRiskProtection))}
              </p>
              <p className="text-[10px] text-[#999999] mt-1">directional, after confidence haircut</p>
            </div>

            <div className="mt-4 px-2">
              <div className="flex items-center justify-between text-[10px] text-[#999999] mb-1">
                <span>Cap usage</span>
                <span>
                  {formatCurrency(Math.round(annualRiskProtection))} / {formatCurrency(Math.round(hardCap))}
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#F0F0F0] rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${capUsagePct}%`,
                    backgroundColor: wasCapped ? "#EA2C00" : "#22C55E",
                  }}
                  data-testid="bar-cap-usage"
                />
                <div
                  className="absolute top-0 right-0 h-full w-px bg-[#EA2C00]"
                  style={{ left: "100%" }}
                />
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {wasCapped && <AlertTriangle className="w-3 h-3 text-[#EA2C00]" />}
                <p className="text-[10px] text-[#999999]" data-testid="text-cap-note">
                  Capped at 0.2% of gross revenue ({formatCurrency(Math.round(grossRevenue))})
                  {wasCapped ? " — cap applied" : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-[#E5E7EB] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#999999] uppercase tracking-wider mb-1">Readiness Score</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-[#1A1A1A]" data-testid="value-readiness-score">
                    {readinessScore}
                  </p>
                  <span className="text-sm text-[#999999]">/ 100</span>
                </div>
              </div>
              <div
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${readinessColors.bg} ${readinessColors.text} ${readinessColors.border}`}
                data-testid="badge-readiness-label"
              >
                {readinessLabel}
              </div>
            </div>

            <div className="mt-3 w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden">
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
            <div className="flex justify-between text-[9px] text-[#CCCCCC] mt-1">
              <span>Not Ready</span>
              <span>Developing</span>
              <span>Ready</span>
            </div>
          </div>
        </section>
      )}

      <div className="bg-[#FFFBF5] border border-[#F0E6D8] rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[#C77800] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#8B6914] leading-relaxed" data-testid="text-disclaimer">
          Risk values are directional estimates capped at 0.2% of estimated gross revenue.
          They do not constitute audit guarantees or compliance certifications.
          Actual risk exposure depends on payer mix, specialty, and regulatory environment.
        </p>
      </div>

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
              This model estimates enterprise risk protection from improved documentation infrastructure.
              It combines three dimensions into a composite score that drives both the financial value
              and the readiness assessment.
            </p>
            <div className="bg-[#F5F0EB] rounded-lg p-3 space-y-2">
              <p className="text-xs text-[#666666]">
                <span className="font-semibold text-[#1A1A1A]">Documentation defensibility (45%):</span>{" "}
                Audit exposure scaled by documentation quality. Higher defensibility reduces the
                risk gap, lowering the exposure rate applied to gross revenue.
              </p>
              <p className="text-xs text-[#666666]">
                <span className="font-semibold text-[#1A1A1A]">Quality reporting friction (30%):</span>{" "}
                Per-encounter friction cost ($0.25-$1.50) based on manual rework and addenda volume.
                Painful reporting signals higher aggregate friction costs.
              </p>
              <p className="text-xs text-[#666666]">
                <span className="font-semibold text-[#1A1A1A]">Structured data usability (25%):</span>{" "}
                Downstream automation readiness. Organizations with structured data capture
                unlock analytics, population health, and quality reporting automation.
              </p>
            </div>
            <div className="bg-[#FFF5F0] rounded-lg p-3 border border-[#FFDDD0]">
              <p className="text-xs text-[#666666]">
                <span className="font-semibold text-[#EA2C00]">Hard cap:</span>{" "}
                The risk protection value is capped at 0.2% of estimated gross revenue.
                This ensures the model never overstates risk reduction relative to organizational scale.
              </p>
            </div>
            <p className="text-[10px] text-[#999999] italic">
              Readiness score: 0-39 = Not Ready, 40-69 = Developing, 70-100 = Ready.
              All values receive a confidence haircut (high: 100%, medium: 70%, low: 40%).
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
          data-testid="button-next-risk"
        >
          Continue
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
