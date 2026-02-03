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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                step === 2 ? "bg-[#E85A2C] scale-125" : step < 2 ? "bg-[#E85A2C]/40" : "bg-[#D1D5DB]"
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
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
            SAME PROVIDERS. SAME PATIENTS.
          </h1>
          <p className="text-base text-[#6B7280]">
            Enter your before and after metrics. We'll show you what changed.
          </p>
        </motion.div>

        {/* Single Data Entry Card */}
        <motion.div
          className="bg-[#F5F0EB] rounded-xl p-6 space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Section 1: Your Deployment */}
          <div>
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
              YOUR DEPLOYMENT
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#6B7280]">Providers on Abridge</label>
                <FormattedNumberInput 
                  value={state.deployment.providers} 
                  onChange={(v) => updateDeployment('providers', v)} 
                  className="h-10 bg-white border-[#E5E7EB]" 
                  data-testid="input-providers" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#6B7280]">Months on Abridge</label>
                <FormattedNumberInput 
                  value={state.deployment.monthsOnAbridge} 
                  onChange={(v) => updateDeployment('monthsOnAbridge', v)} 
                  className="h-10 bg-white border-[#E5E7EB]" 
                  data-testid="input-months" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#6B7280]">Total Encounters</label>
                <FormattedNumberInput 
                  value={state.deployment.totalEncounters} 
                  onChange={(v) => updateDeployment('totalEncounters', v)} 
                  className="h-10 bg-white border-[#E5E7EB]" 
                  data-testid="input-total-encounters" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#6B7280]">Utilization Rate %</label>
                <FormattedNumberInput 
                  value={state.deployment.utilizationRate} 
                  onChange={(v) => updateDeployment('utilizationRate', v)} 
                  className="h-10 bg-white border-[#E5E7EB]" 
                  data-testid="input-utilization" 
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#E5E7EB]" />

          {/* Section 2: Documentation Quality */}
          <div>
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
              DOCUMENTATION QUALITY
            </p>
            
            {/* Column Headers */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div></div>
              <div className="text-xs font-semibold text-[#888888] text-center uppercase tracking-wide">BEFORE</div>
              <div className="text-xs font-semibold text-[#E85A2C] text-center uppercase tracking-wide">WITH ABRIDGE</div>
            </div>
            
            {/* wRVU row */}
            <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-[#E5E7EB]">
              <label className="text-sm font-medium text-black">wRVU per Encounter</label>
              <FormattedNumberInput 
                value={state.documentationQuality.wrvuWithout} 
                onChange={(v) => updateDocQuality('wrvuWithout', v)} 
                step={0.01} 
                className="h-10 bg-white border-[#E5E7EB]" 
                data-testid="input-wrvu-without" 
              />
              <FormattedNumberInput 
                value={state.documentationQuality.wrvuWith} 
                onChange={(v) => updateDocQuality('wrvuWith', v)} 
                step={0.01} 
                className="h-10 bg-[#FFF5F2] border-[#E85A2C]/20 focus:border-[#E85A2C] focus:ring-[#E85A2C]/20" 
                data-testid="input-wrvu-with" 
              />
            </div>
            
            {/* E/M Level row */}
            <div className="grid grid-cols-3 gap-4 items-center py-3">
              <label className="text-sm font-medium text-black">Avg E/M Level</label>
              <FormattedNumberInput 
                value={state.documentationQuality.emLevelWithout} 
                onChange={(v) => updateDocQuality('emLevelWithout', v)} 
                step={0.1} 
                className="h-10 bg-white border-[#E5E7EB]" 
                data-testid="input-em-without" 
              />
              <FormattedNumberInput 
                value={state.documentationQuality.emLevelWith} 
                onChange={(v) => updateDocQuality('emLevelWith', v)} 
                step={0.1} 
                className="h-10 bg-[#FFF5F2] border-[#E85A2C]/20 focus:border-[#E85A2C] focus:ring-[#E85A2C]/20" 
                data-testid="input-em-with" 
              />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#E5E7EB]" />

          {/* Section 3: Time & Efficiency */}
          <div>
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
              TIME & EFFICIENCY
            </p>
            
            {/* Column Headers */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div></div>
              <div className="text-xs font-semibold text-[#888888] text-center uppercase tracking-wide">BEFORE</div>
              <div className="text-xs font-semibold text-[#E85A2C] text-center uppercase tracking-wide">WITH ABRIDGE</div>
            </div>
            
            {/* Time in Notes */}
            <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-[#E5E7EB]">
              <label className="text-sm font-medium text-black">Time in Notes (min)</label>
              <FormattedNumberInput 
                value={state.timeEfficiency.timeInNotesWithout} 
                onChange={(v) => updateTimeEfficiency('timeInNotesWithout', v)} 
                className="h-10 bg-white border-[#E5E7EB]" 
                data-testid="input-time-without" 
              />
              <FormattedNumberInput 
                value={state.timeEfficiency.timeInNotesWith} 
                onChange={(v) => updateTimeEfficiency('timeInNotesWith', v)} 
                className="h-10 bg-[#FFF5F2] border-[#E85A2C]/20 focus:border-[#E85A2C] focus:ring-[#E85A2C]/20" 
                data-testid="input-time-with" 
              />
            </div>
            
            {/* Same-Day Closure */}
            <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-[#E5E7EB]">
              <label className="text-sm font-medium text-black">Same-Day Closure %</label>
              <FormattedNumberInput 
                value={state.timeEfficiency.sameDayClosureWithout} 
                onChange={(v) => updateTimeEfficiency('sameDayClosureWithout', v)} 
                className="h-10 bg-white border-[#E5E7EB]" 
              />
              <FormattedNumberInput 
                value={state.timeEfficiency.sameDayClosureWith} 
                onChange={(v) => updateTimeEfficiency('sameDayClosureWith', v)} 
                className="h-10 bg-[#FFF5F2] border-[#E85A2C]/20 focus:border-[#E85A2C] focus:ring-[#E85A2C]/20" 
              />
            </div>
            
            {/* Work Outside Hours */}
            <div className="grid grid-cols-3 gap-4 items-center py-3">
              <label className="text-sm font-medium text-black">Pajama Time (hrs/day)</label>
              <FormattedNumberInput 
                value={state.timeEfficiency.workOutsideWithout} 
                onChange={(v) => updateTimeEfficiency('workOutsideWithout', v)} 
                step={0.1}
                className="h-10 bg-white border-[#E5E7EB]" 
              />
              <FormattedNumberInput 
                value={state.timeEfficiency.workOutsideWith} 
                onChange={(v) => updateTimeEfficiency('workOutsideWith', v)} 
                step={0.1}
                className="h-10 bg-[#FFF5F2] border-[#E85A2C]/20 focus:border-[#E85A2C] focus:ring-[#E85A2C]/20" 
              />
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div 
          className="flex justify-between items-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <Button
            onClick={onNext}
            disabled={!hasMinimumData}
            className={`
              h-11 px-6 font-semibold rounded-full transition-all duration-200 gap-2
              ${hasMinimumData 
                ? 'bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white' 
                : 'bg-[#E5E7EB] text-[#888888] cursor-not-allowed'
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
