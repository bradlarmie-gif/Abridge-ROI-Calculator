import { useState } from "react";
import { ArrowRight, Users, FileText, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
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
  const [expandedSection, setExpandedSection] = useState<string | null>('deployment');

  const updateDeployment = <K extends keyof typeof state.deployment>(key: K, value: number) => {
    updateState({ deployment: { ...state.deployment, [key]: value } });
  };
  
  const updateDocQuality = <K extends keyof typeof state.documentationQuality>(key: K, value: number) => {
    updateState({ documentationQuality: { ...state.documentationQuality, [key]: value } });
  };
  
  const updateTimeEfficiency = <K extends keyof typeof state.timeEfficiency>(key: K, value: number) => {
    updateState({ timeEfficiency: { ...state.timeEfficiency, [key]: value } });
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
            The Natural Experiment
          </p>

          <h1 className="text-2xl md:text-3xl font-bold text-black mb-3">
            Same Providers. Same Patients.
          </h1>

          <p className="text-slate-600">
            Enter your before and after metrics. We'll show you what changed.
          </p>
        </motion.div>

        <div className="space-y-4">
          {/* Deployment Section */}
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <button
              onClick={() => toggleSection('deployment')}
              className="w-full flex items-center justify-between p-5 text-left"
              data-testid="button-toggle-deployment"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#EA2C00]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-black">Your Deployment</h3>
                  <p className="text-sm text-slate-500">Who's using Abridge</p>
                </div>
              </div>
              {expandedSection === 'deployment' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            <AnimatePresence>
              {expandedSection === 'deployment' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 border-t border-slate-100 pt-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Providers on Abridge</label>
                        <FormattedNumberInput 
                          value={state.deployment.providers} 
                          onChange={(v) => updateDeployment('providers', v)} 
                          className="h-11 bg-white border-slate-200" 
                          data-testid="input-providers" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Months on Abridge</label>
                        <FormattedNumberInput 
                          value={state.deployment.monthsOnAbridge} 
                          onChange={(v) => updateDeployment('monthsOnAbridge', v)} 
                          className="h-11 bg-white border-slate-200" 
                          data-testid="input-months" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Total Encounters</label>
                        <FormattedNumberInput 
                          value={state.deployment.totalEncounters} 
                          onChange={(v) => updateDeployment('totalEncounters', v)} 
                          className="h-11 bg-white border-slate-200" 
                          data-testid="input-total-encounters" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Utilization Rate %</label>
                        <FormattedNumberInput 
                          value={state.deployment.utilizationRate} 
                          onChange={(v) => updateDeployment('utilizationRate', v)} 
                          className="h-11 bg-white border-slate-200" 
                          data-testid="input-utilization" 
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Documentation Quality Section */}
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <button
              onClick={() => toggleSection('documentation')}
              className="w-full flex items-center justify-between p-5 text-left"
              data-testid="button-toggle-documentation"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#EA2C00]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-black">Documentation Quality</h3>
                  <p className="text-sm text-slate-500">Complexity you're capturing</p>
                </div>
              </div>
              {expandedSection === 'documentation' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            <AnimatePresence>
              {expandedSection === 'documentation' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 border-t border-slate-100 pt-5">
                    {/* Header row */}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div></div>
                      <div className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wide">Without</div>
                      <div className="text-xs font-semibold text-[#EA2C00] text-center uppercase tracking-wide">With Abridge</div>
                    </div>
                    
                    {/* wRVU row */}
                    <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-slate-100">
                      <label className="text-sm font-medium text-slate-700">wRVU per Encounter</label>
                      <FormattedNumberInput 
                        value={state.documentationQuality.wrvuWithout} 
                        onChange={(v) => updateDocQuality('wrvuWithout', v)} 
                        step={0.01} 
                        className="h-10 bg-slate-50 border-slate-200" 
                        data-testid="input-wrvu-without" 
                      />
                      <FormattedNumberInput 
                        value={state.documentationQuality.wrvuWith} 
                        onChange={(v) => updateDocQuality('wrvuWith', v)} 
                        step={0.01} 
                        className="h-10 bg-[#FFF5F2] border-[#EA2C00]/20 focus:border-[#EA2C00] focus:ring-[#EA2C00]/20" 
                        data-testid="input-wrvu-with" 
                      />
                    </div>
                    
                    {/* E/M Level row */}
                    <div className="grid grid-cols-3 gap-4 items-center py-3">
                      <label className="text-sm font-medium text-slate-700">Avg E/M Level</label>
                      <FormattedNumberInput 
                        value={state.documentationQuality.emLevelWithout} 
                        onChange={(v) => updateDocQuality('emLevelWithout', v)} 
                        step={0.1} 
                        className="h-10 bg-slate-50 border-slate-200" 
                        data-testid="input-em-without" 
                      />
                      <FormattedNumberInput 
                        value={state.documentationQuality.emLevelWith} 
                        onChange={(v) => updateDocQuality('emLevelWith', v)} 
                        step={0.1} 
                        className="h-10 bg-[#FFF5F2] border-[#EA2C00]/20 focus:border-[#EA2C00] focus:ring-[#EA2C00]/20" 
                        data-testid="input-em-with" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Time & Efficiency Section */}
          <motion.div
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={() => toggleSection('time')}
              className="w-full flex items-center justify-between p-5 text-left"
              data-testid="button-toggle-time"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF5F2] flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#EA2C00]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-black">Time & Efficiency</h3>
                  <p className="text-sm text-slate-500">Where the hours went</p>
                </div>
              </div>
              {expandedSection === 'time' ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            <AnimatePresence>
              {expandedSection === 'time' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 border-t border-slate-100 pt-5">
                    {/* Header row */}
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div></div>
                      <div className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wide">Without</div>
                      <div className="text-xs font-semibold text-[#EA2C00] text-center uppercase tracking-wide">With Abridge</div>
                    </div>
                    
                    {/* Time in Notes */}
                    <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-slate-100">
                      <label className="text-sm font-medium text-slate-700">Time in Notes (min)</label>
                      <FormattedNumberInput 
                        value={state.timeEfficiency.timeInNotesWithout} 
                        onChange={(v) => updateTimeEfficiency('timeInNotesWithout', v)} 
                        className="h-10 bg-slate-50 border-slate-200" 
                        data-testid="input-time-without" 
                      />
                      <FormattedNumberInput 
                        value={state.timeEfficiency.timeInNotesWith} 
                        onChange={(v) => updateTimeEfficiency('timeInNotesWith', v)} 
                        className="h-10 bg-[#FFF5F2] border-[#EA2C00]/20 focus:border-[#EA2C00] focus:ring-[#EA2C00]/20" 
                        data-testid="input-time-with" 
                      />
                    </div>
                    
                    {/* Same-Day Closure */}
                    <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-slate-100">
                      <label className="text-sm font-medium text-slate-700">Same-Day Closure %</label>
                      <FormattedNumberInput 
                        value={state.timeEfficiency.sameDayClosureWithout} 
                        onChange={(v) => updateTimeEfficiency('sameDayClosureWithout', v)} 
                        className="h-10 bg-slate-50 border-slate-200" 
                      />
                      <FormattedNumberInput 
                        value={state.timeEfficiency.sameDayClosureWith} 
                        onChange={(v) => updateTimeEfficiency('sameDayClosureWith', v)} 
                        className="h-10 bg-[#FFF5F2] border-[#EA2C00]/20 focus:border-[#EA2C00] focus:ring-[#EA2C00]/20" 
                      />
                    </div>
                    
                    {/* Work Outside Hours */}
                    <div className="grid grid-cols-3 gap-4 items-center py-3">
                      <label className="text-sm font-medium text-slate-700">Pajama Time (hrs/day)</label>
                      <FormattedNumberInput 
                        value={state.timeEfficiency.workOutsideWithout} 
                        onChange={(v) => updateTimeEfficiency('workOutsideWithout', v)} 
                        step={0.1}
                        className="h-10 bg-slate-50 border-slate-200" 
                      />
                      <FormattedNumberInput 
                        value={state.timeEfficiency.workOutsideWith} 
                        onChange={(v) => updateTimeEfficiency('workOutsideWith', v)} 
                        step={0.1}
                        className="h-10 bg-[#FFF5F2] border-[#EA2C00]/20 focus:border-[#EA2C00] focus:ring-[#EA2C00]/20" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div 
          className="mt-10 flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            onClick={onNext}
            disabled={!hasMinimumData}
            className={`
              h-12 px-8 font-semibold rounded-full transition-all duration-200
              ${hasMinimumData 
                ? 'bg-black hover:bg-black/90 text-white' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }
            `}
            data-testid="button-show-transformation"
          >
            Show Me the Transformation
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
