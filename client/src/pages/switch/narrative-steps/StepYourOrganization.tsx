import { useState, useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import StepFooter, { STEP_FOOTER_SPACER_CLASS } from "@/components/StepFooter";
import type { SwitchInputs, SwitchCalculations, SpecialtyMix, CareSetting, DataMode, CurrentVendor } from "@/lib/switchGapCalculator";
import { Users, Stethoscope, DollarSign, ShieldCheck, ChevronDown, ChevronUp, Clock, Check } from "lucide-react";

interface StepYourOrganizationProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
  canProceed: boolean;
}

const PROVIDER_PRESETS = [
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "100", value: 100 },
  { label: "250", value: 250 },
];

const ENCOUNTER_PRESETS = [
  { label: "25k", value: 25000 },
  { label: "50k", value: 50000 },
  { label: "100k", value: 100000 },
  { label: "250k", value: 250000 },
];

const ENCOUNTERS_PER_DAY_PRESETS = [
  { label: "14", value: 14 },
  { label: "18", value: 18 },
  { label: "22", value: 22 },
];

const CLINIC_DAYS_PRESETS = [
  { label: "200", value: 200 },
  { label: "220", value: 220 },
  { label: "240", value: 240 },
];

const CARE_SETTINGS: { label: string; value: CareSetting }[] = [
  { label: "Outpatient", value: "outpatient" },
  { label: "ED", value: "ed" },
  { label: "Inpatient", value: "inpatient" },
  { label: "Mixed", value: "mixed" },
];

const SPECIALTY_OPTIONS: { label: string; value: SpecialtyMix }[] = [
  { label: "Primary care-heavy", value: "primary-care" },
  { label: "Balanced", value: "balanced" },
  { label: "Specialty-heavy", value: "specialty" },
];

const VENDOR_OPTIONS: { label: string; value: CurrentVendor }[] = [
  { label: "DAX", value: "dax" },
  { label: "Other", value: "other" },
  { label: "None", value: "none" },
];

const DATA_MODE_OPTIONS: { label: string; value: DataMode; description: string }[] = [
  { label: "Benchmark-only", value: "benchmark", description: "Conservative industry defaults" },
  { label: "Estimated", value: "estimated", description: "Internal estimates where available" },
  { label: "Measured", value: "measured", description: "Verified deployment data" },
];

function PresetChips({
  options,
  value,
  onChange,
  testIdPrefix,
  showCustom = false,
  isCustomActive = false,
  onCustomClick,
}: {
  options: { label: string; value: number }[];
  value: number;
  onChange: (v: number) => void;
  testIdPrefix: string;
  showCustom?: boolean;
  isCustomActive?: boolean;
  onCustomClick?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = !isCustomActive && value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            data-testid={`${testIdPrefix}-${opt.value}`}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-[#EA2C00] text-white scale-[1.02]"
                : "bg-white text-[#555] border border-[#E0E0E0] hover:border-[#CCC] hover:text-[#1A1A1A]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
      {showCustom && (
        <button
          type="button"
          onClick={onCustomClick}
          data-testid={`${testIdPrefix}-custom`}
          className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
            isCustomActive
              ? "bg-[#EA2C00] text-white scale-[1.02]"
              : "bg-white text-[#555] border border-[#E0E0E0] hover:border-[#CCC] hover:text-[#1A1A1A]"
          }`}
        >
          Custom
        </button>
      )}
    </div>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testIdPrefix,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            data-testid={`${testIdPrefix}-${opt.value}`}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-[#EA2C00] text-white scale-[1.02]"
                : "bg-white text-[#555] border border-[#E0E0E0] hover:border-[#CCC] hover:text-[#1A1A1A]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function AssessmentPreviewRail({ inputs }: { inputs: SwitchInputs }) {
  const pillars = [
    { label: "Capacity Creation", icon: Users, ready: true },
    { label: "Revenue Yield", icon: DollarSign, ready: true },
    { label: "Labor Stabilization", icon: Stethoscope, ready: true },
    { label: "Risk & Compliance", icon: ShieldCheck, ready: true },
  ];

  const careLabel = CARE_SETTINGS.find(c => c.value === inputs.careSetting)?.label || "Outpatient";
  const dataLabel = DATA_MODE_OPTIONS.find(d => d.value === inputs.dataMode)?.label || "Benchmark-only";

  const dataModeDetails = inputs.dataMode === "measured"
    ? ["Reduced haircuts where measured", "Caps still enforced"]
    : ["Conservative haircuts applied", "Caps enforced"];

  return (
    <div className="space-y-4">
      <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]">
        <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider mb-3" data-testid="text-rail-models-label">
          What we can model today
        </p>
        <div className="space-y-2.5">
          {pillars.map((p) => (
            <div key={p.label} className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-white border border-[#E8E0D8] flex items-center justify-center">
                <p.icon className="w-3.5 h-3.5 text-[#1A1A1A]" />
              </div>
              <span className="text-sm text-[#1A1A1A]">{p.label}</span>
              <Check className="w-3.5 h-3.5 text-[#22C55E] ml-auto" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]">
        <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider mb-3" data-testid="text-rail-baseline-label">
          Baseline recognized
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#888]">Clinicians</span>
            <span className="text-[#1A1A1A] font-medium" data-testid="text-rail-clinicians">
              {inputs.providers > 0 ? inputs.providers.toLocaleString() : "—"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#888]">Eligible encounters</span>
            <span className="text-[#1A1A1A] font-medium" data-testid="text-rail-encounters">
              {inputs.annualEncounters > 0 ? inputs.annualEncounters.toLocaleString() : "—"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#888]">Setting</span>
            <span className="text-[#1A1A1A] font-medium" data-testid="text-rail-setting">{careLabel}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#888]">Data mode</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[#1A1A1A] font-medium" data-testid="text-rail-datamode">{dataLabel}</span>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                inputs.dataMode === "measured" ? "bg-[#22C55E]" : inputs.dataMode === "estimated" ? "bg-[#F59E0B]" : "bg-[#94A3B8]"
              }`} />
            </span>
          </div>
        </div>
      </div>

      <div className="bg-[#F5F0EB] rounded-xl p-5 border border-[#E8E0D8]">
        <p className="text-[11px] font-medium text-[#999] uppercase tracking-wider mb-3" data-testid="text-rail-defaults-label">
          Conservative defaults active
        </p>
        <ul className="space-y-1.5">
          {dataModeDetails.map((d) => (
            <li key={d} className="flex items-start gap-2 text-sm text-[#666]">
              <Check className="w-3.5 h-3.5 text-[#22C55E] mt-0.5 shrink-0" />
              {d}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-[#1A1A1A] rounded-xl p-5 border border-[#333]">
        <p className="text-sm text-white/80">
          You're approximately 90 seconds from seeing your enterprise opportunity map.
        </p>
      </div>
    </div>
  );
}

export default function StepYourOrganization({
  inputs,
  updateInput,
  onNext,
  onBack,
  canProceed,
}: StepYourOrganizationProps) {
  const [customProviders, setCustomProviders] = useState(false);
  const [customEncounters, setCustomEncounters] = useState(false);
  const [showEstimator, setShowEstimator] = useState(false);
  const [encountersPerDay, setEncountersPerDay] = useState(18);
  const [clinicDays, setClinicDays] = useState(220);
  const [showOptional, setShowOptional] = useState(false);

  const isProviderPreset = !customProviders && PROVIDER_PRESETS.some(p => p.value === inputs.providers);
  const isEncounterPreset = !customEncounters && ENCOUNTER_PRESETS.some(p => p.value === inputs.annualEncounters);

  const estimatedEncounters = useMemo(() => {
    if (inputs.providers <= 0) return 0;
    return inputs.providers * encountersPerDay * clinicDays;
  }, [inputs.providers, encountersPerDay, clinicDays]);

  const handleProviderPreset = (v: number) => {
    setCustomProviders(false);
    updateInput("providers", v);
  };

  const handleEncounterPreset = (v: number) => {
    setCustomEncounters(false);
    setShowEstimator(false);
    updateInput("encountersEstimated", false);
    updateInput("annualEncounters", v);
  };

  const handleApplyEstimate = () => {
    updateInput("annualEncounters", estimatedEncounters);
    updateInput("encountersEstimated", true);
  };

  const providerWarning = inputs.providers > 0 && (inputs.providers < 5 || inputs.providers > 5000);
  const volumeWarning = inputs.providers > 0 && inputs.annualEncounters > 0 && inputs.annualEncounters < inputs.providers * 500;
  const hasAnyInput = inputs.providers > 0 || inputs.annualEncounters > 0;

  return (
    <div className={`${STEP_FOOTER_SPACER_CLASS}`}>
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
        {hasAnyInput && (
          <div className="lg:hidden">
            <AssessmentPreviewRail inputs={inputs} />
          </div>
        )}

        <div className="flex-1 max-w-[720px] space-y-8">
          <div className="text-left">
            <h1
              className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3 font-abridge uppercase tracking-tight"
              data-testid="text-page-title"
            >
              Organization Baseline
            </h1>
            <p className="text-base text-[#888888] leading-relaxed">
              These inputs estimate the portion of enterprise economics governed by documentation.
            </p>
            <p className="text-[13px] text-[#22C55E] mt-2 flex items-center gap-1.5" data-testid="text-data-light">
              <ShieldCheck className="w-3.5 h-3.5" />
              Data-light by design — benchmarks + guardrails are applied automatically when data isn't available.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-[#F5F0EB] rounded-2xl p-5 md:p-6 border border-[#E8E0D8]">
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1" data-testid="label-clinicians">
                Clinical Economic Footprint
              </label>
              <p className="text-[13px] text-[#888] mb-3">Physicians + APPs whose documentation governs enterprise economics.</p>
              <PresetChips
                options={PROVIDER_PRESETS}
                value={inputs.providers}
                onChange={handleProviderPreset}
                testIdPrefix="chip-providers"
                showCustom
                isCustomActive={customProviders}
                onCustomClick={() => setCustomProviders(true)}
              />
              {customProviders && (
                <div className="mt-3">
                  <FormattedNumberInput
                    value={inputs.providers}
                    onChange={(v) => updateInput("providers", v || 0)}
                    className="w-full max-w-[200px] text-base font-medium text-[#1A1A1A] bg-white border border-[#D1D5DB] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00] transition-colors"
                    placeholder="e.g. 75"
                    data-testid="input-providers"
                  />
                </div>
              )}
              {providerWarning && (
                <p className="text-[12px] text-[#F59E0B] mt-2" data-testid="text-provider-warning">
                  Sanity check: confirm scope.
                </p>
              )}
            </div>

            <div className="bg-[#F5F0EB] rounded-2xl p-5 md:p-6 border border-[#E8E0D8]">
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1" data-testid="label-encounters">
                Documentation-Exposed Encounters
              </label>
              <p className="text-[13px] text-[#888] mb-3">Annual visits where documentation directly governs reimbursement, quality, and compliance.</p>
              <PresetChips
                options={ENCOUNTER_PRESETS}
                value={inputs.annualEncounters}
                onChange={handleEncounterPreset}
                testIdPrefix="chip-encounters"
                showCustom
                isCustomActive={customEncounters}
                onCustomClick={() => { setCustomEncounters(true); setShowEstimator(false); }}
              />
              {customEncounters && (
                <div className="mt-3">
                  <FormattedNumberInput
                    value={inputs.annualEncounters}
                    onChange={(v) => { updateInput("annualEncounters", v || 0); updateInput("encountersEstimated", false); }}
                    className="w-full max-w-[200px] text-base font-medium text-[#1A1A1A] bg-white border border-[#D1D5DB] rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#EA2C00]/20 focus:border-[#EA2C00] transition-colors"
                    placeholder="e.g. 100,000"
                    data-testid="input-encounters"
                  />
                </div>
              )}
              {!customEncounters && (
                <button
                  type="button"
                  onClick={() => setShowEstimator(!showEstimator)}
                  className="mt-3 text-[13px] text-[#EA2C00] hover:underline font-medium"
                  data-testid="button-estimate-toggle"
                >
                  {showEstimator ? "Hide estimator" : "I don't know — help me estimate"}
                </button>
              )}
              {showEstimator && !customEncounters && (
                <div className="mt-4 bg-white rounded-xl p-4 border border-[#E5E7EB] space-y-3">
                  <div>
                    <p className="text-[13px] text-[#888] mb-2">Encounters per clinician per day</p>
                    <PresetChips
                      options={ENCOUNTERS_PER_DAY_PRESETS}
                      value={encountersPerDay}
                      onChange={setEncountersPerDay}
                      testIdPrefix="chip-epd"
                    />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#888] mb-2">Clinic days per year</p>
                    <PresetChips
                      options={CLINIC_DAYS_PRESETS}
                      value={clinicDays}
                      onChange={setClinicDays}
                      testIdPrefix="chip-days"
                    />
                  </div>
                  {inputs.providers > 0 && estimatedEncounters > 0 && (
                    <div className="flex items-center gap-3 pt-2 border-t border-[#F0F0F0]">
                      <div>
                        <p className="text-sm text-[#888]">Estimated encounters</p>
                        <p className="text-lg font-semibold text-[#1A1A1A]" data-testid="text-estimated-encounters">
                          {estimatedEncounters.toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyEstimate}
                        className="ml-auto px-4 py-1.5 rounded-lg text-sm font-medium bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors"
                        data-testid="button-apply-estimate"
                      >
                        Use this
                      </button>
                    </div>
                  )}
                  {inputs.providers <= 0 && (
                    <p className="text-[12px] text-[#F59E0B]">Enter clinicians above to calculate.</p>
                  )}
                </div>
              )}
              {inputs.encountersEstimated && inputs.annualEncounters > 0 && !customEncounters && !showEstimator && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md bg-[#F0FDF4] text-[12px] text-[#22C55E] font-medium" data-testid="badge-estimated">
                  <Check className="w-3 h-3" /> Estimated
                </span>
              )}
              {volumeWarning && (
                <p className="text-[12px] text-[#F59E0B] mt-2" data-testid="text-volume-warning">
                  This implies very low volume per clinician.
                </p>
              )}
            </div>

            <div className="bg-[#F5F0EB] rounded-2xl p-5 md:p-6 border border-[#E8E0D8]">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1" data-testid="label-care-setting">
                    Primary Economic Context
                  </label>
                  <SegmentedControl
                    options={CARE_SETTINGS}
                    value={inputs.careSetting}
                    onChange={(v) => updateInput("careSetting", v)}
                    testIdPrefix="chip-setting"
                  />
                </div>

                <div className="border-t border-[#E8E0D8] pt-4">
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1" data-testid="label-complexity">
                    Visit complexity mix
                  </label>
                  <p className="text-[13px] text-[#888] mb-3">Used only to select conservative benchmarks.</p>
                  <SegmentedControl
                    options={SPECIALTY_OPTIONS}
                    value={inputs.specialtyMix}
                    onChange={(v) => updateInput("specialtyMix", v)}
                    testIdPrefix="chip-complexity"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border border-[#E8E0D8] rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-[#F5F0EB] hover:bg-[#EDE6DE] transition-colors"
              data-testid="button-optional-toggle"
            >
              <span className="text-sm font-medium text-[#666]">Optional (improves precision)</span>
              {showOptional ? (
                <ChevronUp className="w-4 h-4 text-[#999]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#999]" />
              )}
            </button>
            {showOptional && (
              <div className="p-5 space-y-5 bg-white">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1" data-testid="label-vendor">
                    Current ambient vendor
                  </label>
                  <SegmentedControl
                    options={VENDOR_OPTIONS}
                    value={inputs.currentVendor}
                    onChange={(v) => updateInput("currentVendor", v)}
                    testIdPrefix="chip-vendor"
                  />
                </div>
              </div>
            )}
          </div>

          <StepFooter
            onBack={onBack}
            onNext={onNext}
            nextLabel="Calibrate My Inputs"
            nextDisabled={!canProceed}
          />
        </div>

        {hasAnyInput && (
          <div className="hidden lg:block w-[360px] shrink-0">
            <div className="sticky top-24">
              <AssessmentPreviewRail inputs={inputs} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
