import { useMemo, useState } from "react";
import { Download, TrendingUp, Users, ArrowRight, ChevronRight, FileText, ChevronDown, ChevronUp } from "lucide-react";
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Hero Statement */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">
            Your Abridge Story
          </p>
          
          <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight mb-6">
            {state.deployment.providers} providers.
            <br />
            {state.deployment.monthsOnAbridge} months.
            <br />
            <span className="text-[#EA2C00]">{formatNumber(Math.round(results.totalHoursSaved))} hours back.</span>
          </h1>

          <p className="text-lg text-slate-600 max-w-lg mx-auto">
            That's <span className="font-semibold text-black">{results.qualityHoursPerWeek.toFixed(1)} hours per week</span> per provider—time that used to disappear into documentation.
          </p>
        </motion.div>

        {/* The Impact - Single Clean Card */}
        <motion.div
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Card Header */}
          <div className="bg-black px-6 py-4">
            <p className="text-white font-semibold">The Value Created</p>
          </div>

          {/* Metrics */}
          <div className="p-6 space-y-6">
            {/* Time Value */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Time Recaptured</p>
                <p className="text-2xl font-bold text-black">{formatNumber(Math.round(results.totalHoursSaved))} hours</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 mb-1">Value</p>
                <p className="text-2xl font-bold text-[#EA2C00]">{formatCurrency(results.timeReallocatedTotal)}</p>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* How time was used */}
            <div>
              <p className="text-sm text-slate-500 mb-3">How you used that time</p>
              <div className="space-y-2">
                {state.allocation.capacityPercent > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#EA2C00]"></span>
                      <span className="text-slate-700">More patients ({state.allocation.capacityPercent}%)</span>
                    </span>
                    <span className="font-semibold text-black">{formatCurrency(results.capacityValue)}</span>
                  </div>
                )}
                {state.allocation.hardSavingsPercent > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-black"></span>
                      <span className="text-slate-700">Reduced costs ({state.allocation.hardSavingsPercent}%)</span>
                    </span>
                    <span className="font-semibold text-black">{formatCurrency(results.hardSavingsValue)}</span>
                  </div>
                )}
                {state.allocation.qualityOfLifePercent > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <span className="text-slate-700">Work-life balance ({state.allocation.qualityOfLifePercent}%)</span>
                    </span>
                    <span className="font-medium text-slate-600">{results.qualityHoursPerWeek.toFixed(1)} hrs/wk back</span>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Documentation Quality */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Documentation Impact</p>
                <p className="text-lg font-bold text-black">+{wrvuDelta.toFixed(2)} wRVU/encounter</p>
                <p className="text-xs text-slate-500 mt-1">
                  {formatNumber(state.deployment.abridgeEncounters)} encounters analyzed
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500 mb-1">Revenue Potential</p>
                <p className="text-lg font-bold text-black">
                  {formatCurrency(docValueConservative)} – {formatCurrency(docValueOptimistic)}
                </p>
                <p className="text-xs text-slate-500 mt-1">50-75% attribution</p>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Total */}
            <div className="bg-[#FFF5F2] -mx-6 -mb-6 px-6 py-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-black">Total Annual Value</p>
                <p className="text-2xl font-bold text-[#EA2C00]">
                  {formatCurrency(totalValueLow)} – {formatCurrency(totalValueHigh)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Projection Toggle */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => setShowProjection(!showProjection)}
            className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            data-testid="button-toggle-projection"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-black">What if you expanded?</p>
                <p className="text-sm text-slate-500">See projected value at scale</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${showProjection ? 'rotate-90' : ''}`} />
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
                  {/* Slider */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <label className="text-sm font-medium text-slate-700 mb-3 block">
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
                        className="flex-1 accent-[#EA2C00] h-2"
                        data-testid="slider-what-if-providers"
                      />
                      <div className="flex items-center gap-2 bg-black text-white rounded-lg px-4 py-2 min-w-[100px] justify-center">
                        <Users className="w-4 h-4" />
                        <span className="font-bold">{whatIfProviders}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Current: {state.deployment.providers} providers
                    </p>
                  </div>

                  {/* Projected Results */}
                  <motion.div 
                    className="bg-[#FFF5F2] rounded-xl p-5"
                    key={whatIfProviders}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1 }}
                  >
                    <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">
                      Projected Annual Value
                    </p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-4xl font-bold text-black">{formatNumber(projectedHours)}</p>
                        <p className="text-sm text-slate-600">hours reclaimed</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-[#EA2C00]">{formatCurrency(projectedTimeValue)}</p>
                        <p className="text-sm text-slate-600">time value alone</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* The Insight */}
        <motion.div
          className="bg-black rounded-2xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-[#F07B5F] text-sm font-semibold uppercase tracking-widest mb-3">
            The Real Story
          </p>
          <p className="text-white text-xl font-medium leading-relaxed">
            You didn't just save time. You gave {state.deployment.providers} people their evenings back—and the notes got better, not worse.
          </p>
          <p className="text-slate-400 text-sm mt-4">
            That's the counterintuitive truth: better documentation comes from less time documenting.
          </p>
        </motion.div>

        {/* Share Section */}
        <motion.div
          className="bg-white rounded-2xl border border-slate-200 p-6 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-black mb-1">Share Your Story</p>
              <p className="text-sm text-slate-500">
                Export a polished PDF for leadership
              </p>
            </div>
            <Button
              onClick={() => setShowExportModal(true)}
              className="bg-black hover:bg-black/90 text-white rounded-full px-5"
              data-testid="button-export"
            >
              <Download className="w-4 h-4 mr-2" />
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
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-4 text-sm text-slate-500 hover:text-slate-700 transition-colors"
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
                <div className="px-4 pb-4 text-sm text-slate-600 space-y-3">
                  <p>
                    <strong>Time savings:</strong> Based on {state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith} min saved per encounter × {formatNumber(state.deployment.abridgeEncounters)} encounters.
                  </p>
                  <p>
                    <strong>Documentation value:</strong> +{wrvuDelta.toFixed(2)} wRVU/encounter × ${state.calibration.conversionFactor} conversion factor. Range reflects 50-75% attribution.
                  </p>
                  <p>
                    <strong>Projections:</strong> Linear scaling assumption. Actual results vary by specialty and adoption.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Home Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            variant="outline"
            onClick={onHome}
            className="w-full h-12 rounded-full border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
            data-testid="button-home"
          >
            Start Over
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
