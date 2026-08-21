import { useCallback, useState, type ReactNode } from "react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState } from "../ExploreFlow";
import { useCountUp } from "@/lib/useCountUp";
import { quickFillChip } from "./quickFillChip";

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

// Average length of stay drives the inpatient progress-note count (one note each
// day after admission). National average runs ~4.5 days; ICU-heavy units skew longer.
const ALOS_PRESETS = [
  { label: "Short stay", value: 3.5 },
  { label: "Typical", value: 4.5 },
  { label: "Longer", value: 6 },
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
    <button type="button" onClick={onClick} className={quickFillChip(active)}>
      {label} · {value.toLocaleString()}
      {suffix}
    </button>
  );
}

// One input row: label + description on the left, the entry figure on the right
// (single line, no wrap), and any chips/toggle on their own full-width line below.
// Defined at module scope so it keeps a stable component identity across renders —
// a nested definition remounts the subtree on every keystroke and drops input focus.
function Row({ label, desc, children, controls }: { label: string; desc: string; children: ReactNode; controls?: ReactNode }) {
  return (
    <div className="py-[22px] border-b border-[#EDE8E1]">
      <div className="flex justify-between items-end gap-6">
        <div className="min-w-0">
          <div className="font-abridge text-[16px] font-bold text-[#1A1A1A] whitespace-nowrap">{label}</div>
          <div className="text-[13px] text-[#8C8073] mt-1 leading-[1.45] max-w-[320px]">{desc}</div>
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
      {controls && <div className="mt-[14px] flex items-center gap-[7px] flex-wrap">{controls}</div>}
    </div>
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
  const [usingTotalInput, setUsingTotalInput] = useState(true);
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

  const handleAlosChange = useCallback(
    (value: number) => {
      updateState({ inpatientAlos: value > 0 ? Math.min(60, value) : 0 });
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

  // Count-up reveal for the right-panel result. Targets the resolved slice once
  // both volume AND share are in; otherwise 0 (the ghost empty state shows instead).
  const rightTotal = isNursing ? nursingTotalShiftsPerYear : annualEncounters;
  const rightEnabled = isNursing ? nursingEligibleShifts : eligibleEncounters;
  const rightReady = rightTotal > 0 && Math.round(state.utilizationPercent) > 0;
  const shownEnabled = useCountUp(rightReady ? rightEnabled : 0);

  const isValid = isNursing
    ? state.numberOfProviders > 0 && state.nursingStaffedBeds > 0 && state.utilizationPercent > 0
    : isInpatient
      ? state.numberOfProviders > 0 && state.utilizationPercent > 0 && state.inpatientAlos > 0
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

  // Per-setting row copy
  const providersDesc = isNursing
    ? "Nurse FTEs documenting at the bedside."
    : isInpatient
      ? "Hospitalists carrying the inpatient census."
      : isED
        ? "Physicians and APPs staffing the department."
        : "Clinicians seeing patients on the schedule.";
  const volumeDesc = isInpatient
    ? "Total discharges across the service, per year."
    : isED
      ? "Total ED visits across the department, per year."
      : "Total encounters across the practice, per year.";
  const shareDesc = isNursing
    ? "The share of nurses actively documenting with Abridge."
    : `The share of ${encounterLabel} captured with Abridge.`;

  // Editorial entry styling — underline figure, coral = editable (matches Time)
  const sectLabel = "text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#8C8073]";
  // Fixed-width, right-aligned underline: every editable figure gets the SAME
  // line length and shares a right edge, so they read as a clean aligned column
  // (not a per-number hug). Number + unit right-align inside the fixed width.
  const entryWrap = "flex items-baseline justify-end gap-[5px] border-b-2 border-[#EA2C00] pb-[2px] whitespace-nowrap w-[168px]";
  const entryInput = "max-w-full [field-sizing:content] text-right bg-transparent border-0 p-0 font-abridge text-[30px] md:text-[30px] text-[#1A1A1A] tabular-nums focus:outline-none placeholder:text-[#C7BFB4] placeholder:font-sans placeholder:text-[15px]";
  const entryUnit = "font-sans text-[13px] text-[#8C8073]";

  // shared right-column derived readouts
  const pct = Math.round(state.utilizationPercent);
  const notYet = Math.max(0, rightTotal - rightEnabled);
  const documentedUnit = isNursing ? "shifts" : encounterLabel;
  const perProvider =
    state.numberOfProviders > 0 ? Math.round(annualEncounters / state.numberOfProviders) : 0;

  return (
    <EditorialShell>
      <EditorialHeader stepName="Practice" stepIndex={2} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1080px] mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">
          Value Model · Step 2 of 9
        </div>
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[640px]">
          How big is the {settingHeadline}?
        </h1>
        <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[600px] leading-[1.5]">
          A few real numbers about your volume. Everything downstream is built on these, so use your figures, not
          round estimates.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1px_1fr] gap-x-[56px] gap-y-10 mt-[46px]">
          {/* LEFT — inputs */}
          <div>
            <div className={sectLabel}>Your {settingName}</div>

            {isNursing && (
              <Row label="Staffed beds" desc="Licensed beds with active nursing staff.">
                <span className={entryWrap}>
                  <FormattedNumberInput value={state.nursingStaffedBeds} onChange={handleBedsChange} placeholder="e.g. 200" className={entryInput} data-testid="ed-input-beds" />
                </span>
              </Row>
            )}

            {/* Providers */}
            <Row
              label={providerLabel}
              desc={providersDesc}
              controls={isNursing && state.nursingStaffedBeds > 0
                ? FTE_ESTIMATES.map(({ label, multiplier }) => (
                    <QuickFillChip key={label} label={label} value={Math.round(state.nursingStaffedBeds * multiplier)} active={appliedEstimate === label} onClick={() => applyFteEstimate(multiplier, label)} />
                  ))
                : undefined}
            >
              <span className={entryWrap}>
                <FormattedNumberInput value={state.numberOfProviders} onChange={handleProvidersChange} placeholder={isNursing ? "e.g. 300" : "e.g. 50"} className={entryInput} data-testid="ed-input-providers" />
              </span>
            </Row>

            {/* Annual encounters / discharges (non-nursing) */}
            {!isNursing && (
              <Row
                label={`Annual ${encounterLabel}`}
                desc={volumeDesc}
                controls={
                  <>
                    <div className="inline-flex gap-[2px] bg-[#F2EFEA] border border-[#E7E2DB] rounded-[9px] p-[3px]">
                      <button type="button" onClick={() => setUsingTotalInput(true)} className={`text-[11px] font-bold px-[10px] py-[5px] rounded-[6px] transition-colors ${usingTotalInput ? "bg-[#2E2822] text-white" : "text-[#565250]"}`}>Total</button>
                      <button type="button" onClick={() => setUsingTotalInput(false)} className={`text-[11px] font-bold px-[10px] py-[5px] rounded-[6px] transition-colors ${!usingTotalInput ? "bg-[#2E2822] text-white" : "text-[#565250]"}`}>Per provider</button>
                    </div>
                    {!usingTotalInput && BUSYNESS_PRESETS.map((preset) => (
                      <QuickFillChip key={preset.label} label={preset.label} value={preset.value} active={isPresetSelected(preset.value)} onClick={() => handleBusynessChange(preset.value)} />
                    ))}
                  </>
                }
              >
                {usingTotalInput ? (
                  <span className={entryWrap}>
                    <FormattedNumberInput value={totalEncountersInput} onChange={handleTotalEncountersChange} placeholder={isInpatient ? "e.g. 14,000" : "e.g. 24,000"} className={entryInput} data-testid="ed-input-total-encounters" />
                    <span className={entryUnit}>/ yr</span>
                  </span>
                ) : (
                  <span className={entryWrap}>
                    <FormattedNumberInput value={encountersPerProvider} onChange={handleBusynessChange} placeholder="e.g. 400" className={entryInput} data-testid="ed-input-encounters-per-provider" />
                    <span className={entryUnit}>/ yr</span>
                  </span>
                )}
              </Row>
            )}

            {/* Average length of stay (inpatient) */}
            {isInpatient && (
              <Row
                label="Average length of stay"
                desc="Sets one progress note for each day after admission."
                controls={ALOS_PRESETS.map((preset) => (
                  <QuickFillChip key={preset.label} label={preset.label} value={preset.value} active={state.inpatientAlos === preset.value} onClick={() => handleAlosChange(preset.value)} />
                ))}
              >
                <span className={entryWrap}>
                  <FormattedNumberInput value={state.inpatientAlos} onChange={handleAlosChange} step={0.1} placeholder="e.g. 4.5" className={entryInput} data-testid="ed-input-alos" />
                  <span className={entryUnit}>days</span>
                </span>
              </Row>
            )}

            {/* Bed occupancy (nursing) */}
            {isNursing && (
              <Row
                label="Bed occupancy"
                desc="Average census as a share of staffed beds."
                controls={
                  <input type="range" min={50} max={100} value={state.nursingOccupancyRate} onChange={(e) => handleOccupancyChange(Number(e.target.value))} className="w-full h-[3px] bg-[#EBE6DE] rounded-full appearance-none cursor-pointer accent-[#EA2C00]" data-testid="ed-slider-occupancy" />
                }
              >
                <span className={entryWrap}>
                  <span className="font-abridge text-[30px] text-[#1A1A1A] tabular-nums">{state.nursingOccupancyRate}</span>
                  <span className={entryUnit}>%</span>
                </span>
              </Row>
            )}

            {/* Share documented */}
            <Row
              label="Share documented with Abridge"
              desc={shareDesc}
              controls={utilizationPresets.map((preset) => (
                <QuickFillChip key={preset.label} label={preset.label} value={preset.value} suffix="%" active={isUtilizationPresetSelected(preset.value)} onClick={() => handleUtilizationChange(preset.value)} />
              ))}
            >
              <span className={entryWrap}>
                <FormattedNumberInput value={state.utilizationPercent} onChange={handleUtilizationChange} placeholder="e.g. 70" className={entryInput} data-testid="ed-input-utilization" />
                <span className={entryUnit}>%</span>
              </span>
            </Row>

            {/* How it adds up */}
            {rightReady && (
              <div className="mt-8">
                <div className="text-[15px] text-[#3A342E] leading-[1.6]">
                  <b className="font-bold text-[#1A1A1A]">{formatNumber(rightTotal)}</b> {documentedUnit} a year, <b className="font-bold text-[#1A1A1A]">{pct}%</b> documented with Abridge
                </div>
                <div className="text-[14px] text-[#8C8073] mt-[9px]">
                  Documented · {formatNumber(rightTotal)} × {pct}% = <b className="font-bold text-[#1A1A1A]">{formatNumber(rightEnabled)}</b>
                </div>
                <div className="text-[14px] text-[#8C8073] mt-[9px]">
                  Not yet on Abridge · {formatNumber(rightTotal)} − {formatNumber(rightEnabled)} = <b className="font-bold text-[#1A1A1A]">{formatNumber(notYet)}</b>
                </div>
              </div>
            )}
          </div>

          {/* vertical hairline */}
          <div className="hidden lg:block bg-[#E8E2DA]" />

          {/* RIGHT — result */}
          <div>
            <div className={sectLabel}>What the value is built on</div>
            {rightReady ? (
              <>
                <div className="font-abridge text-[64px] sm:text-[88px] text-[#EA2C00] leading-[0.88] tabular-nums mt-[22px]">
                  {formatNumber(shownEnabled)}
                </div>
                <div className="font-abridge text-[20px] text-[#1A1A1A] mt-3">documented {documentedUnit} a year</div>
                <div className="text-[15.5px] text-[#565250] mt-[18px] leading-[1.5]">
                  {!isNursing && perProvider > 0 && (<>≈ <b className="font-bold text-[#1A1A1A]">{formatNumber(perProvider)}</b> per provider · </>)}
                  <b className="font-bold text-[#1A1A1A]">{pct}%</b> of the book documented with Abridge
                </div>
                <div className="flex h-[10px] rounded-full overflow-hidden gap-[2px] mt-[30px] max-w-[460px]">
                  <span className="block rounded-[3px] bg-[#EA2C00]" style={{ flex: rightEnabled || 1 }} />
                  <span className="block rounded-[3px]" style={{ flex: notYet || 0.0001, background: "repeating-linear-gradient(45deg,#E8E2DA,#E8E2DA 3px,#F5F1EB 3px,#F5F1EB 6px)" }} />
                </div>
                <div className="flex flex-wrap gap-x-[22px] gap-y-[9px] mt-[18px] text-[13px] text-[#565250]">
                  <span className="flex items-center gap-[7px]"><span className="w-[9px] h-[9px] rounded-full bg-[#EA2C00]" />Documented with Abridge · <b className="font-bold text-[#1A1A1A]">{formatNumber(rightEnabled)}</b></span>
                  <span className="text-[#B0A99E]">Not yet · {formatNumber(notYet)}</span>
                </div>
                <div className="mt-9 border-t border-[#EDE8E1] pt-5 text-[13.5px] text-[#8C8073] leading-[1.55] max-w-[420px]">
                  Everything downstream is built on this documented volume, not the full book. The other {formatNumber(notYet)} are not yet on Abridge.
                </div>
              </>
            ) : (
              <div className="mt-[22px] max-w-[360px]">
                <div className="font-abridge text-[23px] text-[#3A342E] leading-[1.2]">The volume your value is built on</div>
                <p className="text-[14px] text-[#8A8073] leading-[1.6] mt-3">
                  Your annual {documentedUnit} times the share documented with Abridge. Enter your numbers on the left and it fills in here.
                </p>
                <div className="mt-7 flex flex-col gap-[11px]">
                  {[providerLabel, `Annual ${documentedUnit}`, "Documented share"].map((l) => (
                    <div key={l} className="flex items-center gap-[10px] text-[13px] text-[#B0A99E]">
                      <span className="w-[6px] h-[6px] rounded-full bg-[#DDD5C9] flex-shrink-0" /> {l}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Continue */}
        <div className="flex justify-end mt-14">
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
