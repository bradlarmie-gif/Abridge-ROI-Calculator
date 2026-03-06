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

    const adoptedDischarges = Math.round(deployment.totalEncounters * (deployment.utilizationRate / 100));
    const annualFactor = 12 / Math.max(deployment.monthsOnAbridge, 1);

    const drgValueLow = cmiDelta * adoptedDischarges * cmiPointValue * 0.50 * annualFactor;
    const drgValueHigh = cmiDelta * adoptedDischarges * cmiPointValue * 0.75 * annualFactor;

    const fewerDenials = (denialsDelta / 100) * adoptedDischarges;
    const denialValue = fewerDenials * denialCostPerCase * annualFactor;

    const fewerQueries = (cdiDelta / 100) * adoptedDischarges;
    const fteCapacityReclaimed = casesPerCdiFte > 0 ? fewerQueries / casesPerCdiFte : 0;
    const cdiValue = fteCapacityReclaimed * cdiFteCost * annualFactor;

    const docValueLow = drgValueLow + denialValue + cdiValue;
    const docValueHigh = drgValueHigh + denialValue + cdiValue;

    const timeSavedPerNote = Math.max(0, timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith);
    const totalHoursSaved = (timeSavedPerNote * adoptedDischarges) / 60;

    const savingsHours = totalHoursSaved * (savingsPercent / 100);
    const savingsValue = savingsHours * hourlyRate * annualFactor;

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
    const adoptedEncounters = Math.round(deployment.totalEncounters * (deployment.utilizationRate / 100));
    const totalHoursSaved = (timeSavedPerNote * adoptedEncounters) / 60;
    const annualFactor = 12 / Math.max(deployment.monthsOnAbridge, 1);

    const capacityHours = totalHoursSaved * (capacityPercent / 100);
    const additionalVisits = capacityHours * (60 / calibration.minutesPerVisit);
    const capacityValue = additionalVisits * calibration.revenuePerVisit * annualFactor;

    const savingsHours = totalHoursSaved * (savingsPercent / 100);
    const savingsValue = savingsHours * calibration.otHourlyRate * annualFactor;

    const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
    const hoursPerProviderPerWeek = deployment.providers > 0 
      ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33)
      : 0;

    const timeValueSubtotal = capacityValue + savingsValue;

    const wrvuLift = docQuality.wrvuWith - docQuality.wrvuWithout;
    const additionalWRVUs = wrvuLift * adoptedEncounters;
    const docValueLow = additionalWRVUs * calibration.conversionFactor * 0.50 * annualFactor;
    const docValueHigh = additionalWRVUs * calibration.conversionFactor * 0.75 * annualFactor;

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
      adoptedEncounters,
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
  updateState,
  onNext,
  onHome, 
  onBack,
}: MeasureAllocateProps) {
  const careSetting = state.careSetting || "outpatient";

  if (careSetting === "inpatient") {
    return <InpatientAllocate state={state} updateState={updateState} onNext={onNext} onBack={onBack} onHome={onHome} />;
  }
  if (careSetting === "ed") {
    return <EDAllocate state={state} updateState={updateState} onNext={onNext} onBack={onBack} onHome={onHome} />;
  }
  if (careSetting === "nursing") {
    return <NursingAllocate state={state} updateState={updateState} onNext={onNext} onBack={onBack} onHome={onHome} />;
  }

  return <GenericAllocate state={state} updateState={updateState} onNext={onNext} onBack={onBack} onHome={onHome} />;
}

type AllocateComponentProps = { state: MeasureState; updateState: (updates: Partial<MeasureState>) => void; onNext: () => void; onBack: () => void; onHome: () => void };


function InpatientAllocate({ state, updateState, onNext, onBack, onHome }: AllocateComponentProps) {
  const r = useInpatientResults(state);
  const adjustedTimeValue = r.timeValueSubtotal - r.savingsValue;
  const adjustedTotalLow = r.totalValueLow - r.savingsValue;
  const adjustedTotalHigh = r.totalValueHigh - r.savingsValue;
  const heroValue = formatSmartRange(adjustedTotalLow, adjustedTotalHigh);

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
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
            Estimated Annual Value
          </p>
          <p className="text-5xl md:text-[56px] font-bold text-[#EA2C00] mb-3" data-testid="text-hero-value">
            {heroValue}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4" data-testid="stat-doc-coding-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatSmartRange(r.docValueLow, r.docValueHigh)}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Doc & Coding</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-time-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatCurrency(adjustedTimeValue)}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Time Value</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-hours">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatNumber(Math.round(r.totalHoursSaved))}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Hours Reclaimed</p>
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
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">
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
                  <p className="text-[12px] text-[#999999] mt-0.5">
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
                  <p className="text-[12px] text-[#999999] mt-0.5">
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
                  <p className="text-[12px] text-[#999999] mt-0.5">
                    Equivalent to {r.fteCapacityReclaimed.toFixed(1)} FTE capacity reclaimed{'\u00B3'}
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatCurrency(r.cdiValue)}</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#F0F0F0] space-y-1">
            <p className="text-[12px] text-[#999999]"><sup>1</sup> Attribution range: 50-75% accounts for factors beyond documentation</p>
            <p className="text-[12px] text-[#999999]"><sup>2</sup> Based on denial cost of ${formatNumber(r.denialCostPerCase)} per case</p>
            <p className="text-[12px] text-[#999999]"><sup>3</sup> Based on CDI FTE cost of ${formatNumber(85000)}/year at {formatNumber(2500)} cases/FTE</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="section-time-waterfall"
        >
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">
            Time Value
          </p>
          <p className="text-sm text-[#666666] mb-5">
            Secondary value driver
          </p>

          <div className="space-y-0">
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0] bg-[#FAFAF8] -mx-6 px-6">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#999999] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Time Returned to Providers</p>
                  <p className="text-xs text-[#666666] mt-1">
                    [{r.savingsPercent}% of time saved]
                  </p>
                  <p className="text-[12px] text-[#999999] mt-2 max-w-sm leading-relaxed">
                    How your organization redeploys this time is up to you{'\u2014'}whether that's more patients, shorter days, or better care.
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatNumber(Math.round(r.savingsHours))} hours</p>
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
              <p className="text-xl font-bold text-[#EA2C00]">{formatCurrency(adjustedTimeValue)}</p>
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
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
            Estimated Annual Value
          </p>
          <p className="text-3xl md:text-4xl font-bold text-[#EA2C00] mb-3" data-testid="text-total-value">
            {heroValue}
          </p>
          <div className="text-sm text-[#666666] space-y-1 mb-4">
            <p>Documentation & coding: {formatSmartRange(r.docValueLow, r.docValueHigh)}</p>
            <p>Time value: {formatCurrency(adjustedTimeValue)}</p>
          </div>
          <div className="border-t border-[#E5E5E5] pt-4">
            <p className="text-sm text-[#666666]">Per provider: ~{formatCurrency(r.expansion.perProviderValue)}/year</p>
            <p className="text-sm text-[#666666]">Per discharge: ~{formatSmartRange(r.expansion.perEncounterValueLow, r.expansion.perEncounterValueHigh)}</p>
          </div>
        </motion.div>

        <motion.div 
          className="max-w-[480px] mx-auto relative z-10"
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

function useEDResults(state: MeasureState) {
  return useMemo(() => {
    const deployment = state.deployment;
    const timeEfficiency = state.timeEfficiency;
    const calibration = state.calibration;
    const docQuality = state.documentationQuality;

    const throughputPercent = state.allocation.capacityPercent ?? 40;
    const savingsPercent = state.allocation.hardSavingsPercent ?? 40;
    const wellbeingPercent = state.allocation.qualityOfLifePercent ?? 20;

    const timeSavedPerNote = Math.max(0, timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith);
    const adoptedEncounters = Math.round(deployment.totalEncounters * (deployment.utilizationRate / 100));
    const totalHoursSaved = (timeSavedPerNote * adoptedEncounters) / 60;
    const annualFactor = 12 / Math.max(deployment.monthsOnAbridge, 1);

    const throughputHours = totalHoursSaved * (throughputPercent / 100);
    const additionalPatients = throughputHours * (60 / calibration.minutesPerVisit);
    const throughputValue = additionalPatients * calibration.revenuePerVisit * annualFactor;

    const savingsHours = totalHoursSaved * (savingsPercent / 100);
    const savingsValue = savingsHours * calibration.otHourlyRate * annualFactor;

    const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
    const hoursPerProviderPerWeek = deployment.providers > 0
      ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33)
      : 0;

    const timeValueSubtotal = throughputValue + savingsValue;

    const doorToDocBefore = timeEfficiency.timeToCloseWithout;
    const doorToDocAfter = timeEfficiency.timeToCloseWith;
    const doorToDocSaved = Math.max(0, doorToDocBefore - doorToDocAfter);

    const lwbsBefore = timeEfficiency.sameDayClosureWithout;
    const lwbsAfter = timeEfficiency.sameDayClosureWith;
    const lwbsReduction = Math.max(0, lwbsBefore - lwbsAfter);
    const patientsRetained = Math.round((lwbsReduction / 100) * adoptedEncounters);
    const lwbsValue = patientsRetained * calibration.revenuePerVisit * annualFactor;

    const emLevelLift = Math.max(0, docQuality.emLevelWith - docQuality.emLevelWithout);
    const emLevelValue = emLevelLift * adoptedEncounters * calibration.conversionFactor;
    const docValueLow = emLevelValue * 0.50 * annualFactor;
    const docValueHigh = emLevelValue * 0.75 * annualFactor;

    const totalValueLow = timeValueSubtotal + lwbsValue + docValueLow;
    const totalValueHigh = timeValueSubtotal + lwbsValue + docValueHigh;

    const expansion = calculateExpansionResults(state, totalValueLow, totalValueHigh, totalHoursSaved);

    return {
      totalHoursSaved,
      throughputHours, additionalPatients, throughputValue, throughputPercent,
      savingsHours, savingsValue, savingsPercent,
      wellbeingHours, wellbeingPercent, hoursPerProviderPerWeek,
      timeValueSubtotal,
      doorToDocBefore, doorToDocAfter, doorToDocSaved,
      lwbsBefore, lwbsAfter, lwbsReduction, patientsRetained, lwbsValue,
      emLevelLift, adoptedEncounters, docValueLow, docValueHigh,
      totalValueLow, totalValueHigh,
      expansion,
    };
  }, [state]);
}

function useNursingResults(state: MeasureState) {
  return useMemo(() => {
    const deployment = state.deployment;
    const timeEfficiency = state.timeEfficiency;
    const calibration = state.calibration;
    const nursingMetrics = state.settingData?.nursing || {};

    const savingsPercent = state.allocation.hardSavingsPercent ?? 50;
    const wellbeingPercent = state.allocation.qualityOfLifePercent ?? 30;
    const capacityPercent = state.allocation.capacityPercent ?? 20;

    const timeSavedPerShift = Math.max(0, timeEfficiency.timeInNotesWithout - timeEfficiency.timeInNotesWith);
    const adoptedShifts = Math.round(deployment.totalEncounters * (deployment.utilizationRate / 100));
    const totalHoursSaved = (timeSavedPerShift * adoptedShifts) / 60;
    const annualFactor = 12 / Math.max(deployment.monthsOnAbridge, 1);

    const savingsHours = totalHoursSaved * (savingsPercent / 100);
    const savingsValue = savingsHours * calibration.otHourlyRate * annualFactor;

    const capacityHours = totalHoursSaved * (capacityPercent / 100);

    const wellbeingHours = totalHoursSaved * (wellbeingPercent / 100);
    const hoursPerProviderPerWeek = deployment.providers > 0
      ? wellbeingHours / deployment.providers / (deployment.monthsOnAbridge * 4.33)
      : 0;

    const overtimeBefore = timeEfficiency.workOutsideWithout;
    const overtimeAfter = timeEfficiency.workOutsideWith;
    const overtimeSaved = Math.max(0, overtimeBefore - overtimeAfter);
    const weeklyOvertimeSavings = overtimeSaved * deployment.providers * calibration.otHourlyRate * 1.5;
    const annualOvertimeSavings = weeklyOvertimeSavings * 52;

    const turnoverBefore = nursingMetrics.turnoverRate_before ?? 0;
    const turnoverAfter = nursingMetrics.turnoverRate_after ?? 0;
    const turnoverReduction = Math.max(0, turnoverBefore - turnoverAfter);
    const nursesRetained = Math.round((turnoverReduction / 100) * deployment.providers);
    const replacementCost = 56000;
    const retentionValue = nursesRetained * replacementCost;

    const timeValueSubtotal = savingsValue;
    const totalValueLow = timeValueSubtotal + annualOvertimeSavings + retentionValue;
    const totalValueHigh = totalValueLow;

    const expansion = calculateExpansionResults(state, totalValueLow, totalValueHigh, totalHoursSaved);

    const fallsBefore = nursingMetrics.fallsRate_before ?? 0;
    const fallsAfter = nursingMetrics.fallsRate_after ?? 0;
    const fallsReduction = Math.max(0, fallsBefore - fallsAfter);
    const hapiBefore = nursingMetrics.hapiRate_before ?? 0;
    const hapiAfter = nursingMetrics.hapiRate_after ?? 0;
    const hapiReduction = Math.max(0, hapiBefore - hapiAfter);

    return {
      totalHoursSaved,
      savingsHours, savingsValue, savingsPercent,
      capacityHours, capacityPercent,
      wellbeingHours, wellbeingPercent, hoursPerProviderPerWeek,
      timeValueSubtotal,
      overtimeBefore, overtimeAfter, overtimeSaved, annualOvertimeSavings,
      turnoverBefore, turnoverAfter, turnoverReduction, nursesRetained, retentionValue,
      fallsBefore, fallsAfter, fallsReduction,
      hapiBefore, hapiAfter, hapiReduction,
      totalValueLow, totalValueHigh,
      expansion,
    };
  }, [state]);
}

function EDAllocate({ state, updateState, onNext, onBack, onHome }: AllocateComponentProps) {
  const r = useEDResults(state);
  const adjustedTimeValue = r.timeValueSubtotal - r.savingsValue;
  const adjustedTotalLow = r.totalValueLow - r.savingsValue;
  const adjustedTotalHigh = r.totalValueHigh - r.savingsValue;
  const heroValue = formatSmartRange(adjustedTotalLow, adjustedTotalHigh);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader pathType="measure" currentStep={3} totalSteps={5} stepName="The Value" onBack={onBack} onHome={onHome} />
      <UnifiedHeaderSpacer />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            The Value You've Built
          </h1>
          <p className="text-base text-[#666666]" data-testid="text-page-subtitle">
            {formatNumber(Math.round(r.totalHoursSaved))} hours reclaimed across {state.deployment.providers} ED physicians. Here's what that translates to.
          </p>
        </motion.div>

        <motion.div className="bg-[#F5F0EB] rounded-xl p-8 text-center mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} data-testid="section-hero-value">
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">Estimated Annual Value</p>
          <p className="text-5xl md:text-[56px] font-bold text-[#EA2C00] mb-3" data-testid="text-hero-value">{heroValue}</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4" data-testid="stat-time-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatCurrency(adjustedTimeValue)}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Time Value</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-throughput-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatCurrency(r.lwbsValue)}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">LWBS Recovery</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-hours">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatNumber(Math.round(r.totalHoursSaved))}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Hours Reclaimed</p>
            </div>
          </div>
          <p className="text-sm text-[#666666]">
            That's approximately {formatCurrency(r.expansion.perProviderValue)} per provider per year.
          </p>
        </motion.div>

        <motion.div className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} data-testid="section-time-waterfall">
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">Potential Value from Time Savings</p>
          <p className="text-sm text-[#666666] mb-5">{formatNumber(Math.round(r.totalHoursSaved))} hours reclaimed. Here's where they may go.</p>
          <div className="space-y-0">
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Throughput ({r.throughputPercent}%)</p>
                  <p className="text-xs text-[#666666] mt-1">{formatNumber(Math.round(r.throughputHours))} hours {'\u2192'} {formatNumber(Math.round(r.additionalPatients))} additional patients possible</p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatCurrency(r.throughputValue)}</p>
            </div>
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0] bg-[#FAFAF8] -mx-6 px-6">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#999999] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Time Returned to Providers</p>
                  <p className="text-xs text-[#666666] mt-1">[{r.savingsPercent}% of time saved]</p>
                  <p className="text-[12px] text-[#999999] mt-2 max-w-sm leading-relaxed">
                    How your organization redeploys this time is up to you{'\u2014'}whether that's more patients, shorter days, or better care.
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatNumber(Math.round(r.savingsHours))} hours</p>
            </div>
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Provider Wellbeing ({r.wellbeingPercent}%)</p>
                  <p className="text-xs text-[#666666] mt-1">{formatNumber(Math.round(r.wellbeingHours))} hours returned to providers</p>
                </div>
              </div>
              <p className="text-base font-semibold text-[#1A1A1A] flex-shrink-0 ml-4">{r.hoursPerProviderPerWeek.toFixed(1)} hrs/wk back</p>
            </div>
            <div className="flex items-center justify-between pt-4">
              <p className="font-semibold text-[#1A1A1A]">Time Value Subtotal</p>
              <p className="text-xl font-bold text-[#EA2C00]">{formatCurrency(adjustedTimeValue)}</p>
            </div>
          </div>
        </motion.div>

        {r.lwbsValue > 0 && (
          <motion.div className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} data-testid="section-lwbs">
            <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">LWBS Recovery Value</p>
            <p className="text-sm text-[#666666] mb-5">Patients retained by reducing left-without-being-seen rate</p>
            <div className="flex items-start justify-between py-3">
              <div className="flex items-start gap-3">
                <div className="w-1 h-8 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Revenue Recovery</p>
                  <p className="text-xs text-[#666666] mt-1">LWBS: {r.lwbsBefore.toFixed(1)}% {'\u2192'} {r.lwbsAfter.toFixed(1)}% ({r.patientsRetained} patients retained at ${formatNumber(state.calibration.revenuePerVisit)}/visit)</p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#EA2C00] flex-shrink-0 ml-4">{formatCurrency(r.lwbsValue)}</p>
            </div>
          </motion.div>
        )}

        {(r.docValueLow > 0 || r.docValueHigh > 0) && (
          <motion.div className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} data-testid="section-em-level">
            <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">E/M Level Accuracy</p>
            <p className="text-sm text-[#666666] mb-5">More accurate coding captures true acuity</p>
            <div className="flex items-start justify-between py-3">
              <div className="flex items-start gap-3">
                <div className="w-1 h-8 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Revenue Potential</p>
                  <p className="text-xs text-[#666666] mt-1">+{r.emLevelLift.toFixed(2)} E/M level improvement across {formatNumber(Math.round(r.adoptedEncounters))} encounters at 50-75% attribution</p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#EA2C00] flex-shrink-0 ml-4">{formatSmartRange(r.docValueLow, r.docValueHigh)}</p>
            </div>
          </motion.div>
        )}

        <motion.div className="bg-[#F5F0EB] rounded-xl p-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} data-testid="section-total">
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">Estimated Annual Value</p>
          <p className="text-3xl md:text-4xl font-bold text-[#EA2C00] mb-3" data-testid="text-total-value">{heroValue}</p>
          <div className="text-sm text-[#666666] space-y-1 mb-4">
            <p>Time value: {formatCurrency(adjustedTimeValue)}</p>
            {r.lwbsValue > 0 && <p>LWBS recovery: {formatCurrency(r.lwbsValue)}</p>}
            {(r.docValueLow > 0 || r.docValueHigh > 0) && <p>E/M accuracy: {formatSmartRange(r.docValueLow, r.docValueHigh)}</p>}
          </div>
          <div className="border-t border-[#E5E5E5] pt-4">
            <p className="text-sm text-[#666666]">Per provider: ~{formatCurrency(r.expansion.perProviderValue)}/year</p>
            <p className="text-sm text-[#666666]">Per encounter: ~{formatSmartRange(r.expansion.perEncounterValueLow, r.expansion.perEncounterValueHigh)}</p>
          </div>
        </motion.div>

        <motion.div className="max-w-[480px] mx-auto relative z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          <Button onClick={onNext} className="w-full h-[52px] bg-[#EA2C00] hover:bg-[#D42800] text-white font-semibold rounded-lg text-base gap-2" data-testid="button-whats-ahead">
            See What's Ahead
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function NursingAllocate({ state, updateState, onNext, onBack, onHome }: AllocateComponentProps) {
  const r = useNursingResults(state);
  const adjustedTimeValue = r.timeValueSubtotal - r.savingsValue;
  const adjustedTotalLow = r.totalValueLow - r.savingsValue;
  const heroValue = formatCurrency(adjustedTotalLow);

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader pathType="measure" currentStep={3} totalSteps={5} stepName="The Value" onBack={onBack} onHome={onHome} />
      <UnifiedHeaderSpacer />
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div className="text-center mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            The Value You've Built
          </h1>
          <p className="text-base text-[#666666]" data-testid="text-page-subtitle">
            {formatNumber(Math.round(r.totalHoursSaved))} hours reclaimed across {state.deployment.providers} nurses. Here's what that translates to.
          </p>
        </motion.div>

        <motion.div className="bg-[#F5F0EB] rounded-xl p-8 text-center mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} data-testid="section-hero-value">
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">Estimated Annual Value</p>
          <p className="text-5xl md:text-[56px] font-bold text-[#EA2C00] mb-3" data-testid="text-hero-value">{heroValue}</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4" data-testid="stat-time-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatCurrency(adjustedTimeValue)}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Time Value</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-overtime-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatCurrency(r.annualOvertimeSavings)}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Overtime Savings</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-retention-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatCurrency(r.retentionValue)}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Retention Value</p>
            </div>
          </div>
          <p className="text-sm text-[#666666]">
            That's approximately {formatCurrency(r.expansion.perProviderValue)} per nurse per year.
          </p>
        </motion.div>

        <motion.div className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} data-testid="section-time-waterfall">
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">Time Value</p>
          <p className="text-sm text-[#666666] mb-5">{formatNumber(Math.round(r.totalHoursSaved))} hours reclaimed from charting.</p>
          <div className="space-y-0">
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0] bg-[#FAFAF8] -mx-6 px-6">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#999999] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Time Returned to Nurses</p>
                  <p className="text-xs text-[#666666] mt-1">[{r.savingsPercent}% of time saved]</p>
                  <p className="text-[12px] text-[#999999] mt-2 max-w-sm leading-relaxed">
                    How your organization redeploys this time is up to you{'\u2014'}whether that's more patients, shorter days, or better care.
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatNumber(Math.round(r.savingsHours))} hours</p>
            </div>
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Bedside Time ({r.capacityPercent}%)</p>
                  <p className="text-xs text-[#666666] mt-1">{formatNumber(Math.round(r.capacityHours))} hours returned to direct patient care</p>
                </div>
              </div>
              <p className="text-base font-semibold text-[#1A1A1A] flex-shrink-0 ml-4">Quality signal</p>
            </div>
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Nurse Wellbeing ({r.wellbeingPercent}%)</p>
                  <p className="text-xs text-[#666666] mt-1">{formatNumber(Math.round(r.wellbeingHours))} hours returned to nurses</p>
                </div>
              </div>
              <p className="text-base font-semibold text-[#1A1A1A] flex-shrink-0 ml-4">{r.hoursPerProviderPerWeek.toFixed(1)} hrs/wk back</p>
            </div>
          </div>
        </motion.div>

        {r.annualOvertimeSavings > 0 && (
          <motion.div className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} data-testid="section-overtime">
            <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">Overtime Reduction</p>
            <p className="text-sm text-[#666666] mb-5">Less overtime from faster charting</p>
            <div className="flex items-start justify-between py-3">
              <div className="flex items-start gap-3">
                <div className="w-1 h-8 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Annual Overtime Savings</p>
                  <p className="text-xs text-[#666666] mt-1">{r.overtimeSaved.toFixed(1)} hrs/wk saved across {state.deployment.providers} nurses at 1.5x rate</p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#EA2C00] flex-shrink-0 ml-4">{formatCurrency(r.annualOvertimeSavings)}</p>
            </div>
          </motion.div>
        )}

        {r.retentionValue > 0 && (
          <motion.div className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} data-testid="section-retention">
            <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">Retention Value</p>
            <p className="text-sm text-[#666666] mb-5">Reduced turnover may lower recruitment and training costs</p>
            <div className="flex items-start justify-between py-3">
              <div className="flex items-start gap-3">
                <div className="w-1 h-8 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Estimated Retention Savings</p>
                  <p className="text-xs text-[#666666] mt-1">Turnover: {r.turnoverBefore.toFixed(1)}% {'\u2192'} {r.turnoverAfter.toFixed(1)}% ({r.nursesRetained} nurses retained at $56K replacement cost)</p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#EA2C00] flex-shrink-0 ml-4">{formatCurrency(r.retentionValue)}</p>
            </div>
          </motion.div>
        )}

        {(r.fallsReduction > 0 || r.hapiReduction > 0) && (
          <motion.div className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} data-testid="section-quality">
            <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">Quality Outcomes</p>
            <p className="text-sm text-[#666666] mb-5">More time at the bedside improves safety</p>
            {r.fallsReduction > 0 && (
              <div className="flex items-start justify-between py-3 border-b border-[#F0F0F0]">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-8 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">Falls Rate</p>
                    <p className="text-xs text-[#666666] mt-1">{r.fallsBefore.toFixed(1)} {'\u2192'} {r.fallsAfter.toFixed(1)} per 1,000 patient days</p>
                  </div>
                </div>
                <p className="text-base font-semibold text-[#1A1A1A] flex-shrink-0 ml-4">{r.fallsReduction.toFixed(1)} fewer</p>
              </div>
            )}
            {r.hapiReduction > 0 && (
              <div className="flex items-start justify-between py-3">
                <div className="flex items-start gap-3">
                  <div className="w-1 h-8 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">HAPI Rate</p>
                    <p className="text-xs text-[#666666] mt-1">{r.hapiBefore.toFixed(1)} {'\u2192'} {r.hapiAfter.toFixed(1)} per 1,000 patient days</p>
                  </div>
                </div>
                <p className="text-base font-semibold text-[#1A1A1A] flex-shrink-0 ml-4">{r.hapiReduction.toFixed(1)} fewer</p>
              </div>
            )}
          </motion.div>
        )}

        <motion.div className="bg-[#F5F0EB] rounded-xl p-6 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} data-testid="section-total">
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">Estimated Annual Value</p>
          <p className="text-3xl md:text-4xl font-bold text-[#EA2C00] mb-3" data-testid="text-total-value">{heroValue}</p>
          <div className="text-sm text-[#666666] space-y-1 mb-4">
            <p>Time value: {formatCurrency(adjustedTimeValue)}</p>
            {r.annualOvertimeSavings > 0 && <p>Overtime savings: {formatCurrency(r.annualOvertimeSavings)}</p>}
            {r.retentionValue > 0 && <p>Retention value: {formatCurrency(r.retentionValue)}</p>}
          </div>
          <div className="border-t border-[#E5E5E5] pt-4">
            <p className="text-sm text-[#666666]">Per nurse: ~{formatCurrency(r.expansion.perProviderValue)}/year</p>
          </div>
        </motion.div>

        <motion.div className="max-w-[480px] mx-auto relative z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Button onClick={onNext} className="w-full h-[52px] bg-[#EA2C00] hover:bg-[#D42800] text-white font-semibold rounded-lg text-base gap-2" data-testid="button-whats-ahead">
            See What's Ahead
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>

        <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
          <p className="text-xs text-[#999999] leading-relaxed text-center max-w-2xl mx-auto">
            Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This does not constitute a guarantee of financial outcomes.
          </p>
        </div>
      </div>
    </div>
  );
}

function GenericAllocate({ state, updateState, onNext, onBack, onHome }: AllocateComponentProps) {
  const results = useGenericResults(state);
  const adjustedTimeValue = results.timeValueSubtotal - results.savingsValue;
  const adjustedTotalLow = results.totalValueLow - results.savingsValue;
  const adjustedTotalHigh = results.totalValueHigh - results.savingsValue;
  const heroValue = formatSmartRange(adjustedTotalLow, adjustedTotalHigh);

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
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
            Estimated Annual Value
          </p>
          <p className="text-5xl md:text-[56px] font-bold text-[#EA2C00] mb-3" data-testid="text-hero-value">
            {heroValue}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4" data-testid="stat-time-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatCurrency(adjustedTimeValue)}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Time Value</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-doc-value">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatSmartRange(results.docValueLow, results.docValueHigh)}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Doc Quality</p>
            </div>
            <div className="bg-white rounded-lg p-4" data-testid="stat-hours">
              <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{formatNumber(Math.round(results.totalHoursSaved))}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px] mt-1">Hours Reclaimed</p>
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
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">
            Potential Value from Time Savings
          </p>
          <p className="text-sm text-[#666666] mb-5">
            {formatNumber(Math.round(results.totalHoursSaved))} hours reclaimed. Here's where they may go.
          </p>

          <div className="space-y-0">
            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Patient Capacity</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {formatNumber(Math.round(results.capacityHours))} hours {'\u2192'} {formatNumber(Math.round(results.additionalVisits))} additional visits possible<sup>1</sup>
                  </p>
                  <p className="text-[12px] text-[#999999] mt-0.5">[{results.capacityPercent}% of time saved]</p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatCurrency(results.capacityValue)}</p>
            </div>

            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0] bg-[#FAFAF8] -mx-6 px-6">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#999999] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Time Returned to Providers</p>
                  <p className="text-xs text-[#666666] mt-1">
                    [{results.savingsPercent}% of time saved]
                  </p>
                  <p className="text-[12px] text-[#999999] mt-2 max-w-sm leading-relaxed">
                    How your organization redeploys this time is up to you{'\u2014'}whether that's more patients, shorter days, or better care.
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold text-[#1A1A1A] flex-shrink-0 ml-4">{formatNumber(Math.round(results.savingsHours))} hours</p>
            </div>

            <div className="flex items-start justify-between py-4 border-b border-[#F0F0F0]">
              <div className="flex items-start gap-3">
                <div className="w-1 h-10 bg-[#EA2C00] rounded-full mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-[#1A1A1A]">Provider Wellbeing</p>
                  <p className="text-xs text-[#666666] mt-1">
                    {formatNumber(Math.round(results.wellbeingHours))} hours returned to providers
                  </p>
                  <p className="text-[12px] text-[#999999] mt-0.5">[{results.wellbeingPercent}% of time saved]</p>
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
              <p className="text-xl font-bold text-[#EA2C00]">{formatCurrency(adjustedTimeValue)}</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#F0F0F0] space-y-1">
            <p className="text-[12px] text-[#999999]"><sup>1</sup> {state.calibration.minutesPerVisit}-min visits at ${state.calibration.revenuePerVisit}/visit</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="section-doc-quality"
        >
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-1">
            Documentation Quality
          </p>
          <p className="text-sm text-[#666666] mb-5">
            Better notes capture clinical complexity more accurately
          </p>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">+{results.wrvuLift.toFixed(2)}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px]">wRVU lift</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">{formatNumber(Math.round(results.adoptedEncounters))}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px]">encounters analyzed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-[#1A1A1A]">{formatNumber(Math.round(results.additionalWRVUs))}</p>
              <p className="text-[12px] text-[#999999] uppercase tracking-[1px]">additional wRVUs</p>
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
            <p className="text-[12px] text-[#999999]"><sup>3</sup> Attribution range accounts for factors beyond documentation that influence wRVU.</p>
          </div>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          data-testid="section-total"
        >
          <p className="text-[12px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
            Estimated Annual Value
          </p>
          <p className="text-3xl md:text-4xl font-bold text-[#EA2C00] mb-3" data-testid="text-total-value">
            {heroValue}
          </p>
          <div className="text-sm text-[#666666] space-y-1 mb-4">
            <p>Time value: {formatCurrency(adjustedTimeValue)}</p>
            <p>Documentation quality: {formatSmartRange(results.docValueLow, results.docValueHigh)}</p>
          </div>
          <div className="border-t border-[#E5E5E5] pt-4">
            <p className="text-sm text-[#666666]">Per provider: ~{formatCurrency(results.expansion.perProviderValue)}/year</p>
            <p className="text-sm text-[#666666]">Per encounter: ~{formatSmartRange(results.expansion.perEncounterValueLow, results.expansion.perEncounterValueHigh)}</p>
          </div>
        </motion.div>

        <motion.div 
          className="max-w-[480px] mx-auto relative z-10"
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

        <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
          <p className="text-xs text-[#999999] leading-relaxed text-center max-w-2xl mx-auto">
            Projections are modeled estimates based on user-provided inputs, published industry benchmarks, and aggregated deployment experience. Actual results may vary based on implementation approach, provider adoption, organizational factors, and care setting. This does not constitute a guarantee of financial outcomes.
          </p>
        </div>
      </div>
    </div>
  );
}
