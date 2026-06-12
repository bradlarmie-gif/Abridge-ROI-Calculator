import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Download, Users, RefreshCw, Loader2 } from "lucide-react";
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

interface ScribeFullAnalysisProps {
  inputs: ScribeInputs;
  setInputs?: React.Dispatch<React.SetStateAction<ScribeInputs>>;
  onBack: () => void;
  onBackToJourney?: () => void;
  onExploreAmbientAI?: (providers: number, encounters: number) => void;
}

export default function ScribeFullAnalysis({
  inputs,
  setInputs,
  onBack,
  onBackToJourney,
  onExploreAmbientAI,
}: ScribeFullAnalysisProps) {
  const calculations = useMemo(() => calculateScribeGap(inputs), [inputs]);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();

  // All true-cost math now comes from the engine (single source of truth shared
  // with the PDF) — see calculateScribeGap / scribeGap.test.ts.
  const {
    annualTurnoverCost,
    managementOverhead,
    totalHiddenCosts,
    trueTotalCost,
    trueCostPerProvider: costPerProvider,
  } = calculations;

  // Assumptions surfaced for display (turnover %, training $/scribe).
  const turnoverRatePct = inputs.turnoverRate > 0 ? inputs.turnoverRate : 40;
  const trainingCostPerScribe = inputs.trainingCostPerScribe > 0 ? inputs.trainingCostPerScribe : 5000;

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsExporting(true);
    try {
      await generateScribePDF(inputs, calculations, clientName, preparedBy);
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your Scribe Program Analysis has been saved.",
        variant: "brand",
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      const msg = error instanceof Error ? error.message : "";
      const isChunkError = msg.includes("dynamically imported module") || msg.includes("Failed to fetch") || msg.includes("Loading chunk");
      toast({
        title: "Export Failed",
        description: isChunkError
          ? "A newer version of the app is available. Please refresh the page (Ctrl+Shift+R) and try again."
          : msg || "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
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
        
        {/* Section 1: Header */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex items-center justify-between mb-8"
        >
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">
            Your Scribe Program Analysis
          </p>
          <button
            onClick={() => setShowExportModal(true)}
            disabled={isExporting}
            className="flex items-center gap-2 text-sm font-medium text-[#EA2C00] hover:text-[#EA2C00]/80 transition-colors"
            data-testid="button-export-pdf-hero"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export PDF →
          </button>
        </motion.div>

        {/* Section 2: The Full Picture (Summary Stats) */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-[#F5F0EB] rounded-xl p-6 md:p-8 mb-8"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
              <div className="text-4xl md:text-5xl font-bold text-black">{formatCurrency(calculations.totalScribeCost)}</div>
              <div className="text-xs font-medium text-[#888888] uppercase tracking-wide mt-1">Annual Investment</div>
              <div className="text-xs text-[#888888] italic mt-1">{inputs.scribeCount} scribes</div>
            </div>

            <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
              <div className="text-4xl md:text-5xl font-bold text-black">{calculations.coveragePercent}%</div>
              <div className="text-xs font-medium text-[#888888] uppercase tracking-wide mt-1">Provider Coverage</div>
              <div className="text-xs text-[#888888] italic mt-1">{inputs.providersWithScribes} of {inputs.totalProviders}</div>
            </div>

            <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
              <div className="text-4xl md:text-5xl font-bold text-black">{formatCurrency(totalHiddenCosts)}</div>
              <div className="text-xs font-medium text-[#888888] uppercase tracking-wide mt-1">Indirect Costs</div>
              <div className="text-xs text-[#888888] italic mt-1">Turnover & overhead</div>
            </div>

            <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
              <div className="text-4xl md:text-5xl font-bold text-black">{formatCurrency(trueTotalCost)}</div>
              <div className="text-xs font-medium text-[#888888] uppercase tracking-wide mt-1">True Total Cost</div>
              <div className="text-xs text-[#888888] italic mt-1">{formatCurrency(costPerProvider)} per covered provider</div>
            </div>
          </div>

          <p className="text-sm text-[#6B7280]">
            Your scribe program costs <strong>{formatCurrency(costPerProvider)}/provider/year</strong> when you factor in turnover and overhead. 
            Scaling to 100% coverage would require an additional <strong className="text-[#EA2C00]">{formatCurrency(calculations.costToScale)}/year</strong>.
          </p>
        </motion.section>

        {/* Section 3: Why Scribes Don't Scale */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-6 md:p-8 mb-8"
        >
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            Why Scribes Don't Scale
          </p>
          <p className="text-sm text-[#6B7280] mb-6">
            Double the coverage, double the cost. No economies of scale.
          </p>

          {/* Horizontal Bar Chart */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 text-right">
                <span className="text-sm font-semibold text-black">{calculations.coveragePercent}%</span>
              </div>
              <div className="flex-1 h-10 bg-[#F5F0EB] rounded-lg overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(calculations.coveragePercent, 5)}%` }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="h-full bg-black rounded-lg"
                />
              </div>
              <div className="w-32 text-right">
                <span className="text-xs font-medium text-black">{formatCurrency(calculations.totalScribeCost)} · Today</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 text-right">
                <span className="text-sm font-semibold text-[#888888]">50%</span>
              </div>
              <div className="flex-1 h-10 bg-[#F5F0EB] rounded-lg overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "50%" }}
                  transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="h-full bg-[#888888] rounded-lg"
                />
              </div>
              <div className="w-32 text-right">
                <span className="text-xs font-medium text-[#888888]">{formatCurrency(calculations.fullScribeCost * 0.5)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 text-right">
                <span className="text-sm font-semibold text-[#888888]">100%</span>
              </div>
              <div className="flex-1 h-10 bg-[#F5F0EB] rounded-lg overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="h-full bg-[#EA2C00] rounded-lg"
                />
              </div>
              <div className="w-32 text-right">
                <span className="text-xs font-medium text-[#EA2C00]">{formatCurrency(calculations.fullScribeCost)} · Full coverage</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-[#6B7280]">
            To cover all {inputs.totalProviders} providers, you'd need <strong>{calculations.scribesNeededForFullCoverage} scribes</strong> at {formatCurrency(calculations.fullScribeCost)}/year—an additional <strong>{formatCurrency(calculations.costToScale)}</strong>.
          </p>
        </motion.section>

        {/* Section 4: Costs Beyond Salary */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-[#F5F0EB] rounded-xl p-6 md:p-8 mb-8"
        >
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            Costs Beyond Salary
          </p>
          <p className="text-sm text-[#6B7280] mb-6">
            Scribe programs carry operational overhead.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-[#EA2C00]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-black mb-1">{formatCurrency(annualTurnoverCost)}</div>
              <div className="text-xs font-medium text-[#888888] uppercase tracking-wide">Turnover & Training</div>
              <p className="text-xs text-[#888888] mt-2">
                ~{calculations.scribeReplacements} scribes replaced/year
              </p>
              {setInputs && (
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#F0EDE8]">
                  <AssumptionInput
                    label="Annual turnover"
                    value={turnoverRatePct}
                    suffix="%"
                    onChange={(v) => setInputs((p) => ({ ...p, turnoverRate: v }))}
                    testId="input-scribe-turnover"
                  />
                  <AssumptionInput
                    label="Training / scribe"
                    value={trainingCostPerScribe}
                    prefix="$"
                    onChange={(v) => setInputs((p) => ({ ...p, trainingCostPerScribe: v }))}
                    testId="input-scribe-training"
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#EA2C00]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-black mb-1">{formatCurrency(managementOverhead)}</div>
              <div className="text-xs font-medium text-[#888888] uppercase tracking-wide">Management Overhead</div>
              <p className="text-xs text-[#888888] mt-2">
                ~15% of program cost<br/>
                Scheduling, supervision, QA, admin
              </p>
            </div>
          </div>
        </motion.section>

        {/* Section 5: True Annual Cost */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-[#1A1A1A] rounded-xl p-6 md:p-8 mb-8 text-center"
        >
          <p className="text-xs font-medium text-[#999999] uppercase tracking-[1.5px] mb-6">
            Your True Annual Cost
          </p>

          <div className="flex flex-col md:flex-row justify-center gap-8 md:gap-16">
            <div className="border-l-[3px] border-l-[#EA2C00] pl-4 text-left">
              <div className="text-4xl md:text-5xl font-bold text-white">{formatCurrency(trueTotalCost)}</div>
              <div className="text-xs font-medium text-[#999999] uppercase tracking-wide mt-2">Total Annual Cost</div>
              <div className="text-xs text-[#777777] italic mt-1">
                {formatCurrency(calculations.totalScribeCost)} salaries + {formatCurrency(totalHiddenCosts)} overhead
              </div>
            </div>

            <div className="border-l-[3px] border-l-[#EA2C00] pl-4 text-left">
              <div className="text-4xl md:text-5xl font-bold text-white">{formatCurrency(costPerProvider)}</div>
              <div className="text-xs font-medium text-[#999999] uppercase tracking-wide mt-2">Per Covered Provider</div>
              <div className="text-xs text-[#777777] italic mt-1">
                Annual cost per provider with scribe support
              </div>
            </div>
          </div>
        </motion.section>

        {/* Section 6: Transition CTA */}
        {onExploreAmbientAI && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="bg-[#F5F0EB] rounded-xl p-8 md:p-12 text-center"
          >
            <h2 className="text-xl md:text-2xl font-bold text-black mb-3">
              There's a better way to scale.
            </h2>
            <p className="text-[#6B7280] text-sm md:text-base mb-6 max-w-xl mx-auto">
              Abridge supports every provider—without the linear cost curve.
            </p>

            <Button
              onClick={() => onExploreAmbientAI(inputs.totalProviders, inputs.annualEncounters)}
              className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full"
              data-testid="button-explore-ambient"
            >
              See How Abridge Compares
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.section>
        )}

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

// Compact, on-brand inline input for adjusting cost assumptions on the analysis screen.
function AssumptionInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  testId,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  testId: string;
}) {
  return (
    <div>
      <label className="block text-[10px] text-[#888888] uppercase tracking-wide mb-1">{label}</label>
      <div className="flex items-center bg-[#F5F0EB] rounded-md px-2 h-9 border border-transparent focus-within:border-[#EA2C00] transition-colors">
        {prefix && <span className="text-sm text-[#888888] mr-0.5">{prefix}</span>}
        <input
          type="text"
          inputMode="numeric"
          value={value === 0 ? "" : value.toLocaleString("en-US")}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/[^\d.]/g, "");
            const parsed = parseFloat(cleaned);
            onChange(isNaN(parsed) ? 0 : parsed);
          }}
          onFocus={(e) => setTimeout(() => e.target.select(), 0)}
          className="w-full min-w-0 text-sm font-semibold text-black bg-transparent border-none focus:outline-none focus:ring-0 p-0"
          placeholder="0"
          data-testid={testId}
        />
        {suffix && <span className="text-sm text-[#888888] ml-0.5">{suffix}</span>}
      </div>
    </div>
  );
}
