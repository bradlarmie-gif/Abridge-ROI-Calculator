import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  calculateMeasureResults, 
  formatCurrency, 
  formatNumber,
} from "@/lib/measureCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

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

  // Get allocation with defaults (use nullish coalescing to allow 0% values)
  const capacityPercent = state.allocation.capacityPercent ?? 20;
  const savingsPercent = state.allocation.hardSavingsPercent ?? 50;
  const wellbeingPercent = state.allocation.qualityOfLifePercent ?? 30;

  // Calculate results using the new formula from spec
  const results = useMemo(() => {
    const deployment = state.deployment;
    const timeEfficiency = state.timeEfficiency;
    const calibration = state.calibration;
    const docQuality = state.documentationQuality;

    // Hours Saved = (Before time - After time) × Total Encounters ÷ 60
    const timeSavedPerNote = timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith;
    const totalHoursSaved = (timeSavedPerNote * deployment.totalEncounters) / 60;

    // Capacity Value: Hours × capacity% × (60 ÷ visitDuration) × revenuePerVisit
    const capacityHours = totalHoursSaved * (capacityPercent / 100);
    const additionalVisits = capacityHours * (60 / calibration.minutesPerVisit);
    const capacityValue = additionalVisits * calibration.revenuePerVisit;

    // Savings Value: Hours × savings% × OT rate
    const savingsHours = totalHoursSaved * (savingsPercent / 100);
    const savingsValue = savingsHours * calibration.otHourlyRate;

    // Wellbeing: Hours × wellbeing% ÷ Providers ÷ (Months × 4.33 weeks)
    const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
    const hoursPerProviderPerWeek = deployment.providers > 0 
      ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33)
      : 0;

    // Time Value subtotal
    const timeValueSubtotal = capacityValue + savingsValue;

    // Documentation Value: wRVU Lift × Encounters × Utilization × $33 × Attribution%
    const wrvuLift = docQuality.wrvuWith - docQuality.wrvuWithout;
    const documentedEncounters = deployment.totalEncounters * (deployment.utilizationRate / 100);
    const additionalWRVUs = wrvuLift * documentedEncounters;
    const docValueConservative = additionalWRVUs * calibration.conversionFactor * 0.5;
    const docValueOptimistic = additionalWRVUs * calibration.conversionFactor * 0.75;

    // Total
    const totalValueLow = timeValueSubtotal + docValueConservative;
    const totalValueHigh = timeValueSubtotal + docValueOptimistic;

    return {
      totalHoursSaved,
      additionalVisits,
      capacityValue,
      savingsHours,
      savingsValue,
      hoursPerProviderPerWeek,
      timeValueSubtotal,
      wrvuLift,
      documentedEncounters,
      additionalWRVUs,
      docValueConservative,
      docValueOptimistic,
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
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 uppercase tracking-tight">
            The Value
          </h1>
          <p className="text-base text-[#888888]">
            Your providers reclaimed <span className="font-semibold text-black">{formatNumber(Math.round(results.totalHoursSaved))} hours</span>. Here's what that's worth.
          </p>
        </motion.div>

        {/* Hero Stat - Hours Reclaimed */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            Hours Reclaimed
          </p>
          <p className="text-5xl md:text-6xl font-bold text-black mb-2">
            {formatNumber(Math.round(results.totalHoursSaved))}
          </p>
          <p className="text-sm text-[#666666]">
            Based on {formatNumber(state.deployment.totalEncounters)} encounters
          </p>
        </motion.div>

        {/* Time Value Section */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
            Time Value
          </p>
          <p className="text-sm text-[#666666] mb-5">
            How your providers used the time they got back
          </p>

          <div className="space-y-4">
            {/* Capacity */}
            <div className="border-l-4 border-[#E85A2C] pl-4 py-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-black">Capacity</p>
                  <p className="text-sm text-[#666666]">
                    {formatNumber(Math.round(results.additionalVisits))} additional visits possible
                  </p>
                  <p className="text-xs text-[#888888] mt-0.5">{capacityPercent}% of time saved</p>
                </div>
                <p className="text-xl font-bold text-[#E85A2C]">{formatCurrency(results.capacityValue)}</p>
              </div>
            </div>

            <div className="h-px bg-[#E5E5E5]" />

            {/* Savings */}
            <div className="border-l-4 border-[#E85A2C] pl-4 py-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-black">Savings</p>
                  <p className="text-sm text-[#666666]">
                    {formatNumber(Math.round(results.savingsHours))} overtime hours avoided
                  </p>
                  <p className="text-xs text-[#888888] mt-0.5">{savingsPercent}% of time saved</p>
                </div>
                <p className="text-xl font-bold text-[#E85A2C]">{formatCurrency(results.savingsValue)}</p>
              </div>
            </div>

            <div className="h-px bg-[#E5E5E5]" />

            {/* Wellbeing */}
            <div className="border-l-4 border-[#E85A2C] pl-4 py-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-black">Wellbeing</p>
                  <p className="text-sm text-[#666666]">
                    {results.hoursPerProviderPerWeek.toFixed(1)} hrs/week back per provider
                  </p>
                  <p className="text-xs text-[#888888] mt-0.5">{wellbeingPercent}% of time saved</p>
                  <p className="text-xs text-[#888888] italic mt-2">
                    Note: 1 provider retained = $300-500K saved
                  </p>
                </div>
                <p className="text-sm font-medium text-[#666666]">Retention Value</p>
              </div>
            </div>

            <div className="h-px bg-[#E5E5E5]" />

            {/* Subtotal */}
            <div className="flex items-center justify-between pt-2">
              <p className="font-semibold text-black">Time Value Subtotal</p>
              <p className="text-xl font-bold text-[#E85A2C]">{formatCurrency(results.timeValueSubtotal)}</p>
            </div>
          </div>
        </motion.div>

        {/* Documentation Value Section */}
        <motion.div
          className="bg-white rounded-lg border border-[#E5E5E5] p-6 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
            Documentation Value
          </p>
          <p className="text-sm text-[#666666] mb-5">
            Revenue from improved capture
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-sm text-[#888888]">wRVU Lift</p>
              <p className="text-lg font-semibold text-black">+{results.wrvuLift.toFixed(2)} per encounter</p>
            </div>
            <div>
              <p className="text-sm text-[#888888]">Encounters Analyzed</p>
              <p className="text-lg font-semibold text-black">{formatNumber(Math.round(results.documentedEncounters))}</p>
            </div>
            <div>
              <p className="text-sm text-[#888888]">Additional wRVUs</p>
              <p className="text-lg font-semibold text-black">{formatNumber(Math.round(results.additionalWRVUs))}</p>
            </div>
          </div>

          <div className="bg-[#F5F0EB] rounded-lg p-4">
            <p className="text-sm text-[#888888] mb-1">Revenue Potential</p>
            <p className="text-xl font-bold text-black">
              {formatCurrency(results.docValueConservative)} – {formatCurrency(results.docValueOptimistic)}
            </p>
            <p className="text-xs text-[#888888]">at 50-75% attribution</p>
          </div>
        </motion.div>

        {/* Total Annual Value */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
            Total Annual Value
          </p>
          <p className="text-3xl md:text-4xl font-bold text-[#E85A2C] mb-3">
            {formatCurrency(results.totalValueLow)} – {formatCurrency(results.totalValueHigh)}
          </p>
          <div className="text-sm text-[#666666] space-y-1">
            <p>Time value: {formatCurrency(results.timeValueSubtotal)}</p>
            <p>Documentation value: {formatCurrency(results.docValueConservative)} – {formatCurrency(results.docValueOptimistic)}</p>
          </div>
        </motion.div>

        {/* Adjust Assumptions Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <button
            onClick={() => setShowAssumptions(!showAssumptions)}
            className="w-full flex items-center justify-between p-4 bg-white border border-[#E5E5E5] rounded-lg hover:border-[#D1D5DB] transition-colors text-sm text-[#888888]"
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
                  {/* Time Allocation */}
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

                  {/* Value Assumptions */}
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
                        <div className="relative">
                          <FormattedNumberInput
                            value={state.calibration.conversionFactor}
                            onChange={(v: number) => updateCalibration('conversionFactor', v)}
                            className="h-10"
                          />
                        </div>
                        <p className="text-[10px] text-[#888888]">Medicare conversion factor</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation */}
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white font-medium rounded-md gap-2"
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
