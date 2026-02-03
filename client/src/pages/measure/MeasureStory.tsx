import { useMemo, useState } from "react";
import { Download, TrendingUp, Users, ArrowRight, ChevronRight, FileText, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  calculateMeasureResults, 
  formatCurrency, 
  formatNumber,
} from "@/lib/measureCalculator";
import { generateMeasurePDF } from "@/components/measure/MeasurePDFExport";
import { PDFExportModal } from "@/components/switch/PDFExportModal";
import { useToast } from "@/hooks/use-toast";

interface MeasureStoryProps {
  state: MeasureState;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureStory({ state, onBack, onHome }: MeasureStoryProps) {
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  const [showProjection, setShowProjection] = useState(false);
  const [whatIfProviders, setWhatIfProviders] = useState(state.deployment.providers * 2);
  const [showMethodology, setShowMethodology] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsExporting(true);
    try {
      await generateMeasurePDF(state, clientName, preparedBy);
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your Value Story has been saved.",
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const wrvuDelta = state.documentationQuality.wrvuWith - state.documentationQuality.wrvuWithout;
  const docValueConservative = wrvuDelta * state.deployment.abridgeEncounters * state.calibration.conversionFactor * 0.5;
  const docValueOptimistic = wrvuDelta * state.deployment.abridgeEncounters * state.calibration.conversionFactor * 0.75;

  const projectedHours = Math.round(results.totalHoursSaved * (whatIfProviders / state.deployment.providers));
  const projectedTimeValue = results.timeReallocatedTotal * (whatIfProviders / state.deployment.providers);

  const totalValueLow = results.timeReallocatedTotal + docValueConservative;
  const totalValueHigh = results.timeReallocatedTotal + docValueOptimistic;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={5}
        totalSteps={5}
        stepName="Your Value Story"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                step === 5 ? "bg-[#E85A2C] scale-125" : "bg-[#E85A2C]/40"
              }`}
            />
          ))}
        </div>

        {/* Hero Statement */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight mb-4">
            {state.deployment.providers} providers.
            <br />
            {state.deployment.monthsOnAbridge} months.
            <br />
            <span className="text-[#E85A2C]">{formatNumber(Math.round(results.totalHoursSaved))} hours back.</span>
          </h1>

          <p className="text-base text-[#6B7280] max-w-lg mx-auto">
            That's <span className="font-semibold text-black">{results.qualityHoursPerWeek.toFixed(1)} hours per week</span> per provider—time that used to disappear into documentation.
          </p>
        </motion.div>

        {/* Value Summary Card */}
        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="border-l-4 border-[#E85A2C] pl-4">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">TIME RECAPTURED</p>
              <p className="text-3xl font-bold text-black">{formatNumber(Math.round(results.totalHoursSaved))} hours</p>
            </div>
            <div className="border-l-4 border-[#E85A2C] pl-4">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">ANNUAL VALUE</p>
              <p className="text-3xl font-bold text-[#E85A2C]">{formatCurrency(totalValueLow)} – {formatCurrency(totalValueHigh)}</p>
            </div>
          </div>
        </motion.div>

        {/* Value Breakdown */}
        <motion.div
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-6 space-y-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {/* How time was used */}
          <div>
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">HOW YOU USED THAT TIME</p>
            <div className="space-y-2">
              {state.allocation.capacityPercent > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#E85A2C]"></span>
                    <span className="text-[#6B7280]">More patients ({state.allocation.capacityPercent}%)</span>
                  </span>
                  <span className="font-semibold text-black">{formatCurrency(results.capacityValue)}</span>
                </div>
              )}
              {state.allocation.hardSavingsPercent > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-black"></span>
                    <span className="text-[#6B7280]">Reduced costs ({state.allocation.hardSavingsPercent}%)</span>
                  </span>
                  <span className="font-semibold text-black">{formatCurrency(results.hardSavingsValue)}</span>
                </div>
              )}
              {state.allocation.qualityOfLifePercent > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#888888]"></span>
                    <span className="text-[#6B7280]">Work-life balance ({state.allocation.qualityOfLifePercent}%)</span>
                  </span>
                  <span className="font-medium text-[#6B7280]">{results.qualityHoursPerWeek.toFixed(1)} hrs/wk back</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-[#E5E7EB]" />

          {/* Documentation Impact */}
          <div>
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">DOCUMENTATION IMPACT</p>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-black">+{wrvuDelta.toFixed(2)} wRVU/encounter</p>
                <p className="text-xs text-[#888888] mt-1">
                  {formatNumber(state.deployment.abridgeEncounters)} encounters analyzed
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-black">
                  {formatCurrency(docValueConservative)} – {formatCurrency(docValueOptimistic)}
                </p>
                <p className="text-xs text-[#888888] mt-1">Revenue potential</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* The Story Block */}
        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xs font-medium text-[#E85A2C] uppercase tracking-[1.5px] mb-3">
            THE REAL STORY
          </p>
          <p className="text-lg font-medium text-black leading-relaxed">
            You didn't just save time. You gave {state.deployment.providers} people their evenings back—and the notes got better, not worse.
          </p>
          <p className="text-sm text-[#6B7280] mt-3">
            That's the counterintuitive truth: better documentation comes from less time documenting.
          </p>
        </motion.div>

        {/* Expansion Section */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={() => setShowProjection(!showProjection)}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E7EB] rounded-xl hover:border-[#E85A2C]/30 transition-colors"
            data-testid="button-toggle-projection"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFF5F2] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#E85A2C]" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-black text-sm">What if you expanded?</p>
                <p className="text-xs text-[#888888]">See projected value at scale</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-[#888888] transition-transform ${showProjection ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {showProjection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
                    <label className="text-sm font-medium text-[#6B7280] mb-3 block">
                      If you deployed to...
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={state.deployment.providers}
                        max={state.deployment.providers * 5}
                        step={Math.max(10, Math.round(state.deployment.providers / 10) * 10)}
                        value={whatIfProviders}
                        onChange={(e) => setWhatIfProviders(Number(e.target.value))}
                        className="flex-1 accent-[#E85A2C] h-2"
                        data-testid="slider-what-if-providers"
                      />
                      <div className="flex items-center gap-2 bg-[#F5F0EB] rounded-lg px-4 py-2 min-w-[100px] justify-center">
                        <Users className="w-4 h-4 text-[#E85A2C]" />
                        <span className="font-bold text-black">{whatIfProviders}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#888888] mt-2">
                      Current: {state.deployment.providers} providers
                    </p>
                  </div>

                  <motion.div 
                    className="bg-[#FFF5F2] border border-[#E85A2C]/20 rounded-xl p-5"
                    key={whatIfProviders}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1 }}
                  >
                    <p className="text-xs font-medium text-[#E85A2C] uppercase tracking-[1.5px] mb-4">
                      PROJECTED ANNUAL VALUE
                    </p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-3xl font-bold text-black">{formatNumber(projectedHours)}</p>
                        <p className="text-sm text-[#6B7280]">hours reclaimed</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#E85A2C]">{formatCurrency(projectedTimeValue)}</p>
                        <p className="text-sm text-[#6B7280]">time value alone</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Export Section */}
        <motion.div
          className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-black mb-1">Share Your Story</p>
              <p className="text-sm text-[#888888]">
                Export a polished PDF for leadership
              </p>
            </div>
            <Button
              onClick={() => setShowExportModal(true)}
              className="bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white rounded-full px-5 h-10 gap-2"
              data-testid="button-export"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        </motion.div>

        <PDFExportModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportPDF}
          isExporting={isExporting}
          documentType="value story"
        />

        {/* Methodology */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mb-6"
        >
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-4 text-sm text-[#888888] hover:text-[#6B7280] transition-colors"
            data-testid="button-methodology"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Methodology & Assumptions
            </span>
            {showMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <AnimatePresence>
            {showMethodology && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 text-sm text-[#6B7280] space-y-3">
                  <p>
                    <strong className="text-black">Time savings:</strong> Based on {state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith} min saved per encounter × {formatNumber(state.deployment.abridgeEncounters)} encounters.
                  </p>
                  <p>
                    <strong className="text-black">Documentation value:</strong> +{wrvuDelta.toFixed(2)} wRVU/encounter × ${state.calibration.conversionFactor} conversion factor. Range reflects 50-75% attribution.
                  </p>
                  <p>
                    <strong className="text-black">Projections:</strong> Linear scaling assumption. Actual results vary by specialty and adoption.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation */}
        <motion.div
          className="flex justify-between items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
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
            onClick={onHome}
            className="rounded-full border-[#E5E7EB] text-[#6B7280] hover:bg-[#F5F0EB]"
            data-testid="button-home"
          >
            Start Over
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
