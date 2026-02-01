import { useState } from "react";
import { ArrowLeft, Download, Mail, Link2, CheckCircle, Sparkles, Loader2, TrendingUp, Target, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  formatCurrency,
  type SwitchInputs,
  type SwitchCalculations
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

function getScoreLabel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 80) return { label: "Excellent", color: "text-emerald-600", bgColor: "bg-emerald-500" };
  if (score >= 65) return { label: "Good", color: "text-blue-600", bgColor: "bg-blue-500" };
  if (score >= 50) return { label: "Moderate", color: "text-amber-600", bgColor: "bg-amber-500" };
  return { label: "Early Stage", color: "text-red-600", bgColor: "bg-red-500" };
}

export default function StepTheInvitation({
  inputs,
  calculations,
  onBack,
  onBackToJourney,
}: StepTheInvitationProps) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const scoreInfo = getScoreLabel(calculations.realizationScore);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          Your Analysis
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          Here's where you stand — and what's possible.
        </p>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 text-white">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm mb-4">
              <Target className="w-4 h-4 text-amber-400" />
              <span>Value Realization Score</span>
            </div>
            
            <div className="flex items-baseline gap-3 justify-center md:justify-start mb-2">
              <span className="text-5xl md:text-6xl font-bold">{calculations.realizationScore}%</span>
              <span className={`text-lg font-medium ${scoreInfo.color.replace('text-', 'text-').replace('-600', '-400')}`}>
                {scoreInfo.label}
              </span>
            </div>
            
            <div className="w-full max-w-xs mx-auto md:mx-0 mt-4">
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${scoreInfo.bgColor} rounded-full transition-all duration-1000`}
                  style={{ width: `${calculations.realizationScore}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <div className="w-px h-24 bg-white/20 hidden md:block" />

          <div className="flex-1 text-center md:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full text-sm mb-4">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Your Opportunity</span>
            </div>
            
            <div className="text-4xl md:text-5xl font-bold mb-2 text-emerald-400">
              {formatCurrency(calculations.annualGap)}
            </div>
            <p className="text-slate-400">annual value to unlock</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 mt-6 border-t border-white/10">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white">{inputs.utilization}%</div>
            <p className="text-xs text-slate-400">Your utilization</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-white">{inputs.timeSavedPerEncounter} min</div>
            <p className="text-xs text-slate-400">Time saved/encounter</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-lg font-bold text-white">+{inputs.wrvuLift}%</div>
            <p className="text-xs text-slate-400">wRVU lift</p>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white">{inputs.satisfaction}%</div>
            <p className="text-xs text-slate-400">Satisfaction</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">Room to Grow</p>
          <p className="text-2xl font-bold text-[#111827]">{100 - calculations.realizationScore}%</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">3-Year Impact</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(calculations.threeYearGap)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <p className="text-xs text-[#6B7280] uppercase tracking-wide mb-1">Monthly Cost of Waiting</p>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(calculations.monthlyGap)}</p>
        </div>
      </div>

      <section className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-[#111827] mb-2">Share Your Analysis</h2>
        <p className="text-sm text-[#6B7280] mb-6">
          Export this analysis to share with your team or stakeholders.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-[#EA2C00] hover:shadow-md transition-all text-left group"
            data-testid="button-export-pdf"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EA2C00] to-[#d12700] flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#111827] group-hover:text-[#EA2C00] transition-colors">
                Export PDF
              </p>
              <p className="text-xs text-[#6B7280]">Download full report</p>
            </div>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all text-left group"
            data-testid="button-copy-link"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
              {copied ? <CheckCircle className="w-5 h-5 text-white" /> : <Link2 className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className="font-semibold text-[#111827] group-hover:text-blue-600 transition-colors">
                {copied ? 'Copied!' : 'Copy Link'}
              </p>
              <p className="text-xs text-[#6B7280]">Share this analysis</p>
            </div>
          </button>

          <a
            href={`mailto:?subject=Value%20Realization%20Analysis&body=Here's%20our%20ambient%20AI%20value%20analysis.%0A%0AValue%20Realization%20Score:%20${calculations.realizationScore}%25%0AAnnual%20Opportunity:%20${formatCurrency(calculations.annualGap)}`}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all text-left group"
            data-testid="button-email"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#111827] group-hover:text-purple-600 transition-colors">Email Report</p>
              <p className="text-xs text-[#6B7280]">Send to your team</p>
            </div>
          </a>
        </div>
      </section>

      <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-[#6B7280]">
        <p>
          This analysis is for informational purposes only. All calculations are based on 
          the inputs provided and industry benchmarks. Actual results may vary.
        </p>
      </div>

      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        {onBackToJourney && (
          <Button
            variant="outline"
            onClick={onBackToJourney}
            className="gap-2"
            data-testid="button-start-over"
          >
            Start New Analysis
          </Button>
        )}
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
