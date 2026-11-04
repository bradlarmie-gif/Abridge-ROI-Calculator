import { Plus, X } from "lucide-react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState, type TimePathScenario } from "../ExploreFlow";
import { useCountUp } from "@/lib/useCountUp";
import { quickFillChip } from "./quickFillChip";
import { NumberField } from "@/components/NumberField";
import { TimeBackArt } from "@/pages/hub/hubArt";

interface EdTimeSavingsProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  onReturnToBusinessCase?: () => void;
}

// Inpatient quick-fills, by note type. H&P is the heavy narrative note (once per
// admission); the progress note is lighter but repeats every day of stay.
const INPATIENT_PRESETS: Record<"conservative" | "typical" | "aggressive", { hp: number; prog: number }> = {
  conservative: { hp: 8, prog: 2 },
  typical: { hp: 12, prog: 3 },
  aggressive: { hp: 16, prog: 5 },
};

const fmt = (n: number) => Math.round(n).toLocaleString();

const sectLabel = "text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#8C8073]";

// Boxed entry figure, same as the Practice step: white box, coral focus.
function NumBox({ value, onChange, suffix, testId }: { value: number; onChange: (n: number) => void; suffix: string; step?: number; testId?: string }) {
  return (
    <span className="flex items-baseline justify-end gap-[6px] whitespace-nowrap w-[150px] rounded-[12px] border border-[#E2D8CB] bg-white pl-4 pr-5 py-2.5 shadow-[inset_0_1px_2px_rgba(26,26,26,0.04)] focus-within:border-[#EA2C00] focus-within:ring-2 focus-within:ring-[#EA2C00]/15 transition-colors">
      <NumberField
        value={value}
        onValueChange={onChange}
        data-testid={testId}
        className="w-full min-w-0 text-right text-[19px] font-bold text-[#1A1A1A] tabular-nums bg-transparent border-0 p-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="font-sans text-[13px] text-[#6B6259]">{suffix}</span>
    </span>
  );
}

function NoteRow({ title, sub, value, onChange, testId }: { title: string; sub: string; value: number; onChange: (n: number) => void; testId?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 py-4 border-b border-[#E6DCCF]">
      <div>
        <div className="text-[15px] font-semibold text-[#1A1A1A]">{title}</div>
        <div className="text-[12.5px] text-[#6B6259] mt-1 leading-[1.45] max-w-[340px]">{sub}</div>
      </div>
      <NumBox value={value} onChange={onChange} suffix="min" testId={testId} />
    </div>
  );
}

const CARD_TAN = "rounded-[20px] border border-[#E9E0D4] bg-[#F6F1EA]/90 px-5 sm:px-6 py-5";
const PANEL = "rounded-[22px] border border-[#E9E0D4] bg-white shadow-[0_1px_2px_rgba(26,26,26,0.04),0_16px_40px_-24px_rgba(26,26,26,0.24)] overflow-hidden";
const PANEL_HEAD = "px-6 pt-5 pb-4 bg-[#F6F1EA]/80 border-b border-[#E6DCCF] text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#EA2C00]";
const GROUP_LABEL = "text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#443A32]";
const CONTINUE = "w-full bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[15px] rounded-full hover:bg-[#d12800] transition-colors shadow-[0_10px_24px_-12px_rgba(234,44,0,0.6)] disabled:opacity-40 disabled:shadow-none";

export default function EdTimeSavings({ state, updateState, onNext, onBack, onHome }: EdTimeSavingsProps) {
  const isED = state.careSetting === "ed";
  const isInpatient = state.careSetting === "inpatient";
  const isNursing = state.careSetting === "nursing";

  const eligibleEncounters = Math.round(state.annualEncounters * (state.utilizationPercent / 100));

  const scenarioMinutes: Record<string, number> = isED
    ? { conservative: 2, typical: 3, aggressive: 5 }
    : isInpatient
      ? { conservative: 15, typical: 30, aggressive: 40 }
      : isNursing
        ? { conservative: 20, typical: 30, aggressive: 40 }
        : { conservative: 2, typical: 3, aggressive: 4 };
  // No auto-seed: the screen starts blank (placeholder) and the rep picks a
  // quick-fill or types their own, like the other steps. Nothing is pre-selected.

  const nursingShiftsPerYear = state.numberOfProviders * state.nursingShiftsPerNurseYear;
  const nursingEligibleShifts = Math.round(nursingShiftsPerYear * (state.utilizationPercent / 100));

  const hoursSaved = isNursing
    ? Math.round((state.minutesSavedPerEncounter * nursingEligibleShifts) / 60)
    : Math.round((state.minutesSavedPerEncounter * eligibleEncounters) / 60);

  // --- Inpatient per-note breakdown (only meaningful when isInpatient). The
  // parts are summed for the hero so the "how it adds up" arithmetic foots
  // exactly to the number shown. minutesSavedPerEncounter (the blended
  // per-admission minutes the value engine reads) is derived in ExploreFlow. ---
  const ipProgressDays = Math.max(0, state.inpatientAlos - 1);
  const ipConsultMin = state.inpatientConsultsEnabled ? state.inpatientConsultMinutes : 0;
  const ipHpHours = Math.round((eligibleEncounters * state.inpatientHpMinutes) / 60);
  const ipProgHours = Math.round((eligibleEncounters * state.inpatientProgressMinutes * ipProgressDays) / 60);
  const ipConsultHours = Math.round((eligibleEncounters * ipConsultMin) / 60);
  const ipTotalHours = ipHpHours + ipProgHours + ipConsultHours;
  const ipPerStay = state.minutesSavedPerEncounter; // = hp + prog*(alos-1) + consults

  // Per-provider weekly time saved. When it's under 0.1 hr it rounds to an
  // unhelpful "0.0", so show minutes instead (e.g. "~2 min"). Mirrors the
  // logic in ExploreTimeSavings.tsx, split into value/unit for the band UI.
  const perWeek = (() => {
    if (state.numberOfProviders <= 0) return { value: "0", unit: "hours back" };
    const hrs = hoursSaved / state.numberOfProviders / 48;
    if (hrs > 0 && hrs < 0.1) {
      const mins = hrs * 60;
      return mins < 1 ? { value: "<1", unit: "min back" } : { value: `~${Math.round(mins)}`, unit: "min back" };
    }
    return { value: hrs.toFixed(1), unit: "hours back" };
  })();

  const handleScenarioSelect = (scenario: "conservative" | "typical" | "aggressive") => {
    updateState({
      timePathScenario: scenario,
      minutesSavedPerEncounter: scenarioMinutes[scenario],
    });
  };

  const handleCustomMinutes = (v: number) => {
    updateState({ minutesSavedPerEncounter: v, timePathScenario: "custom" as TimePathScenario });
  };

  const formatNumber = (n: number) => n.toLocaleString();
  const shownHours = useCountUp(hoursSaved > 0 ? hoursSaved : 0);
  const shownIpHours = useCountUp(ipTotalHours > 0 ? ipTotalHours : 0);

  const noteUnit = isNursing ? "shift" : "note";
  const volumeValue = isNursing ? nursingEligibleShifts : eligibleEncounters;
  const settingWord = isNursing ? "nursing" : isED ? "ED" : isInpatient ? "inpatient" : "outpatient";
  const roleWord = isNursing ? "nurse" : "provider";

  const scenarioChips: { key: "conservative" | "typical" | "aggressive"; label: string }[] = [
    { key: "conservative", label: "Conservative" },
    { key: "typical", label: "Typical" },
    { key: "aggressive", label: "High adoption" },
  ];

  const isValid = state.minutesSavedPerEncounter > 0;

  // ============================ INPATIENT ============================
  // Inpatient is modeled per note type (H&P + progress × stay + optional
  // consults), so it gets its own build card. OP / ED / nursing use the single
  // minutes-per-note card below, unchanged.
  if (isInpatient) {
    const setHp = (v: number) => updateState({ inpatientHpMinutes: v, timePathScenario: "custom" as TimePathScenario });
    const setProg = (v: number) => updateState({ inpatientProgressMinutes: v, timePathScenario: "custom" as TimePathScenario });
    const setConsultMin = (v: number) => updateState({ inpatientConsultMinutes: v });
    const setAlos = (v: number) => updateState({ inpatientAlos: v });
    const pickPreset = (key: "conservative" | "typical" | "aggressive") =>
      updateState({ timePathScenario: key, inpatientHpMinutes: INPATIENT_PRESETS[key].hp, inpatientProgressMinutes: INPATIENT_PRESETS[key].prog });
    const activePreset = (["conservative", "typical", "aggressive"] as const).find(
      (k) => INPATIENT_PRESETS[k].hp === state.inpatientHpMinutes && INPATIENT_PRESETS[k].prog === state.inpatientProgressMinutes
    );

    const entered = ipPerStay > 0;
    const segs = [
      { label: "H&P", hours: ipHpHours, color: "#EA2C00" },
      { label: "Progress", hours: ipProgHours, color: "#F26A45" },
      ...(state.inpatientConsultsEnabled && ipConsultHours > 0 ? [{ label: "Consults", hours: ipConsultHours, color: "#F7A488" }] : []),
    ];
    const pct = (h: number) => (ipTotalHours > 0 ? (h / ipTotalHours) * 100 : 0);

    return (
      <EditorialShell>
        <EditorialHeader stepName="Time Savings" stepIndex={3} onBack={onBack} onHome={onHome} />
        <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-14">
          <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Model · Step 3 of 9</div>
          <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[680px]">
            How much time can Abridge give back?
          </h1>
          <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[640px] leading-[1.5]">
            A stay is several notes: an H&amp;P on admission and a progress note each day.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 lg:gap-8 items-start mt-9">
            {/* LEFT — the build */}
            <div className={CARD_TAN}>
              <div className={GROUP_LABEL}>Minutes saved, by note type</div>
              <div className="mt-3 flex items-center gap-[7px] flex-wrap">
                {scenarioChips.map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => pickPreset(key)} className={quickFillChip(activePreset === key)}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <NoteRow title="H&P" sub="Once per admission, the heavy narrative note." value={state.inpatientHpMinutes} onChange={setHp} testId="ed-input-hp-minutes" />
                <NoteRow title="Progress note" sub="One each day after admission, so it scales with stay." value={state.inpatientProgressMinutes} onChange={setProg} testId="ed-input-progress-minutes" />
                {state.inpatientConsultsEnabled ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 py-4 border-b border-[#E6DCCF]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-[#1A1A1A]">Consults</span>
                        <button type="button" onClick={() => updateState({ inpatientConsultsEnabled: false })} className="text-[#B5AFA6] hover:text-[#EA2C00]" aria-label="Remove consults">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[12.5px] text-[#6B6259] mt-1 leading-[1.45] max-w-[340px]">Average time saved per admission from consults.</div>
                    </div>
                    <NumBox value={state.inpatientConsultMinutes} onChange={setConsultMin} suffix="min" testId="ed-input-consult-minutes" />
                  </div>
                ) : (
                  <button type="button" onClick={() => updateState({ inpatientConsultsEnabled: true })} className="flex items-center gap-1.5 text-[13px] font-bold text-[#EA2C00] py-4 border-b border-[#E6DCCF] w-full">
                    <Plus className="w-3.5 h-3.5" /> Add consults (optional)
                  </button>
                )}
                {/* Discharge summary — COMING SOON, not counted (Abridge does not write it yet) */}
                <div className="flex items-center justify-between gap-6 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#A79E92]">Discharge summary</span>
                      <span className="text-[9px] font-extrabold tracking-[0.06em] uppercase text-[#B0A99E] border border-[#E7E1D8] rounded-[5px] px-[6px] py-[2px]">Coming soon</span>
                    </div>
                    <div className="text-[12.5px] text-[#A79E92] mt-1 leading-[1.45] max-w-[340px]">Not counted until Abridge writes it.</div>
                  </div>
                  
                </div>
              </div>

              {/* How it adds up — admissions + ALOS live inline in the math. */}
              <div className="mt-4 pt-4 border-t border-[#E6DCCF]">
                <div className="text-[15px] text-[#3A342E] leading-[1.7]">
                  <b className="font-bold text-[#1A1A1A]">{fmt(eligibleEncounters)}</b> admissions on Abridge a year, at a{" "}
                  <NumberField
                    value={state.inpatientAlos}
                    onValueChange={setAlos}
                    data-testid="ed-input-alos-inline"
                    style={{ width: `${Math.max(2, String(state.inpatientAlos || "").length)}ch` }}
                    className="font-abridge text-[16px] text-[#EA2C00] tabular-nums text-center bg-transparent border-0 border-b-2 border-[#EA2C00] p-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />{" "}
                  day average stay
                </div>
                {entered ? (
                  <>
                    <div className="text-[13.5px] text-[#565250] mt-[9px]">H&amp;P · {fmt(eligibleEncounters)} × {state.inpatientHpMinutes} min = <b className="font-bold text-[#1A1A1A]">{fmt(ipHpHours)} hrs</b></div>
                    <div className="text-[13.5px] text-[#565250] mt-[9px]">Progress · {fmt(eligibleEncounters)} × {Math.round(ipProgressDays * 10) / 10} days after admission × {state.inpatientProgressMinutes} min = <b className="font-bold text-[#1A1A1A]">{fmt(ipProgHours)} hrs</b></div>
                    {state.inpatientConsultsEnabled && ipConsultHours > 0 && (
                      <div className="text-[13.5px] text-[#565250] mt-[9px]">Consults · {fmt(eligibleEncounters)} × {state.inpatientConsultMinutes} min = <b className="font-bold text-[#1A1A1A]">{fmt(ipConsultHours)} hrs</b></div>
                    )}
                  </>
                ) : (
                  <div className="text-[13.5px] text-[#6B6259] mt-[9px]">Pick a quick-fill or type the minutes to see it add up.</div>
                )}
              </div>
            </div>


            {/* RIGHT — time given back + contribution viz */}
            <div className="space-y-4">
            <div className={PANEL} data-testid="ed-time-panel">
              <div className={PANEL_HEAD}>Time given back</div>
              <div className="p-6">
              <div className={`h-[120px] rounded-[16px] border px-4 py-3 transition-colors ${entered ? "border-[#F0CDBF] bg-[#FBEDE6]" : "border-[#E6DCCE] bg-[#EFE7DC]/60"}`}>
                <TimeBackArt active={entered} minutes={ipPerStay} />
              </div>
              {entered ? (
                <>
                  <div className="font-abridge text-[56px] text-[#1A1A1A] leading-[0.9] tabular-nums mt-6">{formatNumber(shownIpHours)}</div>
                  <div className="text-[15px] font-semibold text-[#1A1A1A] mt-2.5">clinician hours a year</div>
                  <div className="text-[13.5px] text-[#565250] mt-2 leading-[1.5]">
                    ≈ <b className="font-bold text-[#1A1A1A]">{fmt(ipPerStay)} min</b> saved per stay · ≈ <b className="font-bold text-[#1A1A1A]">{(ipTotalHours / 2080).toFixed(1)}</b> full-time hospitalists&apos; worth
                  </div>
                  <div className="flex h-[10px] rounded-full overflow-hidden gap-[2px] mt-6">
                    {segs.map((s) => (
                      <span key={s.label} className="block rounded-[3px]" style={{ flex: Math.max(1, s.hours), background: s.color }} />
                    ))}
                    <span className="block rounded-[3px]" style={{ flex: Math.max(1, Math.round(ipTotalHours * 0.16)), background: "repeating-linear-gradient(45deg,#E8E2DA,#E8E2DA 3px,#F5F1EB 3px,#F5F1EB 6px)" }} />
                  </div>
                  <div className="flex flex-wrap gap-x-[22px] gap-y-[9px] mt-[18px] text-[13px] text-[#565250]">
                    {segs.map((s) => (
                      <span key={s.label} className="flex items-center gap-[7px]"><span className="w-[9px] h-[9px] rounded-full" style={{ background: s.color }} />{s.label} · <b className="font-bold text-[#1A1A1A]">{fmt(s.hours)} hrs</b></span>
                    ))}
                    <span className="text-[#B0A99E]">Discharge summary · coming</span>
                  </div>
                  <div className="mt-5 border-t border-[#EFE8DE] pt-4 text-[13px] text-[#565250] leading-[1.55]">
                    Today&apos;s notes only. Time back, not dollars yet.
                  </div>
                </>
              ) : (
                <p className="mt-5 text-[14px] text-[#6B6259] leading-relaxed">Set the minutes and the hours fill in here, split by note type.</p>
              )}
              </div>
            </div>
            <button type="button" disabled={!isValid} onClick={onNext} data-testid="ed-timesavings-continue" className={CONTINUE}>
              Continue →
            </button>
            </div>
          </div>
        </div>
      </EditorialShell>
    );
  }

  // ==================== OUTPATIENT / ED / NURSING ====================
  return (
    <EditorialShell>
      <EditorialHeader stepName="Time Savings" stepIndex={3} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-12 sm:pt-16 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">
          Value Model · Step 3 of 9
        </div>
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[640px]">
          How much time can Abridge give back?
        </h1>
        <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[600px] leading-[1.5]">
          {isNursing
            ? "A little time off charting each shift adds up across every nurse."
            : "A couple of minutes off each note adds up across the volume."}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 lg:gap-8 items-start mt-9">
          {/* LEFT — the build */}
          <div className={CARD_TAN}>
            <div className={GROUP_LABEL}>Minutes saved</div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 py-4 border-b border-[#E6DCCF]">
              <div>
                <div className="text-[15px] font-semibold text-[#1A1A1A]">Time saved per {noteUnit}</div>
                <div className="text-[12.5px] text-[#6B6259] mt-1 leading-[1.45] max-w-[340px]">The average minutes Abridge takes off each {noteUnit}.</div>
              </div>
              <span className="inline-flex items-baseline justify-end gap-[6px] whitespace-nowrap w-[150px] rounded-[12px] border border-[#E2D8CB] bg-white pl-4 pr-5 py-2.5 shadow-[inset_0_1px_2px_rgba(26,26,26,0.04)] focus-within:border-[#EA2C00] focus-within:ring-2 focus-within:ring-[#EA2C00]/15 transition-colors">
                <FormattedNumberInput
                  value={state.minutesSavedPerEncounter}
                  onChange={handleCustomMinutes}
                  step={0.1}
                  placeholder={isNursing ? "e.g. 30" : "e.g. 2.5"}
                  data-testid="ed-input-minutes-saved"
                  className="w-full min-w-0 text-right text-[19px] font-bold leading-none text-[#1A1A1A] tabular-nums bg-transparent border-0 p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[15px] placeholder:font-normal placeholder:not-italic placeholder:text-[#B5AA9B]"
                />
                <span className="font-sans text-[13px] text-[#6B6259]">min</span>
              </span>
            </div>
            <div className="mt-3.5 flex items-center gap-[7px] flex-wrap">
              {scenarioChips.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => handleScenarioSelect(key)} className={quickFillChip(state.timePathScenario === key)}>
                  {label} · {scenarioMinutes[key]}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#E6DCCF]">
              <div className="text-[15px] text-[#3A342E] leading-[1.7]">
                <b className="font-bold text-[#1A1A1A]">{formatNumber(volumeValue)}</b> Abridge {noteUnit}s a year
              </div>
              {state.minutesSavedPerEncounter > 0 ? (
                <div className="text-[13.5px] text-[#565250] mt-[9px]">
                  × <b className="font-bold text-[#1A1A1A]">{state.minutesSavedPerEncounter} min</b> saved on each = <b className="font-bold text-[#1A1A1A]">{formatNumber(hoursSaved)} hrs</b>
                </div>
              ) : (
                <div className="text-[13.5px] text-[#6B6259] mt-[9px]">Pick a quick-fill or type the minutes to see it add up.</div>
              )}
              <p className="text-[12.5px] text-[#6B6259] mt-3 leading-[1.5]">Quick-fills are conservative {settingWord} starting points.</p>
            </div>
          </div>


          {/* RIGHT — the result */}
          <div className="space-y-4">
          <div className={PANEL} data-testid="ed-time-panel">
            <div className={PANEL_HEAD}>Time given back</div>
            <div className="p-6">
            <div className={`h-[120px] rounded-[16px] border px-4 py-3 transition-colors ${hoursSaved > 0 ? "border-[#F0CDBF] bg-[#FBEDE6]" : "border-[#E6DCCE] bg-[#EFE7DC]/60"}`}>
              <TimeBackArt active={hoursSaved > 0} minutes={state.minutesSavedPerEncounter} />
            </div>
            {hoursSaved > 0 ? (
              <>
                <div className="font-abridge text-[56px] text-[#1A1A1A] leading-[0.9] tabular-nums mt-6">{formatNumber(shownHours)}</div>
                <div className="text-[15px] font-semibold text-[#1A1A1A] mt-2.5">{isNursing ? "nurse" : "clinician"} hours a year</div>
                <div className="text-[13.5px] text-[#565250] mt-2 leading-[1.5]">
                  ≈ <b className="font-bold text-[#1A1A1A]">{(hoursSaved / 2080).toFixed(1)}</b> full-time {roleWord}s&apos; worth of documentation time
                </div>
                <div className="mt-1.5 text-[13.5px] text-[#565250] leading-[1.5]">
                  about <b className="font-bold text-[#1A1A1A]">{perWeek.value} {perWeek.unit}</b> for every {roleWord}, every week
                </div>
                <div className="mt-5 border-t border-[#EFE8DE] pt-4 text-[13px] text-[#565250] leading-[1.55]">
                  {formatNumber(volumeValue)} {noteUnit}s × {state.minutesSavedPerEncounter} min ÷ 60. Time back, not dollars yet.
                </div>
              </>
            ) : (
              <p className="mt-5 text-[14px] text-[#6B6259] leading-relaxed">Set the minutes and the hours given back fill in here.</p>
            )}
            </div>
          </div>
          <button type="button" disabled={!isValid} onClick={onNext} data-testid="ed-timesavings-continue" className={CONTINUE}>
            Continue →
          </button>
          </div>
        </div>
      </div>
    </EditorialShell>
  );
}
