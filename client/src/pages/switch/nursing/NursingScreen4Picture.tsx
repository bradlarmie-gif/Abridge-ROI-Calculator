import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingPriority, NursingBaselineInputs, AllPriorityInputs } from "./nursingTypes";
import { PRIORITY_CONFIGS } from "./nursingTypes";
import {
  buildPrioritySummary,
  countDataPoints,
  deriveShiftsPerYear,
  fmtDollar,
  computeRetentionImpact,
  computeStaffingImpact,
  RESEARCH_NOTE,
} from "./nursingCalculations";

interface Screen4Props {
  baseline: NursingBaselineInputs;
  selectedPriorities: NursingPriority[];
  inputs: AllPriorityInputs;
  onNext: () => void;
  onBack: () => void;
}

export default function NursingScreen4Picture({
  baseline,
  selectedPriorities,
  inputs,
  onNext,
  onBack,
}: Screen4Props) {
  const summaries = useMemo(
    () => selectedPriorities.map(p => buildPrioritySummary(p, inputs, baseline)),
    [selectedPriorities, inputs, baseline],
  );
  const dataPoints = useMemo(() => countDataPoints(selectedPriorities, inputs), [selectedPriorities, inputs]);
  const unselected = PRIORITY_CONFIGS.filter(c => !selectedPriorities.includes(c.id));
  const shiftsPerYear = deriveShiftsPerYear(baseline);

  const retentionImpact = computeRetentionImpact(inputs.retention, baseline);
  const staffingImpact = computeStaffingImpact(inputs.staffingCosts, baseline);

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
            Your Strategic Picture
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-picture-headline"
          >
            Here's what you told us
          </h1>
          <p className="text-base text-[#888888] mb-8 max-w-xl leading-relaxed">
            Your nursing program's priorities and how documentation burden connects to each one.
          </p>

          <div className="space-y-6">
            {summaries.map(s => {
              const config = PRIORITY_CONFIGS.find(c => c.id === s.priority)!;
              return (
                <motion.div
                  key={s.priority}
                  variants={staggerItem}
                  className="bg-[#F5F0EB] rounded-xl p-6 md:p-8"
                  data-testid={`card-summary-${s.priority}`}
                >
                  <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wide mb-3">{config.title}</h3>
                  <p className="text-sm text-[#333333] leading-relaxed mb-3">{s.situation}</p>
                  <p className="text-sm text-[#666666] leading-relaxed italic">{s.connection}</p>
                </motion.div>
              );
            })}
          </div>

          {unselected.length > 0 && (
            <motion.div variants={staggerItem} className="mt-8">
              <div className="bg-[#F9F9F9] border border-[#E5E7EB] rounded-xl p-6 md:p-8">
                <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#999999] mb-3">
                  Not Selected as Current Priorities
                </p>
                <p className="text-sm text-[#999999] mb-2">
                  {unselected.map(c => c.title).join(' \u00b7 ')}
                </p>
                <p className="text-xs text-[#AAAAAA] leading-relaxed">
                  These weren't identified as priorities for your nursing program right now. Your strategic picture focuses on what matters to your organization today.
                </p>
              </div>
            </motion.div>
          )}

          <div className="mt-8">
            <StepFooter
              onBack={onBack}
              onNext={onNext}
              nextLabel="See Recommended Focus"
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
              Your Assessment
            </p>
            <div className="h-px bg-white/10 mb-4" />

            <div className="space-y-2 text-xs mb-3">
              <div className="flex justify-between">
                <span className="text-white/40">Priorities selected</span>
                <span className="text-white font-medium" data-testid="text-sidebar-priority-count">{selectedPriorities.length} of 6</span>
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
