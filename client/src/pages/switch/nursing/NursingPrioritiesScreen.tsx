import { useMemo } from "react";
import { motion } from "framer-motion";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingDomain, NursingDomainState, NursingBaselineInputs } from "./nursingTypes";
import { NURSING_DOMAIN_LABELS } from "./nursingTypes";
import { computePriorityPathways, computeDomainFeedback, type PriorityPathway } from "./nursingCalculations";

interface PrioritiesScreenProps {
  baseline: NursingBaselineInputs;
  domainStates: Record<NursingDomain, NursingDomainState>;
  onNext: () => void;
  onBack: () => void;
}

export default function NursingPrioritiesScreen({ baseline, domainStates, onNext, onBack }: PrioritiesScreenProps) {
  const priorities = useMemo(() => computePriorityPathways(domainStates, baseline), [domainStates, baseline]);

  const getPriorityNarrative = (p: PriorityPathway): string => {
    const feedback = computeDomainFeedback(p.domain, p.level, domainStates[p.domain].inputs, baseline);
    return feedback.context.split('\n').filter(Boolean).slice(0, 2).join(' ');
  };

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="max-w-[700px] mx-auto"
      >
        <motion.div className="text-center mb-10" variants={staggerItem}>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-priorities-headline"
          >
            Where Documentation Burden Reduction Matters Most
          </h1>
          <p className="text-base text-[#888888] max-w-[520px] mx-auto">
            Based on your assessment, reducing documentation burden through ambient flowsheet documentation would have the most meaningful impact in these areas.
          </p>
        </motion.div>

        {priorities.length > 0 ? (
          <motion.div variants={staggerItem} className="mb-8">
            <div className="bg-[#F5F0EB] rounded-xl p-8 md:p-10">
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-6">
                Your Priority Pathways
              </p>

              <div className="space-y-6">
                {priorities.map((p, i) => (
                  <div key={p.domain} className="bg-white rounded-lg p-6" data-testid={`card-priority-${p.domain}`}>
                    <div className="flex items-start gap-4">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
                        style={{ backgroundColor: '#EA2C00' }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-[#1A1A1A]">
                            {NURSING_DOMAIN_LABELS[p.domain]}
                          </h3>
                        </div>
                        <p className="text-xs text-[#999999] mb-3">
                          Level {p.level} — {p.levelLabel}
                        </p>
                        <p className="text-sm text-[#525252] leading-relaxed">
                          {getPriorityNarrative(p)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={staggerItem} className="mb-8">
            <div className="bg-[#F5F0EB] rounded-xl p-8 text-center">
              <p className="text-sm text-[#888888]">
                Based on your responses, documentation burden appears manageable across most domains. A working session can explore whether there are opportunities that weren't captured in this self-assessment.
              </p>
            </div>
          </motion.div>
        )}

        <StepFooter
          onBack={onBack}
          onNext={onNext}
          nextLabel="See Next Steps"
          nextTestId="button-nursing-next-priorities"
          backTestId="button-nursing-back-priorities"
        />
      </motion.div>
    </div>
  );
}
