import { motion } from "framer-motion";
import { Check } from "lucide-react";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingPriority, NursingBaselineInputs } from "./nursingTypes";
import { PRIORITY_CONFIGS } from "./nursingTypes";
import { deriveShiftsPerYear } from "./nursingCalculations";

interface Screen2Props {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  setSelectedPriorities: (priorities: NursingPriority[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function NursingScreen2Priorities({
  baseline,
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
  const shiftsPerYear = deriveShiftsPerYear(baseline);

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
            What Matters Most Right Now?
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-priorities-headline"
          >
            What is your nursing program trying to solve?
          </h1>
          <p className="text-base text-[#888888] mb-3 max-w-xl leading-relaxed">
            Every nursing program is under pressure. But not every organization is under the same pressure.
            Understanding what you're trying to solve is the first step toward knowing where technology investments should focus.
          </p>
          <p className="text-sm text-[#666666] mb-8 max-w-xl leading-relaxed">
            Select the priorities that are most relevant to your nursing program right now. Try to identify the top 2–3 that are driving your strategic conversations today.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRIORITY_CONFIGS.map((config) => {
              const isSelected = selectedPriorities.includes(config.id);
              return (
                <motion.button
                  key={config.id}
                  variants={staggerItem}
                  onClick={() => togglePriority(config.id)}
                  className={`relative text-left rounded-xl p-5 transition-all duration-200 border-2 ${
                    isSelected
                      ? 'border-[#EA2C00] bg-[#FFF5F2]'
                      : 'border-[#E5E7EB] bg-[#F5F0EB] hover:border-[#CCCCCC]'
                  }`}
                  data-testid={`priority-card-${config.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        isSelected ? 'bg-[#EA2C00]' : 'border-2 border-[#CCCCCC] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
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
              nextLabel="See Where Ambient Fits →"
              nextDisabled={!canProceed}
              nextTestId="button-nursing-next-2"
              backTestId="button-nursing-back-2"
            />
          </div>
        </motion.div>

        <motion.aside
          className="w-full lg:w-[300px] lg:sticky lg:top-24 self-start"
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
                {selectedPriorities.map(id => {
                  const config = PRIORITY_CONFIGS.find(c => c.id === id)!;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-[#EA2C00] flex-shrink-0" />
                      <p className="text-sm text-white/80">{config.title}</p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="h-px bg-white/10 my-4" />
            <p className="text-xs text-white/40">
              {selectedPriorities.length} of 6 selected
            </p>

            <div className="h-px bg-white/10 my-4" />
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-white/40 mb-3">
              Your Baseline
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Staffed beds</span>
                <span className="text-white font-medium">{baseline.staffedBeds.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Nurse FTEs</span>
                <span className="text-white font-medium">{baseline.nurseFTEs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Occupancy</span>
                <span className="text-white font-medium">{baseline.bedOccupancy}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Shifts / year</span>
                <span className="text-white font-medium">{shiftsPerYear.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}
