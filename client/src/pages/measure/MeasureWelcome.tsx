import { useState } from "react";
import { ArrowRight, Sparkles, Loader2, Stethoscope, AlertCircle, HeartPulse, Building2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureCareSetting } from "@/lib/measureCalculator";

interface CareSettingOption {
  id: MeasureCareSetting;
  label: string;
  description: string;
  icon: typeof Stethoscope;
  available: boolean;
  comingSoon: boolean;
}

const CARE_SETTINGS: CareSettingOption[] = [
  {
    id: 'outpatient',
    label: 'Outpatient',
    description: 'Clinic & ambulatory care',
    icon: Stethoscope,
    available: true,
    comingSoon: false,
  },
  {
    id: 'ed',
    label: 'Emergency Dept',
    description: 'Emergency medicine',
    icon: AlertCircle,
    available: false,
    comingSoon: true,
  },
  {
    id: 'nursing',
    label: 'Nursing',
    description: 'Nursing documentation',
    icon: HeartPulse,
    available: false,
    comingSoon: true,
  },
  {
    id: 'inpatient',
    label: 'Inpatient',
    description: 'Hospital & acute care',
    icon: Building2,
    available: false,
    comingSoon: true,
  },
];

interface MeasureWelcomeProps {
  selectedSetting: MeasureCareSetting | null;
  onSelectSetting: (setting: MeasureCareSetting) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function MeasureWelcome({ selectedSetting, onSelectSetting, onNext, onBack }: MeasureWelcomeProps) {
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
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader
        pathType="measure"
        currentStep={1}
        totalSteps={4}
        stepName="Welcome"
        onBack={onBack}
      />
      <UnifiedHeaderSpacer />

      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
        <motion.div 
          className="text-center max-w-2xl w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#EA2C00]/10 border border-[#EA2C00]/20 rounded-full text-sm text-[#EA2C00] mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold tracking-wide">MEASURE</span>
          </motion.div>

          <motion.h1 
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Let's look at what{" "}
            <span className="bg-gradient-to-r from-[#EA2C00] to-[#F07B5F] bg-clip-text text-transparent">
              you built.
            </span>
          </motion.h1>

          <motion.p 
            className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Select your care setting to see what Abridge has done for your team.
          </motion.p>

          {/* Care Setting Cards */}
          <motion.div 
            className="grid grid-cols-2 gap-3 md:gap-4 mb-8 max-w-lg mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
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
                    relative p-4 md:p-5 rounded-xl border-2 transition-all duration-200
                    text-left flex flex-col items-start gap-2
                    ${isSelected 
                      ? 'border-[#EA2C00] bg-white shadow-lg shadow-[#EA2C00]/10' 
                      : isDisabled
                        ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md cursor-pointer'
                    }
                  `}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.05, duration: 0.3 }}
                  data-testid={`card-setting-${setting.id}`}
                >
                  {/* Coming Soon Badge */}
                  {setting.comingSoon && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-2 -right-2 text-xs bg-slate-200 text-slate-600 border-0"
                    >
                      Coming Soon
                    </Badge>
                  )}
                  
                  {/* Selected Check */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-[#EA2C00] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    ${isSelected 
                      ? 'bg-[#EA2C00]/10 text-[#EA2C00]' 
                      : isDisabled
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-slate-100 text-slate-600'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <div>
                    <p className={`font-semibold text-sm md:text-base ${isSelected ? 'text-[#EA2C00]' : isDisabled ? 'text-slate-400' : 'text-slate-900'}`}>
                      {setting.label}
                    </p>
                    <p className={`text-xs md:text-sm ${isDisabled ? 'text-slate-400' : 'text-slate-500'}`}>
                      {setting.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <Loader2 className="w-8 h-8 text-[#EA2C00] animate-spin" />
                <span className="text-slate-500 text-sm">Pulling your data...</span>
              </motion.div>
            ) : (
              <motion.div
                key="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Button
                  onClick={handleShowMe}
                  disabled={!selectedSetting}
                  size="lg"
                  className="bg-[#EA2C00] hover:bg-[#d42800] text-white h-14 px-10 text-lg font-semibold shadow-xl shadow-[#EA2C00]/30 rounded-xl disabled:opacity-50 disabled:shadow-none"
                  data-testid="button-show-me"
                >
                  Show Me
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                {!selectedSetting && (
                  <p className="text-sm text-slate-400 mt-3">Select a care setting above to continue</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
