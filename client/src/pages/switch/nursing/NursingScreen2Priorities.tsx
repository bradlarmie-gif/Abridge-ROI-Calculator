import { motion } from "framer-motion";
import { Check } from "lucide-react";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingPriority } from "./nursingTypes";
import { PRIORITY_CONFIGS } from "./nursingTypes";

interface Screen2Props {
  selectedPriorities: NursingPriority[];
  setSelectedPriorities: (priorities: NursingPriority[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function NursingScreen2Priorities({
  selectedPriorities,
  setSelectedPriorities,
  onNext,
  onBack,
}: Screen2Props) {
  const togglePriority = (id: NursingPriority) => {
    if (selectedPriorities.includes(id)) {
      setSelectedPriorities(selectedPriorities.filter(p => p !== id));
    } else {
      setSelectedPriorities([...selectedPriorities, id]);
    }
  };

  const canProceed = selectedPriorities.length > 0;

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col lg:flex-row gap-10"
      >
        <motion.div className="flex-1 max-w-[700px]" variants={staggerItem}>
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">
            Strategic Priorities
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-priorities-headline"
          >
            What is your nursing program focused on?
          </h1>
          <p className="text-base text-[#888888] mb-3 max-w-xl leading-relaxed">
            Every nursing program has strategic priorities. Understanding yours helps us explore where documentation burden fits into the picture — and where it doesn't.
          </p>
          <p className="text-sm text-[#666666] mb-8 max-w-xl">
            Select the priorities that are driving your strategic conversations right now.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {PRIORITY_CONFIGS.map((config) => {
              const isSelected = selectedPriorities.includes(config.id);
              return (
                <motion.button
                  key={config.id}
                  variants={staggerItem}
                  onClick={() => togglePriority(config.id)}
                  className={`relative text-left rounded-xl p-4 sm:p-5 transition-all duration-200 border-2 active:scale-[0.98] ${
                    isSelected
                      ? 'border-[#EA2C00] bg-[#FFF5F2] shadow-sm'
                      : 'border-[#E5E7EB] bg-[#F5F0EB] hover:border-[#CCCCCC]'
                  }`}
                  data-testid={`priority-card-${config.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 sm:w-5 sm:h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isSelected ? 'bg-[#EA2C00]' : 'border-2 border-[#CCCCCC] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide mb-1.5">
                        {config.title}
                      </p>
                      <p className="text-xs text-[#666666] leading-relaxed">
                        {config.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="mt-8">
            <StepFooter
              onBack={onBack}
              onNext={onNext}
              nextLabel="Explore Your Priorities"
              nextDisabled={!canProceed}
              nextTestId="button-nursing-next-2"
              backTestId="button-nursing-back-2"
            />
          </div>
        </motion.div>

        {selectedPriorities.length > 0 && (
          <motion.div
            className="lg:hidden bg-[#1A1A1A] rounded-xl px-4 py-3 flex items-center justify-between -mt-4 mb-2"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            data-testid="mobile-priority-strip"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-sm bg-[#EA2C00] flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm text-white/80 font-medium">
                {selectedPriorities.length} {selectedPriorities.length === 1 ? 'priority' : 'priorities'} selected
              </span>
            </div>
            <span className="text-[10px] text-white/40 uppercase tracking-wider">of 6</span>
          </motion.div>
        )}

        <motion.aside
          className="hidden lg:block w-[300px] lg:sticky lg:top-24 self-start"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="bg-[#1A1A1A] text-white rounded-xl p-6">
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-4">
              Your Priorities
            </p>
            <div className="h-px bg-white/10 mb-4" />

            {selectedPriorities.length === 0 ? (
              <p className="text-sm text-white/40 italic">No priorities selected yet</p>
            ) : (
              <div className="space-y-2 mb-4">
                {PRIORITY_CONFIGS.map(config => {
                  const isSelected = selectedPriorities.includes(config.id);
                  return (
                    <div key={config.id} className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#EA2C00]' : 'border border-white/20'}`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-white/30'}`}>
                        {config.title}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="h-px bg-white/10 my-4" />
            <p className="text-xs text-white/40" data-testid="text-priority-count">
              {selectedPriorities.length} of 6 selected
            </p>
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}
