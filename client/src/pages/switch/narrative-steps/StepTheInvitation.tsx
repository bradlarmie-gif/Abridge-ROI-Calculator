import { useState, useMemo } from "react";
import { ArrowLeft, Download, Loader2, ArrowRight } from "lucide-react";
import { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  type SwitchInputs,
  type SwitchCalculations,
} from "@/lib/switchGapCalculator";
import { generateAmbientPDF } from "@/components/switch/AmbientPDFExport";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";
import { useAssessment } from "@/lib/assessment";
import { computePillars } from "@/lib/pillars/computePillars";
import type { PillarId } from "@/lib/pillars/computePillars";

interface StepTheInvitationProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

const PILLAR_ORDER: PillarId[] = ["capacity", "yield", "workforce", "risk"];

const PILLAR_LABELS: Record<PillarId, string> = {
  capacity: "Capacity",
  yield: "Revenue & Yield",
  workforce: "Workforce Stability",
  risk: "Enterprise Risk",
};

const PILLAR_WEIGHTS: Record<PillarId, number> = {
  capacity: 0.30,
  yield: 0.30,
  workforce: 0.20,
  risk: 0.20,
};

const INDUSTRY_AVG = 34;
const TOP_QUARTILE = 71;

export default function StepTheInvitation({
  inputs,
  calculations,
  onBack,
}: StepTheInvitationProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();

  const { state } = useAssessment();
  const pillarResult = useMemo(() => computePillars(state), [state]);
  const { pillars, totalAnnual } = pillarResult;

  const enterpriseScore = Math.round(
    PILLAR_ORDER.reduce(
      (acc, id) => acc + pillars[id].score0to100 * PILLAR_WEIGHTS[id],
      0,
    ),
  );

  const gapToTopQuartile = Math.max(0, TOP_QUARTILE - enterpriseScore);
  const gapFillPercent = Math.min(100, Math.round((enterpriseScore / TOP_QUARTILE) * 100));

  const sorted = useMemo(
    () => [...PILLAR_ORDER].sort((a, b) => pillars[a].score0to100 - pillars[b].score0to100),
    [pillars],
  );

  const verdictLine = useMemo(() => {
    if (enterpriseScore <= INDUSTRY_AVG) {
      return "Your documentation infrastructure is performing at or below the industry average. The distance to top-quartile capture is not incremental — it is structural.";
    }
    if (enterpriseScore < TOP_QUARTILE) {
      return `You are above average but below top-quartile. ${gapToTopQuartile} points of structural improvement remain between current performance and full enterprise capture.`;
    }
    return "You are operating at top-quartile levels. The focus shifts from closing gaps to sustaining advantage and deepening capture across all pillars.";
  }, [enterpriseScore, gapToTopQuartile]);

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsGeneratingPDF(true);
    try {
      await generateAmbientPDF({
        inputs,
        calculations,
        clientName,
        preparedBy,
      });
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your Enterprise Summary has been saved.",
        variant: "brand",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className={`space-y-10 max-w-3xl mx-auto ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-center pt-4">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-1 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          The Documentation
        </h1>
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] font-abridge uppercase tracking-tight"
          data-testid="text-page-title-2"
        >
          Intelligence Gap
        </h1>
      </div>

      <section className="text-center" data-testid="section-verdict">
        <p
          className="text-base text-[#1A1A1A] leading-relaxed max-w-lg mx-auto"
          data-testid="text-verdict"
        >
          {verdictLine}
        </p>
      </section>

      <section data-testid="section-gap-bar">
        <div className="bg-[#F5F0EB] rounded-xl border border-[#E8E0D8] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-[#999] uppercase tracking-widest font-medium">Your Score</p>
              <p className="text-3xl font-bold text-[#1A1A1A] tabular-nums" data-testid="value-score">
                {enterpriseScore}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#999] uppercase tracking-widest font-medium">Top Quartile</p>
              <p className="text-3xl font-bold text-[#999] tabular-nums" data-testid="value-top-quartile">
                {TOP_QUARTILE}
              </p>
            </div>
          </div>

          <div className="relative h-3 bg-white rounded-full overflow-hidden border border-[#E8E0D8]">
            <div
              className="absolute left-0 top-0 h-full bg-[#EA2C00] rounded-full transition-all duration-700"
              style={{ width: `${gapFillPercent}%` }}
              data-testid="bar-gap"
            />
            <div
              className="absolute top-0 h-full border-r-2 border-dashed border-[#999]"
              style={{ left: `${Math.min(100, Math.round((INDUSTRY_AVG / TOP_QUARTILE) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-[#BBB]">0</span>
            <span className="text-[9px] text-[#999]">Industry Avg ({INDUSTRY_AVG})</span>
            <span className="text-[9px] text-[#BBB]">{TOP_QUARTILE}</span>
          </div>

          {gapToTopQuartile > 0 && (
            <p className="text-sm text-[#666] mt-4 text-center" data-testid="text-gap-points">
              <span className="font-semibold text-[#EA2C00] tabular-nums">{gapToTopQuartile} points</span> separate your current position from top-quartile enterprise capture.
            </p>
          )}
        </div>
      </section>

      <section data-testid="section-value-at-stake">
        <div className="text-center mb-6">
          <p className="text-[10px] text-[#999] uppercase tracking-widest font-medium mb-2">Annual Enterprise Value at Stake</p>
          <p className="text-5xl md:text-6xl font-bold text-[#1A1A1A] tabular-nums" data-testid="value-annual">
            {formatCurrency(Math.round(totalAnnual))}
          </p>
        </div>
      </section>

      <section data-testid="section-intervention">
        <p className="text-[10px] text-[#999] uppercase tracking-widest mb-3 font-medium">
          Intervention Priority
        </p>
        <div className="space-y-3">
          {sorted.slice(0, 3).map((id, i) => {
            const pillar = pillars[id];
            return (
              <div
                key={id}
                className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-4"
                data-testid={`intervention-${id}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-[#EA2C00]" : "bg-[#CCC]"}`}>
                  <span className="text-[10px] font-bold text-white">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#1A1A1A]">{PILLAR_LABELS[id]}</span>
                    <span className="text-xs font-semibold text-[#EA2C00] tabular-nums" data-testid={`intervention-value-${id}`}>
                      {formatCurrency(Math.round(pillar.valueAnnual))}/yr at stake
                    </span>
                  </div>
                  <p className="text-xs text-[#888] mt-0.5">
                    Score: <span className="tabular-nums">{pillar.score0to100}/100</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-[#1A1A1A] rounded-xl p-6 md:p-8 text-center" data-testid="section-invitation">
        <p className="text-[10px] text-[#666] uppercase tracking-widest mb-4 font-medium">
          What Happens Next
        </p>
        <p className="text-base text-[#CCC] leading-relaxed max-w-md mx-auto mb-6">
          This analysis identifies the structural gap. Closing it requires a focused intervention plan calibrated to your specific operational context.
        </p>
        <p className="text-sm text-[#999] italic max-w-sm mx-auto">
          Would you like to explore what a structured engagement looks like?
        </p>
      </section>

      <div className="border-t border-[#E5E7EB] pt-4">
        <p className="text-xs text-[#999] leading-relaxed" data-testid="text-disclaimer">
          This model reflects conservative, haircut-adjusted assumptions. Realized value depends on execution discipline, adoption depth, and governance maturity.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowExportModal(true)}
          className="gap-2 text-[#666666]"
          data-testid="button-export-summary"
        >
          {isGeneratingPDF ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export Executive Summary
        </Button>
      </div>

      <PDFExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportPDF}
        isExporting={isGeneratingPDF}
        documentType="value analysis"
      />
    </div>
  );
}
