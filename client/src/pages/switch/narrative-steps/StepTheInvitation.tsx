import { useState } from "react";
import { ArrowLeft, Download, Mail, Link2, MessageCircle, Calendar, ChevronRight, CheckCircle, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  formatCurrency,
  type SwitchInputs,
  type SwitchCalculations
} from "@/lib/switchGapCalculator";
import { generateAmbientPDF } from "@/components/switch/AmbientPDFExport";

interface StepTheInvitationProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function StepTheInvitation({
  inputs,
  calculations,
  onBack,
  onBackToJourney,
}: StepTheInvitationProps) {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateAmbientPDF({
        inputs,
        calculations,
        clientName: "Value Analysis",
        preparedBy: "Abridge ROI Calculator"
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          Your Analysis is Complete
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          You've seen the gap. You understand why it happens.
          <br className="hidden md:block" />
          Now the question is: what do you want to do about it?
        </p>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 md:p-10 text-white">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm mb-6">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Your Opportunity</span>
          </div>
          
          <div className="text-4xl md:text-6xl font-bold mb-2 text-emerald-400">
            {formatCurrency(calculations.annualGap)}
          </div>
          <p className="text-slate-300">annual value currently left on the table</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{calculations.realizationScore}%</div>
            <p className="text-xs text-slate-400">Current realization</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{100 - calculations.realizationScore}%</div>
            <p className="text-xs text-slate-400">Room to grow</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{formatCurrency(calculations.threeYearGap)}</div>
            <p className="text-xs text-slate-400">3-year impact</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-white">{formatCurrency(calculations.monthlyGap)}</div>
            <p className="text-xs text-slate-400">Monthly cost of inaction</p>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-[#111827] mb-6">Share Your Analysis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleExportPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-left disabled:opacity-50"
            data-testid="button-export-pdf"
          >
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              {isGeneratingPDF ? (
                <Loader2 className="w-5 h-5 text-[#EA2C00] animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-[#EA2C00]" />
              )}
            </div>
            <div>
              <p className="font-semibold text-[#111827]">{isGeneratingPDF ? 'Generating...' : 'Export PDF'}</p>
              <p className="text-xs text-[#6B7280]">Download full report</p>
            </div>
          </button>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-left"
            data-testid="button-copy-link"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              {copied ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <Link2 className="w-5 h-5 text-blue-600" />}
            </div>
            <div>
              <p className="font-semibold text-[#111827]">{copied ? 'Copied!' : 'Copy Link'}</p>
              <p className="text-xs text-[#6B7280]">Share this analysis</p>
            </div>
          </button>

          <a
            href={`mailto:?subject=Value%20Realization%20Analysis&body=Here's%20our%20ambient%20AI%20value%20analysis%20showing%20${formatCurrency(calculations.annualGap)}%20annual%20opportunity.`}
            className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-left"
            data-testid="button-email"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-semibold text-[#111827]">Email Report</p>
              <p className="text-xs text-[#6B7280]">Send to your team</p>
            </div>
          </a>
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#EA2C00]/5 to-[#EA2C00]/10 rounded-xl border border-[#EA2C00]/20 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#EA2C00] flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-[#111827] mb-2">Ready to close the gap?</h3>
            <p className="text-[#6B7280] mb-4">
              If you're interested in exploring what full value realization could look like, 
              we'd be happy to walk through the analysis with you — no pressure, just clarity.
            </p>
            <a
              href="https://www.abridge.com/contact"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#EA2C00] hover:bg-[#d12700] text-white rounded-lg font-medium transition-colors"
              data-testid="button-contact"
            >
              <Calendar className="w-4 h-4" />
              Schedule a Conversation
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
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
            Start Over
          </Button>
        )}
      </div>

    </div>
  );
}
