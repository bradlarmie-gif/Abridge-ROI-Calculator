import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState, type TimeDriverInputs } from "./ExploreFlow";

interface ExploreTimeAllocationProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

type BucketField = keyof TimeDriverInputs;

interface BucketConfig {
  field: BucketField;
  label: string;
  description: string;
  color: string;
}

function getBuckets(careSetting: string): BucketConfig[] {
  switch (careSetting) {
    case 'ed':
      return [
        {
          field: 'edAllocThroughputPercent',
          label: 'Patient throughput',
          description: 'Faster documentation means faster disposition — fewer walkouts, more capacity',
          color: '#EA2C00',
        },
        {
          field: 'edAllocCostPercent',
          label: 'Reduce premium staffing',
          description: 'Less reliance on overtime and agency coverage during high-volume shifts',
          color: '#F07B5F',
        },
        {
          field: 'edAllocWellbeingPercent',
          label: 'Clinician wellbeing',
          description: 'Shift sustainability that reduces burnout and supports emergency physician retention',
          color: '#1A1A1A',
        },
      ];
    case 'inpatient':
      return [
        {
          field: 'ipAllocQualityPercent',
          label: 'Documentation quality',
          description: 'Better notes mean fewer CDI queries, more accurate DRGs, and stronger clinical records',
          color: '#EA2C00',
        },
        {
          field: 'ipAllocCostPercent',
          label: 'Cost reduction',
          description: 'Operational efficiency gains from reduced documentation overhead',
          color: '#F07B5F',
        },
        {
          field: 'ipAllocWellbeingPercent',
          label: 'Clinician wellbeing',
          description: 'Sustainable workload that protects hospitalist retention and reduces burnout',
          color: '#1A1A1A',
        },
      ];
    case 'nursing':
      return [
        {
          field: 'nursingOtReductionPercent',
          label: 'Overtime reduction',
          description: 'Time that directly reduces end-of-shift overtime',
          color: '#EA2C00',
        },
        {
          field: 'nursingShiftSustainabilityPercent',
          label: 'Shift sustainability',
          description: 'Time absorbed into shift breathing room; reduces documentation stress and supports retention',
          color: '#F07B5F',
        },
        {
          field: 'nursingCareTimePercent',
          label: 'Direct patient care',
          description: 'Time returned to the bedside for assessments, interventions, and presence',
          color: '#1A1A1A',
        },
      ];
    default:
      return [
        {
          field: 'opAllocCapacityPercent',
          label: 'See more patients',
          description: 'Time converted to additional patient visits and reduced wait times',
          color: '#EA2C00',
        },
        {
          field: 'opAllocCostPercent',
          label: 'Reduce locums & overtime',
          description: 'Time that offsets premium labor costs and extended hours',
          color: '#F07B5F',
        },
        {
          field: 'opAllocWellbeingPercent',
          label: 'Clinician wellbeing',
          description: 'Breathing room that reduces burnout, supports work-life balance, and protects retention',
          color: '#1A1A1A',
        },
      ];
  }
}

function getIntroCopy(careSetting: string): string {
  switch (careSetting) {
    case 'ed':
      return "You've estimated how much documentation time Abridge saves your emergency physicians. Now decide how that time gets used — different allocations drive different kinds of value.";
    case 'inpatient':
      return "You've estimated how much documentation time Abridge saves your hospitalists. Now decide how that time gets used — different allocations drive different kinds of value.";
    case 'nursing':
      return "You've estimated how much documentation time Abridge saves your nurses. Now decide how that time gets used — different allocations drive different kinds of value.";
    default:
      return "You've estimated how much documentation time Abridge saves your clinicians. Now decide how that time gets used — different allocations drive different kinds of value.";
  }
}

export default function ExploreTimeAllocation({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: ExploreTimeAllocationProps) {
  const { timeDriverInputs } = state;
  const buckets = useMemo(() => getBuckets(state.careSetting), [state.careSetting]);
  const introCopy = useMemo(() => getIntroCopy(state.careSetting), [state.careSetting]);

  const updateTimeDriverInputs = (updates: Partial<typeof timeDriverInputs>) => {
    updateState({
      timeDriverInputs: { ...timeDriverInputs, ...updates },
    });
  };

  const total = useMemo(() => {
    return buckets.reduce((sum, bucket) => sum + (timeDriverInputs[bucket.field] as number), 0);
  }, [buckets, timeDriverInputs]);

  const isValid = total === 100;

  const totalColor = isValid ? 'text-[#1A1A1A]' : total > 100 ? 'text-[#EA2C00]' : 'text-[#888888]';
  const barBgColor = isValid ? 'bg-[#F5F0EB]' : total > 100 ? 'bg-[#EA2C00]/5' : 'bg-[#F5F0EB]';

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <UnifiedHeader
        pathType="explore"
        currentStep={4}
        totalSteps={8}
        stepName="Time Allocation"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
            STEP 4 — TIME ALLOCATION
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-3">
            Where Does Reclaimed Time Go?
          </h1>
          <p className="text-base text-[#666666] leading-relaxed max-w-2xl">
            {introCopy}
          </p>
        </motion.div>

        <motion.div
          className={`rounded-lg p-4 sm:p-6 mb-6 ${barBgColor} transition-colors duration-300`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-[#444444]">Allocation</span>
            <span className={`text-sm font-semibold ${totalColor} transition-colors duration-300`} data-testid="text-allocation-total">
              {total}% of 100%
            </span>
          </div>
          <div className="h-4 bg-white rounded-full overflow-hidden flex shadow-inner" data-testid="budget-bar">
            {buckets.map((bucket) => {
              const pct = timeDriverInputs[bucket.field] as number;
              return pct > 0 ? (
                <div
                  key={bucket.field}
                  className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: bucket.color,
                  }}
                />
              ) : null;
            })}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {buckets.map((bucket) => (
              <div key={bucket.field} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                <span className="text-xs text-[#666666]">{bucket.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="bg-[#F5F0EB] rounded-lg p-5 sm:p-8 md:p-10 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="space-y-6">
            {buckets.map((bucket) => (
              <div key={bucket.field} className="bg-white rounded-lg p-4 sm:p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: bucket.color }}
                      />
                      <span className="text-base font-semibold text-black">{bucket.label}</span>
                    </div>
                    <p className="text-sm text-[#888888] leading-relaxed">{bucket.description}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <FormattedNumberInput
                      value={timeDriverInputs[bucket.field] as number}
                      onChange={(v: number) =>
                        updateTimeDriverInputs({ [bucket.field]: Math.max(0, Math.min(100, v)) })
                      }
                      className="h-10 w-20 text-center text-lg font-semibold bg-white border border-[#E5E5E5] rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]/20"
                      data-testid={`input-allocation-${bucket.field}`}
                    />
                    <span className="text-base text-[#888888] font-medium">%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isValid && (
            <motion.p
              className="text-sm font-medium mt-4 text-[#EA2C00]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              data-testid="text-allocation-warning"
            >
              {total > 100
                ? `Your allocation adds up to ${total}%. Remove ${total - 100}% to continue.`
                : `Your allocation adds up to ${total}%. Add ${100 - total}% to continue.`}
            </motion.p>
          )}

          <p className="text-xs text-[#888888] italic mt-5">
            Not all reclaimed time creates direct dollar value — some makes shifts more sustainable. That's real value too, just harder to count.
          </p>
        </motion.div>

        <motion.div
          className="flex items-center justify-between pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            variant="outline"
            onClick={onBack}
            className="border-[#E5E5E5] text-[#888888] hover:text-black"
            data-testid="button-back"
          >
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={!isValid}
            className="bg-[#EA2C00] hover:bg-[#D42600] text-white px-8 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-continue"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
