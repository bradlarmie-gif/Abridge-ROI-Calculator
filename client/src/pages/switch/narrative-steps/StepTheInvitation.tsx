import { useState, useMemo } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
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

const RAMP = 0.9;
const GROWTH = 0.03;

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
  const roomToUnlock = 100 - enterpriseScore;

  const threeYearValue = useMemo(() => {
    const year1 = Math.round(totalAnnual * RAMP);
    const year2 = Math.round(totalAnnual);
    const year3 = Math.round(totalAnnual * (1 + GROWTH));
    return year1 + year2 + year3;
  }, [totalAnnual]);

  const insights = useMemo(() => {
    const sorted = [...PILLAR_ORDER].sort(
      (a, b) => pillars[a].score0to100 - pillars[b].score0to100,
    );
    const lines: string[] = [];

    const lowest = sorted[0];
    lines.push(
      `${PILLAR_LABELS[lowest]} is your primary leverage area at ${pillars[lowest].score0to100}/100 — focused intervention here yields the highest marginal return.`,
    );

    const secondLowest = sorted[1];
    if (pillars[secondLowest].valueAnnual > 0) {
      lines.push(
        `${PILLAR_LABELS[secondLowest]} represents ${formatCurrency(pillars[secondLowest].valueAnnual)}/yr in addressable value with targeted execution.`,
      );
    }

    lines.push(
      `Each year of delayed action leaves ${formatCurrency(totalAnnual)} in unrealized enterprise value on the table.`,
    );

    return lines.slice(0, 3);
  }, [pillars, totalAnnual]);

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
    <div className={`space-y-10 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Enterprise Summary
        </h1>
      </div>

      <section data-testid="section-economic-impact">
        <p className="text-[10px] text-[#999999] uppercase tracking-widest mb-3 font-medium">
          Economic Impact
        </p>
        <div className="bg-[#F5F0EB] rounded-xl border border-[#E8E0D8] p-6 md:p-8">
          <p
            className="text-4xl md:text-5xl font-bold text-[#1A1A1A] tabular-nums"
            data-testid="value-annual-opportunity"
          >
            {formatCurrency(Math.round(totalAnnual))}
          </p>
          <p className="text-sm text-[#666666] mt-1">Annual Opportunity</p>

          <div className="mt-5 pt-5 border-t border-[#E8E0D8]">
            <p
              className="text-2xl font-bold text-[#1A1A1A] tabular-nums"
              data-testid="value-three-year"
            >
              {formatCurrency(threeYearValue)}
            </p>
            <p className="text-sm text-[#666666] mt-1">3-Year Cumulative Value</p>
          </div>

          <p className="text-xs text-[#999999] mt-5">
            Conservative, haircut-adjusted across four economic engines.
          </p>
        </div>
      </section>

      <section data-testid="section-capture-position">
        <p className="text-[10px] text-[#999999] uppercase tracking-widest mb-3 font-medium">
          Capture Position
        </p>
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] text-[#999999] uppercase tracking-wider mb-1">
                Value Capture Score
              </p>
              <p
                className="text-4xl font-bold text-[#1A1A1A] tabular-nums"
                data-testid="value-capture-score"
              >
                {enterpriseScore}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[#999999] uppercase tracking-wider mb-1">
                Room to Unlock
              </p>
              <p
                className="text-4xl font-bold text-[#EA2C00] tabular-nums"
                data-testid="value-room-to-unlock"
              >
                {roomToUnlock}%
              </p>
            </div>
          </div>

          <div className="w-full h-2 bg-[#F0F0F0] rounded-full overflow-hidden mt-4 mb-3">
            <div
              className="h-full bg-[#1A1A1A] rounded-full transition-all duration-1000"
              style={{ width: `${enterpriseScore}%` }}
              data-testid="bar-capture-score"
            />
          </div>

          <p className="text-sm text-[#666666]" data-testid="text-capture-context">
            You are capturing approximately {enterpriseScore}% of modeled enterprise value.
          </p>
        </div>
      </section>

      <section data-testid="section-what-this-means">
        <p className="text-[10px] text-[#999999] uppercase tracking-widest mb-3 font-medium">
          What This Means
        </p>
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1A1A1A] mt-2 flex-shrink-0" />
              <p
                className="text-sm text-[#666666] leading-relaxed"
                data-testid={`insight-${i}`}
              >
                {insight}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[#E5E7EB] pt-6">
        <p className="text-xs text-[#999999] leading-relaxed" data-testid="text-disclaimer">
          This model reflects conservative assumptions. Realized value depends on execution discipline.
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
