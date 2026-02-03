import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureState } from "@/lib/measureCalculator";

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

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={2}
        totalSteps={5}
        stepName="Your Data"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all ${
                step <= 2 ? "bg-[#E85A2C]" : "bg-[#D1D5DB]"
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2 uppercase tracking-tight">
            Your Data
          </h1>
          <p className="text-base text-[#888888]">
            Enter your before and after metrics.
          </p>
        </motion.div>

        {/* Single Data Entry Card */}
        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Section 1: Your Deployment */}
          <div>
            <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
              YOUR DEPLOYMENT
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

          {/* Section 2: Time & Efficiency */}
          <div>
            <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
              TIME & EFFICIENCY
            </p>
            <div className="h-px bg-[#E5E5E5] mb-4" />
            
            {/* Column Headers */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div></div>
              <div className="text-[11px] font-semibold text-[#888888] text-center uppercase tracking-[1px]">BEFORE</div>
              <div className="text-[11px] font-semibold text-[#888888] text-center uppercase tracking-[1px]">AFTER</div>
            </div>
            
            {/* Time in Notes */}
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
                className="h-10 bg-[#F5F0EB] border-[#E5E5E5] text-right" 
                data-testid="input-time-with" 
              />
            </div>
            
            {/* Same-Day Closure */}
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
                className="h-10 bg-[#F5F0EB] border-[#E5E5E5] text-right" 
                data-testid="input-closure-with"
              />
            </div>
            
            {/* Pajama Time */}
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
                className="h-10 bg-[#F5F0EB] border-[#E5E5E5] text-right" 
                data-testid="input-pajama-with"
              />
            </div>
          </div>

          {/* Section 3: Documentation Quality */}
          <div>
            <p className="text-[11px] font-medium text-[#888888] uppercase tracking-[1.5px] mb-1">
              DOCUMENTATION QUALITY
            </p>
            <div className="h-px bg-[#E5E5E5] mb-4" />
            
            {/* Column Headers */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div></div>
              <div className="text-[11px] font-semibold text-[#888888] text-center uppercase tracking-[1px]">BEFORE</div>
              <div className="text-[11px] font-semibold text-[#888888] text-center uppercase tracking-[1px]">AFTER</div>
            </div>
            
            {/* wRVU row */}
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
                className="h-10 bg-[#F5F0EB] border-[#E5E5E5] text-right" 
                data-testid="input-wrvu-with" 
              />
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div 
          className="flex justify-center mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onNext}
            disabled={!hasMinimumData}
            className={`
              h-11 px-8 font-medium rounded-md transition-all duration-200 gap-2
              ${hasMinimumData 
                ? 'bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white' 
                : 'bg-[#E5E5E5] text-[#888888] cursor-not-allowed'
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
