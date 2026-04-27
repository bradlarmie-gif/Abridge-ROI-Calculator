import { useState, useMemo, useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { SwitchInputs, SwitchCalculations, CareSetting } from "@/lib/switchGapCalculator";

interface StepYourOrganizationProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

const CARE_SETTINGS: { label: string; value: CareSetting }[] = [
  { label: "Outpatient", value: "outpatient" },
  { label: "ED", value: "ed" },
  { label: "Inpatient", value: "inpatient" },
  { label: "Mixed", value: "mixed" },
];

export default function StepYourOrganization({
  inputs,
  updateInput,
  onNext,
  onBack,
  canProceed,
}: StepYourOrganizationProps) {
  const [showEstimator, setShowEstimator] = useState(false);
  const [showCareSetting, setShowCareSetting] = useState(false);

  const estimatedEncounters = useMemo(() => {
    if (inputs.providers <= 0) return 0;
    return inputs.providers * 2000;
  }, [inputs.providers]);

  const encountersPerProviderPerDay = useMemo(() => {
    if (inputs.providers <= 0 || inputs.annualEncounters <= 0) return 0;
    return Math.round((inputs.annualEncounters / inputs.providers) / 240);
  }, [inputs.providers, inputs.annualEncounters]);

  const showGuardrail = inputs.providers > 0 && inputs.annualEncounters > 0 &&
    (inputs.annualEncounters / inputs.providers) > 3500;

  const hasFirstInput = inputs.providers > 0;
  const hasBothInputs = inputs.providers > 0 && inputs.annualEncounters > 0;

  useEffect(() => {
    if (hasBothInputs && !showCareSetting) {
      setShowCareSetting(true);
    }
  }, [hasBothInputs]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12" style={{ fontFamily: "Manrope, sans-serif" }}>
      <div className="flex-1 max-w-[400px] py-20 md:py-20">
        <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-3" data-testid="text-step2-eyebrow">
          Your Organization
        </p>

        <h1 className="text-[28px] font-semibold text-[#1A1A1A] leading-[1.3] mb-3" data-testid="text-step2-headline">
          Let's establish your baseline.
        </h1>

        <p className="text-[17px] text-[#4B4B4B] leading-[1.75] mb-8">
          Three inputs. Benchmarks handle the rest.
        </p>

        <div className="space-y-8">
          <div>
            <label className="block text-[15px] font-medium text-[#1A1A1A] mb-2" data-testid="label-providers">
              Physicians and APPs using ambient AI
            </label>
            <FormattedNumberInput
              value={inputs.providers}
              onChange={(v) => updateInput("providers", v || 0)}
              className="w-full bg-white border-[1.5px] border-[#E8E8E8] rounded-lg px-4 py-3 text-[17px] text-[#1A1A1A] focus:outline-none focus:border-[#EA2C00] transition-colors"
              placeholder="providers"
              data-testid="input-providers"
            />
          </div>

          <div>
            <label className="block text-[15px] font-medium text-[#1A1A1A] mb-2" data-testid="label-encounters">
              Annual encounters where ambient is available
            </label>
            <FormattedNumberInput
              value={inputs.annualEncounters}
              onChange={(v) => {
                updateInput("annualEncounters", v || 0);
                updateInput("encountersEstimated", false);
              }}
              className="w-full bg-white border-[1.5px] border-[#E8E8E8] rounded-lg px-4 py-3 text-[17px] text-[#1A1A1A] focus:outline-none focus:border-[#EA2C00] transition-colors"
              placeholder="encounters / year"
              data-testid="input-encounters"
            />
            <button
              type="button"
              onClick={() => setShowEstimator(!showEstimator)}
              className="mt-2 text-[13px] text-[#4B4B4B] underline underline-offset-2 hover:text-[#1A1A1A] transition-colors"
              data-testid="button-help-estimate"
            >
              Help me estimate
            </button>
            {showEstimator && inputs.providers > 0 && (
              <div className="mt-3 bg-[#F7F6F4] rounded-lg p-4 text-[15px] text-[#4B4B4B]">
                <p className="mb-2">
                  <span className="font-semibold text-[#1A1A1A]">{inputs.providers.toLocaleString()}</span> providers
                  {" "}&times; 2,000 ={" "}
                  <span className="font-semibold text-[#1A1A1A]">{estimatedEncounters.toLocaleString()}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    updateInput("annualEncounters", estimatedEncounters);
                    updateInput("encountersEstimated", true);
                    setShowEstimator(false);
                  }}
                  className="px-4 py-2 bg-[#F7F6F4] border-[1.5px] border-[#1A1A1A] text-[#1A1A1A] text-[14px] font-semibold rounded-lg hover:bg-white transition-colors"
                  data-testid="button-use-estimate"
                >
                  Use this estimate
                </button>
              </div>
            )}
            {showGuardrail && (
              <p className="text-[13px] text-[#9B9B9B] mt-2" data-testid="text-guardrail">
                That's ~{encountersPerProviderPerDay} per provider per day — want to double-check this?
              </p>
            )}
          </div>

          {showCareSetting && (
            <div className="transition-all duration-300">
              <label className="block text-[15px] font-medium text-[#1A1A1A] mb-2" data-testid="label-care-setting">
                Primary care setting
              </label>
              <div className="flex flex-wrap gap-3">
                {CARE_SETTINGS.map((cs) => (
                  <button
                    key={cs.value}
                    type="button"
                    onClick={() => updateInput("careSetting", cs.value)}
                    className={`px-5 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150 ${
                      inputs.careSetting === cs.value
                        ? "bg-white border-[1.5px] border-[#1A1A1A] text-[#1A1A1A] font-semibold"
                        : "bg-[#F7F6F4] border-[1.5px] border-[#E8E8E8] text-[#4B4B4B] hover:border-[#CCCCCC]"
                    }`}
                    data-testid={`pill-setting-${cs.value}`}
                  >
                    {cs.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-10 pt-6">
          <button
            onClick={onBack}
            className="text-[14px] text-[#4B4B4B] underline underline-offset-2 hover:text-[#1A1A1A] transition-colors"
            data-testid="button-back"
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!canProceed}
            className={`inline-flex items-center gap-1.5 px-8 py-3.5 text-[15px] font-semibold rounded-[10px] transition-colors ${
              canProceed
                ? "bg-[#EA2C00] text-white hover:bg-[#C72300]"
                : "bg-[#E8E8E8] text-[#9B9B9B] cursor-not-allowed"
            }`}
            data-testid="button-next"
          >
            See My Utilization Reality
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </button>
        </div>
      </div>

      {hasFirstInput && (
        <div className="hidden lg:block w-[300px] shrink-0 py-20">
          <div className="sticky top-24 space-y-4">
            <div className="bg-[#F7F6F4] border border-[#E8E8E8] rounded-xl p-6">
              <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-4">
                What We'll Model
              </p>
              <div className="space-y-3">
                {["Capacity creation", "Revenue integrity", "Workforce stability", "Risk & compliance"].map((item) => (
                  <div key={item} className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-[#1A1A1A]" />
                    <span className="text-[15px] text-[#1A1A1A]">{item}</span>
                  </div>
                ))}
              </div>

              <div className="w-full h-px bg-[#E8E8E8] my-5" />

              <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-3">
                Baseline Recognized
              </p>
              <div className="space-y-2 text-[15px]">
                <div className="flex justify-between">
                  <span className="text-[#9B9B9B]">Providers</span>
                  <span className="text-[#1A1A1A] font-semibold" data-testid="text-rail-providers">
                    {inputs.providers > 0 ? inputs.providers.toLocaleString() : "\u2014"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9B9B9B]">Encounters</span>
                  <span className="text-[#1A1A1A] font-semibold" data-testid="text-rail-encounters">
                    {inputs.annualEncounters > 0 ? inputs.annualEncounters.toLocaleString() : "\u2014"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9B9B9B]">Setting</span>
                  <span className="text-[#1A1A1A] font-semibold" data-testid="text-rail-setting">
                    {CARE_SETTINGS.find(c => c.value === inputs.careSetting)?.label || "Outpatient"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl p-6">
              <p className="text-[15px] text-white leading-[1.7]">
                You're approximately 4 minutes from your enterprise opportunity map.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
