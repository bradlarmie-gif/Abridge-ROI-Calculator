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

  const handleContinue = () => {
    if (!selectedSetting) return;
    setIsLoading(true);
    setTimeout(() => {
      onNext();
    }, 400);
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
        stepName="Select Setting"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-[600px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all ${
                step === 1 ? "bg-[#E85A2C]" : "bg-[#D1D5DB]"
              }`}
            />
          ))}
        </div>

        {/* Header */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-3 uppercase tracking-tight">
            Select Your Setting
          </h1>
          <p className="text-base text-[#888888]">
            Choose where you're measuring value.
          </p>
        </motion.div>

        {/* Care Setting Cards */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
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
                  relative flex flex-col items-center text-center p-5 rounded-lg transition-all duration-200
                  ${isSelected 
                    ? 'bg-white border-l-4 border-l-[#E85A2C] border-t border-r border-b border-[#E5E5E5] shadow-md' 
                    : isDisabled
                      ? 'bg-[#F5F5F5] border border-transparent cursor-not-allowed'
                      : 'bg-white border border-[#E5E5E5] hover:border-[#D1D5DB] hover:shadow-sm'
                  }
                `}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
                data-testid={`card-setting-${setting.id}`}
              >
                {isSelected && (
                  <motion.div 
                    className="absolute top-2 right-2 w-5 h-5 bg-[#E85A2C] rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </motion.div>
                )}

                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center mb-3
                  ${isDisabled ? 'bg-[#E5E5E5]' : 'bg-[#FFF5F2]'}
                `}>
                  <Icon className={`w-5 h-5 ${isDisabled ? 'text-[#888888]' : 'text-[#E85A2C]'}`} />
                </div>
                
                <h3 className={`text-sm font-semibold mb-0.5 ${isDisabled ? 'text-[#888888]' : 'text-black'}`}>
                  {setting.label}
                </h3>
                
                <p className={`text-xs leading-tight ${isDisabled ? 'text-[#AAAAAA]' : 'text-[#666666]'}`}>
                  {setting.shortDesc}
                </p>

                {isDisabled && (
                  <div className="mt-2">
                    <span className="inline-block text-[9px] uppercase tracking-wide font-medium text-[#888888] bg-[#E5E5E5] px-2 py-0.5 rounded">
                      Coming Soon
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* CTA */}
        <motion.div 
          className="flex justify-center"
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
                <Loader2 className="w-6 h-6 text-[#E85A2C] animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Button
                  onClick={handleContinue}
                  disabled={!selectedSetting}
                  className={`
                    h-11 px-8 font-medium rounded-md transition-all duration-200 gap-2
                    ${selectedSetting 
                      ? 'bg-[#E85A2C] hover:bg-[#E85A2C]/90 text-white' 
                      : 'bg-[#E5E5E5] text-[#888888] cursor-not-allowed'
                    }
                  `}
                  data-testid="button-continue"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
