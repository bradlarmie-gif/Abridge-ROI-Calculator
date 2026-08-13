import { useCallback, useState } from "react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState } from "../ExploreFlow";

interface EdPracticeProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  onReturnToBusinessCase?: () => void;
}

interface BusynessPreset {
  label: string;
  value: number;
}

const OUTPATIENT_BUSYNESS_PRESETS: BusynessPreset[] = [
  { label: "Lighter", value: 2500 },
  { label: "Typical", value: 3500 },
  { label: "Busy", value: 4500 },
];

const ED_BUSYNESS_PRESETS: BusynessPreset[] = [
  { label: "Lighter", value: 1400 },
  { label: "Typical", value: 1800 },
  { label: "Busy", value: 2200 },
];

const INPATIENT_BUSYNESS_PRESETS: BusynessPreset[] = [
  { label: "Lighter", value: 300 },
  { label: "Typical", value: 400 },
  { label: "Busy", value: 500 },
];

const UTILIZATION_PRESETS = [
  { label: "Conservative", value: 50 },
  { label: "Typical", value: 70 },
  { label: "Optimistic", value: 85 },
];

const NURSING_UTILIZATION_PRESETS = [
  { label: "Conservative", value: 40 },
  { label: "Typical", value: 50 },
  { label: "Optimistic", value: 60 },
];

const FTE_ESTIMATES = [
  { label: "Med / Surg", multiplier: 1.5 },
  { label: "ICU / PICU", multiplier: 3.0 },
  { label: "Mixed", multiplier: 2.0 },
];

const inputBase =
  "h-[56px] w-full rounded-[14px] border-[1.5px] border-[#E4DED6] bg-white px-[18px] text-[20px] font-abridge text-[#1A1A1A] tabular-nums shadow-[0_1px_2px_rgba(40,30,20,0.04)] transition-[box-shadow,border-color] focus-visible:outline-none focus-visible:border-[#EA2C00] focus-visible:shadow-[0_0_0_3px_#FBD9CE] placeholder:text-[#B5AFA6] placeholder:font-normal placeholder:not-italic placeholder:font-sans placeholder:text-[16px]";

function QuickFillChip({
  label,
  value,
  active,
  onClick,
  suffix = "",
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  suffix?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[12px] font-bold border rounded-[9px] px-[11px] py-[6px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-1 ${
        active
          ? "border-[#EA2C00] text-[#EA2C00] bg-[#FFF7F4]"
          : "border-[#E7E3DD] text-[#565250] bg-white hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
      }`}
    >
      {label} · {value.toLocaleString()}
      {suffix}
    </button>
  );
}

export default function EdPractice({ state, updateState, onNext, onBack, onHome }: EdPracticeProps) {
  const isED = state.careSetting === "ed";
  const isInpatient = state.careSetting === "inpatient";
  const isNursing = state.careSetting === "nursing";
  const BUSYNESS_PRESETS = isInpatient
    ? INPATIENT_BUSYNESS_PRESETS
    : isED
      ? ED_BUSYNESS_PRESETS
      : OUTPATIENT_BUSYNESS_PRESETS;

  const [encountersPerProvider, setEncountersPerProvider] = useState(
    state.encountersPerProvider > 0
      ? state.encountersPerProvider
      : state.numberOfProviders > 0 && state.annualEncounters > 0
        ? Math.round(state.annualEncounters / state.numberOfProviders)
        : 0
  );
  const [totalEncountersInput, setTotalEncountersInput] = useState(
    state.annualEncounters > 0 ? state.annualEncounters : 0
  );
  const [usingTotalInput, setUsingTotalInput] = useState(false);
  const [appliedEstimate, setAppliedEstimate] = useState<string | null>(null);

  const handleProvidersChange = useCallback(
    (numValue: number) => {
      if (numValue > 0) {
        const clampedValue = Math.max(1, Math.min(10000, numValue));
        if (usingTotalInput && state.annualEncounters > 0) {
          const newPerProvider = Math.round(state.annualEncounters / clampedValue);
          setEncountersPerProvider(newPerProvider);
          updateState({ numberOfProviders: clampedValue, encountersPerProvider: newPerProvider });
        } else {
          const annualEncounters = clampedValue * encountersPerProvider;
          updateState({
            numberOfProviders: clampedValue,
            annualEncounters,
            encountersPerProvider,
          });
        }
      } else {
        updateState({ numberOfProviders: 0, annualEncounters: 0, encountersPerProvider: 0 });
      }
    },
    [updateState, encountersPerProvider, usingTotalInput, state.annualEncounters]
  );

  function applyFteEstimate(multiplier: number, label: string) {
    if (state.nursingStaffedBeds <= 0) return;
    const estimated = Math.round(state.nursingStaffedBeds * multiplier);
    handleProvidersChange(estimated);
    setAppliedEstimate(label);
    setTimeout(() => setAppliedEstimate(null), 2000);
  }

  const handleBedsChange = useCallback(
    (numValue: number) => {
      if (numValue > 0) {
        updateState({ nursingStaffedBeds: Math.max(1, Math.min(2000, numValue)) });
      } else {
        updateState({ nursingStaffedBeds: 0 });
      }
    },
    [updateState]
  );

  const handleBusynessChange = useCallback(
    (value: number) => {
      setEncountersPerProvider(value);
      setTotalEncountersInput(0);
      setUsingTotalInput(false);
      if (state.numberOfProviders > 0) {
        const annualEncounters = state.numberOfProviders * value;
        updateState({ annualEncounters, encountersPerProvider: value });
      } else {
        updateState({ encountersPerProvider: value });
      }
    },
    [updateState, state.numberOfProviders]
  );

  const handleTotalEncountersChange = useCallback(
    (numValue: number) => {
      setTotalEncountersInput(numValue);
      if (numValue >= 1000) {
        setUsingTotalInput(true);
        const newPerProvider = state.numberOfProviders > 0 ? Math.round(numValue / state.numberOfProviders) : 0;
        setEncountersPerProvider(newPerProvider);
        updateState({ annualEncounters: numValue, encountersPerProvider: newPerProvider });
      }
    },
    [updateState, state.numberOfProviders]
  );

  const handleUtilizationChange = useCallback(
    (value: number) => {
      updateState({ utilizationPercent: value });
    },
    [updateState]
  );

  const handleOccupancyChange = useCallback(
    (value: number) => {
      updateState({ nursingOccupancyRate: Math.max(50, Math.min(100, value)) });
    },
    [updateState]
  );

  const annualEncounters =
    state.annualEncounters > 0 ? state.annualEncounters : state.numberOfProviders * encountersPerProvider;
  const eligibleEncounters = Math.round(annualEncounters * (state.utilizationPercent / 100));
  const nursingTotalShiftsPerYear = state.numberOfProviders * state.nursingShiftsPerNurseYear;
  const nursingEligibleShifts = Math.round(nursingTotalShiftsPerYear * (state.utilizationPercent / 100));

  const formatNumber = (n: number) => n.toLocaleString();

  const isValid = isNursing
    ? state.numberOfProviders > 0 && state.nursingStaffedBeds > 0 && state.utilizationPercent > 0
    : state.numberOfProviders > 0 && state.utilizationPercent > 0;

  const isPresetSelected = (presetValue: number) => encountersPerProvider === presetValue && !usingTotalInput;
  const isUtilizationPresetSelected = (presetValue: number) => state.utilizationPercent === presetValue;

  const providerLabel = isNursing
    ? "Nurse FTEs"
    : isInpatient
      ? "Inpatient providers"
      : isED
        ? "ED providers"
        : "Providers";
  const encounterLabel = isInpatient ? "discharges" : "encounters";
  const settingName = isNursing
    ? "nursing unit"
    : isInpatient
      ? "inpatient program"
      : isED
        ? "emergency department"
        : "practice";
  const settingHeadline = isNursing ? "unit" : isInpatient ? "program" : isED ? "department" : "practice";

  const utilizationPresets = isNursing ? NURSING_UTILIZATION_PRESETS : UTILIZATION_PRESETS;

  return (
    <EditorialShell>
      <EditorialHeader stepName="Practice" stepIndex={2} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">
          Explore · Step 2 of 9
        </div>
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[640px]">
          How big is the {settingHeadline}?
        </h1>
        <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[600px] leading-[1.5]">
          A few real numbers about your volume. Everything downstream is built on these, so use your figures, not
          round estimates.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-[22px] mt-[34px] items-stretch">
          {/* Form */}
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] px-7 py-[26px] h-full">
            {isNursing && (
              <div className="mb-6">
                <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822] mb-[10px]">
                  Staffed beds
                </div>
                <FormattedNumberInput
                  value={state.nursingStaffedBeds}
                  onChange={handleBedsChange}
                  placeholder="e.g., 200"
                  className={inputBase}
                  data-testid="ed-input-beds"
                />
                <p className="text-[12.5px] text-[#565250] mt-[10px]">
                  Licensed beds with active nursing staff.
                </p>
              </div>
            )}

            <div className="mb-6">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822] mb-[10px]">
                {providerLabel}
              </div>
              <FormattedNumberInput
                value={state.numberOfProviders}
                onChange={handleProvidersChange}
                placeholder={isNursing ? "e.g., 300" : "e.g., 50"}
                className={inputBase}
                data-testid="ed-input-providers"
              />
              {isNursing && state.nursingStaffedBeds > 0 && (
                <div className="flex items-center gap-[7px] mt-[10px] flex-wrap">
                  <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F]">
                    Estimate
                  </span>
                  {FTE_ESTIMATES.map(({ label, multiplier }) => (
                    <QuickFillChip
                      key={label}
                      label={label}
                      value={Math.round(state.nursingStaffedBeds * multiplier)}
                      active={appliedEstimate === label}
                      onClick={() => applyFteEstimate(multiplier, label)}
                    />
                  ))}
                </div>
              )}
            </div>

            {!isNursing && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-[10px] gap-3">
                  <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822]">
                    Annual {encounterLabel}
                  </div>
                  <div className="inline-flex gap-[2px] bg-[#F2EFEA] border border-[#E7E2DB] rounded-[10px] p-[3px]">
                    <button
                      type="button"
                      onClick={() => setUsingTotalInput(true)}
                      className={`text-[11.5px] font-bold px-3 py-[6px] rounded-[7px] transition-colors ${
                        usingTotalInput ? "bg-white text-[#EA2C00] shadow-sm" : "text-[#565250]"
                      }`}
                    >
                      Total for the org
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsingTotalInput(false)}
                      className={`text-[11.5px] font-bold px-3 py-[6px] rounded-[7px] transition-colors ${
                        !usingTotalInput ? "bg-white text-[#EA2C00] shadow-sm" : "text-[#565250]"
                      }`}
                    >
                      Per provider
                    </button>
                  </div>
                </div>

                {usingTotalInput ? (
                  <>
                    <div className="relative">
                      <FormattedNumberInput
                        value={totalEncountersInput}
                        onChange={handleTotalEncountersChange}
                        placeholder="e.g., 420,000"
                        className={`${inputBase} pr-14`}
                        data-testid="ed-input-total-encounters"
                      />
                      <span className="absolute right-[15px] top-1/2 -translate-y-1/2 text-[#565250] text-[14px] font-semibold">
                        / yr
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#565250] mt-[10px]">
                      Most teams know their org-wide total. Prefer to build it up? Switch to{" "}
                      <b className="text-[#EA2C00] font-bold">Per provider</b>.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="relative">
                      <FormattedNumberInput
                        value={encountersPerProvider}
                        onChange={handleBusynessChange}
                        placeholder="e.g., 3,500"
                        className={`${inputBase} pr-14`}
                        data-testid="ed-input-encounters-per-provider"
                      />
                      <span className="absolute right-[15px] top-1/2 -translate-y-1/2 text-[#565250] text-[14px] font-semibold">
                        / yr
                      </span>
                    </div>
                    <div className="flex items-center gap-[7px] mt-[10px] flex-wrap">
                      <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F]">
                        Quick fill
                      </span>
                      {BUSYNESS_PRESETS.map((preset) => (
                        <QuickFillChip
                          key={preset.label}
                          label={preset.label}
                          value={preset.value}
                          active={isPresetSelected(preset.value)}
                          onClick={() => handleBusynessChange(preset.value)}
                        />
                      ))}
                    </div>
                    <p className="text-[12.5px] text-[#565250] mt-[10px]">
                      Know your org-wide total instead? Switch to{" "}
                      <b className="text-[#EA2C00] font-bold">Total for the org</b>.
                    </p>
                  </>
                )}
              </div>
            )}

            {isNursing && (
              <div className="mb-6">
                <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822] mb-[10px]">
                  Bed occupancy
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={state.nursingOccupancyRate}
                    onChange={(e) => handleOccupancyChange(Number(e.target.value))}
                    className="flex-1 h-2 bg-[#EBE6DE] rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                    data-testid="ed-slider-occupancy"
                  />
                  <div className="h-12 min-w-[64px] flex items-center justify-center rounded-xl border border-[#E7E3DD] bg-white text-[16px] font-bold text-[#EA2C00] tabular-nums px-3">
                    {state.nursingOccupancyRate}%
                  </div>
                </div>
                <p className="text-[12.5px] text-[#565250] mt-[10px]">Most hospitals run 75-90% occupancy.</p>
              </div>
            )}

            <div>
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822] mb-[10px]">
                Share documented with Abridge
              </div>
              <div className="relative">
                <FormattedNumberInput
                  value={state.utilizationPercent}
                  onChange={handleUtilizationChange}
                  placeholder="e.g., 90"
                  className={`${inputBase} pr-9`}
                  data-testid="ed-input-utilization"
                />
                <span className="absolute right-[15px] top-1/2 -translate-y-1/2 text-[#565250] text-[14px] font-semibold">
                  %
                </span>
              </div>
              <div className="flex items-center gap-[7px] mt-[10px] flex-wrap">
                <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F]">
                  Quick fill
                </span>
                {utilizationPresets.map((preset) => (
                  <QuickFillChip
                    key={preset.label}
                    label={preset.label}
                    value={preset.value}
                    suffix="%"
                    active={isUtilizationPresetSelected(preset.value)}
                    onClick={() => handleUtilizationChange(preset.value)}
                  />
                ))}
              </div>
              <p className="text-[12.5px] text-[#565250] mt-[10px]">
                {isNursing
                  ? "The share of nurses actively documenting with Abridge. Most implementations reach 40-60% within 6 months."
                  : "The share of encounters documented with Abridge. The value only counts the volume it actually touches."}
              </p>
            </div>
            {isValid && (
              <div className="border-t border-[#F1ECE4] mt-6 pt-4 text-[13px] text-[#565250] leading-[1.55]">
                {isNursing ? (
                  <><b className="text-[#1A1A1A] font-abridge text-[15px]">{formatNumber(state.nursingStaffedBeds)}</b> beds become <b className="text-[#1A1A1A] font-abridge text-[15px]">{formatNumber(nursingTotalShiftsPerYear)}</b> shifts a year, and <b className="text-[#EA2C00]">{state.utilizationPercent}%</b> run on Abridge.</>
                ) : (
                  <><b className="text-[#1A1A1A] font-abridge text-[15px]">{formatNumber(state.numberOfProviders)}</b> providers × <b className="text-[#1A1A1A] font-abridge text-[15px]">{formatNumber(encountersPerProvider)}</b> / provider = <b className="text-[#1A1A1A] font-abridge text-[15px]">{formatNumber(annualEncounters)}</b> encounters, and <b className="text-[#EA2C00]">{state.utilizationPercent}%</b> run on Abridge.</>
                )}
              </div>
            )}
          </div>

          {/* Snapshot + continue, anchored to the right column */}
          <div className="flex flex-col gap-5 h-full">
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] px-7 py-[26px] flex-1 flex flex-col">
            {(() => {
              const total = isNursing ? nursingTotalShiftsPerYear : annualEncounters;
              const enabled = isNursing ? nursingEligibleShifts : eligibleEncounters;
              const unit = isNursing ? "shifts" : encounterLabel;
              const pct = Math.round(state.utilizationPercent);
              const notYet = Math.max(0, total - enabled);
              return (
                <>
                  <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#443A32]">
                    Your {settingName} · what the value is built on
                  </div>
                  <div className="mt-3 leading-none">
                    <span className="font-abridge text-[42px] sm:text-[52px] text-[#EA2C00] tabular-nums">{formatNumber(enabled)}</span>
                    <span className="text-[14px] text-[#565250]"> {unit} on Abridge / yr</span>
                  </div>

                  {total > 0 ? (
                    <>
                      <div className="text-[12px] text-[#7C766F] font-semibold mt-6 mb-3">
                        Of every 100 {unit} on your schedule, {pct} run on Abridge
                      </div>
                      <div className="grid gap-[5px]" style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}>
                        {Array.from({ length: 100 }).map((_, i) => (
                          <div
                            key={i}
                            className={`aspect-square rounded-[3px] ${i < pct ? "bg-[#F7C9B8]" : "border border-[#EAE3D9]"}`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[12.5px] text-[#7C766F] mt-4">
                        <span className="flex items-center gap-[6px]">
                          <span className="w-[10px] h-[10px] rounded-[3px] bg-[#F7C9B8]" />On Abridge · {formatNumber(enabled)}
                        </span>
                        <span className="flex items-center gap-[6px]">
                          <span className="w-[10px] h-[10px] rounded-[3px] border border-[#EAE3D9]" />Not yet · {formatNumber(notYet)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 text-[13px] text-[#7C766F] italic">Enter your volume to see the slice your value is built on.</div>
                  )}

                  <div className="mt-auto pt-[18px] border-t border-[#E7E3DD] mt-6">
                    <p className="text-[12.5px] text-[#565250] leading-[1.55]">
                      {total > 0 ? (
                        <><b className="text-[#1A1A1A]">{formatNumber(total)}</b> total × <b className="text-[#EA2C00]">{pct}%</b> = <b className="text-[#EA2C00]">{formatNumber(enabled)}</b> the value is built on. Refine any of it as we go.</>
                      ) : (
                        <>This is the volume your value is built on, not the full book. Refine any of it as we go.</>
                      )}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!isValid}
              onClick={onNext}
              data-testid="ed-practice-continue"
              className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)] disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        </div>
        </div>
      </div>
    </EditorialShell>
  );
}
