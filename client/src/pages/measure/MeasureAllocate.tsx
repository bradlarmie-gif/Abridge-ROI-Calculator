import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  formatCurrency, 
  formatNumber,
} from "@/lib/measureCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

function formatSmartRange(low: number, high: number): string {
  const lowFmt = formatCurrency(low);
  const highFmt = formatCurrency(high);
  if (lowFmt === highFmt) return lowFmt;
  return `${lowFmt} \u2013 ${highFmt}`;
}

interface MeasureAllocateProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureAllocate({ 
  state, 
  updateState,
  onNext,
  onHome, 
  onBack,
}: MeasureAllocateProps) {
  const [showAssumptions, setShowAssumptions] = useState(false);

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
    const additionalWRVUs = wrvuLift * documentedEncounters;
    const docValueLow = additionalWRVUs * calibration.conversionFactor * 0.5;
    const docValueHigh = additionalWRVUs * calibration.conversionFactor * 0.75;

    const totalValueLow = timeValueSubtotal + docValueLow;
    const totalValueHigh = timeValueSubtotal + docValueHigh;

    return {
      totalHoursSaved,
      additionalVisits,
      capacityValue,
      capacityHours,
      savingsHours,
      savingsValue,
      hoursPerProviderPerWeek,
      wellbeingHours,
      timeValueSubtotal,
      wrvuLift,
      documentedEncounters,
      additionalWRVUs,
      docValueLow,
      docValueHigh,
      totalValueLow,
      totalValueHigh,
    };
  }, [state, capacityPercent, savingsPercent, wellbeingPercent]);

  const updateCalibration = <K extends keyof typeof state.calibration>(key: K, value: number) => {
    updateState({ calibration: { ...state.calibration, [key]: value } });
  };

  const updateAllocation = (key: keyof typeof state.allocation, value: number) => {
    updateState({
      allocation: {
        ...state.allocation,
        [key]: Math.max(0, Math.min(100, value)),
      }
    });
  };

  const heroValue = formatSmartRange(results.totalValueLow, results.totalValueHigh);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={4}
        totalSteps={5}
        stepName="The Value"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3" data-testid="text-page-title">
            The Value You've Built
          </h1>
          <p className="text-base text-[#666666]" data-testid="text-page-subtitle">
            {formatNumber(Math.round(results.totalHoursSaved))} hours reclaimed. Here's what that translates to.
          </p>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-8 text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="section-hero-value"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
            Estimated Annual Value
          </p>
          <p className="text-5xl md:text-[56px] font-bold text-[#EA2C00] mb-3" data-testid="text-hero-value">
            {heroValue}
          </p>
          <p className="text-xs text-[#666666] mb-6">
            Based on {state.deployment.providers} providers across {formatNumber(state.deployment.totalEncounters)} encounters
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4" data-testid="stat-time-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatCurrency(results.timeValueSubtotal)}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">Time Value</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-doc-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatSmartRange(results.docValueLow, results.docValueHigh)}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">Documentation Quality</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-hours">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatNumber(Math.round(results.totalHoursSaved))}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">Hours Reclaimed</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="section-time-waterfall"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">
            How Time Becomes Value
          </p>
          <p className="text-sm text-[#666666] mb-5">
            Your providers reclaimed {formatNumber(Math.round(results.totalHoursSaved))} hours. Here's where that time goes.
          </p>

          <div className="space-y-0">
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Patient Capacity</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {capacityPercent}% of time saved &rarr; {formatNumber(Math.round(results.additionalVisits))} additional visits possible
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatCurrency(results.capacityValue)}</p>
            </div>

            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Operational Savings</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {savingsPercent}% of time saved &rarr; {formatNumber(Math.round(results.savingsHours))} overtime hours avoided
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatCurrency(results.savingsValue)}</p>
            </div>

            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Provider Wellbeing</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {wellbeingPercent}% of time saved &rarr; reclaimed personal time
                  </p>
                  <p className="text-xs text-[#999999] italic mt-1">
                    Retention value: ~1 provider retained = $300-500K
                  </p>
                </div>
              </div>
              <p className="text-base font-semibold text-[#1A1A1A] flex-shrink-0 ml-4">{results.hoursPerProviderPerWeek.toFixed(1)} hrs/wk back</p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <p className="font-semibold text-[#1A1A1A]">Time Value Subtotal</p>
              <p className="text-xl font-bold text-[#EA2C00]">{formatCurrency(results.timeValueSubtotal)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="section-doc-quality"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">
            Documentation Quality
          </p>
          <p className="text-sm text-[#666666] mb-5">
            Revenue from more complete documentation
          </p>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">+{results.wrvuLift.toFixed(2)}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px]">wRVU lift per visit</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">{formatNumber(Math.round(results.documentedEncounters))}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px]">encounters analyzed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">{formatNumber(Math.round(results.additionalWRVUs))}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px]">additional wRVUs</p>
            </div>
          </div>

          <div className="flex items-start justify-between py-3">
            <div className="flex items-start gap-3">
              <div className="w-1 h-8 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-[#1A1A1A]">Revenue Potential (estimated)</p>
                <p className="text-xs text-[#666666] mt-1">at 50-75% attribution</p>
              </div>
            </div>
            <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatSmartRange(results.docValueLow, results.docValueHigh)}</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          data-testid="section-total"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
            Estimated Annual Value
          </p>
          <p className="text-3xl md:text-4xl font-bold text-[#EA2C00] mb-3" data-testid="text-total-value">
            {heroValue}
          </p>
          <div className="text-sm text-[#666666] space-y-1 mb-5">
            <p>Time value: {formatCurrency(results.timeValueSubtotal)}</p>
            <p>Documentation quality: {formatSmartRange(results.docValueLow, results.docValueHigh)}</p>
          </div>

          <div className="border-t border-[#E5E5E5] pt-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-[#999999] mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-[#999999] leading-relaxed">
                These estimates use conservative assumptions. The range reflects different attribution models for wRVU improvement. Time value is calculated from your actual before/after data.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <button
            onClick={() => setShowAssumptions(!showAssumptions)}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#D1D5DB] transition-colors text-sm text-[#999999]"
            data-testid="button-toggle-assumptions"
          >
            <span>Adjust assumptions</span>
            {showAssumptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showAssumptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg p-5 space-y-5">
                  <div>
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                      Time Allocation
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm text-[#666666]">Capacity %</label>
                        <FormattedNumberInput
                          value={capacityPercent}
                          onChange={(v: number) => updateAllocation('capacityPercent', v)}
                          className="h-10 text-center"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-[#666666]">Savings %</label>
                        <FormattedNumberInput
                          value={savingsPercent}
                          onChange={(v: number) => updateAllocation('hardSavingsPercent', v)}
                          className="h-10 text-center"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-[#666666]">Wellbeing %</label>
                        <FormattedNumberInput
                          value={wellbeingPercent}
                          onChange={(v: number) => updateAllocation('qualityOfLifePercent', v)}
                          className="h-10 text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                      Value Assumptions
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm text-[#666666]">OT Rate ($/hr)</label>
                        <FormattedNumberInput
                          value={state.calibration.otHourlyRate}
                          onChange={(v: number) => updateCalibration('otHourlyRate', v)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-[#666666]">Revenue per Visit ($)</label>
                        <FormattedNumberInput
                          value={state.calibration.revenuePerVisit}
                          onChange={(v: number) => updateCalibration('revenuePerVisit', v)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-[#666666]">Visit Duration (min)</label>
                        <FormattedNumberInput
                          value={state.calibration.minutesPerVisit}
                          onChange={(v: number) => updateCalibration('minutesPerVisit', v)}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm text-[#666666]">$/wRVU</label>
                        <FormattedNumberInput
                          value={state.calibration.conversionFactor}
                          onChange={(v: number) => updateCalibration('conversionFactor', v)}
                          className="h-10"
                        />
                        <p className="text-[10px] text-[#888888]">Medicare conversion factor</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div 
          className="max-w-[480px] mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Button
            onClick={onNext}
            className="w-full h-[52px] bg-[#EA2C00] hover:bg-[#D42800] text-white font-semibold rounded-lg text-base gap-2"
            data-testid="button-see-story"
          >
            See Your Story
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
