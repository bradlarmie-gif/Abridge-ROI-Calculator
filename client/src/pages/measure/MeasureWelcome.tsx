import { useState } from "react";
import { ArrowRight, Sparkles, Loader2, Stethoscope, AlertCircle, HeartPulse, Building2, Check } from "lucide-react";
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
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader
        pathType="measure"
        currentStep={1}
        totalSteps={4}
        stepName="Set the Stage"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-16"
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
            <span className="font-semibold tracking-wide">MEASURE YOUR VALUE</span>
          </motion.div>

          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-wide font-abridge uppercase"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Every Transformation{" "}
            <span className="bg-gradient-to-r from-[#EA2C00] to-[#F07B5F] bg-clip-text text-transparent">
              Deserves Proof.
            </span>
          </motion.h1>

          <motion.p 
            className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            You've lived the change. Now let's measure it—and give you a story worth sharing.
          </motion.p>
        </motion.div>

        {/* Care Setting Selection */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h2 className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wider mb-8">
            Choose Your Care Setting
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
                    group relative flex flex-col items-center text-center p-6 md:p-8 rounded-2xl transition-all duration-300
                    ${isSelected 
                      ? 'bg-white border-2 border-[#EA2C00] shadow-xl shadow-[#EA2C00]/15 scale-[1.02]' 
                      : isDisabled
                        ? 'bg-slate-100/50 border-2 border-transparent cursor-not-allowed'
                        : 'bg-white border-2 border-slate-200 hover:border-slate-300 hover:shadow-lg cursor-pointer'
                    }
                  `}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.08, duration: 0.4 }}
                  whileHover={!isDisabled && !isSelected ? { y: -4 } : {}}
                  data-testid={`card-setting-${setting.id}`}
                >
                  {/* Selection Indicator */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div 
                        className="absolute top-3 right-3 w-6 h-6 bg-[#EA2C00] rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Coming Soon Label */}
                  {isDisabled && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-slate-200 rounded text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      Soon
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`
                    w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300
                    ${isSelected 
                      ? 'bg-[#EA2C00] text-white' 
                      : isDisabled
                        ? 'bg-slate-200 text-slate-400'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }
                  `}>
                    <Icon className="w-7 h-7 md:w-8 md:h-8" strokeWidth={1.5} />
                  </div>
                  
                  {/* Label */}
                  <h3 className={`
                    text-base md:text-lg font-semibold mb-1 transition-colors duration-300
                    ${isSelected 
                      ? 'text-[#EA2C00]' 
                      : isDisabled 
                        ? 'text-slate-400' 
                        : 'text-slate-900'
                    }
                  `}>
                    {setting.label}
                  </h3>
                  
                  {/* Description */}
                  <p className={`
                    text-xs md:text-sm transition-colors duration-300
                    ${isDisabled ? 'text-slate-400' : 'text-slate-500'}
                  `}>
                    {setting.shortDesc}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                <Loader2 className="w-10 h-10 text-[#EA2C00] animate-spin" />
                <span className="text-slate-500">Pulling your data...</span>
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
                  size="lg"
                  className={`
                    h-14 px-12 text-lg font-semibold rounded-xl transition-all duration-300
                    ${selectedSetting 
                      ? 'bg-[#EA2C00] hover:bg-[#d42800] text-white shadow-xl shadow-[#EA2C00]/25' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }
                  `}
                  data-testid="button-show-me"
                >
                  Show Me
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                
                <AnimatePresence>
                  {!selectedSetting && (
                    <motion.p 
                      className="text-sm text-slate-400"
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      Select a care setting to continue
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
