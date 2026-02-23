import { useState, useMemo, useCallback } from "react";
import { ArrowRight, TrendingUp, Users, Info, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
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
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

function InlineEdit({ 
  value, 
  onChange, 
  suffix, 
  min, 
  max,
  testId,
}: { 
  value: number; 
  onChange: (v: number) => void; 
  suffix: string; 
  min: number; 
  max: number;
  testId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = useCallback(() => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(clamped);
      setDraft(String(clamped));
    } else {
      setDraft(String(value));
    }
    setEditing(false);
  }, [draft, min, max, onChange, value]);

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
          className="w-[72px] bg-white border border-[#EA2C00] rounded-md px-2 py-0.5 text-sm font-semibold text-[#1A1A1A] text-center outline-none focus:ring-2 focus:ring-[#EA2C00]/20"
          min={min}
          max={max}
          autoFocus
          data-testid={testId}
        />
        <span className="text-sm font-semibold text-[#EA2C00]">{suffix}</span>
      </span>
    );
  }

  return (
    <button
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className="inline-flex items-center gap-1.5 group cursor-pointer"
      data-testid={`${testId}-trigger`}
    >
      <span className="text-sm font-semibold text-[#EA2C00] border-b border-dashed border-[#EA2C00]/40 group-hover:border-[#EA2C00] transition-colors">
        {value}{suffix}
      </span>
      <Pencil className="w-3 h-3 text-[#EA2C00]/50 group-hover:text-[#EA2C00] transition-colors" />
    </button>
  );
}

export default function MeasureOpportunity({ 
  state, 
  updateState,
  onNext, 
  onBack,
  onHome,
}: MeasureOpportunityProps) {
  const careSetting = state.careSetting || "outpatient";
  const isInpatient = careSetting === "inpatient";
  const isED = careSetting === "ed";
  const isNursing = careSetting === "nursing";

  const providerLabel = isNursing ? "nurses" : "providers";
  const providerLabelSingular = isNursing ? "nurse" : "provider";
  const encounterLabel = isInpatient ? "discharges" : isNursing ? "shifts" : "encounters";

  const defaultTargetAdoption = 80;
  const defaultTargetProviders = state.deployment.totalProviders || state.deployment.providers;

  const [targetAdoption, setTargetAdoption] = useState(
    state.expansionTargets?.targetAdoption ?? defaultTargetAdoption
  );
  const [targetProviders, setTargetProviders] = useState(
    state.expansionTargets?.targetProviders ?? defaultTargetProviders
  );

  const handleAdoptionChange = useCallback((v: number) => {
    setTargetAdoption(v);
    updateState({ expansionTargets: { targetAdoption: v, targetProviders } });
  }, [updateState, targetProviders]);

  const handleProvidersChange = useCallback((v: number) => {
    setTargetProviders(v);
    updateState({ expansionTargets: { targetAdoption, targetProviders: v } });
  }, [updateState, targetAdoption]);

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

      const drgLow = cmiDelta * deployment.totalEncounters * cmiPointValue * 0.70;
      const drgHigh = cmiDelta * deployment.totalEncounters * cmiPointValue * 0.85;
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

      totalValueLow = timeSubtotal + lwbsValue + emLevelValue * 0.70;
      totalValueHigh = timeSubtotal + lwbsValue + emLevelValue * 0.85;
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
      const docValueLow = wrvuLift * documentedEncounters * calibration.conversionFactor * 0.70;
      const docValueHigh = wrvuLift * documentedEncounters * calibration.conversionFactor * 0.85;

      totalValueLow = timeValueSubtotal + docValueLow;
      totalValueHigh = timeValueSubtotal + docValueHigh;
    }

    const expansion = calculateExpansionResults(
      state, totalValueLow, totalValueHigh, totalHoursSaved,
      targetAdoption, targetProviders
    );

    return {
      totalHoursSaved,
      totalValueLow,
      totalValueHigh,
      timeSavedPerNote,
      expansion,
    };
  }, [state, careSetting, targetAdoption, targetProviders]);

  const { expansion } = calc;

  const adoptionAlreadyHigh = state.deployment.utilizationRate >= targetAdoption;
  const canDeepen = !adoptionAlreadyHigh;
  const additionalProviders = expansion.remainingProviders;
  const canExpand = additionalProviders > 0;

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
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            The Opportunity Ahead
          </h1>
          <p className="text-base text-[#666666] max-w-lg mx-auto" data-testid="text-page-subtitle">
            You've demonstrated the model with {state.deployment.providers} {providerLabel}. Here's what your data suggests about what's next.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 md:p-8 mb-6"
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
          <div className="flex flex-wrap items-baseline gap-x-1.5 mb-6">
            <span className="text-sm text-[#666666]">
              Increase adoption within your current {state.deployment.providers} {providerLabel} to
            </span>
            <InlineEdit
              value={targetAdoption}
              onChange={handleAdoptionChange}
              suffix="% adoption"
              min={Math.max(state.deployment.utilizationRate + 1, 10)}
              max={100}
              testId="input-target-adoption"
            />
          </div>

          <div className="bg-[#F5F0EB] rounded-lg p-5 mb-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold text-[#999999] uppercase tracking-[1px] mb-2">Today</p>
                <p className="text-sm text-[#666666]">{state.deployment.utilizationRate}% adoption</p>
                <p className="text-sm text-[#666666]">{formatNumber(expansion.currentAdoptedEncounters)} {encounterLabel}</p>
                <p className="text-sm text-[#666666]">{formatNumber(Math.round(calc.totalHoursSaved))} hours saved</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1px] mb-2">
                  At {targetAdoption}% Adoption
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={targetAdoption}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm font-medium text-[#1A1A1A]">{targetAdoption}% adoption</p>
                    <p className="text-sm font-medium text-[#1A1A1A]">{formatNumber(expansion.deepenEncounters)} {encounterLabel}</p>
                    <p className="text-sm font-medium text-[#1A1A1A]">{formatNumber(Math.round(expansion.deepenHoursSaved))} hours saved</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {canDeepen && (
              <div className="border-t border-[#E5E5E5] mt-4 pt-4">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={expansion.deepenAdditionalValue}
                    className="text-base font-bold text-[#EA2C00]"
                    data-testid="text-deepen-value"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    Additional value from adoption alone: +{formatCurrency(expansion.deepenAdditionalValue)}/year
                  </motion.p>
                </AnimatePresence>
                <p className="text-xs text-[#666666] mt-1">
                  No additional investment required.
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-[#666666]">
            This is your immediate opportunity. Moving from {state.deployment.utilizationRate}% to {targetAdoption}% adoption captures more value from {providerLabel} who already have access to Abridge.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-xl border border-[#E5E5E5] p-6 md:p-8 mb-6"
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
          <div className="flex flex-wrap items-baseline gap-x-1.5 mb-6">
            <span className="text-sm text-[#666666]">
              Bring Abridge to
            </span>
            <InlineEdit
              value={targetProviders}
              onChange={handleProvidersChange}
              suffix={` ${providerLabel}`}
              min={state.deployment.providers + 1}
              max={10000}
              testId="input-target-providers"
            />
            <span className="text-sm text-[#666666]">
              across your organization
            </span>
          </div>

          <div className="bg-[#F5F0EB] rounded-lg p-5 mb-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-semibold text-[#999999] uppercase tracking-[1px] mb-2">Today</p>
                <p className="text-sm text-[#666666]">{state.deployment.providers} {providerLabel}</p>
                <p className="text-sm text-[#666666]">{formatSmartRange(calc.totalValueLow, calc.totalValueHigh)}/year</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1px] mb-2">
                  At {expansion.expandProviders} {isNursing ? "Nurses" : "Providers"}
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={targetProviders}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm font-medium text-[#1A1A1A]">{expansion.expandProviders} {providerLabel}</p>
                    <p className="text-sm font-medium text-[#1A1A1A]">{formatSmartRange(expansion.expandValueLow, expansion.expandValueHigh)}/year</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <p className="text-xs text-[#666666] mt-4 pt-3 border-t border-[#E5E5E5]">
              At {formatCurrency(expansion.perProviderValue)} per {providerLabelSingular}, each additional {providerLabelSingular} added represents meaningful incremental value.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <AnimatePresence mode="wait">
                <motion.p
                  key={expansion.perProviderValue}
                  className="text-xl font-bold text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {formatCurrency(expansion.perProviderValue)}
                </motion.p>
              </AnimatePresence>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">value per {providerLabelSingular}/year</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <p className="text-xl font-bold text-white">{Math.round(expansion.hoursPerProvider)} hrs</p>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">saved per {providerLabelSingular}/{state.deployment.monthsOnAbridge} mo</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <AnimatePresence mode="wait">
                <motion.p
                  key={expansion.remainingProviders}
                  className="text-xl font-bold text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {expansion.remainingProviders}
                </motion.p>
              </AnimatePresence>
              <p className="text-[10px] text-[#999999] uppercase tracking-[1px] mt-1">not yet on Abridge of {targetProviders} total</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-[#1A1A1A] rounded-xl p-6 md:p-8 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          data-testid="section-combined"
        >
          <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-6">
            Your Combined Opportunity
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#2A2A2A] rounded-lg p-5">
              <p className="text-[10px] font-semibold text-[#999999] uppercase tracking-[1px] mb-3">Today</p>
              <p className="text-sm text-[#AAAAAA] mb-1">{state.deployment.providers} {providerLabel}</p>
              <p className="text-sm text-[#AAAAAA] mb-3">{state.deployment.utilizationRate}% adoption</p>
              <p className="text-2xl font-bold text-white" data-testid="text-today-value">
                {formatSmartRange(calc.totalValueLow, calc.totalValueHigh)}
              </p>
            </div>
            <div className="bg-[#2A2A2A] rounded-lg p-5 border border-[#EA2C00]/30">
              <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1px] mb-3">With Deeper + Wider Adoption</p>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${targetAdoption}-${targetProviders}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="text-sm text-[#AAAAAA] mb-1">{expansion.combinedProviders} {providerLabel}</p>
                  <p className="text-sm text-[#AAAAAA] mb-3">{targetAdoption}% adoption</p>
                  <p className="text-2xl font-bold text-[#EA2C00]" data-testid="text-combined-value">
                    {formatSmartRange(expansion.combinedValueLow, expansion.combinedValueHigh)}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-[#333333]">
            <p className="text-xs text-[#999999] leading-relaxed">
              Unlike programs that scale linearly with headcount, AI documentation cost per {providerLabelSingular} decreases as adoption grows, while value per {isInpatient ? "discharge" : isNursing ? "shift" : "encounter"} remains consistent.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mb-8"
        >
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#999999] mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-[#999999] leading-relaxed">
              Projections assume current time savings ({calc.timeSavedPerNote} min/{isNursing ? "shift" : isInpatient ? "discharge" : "encounter"}), adoption rates, and {isInpatient ? "documentation" : isED ? "throughput" : isNursing ? "efficiency" : "wRVU"} improvements continue. Deeper adoption assumes {targetAdoption}% utilization. Expansion assumes same per-{providerLabelSingular} economics. Click the highlighted values above to customize your targets.
            </p>
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
            className="w-full h-[52px] bg-[#EA2C00] hover:bg-[#D42800] text-white font-semibold rounded-full text-base gap-2"
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
