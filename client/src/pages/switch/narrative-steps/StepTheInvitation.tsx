import { useState } from "react";
import { ArrowLeft, Download, ArrowRight, Loader2, TrendingUp, Clock, DollarSign, Users, CheckCircle } from "lucide-react";
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
    message: "Significant opportunity to accelerate your value capture." 
  };
  return { 
    status: "Early Stage", 
    message: "Major opportunity exists. Let's explore the possibilities together." 
  };
}

export default function StepTheInvitation({
  inputs,
  calculations,
  onBack,
  onBackToJourney,
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
  
  // Year 1 accounts for 3-month ramp at 50% efficiency
  const yearOneValue = Math.round(calculations.annualGap * 0.875);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm font-semibold text-[#EA2C00] uppercase tracking-widest mb-2">Your Analysis</p>
        <h1 className="font-abridge uppercase text-3xl md:text-4xl font-bold text-black mb-3" data-testid="text-page-title">
          The Opportunity
        </h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
          Here's where you stand — and what's possible with the right partnership.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-8 md:p-10 text-center border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Annual Value to Unlock</p>
          <p className="font-abridge uppercase text-5xl md:text-6xl font-bold text-[#EA2C00] mb-2">
            {formatCurrency(calculations.annualGap)}
          </p>
          <p className="text-slate-500">
            Based on your {inputs.providers} providers across {inputs.annualEncounters.toLocaleString()} annual encounters
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-6 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Year 1 Impact</p>
            <p className="text-3xl font-bold text-black">{formatCurrency(yearOneValue)}</p>
            <p className="text-sm text-slate-500 mt-1">Accounting for ramp-up</p>
          </div>
          <div className="p-6 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">3-Year Impact</p>
            <p className="text-3xl font-bold text-black">{formatCurrency(calculations.threeYearGap)}</p>
            <p className="text-sm text-slate-500 mt-1">Compounding value</p>
          </div>
          <div className="p-6 text-center">
            <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-2">Monthly Cost of Waiting</p>
            <p className="text-3xl font-bold text-[#EA2C00]">{formatCurrency(calculations.monthlyGap)}</p>
            <p className="text-sm text-slate-500 mt-1">Value left on table</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Value Realization Score</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl md:text-5xl font-bold text-black">{calculations.realizationScore}%</span>
                <span className="text-lg font-medium text-slate-500">{scoreContext.status}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-1">Room to Grow</p>
              <span className="text-2xl font-bold text-[#EA2C00]">{gapPercentage}%</span>
            </div>
          </div>
          
          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div 
              className="absolute inset-y-0 left-0 bg-black rounded-full transition-all duration-1000"
              style={{ width: `${calculations.realizationScore}%` }}
            />
          </div>
          
          <p className="text-sm text-slate-600">{scoreContext.message}</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-t border-slate-100">
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <p className="text-xl font-bold text-black">{inputs.utilization}%</p>
            <p className="text-xs text-slate-500">Utilization</p>
            <p className="text-[10px] text-slate-400 mt-0.5">vs. {ABRIDGE_BENCHMARKS.utilization}% benchmark</p>
          </div>
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center mx-auto mb-2">
              <Clock className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <p className="text-xl font-bold text-black">{inputs.timeSavedPerEncounter} min</p>
            <p className="text-xs text-slate-500">Time Saved</p>
            <p className="text-[10px] text-slate-400 mt-0.5">vs. {ABRIDGE_BENCHMARKS.timeSavedAvg} min benchmark</p>
          </div>
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center mx-auto mb-2">
              <DollarSign className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <p className="text-xl font-bold text-black">+{inputs.wrvuLift}%</p>
            <p className="text-xs text-slate-500">wRVU Lift</p>
            <p className="text-[10px] text-slate-400 mt-0.5">vs. +{ABRIDGE_BENCHMARKS.wrvuLift}% benchmark</p>
          </div>
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <p className="text-xl font-bold text-black">{inputs.satisfaction}%</p>
            <p className="text-xs text-slate-500">Satisfaction</p>
            <p className="text-[10px] text-slate-400 mt-0.5">vs. {ABRIDGE_BENCHMARKS.satisfaction}% benchmark</p>
          </div>
        </div>
      </div>

      <div className="bg-black rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">What Comes Next</p>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              Let's explore this opportunity together.
            </h2>
            <p className="text-white/70">
              This analysis is just the starting point. Our team can help you build a personalized implementation roadmap based on your specific context and goals.
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <Button
              onClick={() => setShowExportModal(true)}
              className="bg-white hover:bg-white/90 text-black gap-2 rounded-full px-6 h-12"
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
      </div>

      <div className="bg-[#FFF5F2] rounded-xl p-5 border border-[#EA2C00]/10">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-[#EA2C00] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-black">All calculations are based on your inputs and industry benchmarks.</span>
            {' '}Actual results depend on implementation quality, organizational readiness, and partnership approach. This analysis is for informational purposes.
          </p>
        </div>
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
