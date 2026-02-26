import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingPriority, NursingBaselineInputs } from "./nursingTypes";
import { PRIORITY_CONFIGS } from "./nursingTypes";
import {
  classifyPathways,
  generateAlignmentNarrative,
  generatePrimaryPathwaySummary,
  deriveShiftsPerYear,
  getRecommendedFocus,
} from "./nursingCalculations";

interface Screen4Props {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  onNext: () => void;
  onBack: () => void;
}

export default function NursingScreen4Alignment({
  baseline,
  selectedPriorities,
  onNext,
  onBack,
}: Screen4Props) {
  const pathways = useMemo(() => classifyPathways(selectedPriorities, baseline), [selectedPriorities, baseline]);
  const narrative = useMemo(() => generateAlignmentNarrative(selectedPriorities, baseline), [selectedPriorities, baseline]);
  const primaryLabel = useMemo(() => generatePrimaryPathwaySummary(selectedPriorities), [selectedPriorities]);
  const recommendedFocus = useMemo(() => getRecommendedFocus(selectedPriorities), [selectedPriorities]);
  const shiftsPerYear = deriveShiftsPerYear(baseline);

  const primary = pathways.filter(p => p.role === 'primary');
  const supporting = pathways.filter(p => p.role === 'supporting');
  const notSelected = pathways.filter(p => p.role === 'notSelected');

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
            Your Investment Case
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-alignment-headline"
          >
            Your Strategic Alignment
          </h1>
          <p className="text-base text-[#888888] mb-8 max-w-xl leading-relaxed">
            Based on your priorities, here's how to build the strongest case for ambient nursing documentation at your organization.
          </p>

          <motion.div variants={staggerItem} className="mb-8">
            <div className="bg-[#F5F0EB] rounded-xl p-6 md:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#888888] mb-3">
                Your Primary Pathway
              </p>
              <h2
                className="text-lg font-bold text-[#1A1A1A] uppercase tracking-wide mb-4"
                data-testid="text-primary-pathway"
              >
                {primaryLabel}
              </h2>

              {narrative.split('\n\n').map((para, i) => (
                <p key={i} className="text-sm text-[#333333] leading-relaxed mb-3 last:mb-0">
                  {para}
                </p>
              ))}

              {primary.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[#E5E7EB] space-y-3">
                  {primary.map(p => {
                    const config = PRIORITY_CONFIGS.find(c => c.id === p.priority)!;
                    return (
                      <div key={p.priority} className="flex items-start gap-3">
                        <span className="text-[#EA2C00] mt-0.5">→</span>
                        <div>
                          <p className="text-sm font-semibold text-[#1A1A1A]">{config.title}</p>
                          <p className="text-xs text-[#666666] leading-relaxed mt-0.5">{p.narrative}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {supporting.length > 0 && (
            <motion.div variants={staggerItem} className="mb-8">
              <div className="bg-[#F5F0EB] rounded-xl p-6 md:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#888888] mb-3">
                  Supporting Arguments
                </p>
                <p className="text-sm text-[#666666] leading-relaxed mb-4">
                  These priorities you selected are real and important, but they strengthen the case rather than carry it:
                </p>
                <div className="space-y-3">
                  {supporting.map(p => {
                    const config = PRIORITY_CONFIGS.find(c => c.id === p.priority)!;
                    return (
                      <div key={p.priority} className="flex items-start gap-3">
                        <span className="text-[#888888] mt-0.5">—</span>
                        <div>
                          <p className="text-sm font-semibold text-[#1A1A1A]">{config.title}</p>
                          <p className="text-xs text-[#666666] leading-relaxed mt-0.5">{p.narrative}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {notSelected.length > 0 && (
            <motion.div variants={staggerItem} className="mb-8">
              <div className="bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl p-6 md:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#999999] mb-3">
                  Not a Current Priority
                </p>
                <p className="text-sm text-[#999999] leading-relaxed mb-4">
                  These pathways weren't selected as priorities for your organization right now:
                </p>
                <div className="space-y-2">
                  {notSelected.map(p => {
                    const config = PRIORITY_CONFIGS.find(c => c.id === p.priority)!;
                    return (
                      <div key={p.priority} className="flex items-start gap-2 opacity-60">
                        <span className="text-[#AAAAAA] mt-0.5">—</span>
                        <p className="text-sm text-[#999999]">{config.title}</p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-[#AAAAAA] mt-4 leading-relaxed">
                  That's fine. A focused investment case built on what you actually care about is stronger than one that tries to capture everything.
                </p>
              </div>
            </motion.div>
          )}

          <div className="mt-8">
            <StepFooter
              onBack={onBack}
              onNext={onNext}
              nextLabel="See Next Steps →"
              nextTestId="button-nursing-next-4"
              backTestId="button-nursing-back-4"
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

            {recommendedFocus.length > 0 && (
              <>
                <div className="h-px bg-white/10 my-4" />
                <p className="text-[9px] font-semibold uppercase tracking-[2px] text-white/40 mb-3">
                  Recommended Focus
                </p>
                <div className="space-y-1.5">
                  {recommendedFocus.map((f, i) => (
                    <p key={i} className={`text-xs ${f.startsWith('Supporting') ? 'text-white/40' : 'text-white/70'}`}>
                      {f.startsWith('Supporting') ? f : `→ ${f}`}
                    </p>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}
