import { motion } from "framer-motion";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import { staggerContainer, staggerItem } from "@/components/PageTransition";
import type { NursingBaselineInputs } from "./nursingTypes";
import { derivePatientDays, deriveShiftsPerYear } from "./nursingCalculations";

interface Screen1Props {
  baseline: NursingBaselineInputs;
  updateBaseline: <K extends keyof NursingBaselineInputs>(key: K, value: NursingBaselineInputs[K]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function NursingScreen1Program({ baseline, updateBaseline, onNext, onBack }: Screen1Props) {
  const patientDays = derivePatientDays(baseline);
  const shiftsPerYear = deriveShiftsPerYear(baseline);
  const canProceed = baseline.staffedBeds > 0 && baseline.nurseFTEs > 0;

  return (
    <div className={STEP_FOOTER_SPACER_CLASS}>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col lg:flex-row gap-10"
      >
        <motion.div className="flex-1 max-w-[640px]" variants={staggerItem}>
          <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#EA2C00] mb-2">
            Your Nursing Program
          </p>
          <h1
            className="text-2xl md:text-3xl font-bold text-black mb-2 font-abridge uppercase tracking-tight"
            data-testid="text-nursing-program-headline"
          >
            Tell us about your organization
          </h1>
          <p className="text-base text-[#888888] mb-8 max-w-md leading-relaxed">
            These three numbers let us frame the conversation around your organization's scale.
          </p>

          <div className="space-y-6">
            <div className="bg-[#F5F0EB] rounded-xl p-6">
              <label className="block text-sm font-medium text-black mb-2">Staffed beds</label>
              <FormattedNumberInput
                value={baseline.staffedBeds}
                onChange={(v) => updateBaseline("staffedBeds", v)}
                placeholder="e.g. 300"
                data-testid="input-staffed-beds"
              />
            </div>

            <div className="bg-[#F5F0EB] rounded-xl p-6">
              <label className="block text-sm font-medium text-black mb-2">Nurse FTEs in scope</label>
              <FormattedNumberInput
                value={baseline.nurseFTEs}
                onChange={(v) => updateBaseline("nurseFTEs", v)}
                placeholder="e.g. 200"
                data-testid="input-nurse-ftes"
              />
            </div>

            <div className="bg-[#F5F0EB] rounded-xl p-6">
              <label className="block text-sm font-medium text-black mb-2">
                Bed occupancy rate
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={baseline.bedOccupancy}
                  onChange={(e) => updateBaseline("bedOccupancy", Number(e.target.value))}
                  className="flex-1 accent-[#EA2C00]"
                  data-testid="slider-bed-occupancy"
                />
                <span className="text-lg font-bold text-[#1A1A1A] min-w-[48px] text-right" data-testid="text-bed-occupancy">
                  {baseline.bedOccupancy}%
                </span>
              </div>
              <p className="text-xs text-[#999999] mt-2">Most hospitals run 75–90%</p>
            </div>
          </div>

          <div className="mt-8">
            <StepFooter
              onBack={onBack}
              onNext={onNext}
              nextLabel="Continue →"
              nextDisabled={!canProceed}
              nextTestId="button-nursing-next-1"
              backTestId="button-nursing-back-1"
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
              Your Baseline
            </p>
            <div className="h-px bg-white/10 mb-4" />

            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-[1.5px] mb-1">Patient days / year</p>
                <p className="text-xl font-bold text-white" data-testid="text-patient-days">
                  {baseline.staffedBeds > 0 ? patientDays.toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-[1.5px] mb-1">Shifts / year</p>
                <p className="text-xl font-bold text-white" data-testid="text-shifts-year">
                  {baseline.nurseFTEs > 0 ? shiftsPerYear.toLocaleString() : "—"}
                </p>
              </div>
            </div>
          </div>
        </motion.aside>
      </motion.div>
    </div>
  );
}
