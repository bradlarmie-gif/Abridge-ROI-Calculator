import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Download, TrendingUp, Users, DollarSign, RefreshCw, Clock, Sparkles, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type ScribeInputs,
  calculateScribeGap,
  formatCurrency,
} from "@/lib/scribeGapCalculator";
import { generateScribePDF } from "@/components/switch/ScribePDFExport";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";

import patternV from "@assets/pattern-3-v_1769391110218.png";
import patternSemicircle from "@assets/pattern-4-semicircle_1769391110218.png";
import patternQuarter from "@assets/pattern-8-quartercircle_1769391110218.png";
import patternCorner from "@assets/pattern-2-corner_1769391110218.png";

interface ScribeFullAnalysisProps {
  inputs: ScribeInputs;
  onBack: () => void;
  onBackToJourney?: () => void;
  onExploreAmbientAI?: (providers: number, encounters: number) => void;
}

export default function ScribeFullAnalysis({
  inputs,
  onBack,
  onBackToJourney,
  onExploreAmbientAI,
}: ScribeFullAnalysisProps) {
  const calculations = useMemo(() => calculateScribeGap(inputs), [inputs]);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();

  // Calculate hidden costs (use inputs or defaults)
  const turnoverRate = (inputs.turnoverRate > 0 ? inputs.turnoverRate : 40) / 100;
  const trainingCostPerScribe = inputs.trainingCostPerScribe > 0 ? inputs.trainingCostPerScribe : 5000;
  const annualTurnoverCost = Math.round(inputs.scribeCount * turnoverRate * trainingCostPerScribe);
  const managementOverhead = Math.round(calculations.totalScribeCost * 0.15); // 15% management overhead
  const totalHiddenCosts = annualTurnoverCost + managementOverhead;
  const trueTotalCost = calculations.totalScribeCost + totalHiddenCosts;

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsExporting(true);
    try {
      await generateScribePDF(inputs, calculations, clientName, preparedBy);
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your Scribe Program Analysis has been saved.",
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader 
        pathType="switch"
        currentStep={2} 
        totalSteps={2}
        stepName="Full Analysis"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="py-6 md:py-8 pb-8 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto">
        
        {/* CHAPTER 1: The Scaling Reality */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#111827] mb-3">
              The Problem With Scaling Scribes
            </h1>
            <p className="text-sm md:text-base text-[#6B7280] max-w-2xl mx-auto">
              You're spending {formatCurrency(calculations.totalScribeCost)}/year to cover {calculations.coveragePercent}% of your providers. Here's why that math never gets better.
            </p>
          </div>

          {/* The Linear Scaling Visual */}
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 md:p-8 shadow-sm">
            <h2 className="text-base md:text-lg font-bold text-[#111827] mb-2">Scribe programs scale linearly</h2>
            <p className="text-sm text-[#6B7280] mb-6">Double the coverage = double the cost. There are no economies of scale.</p>

            <div className="space-y-4 mb-6">
              {/* Current State */}
              <div className="flex items-center gap-4">
                <div className="w-20 text-right">
                  <span className="text-sm font-semibold text-[#111827]">{calculations.coveragePercent}%</span>
                </div>
                <div className="flex-1 h-10 bg-[#F1F5F9] rounded-lg overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${calculations.coveragePercent}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="h-full bg-slate-800 rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-3">
                    <span className="text-xs font-semibold text-[#111827]">{formatCurrency(calculations.totalScribeCost)}</span>
                  </div>
                </div>
                <div className="w-16">
                  <span className="text-xs text-slate-600 font-medium">Today</span>
                </div>
              </div>

              {/* 50% coverage */}
              <div className="flex items-center gap-4">
                <div className="w-20 text-right">
                  <span className="text-sm font-semibold text-[#6B7280]">50%</span>
                </div>
                <div className="flex-1 h-10 bg-[#F1F5F9] rounded-lg overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "50%" }}
                    transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="h-full bg-slate-300 rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-3">
                    <span className="text-xs font-semibold text-[#111827]">{formatCurrency(calculations.fullScribeCost * 0.5)}</span>
                  </div>
                </div>
                <div className="w-16" />
              </div>

              {/* 100% coverage */}
              <div className="flex items-center gap-4">
                <div className="w-20 text-right">
                  <span className="text-sm font-semibold text-[#6B7280]">100%</span>
                </div>
                <div className="flex-1 h-10 bg-[#F1F5F9] rounded-lg overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="h-full bg-slate-400 rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-3">
                    <span className="text-xs font-semibold text-white">{formatCurrency(calculations.fullScribeCost)}</span>
                  </div>
                </div>
                <div className="w-16">
                  <span className="text-xs text-[#EA2C00] font-medium">Full</span>
                </div>
              </div>
            </div>

            <div className="bg-[#FEF7F5] border border-[#FECDC4] rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#EA2C00] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-[#111827]">
                  To cover all {inputs.totalProviders} providers, you'd need <strong>{calculations.scribesNeededForFullCoverage} scribes</strong> at a cost of <strong>{formatCurrency(calculations.fullScribeCost)}/year</strong>—an additional <strong>{formatCurrency(calculations.costToScale)}</strong>.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* CHAPTER 2: What You're Not Seeing */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 md:p-8 mb-8 shadow-sm"
        >
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-2">The costs you're not seeing</h2>
          <p className="text-sm text-[#6B7280] mb-6">Beyond salaries, scribe programs carry hidden operational costs</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="font-semibold text-[#111827]">Turnover & Training</div>
                  <div className="text-xs text-[#6B7280]">~{inputs.turnoverRate || 40}% annual turnover rate</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-[#111827] mb-1">{formatCurrency(annualTurnoverCost)}</div>
              <p className="text-xs text-[#6B7280]">
                You'll replace ~{Math.round(inputs.scribeCount * turnoverRate)} scribes this year at ~${(trainingCostPerScribe / 1000).toFixed(0)}K each in training costs
              </p>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-[#111827]">Management Overhead</div>
                  <div className="text-xs text-[#6B7280]">~15% of program cost</div>
                </div>
              </div>
              <div className="text-2xl font-bold text-[#111827] mb-1">{formatCurrency(managementOverhead)}</div>
              <p className="text-xs text-[#6B7280]">
                Scheduling, supervision, quality assurance, and administrative support
              </p>
            </div>
          </div>

          {/* True Cost Reveal */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-5 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">Your true annual cost</div>
                <div className="text-3xl md:text-4xl font-bold">{formatCurrency(trueTotalCost)}</div>
                <div className="text-slate-400 text-sm mt-1">
                  {formatCurrency(calculations.totalScribeCost)} salaries + {formatCurrency(totalHiddenCosts)} hidden costs
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">Per covered provider</div>
                <div className="text-2xl font-bold">{formatCurrency(Math.round(trueTotalCost / inputs.providersWithScribes))}/year</div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* CHAPTER 3: The Question */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-gradient-to-br from-[#111827] to-[#1e293b] rounded-xl p-6 md:p-10 mb-8 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
            <img src={patternV} alt="" className="absolute w-20 md:w-28 -top-4 -left-4 -rotate-12" style={{ filter: 'grayscale(100%) brightness(2)' }} />
            <img src={patternCorner} alt="" className="absolute w-24 md:w-32 -top-6 right-8 rotate-90" style={{ filter: 'grayscale(100%) brightness(2)' }} />
            <img src={patternQuarter} alt="" className="absolute w-28 md:w-36 -bottom-8 -left-6 -rotate-45" style={{ filter: 'grayscale(100%) brightness(2)' }} />
            <img src={patternSemicircle} alt="" className="absolute w-16 md:w-24 top-1/4 -right-4 rotate-180" style={{ filter: 'grayscale(100%) brightness(2)' }} />
            <img src={patternCorner} alt="" className="absolute w-20 md:w-28 -bottom-4 right-1/4 rotate-180" style={{ filter: 'grayscale(100%) brightness(2)' }} />
            <img src={patternV} alt="" className="absolute w-24 md:w-32 bottom-1/3 -right-8 rotate-45" style={{ filter: 'grayscale(100%) brightness(2)' }} />
          </div>

          <div className="relative">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[#EA2C00]/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#EA2C00]" />
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
              What if documentation support didn't scale this way?
            </h2>
            <p className="text-slate-400 text-sm md:text-base mb-6 max-w-xl mx-auto">
              Abridge can support every provider without the linear cost curve.
            </p>

            {onExploreAmbientAI && (
              <Button
                onClick={() => onExploreAmbientAI(inputs.totalProviders, inputs.annualEncounters)}
                className="h-12 px-8 bg-[#EA2C00] hover:bg-[#d12700] text-white font-semibold shadow-lg"
                data-testid="button-explore-ambient"
              >
                Explore Ambient AI
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </motion.section>

        {/* CHAPTER 4: Your Summary (Exportable) */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 md:p-8 shadow-sm"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base md:text-lg font-bold text-[#111827]">Your Scribe Program Summary</h2>
              <p className="text-sm text-[#6B7280]">Take this with you</p>
            </div>
            <Button 
              onClick={() => setShowExportModal(true)}
              disabled={isExporting}
              className="bg-[#EA2C00] hover:bg-[#d12700] text-white gap-2"
              data-testid="button-export-pdf"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExporting ? 'Generating...' : 'Export PDF'}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#F9FAFB] rounded-lg p-4 text-center">
              <div className="text-xs text-[#6B7280] mb-1">Annual Investment</div>
              <div className="text-xl font-bold text-[#111827]">{formatCurrency(calculations.totalScribeCost)}</div>
            </div>
            <div className="bg-[#F9FAFB] rounded-lg p-4 text-center">
              <div className="text-xs text-[#6B7280] mb-1">Coverage</div>
              <div className="text-xl font-bold text-[#111827]">{calculations.coveragePercent}%</div>
            </div>
            <div className="bg-[#F9FAFB] rounded-lg p-4 text-center">
              <div className="text-xs text-[#6B7280] mb-1">Hidden Costs</div>
              <div className="text-xl font-bold text-[#EA2C00]">+{formatCurrency(totalHiddenCosts)}</div>
            </div>
            <div className="bg-[#F9FAFB] rounded-lg p-4 text-center">
              <div className="text-xs text-[#6B7280] mb-1">Cost to Scale</div>
              <div className="text-xl font-bold text-[#111827]">{formatCurrency(calculations.costToScale)}</div>
            </div>
          </div>

          <div className="bg-[#F8FAFC] rounded-lg p-4 text-sm text-[#6B7280]">
            <strong className="text-[#111827]">Bottom line:</strong> Your scribe program costs{" "}
            <span className="text-[#111827] font-semibold">{formatCurrency(Math.round(trueTotalCost / inputs.providersWithScribes))}/provider/year</span> when you include hidden costs. 
            Scaling to 100% coverage would require an additional{" "}
            <span className="text-[#111827] font-semibold">{formatCurrency(calculations.costToScale)}/year</span>.
          </div>
        </motion.section>

      </main>

      <PDFExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportPDF}
        isExporting={isExporting}
        documentType="scribe"
      />
    </div>
  );
}
