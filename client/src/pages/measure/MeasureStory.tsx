import { useMemo, useState } from "react";
import { Download, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  formatCurrency, 
  formatNumber,
  calculateExpansionResults,
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

  const careSetting = state.careSetting || "outpatient";
  const isInpatient = careSetting === "inpatient";
  const isED = careSetting === "ed";
  const isNursing = careSetting === "nursing";

  const results = useMemo(() => {
    const deployment = state.deployment;
    const timeEfficiency = state.timeEfficiency;
    const calibration = state.calibration;
    const docQuality = state.documentationQuality;

    const timeSavedPerNote = Math.max(0, timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith);
    const totalHoursSaved = (timeSavedPerNote * deployment.totalEncounters) / 60;

    let capacityValue = 0;
    let savingsValue = 0;
    let hoursPerProviderPerWeek = 0;
    let timeValueSubtotal = 0;
    let wrvuLift = 0;
    let docValueLow = 0;
    let docValueHigh = 0;
    let totalValueLow = 0;
    let totalValueHigh = 0;
    let overtimeSavings = 0;
    let retentionValue = 0;

    if (careSetting === "inpatient") {
      const metrics = state.settingData?.inpatient || {};
      const hourlyRate = metrics.vm_hourlyRate ?? calibration.otHourlyRate ?? 175;
      const inpSavingsPercent = state.allocation.hardSavingsPercent ?? 60;
      const inpWellbeingPercent = state.allocation.qualityOfLifePercent ?? 40;

      savingsValue = totalHoursSaved * (inpSavingsPercent / 100) * hourlyRate;
      const wellbeingHours = totalHoursSaved * (inpWellbeingPercent / 100);
      hoursPerProviderPerWeek = deployment.providers > 0
        ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33) : 0;
      timeValueSubtotal = savingsValue;

      const cmiDelta = Math.max(0, (metrics.cmi_after ?? 0) - (metrics.cmi_before ?? 0));
      const cmiPointValue = metrics.vm_cmiPointValue ?? calibration.conversionFactor ?? 1500;
      const denialsDelta = Math.max(0, (metrics.denialsPer100_before ?? 0) - (metrics.denialsPer100_after ?? 0));
      const denialCostPerCase = metrics.vm_denialCostPerCase ?? 3200;
      const cdiDelta = Math.max(0, (metrics.cdiQueriesPer100_before ?? 0) - (metrics.cdiQueriesPer100_after ?? 0));
      const cdiFteCost = metrics.vm_cdiFteCost ?? 85000;
      const casesPerCdiFte = metrics.vm_casesPerCdiFte ?? 2500;

      docValueLow = cmiDelta * deployment.totalEncounters * cmiPointValue * 0.70
        + (denialsDelta / 100) * deployment.totalEncounters * denialCostPerCase
        + (casesPerCdiFte > 0 ? ((cdiDelta / 100) * deployment.totalEncounters / casesPerCdiFte) * cdiFteCost : 0);
      docValueHigh = cmiDelta * deployment.totalEncounters * cmiPointValue * 0.85
        + (denialsDelta / 100) * deployment.totalEncounters * denialCostPerCase
        + (casesPerCdiFte > 0 ? ((cdiDelta / 100) * deployment.totalEncounters / casesPerCdiFte) * cdiFteCost : 0);

      totalValueLow = docValueLow + timeValueSubtotal;
      totalValueHigh = docValueHigh + timeValueSubtotal;
    } else if (careSetting === "ed") {
      const throughputPercent = state.allocation.capacityPercent ?? 40;
      const edSavingsPercent = state.allocation.hardSavingsPercent ?? 40;
      const edWellbeingPercent = state.allocation.qualityOfLifePercent ?? 20;

      const throughputHours = totalHoursSaved * (throughputPercent / 100);
      const additionalPatients = throughputHours * (60 / calibration.minutesPerVisit);
      capacityValue = additionalPatients * calibration.revenuePerVisit;
      savingsValue = totalHoursSaved * (edSavingsPercent / 100) * calibration.otHourlyRate;
      const wellbeingHours = totalHoursSaved * (edWellbeingPercent / 100);
      hoursPerProviderPerWeek = deployment.providers > 0
        ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33) : 0;
      timeValueSubtotal = capacityValue + savingsValue;

      const lwbsReduction = Math.max(0, timeEfficiency.sameDayClosureWithout - timeEfficiency.sameDayClosureWith);
      const patientsRetained = Math.round((lwbsReduction / 100) * deployment.totalEncounters);
      const lwbsValue = patientsRetained * calibration.revenuePerVisit;

      const emLevelLift = Math.max(0, docQuality.emLevelWith - docQuality.emLevelWithout);
      const documentedEncounters = deployment.totalEncounters * (deployment.utilizationRate / 100);
      const emLevelValue = emLevelLift * documentedEncounters * calibration.conversionFactor;
      docValueLow = emLevelValue * 0.70;
      docValueHigh = emLevelValue * 0.85;

      totalValueLow = timeValueSubtotal + lwbsValue + docValueLow;
      totalValueHigh = timeValueSubtotal + lwbsValue + docValueHigh;
    } else if (careSetting === "nursing") {
      const nursingMetrics = state.settingData?.nursing || {};
      const nursingSavingsPercent = state.allocation.hardSavingsPercent ?? 50;
      const nursingWellbeingPercent = state.allocation.qualityOfLifePercent ?? 30;

      savingsValue = totalHoursSaved * (nursingSavingsPercent / 100) * calibration.otHourlyRate;
      const wellbeingHours = totalHoursSaved * (nursingWellbeingPercent / 100);
      hoursPerProviderPerWeek = deployment.providers > 0
        ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33) : 0;
      timeValueSubtotal = savingsValue;

      const otSaved = Math.max(0, timeEfficiency.workOutsideWithout - timeEfficiency.workOutsideWith);
      overtimeSavings = otSaved * deployment.providers * calibration.otHourlyRate * 1.5 * 52;

      const turnoverReduction = Math.max(0, (nursingMetrics.turnoverRate_before ?? 0) - (nursingMetrics.turnoverRate_after ?? 0));
      retentionValue = Math.round((turnoverReduction / 100) * deployment.providers) * 56000;

      totalValueLow = timeValueSubtotal + overtimeSavings + retentionValue;
      totalValueHigh = totalValueLow;
    } else {
      const capacityHours = totalHoursSaved * (capacityPercent / 100);
      const additionalVisits = capacityHours * (60 / calibration.minutesPerVisit);
      capacityValue = additionalVisits * calibration.revenuePerVisit;

      const savingsHours = totalHoursSaved * (savingsPercent / 100);
      savingsValue = savingsHours * calibration.otHourlyRate;

      const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
      hoursPerProviderPerWeek = deployment.providers > 0
        ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33) : 0;

      timeValueSubtotal = capacityValue + savingsValue;

      wrvuLift = docQuality.wrvuWith - docQuality.wrvuWithout;
      const documentedEncounters = deployment.totalEncounters * (deployment.utilizationRate / 100);
      docValueLow = wrvuLift * documentedEncounters * calibration.conversionFactor * 0.70;
      docValueHigh = wrvuLift * documentedEncounters * calibration.conversionFactor * 0.85;

      totalValueLow = timeValueSubtotal + docValueLow;
      totalValueHigh = timeValueSubtotal + docValueHigh;
    }

    const expansion = calculateExpansionResults(
      state, totalValueLow, totalValueHigh, totalHoursSaved,
      state.expansionTargets?.targetAdoption,
      state.expansionTargets?.targetProviders
    );

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
      overtimeSavings,
      retentionValue,
      expansion,
    };
  }, [state, capacityPercent, savingsPercent, wellbeingPercent, careSetting]);

  const pvEnabled = state.potentialValueEnabled !== false;
  const adjustedTimeValue = pvEnabled ? results.timeValueSubtotal : (results.timeValueSubtotal - results.savingsValue);
  const adjustedTotalLow = results.totalValueLow - (pvEnabled ? 0 : results.savingsValue);
  const adjustedTotalHigh = results.totalValueHigh - (pvEnabled ? 0 : results.savingsValue);
  const hoursPerProvider = Math.round(results.expansion.hoursPerProvider);

  const handleExportPDF = async (clientName: string, preparedBy: string) => {
    setIsExporting(true);
    try {
      await generateMeasurePDF(state, clientName, preparedBy);
      setShowExportModal(false);
      toast({
        title: "PDF Downloaded",
        description: "Your Value Story has been saved.",
        variant: "brand",
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
            {state.deployment.providers} {isNursing ? "nurses" : "providers"}.
          </p>
          <p className="text-[28px] text-[#1A1A1A] mb-1" data-testid="text-hero-months">
            {state.deployment.monthsOnAbridge} months.
          </p>
          <p className="text-[36px] font-bold text-[#EA2C00] mb-4" data-testid="text-hero-hours">
            {formatNumber(Math.round(results.totalHoursSaved))} hours back.
          </p>

          <p className="text-sm text-[#666666] max-w-lg mx-auto" data-testid="text-hero-context">
            That's {hoursPerProvider} hours per {isNursing ? "nurse" : "provider"} over {state.deployment.monthsOnAbridge} months{'\u2014'}time that used to disappear into documentation.
          </p>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-8 border-l-4 border-[#EA2C00]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="section-story-callout"
        >
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
            The Story
          </p>
          <p className="text-xl font-bold text-[#1A1A1A] leading-relaxed mb-3">
            You gave {state.deployment.providers} {isNursing ? "nurses" : "people"} their evenings back{'\u2014'}and the {isNursing ? "charting" : "notes"} got better, not worse.
          </p>
          <p className="text-sm text-[#666666] leading-relaxed">
            Better documentation comes from less time documenting. That's not a paradox{'\u2014'}it's what happens when the technology works.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="section-results"
        >
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-5">
            Your Results
          </p>

          <div className="flex items-center justify-between py-3 border-b border-[#F0F0F0]">
            <span className="text-sm text-[#1A1A1A]">Hours Reclaimed</span>
            <span className="text-sm font-semibold text-[#1A1A1A]">{formatNumber(Math.round(results.totalHoursSaved))} hours</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#F0F0F0]">
            <span className="text-sm text-[#1A1A1A]">Per {isNursing ? "Nurse" : "Provider"}</span>
            <span className="text-sm font-semibold text-[#1A1A1A]">{hoursPerProvider} hours</span>
          </div>

          <div className="py-3 border-b border-[#F0F0F0]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#1A1A1A]">Time Value</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(adjustedTimeValue)}</span>
            </div>
            <div className="pl-4 space-y-1">
              <div className={`flex items-center justify-between ${pvEnabled ? '' : 'opacity-40 line-through'}`}>
                <span className="text-xs text-[#666666]">Potential Value ({savingsPercent}%)</span>
                <span className="text-xs text-[#666666]">{formatCurrency(results.savingsValue)}</span>
              </div>
              {!isInpatient && !isNursing && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#666666]">{isED ? "Throughput" : "Patient Capacity"} ({capacityPercent}%)</span>
                  <span className="text-xs text-[#666666]">{formatCurrency(results.capacityValue)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666666]">{isNursing ? "Nurse" : "Provider"} Wellbeing ({wellbeingPercent}%)</span>
                <span className="text-xs text-[#666666]">{results.hoursPerProviderPerWeek.toFixed(1)} hrs/wk back</span>
              </div>
            </div>
          </div>

          {isNursing && results.overtimeSavings > 0 && (
            <div className="flex items-center justify-between py-3 border-b border-[#F0F0F0]">
              <span className="text-sm text-[#1A1A1A]">Overtime Savings</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(results.overtimeSavings)}</span>
            </div>
          )}

          {isNursing && results.retentionValue > 0 && (
            <div className="flex items-center justify-between py-3 border-b border-[#F0F0F0]">
              <span className="text-sm text-[#1A1A1A]">Retention Value</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(results.retentionValue)}</span>
            </div>
          )}

          {!isNursing && (results.docValueLow > 0 || results.docValueHigh > 0) && (
            <div className="py-3 border-b border-[#F0F0F0]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#1A1A1A]">{isInpatient ? "Documentation & Coding" : isED ? "E/M & LWBS Value" : "Documentation Value"}</span>
                <span className="text-sm font-semibold text-[#1A1A1A]">{formatSmartRange(results.docValueLow, results.docValueHigh)}</span>
              </div>
            </div>
          )}

          <div className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide">Estimated Annual Value</span>
              <span className="text-xl font-bold text-[#EA2C00]" data-testid="text-total-value">
                {formatSmartRange(adjustedTotalLow, adjustedTotalHigh)}
              </span>
            </div>
            <p className="text-xs text-[#666666]">Per {isNursing ? "nurse" : "provider"}: ~{formatCurrency(results.expansion.perProviderValue)}/year</p>
          </div>
        </motion.div>

        {(state.customMetrics || []).filter((cm) => cm.label.trim()).length > 0 && (
          <motion.div
            className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            data-testid="section-custom-metrics"
          >
            <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-5">
              Additional Metrics
            </p>
            {(state.customMetrics || [])
              .filter((cm) => cm.label.trim())
              .map((cm) => {
                const delta = cm.after - cm.before;
                const pct = cm.before !== 0 ? ((delta / cm.before) * 100).toFixed(1) : null;
                return (
                  <div
                    key={cm.id}
                    className="flex items-center justify-between py-3 border-b border-[#F0F0F0] last:border-b-0"
                    data-testid={`story-custom-${cm.id}`}
                  >
                    <span className="text-sm text-[#1A1A1A]">{cm.label}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[#999999]">{cm.before} {'\u2192'} {cm.after}</span>
                      {pct && (
                        <span className={`text-xs font-semibold ${delta > 0 ? 'text-green-600' : delta < 0 ? 'text-[#EA2C00]' : 'text-[#666666]'}`}>
                          {delta > 0 ? '+' : ''}{pct}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </motion.div>
        )}

        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="section-expansion"
        >
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-4">
            What's Next
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1px] mb-2">Deepen</p>
              <p className="text-sm text-[#666666] mb-1">{state.deployment.utilizationRate}% {'\u2192'} {state.expansionTargets?.targetAdoption ?? 85}% adoption</p>
              <p className="text-lg font-bold text-[#EA2C00]">+{formatCurrency(results.expansion.deepenAdditionalValue)} / year</p>
              <p className="text-[12px] text-[#999999] mt-1">No additional cost</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-[1px] mb-2">Expand</p>
              <p className="text-sm text-[#666666] mb-1">{state.deployment.providers} {'\u2192'} {results.expansion.expandProviders} {isNursing ? "nurses" : "providers"}</p>
              <p className="text-lg font-bold text-[#EA2C00]">+{formatSmartRange(results.expansion.expandValueLow - results.totalValueLow, results.expansion.expandValueHigh - results.totalValueHigh)} / year</p>
            </div>
          </div>

          <p className="text-xs text-[#666666]">
            Your {state.deployment.providers}-{isNursing ? "nurse" : "provider"} pilot has demonstrated the model.
          </p>
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
                    <strong className="text-[#1A1A1A]">Time savings:</strong> Based on {Math.max(0, state.timeEfficiency.timeInNotesWithout - state.timeEfficiency.timeInNotesWith)} min saved per {isNursing ? "shift" : isInpatient ? "discharge" : "encounter"} x {formatNumber(state.deployment.totalEncounters)} total {isNursing ? "shifts" : isInpatient ? "discharges" : "encounters"}.
                  </p>
                  <p>
                    <strong className="text-[#1A1A1A]">Time allocation:</strong> {savingsPercent}% potential value at ${state.calibration.otHourlyRate}/hr{pvEnabled ? "" : " (excluded from totals)"}{!isInpatient && !isNursing ? `, ${capacityPercent}% ${isED ? "throughput" : "capacity"} at $${state.calibration.revenuePerVisit}/${isED ? "patient" : "visit"}` : ""}, {wellbeingPercent}% wellbeing.
                  </p>
                  {!isNursing && (
                    <p>
                      <strong className="text-[#1A1A1A]">{isInpatient ? "Documentation & Coding:" : isED ? "E/M & Throughput:" : "Documentation value:"}</strong>{" "}
                      {isInpatient
                        ? "CMI improvement, denial reduction, and CDI efficiency. Range reflects 70-85% attribution for DRG accuracy."
                        : isED
                        ? "E/M level accuracy and LWBS recovery value."
                        : `+${results.wrvuLift.toFixed(2)} wRVU/encounter x $${state.calibration.conversionFactor} conversion factor. Range reflects 70-85% attribution.`
                      }
                    </p>
                  )}
                  {isNursing && (results.overtimeSavings > 0 || results.retentionValue > 0) && (
                    <p>
                      <strong className="text-[#1A1A1A]">Additional value:</strong>{" "}
                      {results.overtimeSavings > 0 ? `Overtime reduction at 1.5x hourly rate.` : ""}{" "}
                      {results.retentionValue > 0 ? `Retention savings at $56K replacement cost per nurse.` : ""}
                    </p>
                  )}
                  <p>
                    <strong className="text-[#1A1A1A]">Expansion:</strong> Deepen assumes {state.expansionTargets?.targetAdoption ?? 85}% utilization. Expand based on per-{isNursing ? "nurse" : "provider"} economics applied to {results.expansion.expandProviders} {isNursing ? "nurses" : "providers"}.
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

        <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
          <p className="text-xs text-[#999999] leading-relaxed text-center max-w-2xl mx-auto">
            Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and Abridge deployment data. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This does not constitute a guarantee of financial outcomes.
          </p>
        </div>
      </div>
    </div>
  );
}
