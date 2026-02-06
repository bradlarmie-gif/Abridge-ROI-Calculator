import { useMemo, useState } from "react";
import { Download, ChevronDown, ChevronUp, FileText, ArrowRight } from "lucide-react";
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

function formatSmartRange(low: number, high: number): string {
  const lowFmt = formatCurrency(low);
  const highFmt = formatCurrency(high);
  if (lowFmt === highFmt) return lowFmt;
  return `${lowFmt} \u2013 ${highFmt}`;
}

interface MeasureStoryProps {
  state: MeasureState;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureStory({ state, onBack, onHome }: MeasureStoryProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();

  const capacityPercent = state.allocation.capacityPercent ?? 20;
  const savingsPercent = state.allocation.hardSavingsPercent ?? 50;
  const wellbeingPercent = state.allocation.qualityOfLifePercent ?? 30;

  const results = useMemo(() => {
    const deployment = state.deployment;
    const timeEfficiency = state.timeEfficiency;
    const calibration = state.calibration;
    const docQuality = state.documentationQuality;

    const timeSavedPerNote = timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith;
    const totalHoursSaved = (timeSavedPerNote * deployment.totalEncounters) / 60;

    const capacityHours = totalHoursSaved * (capacityPercent / 100);
    const additionalVisits = capacityHours * (60 / calibration.minutesPerVisit);
    const capacityValue = additionalVisits * calibration.revenuePerVisit;

    const savingsHours = totalHoursSaved * (savingsPercent / 100);
    const savingsValue = savingsHours * calibration.otHourlyRate;

    const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
    const hoursPerProviderPerWeek = deployment.providers > 0 
      ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33)
      : 0;

    const timeValueSubtotal = capacityValue + savingsValue;

    const wrvuLift = docQuality.wrvuWith - docQuality.wrvuWithout;
    const documentedEncounters = deployment.totalEncounters * (deployment.utilizationRate / 100);
    const docValueLow = wrvuLift * documentedEncounters * calibration.conversionFactor * 0.5;
    const docValueHigh = wrvuLift * documentedEncounters * calibration.conversionFactor * 0.75;

    const totalValueLow = timeValueSubtotal + docValueLow;
    const totalValueHigh = timeValueSubtotal + docValueHigh;

    return {
      totalHoursSaved,
      capacityValue,
      savingsValue,
      hoursPerProviderPerWeek,
      timeValueSubtotal,
      wrvuLift,
      docValueLow,
      docValueHigh,
      totalValueLow,
      totalValueHigh,
    };
  }, [state, capacityPercent, savingsPercent, wellbeingPercent]);

  const expandedProviders = state.deployment.providers * 2.5;
  const scaleFactor = expandedProviders / state.deployment.providers;
  const projectedValueLow = results.totalValueLow * scaleFactor;
  const projectedValueHigh = results.totalValueHigh * scaleFactor;

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
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-[28px] text-[#1A1A1A] mb-1" data-testid="text-hero-providers">
            {state.deployment.providers} providers.
          </p>
          <p className="text-[28px] text-[#1A1A1A] mb-1" data-testid="text-hero-months">
            {state.deployment.monthsOnAbridge} months.
          </p>
          <p className="text-[36px] font-bold text-[#EA2C00] mb-4" data-testid="text-hero-hours">
            {formatNumber(Math.round(results.totalHoursSaved))} hours back.
          </p>

          <p className="text-sm text-[#666666] max-w-lg mx-auto" data-testid="text-hero-context">
            That's {results.hoursPerProviderPerWeek.toFixed(1)} hours per week per provider{'\u2014'}time that used to disappear into documentation.
          </p>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-8 border-l-4 border-[#EA2C00]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="section-story-callout"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
            The Story
          </p>
          <p className="text-xl font-bold text-[#1A1A1A] leading-relaxed mb-3">
            You gave {state.deployment.providers} people their evenings back{'\u2014'}and the notes got better, not worse.
          </p>
          <p className="text-sm text-[#666666] leading-relaxed">
            That's the counterintuitive truth about ambient documentation: better notes come from less time documenting.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="section-results"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-5">
            Your Results
          </p>

          <div className="flex items-center justify-between py-3 border-b border-[#F0F0F0]">
            <span className="text-sm text-[#1A1A1A]">Hours Reclaimed</span>
            <span className="text-sm font-semibold text-[#1A1A1A]">{formatNumber(Math.round(results.totalHoursSaved))} hours</span>
          </div>

          <div className="py-3 border-b border-[#F0F0F0]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#1A1A1A]">Time Value</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(results.timeValueSubtotal)}</span>
            </div>
            <div className="pl-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666666]">Patient Capacity ({capacityPercent}%)</span>
                <span className="text-xs text-[#666666]">{formatCurrency(results.capacityValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666666]">Operational Savings ({savingsPercent}%)</span>
                <span className="text-xs text-[#666666]">{formatCurrency(results.savingsValue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666666]">Provider Wellbeing ({wellbeingPercent}%)</span>
                <span className="text-xs text-[#666666]">{results.hoursPerProviderPerWeek.toFixed(1)} hrs/wk back</span>
              </div>
            </div>
          </div>

          <div className="py-3 border-b border-[#F0F0F0]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#1A1A1A]">Documentation Value</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{formatSmartRange(results.docValueLow, results.docValueHigh)}</span>
            </div>
            <div className="pl-4">
              <span className="text-xs text-[#666666]">wRVU lift: +{results.wrvuLift.toFixed(2)}/encounter</span>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide">Estimated Annual Value</span>
              <span className="text-xl font-bold text-[#EA2C00]" data-testid="text-total-value">
                {formatSmartRange(results.totalValueLow, results.totalValueHigh)}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="section-expansion"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-4">
            What's Next
          </p>

          <p className="text-sm text-[#666666] mb-1">
            Today: {state.deployment.providers} providers, {formatSmartRange(results.totalValueLow, results.totalValueHigh)} estimated annual value
          </p>
          <p className="text-sm text-[#666666] mb-3">
            If you expanded to {Math.round(expandedProviders)} providers:
          </p>
          <p className="text-2xl font-bold text-[#EA2C00] mb-4" data-testid="text-expansion-value">
            {formatSmartRange(projectedValueLow, projectedValueHigh)} estimated annual value
          </p>
          <button
            onClick={onHome}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#EA2C00] hover:underline transition-colors"
            data-testid="link-explore-expansion"
          >
            Explore expansion
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-5 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          data-testid="section-share"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-[#1A1A1A] mb-1">Share Your Story</p>
              <p className="text-sm text-[#999999]">
                Export a polished PDF for leadership
              </p>
            </div>
            <Button
              onClick={() => setShowExportModal(true)}
              className="bg-[#EA2C00] hover:bg-[#D42800] text-white rounded-md px-5 h-10 gap-2"
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#D1D5DB] transition-colors text-sm text-[#999999]"
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
                    <strong className="text-[#1A1A1A]">Time savings:</strong> Based on {state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith} min saved per encounter x {formatNumber(state.deployment.totalEncounters)} total encounters.
                  </p>
                  <p>
                    <strong className="text-[#1A1A1A]">Time allocation:</strong> {capacityPercent}% capacity, {savingsPercent}% savings, {wellbeingPercent}% wellbeing.
                  </p>
                  <p>
                    <strong className="text-[#1A1A1A]">Documentation value:</strong> +{results.wrvuLift.toFixed(2)} wRVU/encounter x ${state.calibration.conversionFactor} conversion factor. Range reflects 50-75% attribution.
                  </p>
                  <p>
                    <strong className="text-[#1A1A1A]">Projections:</strong> Linear scaling assumption. Actual results may vary by specialty and adoption patterns.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <button
            onClick={onHome}
            className="text-sm text-[#999999] hover:text-[#666666] transition-colors underline"
            data-testid="button-start-over"
          >
            Start Over
          </button>
        </motion.div>
      </div>
    </div>
  );
}
