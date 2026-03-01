import { useState } from "react";
import { ArrowRight, Loader2, Stethoscope, Zap, HeartPulse, ClipboardList, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreCareSetting } from "./ExploreFlow";
import abridgeShape from "@assets/abridge-shape-07_1770229105848.png";

interface CareSettingOption {
  id: ExploreCareSetting;
  label: string;
  shortDesc: string;
  description: string;
  icon: typeof Stethoscope;
}

const CARE_SETTINGS: CareSettingOption[] = [
  {
    id: 'outpatient',
    label: 'Outpatient',
    shortDesc: 'Primary care & specialty',
    description: 'wRVU capture, patient access, documentation quality, and provider wellbeing.',
    icon: Stethoscope,
  },
  {
    id: 'ed',
    label: 'Emergency',
    shortDesc: 'Emergency department',
    description: 'Throughput, LWBS reduction, E&M accuracy, and downstream capture.',
    icon: Zap,
  },
  {
    id: 'inpatient',
    label: 'Inpatient',
    shortDesc: 'Hospital medicine',
    description: 'DRG accuracy, CC/MCC capture, CDI efficiency, and denial prevention.',
    icon: ClipboardList,
  },
  {
    id: 'nursing',
    label: 'Nursing',
    shortDesc: 'Inpatient nursing',
    description: 'Overtime reduction, retention, care quality, and bedside time.',
    icon: HeartPulse,
  },
];

interface ExploreCareSettingsProps {
  selectedSetting: ExploreCareSetting | null;
  onSelectSetting: (setting: ExploreCareSetting) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  disabledSettings?: ExploreCareSetting[];
}

export default function ExploreCareSettings({ selectedSetting, onSelectSetting, onNext, onBack, onHome, disabledSettings = [] }: ExploreCareSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    if (!selectedSetting) return;
    setIsLoading(true);
    setTimeout(() => {
      onNext();
    }, 800);
  };

  const selectedLabel = selectedSetting
    ? CARE_SETTINGS.find(s => s.id === selectedSetting)?.label
    : null;

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <UnifiedHeader
        pathType="explore"
        currentStep={1}
        totalSteps={6}
        stepName="Care Setting"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />
      
      <div 
        className="absolute pointer-events-none z-0"
        style={{
          right: '-10%',
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          width: '85vh',
          height: '85vh',
          opacity: 0.04,
        }}
      >
        <img 
          src={abridgeShape} 
          alt="" 
          className="w-full h-full object-contain"
          aria-hidden="true"
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 relative z-10">
        <motion.div 
          className="text-center mb-8 md:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3" data-testid="text-page-label">
            Build Your Model
          </p>

          <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight" data-testid="text-page-title">
            Choose Your Care Setting
          </h1>

          <p className="text-base md:text-lg text-[#666666] max-w-2xl mx-auto px-2" data-testid="text-page-subtitle">
            Each setting has its own value story. We'll tailor the model to match how your organization works.
          </p>
        </motion.div>

        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-3 min-[400px]:gap-4 lg:gap-5">
            {CARE_SETTINGS.map((setting, index) => {
              const Icon = setting.icon;
              const isSelected = selectedSetting === setting.id;
              const isDisabled = disabledSettings.includes(setting.id);
              
              return (
                <motion.div
                  key={setting.id}
                  onClick={() => !isDisabled && onSelectSetting(setting.id)}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  aria-disabled={isDisabled}
                  onKeyDown={(e) => {
                    if (isDisabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSetting(setting.id);
                    }
                  }}
                  className={`
                    group relative flex flex-col text-left rounded-xl p-4 min-[400px]:p-5 md:p-7 min-h-[140px] min-[400px]:min-h-[200px] md:min-h-[220px] transition-all duration-200 outline-none touch-manipulation
                    ${isDisabled
                      ? 'bg-[#F0EDEA] border-2 border-transparent opacity-50 cursor-not-allowed'
                      : isSelected 
                        ? 'bg-white border-2 border-[#EA2C00] shadow-[0_4px_16px_rgba(234,44,0,0.1)] cursor-pointer' 
                        : 'bg-[#F5F0EB] border-2 border-transparent hover:border-[#EA2C00] hover:shadow-[0_4px_16px_rgba(234,44,0,0.08)] hover:-translate-y-0.5 cursor-pointer'
                    }
                  `}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
                  data-testid={`card-setting-${setting.id}`}
                  aria-label={isDisabled ? `${setting.label} — already in proforma` : `Select ${setting.label}`}
                >
                  {isSelected && !isDisabled && (
                    <motion.div 
                      className="absolute top-3 right-3 min-[400px]:top-4 min-[400px]:right-4 w-2 h-2 bg-[#EA2C00] rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      data-testid={`indicator-selected-${setting.id}`}
                    />
                  )}

                  <div
                    className={`w-10 h-10 min-[400px]:w-[52px] min-[400px]:h-[52px] rounded-full flex items-center justify-center mb-3 min-[400px]:mb-4 flex-shrink-0 ${isDisabled ? 'opacity-60' : ''}`}
                    style={{
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <Icon className={`w-5 h-5 min-[400px]:w-6 min-[400px]:h-6 ${isDisabled ? 'text-[#999999]' : 'text-[#EA2C00]'}`} />
                  </div>
                  
                  <h3
                    className={`text-lg min-[400px]:text-xl font-bold mb-1 ${isDisabled ? 'text-[#999999]' : 'text-[#1A1A1A]'}`}
                    data-testid={`text-setting-label-${setting.id}`}
                  >
                    {setting.label}
                  </h3>
                  
                  <p
                    className={`text-[13px] font-medium leading-tight mb-2 min-[400px]:mb-3 ${isDisabled ? 'text-[#AAAAAA]' : 'text-[#666666]'}`}
                    data-testid={`text-setting-subtitle-${setting.id}`}
                  >
                    {setting.shortDesc}
                  </p>

                  <p
                    className={`text-xs leading-relaxed flex-1 break-words ${isDisabled ? 'text-[#BBBBBB]' : 'text-[#999999]'}`}
                    data-testid={`text-setting-desc-${setting.id}`}
                  >
                    {setting.description}
                  </p>

                  {isDisabled && (
                    <span className="text-xs font-medium text-[#999999] mt-2 min-[400px]:mt-3 flex items-center gap-1">
                      <Check className="w-3 h-3 flex-shrink-0" />
                      Already in proforma
                    </span>
                  )}

                  {!isDisabled && !isSelected && (
                    <span
                      className="text-xs font-medium text-[#EA2C00] mt-2 min-[400px]:mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      data-testid={`text-select-hint-${setting.id}`}
                    >
                      Select
                      <ArrowRight className="w-3 h-3 inline ml-1" />
                    </span>
                  )}

                  {!isDisabled && isSelected && (
                    <span className="text-xs font-medium text-[#EA2C00] mt-2 min-[400px]:mt-3 flex items-center gap-1">
                      <Check className="w-3 h-3 flex-shrink-0" />
                      Selected
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.p
          className="text-xs text-[#999999] text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          data-testid="text-context-line"
        >
          All settings use the same transparent methodology. Each is calibrated to its unique value drivers.
        </motion.p>

        <motion.div 
          className="max-w-[480px] mx-auto px-1"
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
                <span className="text-sm text-[#999999]">Setting up your model...</span>
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
                    w-full h-[52px] font-semibold rounded-lg text-base transition-all duration-200
                    ${selectedSetting 
                      ? 'bg-[#EA2C00] hover:bg-[#D42800] text-white' 
                      : 'bg-[#E0E0E0] text-[#999999] cursor-not-allowed'
                    }
                  `}
                  data-testid="button-continue"
                >
                  {selectedSetting ? (
                    <>
                      Continue with {selectedLabel}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  ) : (
                    'Choose a setting to continue'
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
