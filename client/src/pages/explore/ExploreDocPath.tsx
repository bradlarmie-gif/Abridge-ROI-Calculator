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
  
  const handleSelectOption = (option: DocOption) => {
    updateState({ docPathFocus: option.id });
  };

  const isValid = state.docPathFocus !== null;

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="explore"
        currentStep={5}
        totalSteps={7}
        stepName="Documentation Path"
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
            Beyond time savings, Abridge improves note quality. Which area matters most to you?
          </p>
        </motion.div>

        <div className="space-y-4 max-w-2xl mx-auto mb-8">
          {DOC_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isSelected = state.docPathFocus === option.id;
            
            return (
              <motion.button
                key={option.id}
                onClick={() => handleSelectOption(option)}
                className={`
                  w-full relative flex items-start gap-4 p-5 rounded-2xl transition-all duration-200 text-left
                  ${isSelected 
                    ? 'bg-black text-white shadow-lg' 
                    : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }
                `}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05, duration: 0.4 }}
                data-testid={`card-doc-${option.id}`}
              >
                {isSelected && (
                  <motion.div 
                    className="absolute top-4 right-4 w-6 h-6 bg-[#EA2C00] rounded-full flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </motion.div>
                )}

                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                  ${isSelected ? 'bg-white/10' : 'bg-[#FFF5F2]'}
                `}>
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#EA2C00]'}`} />
                </div>

                <div className="flex-1 min-w-0 pr-8">
                  <h3 className={`text-lg font-bold mb-1 ${isSelected ? 'text-white' : 'text-black'}`}>
                    {option.label}
                  </h3>
                  
                  <p className={`text-sm mb-3 ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                    {option.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                      {option.detail}
                    </span>
                    <span className={`
                      text-sm font-semibold
                      ${isSelected ? 'text-[#F07B5F]' : 'text-[#EA2C00]'}
                    `}>
                      {option.metric}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

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
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }
            `}
            data-testid="button-continue"
          >
            Continue to Configure
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          {!isValid && (
            <p className="text-sm text-slate-400 mt-3">
              Select a documentation focus to continue
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
