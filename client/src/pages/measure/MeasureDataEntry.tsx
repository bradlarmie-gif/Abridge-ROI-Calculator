import { useState } from "react";
import { ArrowRight, Pencil, X, Users, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureState, type MeasureCareSetting, formatNumber } from "@/lib/measureCalculator";

interface MeasureDataEntryProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const CARE_SETTING_LABELS: Record<MeasureCareSetting, string> = {
  outpatient: 'Outpatient',
  ed: 'Emergency Department',
  inpatient: 'Inpatient',
  nursing: 'Nursing',
};

export default function MeasureDataEntry({ 
  state, 
  updateState, 
  onNext, 
  onBack,
  onHome,
}: MeasureDataEntryProps) {
  const [editMode, setEditMode] = useState(true);

  const updateDeployment = <K extends keyof typeof state.deployment>(key: K, value: typeof state.deployment[K]) => {
    updateState({ deployment: { ...state.deployment, [key]: value } });
  };
  
  const updateDocQuality = <K extends keyof typeof state.documentationQuality>(key: K, value: number) => {
    updateState({ documentationQuality: { ...state.documentationQuality, [key]: value } });
  };
  
  const updateTimeEfficiency = <K extends keyof typeof state.timeEfficiency>(key: K, value: number) => {
    updateState({ timeEfficiency: { ...state.timeEfficiency, [key]: value } });
  };

  const updateAllocation = (key: keyof typeof state.allocation, value: number) => {
    updateState({
      allocation: {
        ...state.allocation,
        [key]: Math.max(0, Math.min(100, value)),
      }
    });
  };

  const updateCalibration = <K extends keyof typeof state.calibration>(key: K, value: number) => {
    updateState({ calibration: { ...state.calibration, [key]: value } });
  };

  const hasMinimumData = state.deployment.providers > 0 && state.deployment.totalEncounters > 0;

  const allocationTotal = (state.allocation.hardSavingsPercent ?? 50) + (state.allocation.capacityPercent ?? 20) + (state.allocation.qualityOfLifePercent ?? 30);
  const allocationValid = allocationTotal === 100;

  const orgName = state.deployment.organizationName || 'Your Organization';
  const dynamicSubhead = `${orgName} \u00B7 ${state.deployment.providers} providers \u00B7 ${state.deployment.monthsOnAbridge} months`;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={1}
        totalSteps={5}
        stepName="Your Data"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3" data-testid="text-page-title">
            Your Journey with Abridge
          </h1>
          <p className="text-base text-[#666666]" data-testid="text-dynamic-subhead">
            {editMode 
              ? "Enter your partner's deployment data and before/after metrics."
              : dynamicSubhead
            }
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!editMode ? (
            <motion.div
              key="presentation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="bg-[#F5F0EB] rounded-xl p-6 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-5" data-testid="text-section-deployment">
                  Deployment Summary
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div data-testid="stat-providers">
                    <p className="text-2xl font-bold text-[#1A1A1A]">{state.deployment.providers}</p>
                    <p className="text-[10px] text-[#999999] uppercase tracking-[1px]">providers on Abridge</p>
                  </div>
                  <div data-testid="stat-encounters">
                    <p className="text-2xl font-bold text-[#1A1A1A]">{formatNumber(state.deployment.totalEncounters)}</p>
                    <p className="text-[10px] text-[#999999] uppercase tracking-[1px]">encounters analyzed</p>
                  </div>
                  <div data-testid="stat-adoption">
                    <p className="text-2xl font-bold text-[#1A1A1A]">{state.deployment.utilizationRate}%</p>
                    <p className="text-[10px] text-[#999999] uppercase tracking-[1px]">adoption</p>
                  </div>
                  <div data-testid="stat-months">
                    <p className="text-2xl font-bold text-[#1A1A1A]">{state.deployment.monthsOnAbridge} mo</p>
                    <p className="text-[10px] text-[#999999] uppercase tracking-[1px]">live</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white rounded-xl border border-[#E5E5E5] p-6 mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-5" data-testid="text-section-measured">
                  What We Measured
                </p>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div />
                  <p className="text-[11px] font-semibold text-[#999999] uppercase tracking-[1px] text-right">Before</p>
                  <p className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-[1px] text-right">With Abridge</p>
                </div>

                <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mb-3">
                  Time & Efficiency
                </p>

                <div className="space-y-0">
                  <div className="grid grid-cols-3 gap-4 py-2.5 border-b border-[#F0F0F0]" data-testid="row-time-notes">
                    <p className="text-sm text-[#1A1A1A]">Time in notes</p>
                    <p className="text-sm text-[#999999] text-right">{state.timeEfficiency.timeInNotesWithout} min</p>
                    <p className="text-sm font-semibold text-[#1A1A1A] text-right">{state.timeEfficiency.timeInNotesWith} min</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 py-2.5 border-b border-[#F0F0F0]" data-testid="row-same-day">
                    <p className="text-sm text-[#1A1A1A]">Same-day closure</p>
                    <p className="text-sm text-[#999999] text-right">{state.timeEfficiency.sameDayClosureWithout}%</p>
                    <p className="text-sm font-semibold text-[#1A1A1A] text-right">{state.timeEfficiency.sameDayClosureWith}%</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 py-2.5 border-b border-[#F0F0F0]" data-testid="row-days-close">
                    <p className="text-sm text-[#1A1A1A]">Days to close</p>
                    <p className="text-sm text-[#999999] text-right">{state.timeEfficiency.timeToCloseWithout}</p>
                    <p className="text-sm font-semibold text-[#1A1A1A] text-right">{state.timeEfficiency.timeToCloseWith}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 py-2.5 border-b border-[#F0F0F0]" data-testid="row-after-hours">
                    <p className="text-sm text-[#1A1A1A]">After-hours charting</p>
                    <p className="text-sm text-[#999999] text-right">{state.timeEfficiency.workOutsideWithout.toFixed(1)} hrs/day</p>
                    <p className="text-sm font-semibold text-[#1A1A1A] text-right">{state.timeEfficiency.workOutsideWith.toFixed(1)} hrs/day</p>
                  </div>
                </div>

                <p className="text-[10px] font-semibold text-[#EA2C00] uppercase tracking-[1.5px] mt-6 mb-3">
                  Documentation Quality
                </p>

                <div className="space-y-0">
                  <div className="grid grid-cols-3 gap-4 py-2.5" data-testid="row-wrvu">
                    <p className="text-sm text-[#1A1A1A]">wRVU per encounter</p>
                    <p className="text-sm text-[#999999] text-right">{state.documentationQuality.wrvuWithout.toFixed(2)}</p>
                    <p className="text-sm font-semibold text-[#1A1A1A] text-right">{state.documentationQuality.wrvuWith.toFixed(2)}</p>
                  </div>
                </div>
              </motion.div>

              {state.deployment.totalProviders > state.deployment.providers && (
                <motion.div
                  className="bg-[#F5F0EB] rounded-lg p-4 mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  data-testid="section-expansion-seed"
                >
                  <div className="flex items-start gap-3">
                    <Users className="w-4 h-4 text-[#666666] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#666666] leading-relaxed">
                      {state.deployment.providers} of your {state.deployment.totalProviders} providers are on Abridge today. This analysis covers their {formatNumber(state.deployment.totalEncounters)} encounters.
                    </p>
                  </div>
                </motion.div>
              )}

              <motion.div
                className="flex justify-center mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <button
                  onClick={() => setEditMode(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-[#999999] hover:text-[#666666] transition-colors"
                  data-testid="button-edit-data"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit data
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-[#1A1A1A]">Editing Data</p>
                <button
                  onClick={() => setEditMode(false)}
                  className="inline-flex items-center gap-1.5 text-sm text-[#999999] hover:text-[#666666] transition-colors"
                  data-testid="button-done-editing"
                >
                  <X className="w-3.5 h-3.5" />
                  Done
                </button>
              </div>

              <div className="bg-[#F5F0EB] rounded-lg p-6 space-y-6 mb-6">
                <div>
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
                    Partner Profile
                  </p>
                  <div className="h-px bg-[#E5E5E5] mb-4" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-sm font-medium text-black">Organization Name</label>
                      <input 
                        type="text"
                        value={state.deployment.organizationName}
                        onChange={(e) => updateDeployment('organizationName', e.target.value)}
                        placeholder="e.g., Valley Health System"
                        className="w-full h-10 px-3 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
                        data-testid="input-org-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black">Care Setting</label>
                      <select
                        value={state.careSetting || 'outpatient'}
                        onChange={(e) => updateState({ careSetting: e.target.value as MeasureCareSetting })}
                        className="w-full h-10 px-3 bg-white border border-[#E5E5E5] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
                        data-testid="select-care-setting"
                      >
                        {Object.entries(CARE_SETTING_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black">Providers on Abridge</label>
                      <FormattedNumberInput 
                        value={state.deployment.providers} 
                        onChange={(v) => updateDeployment('providers', v)} 
                        className="h-10 bg-white border-[#E5E5E5] text-right" 
                        data-testid="input-providers" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black">Total Providers</label>
                      <FormattedNumberInput 
                        value={state.deployment.totalProviders} 
                        onChange={(v) => updateDeployment('totalProviders', v)} 
                        className="h-10 bg-white border-[#E5E5E5] text-right" 
                        data-testid="input-total-providers" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black">Months on Abridge</label>
                      <FormattedNumberInput 
                        value={state.deployment.monthsOnAbridge} 
                        onChange={(v) => updateDeployment('monthsOnAbridge', v)} 
                        className="h-10 bg-white border-[#E5E5E5] text-right" 
                        data-testid="input-months" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black">Total Encounters</label>
                      <FormattedNumberInput 
                        value={state.deployment.totalEncounters} 
                        onChange={(v) => updateDeployment('totalEncounters', v)} 
                        className="h-10 bg-white border-[#E5E5E5] text-right" 
                        data-testid="input-total-encounters" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black">Utilization Rate</label>
                      <div className="relative">
                        <FormattedNumberInput 
                          value={state.deployment.utilizationRate} 
                          onChange={(v) => updateDeployment('utilizationRate', v)} 
                          className="h-10 bg-white border-[#E5E5E5] text-right pr-8" 
                          data-testid="input-utilization" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
                    Time & Efficiency
                  </p>
                  <div className="h-px bg-[#E5E5E5] mb-4" />
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div />
                    <div className="text-[11px] font-semibold text-[#888888] text-center uppercase tracking-[1px]">Before</div>
                    <div className="text-[11px] font-semibold text-[#888888] text-center uppercase tracking-[1px]">With Abridge</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center py-2">
                    <label className="text-sm font-medium text-black">Time in Notes (min)</label>
                    <FormattedNumberInput 
                      value={state.timeEfficiency.timeInNotesWithout} 
                      onChange={(v) => updateTimeEfficiency('timeInNotesWithout', v)} 
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-time-without" 
                    />
                    <FormattedNumberInput 
                      value={state.timeEfficiency.timeInNotesWith} 
                      onChange={(v) => updateTimeEfficiency('timeInNotesWith', v)} 
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-time-with" 
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center py-2">
                    <label className="text-sm font-medium text-black">Same-Day Closure (%)</label>
                    <FormattedNumberInput 
                      value={state.timeEfficiency.sameDayClosureWithout} 
                      onChange={(v) => updateTimeEfficiency('sameDayClosureWithout', v)} 
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-closure-without"
                    />
                    <FormattedNumberInput 
                      value={state.timeEfficiency.sameDayClosureWith} 
                      onChange={(v) => updateTimeEfficiency('sameDayClosureWith', v)} 
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-closure-with"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center py-2">
                    <label className="text-sm font-medium text-black">Days to Close</label>
                    <FormattedNumberInput 
                      value={state.timeEfficiency.timeToCloseWithout} 
                      onChange={(v) => updateTimeEfficiency('timeToCloseWithout', v)} 
                      step={0.1}
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-close-without"
                    />
                    <FormattedNumberInput 
                      value={state.timeEfficiency.timeToCloseWith} 
                      onChange={(v) => updateTimeEfficiency('timeToCloseWith', v)} 
                      step={0.1}
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-close-with"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center py-2">
                    <label className="text-sm font-medium text-black">After-Hours (hrs/day)</label>
                    <FormattedNumberInput 
                      value={state.timeEfficiency.workOutsideWithout} 
                      onChange={(v) => updateTimeEfficiency('workOutsideWithout', v)} 
                      step={0.1}
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-pajama-without"
                    />
                    <FormattedNumberInput 
                      value={state.timeEfficiency.workOutsideWith} 
                      onChange={(v) => updateTimeEfficiency('workOutsideWith', v)} 
                      step={0.1}
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-pajama-with"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
                    Documentation Quality
                  </p>
                  <div className="h-px bg-[#E5E5E5] mb-4" />
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div />
                    <div className="text-[11px] font-semibold text-[#888888] text-center uppercase tracking-[1px]">Before</div>
                    <div className="text-[11px] font-semibold text-[#888888] text-center uppercase tracking-[1px]">With Abridge</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center py-2">
                    <label className="text-sm font-medium text-black">wRVU per Encounter</label>
                    <FormattedNumberInput 
                      value={state.documentationQuality.wrvuWithout} 
                      onChange={(v) => updateDocQuality('wrvuWithout', v)} 
                      step={0.01} 
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-wrvu-without" 
                    />
                    <FormattedNumberInput 
                      value={state.documentationQuality.wrvuWith} 
                      onChange={(v) => updateDocQuality('wrvuWith', v)} 
                      step={0.01} 
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-wrvu-with" 
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center py-2">
                    <label className="text-sm font-medium text-black">E/M Level (optional)</label>
                    <FormattedNumberInput 
                      value={state.documentationQuality.emLevelWithout} 
                      onChange={(v) => updateDocQuality('emLevelWithout', v)} 
                      step={0.1} 
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-em-without" 
                    />
                    <FormattedNumberInput 
                      value={state.documentationQuality.emLevelWith} 
                      onChange={(v) => updateDocQuality('emLevelWith', v)} 
                      step={0.1} 
                      className="h-10 bg-white border-[#E5E5E5] text-right" 
                      data-testid="input-em-with" 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-[#E5E5E5] p-6 space-y-5 mb-6">
                <div>
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-0.5">
                    Your Value Model
                  </p>
                  <p className="text-xs text-[#999999] mb-4">
                    Configure once. Applied throughout the analysis.
                  </p>
                  <div className="h-px bg-[#E5E5E5] mb-4" />

                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                    Time Allocation
                  </p>
                  <p className="text-xs text-[#999999] mb-4">
                    How is reclaimed time being used?
                  </p>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 items-end">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-black">Operational Savings</label>
                        <div className="relative">
                          <FormattedNumberInput
                            value={state.allocation.hardSavingsPercent ?? 50}
                            onChange={(v: number) => updateAllocation('hardSavingsPercent', v)}
                            className="h-10 bg-white text-right pr-8"
                            data-testid="input-savings-pct"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">%</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-black">Hourly Rate</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">$</span>
                          <FormattedNumberInput
                            value={state.calibration.otHourlyRate}
                            onChange={(v: number) => updateCalibration('otHourlyRate', v)}
                            className="h-10 bg-white text-right pl-7"
                            data-testid="input-hourly-rate"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-end">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-black">Patient Capacity</label>
                        <div className="relative">
                          <FormattedNumberInput
                            value={state.allocation.capacityPercent ?? 20}
                            onChange={(v: number) => updateAllocation('capacityPercent', v)}
                            className="h-10 bg-white text-right pr-8"
                            data-testid="input-capacity-pct"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">%</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-black">Revenue/Visit</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">$</span>
                          <FormattedNumberInput
                            value={state.calibration.revenuePerVisit}
                            onChange={(v: number) => updateCalibration('revenuePerVisit', v)}
                            className="h-10 bg-white text-right pl-7"
                            data-testid="input-revenue-visit"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-end">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-black">Provider Wellbeing</label>
                        <div className="relative">
                          <FormattedNumberInput
                            value={state.allocation.qualityOfLifePercent ?? 30}
                            onChange={(v: number) => updateAllocation('qualityOfLifePercent', v)}
                            className="h-10 bg-white text-right pr-8"
                            data-testid="input-wellbeing-pct"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">%</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-black">Visit Duration</label>
                        <div className="relative">
                          <FormattedNumberInput
                            value={state.calibration.minutesPerVisit}
                            onChange={(v: number) => updateCalibration('minutesPerVisit', v)}
                            className="h-10 bg-white text-right pr-10"
                            data-testid="input-visit-duration"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">min</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className={`text-xs ${allocationValid ? 'text-green-600' : 'text-red-500'}`} data-testid="text-allocation-check">
                      Must equal 100%: {allocationValid ? '\u2713' : `${allocationTotal}%`}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
                    Documentation Quality
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black">wRVU Attribution</label>
                      <div className="h-10 bg-[#F5F0EB] border border-[#E5E5E5] rounded-md flex items-center px-3 text-sm text-[#666666]">
                        50 \u2013 75%
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-black">wRVU Value</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888] text-sm">$</span>
                        <FormattedNumberInput
                          value={state.calibration.conversionFactor}
                          onChange={(v: number) => updateCalibration('conversionFactor', v)}
                          className="h-10 bg-white text-right pl-7"
                          data-testid="input-wrvu-value"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F5F0EB] rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-[#999999] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-[#666666] leading-relaxed">
                      These values are based on your organization's context. Abridge defaults are shown. Adjust to match your finance team's preferences.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className="max-w-[480px] mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onNext}
            disabled={!hasMinimumData}
            className={`
              w-full h-[52px] font-semibold rounded-lg text-base transition-all duration-200 gap-2
              ${hasMinimumData 
                ? 'bg-[#EA2C00] hover:bg-[#D42800] text-white' 
                : 'bg-[#E0E0E0] text-[#999999] cursor-not-allowed'
              }
            `}
            data-testid="button-see-transformation"
          >
            See What Changed
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
