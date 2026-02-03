import { useMemo, useState } from "react";
import { Download, TrendingUp, Users, ChevronRight, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
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
  const [showExpansion, setShowExpansion] = useState(false);
  const [expandedProviders, setExpandedProviders] = useState(state.deployment.providers * 3);
  const [showMethodology, setShowMethodology] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();

  // Get allocation with defaults (use nullish coalescing to allow 0% values)
  const capacityPercent = state.allocation.capacityPercent ?? 20;
  const savingsPercent = state.allocation.hardSavingsPercent ?? 50;
  const wellbeingPercent = state.allocation.qualityOfLifePercent ?? 30;

  // Calculate results using the spec formula
  const results = useMemo(() => {
    const deployment = state.deployment;
    const timeEfficiency = state.timeEfficiency;
    const calibration = state.calibration;
    const docQuality = state.documentationQuality;

    // Hours Saved = (Before time - After time) × Total Encounters ÷ 60
    const timeSavedPerNote = timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith;
    const totalHoursSaved = (timeSavedPerNote * deployment.totalEncounters) / 60;

    // Capacity Value
    const capacityHours = totalHoursSaved * (capacityPercent / 100);
    const additionalVisits = capacityHours * (60 / calibration.minutesPerVisit);
    const capacityValue = additionalVisits * calibration.revenuePerVisit;

    // Savings Value
    const savingsHours = totalHoursSaved * (savingsPercent / 100);
    const savingsValue = savingsHours * calibration.otHourlyRate;

    // Wellbeing
    const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
    const hoursPerProviderPerWeek = deployment.providers > 0 
      ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33)
      : 0;

    // Time Value subtotal
    const timeValueSubtotal = capacityValue + savingsValue;

    // Documentation Value
    const wrvuLift = docQuality.wrvuWith - docQuality.wrvuWithout;
    const documentedEncounters = deployment.totalEncounters * (deployment.utilizationRate / 100);
    const docValueConservative = wrvuLift * documentedEncounters * calibration.conversionFactor * 0.5;
    const docValueOptimistic = wrvuLift * documentedEncounters * calibration.conversionFactor * 0.75;

    // Total
    const totalValueLow = timeValueSubtotal + docValueConservative;
    const totalValueHigh = timeValueSubtotal + docValueOptimistic;

    return {
      totalHoursSaved,
      capacityValue,
      savingsValue,
      hoursPerProviderPerWeek,
      timeValueSubtotal,
      wrvuLift,
      docValueConservative,
      docValueOptimistic,
      totalValueLow,
      totalValueHigh,
    };
  }, [state, capacityPercent, savingsPercent, wellbeingPercent]);

  // Projected values at scale
  const projectedResults = useMemo(() => {
    const scaleFactor = expandedProviders / state.deployment.providers;
    const projectedHours = Math.round(results.totalHoursSaved * scaleFactor);
    const projectedValueLow = results.totalValueLow * scaleFactor;
    const projectedValueHigh = results.totalValueHigh * scaleFactor;
    return { projectedHours, projectedValueLow, projectedValueHigh };
  }, [expandedProviders, state.deployment.providers, results]);

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

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={5}
        totalSteps={5}
        stepName="Your Story"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Hero Statement */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold text-black leading-tight mb-4">
            <span className="block">{state.deployment.providers} providers.</span>
            <span className="block">{state.deployment.monthsOnAbridge} months.</span>
            <span className="block text-[#E85A2C]">{formatNumber(Math.round(results.totalHoursSaved))} hours back.</span>
          </h1>

          <p className="text-base text-[#666666] italic">
            That's {results.hoursPerProviderPerWeek.toFixed(1)} hours per week per provider—time that used to disappear into documentation.
          </p>
        </motion.div>

        {/* The Real Story Block */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
            The Real Story
          </p>
          <p className="text-lg md:text-xl font-medium text-black leading-relaxed">
            You gave {state.deployment.providers} people their evenings back—and the notes got better, not worse.
          </p>
          <p className="text-base text-[#666666] mt-3">
            That's the counterintuitive truth: better documentation comes from less time documenting.
          </p>
        </motion.div>

        {/* Your Results Card */}
        <motion.div
          className="bg-white rounded-lg border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
            Your Results
          </p>

          {/* Hours Reclaimed Row */}
          <div className="flex items-center justify-between py-3 border-b border-[#E5E5E5]">
            <span className="text-base text-black">Hours Reclaimed</span>
            <span className="text-base font-semibold text-black">{formatNumber(Math.round(results.totalHoursSaved))} hours</span>
          </div>

          {/* Time Value Section */}
          <div className="py-3 border-b border-[#E5E5E5]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base text-black">Time Value</span>
              <span className="text-base font-semibold text-black">{formatCurrency(results.timeValueSubtotal)}</span>
            </div>
            <div className="pl-4 space-y-1 text-sm text-[#666666]">
              <div className="flex items-center justify-between">
                <span>Capacity ({capacityPercent}%)</span>
                <span>{formatCurrency(results.capacityValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Savings ({savingsPercent}%)</span>
                <span>{formatCurrency(results.savingsValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Wellbeing ({wellbeingPercent}%)</span>
                <span>{results.hoursPerProviderPerWeek.toFixed(1)} hrs/wk back</span>
              </div>
            </div>
          </div>

          {/* Documentation Value Section */}
          <div className="py-3 border-b border-[#E5E5E5]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-base text-black">Documentation Value</span>
              <span className="text-base font-semibold text-black">
                {formatCurrency(results.docValueConservative)} – {formatCurrency(results.docValueOptimistic)}
              </span>
            </div>
            <div className="pl-4 text-sm text-[#666666]">
              <span>wRVU lift: +{results.wrvuLift.toFixed(2)}/encounter</span>
            </div>
          </div>

          {/* Total Annual Value */}
          <div className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-black uppercase tracking-wide">Total Annual Value</span>
              <span className="text-xl font-bold text-[#E85A2C]">
                {formatCurrency(results.totalValueLow)} – {formatCurrency(results.totalValueHigh)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Expansion Section */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => setShowExpansion(!showExpansion)}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#D1D5DB] transition-colors"
            data-testid="button-toggle-expansion"
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
            <ChevronRight className={`w-5 h-5 text-[#888888] transition-transform ${showExpansion ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {showExpansion && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  <div className="bg-white rounded-lg border border-[#E5E5E5] p-5">
                    <label className="text-sm text-[#666666] mb-3 block">
                      If you deployed to...
                    </label>
                    
                    {/* Slider */}
                    <div className="flex items-center gap-4 mb-4">
                      <input
                        type="range"
                        min={state.deployment.providers}
                        max={state.deployment.providers * 6}
                        step={Math.max(10, Math.round(state.deployment.providers / 10) * 10)}
                        value={expandedProviders}
                        onChange={(e) => setExpandedProviders(Number(e.target.value))}
                        className="flex-1 accent-[#E85A2C] h-2"
                        data-testid="slider-expansion"
                      />
                    </div>

                    {/* Slider labels */}
                    <div className="flex justify-between text-sm text-[#888888] mb-4">
                      <span>{state.deployment.providers}<br/><span className="text-xs">Current</span></span>
                      <span className="text-center">
                        <span className="text-lg font-bold text-black">{expandedProviders}</span>
                      </span>
                      <span className="text-right">{state.deployment.providers * 6}</span>
                    </div>

                    {/* Projected value card */}
                    <div className="bg-[#F5F0EB] rounded-lg p-5">
                      <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                        Projected Annual Value
                      </p>
                      <p className="text-sm text-[#666666] mb-1">
                        {expandedProviders} providers
                      </p>
                      <p className="text-sm text-[#666666] mb-3">
                        {formatNumber(projectedResults.projectedHours)} hours reclaimed
                      </p>
                      <p className="text-2xl md:text-3xl font-bold text-[#E85A2C]">
                        {formatCurrency(projectedResults.projectedValueLow)} – {formatCurrency(projectedResults.projectedValueHigh)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Export Section */}
        <motion.div
          className="bg-white rounded-lg border border-[#E5E5E5] p-5 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-black mb-1">Share Your Story</p>
              <p className="text-sm text-[#888888]">
                Export a polished PDF for leadership
              </p>
            </div>
            <Button
              onClick={() => setShowExportModal(true)}
              className="bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white rounded-md px-5 h-10 gap-2"
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

        {/* Methodology Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#D1D5DB] transition-colors text-sm text-[#888888]"
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
                <div className="p-5 bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg text-sm text-[#666666] space-y-3">
                  <p>
                    <strong className="text-black">Time savings:</strong> Based on {state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith} min saved per encounter × {formatNumber(state.deployment.totalEncounters)} total encounters.
                  </p>
                  <p>
                    <strong className="text-black">Time allocation:</strong> {capacityPercent}% capacity, {savingsPercent}% savings, {wellbeingPercent}% wellbeing. Values can be adjusted in the previous step.
                  </p>
                  <p>
                    <strong className="text-black">Documentation value:</strong> +{results.wrvuLift.toFixed(2)} wRVU/encounter × ${state.calibration.conversionFactor} conversion factor. Range reflects 50-75% attribution.
                  </p>
                  <p>
                    <strong className="text-black">Projections:</strong> Linear scaling assumption. Actual results may vary by specialty and adoption patterns.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Start Over */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <button
            onClick={onHome}
            className="text-sm text-[#888888] hover:text-[#666666] transition-colors underline"
            data-testid="button-start-over"
          >
            Start Over
          </button>
        </motion.div>
      </div>
    </div>
  );
}
