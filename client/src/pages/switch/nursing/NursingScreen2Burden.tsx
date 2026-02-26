import { useMemo } from "react";
import { motion } from "framer-motion";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingInputs } from "./nursingTypes";
import { BURDEN_INDICATORS } from "./nursingTypes";
import { totalDocMinPerShift } from "./nursingCalculations";

interface Screen2Props {
  inputs: NursingInputs;
  updateInput: <K extends keyof NursingInputs>(key: K, value: NursingInputs[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function NursingScreen2Burden({ inputs, updateInput, onNext, onBack }: Screen2Props) {
  const totalMin = useMemo(() => totalDocMinPerShift(inputs), [inputs]);
  const indicatorCount = inputs.burdenIndicators.length;

  const toggleIndicator = (id: string) => {
    const current = inputs.burdenIndicators;
    if (current.includes(id)) {
      updateInput("burdenIndicators", current.filter(i => i !== id));
    } else {
      updateInput("burdenIndicators", [...current, id]);
    }
  };

  const topAreas = useMemo(() => {
    const groups: Record<string, string[]> = {
      "Overtime & Cost": ["overtime_late", "ot_budget"],
      "Retention & Engagement": ["engagement_surveys", "experienced_frustration", "exit_interviews"],
      "Staffing": ["agency_reliance", "onboarding_struggle"],
      "Care Quality": ["bedside_time", "flowsheet_completeness", "handoff_quality"],
    };
    const active: string[] = [];
    for (const [group, ids] of Object.entries(groups)) {
      if (ids.some(id => inputs.burdenIndicators.includes(id))) {
        active.push(group);
      }
    }
    return active;
  }, [inputs.burdenIndicators]);

  return (
    <div className={`flex flex-col lg:flex-row gap-8 ${STEP_FOOTER_SPACER_CLASS}`}>
      <motion.div
        className="flex-1 max-w-[700px]"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="text-center mb-8" variants={staggerItem}>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-nursing-burden-headline"
          >
            Understanding Your Documentation Burden
          </h1>
          <p className="text-base text-[#888888]">
            How much time goes to charting — and where does the burden show up?
          </p>
        </motion.div>

        <motion.div variants={staggerItem} className="mb-8">
          <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              Documentation Time Per Shift
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Flowsheets & assessments
                </label>
                <div className="flex items-center gap-2">
                  <FormattedNumberInput
                    value={inputs.docTimeFlowsheets}
                    onChange={(v) => updateInput("docTimeFlowsheets", v)}
                    placeholder="0"
                    className="bg-white text-black border-[#D1D5DB] focus:border-[#EA2C00] focus:ring-[#EA2C00]/20 h-11 rounded-lg"
                    data-testid="input-doc-flowsheets"
                  />
                  <span className="text-xs text-[#888888] whitespace-nowrap">min</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Care plans
                </label>
                <div className="flex items-center gap-2">
                  <FormattedNumberInput
                    value={inputs.docTimeCare}
                    onChange={(v) => updateInput("docTimeCare", v)}
                    placeholder="0"
                    className="bg-white text-black border-[#D1D5DB] focus:border-[#EA2C00] focus:ring-[#EA2C00]/20 h-11 rounded-lg"
                    data-testid="input-doc-care"
                  />
                  <span className="text-xs text-[#888888] whitespace-nowrap">min</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Handoff documentation
                </label>
                <div className="flex items-center gap-2">
                  <FormattedNumberInput
                    value={inputs.docTimeHandoff}
                    onChange={(v) => updateInput("docTimeHandoff", v)}
                    placeholder="0"
                    className="bg-white text-black border-[#D1D5DB] focus:border-[#EA2C00] focus:ring-[#EA2C00]/20 h-11 rounded-lg"
                    data-testid="input-doc-handoff"
                  />
                  <span className="text-xs text-[#888888] whitespace-nowrap">min</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Other charting
                </label>
                <div className="flex items-center gap-2">
                  <FormattedNumberInput
                    value={inputs.docTimeOther}
                    onChange={(v) => updateInput("docTimeOther", v)}
                    placeholder="0"
                    className="bg-white text-black border-[#D1D5DB] focus:border-[#EA2C00] focus:ring-[#EA2C00]/20 h-11 rounded-lg"
                    data-testid="input-doc-other"
                  />
                  <span className="text-xs text-[#888888] whitespace-nowrap">min</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between bg-white/60 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-black">Total per shift</span>
              <span className="text-lg font-bold text-[#EA2C00] font-mono" data-testid="text-total-doc-min">
                {totalMin > 0 ? `${totalMin} min` : "—"}
              </span>
            </div>
            <p className="text-xs text-[#999999] mt-2 italic">
              Most organizations report 2–3 hours per shift (120–180 min)
            </p>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
              Where the Burden Shows Up
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />
            <p className="text-sm text-[#666666] mb-5">
              Check any that apply to your organization today.
            </p>

            <div className="space-y-3">
              {BURDEN_INDICATORS.map((indicator) => {
                const isChecked = inputs.burdenIndicators.includes(indicator.id);
                return (
                  <div
                    key={indicator.id}
                    className="flex items-start gap-3 cursor-pointer group"
                    data-testid={`checkbox-burden-${indicator.id}`}
                    onClick={() => toggleIndicator(indicator.id)}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggleIndicator(indicator.id); }}}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-[#EA2C00] border-[#EA2C00]"
                            : "border-[#D1D5DB] group-hover:border-[#EA2C00]/50"
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-[#333333] leading-snug select-none">{indicator.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <StepFooter
          onBack={onBack}
          onNext={onNext}
          nextLabel="Explore Value Pathways"
          nextTestId="button-nursing-next-2"
          backTestId="button-nursing-back-2"
        />
      </motion.div>

      <motion.aside
        className="w-full lg:w-[320px] lg:sticky lg:top-24 self-start"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="bg-[#1A1A1A] text-white rounded-xl p-6 space-y-5">
          <p className="text-[9px] font-semibold uppercase tracking-[2px] text-[#EA2C00]">
            Burden Profile
          </p>
          <div className="h-px bg-white/10" />

          <div>
            <p className="text-xs text-[#888888] mb-1">Documentation time / shift</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-sidebar-doc-time">
              {totalMin > 0 ? `${totalMin} min` : "—"}
            </p>
            {totalMin > 0 && (
              <p className="text-[10px] text-[#666666] mt-1">
                {(totalMin / 60).toFixed(1)} hours per shift
              </p>
            )}
          </div>

          <div className="h-px bg-white/10" />

          <div>
            <p className="text-xs text-[#888888] mb-1">Burden indicators</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-sidebar-indicator-count">
              {indicatorCount > 0 ? `${indicatorCount} of 10` : "—"}
            </p>
          </div>

          {topAreas.length > 0 && (
            <>
              <div className="h-px bg-white/10" />
              <div>
                <p className="text-xs text-[#888888] mb-2">Areas signaled</p>
                <div className="flex flex-wrap gap-1.5">
                  {topAreas.map(area => (
                    <span key={area} className="text-[10px] bg-white/10 rounded-full px-2.5 py-1 text-[#CCCCCC]">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.aside>
    </div>
  );
}
