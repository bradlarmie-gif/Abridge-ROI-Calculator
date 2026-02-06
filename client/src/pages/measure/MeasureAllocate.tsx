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

function useInpatientResults(state: MeasureState) {
  return useMemo(() => {
    const deployment = state.deployment;
    const timeEfficiency = state.timeEfficiency;
    const metrics = state.settingData?.inpatient || {};
    const savingsPercent = state.allocation.hardSavingsPercent ?? 60;
    const wellbeingPercent = state.allocation.qualityOfLifePercent ?? 40;

    const cmiBefore = metrics.cmi_before ?? state.documentationQuality.wrvuWithout ?? 0;
    const cmiAfter = metrics.cmi_after ?? state.documentationQuality.wrvuWith ?? 0;
    const cmiDelta = Math.max(0, cmiAfter - cmiBefore);

    const denialsBefore = metrics.denialsPer100_before ?? 0;
    const denialsAfter = metrics.denialsPer100_after ?? 0;
    const denialsDelta = Math.max(0, denialsBefore - denialsAfter);

    const cdiBefore = metrics.cdiQueriesPer100_before ?? 0;
    const cdiAfter = metrics.cdiQueriesPer100_after ?? 0;
    const cdiDelta = Math.max(0, cdiBefore - cdiAfter);
    const cdiReductionPct = cdiBefore > 0 ? Math.round((cdiDelta / cdiBefore) * 100) : 0;

    const baseDrgPayment = metrics.vm_baseDrgPayment ?? 6500;
    const cmiPointValue = metrics.vm_cmiPointValue ?? state.calibration.conversionFactor ?? 1500;
    const denialCostPerCase = metrics.vm_denialCostPerCase ?? 3200;
    const cdiFteCost = metrics.vm_cdiFteCost ?? 85000;
    const casesPerCdiFte = metrics.vm_casesPerCdiFte ?? 2500;
    const hourlyRate = metrics.vm_hourlyRate ?? state.calibration.otHourlyRate ?? 175;

    const totalDischarges = deployment.totalEncounters;

    const drgValueLow = cmiDelta * totalDischarges * cmiPointValue * 0.5;
    const drgValueHigh = cmiDelta * totalDischarges * cmiPointValue * 0.75;

    const fewerDenials = (denialsDelta / 100) * totalDischarges;
    const denialValue = fewerDenials * denialCostPerCase;

    const fewerQueries = (cdiDelta / 100) * totalDischarges;
    const fteCapacityReclaimed = casesPerCdiFte > 0 ? fewerQueries / casesPerCdiFte : 0;
    const cdiValue = fteCapacityReclaimed * cdiFteCost;

    const docValueLow = drgValueLow + denialValue + cdiValue;
    const docValueHigh = drgValueHigh + denialValue + cdiValue;

    const timeSavedPerNote = Math.max(0, timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith);
    const totalHoursSaved = (timeSavedPerNote * totalDischarges) / 60;

    const savingsHours = totalHoursSaved * (savingsPercent / 100);
    const savingsValue = savingsHours * hourlyRate;

    const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
    const hoursPerProviderPerWeek = deployment.providers > 0
      ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33)
      : 0;

    const timeValueSubtotal = savingsValue;

    const totalValueLow = docValueLow + timeValueSubtotal;
    const totalValueHigh = docValueHigh + timeValueSubtotal;

    const expansion = calculateExpansionResults(state, totalValueLow, totalValueHigh, totalHoursSaved);

    return {
      cmiBefore, cmiAfter, cmiDelta,
      denialsBefore, denialsAfter, denialsDelta, fewerDenials,
      cdiBefore, cdiAfter, cdiDelta, cdiReductionPct, fteCapacityReclaimed,
      drgValueLow, drgValueHigh,
      denialValue, cdiValue,
      docValueLow, docValueHigh,
      totalHoursSaved,
      savingsHours, savingsValue, savingsPercent,
      wellbeingHours, wellbeingPercent, hoursPerProviderPerWeek,
      timeValueSubtotal,
      totalValueLow, totalValueHigh,
      hourlyRate, baseDrgPayment, cmiPointValue, denialCostPerCase,
      expansion,
    };
  }, [state]);
}

function useGenericResults(state: MeasureState) {
  const capacityPercent = state.allocation.capacityPercent ?? 20;
  const savingsPercent = state.allocation.hardSavingsPercent ?? 50;
  const wellbeingPercent = state.allocation.qualityOfLifePercent ?? 30;

  return useMemo(() => {
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
      capacityPercent,
      savingsHours,
      savingsValue,
      savingsPercent,
      hoursPerProviderPerWeek,
      wellbeingHours,
      wellbeingPercent,
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
}

export default function MeasureAllocate({ 
  state, 
  onNext,
  onHome, 
  onBack,
}: MeasureAllocateProps) {
  const isInpatient = state.careSetting === "inpatient";

  if (isInpatient) {
    return <InpatientAllocate state={state} onNext={onNext} onBack={onBack} onHome={onHome} />;
  }

  return <GenericAllocate state={state} onNext={onNext} onBack={onBack} onHome={onHome} />;
}

function InpatientAllocate({ state, onNext, onBack, onHome }: { state: MeasureState; onNext: () => void; onBack: () => void; onHome: () => void }) {
  const r = useInpatientResults(state);
  const heroValue = formatSmartRange(r.totalValueLow, r.totalValueHigh);

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
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            The Value You've Built
          </h1>
          <p className="text-base text-[#666666]" data-testid="text-page-subtitle">
            {formatNumber(Math.round(r.totalHoursSaved))} hours reclaimed across {state.deployment.providers} hospitalists. Here's what that translates to.
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
            <div className="bg-white rounded-lg p-4" data-testid="stat-doc-coding-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatSmartRange(r.docValueLow, r.docValueHigh)}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">Doc & Coding</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-time-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatCurrency(r.timeValueSubtotal)}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">Time Value</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-hours">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatNumber(Math.round(r.totalHoursSaved))}</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">Hours Reclaimed</p>
            </div>
          </div>

          <p className="text-sm text-[#666666]">
            That's approximately {formatCurrency(r.expansion.perProviderValue)} per provider per year.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          data-testid="section-doc-coding"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">
            Documentation & Coding Value
          </p>
          <p className="text-sm text-[#666666] mb-5">
            Primary value driver for inpatient
          </p>

          <div className="space-y-0">
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">DRG Accuracy</p>
                  <p className="text-xs text-[#666666] mt-1">
                    CMI: {r.cmiBefore.toFixed(2)} {'\u2192'} {r.cmiAfter.toFixed(2)} (+{r.cmiDelta.toFixed(2)})
                  </p>
                  <p className="text-[10px] text-[#999999] mt-0.5">
                    {formatNumber(state.deployment.totalEncounters)} discharges {'\u00D7'} ${formatNumber(r.cmiPointValue)} per CMI point {'\u00D7'} attribution{'\u00B9'}
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatSmartRange(r.drgValueLow, r.drgValueHigh)}</p>
            </div>

            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Denial Prevention</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {r.denialsBefore.toFixed(1)} {'\u2192'} {r.denialsAfter.toFixed(1)} per 100 claims ({r.denialsDelta.toFixed(1)} fewer)
                  </p>
                  <p className="text-[10px] text-[#999999] mt-0.5">
                    {formatNumber(Math.round(r.fewerDenials))} fewer denials {'\u00D7'} ${formatNumber(r.denialCostPerCase)} per denial{'\u00B2'}
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatCurrency(r.denialValue)}</p>
            </div>

            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">CDI Efficiency</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {r.cdiBefore} {'\u2192'} {r.cdiAfter} queries per 100 ({r.cdiReductionPct}% reduction)
                  </p>
                  <p className="text-[10px] text-[#999999] mt-0.5">
                    Equivalent to {r.fteCapacityReclaimed.toFixed(1)} FTE capacity reclaimed{'\u00B3'}
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatCurrency(r.cdiValue)}</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#F0F0F0] space-y-1">
            <p className="text-[10px] text-[#999999]"><sup>1</sup> Attribution range: 50-75% accounts for factors beyond documentation</p>
            <p className="text-[10px] text-[#999999]"><sup>2</sup> Based on denial cost of ${formatNumber(r.denialCostPerCase)} per case</p>
            <p className="text-[10px] text-[#999999]"><sup>3</sup> Based on CDI FTE cost of ${formatNumber(85000)}/year at {formatNumber(2500)} cases/FTE</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="section-time-waterfall"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">
            Time Value
          </p>
          <p className="text-sm text-[#666666] mb-5">
            Secondary value driver
          </p>

          <div className="space-y-0">
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Operational Savings ({r.savingsPercent}%)</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {formatNumber(Math.round(r.savingsHours))} hours {'\u00D7'} ${r.hourlyRate}/hr
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatCurrency(r.savingsValue)}</p>
            </div>

            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Provider Wellbeing ({r.wellbeingPercent}%)</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {formatNumber(Math.round(r.wellbeingHours))} hours returned to providers
                  </p>
                  <div className="bg-[#F5F0EB] rounded-md p-3 mt-3">
                    <p className="text-xs text-[#666666] leading-relaxed">
                      Retention signal: At industry average turnover, retaining 1 hospitalist = $300-500K in avoided replacement costs.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-base font-semibold text-[#1A1A1A] flex-shrink-0 ml-4">{r.hoursPerProviderPerWeek.toFixed(1)} hrs/wk back</p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <p className="font-semibold text-[#1A1A1A]">Time Value Subtotal</p>
              <p className="text-xl font-bold text-[#EA2C00]">{formatCurrency(r.timeValueSubtotal)}</p>
            </div>
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
            <p>Documentation & coding: {formatSmartRange(r.docValueLow, r.docValueHigh)}</p>
            <p>Time value: {formatCurrency(r.timeValueSubtotal)}</p>
          </div>
          <div className="border-t border-[#E5E5E5] pt-4">
            <p className="text-sm text-[#666666]">Per provider: ~{formatCurrency(r.expansion.perProviderValue)}/year</p>
            <p className="text-sm text-[#666666]">Per discharge: ~{formatSmartRange(r.expansion.perEncounterValueLow, r.expansion.perEncounterValueHigh)}</p>
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

function GenericAllocate({ state, onNext, onBack, onHome }: { state: MeasureState; onNext: () => void; onBack: () => void; onHome: () => void }) {
  const results = useGenericResults(state);
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
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight" data-testid="text-page-title">
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
                  <p className="text-[10px] text-[#999999] mt-0.5">[{results.savingsPercent}% of time saved]</p>
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
                  <p className="text-[10px] text-[#999999] mt-0.5">[{results.capacityPercent}% of time saved]</p>
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
                  <p className="text-[10px] text-[#999999] mt-0.5">[{results.wellbeingPercent}% of time saved]</p>
                  <div className="bg-[#F5F0EB] rounded-md p-3 mt-3">
                    <p className="text-xs text-[#666666] leading-relaxed">
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
