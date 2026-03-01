import { useState, useMemo } from "react";
import { ArrowLeft, Download, Loader2, ArrowRight } from "lucide-react";
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
  capacity: "Capacity Creation",
  yield: "Revenue Integrity",
  workforce: "Workforce Stability",
  risk: "Risk & Compliance",
};

const PILLAR_DESCRIPTIONS: Record<PillarId, { meaning: string; closing: string }> = {
  capacity: {
    meaning: "Physician time currently absorbed by documentation overhead could be redirected to patient access and throughput.",
    closing: "Requires systematic utilization improvement and workflow integration beyond basic ambient capture.",
  },
  yield: {
    meaning: "Revenue leakage through incomplete documentation, missed coding opportunities, and denial exposure.",
    closing: "Requires documentation completeness that feeds coding accuracy and denial prevention at the encounter level.",
  },
  workforce: {
    meaning: "Provider burnout, after-hours charting, and retention risk tied directly to documentation burden.",
    closing: "Requires measurable reduction in documentation-related dissatisfaction and after-hours work.",
  },
  risk: {
    meaning: "Compliance exposure through incomplete structured data, quality reporting gaps, and audit readiness.",
    closing: "Requires documentation infrastructure that produces defensible, auditable clinical records.",
  },
};

const PILLAR_WEIGHTS: Record<PillarId, number> = {
  capacity: 0.30,
  yield: 0.30,
  workforce: 0.20,
  risk: 0.20,
};

const TOP_QUARTILE = 71;

export default function StepTheInvitation({
  inputs,
  calculations,
  onBack,
}: StepTheInvitationProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", organization: "", title: "", email: "" });
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

  const gapFillPercent = Math.min(100, Math.round((enterpriseScore / 100) * 100));
  const topQuartilePercent = Math.round((TOP_QUARTILE / 100) * 100);

  const highestLeveragePillar = useMemo(() => {
    let maxId: PillarId = "capacity";
    let maxVal = 0;
    PILLAR_ORDER.forEach((id) => {
      if (pillars[id].valueAnnual > maxVal) {
        maxVal = pillars[id].valueAnnual;
        maxId = id;
      }
    });
    return maxId;
  }, [pillars]);

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsGeneratingPDF(true);
    try {
      await generateAmbientPDF({ inputs, calculations, clientName, preparedBy });
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your assessment has been saved.",
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

  const handleFormSubmit = () => {
    setFormSubmitted(true);
    toast({
      title: "Request Received",
      description: "We'll be in touch within one business day.",
      variant: "brand",
    });
  };

  const isFormValid = formData.name && formData.organization && formData.email;

  return (
    <div className="max-w-[640px] mx-auto py-20 md:py-24 px-4" style={{ fontFamily: "Manrope, sans-serif" }}>

      <section className="mb-16" data-testid="section-verdict">
        <p className="text-xs font-medium text-[#9B9B9B] uppercase tracking-[2px] mb-6">
          Enterprise Documentation Capture Score
        </p>

        <div className="flex items-baseline justify-between mb-6">
          <div className="flex items-baseline gap-1">
            <span
              className="text-[48px] md:text-[56px] font-bold text-[#1A1A1A] tabular-nums leading-none"
              data-testid="value-score"
            >
              {enterpriseScore}
            </span>
            <span className="text-[20px] text-[#9B9B9B] font-medium">/ 100</span>
          </div>
          <div className="text-right">
            <span className="text-[14px] text-[#9B9B9B]">
              Top quartile: <span className="font-semibold text-[#1A1A1A] tabular-nums">{TOP_QUARTILE}</span> / 100
            </span>
          </div>
        </div>

        <div className="relative h-2 bg-[#F0F0F0] rounded-full overflow-hidden mb-4">
          <div
            className="absolute left-0 top-0 h-full bg-[#EA2C00] rounded-full transition-all duration-700"
            style={{ width: `${gapFillPercent}%` }}
            data-testid="bar-score"
          />
          <div
            className="absolute top-0 h-full border-r-2 border-dashed border-[#9B9B9B]"
            style={{ left: `${topQuartilePercent}%` }}
          />
        </div>

        <p
          className="text-[17px] text-[#4B4B4B] leading-[1.7] mt-6"
          data-testid="text-capture-verdict"
        >
          You are capturing approximately {enterpriseScore}% of the enterprise
          value flowing through your documentation infrastructure.
        </p>
      </section>

      <div className="w-full h-px bg-[#E8E0D8] mb-16" />

      <section className="mb-16" data-testid="section-opportunity">
        <p className="text-xs font-medium text-[#9B9B9B] uppercase tracking-[2px] mb-6">
          Primary Opportunity
        </p>

        <div className="bg-[#F7F6F4] rounded-lg p-6 md:p-8">
          <h3
            className="text-[20px] font-bold text-[#1A1A1A] mb-2"
            data-testid="text-opportunity-name"
          >
            {PILLAR_LABELS[highestLeveragePillar]}
          </h3>
          <p
            className="text-[24px] md:text-[28px] font-bold text-[#1A1A1A] tabular-nums mb-4"
            data-testid="text-opportunity-value"
          >
            {formatCurrency(Math.round(pillars[highestLeveragePillar].valueAnnual))} annually
          </p>
          <p className="text-[15px] text-[#4B4B4B] leading-[1.7] mb-3">
            {PILLAR_DESCRIPTIONS[highestLeveragePillar].meaning}
          </p>
          <p className="text-[15px] text-[#9B9B9B] leading-[1.7]">
            {PILLAR_DESCRIPTIONS[highestLeveragePillar].closing}
          </p>
        </div>
      </section>

      <div className="w-full h-px bg-[#E8E0D8] mb-16" />

      <section className="text-center mb-12" data-testid="section-invitation">
        {!formSubmitted ? (
          <>
            <h2
              className="text-[24px] md:text-[28px] font-bold text-[#1A1A1A] leading-[1.4] mb-6"
              data-testid="text-invitation-question"
            >
              Would you like to see what a
              <br />
              documentation-intelligent organization
              <br />
              looks like at your scale?
            </h2>

            <p className="text-[15px] text-[#4B4B4B] leading-[1.7] max-w-md mx-auto mb-10">
              This is not a product demonstration.
              <br />
              It is a 30-minute working session with someone
              <br />
              who has mapped this for organizations like yours.
            </p>

            {!showForm ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#EA2C00] text-white text-[15px] font-semibold rounded-lg hover:bg-[#D42800] transition-colors"
                  data-testid="button-request-session"
                >
                  Request a Working Session
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-4 text-[15px] font-medium text-[#4B4B4B] border border-[#E0E0E0] rounded-lg hover:border-[#9B9B9B] transition-colors"
                  data-testid="button-export-assessment"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export My Assessment
                </button>
              </div>
            ) : (
              <div className="max-w-sm mx-auto text-left">
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-[13px] text-[#9B9B9B] mb-1.5">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 text-[15px] text-[#1A1A1A] border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:border-[#EA2C00] transition-colors"
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-[#9B9B9B] mb-1.5">Organization</label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="w-full px-4 py-3 text-[15px] text-[#1A1A1A] border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:border-[#EA2C00] transition-colors"
                      data-testid="input-organization"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-[#9B9B9B] mb-1.5">Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 text-[15px] text-[#1A1A1A] border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:border-[#EA2C00] transition-colors"
                      data-testid="input-title"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] text-[#9B9B9B] mb-1.5">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 text-[15px] text-[#1A1A1A] border-2 border-[#E0E0E0] rounded-lg focus:outline-none focus:border-[#EA2C00] transition-colors"
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <button
                  onClick={handleFormSubmit}
                  disabled={!isFormValid}
                  className={`w-full inline-flex items-center justify-center gap-2.5 px-8 py-4 text-[15px] font-semibold rounded-lg transition-colors ${
                    isFormValid
                      ? "bg-[#EA2C00] text-white hover:bg-[#D42800]"
                      : "bg-[#E0E0E0] text-[#9B9B9B] cursor-not-allowed"
                  }`}
                  data-testid="button-submit-session"
                >
                  Submit
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="py-8">
            <p className="text-[17px] text-[#1A1A1A] leading-[1.7] mb-4">
              We'll be in touch within one business day.
            </p>
            <p className="text-[15px] text-[#9B9B9B] leading-[1.7] mb-8">
              In the meantime \u2014 your assessment is available to export.
            </p>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-6 py-4 text-[15px] font-medium text-[#4B4B4B] border border-[#E0E0E0] rounded-lg hover:border-[#9B9B9B] transition-colors"
              data-testid="button-export-after-submit"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export My Assessment
            </button>
          </div>
        )}
      </section>

      <p className="text-xs text-[#AAAAAA] leading-relaxed max-w-2xl mx-auto mt-12 mb-6" data-testid="text-methodology-disclaimer">
        Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and Abridge deployment data. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. All values shown after stated confidence adjustments. This assessment does not constitute a guarantee of financial outcomes.
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-[#E8E0D8]">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-[#9B9B9B]"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
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
