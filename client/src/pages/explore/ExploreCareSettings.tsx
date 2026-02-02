import { useState } from "react";
import { ArrowRight, Loader2, Stethoscope, AlertCircle, HeartPulse, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreCareSetting } from "./ExploreFlow";

interface CareSettingOption {
  id: ExploreCareSetting;
  label: string;
  shortDesc: string;
  icon: typeof Stethoscope;
  available: boolean;
}

const CARE_SETTINGS: CareSettingOption[] = [
  {
    id: 'outpatient',
    label: 'Outpatient',
    shortDesc: 'Clinic & Ambulatory',
    icon: Stethoscope,
    available: true,
  },
  {
    id: 'ed',
    label: 'Emergency',
    shortDesc: 'Emergency Department',
    icon: AlertCircle,
    available: true,
  },
  {
    id: 'nursing',
    label: 'Nursing',
    shortDesc: 'Nursing Documentation',
    icon: HeartPulse,
    available: false,
  },
  {
    id: 'inpatient',
    label: 'Inpatient',
    shortDesc: 'Hospital & Acute Care',
    icon: Building2,
    available: true,
  },
];

interface ExploreCareSettingsProps {
  selectedSetting: ExploreCareSetting | null;
  onSelectSetting: (setting: ExploreCareSetting) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function ExploreCareSettings({ selectedSetting, onSelectSetting, onNext, onBack, onHome }: ExploreCareSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    if (!selectedSetting) return;
    setIsLoading(true);
    setTimeout(() => {
      onNext();
    }, 800);
  };

  const handleSelectSetting = (setting: CareSettingOption) => {
    if (!setting.available) return;
    onSelectSetting(setting.id);
  };

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={1}
        totalSteps={6}
        stepName="Care Setting"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">
            Build Your Model
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Where Will You Deploy Abridge?
          </h1>

          <p className="text-lg text-slate-600 max-w-xl mx-auto mb-6">
            Select your care setting to begin modeling the impact.
          </p>
          
          <div className="bg-slate-100 rounded-lg p-4 max-w-xl mx-auto text-left">
            <p className="text-slate-500 text-sm">
              <span className="font-semibold text-slate-700">Why this matters:</span> Each care setting has distinct workflows, reimbursement models, and documentation challenges. Outpatient visits are shorter with E&M-driven revenue. EDs face high-acuity, high-volume throughput pressure. Selecting your setting ensures the model uses appropriate benchmarks, time savings, and value drivers.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
            Choose One
          </p>
          <h2 className="text-lg font-bold text-black mb-6">
            Select Your Care Setting
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {CARE_SETTINGS.map((setting, index) => {
              const Icon = setting.icon;
              const isSelected = selectedSetting === setting.id;
              const isDisabled = !setting.available;
              
              return (
                <motion.button
                  key={setting.id}
                  onClick={() => handleSelectSetting(setting)}
                  disabled={isDisabled}
                  className={`
                    relative flex flex-col items-center text-center p-8 rounded-2xl transition-all duration-200
                    ${isSelected 
                      ? 'bg-black text-white shadow-xl' 
                      : isDisabled
                        ? 'bg-slate-50 cursor-not-allowed'
                        : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md'
                    }
                  `}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
                  data-testid={`card-setting-${setting.id}`}
                >
                  {isSelected && (
                    <motion.div 
                      className="absolute top-3 right-3 w-6 h-6 bg-[#EA2C00] rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </motion.div>
                  )}

                  {isDisabled && (
                    <div className="absolute top-3 right-3 px-2 py-1 bg-slate-200 rounded-md text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      Soon
                    </div>
                  )}

                  <div className={`
                    w-14 h-14 rounded-xl flex items-center justify-center mb-4
                    ${isSelected 
                      ? 'bg-white/10' 
                      : isDisabled
                        ? 'bg-slate-100'
                        : 'bg-[#FFF5F2]'
                    }
                  `}>
                    <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : isDisabled ? 'text-slate-400' : 'text-[#EA2C00]'}`} />
                  </div>
                  
                  <h3 className={`text-base font-bold mb-1 ${isSelected ? 'text-white' : isDisabled ? 'text-slate-400' : 'text-black'}`}>
                    {setting.label}
                  </h3>
                  
                  <p className={`text-sm ${isSelected ? 'text-white/70' : isDisabled ? 'text-slate-400' : 'text-slate-500'}`}>
                    {setting.shortDesc}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3 py-4"
              >
                <Loader2 className="w-8 h-8 text-[#EA2C00] animate-spin" />
                <span className="text-sm text-slate-500">Setting up your model...</span>
              </motion.div>
            ) : (
              <motion.div
                key="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-3"
              >
                <Button
                  onClick={handleContinue}
                  disabled={!selectedSetting}
                  className={`
                    h-12 px-8 font-semibold rounded-full transition-all duration-200
                    ${selectedSetting 
                      ? 'bg-black hover:bg-black/90 text-white' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }
                  `}
                  data-testid="button-continue"
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                
                {!selectedSetting && (
                  <p className="text-sm text-slate-400">
                    Select a care setting to continue
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
