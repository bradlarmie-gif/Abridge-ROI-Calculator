import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { 
  type MeasureState, 
  formatCurrency, 
  formatNumber,
  calculateExpansionResults,
} from "@/lib/measureCalculator";

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
  onNext,
  onHome, 
  onBack,
}: MeasureAllocateProps) {
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

    const expansion = calculateExpansionResults(state, totalValueLow, totalValueHigh, totalHoursSaved);

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
      expansion,
    };
  }, [state, capacityPercent, savingsPercent, wellbeingPercent]);

  const heroValue = formatSmartRange(results.totalValueLow, results.totalValueHigh);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={3}
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
            {formatNumber(Math.round(results.totalHoursSaved))} hours reclaimed across {state.deployment.providers} providers. Here's what that translates to for your organization.
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

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4" data-testid="stat-time-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatCurrency(results.timeValueSubtotal)}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">Time Value</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-doc-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatSmartRange(results.docValueLow, results.docValueHigh)}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">Doc Quality</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-hours">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatNumber(Math.round(results.totalHoursSaved))}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">Hours Reclaimed</p>
            </div>
          </div>

          <p className="text-sm text-[#666666]">
            That's approximately {formatCurrency(results.expansion.perProviderValue)} per provider per year.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="section-time-waterfall"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">
            How Time Creates Value
          </p>
          <p className="text-sm text-[#666666] mb-5">
            {formatNumber(Math.round(results.totalHoursSaved))} hours reclaimed. Here's where they go.
          </p>

          <div className="space-y-0">
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Operational Savings</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {formatNumber(Math.round(results.savingsHours))} hours at ${state.calibration.otHourlyRate}/hr<sup>1</sup>
                  </p>
                  <p className="text-[10px] text-[#999999] mt-0.5">[{savingsPercent}% of time saved]</p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatCurrency(results.savingsValue)}</p>
            </div>

            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Patient Capacity</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {formatNumber(Math.round(results.capacityHours))} hours {'\u2192'} {formatNumber(Math.round(results.additionalVisits))} additional visits possible<sup>2</sup>
                  </p>
                  <p className="text-[10px] text-[#999999] mt-0.5">[{capacityPercent}% of time saved]</p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatCurrency(results.capacityValue)}</p>
            </div>

            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Provider Wellbeing</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {formatNumber(Math.round(results.wellbeingHours))} hours returned to providers
                  </p>
                  <p className="text-[10px] text-[#999999] mt-0.5">[{wellbeingPercent}% of time saved]</p>
                  <div className="bg-[#F5F0EB] rounded-md p-3 mt-3">
                    <p className="text-xs text-[#666666] italic leading-relaxed">
                      Retention signal: At industry average turnover, retaining 1 provider = $300-500K in avoided replacement costs.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-base font-semibold text-[#1A1A1A] flex-shrink-0 ml-4">{results.hoursPerProviderPerWeek.toFixed(1)} hrs/wk back</p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <p className="font-semibold text-[#1A1A1A]">Time Value Subtotal</p>
              <p className="text-xl font-bold text-[#EA2C00]">{formatCurrency(results.timeValueSubtotal)}</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#F0F0F0] space-y-1">
            <p className="text-[10px] text-[#999999]"><sup>1</sup> Based on your value model: ${state.calibration.otHourlyRate}/hr provider cost</p>
            <p className="text-[10px] text-[#999999]"><sup>2</sup> {state.calibration.minutesPerVisit}-min visits at ${state.calibration.revenuePerVisit}/visit</p>
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
            Better notes capture clinical complexity more accurately
          </p>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">+{results.wrvuLift.toFixed(2)}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px]">wRVU lift</p>
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
                <p className="font-semibold text-[#1A1A1A]">Revenue Potential</p>
                <p className="text-xs text-[#666666] mt-1">at 50-75% attribution<sup>3</sup></p>
              </div>
            </div>
            <p className="text-lg font-bold text-[#EA2C00] flex-shrink-0 ml-4">{formatSmartRange(results.docValueLow, results.docValueHigh)}</p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0F0F0]">
            <p className="text-[10px] text-[#999999]"><sup>3</sup> Attribution range accounts for factors beyond documentation that influence wRVU.</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-8"
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
          <div className="text-sm text-[#666666] space-y-1 mb-4">
            <p>Time value: {formatCurrency(results.timeValueSubtotal)}</p>
            <p>Documentation quality: {formatSmartRange(results.docValueLow, results.docValueHigh)}</p>
          </div>
          <div className="border-t border-[#E5E5E5] pt-4">
            <p className="text-sm text-[#666666]">Per provider: ~{formatCurrency(results.expansion.perProviderValue)}/year</p>
            <p className="text-sm text-[#666666]">Per encounter: ~{formatSmartRange(results.expansion.perEncounterValueLow, results.expansion.perEncounterValueHigh)}</p>
          </div>
        </motion.div>

        <motion.div 
          className="max-w-[480px] mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onNext}
            className="w-full h-[52px] bg-[#EA2C00] hover:bg-[#D42800] text-white font-semibold rounded-lg text-base gap-2"
            data-testid="button-whats-ahead"
          >
            See What's Ahead
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
