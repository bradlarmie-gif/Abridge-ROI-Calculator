import { useMemo } from "react";
import { ArrowRight, TrendingUp, Users, Info } from "lucide-react";
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

interface MeasureOpportunityProps {
  state: MeasureState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureOpportunity({ 
  state, 
  onNext, 
  onBack,
  onHome,
}: MeasureOpportunityProps) {
  const careSetting = state.careSetting || "outpatient";
  const isInpatient = careSetting === "inpatient";
  const isED = careSetting === "ed";
  const isNursing = careSetting === "nursing";

  const calc = useMemo(() => {
    const deployment = state.deployment;
    const timeEfficiency = state.timeEfficiency;
    const calibration = state.calibration;
    const docQuality = state.documentationQuality;

    const capacityPercent = state.allocation.capacityPercent ?? 20;
    const savingsPercent = state.allocation.hardSavingsPercent ?? 50;

    const timeSavedPerNote = Math.max(0, timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith);
    const totalHoursSaved = (timeSavedPerNote * deployment.totalEncounters) / 60;

    let totalValueLow: number;
    let totalValueHigh: number;

    if (careSetting === "inpatient") {
      const metrics = state.settingData?.inpatient || {};
      const hourlyRate = metrics.vm_hourlyRate ?? calibration.otHourlyRate ?? 175;
      const cmiDelta = Math.max(0, (metrics.cmi_after ?? 0) - (metrics.cmi_before ?? 0));
      const cmiPointValue = metrics.vm_cmiPointValue ?? calibration.conversionFactor ?? 1500;
      const denialsDelta = Math.max(0, (metrics.denialsPer100_before ?? 0) - (metrics.denialsPer100_after ?? 0));
      const denialCostPerCase = metrics.vm_denialCostPerCase ?? 3200;
      const cdiDelta = Math.max(0, (metrics.cdiQueriesPer100_before ?? 0) - (metrics.cdiQueriesPer100_after ?? 0));
      const cdiFteCost = metrics.vm_cdiFteCost ?? 85000;
      const casesPerCdiFte = metrics.vm_casesPerCdiFte ?? 2500;
      const inpSavingsPercent = state.allocation.hardSavingsPercent ?? 60;

      const drgLow = cmiDelta * deployment.totalEncounters * cmiPointValue * 0.5;
      const drgHigh = cmiDelta * deployment.totalEncounters * cmiPointValue * 0.75;
      const denialValue = (denialsDelta / 100) * deployment.totalEncounters * denialCostPerCase;
      const cdiValue = casesPerCdiFte > 0 ? ((cdiDelta / 100) * deployment.totalEncounters / casesPerCdiFte) * cdiFteCost : 0;
      const savingsValue = totalHoursSaved * (inpSavingsPercent / 100) * hourlyRate;

      totalValueLow = drgLow + denialValue + cdiValue + savingsValue;
      totalValueHigh = drgHigh + denialValue + cdiValue + savingsValue;
    } else if (careSetting === "ed") {
      const throughputPercent = state.allocation.capacityPercent ?? 40;
      const edSavingsPercent = state.allocation.hardSavingsPercent ?? 40;

      const throughputHours = totalHoursSaved * (throughputPercent / 100);
      const additionalPatients = throughputHours * (60 / calibration.minutesPerVisit);
      const throughputValue = additionalPatients * calibration.revenuePerVisit;
      const savingsValue = totalHoursSaved * (edSavingsPercent / 100) * calibration.otHourlyRate;
      const timeSubtotal = throughputValue + savingsValue;

      const lwbsBefore = timeEfficiency.sameDayClosureWithout;
      const lwbsAfter = timeEfficiency.sameDayClosureWith;
      const lwbsReduction = Math.max(0, lwbsBefore - lwbsAfter);
      const patientsRetained = Math.round((lwbsReduction / 100) * deployment.totalEncounters);
      const lwbsValue = patientsRetained * calibration.revenuePerVisit;

      const emLevelLift = Math.max(0, docQuality.emLevelWith - docQuality.emLevelWithout);
      const documentedEncounters = deployment.totalEncounters * (deployment.utilizationRate / 100);
      const emLevelValue = emLevelLift * documentedEncounters * calibration.conversionFactor;

      totalValueLow = timeSubtotal + lwbsValue + emLevelValue * 0.5;
      totalValueHigh = timeSubtotal + lwbsValue + emLevelValue * 0.75;
    } else if (careSetting === "nursing") {
      const nursingMetrics = state.settingData?.nursing || {};
      const nursingSavingsPercent = state.allocation.hardSavingsPercent ?? 50;
      const savingsValue = totalHoursSaved * (nursingSavingsPercent / 100) * calibration.otHourlyRate;

      const overtimeSaved = Math.max(0, timeEfficiency.workOutsideWithout - timeEfficiency.workOutsideWith);
      const weeklyOtSavings = overtimeSaved * deployment.providers * calibration.otHourlyRate * 1.5;
      const annualOtSavings = weeklyOtSavings * 52;

      const turnoverReduction = Math.max(0, (nursingMetrics.turnoverRate_before ?? 0) - (nursingMetrics.turnoverRate_after ?? 0));
      const nursesRetained = Math.round((turnoverReduction / 100) * deployment.providers);
      const retentionValue = nursesRetained * 56000;

      totalValueLow = savingsValue + annualOtSavings + retentionValue;
      totalValueHigh = totalValueLow;
    } else {
      const capacityHours = totalHoursSaved * (capacityPercent / 100);
      const additionalVisits = capacityHours * (60 / calibration.minutesPerVisit);
      const capacityValue = additionalVisits * calibration.revenuePerVisit;

      const savingsHours = totalHoursSaved * (savingsPercent / 100);
      const savingsValue = savingsHours * calibration.otHourlyRate;

      const timeValueSubtotal = capacityValue + savingsValue;

      const wrvuLift = docQuality.wrvuWith - docQuality.wrvuWithout;
      const documentedEncounters = deployment.totalEncounters * (deployment.utilizationRate / 100);
      const docValueLow = wrvuLift * documentedEncounters * calibration.conversionFactor * 0.5;
      const docValueHigh = wrvuLift * documentedEncounters * calibration.conversionFactor * 0.75;

      totalValueLow = timeValueSubtotal + docValueLow;
      totalValueHigh = timeValueSubtotal + docValueHigh;
    }

    const expansion = calculateExpansionResults(state, totalValueLow, totalValueHigh, totalHoursSaved);

    return {
      totalHoursSaved,
      totalValueLow,
      totalValueHigh,
      timeSavedPerNote,
      expansion,
    };
  }, [state, careSetting]);

  const { expansion } = calc;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={4}
        totalSteps={5}
        stepName="The Opportunity"
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
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            The Opportunity Ahead
          </h1>
          <p className="text-base text-[#666666]" data-testid="text-page-subtitle">
            You've proven the model with {state.deployment.providers} {isNursing ? "nurses" : "providers"}. Here's what the data suggests about what's next.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-testid="section-deepen"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#EA2C00]" />
            <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px]">
              Layer 1: Deepen
            </p>
          </div>
          <p className="text-sm text-[#666666] mb-5">
            Increase adoption within your current {state.deployment.providers} {isNursing ? "nurses" : "providers"}
          </p>

          <div className="bg-[#F5F0EB] rounded-lg p-5 mb-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold text-[#999999] uppercase tracking-[1px] mb-2">Today</p>
                <p className="text-sm text-[#666666]">{state.deployment.utilizationRate}% adoption</p>
                <p className="text-sm text-[#666666]">{formatNumber(expansion.currentAdoptedEncounters)} {isInpatient ? "discharges" : isNursing ? "shifts" : "encounters"}</p>
                <p className="text-sm text-[#666666]">{formatNumber(Math.round(calc.totalHoursSaved))} hours saved</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1px] mb-2">At 85% Adoption</p>
                <p className="text-sm font-medium text-[#1A1A1A]">85% adoption</p>
                <p className="text-sm font-medium text-[#1A1A1A]">{formatNumber(expansion.deepenEncounters)} {isInpatient ? "discharges" : isNursing ? "shifts" : "encounters"}</p>
                <p className="text-sm font-medium text-[#1A1A1A]">{formatNumber(Math.round(expansion.deepenHoursSaved))} hours saved</p>
              </div>
            </div>

            <div className="border-t border-[#E5E5E5] mt-4 pt-4">
              <p className="text-base font-bold text-[#EA2C00]" data-testid="text-deepen-value">
                Additional value from adoption alone: +{formatCurrency(expansion.deepenAdditionalValue)}/year
              </p>
              <p className="text-xs text-[#666666] mt-1">
                No additional investment required.
              </p>
            </div>
          </div>

          <p className="text-xs text-[#666666]">
            This is your immediate opportunity. Moving from {state.deployment.utilizationRate}% to 85% adoption captures more value from {isNursing ? "nurses" : "providers"} who already have access to Abridge.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="section-expand"
        >
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-[#EA2C00]" />
            <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px]">
              Layer 2: Expand
            </p>
          </div>
          <p className="text-sm text-[#666666] mb-5">
            Bring Abridge to more of your organization
          </p>

          <div className="bg-[#F5F0EB] rounded-lg p-5 mb-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold text-[#999999] uppercase tracking-[1px] mb-2">Today</p>
                <p className="text-sm text-[#666666]">{state.deployment.providers} {isNursing ? "nurses" : "providers"}</p>
                <p className="text-sm text-[#666666]">{formatSmartRange(calc.totalValueLow, calc.totalValueHigh)}/year</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1px] mb-2">At {expansion.expandProviders} {isNursing ? "Nurses" : "Providers"}</p>
                <p className="text-sm font-medium text-[#1A1A1A]">{expansion.expandProviders} {isNursing ? "nurses" : "providers"}</p>
                <p className="text-sm font-medium text-[#1A1A1A]">{formatSmartRange(expansion.expandValueLow, expansion.expandValueHigh)}/year</p>
              </div>
            </div>

            <p className="text-xs text-[#666666] mt-4 pt-3 border-t border-[#E5E5E5]">
              At {formatCurrency(expansion.perProviderValue)} per {isNursing ? "nurse" : "provider"}, each additional {isNursing ? "nurse" : "provider"} added represents meaningful incremental value.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#F5F0EB] rounded-lg p-4 border-l-[3px] border-[#EA2C00]">
              <p className="text-xl font-bold text-[#1A1A1A]">{formatCurrency(expansion.perProviderValue)}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">value per {isNursing ? "nurse" : "provider"}/year</p>
            </div>
            <div className="bg-[#F5F0EB] rounded-lg p-4 border-l-[3px] border-[#EA2C00]">
              <p className="text-xl font-bold text-[#1A1A1A]">{Math.round(expansion.hoursPerProvider)} hrs</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">saved per {isNursing ? "nurse" : "provider"}/{state.deployment.monthsOnAbridge} mo</p>
            </div>
            <div className="bg-[#F5F0EB] rounded-lg p-4 border-l-[3px] border-[#EA2C00]">
              <p className="text-xl font-bold text-[#1A1A1A]">{expansion.remainingProviders}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">not yet on Abridge of {state.deployment.totalProviders} total</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="section-combined"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-5">
            Your Combined Opportunity
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-5">
              <p className="text-[10px] font-semibold text-[#999999] uppercase tracking-[1px] mb-3">Today</p>
              <p className="text-sm text-[#666666] mb-1">{state.deployment.providers} {isNursing ? "nurses" : "providers"}</p>
              <p className="text-sm text-[#666666] mb-3">{state.deployment.utilizationRate}% adoption</p>
              <p className="text-2xl font-bold text-[#1A1A1A]" data-testid="text-today-value">
                {formatSmartRange(calc.totalValueLow, calc.totalValueHigh)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-5">
              <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1px] mb-3">With Deeper + Wider Adoption</p>
              <p className="text-sm text-[#666666] mb-1">{expansion.combinedProviders} {isNursing ? "nurses" : "providers"}</p>
              <p className="text-sm text-[#666666] mb-3">85% adoption</p>
              <p className="text-2xl font-bold text-[#EA2C00]" data-testid="text-combined-value">
                {formatSmartRange(expansion.combinedValueLow, expansion.combinedValueHigh)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-5 mb-6 border-l-4 border-[#EA2C00]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          data-testid="section-callout"
        >
          <p className="text-sm text-[#666666] leading-relaxed">
            Unlike programs that scale linearly with headcount, AI documentation cost per {isNursing ? "nurse" : "provider"} decreases as adoption grows, while value per {isNursing ? "shift" : isInpatient ? "discharge" : "encounter"} remains consistent.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#999999] mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-[#999999] leading-relaxed">
              Projections assume current time savings ({calc.timeSavedPerNote} min/{isNursing ? "shift" : isInpatient ? "discharge" : "encounter"}), adoption rates, and {isInpatient ? "documentation" : isED ? "throughput" : isNursing ? "efficiency" : "wRVU"} improvements continue. Deeper adoption assumes 85% utilization. Expansion assumes same per-{isNursing ? "nurse" : "provider"} economics.
            </p>
          </div>
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
