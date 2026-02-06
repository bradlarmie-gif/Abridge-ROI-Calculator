import { useState } from "react";
import { ArrowLeft, Download, Loader2, TrendingUp, Clock, DollarSign, Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  formatCurrency,
  type SwitchInputs,
  type SwitchCalculations,
  ABRIDGE_BENCHMARKS
} from "@/lib/switchGapCalculator";
import { generateAmbientPDF } from "@/components/switch/AmbientPDFExport";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";

interface StepTheInvitationProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

function getScoreContext(score: number): { status: string; message: string } {
  if (score >= 85) return { 
    status: "Excellent", 
    message: "You're capturing most of the value. Fine-tune for maximum impact." 
  };
  if (score >= 70) return { 
    status: "Good", 
    message: "Solid foundation with meaningful room to grow." 
  };
  if (score >= 50) return { 
    status: "Developing", 
    message: "There's meaningful room to improve based on what the benchmarks suggest." 
  };
  return { 
    status: "Early Stage", 
    message: "There may be a significant opportunity here. We're happy to discuss it whenever you're ready." 
  };
}

export default function StepTheInvitation({
  inputs,
  calculations,
  onBack,
}: StepTheInvitationProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsGeneratingPDF(true);
    try {
      await generateAmbientPDF({
        inputs,
        calculations,
        clientName,
        preparedBy
      });
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your Value Realization Assessment has been saved.",
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

  const scoreContext = getScoreContext(calculations.realizationScore);
  const gapPercentage = 100 - calculations.realizationScore;

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
          The Opportunity
        </h1>
        <p className="text-base text-[#666666]">
          A summary of what we found — and what the benchmarks suggest is possible.
        </p>
      </div>

      <section className="bg-[#F5F0EB] rounded-xl p-6 md:p-8">
        <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-4">
          Annual Value to Unlock
        </p>
        <div className="border-l-4 border-[#EA2C00] pl-5">
          <p className="text-5xl md:text-6xl font-bold text-[#EA2C00]">
            {formatCurrency(calculations.annualGap)}
          </p>
          <p className="text-sm text-[#666666] mt-2">
            Based on your {inputs.providers} providers across {inputs.annualEncounters.toLocaleString()} annual encounters
          </p>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB]">
          <div className="p-5 text-center">
            <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-2">Year 1 Impact</p>
            <p className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">{formatCurrency(calculations.optimizedYear1)}</p>
            <p className="text-xs text-[#999999] mt-1">Accounting for ramp-up</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-2">3-Year Impact</p>
            <p className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">{formatCurrency(calculations.threeYearGap)}</p>
            <p className="text-xs text-[#999999] mt-1">Compounding value</p>
          </div>
          <div className="p-5 text-center">
            <p className="text-xs font-medium text-[#EA2C00] uppercase tracking-[1.5px] mb-2">Monthly Opportunity</p>
            <p className="text-2xl md:text-3xl font-bold text-[#EA2C00]">~{formatCurrency(calculations.monthlyGap)}</p>
            <p className="text-xs text-[#999999] mt-1">Potential value</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-1">Value Realization Score</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl md:text-5xl font-bold text-[#1A1A1A]">{calculations.realizationScore}%</span>
              <span className="text-base font-medium text-[#666666]">{scoreContext.status}</span>
            </div>
          </div>
          <div className="text-right border-l-4 border-[#EA2C00] pl-3">
            <p className="text-xs font-medium text-[#EA2C00] uppercase tracking-[1.5px] mb-1">Room to Grow</p>
            <span className="text-2xl font-bold text-[#EA2C00]">{gapPercentage}%</span>
          </div>
        </div>
        
        <div className="relative h-3 bg-[#E0E0E0] rounded-full overflow-hidden mb-3">
          <div 
            className="absolute inset-y-0 left-0 bg-[#1A1A1A] rounded-full transition-all duration-1000"
            style={{ width: `${calculations.realizationScore}%` }}
          />
        </div>
        
        <p className="text-sm text-[#666666]">{scoreContext.message}</p>
      </section>

      <section className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB]">
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <p className="text-xl font-bold text-[#1A1A1A]">{inputs.utilization}%</p>
            <p className="text-xs text-[#999999]">Utilization</p>
            <p className="text-[10px] text-[#999999] mt-0.5">vs. {ABRIDGE_BENCHMARKS.utilization}%</p>
          </div>
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <p className="text-xl font-bold text-[#1A1A1A]">{inputs.timeSavedPerEncounter} min</p>
            <p className="text-xs text-[#999999]">Time Saved</p>
            <p className="text-[10px] text-[#999999] mt-0.5">vs. {ABRIDGE_BENCHMARKS.timeSavedAvg} min</p>
          </div>
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center mx-auto mb-2">
              <DollarSign className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <p className="text-xl font-bold text-[#1A1A1A]">+{inputs.wrvuLift}%</p>
            <p className="text-xs text-[#999999]">wRVU Lift</p>
            <p className="text-[10px] text-[#999999] mt-0.5">vs. +{ABRIDGE_BENCHMARKS.wrvuLift}%</p>
          </div>
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <p className="text-xl font-bold text-[#1A1A1A]">{inputs.satisfaction}%</p>
            <p className="text-xs text-[#999999]">Satisfaction</p>
            <p className="text-[10px] text-[#999999] mt-0.5">vs. {ABRIDGE_BENCHMARKS.satisfaction}%</p>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F0EB] rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-2">What Comes Next</p>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">
              If this raises questions, we're here to help.
            </h2>
            <p className="text-sm text-[#666666]">
              This captures what you entered. If you'd like to discuss further, our team is available.
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <Button
              onClick={() => setShowExportModal(true)}
              className="bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white gap-2 rounded-full px-6 h-11"
              data-testid="button-export-pdf"
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download Report
            </Button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-[#EA2C00] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#666666]">
            <span className="font-semibold text-[#1A1A1A]">All calculations are based on your inputs and industry benchmarks.</span>
            {' '}Actual results depend on implementation quality, organizational readiness, and partnership approach.
          </p>
        </div>
      </section>

      <div className="flex justify-start pt-4">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="gap-2"
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
