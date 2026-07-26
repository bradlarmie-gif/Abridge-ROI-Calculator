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
  "h-12 w-full rounded-xl border border-[#E8E2DA] bg-white px-[15px] text-[16px] font-bold text-[#1A1A1A] tabular-nums focus-visible:ring-1 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-0 focus-visible:border-[#EA2C00] placeholder:text-[#B7ADA0] placeholder:font-normal placeholder:not-italic";

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
      className={`text-[12px] font-bold border rounded-[9px] px-[11px] py-[6px] transition-colors ${
        active
          ? "border-[#EA2C00] text-[#EA2C00] bg-[#FFF7F4]"
          : "border-[#E8E2DA] text-[#5E534A] bg-white hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
      }`}
    >
      {label} · {value.toLocaleString()}
      {suffix}
    </button>
  );
}

export default function EdPractice({ state, updateState, onNext, onBack }: EdPracticeProps) {
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
        ? "ED physicians"
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
      <EditorialHeader stepName="Practice" stepIndex={2} onBack={onBack} />
      <div className="max-w-[1160px] mx-auto px-12 pt-12 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#5E534A]">
          Explore · Step 2 of 9
        </div>
        <h1 className="font-abridge text-[40px] leading-[1.06] text-[#1A1A1A] mt-[10px] max-w-[640px]">
          How big is the {settingHeadline}?
        </h1>
        <p className="text-[16.5px] text-[#5E534A] mt-[14px] max-w-[600px] leading-[1.5]">
          A few real numbers about your volume. Everything downstream is built on these, so use your figures, not
          round estimates.
        </p>

        <div className="grid grid-cols-[1.35fr_1fr] gap-[22px] mt-[34px] items-start">
          {/* Form */}
          <div className="bg-[#FDFBF8] border border-[#E8E2DA] rounded-[20px] px-7 py-[26px]">
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
                <p className="text-[12.5px] text-[#5E534A] mt-[10px]">
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
                  <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#786C5E]">
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
                  <div className="inline-flex gap-[2px] bg-[#F1EBE3] border border-[#E4DACC] rounded-[10px] p-[3px]">
                    <button
                      type="button"
                      onClick={() => setUsingTotalInput(true)}
                      className={`text-[11.5px] font-bold px-3 py-[6px] rounded-[7px] transition-colors ${
                        usingTotalInput ? "bg-white text-[#EA2C00] shadow-sm" : "text-[#5E534A]"
                      }`}
                    >
                      Total for the org
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsingTotalInput(false)}
                      className={`text-[11.5px] font-bold px-3 py-[6px] rounded-[7px] transition-colors ${
                        !usingTotalInput ? "bg-white text-[#EA2C00] shadow-sm" : "text-[#5E534A]"
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
                      <span className="absolute right-[15px] top-1/2 -translate-y-1/2 text-[#5E534A] text-[14px] font-semibold">
                        / yr
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[#5E534A] mt-[10px]">
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
                      <span className="absolute right-[15px] top-1/2 -translate-y-1/2 text-[#5E534A] text-[14px] font-semibold">
                        / yr
                      </span>
                    </div>
                    <div className="flex items-center gap-[7px] mt-[10px] flex-wrap">
                      <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#786C5E]">
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
                    <p className="text-[12.5px] text-[#5E534A] mt-[10px]">
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
                    className="flex-1 h-2 bg-[#EDE6DB] rounded-full appearance-none cursor-pointer accent-[#EA2C00]"
                    data-testid="ed-slider-occupancy"
                  />
                  <div className="h-12 min-w-[64px] flex items-center justify-center rounded-xl border border-[#E8E2DA] bg-white text-[16px] font-bold text-[#EA2C00] tabular-nums px-3">
                    {state.nursingOccupancyRate}%
                  </div>
                </div>
                <p className="text-[12.5px] text-[#5E534A] mt-[10px]">Most hospitals run 75-90% occupancy.</p>
              </div>
            )}

            <div>
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822] mb-[10px]">
                How much runs on Abridge?
              </div>
              <div className="relative">
                <FormattedNumberInput
                  value={state.utilizationPercent}
                  onChange={handleUtilizationChange}
                  placeholder="e.g., 90"
                  className={`${inputBase} pr-9`}
                  data-testid="ed-input-utilization"
                />
                <span className="absolute right-[15px] top-1/2 -translate-y-1/2 text-[#5E534A] text-[14px] font-semibold">
                  %
                </span>
              </div>
              <div className="flex items-center gap-[7px] mt-[10px] flex-wrap">
                <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#786C5E]">
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
              <p className="text-[12.5px] text-[#5E534A] mt-[10px]">
                {isNursing
                  ? "The share of nurses actively documenting with Abridge. Most implementations reach 40-60% within 6 months."
                  : "The share of encounters documented with Abridge. The value only counts the volume it actually touches."}
              </p>
            </div>
          </div>

          {/* Snapshot */}
          <div className="bg-[#FDFBF8] border border-[#E8E2DA] rounded-[20px] px-7 py-[26px]">
            <div className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#2E2822]">
              Your {settingName}
            </div>
            <div className="font-abridge text-[46px] leading-none text-[#1A1A1A] mt-3 tabular-nums">
              {formatNumber(isNursing ? nursingTotalShiftsPerYear : annualEncounters)}
            </div>
            <div className="text-[13px] text-[#5E534A]">{isNursing ? "shifts a year" : `${encounterLabel} a year`}</div>

            <div className="mt-4 bg-[#FFF7F4] border border-[#F5D3C8] rounded-[12px] px-4 py-[13px]">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#B02200]">
                Abridge-enabled {isNursing ? "shifts" : encounterLabel}
              </div>
              <div className="font-abridge text-[28px] text-[#EA2C00] mt-[5px] leading-none tabular-nums">
                {formatNumber(isNursing ? nursingEligibleShifts : eligibleEncounters)}
                <span className="text-[13px] text-[#EA2C00] opacity-70"> / yr</span>
              </div>
            </div>

            <div className="h-px bg-[#E8E2DA] my-5" />

            <div className="flex justify-between items-baseline mb-3">
              <span className="text-[13.5px] text-[#5E534A]">{providerLabel}</span>
              <span className="font-abridge text-[16px] text-[#1A1A1A] tabular-nums">
                {state.numberOfProviders > 0 ? formatNumber(state.numberOfProviders) : "—"}
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-[13.5px] text-[#5E534A]">{isNursing ? "Shifts per nurse" : "Per provider"}</span>
              <span className="font-abridge text-[16px] text-[#1A1A1A] tabular-nums">
                {isNursing
                  ? `${formatNumber(state.nursingShiftsPerNurseYear)} / yr`
                  : encountersPerProvider > 0
                    ? `${formatNumber(encountersPerProvider)} / yr`
                    : "—"}
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-[13.5px] text-[#5E534A]">On Abridge</span>
              <span className="font-abridge text-[16px] text-[#1A1A1A] tabular-nums">
                {state.utilizationPercent > 0 ? `${state.utilizationPercent}%` : "—"}
              </span>
            </div>

            <p className="text-[12.5px] text-[#5E534A] leading-[1.5] mt-[6px]">
              This is the volume your value is built on, not the full book. Refine any of it as we go.
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-[30px]">
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
    </EditorialShell>
  );
}
