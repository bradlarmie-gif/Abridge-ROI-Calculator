import { useState } from "react";
import { ArrowRight, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureState, formatNumber } from "@/lib/measureCalculator";

interface MeasureDataEntryProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureDataEntry({ 
  state, 
  updateState, 
  onNext, 
  onBack,
  onHome,
}: MeasureDataEntryProps) {
  const [editMode, setEditMode] = useState(false);

  const updateDeployment = <K extends keyof typeof state.deployment>(key: K, value: number) => {
    updateState({ deployment: { ...state.deployment, [key]: value } });
  };
  
  const updateDocQuality = <K extends keyof typeof state.documentationQuality>(key: K, value: number) => {
    updateState({ documentationQuality: { ...state.documentationQuality, [key]: value } });
  };
  
  const updateTimeEfficiency = <K extends keyof typeof state.timeEfficiency>(key: K, value: number) => {
    updateState({ timeEfficiency: { ...state.timeEfficiency, [key]: value } });
  };

  const hasMinimumData = state.deployment.providers > 0 && state.deployment.totalEncounters > 0;

  const dynamicSubhead = `${state.deployment.providers} providers. ${formatNumber(state.deployment.totalEncounters)} encounters. ${state.deployment.monthsOnAbridge} months of partnership.`;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={2}
        totalSteps={5}
        stepName="Your Journey"
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
            {dynamicSubhead}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!editMode ? (
            <motion.div
              key="profile"
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
                  Your Deployment
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div data-testid="stat-providers">
                    <p className="text-2xl font-bold text-[#1A1A1A]">{state.deployment.providers}</p>
                    <p className="text-[10px] text-[#999999] uppercase tracking-[1px]">providers</p>
                  </div>
                  <div data-testid="stat-encounters">
                    <p className="text-2xl font-bold text-[#1A1A1A]">{formatNumber(state.deployment.totalEncounters)}</p>
                    <p className="text-[10px] text-[#999999] uppercase tracking-[1px]">encounters</p>
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

              <motion.div
                className="flex justify-center mb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
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
                    Your Deployment
                  </p>
                  <div className="h-px bg-[#E5E5E5] mb-4" />
                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="text-[11px] font-semibold text-[#888888] text-center uppercase tracking-[1px]">After</div>
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
                    <label className="text-sm font-medium text-black">Pajama Time (hrs/day)</label>
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
                    <div className="text-[11px] font-semibold text-[#888888] text-center uppercase tracking-[1px]">After</div>
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
