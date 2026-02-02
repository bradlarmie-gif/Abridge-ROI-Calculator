import { useState } from "react";
import { ArrowRight, Loader2, Stethoscope, AlertCircle, HeartPulse, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureCareSetting } from "@/lib/measureCalculator";

interface CareSettingOption {
  id: MeasureCareSetting;
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
    available: false,
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
    available: false,
  },
];

interface MeasureWelcomeProps {
  selectedSetting: MeasureCareSetting | null;
  onSelectSetting: (setting: MeasureCareSetting) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureWelcome({ selectedSetting, onSelectSetting, onNext, onBack, onHome }: MeasureWelcomeProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleShowMe = () => {
    if (!selectedSetting) return;
    setIsLoading(true);
    setTimeout(() => {
      onNext();
    }, 1500);
  };

  const handleSelectSetting = (setting: CareSettingOption) => {
    if (!setting.available) return;
    onSelectSetting(setting.id);
  };

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={1}
        totalSteps={5}
        stepName="Set the Stage"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <motion.div 
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">
            Measure Your Value
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Document Your Impact
          </h1>

          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-12">
            You've lived the change. Now let's measure it—and give you a story worth sharing.
          </p>
        </motion.div>

        <motion.div
          className="mb-24"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="flex justify-center gap-12">
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
                    relative flex flex-col items-center text-center w-[260px] py-10 px-8 rounded-2xl transition-all duration-200
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
                      className="absolute top-4 right-4 w-7 h-7 bg-[#EA2C00] rounded-full flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </motion.div>
                  )}

                  {isDisabled && (
                    <div className="absolute top-4 right-4 px-2 py-1 bg-slate-200 rounded-md text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      Soon
                    </div>
                  )}

                  <div className={`
                    w-20 h-20 rounded-2xl flex items-center justify-center mb-6
                    ${isSelected 
                      ? 'bg-white/10' 
                      : isDisabled
                        ? 'bg-slate-100'
                        : 'bg-[#FFF5F2]'
                    }
                  `}>
                    <Icon className={`w-10 h-10 ${isSelected ? 'text-white' : isDisabled ? 'text-slate-400' : 'text-[#EA2C00]'}`} />
                  </div>
                  
                  <h3 className={`text-xl font-bold mb-1 ${isSelected ? 'text-white' : isDisabled ? 'text-slate-400' : 'text-black'}`}>
                    {setting.label}
                  </h3>
                  
                  <p className={`text-sm font-medium leading-tight ${isSelected ? 'text-white/70' : isDisabled ? 'text-slate-400' : 'text-slate-500'}`}>
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
                <span className="text-sm text-slate-500">Preparing your analysis...</span>
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
                  onClick={handleShowMe}
                  disabled={!selectedSetting}
                  className={`
                    h-12 px-8 font-semibold rounded-full transition-all duration-200
                    ${selectedSetting 
                      ? 'bg-black hover:bg-black/90 text-white' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }
                  `}
                  data-testid="button-show-me"
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
