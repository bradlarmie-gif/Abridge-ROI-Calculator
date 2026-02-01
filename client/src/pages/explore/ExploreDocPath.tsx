import { ArrowRight, BarChart3, Building2, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type ExploreState, type DocPathFocus } from "./ExploreFlow";

interface ExploreDocPathProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

interface DocOption {
  id: DocPathFocus;
  label: string;
  description: string;
  icon: typeof BarChart3;
  detail: string;
  metric: string;
}

const DOC_OPTIONS: DocOption[] = [
  {
    id: 'wrvu',
    label: 'Level of Service (wRVU)',
    description: 'Improve coding accuracy and capture appropriate complexity',
    icon: BarChart3,
    detail: 'Best for organizations with E&M coding opportunities',
    metric: '+2-4% wRVU lift typical',
  },
  {
    id: 'hcc',
    label: 'HCC & Chronic Conditions',
    description: 'Better capture of chronic conditions for risk adjustment',
    icon: Building2,
    detail: 'Best for Medicare Advantage or ACO populations',
    metric: '+10-20% condition recapture',
  },
  {
    id: 'denials',
    label: 'Denial Prevention',
    description: 'Reduce documentation-related claim denials',
    icon: AlertTriangle,
    detail: 'Best for organizations with high denial rates',
    metric: '20-30% denial reduction',
  },
];

export default function ExploreDocPath({ state, updateState, onNext, onBack, onHome }: ExploreDocPathProps) {
  
  const handleToggleOption = (optionId: DocPathFocus) => {
    const newDocDrivers = { ...state.docDrivers };
    newDocDrivers[optionId] = {
      ...newDocDrivers[optionId],
      enabled: !newDocDrivers[optionId].enabled,
    };
    updateState({ docDrivers: newDocDrivers });
  };

  const selectedCount = Object.values(state.docDrivers).filter(d => d.enabled).length;
  const isValid = selectedCount > 0;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={5}
        totalSteps={7}
        stepName="Documentation Quality"
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
            Documentation Quality
          </p>

          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Where Do You Want to Improve Documentation?
          </h1>

          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Beyond time savings, Abridge improves note quality. Select all that apply to your organization.
          </p>
        </motion.div>

        <div className="space-y-4 max-w-2xl mx-auto mb-8">
          {DOC_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isSelected = state.docDrivers[option.id].enabled;
            
            return (
              <motion.button
                key={option.id}
                onClick={() => handleToggleOption(option.id)}
                className={`
                  w-full text-left p-5 rounded-2xl border-2 transition-all duration-200
                  ${isSelected 
                    ? 'border-[#EA2C00] bg-[#FFF5F2]' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }
                `}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
                data-testid={`button-doc-${option.id}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors
                    ${isSelected ? 'bg-[#EA2C00]' : 'bg-slate-100'}
                  `}>
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-black">{option.label}</h3>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-[#EA2C00] flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{option.description}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400">{option.detail}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {option.metric}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {selectedCount > 0 && (
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFF5F2] text-[#EA2C00] text-sm font-medium">
              <Check className="w-4 h-4" />
              {selectedCount} driver{selectedCount > 1 ? 's' : ''} selected
            </span>
          </motion.div>
        )}

        <motion.div 
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Button
            onClick={onNext}
            disabled={!isValid}
            className={`
              h-12 px-8 font-semibold rounded-full transition-all duration-200
              ${isValid
                ? 'bg-black hover:bg-black/90 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }
            `}
            data-testid="button-continue"
          >
            Continue to Configure
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <p className="text-xs text-slate-400 mt-3">
            You'll be able to adjust assumptions on the next step
          </p>
        </motion.div>
      </div>
    </div>
  );
}
