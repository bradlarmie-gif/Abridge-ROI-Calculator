import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingInputs } from "./nursingTypes";
import type { PathwayKey } from "./nursingTypes";
import {
  computeAllPathways,
  computeOvertimeNarrative,
  computeRetentionNarrative,
  computeAgencyNarrative,
  computeBedsideNarrative,
  PATHWAY_LABELS,
} from "./nursingCalculations";

interface Screen3Props {
  inputs: NursingInputs;
  updateInput: <K extends keyof NursingInputs>(key: K, value: NursingInputs[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

interface RadioOption {
  value: string;
  label: string;
}

function RadioGroup({ options, value, onChange, testIdPrefix }: {
  options: RadioOption[];
  value: string;
  onChange: (v: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
          <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
              value === opt.value ? "border-[#EA2C00]" : "border-[#D1D5DB] group-hover:border-[#EA2C00]/50"
            }`}
            onClick={(e) => { e.preventDefault(); onChange(opt.value); }}
          >
            {value === opt.value && <div className="w-2 h-2 rounded-full bg-[#EA2C00]" />}
          </div>
          <span className="text-sm text-[#333333]">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function PathwayCard({ pathway, inputs, updateInput, isExpanded, onToggle, isSecondary }: {
  pathway: PathwayKey;
  inputs: NursingInputs;
  updateInput: <K extends keyof NursingInputs>(key: K, value: NursingInputs[K]) => void;
  isExpanded: boolean;
  onToggle: () => void;
  isSecondary: boolean;
}) {
  const descriptions: Record<PathwayKey, string> = {
    overtime: "Nurses staying late to finish charting adds overtime cost and erodes schedule predictability.",
    retention: "Documentation burden is a contributing factor in nurse burnout and departure decisions.",
    agency: "When nurses leave, agencies fill the gap — at a premium. Retention improvements reduce this spend.",
    bedside: "Time spent on documentation is time not spent with patients. This affects safety, satisfaction, and outcomes.",
    quality: "Incomplete or inconsistent documentation creates downstream risk — in care coordination, compliance, and reimbursement.",
  };

  const getNarrative = (): string => {
    switch (pathway) {
      case "overtime": return computeOvertimeNarrative(inputs);
      case "retention": return computeRetentionNarrative(inputs);
      case "agency": return computeAgencyNarrative(inputs);
      case "bedside": return computeBedsideNarrative(inputs);
      case "quality": return "Documentation quality issues compound across the organization — affecting care transitions, survey readiness, and regulatory compliance. A deeper conversation would explore which quality dimensions create the most risk for your program.";
    }
  };

  const renderInputs = () => {
    switch (pathway) {
      case "overtime":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Is documentation-driven overtime a meaningful issue?
              </label>
              <RadioGroup
                options={[
                  { value: "yes", label: "Yes — it's a regular occurrence" },
                  { value: "somewhat", label: "Somewhat — it happens but isn't tracked" },
                  { value: "not_really", label: "Not really — charting usually finishes on time" },
                ]}
                value={inputs.otRelevance}
                onChange={(v) => updateInput("otRelevance", v)}
                testIdPrefix="radio-ot"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Estimated overtime minutes per shift from charting
              </label>
              <div className="flex items-center gap-2">
                <FormattedNumberInput
                  value={inputs.otMinPerShift}
                  onChange={(v) => updateInput("otMinPerShift", v)}
                  placeholder="e.g. 30"
                  className="bg-white text-black border-[#D1D5DB] focus:border-[#EA2C00] focus:ring-[#EA2C00]/20 h-10 rounded-lg w-28"
                  data-testid="input-ot-min"
                />
                <span className="text-xs text-[#888888]">min/shift</span>
              </div>
            </div>
          </div>
        );
      case "retention":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Annual nursing turnover rate
              </label>
              <div className="flex items-center gap-2">
                <FormattedNumberInput
                  value={inputs.turnoverRate}
                  onChange={(v) => updateInput("turnoverRate", Math.min(100, v))}
                  placeholder="e.g. 18"
                  className="bg-white text-black border-[#D1D5DB] focus:border-[#EA2C00] focus:ring-[#EA2C00]/20 h-10 rounded-lg w-28"
                  data-testid="input-turnover"
                />
                <span className="text-xs text-[#888888]">%</span>
              </div>
              <p className="text-xs text-[#999999] mt-1 italic">
                NSI reports national average ~18%
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Is documentation burden linked to retention challenges?
              </label>
              <RadioGroup
                options={[
                  { value: "yes", label: "Yes — it comes up in exit interviews or surveys" },
                  { value: "anecdotally", label: "Anecdotally — we hear it but haven't measured" },
                  { value: "not_tracked", label: "Not tracked" },
                ]}
                value={inputs.retentionRelevance}
                onChange={(v) => updateInput("retentionRelevance", v)}
                testIdPrefix="radio-retention"
              />
            </div>
          </div>
        );
      case "agency":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                How significant is your agency/travel nurse reliance?
              </label>
              <RadioGroup
                options={[
                  { value: "significant", label: "Significant — it's a major cost driver" },
                  { value: "moderate", label: "Moderate — we use them regularly" },
                  { value: "minimal", label: "Minimal — occasional use only" },
                  { value: "no", label: "We don't use agency nurses" },
                ]}
                value={inputs.agencyReliance}
                onChange={(v) => updateInput("agencyReliance", v)}
                testIdPrefix="radio-agency"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Estimated monthly agency/travel nurse spend
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#888888]">$</span>
                <FormattedNumberInput
                  value={inputs.agencyMonthlySpend}
                  onChange={(v) => updateInput("agencyMonthlySpend", v)}
                  placeholder="e.g. 150,000"
                  className="bg-white text-black border-[#D1D5DB] focus:border-[#EA2C00] focus:ring-[#EA2C00]/20 h-10 rounded-lg"
                  data-testid="input-agency-spend"
                />
                <span className="text-xs text-[#888888]">/mo</span>
              </div>
            </div>
          </div>
        );
      case "bedside":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Is increasing bedside time a strategic priority?
              </label>
              <RadioGroup
                options={[
                  { value: "key_initiative", label: "Yes — it's a key initiative" },
                  { value: "talk_about", label: "We talk about it, but it's not a formal initiative" },
                  { value: "not_focus", label: "Not a current focus" },
                ]}
                value={inputs.bedsidePriority}
                onChange={(v) => updateInput("bedsidePriority", v)}
                testIdPrefix="radio-bedside"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Do you measure or track bedside time?
              </label>
              <RadioGroup
                options={[
                  { value: "yes_tracked", label: "Yes — we track it actively" },
                  { value: "informally", label: "Informally — anecdotal awareness" },
                  { value: "no", label: "No" },
                ]}
                value={inputs.bedsideTracking}
                onChange={(v) => updateInput("bedsideTracking", v)}
                testIdPrefix="radio-bedside-track"
              />
            </div>
          </div>
        );
      case "quality":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Is documentation quality or consistency a concern?
              </label>
              <RadioGroup
                options={[
                  { value: "yes", label: "Yes — we see variability and gaps" },
                  { value: "somewhat", label: "Somewhat — it depends on the unit or shift" },
                  { value: "not_significant", label: "Not a significant concern" },
                ]}
                value={inputs.qualityConcern}
                onChange={(v) => updateInput("qualityConcern", v)}
                testIdPrefix="radio-quality"
              />
            </div>
          </div>
        );
    }
  };

  const hasAnyInput = (): boolean => {
    switch (pathway) {
      case "overtime": return !!inputs.otRelevance || inputs.otMinPerShift > 0;
      case "retention": return !!inputs.retentionRelevance || inputs.turnoverRate > 0;
      case "agency": return !!inputs.agencyReliance || inputs.agencyMonthlySpend > 0;
      case "bedside": return !!inputs.bedsidePriority;
      case "quality": return !!inputs.qualityConcern;
    }
  };

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-300 ${
        isSecondary ? "opacity-70 border-transparent" : "border-transparent"
      } ${isExpanded ? "bg-[#F5F0EB]" : "bg-[#F5F0EB]/60 hover:bg-[#F5F0EB]"}`}
      data-testid={`pathway-card-${pathway}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
        data-testid={`button-pathway-toggle-${pathway}`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-[#1A1A1A]">{PATHWAY_LABELS[pathway]}</h3>
            {isSecondary && (
              <span className="text-[10px] bg-[#E5E7EB] text-[#888888] rounded-full px-2 py-0.5">
                Not yet signaled
              </span>
            )}
            {hasAnyInput() && !isSecondary && (
              <span className="text-[10px] bg-[#EA2C00]/10 text-[#EA2C00] rounded-full px-2 py-0.5">
                Explored
              </span>
            )}
          </div>
          <p className="text-sm text-[#666666]">{descriptions[pathway]}</p>
        </div>
        <div className="flex-shrink-0 ml-4">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#888888]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#888888]" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-6">
              <div className="h-px bg-[#E5E7EB]" />

              <div>
                <p className="text-xs font-medium text-[#EA2C00] uppercase tracking-[1.5px] mb-4">
                  Explore This Pathway
                </p>
                {renderInputs()}
              </div>

              {hasAnyInput() && (
                <div className="bg-white/80 rounded-lg p-5 border border-[#E5E7EB]">
                  <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                    What This Pathway Means
                  </p>
                  <p className="text-sm text-[#333333] leading-relaxed italic">
                    {getNarrative()}
                  </p>
                  <p className="text-[10px] text-[#999999] mt-3">
                    Estimates based on your inputs. Individual results vary.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NursingScreen3Pathways({ inputs, updateInput, onNext, onBack }: Screen3Props) {
  const pathways = useMemo(() => computeAllPathways(inputs), [inputs]);
  const [expandedPathway, setExpandedPathway] = useState<PathwayKey | null>(
    pathways.length > 0 ? pathways[0].key : null
  );

  const burdenSignaled = new Set(
    pathways.filter(p => p.relevance !== "low").map(p => p.key)
  );

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
            data-testid="text-nursing-pathways-headline"
          >
            Where Could Reduced Documentation Burden Create Value?
          </h1>
          <p className="text-base text-[#888888]">
            Based on your burden profile, explore the pathways most relevant to your organization.
          </p>
        </motion.div>

        <motion.div className="space-y-3" variants={staggerItem}>
          {pathways.map((p) => (
            <PathwayCard
              key={p.key}
              pathway={p.key}
              inputs={inputs}
              updateInput={updateInput}
              isExpanded={expandedPathway === p.key}
              onToggle={() => setExpandedPathway(expandedPathway === p.key ? null : p.key)}
              isSecondary={!burdenSignaled.has(p.key)}
            />
          ))}
        </motion.div>

        <StepFooter
          onBack={onBack}
          onNext={onNext}
          nextLabel="View Pathway Summary"
          nextTestId="button-nursing-next-3"
          backTestId="button-nursing-back-3"
        />
      </motion.div>
    </div>
  );
}
