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
    available: true,
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
        <motion.div 
          className="text-center mb-8 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">
            Build Your Model
          </p>

          <h1 className="text-2xl md:text-4xl font-bold text-black mb-3">
            Select Your Care Setting
          </h1>

          <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mb-6 md:mb-12 px-2">
            Each care setting has unique workflows and documentation requirements. 
            We'll customize time savings and value drivers to match your environment.
          </p>
        </motion.div>

        <motion.div
          className="mb-12 md:mb-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="grid grid-cols-2 md:flex md:justify-center gap-3 md:gap-6 lg:gap-8">
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
                    relative flex flex-col items-center text-center w-full md:w-[180px] lg:w-[220px] py-6 md:py-8 px-4 md:px-6 rounded-xl md:rounded-2xl transition-all duration-200
                    ${isSelected 
                      ? 'bg-[#F5F0EB] border-2 border-[#E85A2C] shadow-xl' 
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
                      className="absolute top-2 right-2 md:top-3 md:right-3 w-5 h-5 md:w-6 md:h-6 bg-[#EA2C00] rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-white" strokeWidth={3} />
                    </motion.div>
                  )}

                  {isDisabled && (
                    <div className="absolute top-2 right-2 md:top-4 md:right-4 px-1.5 py-0.5 md:px-2 md:py-1 bg-slate-200 rounded-md text-[8px] md:text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      Soon
                    </div>
                  )}

                  <div className={`
                    w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-5
                    ${isSelected 
                      ? 'bg-white' 
                      : isDisabled
                        ? 'bg-slate-100'
                        : 'bg-[#FFF5F2]'
                    }
                  `}>
                    <Icon className={`w-6 h-6 md:w-8 md:h-8 ${isSelected ? 'text-[#E85A2C]' : isDisabled ? 'text-slate-400' : 'text-[#EA2C00]'}`} />
                  </div>
                  
                  <h3 className={`text-base md:text-lg font-bold mb-0.5 ${isSelected ? 'text-black' : isDisabled ? 'text-slate-400' : 'text-black'}`}>
                    {setting.label}
                  </h3>
                  
                  <p className={`text-xs md:text-sm font-medium leading-tight ${isSelected ? 'text-[#666666]' : isDisabled ? 'text-slate-400' : 'text-slate-500'}`}>
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
                      ? 'bg-[#F5F0EB] hover:bg-[#EDE5DB] text-[#E85A2C] border border-[#E5E5E5]' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }
                  `}
                  data-testid="button-continue"
                >
                  <span className="text-[#E85A2C] font-semibold">Continue</span><span className="text-black">&nbsp;with {selectedSetting ? CARE_SETTINGS.find(s => s.id === selectedSetting)?.label : 'Setting'}</span>
                  <ArrowRight className="w-4 h-4 ml-2 text-[#E85A2C]" />
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
