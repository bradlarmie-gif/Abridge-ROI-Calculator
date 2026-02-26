import { useMemo } from "react";
import { motion } from "framer-motion";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingInputs } from "./nursingTypes";
import { computeAllPathways, generateSummaryNarrative } from "./nursingCalculations";

interface Screen4Props {
  inputs: NursingInputs;
  onNext: () => void;
  onBack: () => void;
}

const RELEVANCE_COLORS: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-[#EA2C00]/10", text: "text-[#EA2C00]" },
  moderate: { bg: "bg-amber-100", text: "text-amber-700" },
  low: { bg: "bg-gray-100", text: "text-gray-500" },
};

const DATA_COLORS: Record<string, { bg: string; text: string }> = {
  yes: { bg: "bg-emerald-100", text: "text-emerald-700" },
  some: { bg: "bg-blue-100", text: "text-blue-700" },
  limited: { bg: "bg-amber-100", text: "text-amber-700" },
  no: { bg: "bg-gray-100", text: "text-gray-500" },
};

export default function NursingScreen4Summary({ inputs, onNext, onBack }: Screen4Props) {
  const pathways = useMemo(() => computeAllPathways(inputs), [inputs]);
  const narrative = useMemo(() => generateSummaryNarrative(pathways, inputs), [pathways, inputs]);

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        className="max-w-[800px] mx-auto"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="text-center mb-8" variants={staggerItem}>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-nursing-summary-headline"
          >
            Your Value Pathway Profile
          </h1>
          <p className="text-base text-[#888888]">
            Where your burden creates the most opportunity for measurable impact.
          </p>
        </motion.div>

        <motion.div variants={staggerItem} className="mb-8">
          <div className="bg-[#F5F0EB] rounded-xl p-8">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-4">
              Pathway Relevance
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />

            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-pathway-relevance">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="text-left text-xs font-medium text-[#888888] uppercase tracking-wider pb-3 pr-4">
                      Pathway
                    </th>
                    <th className="text-center text-xs font-medium text-[#888888] uppercase tracking-wider pb-3 px-4">
                      Relevance
                    </th>
                    <th className="text-center text-xs font-medium text-[#888888] uppercase tracking-wider pb-3 pl-4">
                      Data Available
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pathways.map((p, i) => {
                    const relColor = RELEVANCE_COLORS[p.relevance];
                    const dataColor = DATA_COLORS[p.dataAvailable];
                    return (
                      <tr
                        key={p.key}
                        className={i < pathways.length - 1 ? "border-b border-[#E5E7EB]/50" : ""}
                        data-testid={`row-pathway-${p.key}`}
                      >
                        <td className="py-4 pr-4">
                          <span className="text-sm font-medium text-[#1A1A1A]">{p.label}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`inline-block text-xs font-medium rounded-full px-3 py-1 ${relColor.bg} ${relColor.text}`}>
                            {p.relevance.charAt(0).toUpperCase() + p.relevance.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 pl-4 text-center">
                          <span className={`inline-block text-xs font-medium rounded-full px-3 py-1 ${dataColor.bg} ${dataColor.text}`}>
                            {p.dataAvailable === "no" ? "No" : p.dataAvailable.charAt(0).toUpperCase() + p.dataAvailable.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="bg-[#1A1A1A] text-white rounded-xl p-8">
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-4">
              Your Assessment
            </p>
            <div className="h-px bg-white/10 mb-5" />
            <p className="text-sm leading-relaxed text-[#CCCCCC]" data-testid="text-summary-narrative">
              {narrative}
            </p>
          </div>
        </motion.div>

        <StepFooter
          onBack={onBack}
          onNext={onNext}
          nextLabel="Next Steps"
          nextTestId="button-nursing-next-4"
          backTestId="button-nursing-back-4"
        />
      </motion.div>
    </div>
  );
}
