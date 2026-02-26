import { useMemo } from "react";
import { motion } from "framer-motion";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingInputs } from "./nursingTypes";
import { derivePatientDays, deriveShiftsPerYear } from "./nursingCalculations";

interface Screen1Props {
  inputs: NursingInputs;
  updateInput: <K extends keyof NursingInputs>(key: K, value: NursingInputs[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function NursingScreen1Program({ inputs, updateInput, onNext, onBack }: Screen1Props) {
  const canProceed = inputs.staffedBeds > 0 && inputs.nurseFTEs > 0;
  const patientDays = useMemo(() => derivePatientDays(inputs), [inputs]);
  const shiftsPerYear = useMemo(() => deriveShiftsPerYear(inputs), [inputs]);

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
            data-testid="text-nursing-program-headline"
          >
            Your Nursing Program
          </h1>
          <p className="text-base text-[#888888]">
            Three inputs help us understand your organization's scale.
          </p>
        </motion.div>

        <motion.div variants={staggerItem}>
          <div className="bg-[#F5F0EB] rounded-lg p-8 md:p-10">
            <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2" data-testid="text-nursing-label">
              Program Profile
            </p>
            <div className="h-px bg-[#E5E7EB] mb-6" />

            <div className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Staffed beds
                </label>
                <FormattedNumberInput
                  value={inputs.staffedBeds}
                  onChange={(v) => updateInput("staffedBeds", v)}
                  placeholder="e.g. 300"
                  className="bg-white text-black border-[#D1D5DB] focus:border-[#EA2C00] focus:ring-[#EA2C00]/20 text-lg h-12 rounded-lg"
                  data-testid="input-staffed-beds"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Nurse FTEs in scope
                </label>
                <FormattedNumberInput
                  value={inputs.nurseFTEs}
                  onChange={(v) => updateInput("nurseFTEs", v)}
                  placeholder="e.g. 200"
                  className="bg-white text-black border-[#D1D5DB] focus:border-[#EA2C00] focus:ring-[#EA2C00]/20 text-lg h-12 rounded-lg"
                  data-testid="input-nurse-ftes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Average bed occupancy rate
                </label>
                <div className="flex items-center gap-3">
                  <FormattedNumberInput
                    value={inputs.bedOccupancy}
                    onChange={(v) => updateInput("bedOccupancy", Math.min(100, v))}
                    placeholder="80"
                    className="bg-white text-black border-[#D1D5DB] focus:border-[#EA2C00] focus:ring-[#EA2C00]/20 text-lg h-12 rounded-lg w-28"
                    data-testid="input-bed-occupancy"
                  />
                  <span className="text-sm text-[#888888]">%</span>
                </div>
                <p className="text-xs text-[#999999] mt-2 italic">
                  Most hospitals run 75–90%
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <StepFooter
          onBack={onBack}
          onNext={onNext}
          nextLabel="Explore Documentation Burden"
          nextDisabled={!canProceed}
          nextTestId="button-nursing-next-1"
          backTestId="button-nursing-back-1"
        />
      </motion.div>

      {(inputs.staffedBeds > 0 || inputs.nurseFTEs > 0) && (
        <motion.aside
          className="w-full lg:w-[320px] lg:sticky lg:top-24 self-start"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="bg-[#1A1A1A] text-white rounded-xl p-6 space-y-5">
            <p className="text-[9px] font-semibold uppercase tracking-[2px] text-[#EA2C00]">
              Your Scale
            </p>
            <div className="h-px bg-white/10" />

            <div>
              <p className="text-xs text-[#888888] mb-1">Patient days / year</p>
              <p className="text-2xl font-bold font-mono" data-testid="text-patient-days">
                {patientDays > 0 ? patientDays.toLocaleString() : "—"}
              </p>
              {inputs.staffedBeds > 0 && inputs.bedOccupancy > 0 && (
                <p className="text-[10px] text-[#666666] mt-1 font-mono">
                  {inputs.staffedBeds} beds × {inputs.bedOccupancy}% × 365
                </p>
              )}
            </div>

            <div className="h-px bg-white/10" />

            <div>
              <p className="text-xs text-[#888888] mb-1">Shifts / year</p>
              <p className="text-2xl font-bold font-mono" data-testid="text-shifts-year">
                {shiftsPerYear > 0 ? shiftsPerYear.toLocaleString() : "—"}
              </p>
              {inputs.nurseFTEs > 0 && (
                <p className="text-[10px] text-[#666666] mt-1 font-mono">
                  {inputs.nurseFTEs} FTEs × ~243 shifts/yr
                </p>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </div>
  );
}
