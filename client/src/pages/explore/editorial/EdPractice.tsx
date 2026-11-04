import { useCallback, useState, type ReactNode } from "react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState } from "../ExploreFlow";
import { useCountUp } from "@/lib/useCountUp";
import { quickFillChip } from "./quickFillChip";
import { EmergencyArt, InpatientArt, NursingArt, OutpatientArt } from "@/pages/hub/hubArt";

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
    <div className="py-4 border-b border-[#E6DCCF] last:border-b-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
        <div className="min-w-0">
          <div className="text-[15px] font-semibold text-[#1A1A1A]">{label}</div>
          <div className="text-[12.5px] text-[#6B6259] mt-1 leading-[1.45] max-w-[340px]">{desc}</div>
        </div>
        <div className="flex-shrink-0">{children}</div>
      </div>
      {controls && <div className="mt-3 flex items-center gap-[7px] flex-wrap">{controls}</div>}
    </div>
  );
}

/** A tan group card on the left: a dark label, then rows split by hairlines. */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-[#E9E0D4] bg-[#F6F1EA]/90 px-5 sm:px-6 pt-5 pb-1">
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#443A32] mb-1">{title}</div>
      {children}
    </div>
  );
}

const SETTING_ART: Record<string, ReactNode> = {
  outpatient: <OutpatientArt />,
  ed: <EmergencyArt />,
  inpatient: <InpatientArt />,
  nursing: <NursingArt />,
};

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
      // Always write what they typed. This used to be gated on `numValue >= 1000`,
      // which meant any total under a thousand updated the box and NOTHING else:
      // the field showed 800 while the whole model still ran on the previous
      // value (or on zero, leaving every revenue driver greyed out behind
      // "Enter annual discharges" next to a box that plainly showed a number).
      // Small programs have small volumes, and a corrected-down figure is the
      // most dangerous case, because the screen and the math silently disagree.
      setTotalEncountersInput(numValue);
      setUsingTotalInput(true);
      const newPerProvider = state.numberOfProviders > 0 ? Math.round(numValue / state.numberOfProviders) : 0;
      setEncountersPerProvider(newPerProvider);
      updateState({ annualEncounters: numValue, encountersPerProvider: newPerProvider });
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
    ? "How often Abridge is used per patient, out of the patients available."
    : `The share of ${encounterLabel} captured with Abridge.`;

  // Editorial entry styling — underline figure, coral = editable (matches Time)
  const sectLabel = "text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#8C8073]";
  // Fixed-width, right-aligned underline: every editable figure gets the SAME
  // line length and shares a right edge, so they read as a clean aligned column
  // (not a per-number hug). Number + unit right-align inside the fixed width.
  const entryWrap = "flex items-baseline justify-end gap-[6px] whitespace-nowrap w-[176px] rounded-[12px] border border-[#E2D8CB] bg-white pl-4 pr-5 py-2.5 shadow-[inset_0_1px_2px_rgba(26,26,26,0.04)] focus-within:border-[#EA2C00] focus-within:ring-2 focus-within:ring-[#EA2C00]/15 transition-colors";
  const entryInput = "w-full min-w-0 text-right bg-transparent border-0 p-0 text-[19px] font-bold text-[#1A1A1A] tabular-nums focus:outline-none placeholder:text-[#B5AA9B] placeholder:font-normal placeholder:not-italic placeholder:text-[15px]";
  const entryUnit = "font-sans text-[13px] text-[#6B6259]";

  // shared right-column derived readouts
  const pct = Math.round(state.utilizationPercent);
  const notYet = Math.max(0, rightTotal - rightEnabled);
  const nursingDays = isNursing ? Math.round(state.nursingStaffedBeds * (state.nursingOccupancyRate / 100) * 365) : 0;
  const documentedUnit = isNursing ? "shifts" : encounterLabel;
  const perProvider =
    state.numberOfProviders > 0 ? Math.round(annualEncounters / state.numberOfProviders) : 0;

  return (
    <EditorialShell>
      <EditorialHeader stepName="Practice" stepIndex={2} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">
          Value Model · Step 2 of 9
        </div>
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[640px]">
          How big is the {settingHeadline}?
        </h1>
        <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[600px] leading-[1.5]">
          Everything after this builds on these numbers.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 lg:gap-8 items-start mt-9">
          {/* LEFT: the inputs, grouped (same handlers and saved values as before) */}
          <div className="space-y-4">
            {isNursing ? (
              <Group title="The unit">
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
            {/* Bed occupancy (nursing) */}
            {isNursing && (
              <Row
                label="Bed occupancy"
                desc="Average census as a share of staffed beds."
                controls={
                  <input type="range" min={50} max={100} value={state.nursingOccupancyRate} onChange={(e) => handleOccupancyChange(Number(e.target.value))}
                    style={{ background: `linear-gradient(90deg, #EA2C00 ${((state.nursingOccupancyRate - 50) / 50) * 100}%, #E4D8C8 ${((state.nursingOccupancyRate - 50) / 50) * 100}%)` }}
                    className="roi-range w-full rounded-full appearance-none cursor-pointer" data-testid="ed-slider-occupancy" />
                }
              >
                <span className={entryWrap}>
                  <span className="text-[19px] font-bold text-[#1A1A1A] tabular-nums">{state.nursingOccupancyRate}</span>
                  <span className={entryUnit}>%</span>
                </span>
              </Row>
            )}
              </Group>
            ) : (
              <>
                <Group title="The people">
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
                </Group>
                <Group title="The volume">
            {/* Annual encounters / discharges (non-nursing) */}
            {!isNursing && (
              <Row
                label={`Annual ${encounterLabel}`}
                desc={volumeDesc}
                controls={
                  <>
                    <div className="inline-flex rounded-full bg-[#EBE2D6] p-[3px]">
                      <button type="button" onClick={() => setUsingTotalInput(true)} className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition-all ${usingTotalInput ? "bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(26,26,26,0.10),0_2px_6px_-2px_rgba(26,26,26,0.12)]" : "text-[#7A6F63] hover:text-[#1A1A1A]"}`}>Total</button>
                      <button type="button" onClick={() => setUsingTotalInput(false)} className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition-all ${!usingTotalInput ? "bg-white text-[#1A1A1A] shadow-[0_1px_2px_rgba(26,26,26,0.10),0_2px_6px_-2px_rgba(26,26,26,0.12)]" : "text-[#7A6F63] hover:text-[#1A1A1A]"}`}>Per provider</button>
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

                </Group>
              </>
            )}
            <Group title="Abridge use">
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

            </Group>
          </div>

          {/* RIGHT: what the value is built on, drawn live. It sits still beside
              the inputs (no sliding), and Continue sits directly under it. */}
          <div className="space-y-4">
          <div className="rounded-[22px] border border-[#E9E0D4] bg-white shadow-[0_1px_2px_rgba(26,26,26,0.04),0_16px_40px_-24px_rgba(26,26,26,0.24)] overflow-hidden" data-testid="ed-practice-panel">
            <div className="px-6 pt-5 pb-4 bg-[#F6F1EA]/80 border-b border-[#E6DCCF]">
              <div className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#EA2C00]">What the value is built on</div>
            </div>
            <div className="p-6">
            <div className={`h-[120px] rounded-[16px] border px-4 py-3 transition-colors ${rightReady ? "border-[#F0CDBF] bg-[#FBEDE6]" : "border-[#E6DCCE] bg-[#EFE7DC]/60"}`}>
              {state.careSetting ? SETTING_ART[state.careSetting] : null}
            </div>
            {rightReady ? (
              <>
                <div className="font-abridge text-[56px] text-[#1A1A1A] leading-[0.9] tabular-nums mt-6">
                  {formatNumber(shownEnabled)}
                </div>
                <div className="text-[15px] font-semibold text-[#1A1A1A] mt-2.5">documented {documentedUnit} a year</div>
                <div className="text-[13.5px] text-[#565250] mt-2 leading-[1.5]">
                  {!isNursing && perProvider > 0 && (<>≈ <b className="font-bold text-[#1A1A1A]">{formatNumber(perProvider)}</b> per provider · </>)}
                  <b className="font-bold text-[#1A1A1A]">{pct}%</b> of the book documented with Abridge
                </div>
                <div className="flex h-[10px] rounded-full overflow-hidden gap-[2px] mt-6">
                  <span className="block rounded-[3px] bg-[#EA2C00]" style={{ flex: rightEnabled || 1 }} />
                  <span className="block rounded-[3px]" style={{ flex: notYet || 0.0001, background: "repeating-linear-gradient(45deg,#E8E2DA,#E8E2DA 3px,#F5F1EB 3px,#F5F1EB 6px)" }} />
                </div>
                <div className="flex flex-wrap gap-x-[22px] gap-y-[9px] mt-[18px] text-[13px] text-[#565250]">
                  <span className="flex items-center gap-[7px]"><span className="w-[9px] h-[9px] rounded-full bg-[#EA2C00]" />Documented with Abridge · <b className="font-bold text-[#1A1A1A]">{formatNumber(rightEnabled)}</b></span>
                  <span className="text-[#B0A99E]">Not yet · {formatNumber(notYet)}</span>
                </div>
                <div className="mt-5 border-t border-[#EFE8DE] pt-4 text-[13px] text-[#565250] leading-[1.55]">
                  {formatNumber(rightTotal)} × {pct}% = <b className="font-bold text-[#1A1A1A]">{formatNumber(rightEnabled)}</b>.{isNursing ? " Time back runs on these shifts." : ` Everything after this builds on the documented ${documentedUnit}, not the full book.`}
                </div>
                {isNursing && nursingDays > 0 && (
                  <div className="mt-5 rounded-[16px] border border-[#E6DCCE] bg-[#F6F1EA]/80 px-4 py-4">
                    <div className="font-abridge text-[36px] leading-none text-[#1A1A1A] tabular-nums">{formatNumber(Math.round(nursingDays * (pct / 100)))}</div>
                    <div className="text-[14px] font-semibold text-[#1A1A1A] mt-2">documented patient-days a year</div>
                    <div className="text-[13px] text-[#565250] mt-1.5 leading-[1.5]">
                      {formatNumber(state.nursingStaffedBeds)} beds × {state.nursingOccupancyRate}% × 365 = {formatNumber(nursingDays)}, × {pct}%. Quality runs on these.
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-5 text-[14px] text-[#6B6259] leading-relaxed">
                Your annual {documentedUnit} times the share documented with Abridge. Fill in the numbers and it builds here.
              </p>
            )}
            </div>
          </div>
            <button
              type="button"
              disabled={!isValid}
              onClick={onNext}
              data-testid="ed-practice-continue"
              className="w-full bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[15px] rounded-full hover:bg-[#d12800] transition-colors shadow-[0_10px_24px_-12px_rgba(234,44,0,0.6)] disabled:opacity-40 disabled:shadow-none"
            >
              Continue →
            </button>
          </div>
        </div>

      </div>
    </EditorialShell>
  );
}
