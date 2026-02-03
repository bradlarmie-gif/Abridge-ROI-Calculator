import { useMemo } from "react";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState } from "./ExploreFlow";

interface ExploreValueDriversProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  totalHoursSaved: number;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function ExploreValueDrivers({
  state,
  updateState,
  totalHoursSaved,
  onNext,
  onBack,
  onHome,
}: ExploreValueDriversProps) {
  const { timeDriverInputs } = state;
  
  const updateTimeDriverInputs = (updates: Partial<typeof timeDriverInputs>) => {
    updateState({
      timeDriverInputs: { ...timeDriverInputs, ...updates }
    });
  };

  // Calculations
  const hoursTowardCapacity = useMemo(() => {
    return Math.round(totalHoursSaved * (timeDriverInputs.capacityPercent / 100));
  }, [totalHoursSaved, timeDriverInputs.capacityPercent]);

  const potentialVisits = useMemo(() => {
    return Math.round(hoursTowardCapacity * (60 / timeDriverInputs.visitDuration));
  }, [hoursTowardCapacity, timeDriverInputs.visitDuration]);

  const potentialRevenue = useMemo(() => {
    return potentialVisits * timeDriverInputs.revenuePerVisit;
  }, [potentialVisits, timeDriverInputs.revenuePerVisit]);

  const hoursPerProviderPerWeek = useMemo(() => {
    return state.numberOfProviders > 0 
      ? (totalHoursSaved / state.numberOfProviders / 52).toFixed(1)
      : '0';
  }, [totalHoursSaved, state.numberOfProviders]);

  const formatCurrency = (n: number) => '$' + n.toLocaleString();
  const formatNumber = (n: number) => n.toLocaleString();

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={4}
        totalSteps={7}
        stepName="Value Drivers"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5, 6, 7].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all ${
                step <= 4 ? "bg-[#E85A2C]" : "bg-[#D1D5DB]"
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <motion.div 
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 uppercase tracking-tight">
            What Could That Time Be Worth?
          </h1>
          <p className="text-base text-[#888888]">
            Your providers could reclaim <strong className="text-black">{formatNumber(totalHoursSaved)} hours</strong>. 
            Different organizations use that time in different ways.
          </p>
        </motion.div>

        {/* How to Use This Section */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-5 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            How to Use This Section
          </p>
          <p className="text-sm text-black leading-relaxed">
            We can't tell you exactly how your organization will use reclaimed time. 
            But we can help you model different scenarios.
          </p>
          <p className="text-sm text-[#888888] mt-2">
            Engage with the drivers that are relevant to your situation. Skip the ones that aren't.
          </p>
        </motion.div>

        {/* Patient Access Toggle */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={() => updateTimeDriverInputs({ patientAccessEnabled: !timeDriverInputs.patientAccessEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              timeDriverInputs.patientAccessEnabled 
                ? "bg-white border border-[#E5E5E5] border-l-4 border-l-[#E85A2C]" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
            data-testid="toggle-patient-access"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">Patient Access</p>
                <p className="text-sm text-[#888888]">If providers use time to see more patients</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                timeDriverInputs.patientAccessEnabled ? 'bg-[#E85A2C]' : 'bg-[#D1D5DB]'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  timeDriverInputs.patientAccessEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {timeDriverInputs.patientAccessEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg p-5 border-l-4 border-l-[#E85A2C]">
                  <p className="text-sm text-black mb-4">
                    What percentage of reclaimed time could go toward patient care?
                  </p>

                  <div className="mb-4">
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={timeDriverInputs.capacityPercent}
                      onChange={(e) => updateTimeDriverInputs({ capacityPercent: Number(e.target.value) })}
                      className="w-full accent-[#E85A2C] h-2"
                      data-testid="slider-capacity"
                    />
                    <div className="flex justify-between text-xs text-[#888888] mt-1">
                      <span>0%</span>
                      <span className="text-base font-semibold text-black">{timeDriverInputs.capacityPercent}%</span>
                      <span>50%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <label className="text-sm text-[#888888]">Average visit duration</label>
                      <div className="relative">
                        <FormattedNumberInput
                          value={timeDriverInputs.visitDuration}
                          onChange={(v: number) => updateTimeDriverInputs({ visitDuration: v })}
                          className="h-10 bg-white pr-12"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">min</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm text-[#888888]">Revenue per visit</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                        <FormattedNumberInput
                          value={timeDriverInputs.revenuePerVisit}
                          onChange={(v: number) => updateTimeDriverInputs({ revenuePerVisit: v })}
                          className="h-10 bg-white pl-7"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F5F0EB] rounded-lg p-4">
                    <p className="text-sm text-[#888888] mb-2">At {timeDriverInputs.capacityPercent}% of time toward capacity:</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Hours toward patient care:</span>
                        <span className="font-semibold text-black">{formatNumber(hoursTowardCapacity)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Potential additional visits:</span>
                        <span className="font-semibold text-black">{formatNumber(potentialVisits)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#666666]">Potential revenue:</span>
                        <span className="font-bold text-[#E85A2C]">{formatCurrency(potentialRevenue)}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 mt-3 text-xs text-[#888888]">
                      <AlertTriangle className="w-4 h-4 text-[#E85A2C] flex-shrink-0 mt-0.5" />
                      <span>This assumes available demand and schedulable time.</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Cost Reduction Toggle */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => updateTimeDriverInputs({ costReductionEnabled: !timeDriverInputs.costReductionEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              timeDriverInputs.costReductionEnabled 
                ? "bg-white border border-[#E5E5E5] border-l-4 border-l-[#E85A2C]" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
            data-testid="toggle-cost-reduction"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">Cost Reduction</p>
                <p className="text-sm text-[#888888]">If time reduces overtime, locums, or other costs</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                timeDriverInputs.costReductionEnabled ? 'bg-[#E85A2C]' : 'bg-[#D1D5DB]'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  timeDriverInputs.costReductionEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {timeDriverInputs.costReductionEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg p-5 border-l-4 border-l-[#E85A2C]">
                  <p className="text-sm text-black mb-3">
                    We can't calculate your cost reduction — every organization is different. 
                    But if you have an estimate, enter it here.
                  </p>

                  <div className="space-y-1.5 mb-3">
                    <label className="text-sm text-[#888888]">Estimated annual cost reduction from reclaimed time:</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#888888]">$</span>
                      <FormattedNumberInput
                        value={timeDriverInputs.estimatedCostReduction}
                        onChange={(v: number) => updateTimeDriverInputs({ estimatedCostReduction: v })}
                        className="h-11 bg-white pl-7"
                        data-testid="input-cost-reduction"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-[#888888]">
                    Common sources: Reduced overtime, fewer locums, deferred hiring
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Clinician Wellbeing Toggle */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <button
            onClick={() => updateTimeDriverInputs({ wellbeingEnabled: !timeDriverInputs.wellbeingEnabled })}
            className={`w-full p-4 rounded-lg text-left transition-all ${
              timeDriverInputs.wellbeingEnabled 
                ? "bg-white border border-[#E5E5E5] border-l-4 border-l-[#E85A2C]" 
                : "bg-white border border-[#E5E5E5] hover:border-[#D1D5DB]"
            }`}
            data-testid="toggle-wellbeing"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">Clinician Wellbeing</p>
                <p className="text-sm text-[#888888]">If time improves work-life balance and retention</p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-all ${
                timeDriverInputs.wellbeingEnabled ? 'bg-[#E85A2C]' : 'bg-[#D1D5DB]'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
                  timeDriverInputs.wellbeingEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </div>
            </div>
          </button>

          <AnimatePresence>
            {timeDriverInputs.wellbeingEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-white border border-t-0 border-[#E5E5E5] rounded-b-lg p-5 border-l-4 border-l-[#E85A2C]">
                  <p className="text-sm text-[#888888] mb-3">Your providers would get back:</p>

                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-[#E85A2C]">{hoursPerProviderPerWeek} hours per week</p>
                    <p className="text-sm text-[#888888]">per provider</p>
                  </div>

                  <div className="h-px bg-[#E5E5E5] my-4" />

                  <p className="text-sm text-black mb-3">
                    We don't assign a dollar value to this.
                  </p>

                  <p className="text-sm text-[#888888] mb-2">But consider:</p>
                  <ul className="text-sm text-[#666666] space-y-1 mb-3">
                    <li>• Documentation burden is the #1 driver of burnout</li>
                    <li>• Burnout is the #1 reason physicians leave</li>
                    <li>• Cost to replace one provider: <strong className="text-black">$300K–$500K</strong></li>
                  </ul>

                  <p className="text-sm text-black italic">
                    If Abridge helps retain even one provider who would have left, that's the value.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Time Value Summary */}
        <motion.div
          className="bg-white rounded-lg border border-[#E5E5E5] p-5 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-3">
            Time Value Summary
          </p>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#666666]">Hours reclaimed:</span>
              <span className="font-semibold text-black">{formatNumber(totalHoursSaved)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#666666]">Patient Access:</span>
              <span className="font-semibold text-black">
                {timeDriverInputs.patientAccessEnabled ? formatCurrency(potentialRevenue) : '—'}
              </span>
            </div>
            {timeDriverInputs.patientAccessEnabled && (
              <p className="text-xs text-[#888888] text-right">(if {timeDriverInputs.capacityPercent}% to capacity)</p>
            )}

            <div className="flex justify-between">
              <span className="text-[#666666]">Cost Reduction:</span>
              <span className="font-semibold text-black">
                {timeDriverInputs.costReductionEnabled && timeDriverInputs.estimatedCostReduction > 0 ? formatCurrency(timeDriverInputs.estimatedCostReduction) : '—'}
              </span>
            </div>
            {!timeDriverInputs.costReductionEnabled && (
              <p className="text-xs text-[#888888] text-right">(no estimate provided)</p>
            )}

            <div className="flex justify-between">
              <span className="text-[#666666]">Wellbeing:</span>
              <span className="font-semibold text-black">
                {timeDriverInputs.wellbeingEnabled ? `${hoursPerProviderPerWeek} hrs/wk back` : '—'}
              </span>
            </div>
            {timeDriverInputs.wellbeingEnabled && (
              <p className="text-xs text-[#888888] text-right">(qualitative)</p>
            )}
          </div>
        </motion.div>

        {/* Continue Button */}
        <motion.div 
          className="flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <Button
            onClick={onNext}
            className="h-11 px-8 bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white font-medium rounded-md gap-2"
            data-testid="button-continue"
          >
            Continue to Documentation Quality
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-[#888888]">
            You can skip documentation drivers if not relevant
          </p>
        </motion.div>
      </div>
    </div>
  );
}
