import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import type { SwitchInputs, SwitchCalculations, SpecialtyMix } from "@/lib/switchGapCalculator";

interface StepYourOrganizationProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

const specialtyOptions: { label: string; value: SpecialtyMix; testId: string }[] = [
  { label: "Primary Care heavy", value: "primary-care", testId: "toggle-specialty-primary" },
  { label: "Balanced", value: "balanced", testId: "toggle-specialty-balanced" },
  { label: "Specialty heavy", value: "specialty", testId: "toggle-specialty-specialty" },
];

export default function StepYourOrganization({
  inputs,
  updateInput,
  onNext,
  onBack,
  canProceed,
}: StepYourOrganizationProps) {
  return (
    <div className={`space-y-10 ${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="text-left">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
          data-testid="text-page-title"
        >
          Your Organization
        </h1>
        <p className="text-base text-[#888888] leading-relaxed">
          Let's start with the basics.
        </p>
      </div>

      <section className="bg-[#F5F0EB] rounded-xl p-6 border border-[#E8E0D8]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
            <label className="block text-xs text-[#666666] mb-2">
              Providers using ambient AI
            </label>
            <FormattedNumberInput
              value={inputs.providers}
              onChange={(v) => updateInput("providers", v || 0)}
              className="w-full text-lg font-semibold text-[#1A1A1A] bg-white border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
              placeholder="e.g. 50"
              data-testid="input-providers"
            />
            <p className="text-[11px] text-[#999999] mt-1">
              Physicians, APPs, or other clinicians with AI access
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
            <label className="block text-xs text-[#666666] mb-2">
              Annual encounters
            </label>
            <FormattedNumberInput
              value={inputs.annualEncounters}
              onChange={(v) => updateInput("annualEncounters", v || 0)}
              className="w-full text-lg font-semibold text-[#1A1A1A] bg-white border border-[#D1D5DB] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00]"
              placeholder="e.g. 100,000"
              data-testid="input-encounters"
            />
            <p className="text-[11px] text-[#999999] mt-1">
              Total visits where AI could be used for documentation
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F0EB] rounded-xl p-6 border border-[#E8E0D8]">
        <label className="block text-xs text-[#666666] mb-3">
          Specialty mix
        </label>
        <div className="flex flex-wrap gap-3">
          {specialtyOptions.map((opt) => {
            const isSelected = inputs.specialtyMix === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateInput("specialtyMix", opt.value)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-[#EA2C00] text-white"
                    : "bg-white text-[#333333] border border-[#E5E7EB]"
                }`}
                data-testid={opt.testId}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-[#999999] mt-3">
          Helps us calibrate. Different specialties have different documentation patterns.
        </p>
      </section>

      <p className="text-xs text-[#999999] text-center italic">
        These inputs shape every calculation that follows. Directionally right is more useful than precisely wrong.
      </p>

      <StepFooter onBack={onBack} onNext={onNext} nextLabel="Next" nextDisabled={!canProceed} />
    </div>
  );
}
