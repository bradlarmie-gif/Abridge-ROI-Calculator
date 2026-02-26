import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingPriority, NursingBaselineInputs, AllPriorityInputs } from "./nursingTypes";
import { PRIORITY_CONFIGS } from "./nursingTypes";
import {
  generateFocusNarrative,
  buildPrioritySummary,
  countDataPoints,
  fmtDollar,
  computeRetentionImpact,
  RESEARCH_NOTE,
} from "./nursingCalculations";

interface Screen5Props {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  inputs: AllPriorityInputs;
  onNext: () => void;
  onBack: () => void;
}

export default function NursingScreen5Focus({
  baseline,
  selectedPriorities,
  inputs,
  onNext,
  onBack,
}: Screen5Props) {
  const focus = useMemo(() => generateFocusNarrative(selectedPriorities, inputs, baseline), [selectedPriorities, inputs, baseline]);
  const summaries = useMemo(() => selectedPriorities.map(p => buildPrioritySummary(p, inputs, baseline)), [selectedPriorities, inputs, baseline]);
  const dataPoints = countDataPoints(selectedPriorities, inputs);
  const retentionImpact = computeRetentionImpact(inputs.retention, baseline);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

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
            Recommended Focus
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-focus-headline"
          >
            How to Think About the Investment Case
          </h1>
          <p className="text-base text-[#888888] mb-8 max-w-xl leading-relaxed">
            Based on your priorities, there are several ways to position an investment in documentation technology. The right framing depends on your organization's internal dynamics.
          </p>

          <motion.div variants={staggerItem} className="bg-[#F5F0EB] rounded-xl p-6 md:p-8 mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#888888] mb-3">Your Situation</p>
            <p className="text-sm text-[#333333] leading-relaxed">{focus.situation}</p>
          </motion.div>

          {focus.framingOptions.length > 0 && (
            <motion.div variants={staggerItem} className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#888888] mb-4">Ways to Frame the Conversation</p>
              <div className="space-y-4">
                {focus.framingOptions.map((option, i) => (
                  <div key={i} className="bg-[#F5F0EB] rounded-xl p-6 md:p-8">
                    <p className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wide mb-2">{option.title}</p>
                    <p className="text-sm text-[#333333] leading-relaxed mb-3">{option.body}</p>
                    <p className="text-[11px] text-[#999999]">Best audience: {option.audience}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {focus.evaluation.length > 0 && (
            <motion.div variants={staggerItem} className="bg-[#F5F0EB] rounded-xl p-6 md:p-8 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#888888] mb-3">What This Means for Evaluating Technology</p>
              <p className="text-sm text-[#333333] leading-relaxed mb-4">
                Any investment in documentation technology for nursing should be evaluated against these priorities. The questions to ask:
              </p>
              <div className="space-y-2">
                {focus.evaluation.map((q, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#888888] mt-0.5 text-sm">&#8226;</span>
                    <p className="text-sm text-[#333333] leading-relaxed">{q}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#333333] leading-relaxed mt-4">
                If the answer to these questions is yes, the investment case aligns with what your nursing program is trying to accomplish.
              </p>
            </motion.div>
          )}

          <motion.div variants={staggerItem} className="mb-6">
            <button
              onClick={() => setMethodologyOpen(!methodologyOpen)}
              className="flex items-center gap-2 text-sm text-[#888888] hover:text-[#1A1A1A] transition-colors"
              data-testid="button-methodology-toggle"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${methodologyOpen ? 'rotate-180' : ''}`} />
              About this assessment
            </button>
            {methodologyOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl p-6"
              >
                <p className="text-sm text-[#666666] leading-relaxed">
                  This assessment reflects your organization's self-reported priorities, interventions, and data. No assumptions are made about the impact of any specific technology. Connection statements between documentation burden and organizational outcomes reference published nursing workforce research (NSI, ANA, AMN Healthcare). All calculations use only the inputs you provided. This assessment is designed to help frame strategic conversations — it is not a financial projection or ROI model.
                </p>
              </motion.div>
            )}
          </motion.div>

          <div className="mt-8">
            <StepFooter
              onBack={onBack}
              onNext={onNext}
              nextLabel="What Comes Next"
              nextTestId="button-nursing-next-5"
              backTestId="button-nursing-back-5"
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
              Your Assessment
            </p>
            <div className="h-px bg-white/10 mb-4" />

            <div className="space-y-2 text-xs mb-3">
              <div className="flex justify-between">
                <span className="text-white/40">Priorities selected</span>
                <span className="text-white font-medium">{selectedPriorities.length} of 6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Data points provided</span>
                <span className="text-white font-medium">{dataPoints}</span>
              </div>
            </div>

            <div className="h-px bg-white/10 my-4" />
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-white/40 mb-3">Your Priorities</p>
            <div className="space-y-2 mb-4">
              {summaries.map(s => {
                const config = PRIORITY_CONFIGS.find(c => c.id === s.priority)!;
                return (
                  <div key={s.priority} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3.5 h-3.5 rounded-sm bg-[#EA2C00] flex items-center justify-center flex-shrink-0">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                      <span className="text-xs text-white/80 truncate">{config.title}</span>
                    </div>
                    <span className="text-[10px] text-white/50 flex-shrink-0">{s.sidebarLine}</span>
                  </div>
                );
              })}
            </div>

            <div className="h-px bg-white/10 my-4" />
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-white/40 mb-3">Key Numbers</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Nurse FTEs</span>
                <span className="text-white font-medium">{baseline.nurseFTEs.toLocaleString()}</span>
              </div>
              {inputs.retention.turnoverRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/40">Turnover rate</span>
                  <span className="text-white font-medium">{inputs.retention.turnoverRate}%</span>
                </div>
              )}
              {retentionImpact.departures > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/40">Annual replacements</span>
                  <span className="text-white font-medium">{retentionImpact.departures}</span>
                </div>
              )}
              {inputs.retention.replacementCost > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/40">Replacement cost</span>
                  <span className="text-white font-medium">{fmtDollar(inputs.retention.replacementCost)}</span>
                </div>
              )}
              {inputs.staffingCosts.otMinPerShift > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/40">Documentation OT</span>
                  <span className="text-white font-medium">{inputs.staffingCosts.otMinPerShift} min/shift</span>
                </div>
              )}
              {inputs.staffingCosts.agencyMonthlySpend > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/40">Agency spend</span>
                  <span className="text-white font-medium">{fmtDollar(inputs.staffingCosts.agencyMonthlySpend)}/month</span>
                </div>
              )}
            </div>

            <div className="h-px bg-white/10 my-4" />
            <p className="text-[10px] text-white/30 italic">Based on your inputs. Individual results vary.</p>
            <p className="text-[9px] text-white/20 mt-2">{RESEARCH_NOTE}</p>
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}
