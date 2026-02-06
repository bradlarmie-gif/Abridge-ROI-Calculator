import { useState } from "react";
import { ArrowRight, Loader2, Stethoscope, Zap, HeartPulse, ClipboardList, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureCareSetting } from "@/lib/measureCalculator";
import abridgeShape from "@assets/abridge-shape-07_1770229105848.png";

interface CareSettingOption {
  id: MeasureCareSetting;
  label: string;
  shortDesc: string;
  description: string;
  icon: typeof Stethoscope;
  available: boolean;
}

const CARE_SETTINGS: CareSettingOption[] = [
  {
    id: 'outpatient',
    label: 'Outpatient',
    shortDesc: 'Primary care & specialty',
    description: 'Physician and APP workflows with wRVU, capacity, and documentation quality drivers.',
    icon: Stethoscope,
    available: true,
  },
  {
    id: 'ed',
    label: 'Emergency',
    shortDesc: 'Emergency department',
    description: 'High-volume, fast-paced workflows with throughput and LWBS drivers.',
    icon: Zap,
    available: false,
  },
  {
    id: 'inpatient',
    label: 'Inpatient',
    shortDesc: 'Hospital medicine',
    description: 'DRG-based workflows with coding accuracy and denial prevention drivers.',
    icon: ClipboardList,
    available: false,
  },
  {
    id: 'nursing',
    label: 'Nursing',
    shortDesc: 'Inpatient nursing',
    description: 'Shift-based workflows with overtime, retention, and care quality drivers.',
    icon: HeartPulse,
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

  const selectedLabel = selectedSetting
    ? CARE_SETTINGS.find(s => s.id === selectedSetting)?.label
    : null;

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <UnifiedHeader
        pathType="measure"
        currentStep={1}
        totalSteps={5}
        stepName="Select Setting"
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
            Measure Your Value
          </p>

          <h1 className="text-2xl md:text-4xl font-bold text-black mb-3" data-testid="text-page-title">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {CARE_SETTINGS.map((setting, index) => {
              const Icon = setting.icon;
              const isSelected = selectedSetting === setting.id;
              const isDisabled = !setting.available;
              
              return (
                <motion.div
                  key={setting.id}
                  onClick={() => handleSelectSetting(setting)}
                  role="button"
                  tabIndex={isDisabled ? -1 : 0}
                  onKeyDown={(e) => {
                    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleSelectSetting(setting);
                    }
                  }}
                  className={`
                    group relative flex flex-col text-left rounded-xl p-5 md:p-7 min-h-[200px] transition-all duration-200 outline-none
                    ${isSelected 
                      ? 'bg-white border-2 border-[#EA2C00] shadow-[0_4px_16px_rgba(234,44,0,0.1)] cursor-pointer' 
                      : isDisabled
                        ? 'bg-[#F5F0EB] border-2 border-transparent opacity-55 cursor-default'
                        : 'bg-[#F5F0EB] border-2 border-transparent cursor-pointer hover:border-[#EA2C00] hover:shadow-[0_4px_16px_rgba(234,44,0,0.08)] hover:-translate-y-0.5'
                    }
                  `}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05, duration: 0.3 }}
                  data-testid={`card-setting-${setting.id}`}
                  aria-label={isDisabled ? `${setting.label} - Coming Soon` : `Select ${setting.label}`}
                  aria-disabled={isDisabled}
                >
                  {isSelected && (
                    <motion.div 
                      className="absolute top-3 right-3 w-2 h-2 bg-[#EA2C00] rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      data-testid={`indicator-selected-${setting.id}`}
                    />
                  )}

                  {isDisabled && (
                    <div
                      className="absolute top-3 right-3 px-2.5 py-1 bg-[#E0E0E0] rounded text-[9px] font-semibold text-[#666666] uppercase"
                      style={{ letterSpacing: '1px' }}
                      data-testid={`badge-coming-soon-${setting.id}`}
                    >
                      Coming Soon
                    </div>
                  )}

                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center mb-4 flex-shrink-0"
                    style={{
                      backgroundColor: '#FFFFFF',
                      boxShadow: isDisabled ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <Icon className={`w-6 h-6 ${isDisabled ? 'text-[#CCCCCC]' : 'text-[#EA2C00]'}`} />
                  </div>
                  
                  <h3
                    className={`text-xl font-bold mb-1 ${isDisabled ? 'text-[#999999]' : 'text-[#1A1A1A]'}`}
                    data-testid={`text-setting-label-${setting.id}`}
                  >
                    {setting.label}
                  </h3>
                  
                  <p
                    className={`text-[13px] font-medium leading-tight mb-3 ${isDisabled ? 'text-[#BBBBBB]' : 'text-[#666666]'}`}
                    data-testid={`text-setting-subtitle-${setting.id}`}
                  >
                    {setting.shortDesc}
                  </p>

                  <p
                    className={`text-xs leading-relaxed flex-1 ${isDisabled ? 'text-[#BBBBBB]' : 'text-[#999999]'}`}
                    data-testid={`text-setting-desc-${setting.id}`}
                  >
                    {setting.description}
                  </p>

                  {!isDisabled && !isSelected && (
                    <span
                      className="text-xs font-medium text-[#EA2C00] mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      data-testid={`text-select-hint-${setting.id}`}
                    >
                      Select
                      <ArrowRight className="w-3 h-3 inline ml-1" />
                    </span>
                  )}

                  {!isDisabled && isSelected && (
                    <span className="text-xs font-medium text-[#EA2C00] mt-3 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Selected
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.p
          className="text-[11px] text-[#999999] text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          data-testid="text-context-line"
        >
          All settings share the same methodology. Each is calibrated to its unique value drivers.
        </motion.p>

        <motion.div 
          className="max-w-2xl mx-auto"
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
                <span className="text-sm text-[#999999]">Setting up your measurement...</span>
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
