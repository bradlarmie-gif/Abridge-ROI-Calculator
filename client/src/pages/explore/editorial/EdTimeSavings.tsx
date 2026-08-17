import { Plus, X } from "lucide-react";
import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState, type TimePathScenario } from "../ExploreFlow";
import { useCountUp } from "@/lib/useCountUp";
import { quickFillChip } from "./quickFillChip";

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

// Two-level flex: outer items-center vertically CENTERS the group in the box; inner
// items-baseline keeps the value and unit on one baseline. Value hugs its width so
// it's centered, never floated-right over dead space, and decimals never clip.
function NumBox({ value, onChange, suffix, w = "w-[84px]", step = 0.5, testId }: { value: number; onChange: (n: number) => void; suffix: string; w?: string; step?: number; testId?: string }) {
  return (
    <span className={`inline-flex items-center justify-center border border-[#E4DED6] rounded-[10px] bg-white h-[42px] ${w} focus-within:border-[#EA2C00] transition-colors`}>
      <span className="inline-flex items-baseline gap-1">
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          data-testid={testId}
          style={{ width: `${Math.max(1, String(value || "").length)}ch` }}
          className="text-right font-abridge text-[19px] text-[#1A1A1A] tabular-nums bg-transparent border-0 p-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-[12px] text-[#7C766F] whitespace-nowrap">{suffix}</span>
      </span>
    </span>
  );
}

function NoteRow({ title, sub, value, onChange, testId }: { title: string; sub: string; value: number; onChange: (n: number) => void; testId?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-[15px] font-semibold text-[#1A1A1A]">{title}</div>
        <div className="text-[12.5px] text-[#7C766F]">{sub}</div>
      </div>
      <NumBox value={value} onChange={onChange} suffix="min" testId={testId} />
    </div>
  );
}

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
        <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-14">
          <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Estimator · Step 3 of 9</div>
          <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[680px]">
            How much time can Abridge give back?
          </h1>
          <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[640px] leading-[1.5]">
            An inpatient stay is several notes, not one: an H&amp;P on admission and a progress note each day. This is
            the total time saved across the notes Abridge writes today, per admission.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[22px] mt-[34px] items-stretch">
            {/* LEFT — the build */}
            <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] px-7 py-[28px] flex flex-col">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822]">Minutes saved, by note type</div>
              <div className="mt-3 flex items-center gap-[7px] flex-wrap">
                <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F]">Quick fill</span>
                {scenarioChips.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => pickPreset(key)}
                    className={quickFillChip(activePreset === key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                <NoteRow title="H&P" sub="Once per admission, the heavy narrative note." value={state.inpatientHpMinutes} onChange={setHp} testId="ed-input-hp-minutes" />
                <NoteRow title="Progress note" sub="One each day after admission, so it scales with stay." value={state.inpatientProgressMinutes} onChange={setProg} testId="ed-input-progress-minutes" />
                {state.inpatientConsultsEnabled ? (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-[#1A1A1A]">Consults</span>
                        <button type="button" onClick={() => updateState({ inpatientConsultsEnabled: false })} className="text-[#B5AFA6] hover:text-[#EA2C00]" aria-label="Remove consults">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[12.5px] text-[#7C766F]">Average time saved per admission from consults.</div>
                    </div>
                    <NumBox value={state.inpatientConsultMinutes} onChange={setConsultMin} suffix="min" testId="ed-input-consult-minutes" />
                  </div>
                ) : (
                  <button type="button" onClick={() => updateState({ inpatientConsultsEnabled: true })} className="flex items-center gap-1.5 text-[13px] font-bold text-[#EA2C00]">
                    <Plus className="w-3.5 h-3.5" /> Add consults (optional)
                  </button>
                )}
                {/* Discharge summary — COMING SOON, not counted (Abridge does not write it yet) */}
                <div className="flex items-center justify-between gap-4 opacity-60">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#8A8073]">Discharge summary</span>
                      <span className="text-[9px] font-extrabold tracking-[0.06em] uppercase text-[#8A8072] bg-[#F2ECE3] rounded-full px-[8px] py-[2px]">Coming soon</span>
                    </div>
                    <div className="text-[12.5px] text-[#9A9086]">The other heavy note. More time back once it lands, not counted today.</div>
                  </div>
                  <span className="text-[12px] text-[#B5AFA6] italic whitespace-nowrap flex-shrink-0">not counted yet</span>
                </div>
              </div>

              {/* How it adds up — admissions + ALOS live inline in the math (from
                  Practice), not a redundant re-entry block. ALOS stays editable
                  here (coral underline = editable) since it drives this screen. */}
              <div className="mt-8 pt-7 border-t border-[#E7E3DD]">
                <div className="text-[10px] font-extrabold tracking-[0.06em] uppercase text-[#443A32] mb-2">How it adds up</div>
                <div className="text-[13.5px] text-[#565250] leading-[1.95]">
                  <b className="font-abridge text-[16px] text-[#1A1A1A]">{fmt(eligibleEncounters)}</b> admissions on Abridge a year, at a{" "}
                  <input
                    type="number"
                    value={state.inpatientAlos || ""}
                    onChange={(e) => setAlos(parseFloat(e.target.value) || 0)}
                    step={0.1}
                    data-testid="ed-input-alos-inline"
                    style={{ width: `${Math.max(2, String(state.inpatientAlos || "").length)}ch` }}
                    className="font-abridge text-[16px] text-[#EA2C00] tabular-nums text-center bg-transparent border-0 border-b-2 border-[#EA2C00] p-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />{" "}
                  day average stay
                  {entered ? (
                    <>
                      <br />
                      H&amp;P: {fmt(eligibleEncounters)} × {state.inpatientHpMinutes} min = <b className="text-[#1A1A1A]">{fmt(ipHpHours)} hrs</b>
                      <br />
                      Progress: {fmt(eligibleEncounters)} × {Math.round(ipProgressDays * 10) / 10} days after admission × {state.inpatientProgressMinutes} min = <b className="text-[#1A1A1A]">{fmt(ipProgHours)} hrs</b>
                      {state.inpatientConsultsEnabled && ipConsultHours > 0 && (
                        <>
                          <br />
                          Consults: {fmt(eligibleEncounters)} × {state.inpatientConsultMinutes} min = <b className="text-[#1A1A1A]">{fmt(ipConsultHours)} hrs</b>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <br />
                      <span className="text-[#B5AFA6]">Pick a quick-fill or type the minutes above to see it add up.</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT — time given back + contribution viz */}
            <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] px-7 py-[28px] flex flex-col">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#443A32]">Time given back</div>
              <div className="flex-1 flex flex-col justify-center">
                {entered ? (
                  <>
                    <div className="leading-[0.85]">
                      <span className="font-abridge text-[68px] sm:text-[84px] text-[#EA2C00] tabular-nums">{formatNumber(shownIpHours)}</span>
                    </div>
                    <div className="text-[16px] text-[#574C41] mt-2">clinician hours a year</div>
                    <div className="text-[15px] text-[#3A342E] mt-3 leading-[1.5]">
                      ≈ <b className="text-[#1A1A1A]">{fmt(ipPerStay)} min</b> saved per stay · ≈ <b className="text-[#1A1A1A]">{(ipTotalHours / 2080).toFixed(1)}</b> full-time hospitalists&apos; worth
                    </div>
                    <div className="mt-8">
                      <div className="flex h-[14px] rounded-full overflow-hidden bg-[#F1ECE4]">
                        {segs.map((s) => (
                          <div key={s.label} style={{ width: `${pct(s.hours)}%`, background: s.color }} />
                        ))}
                        <div className="w-[46px] flex-shrink-0 border-l-2 border-white" style={{ backgroundImage: "repeating-linear-gradient(45deg,#E4DACE 0,#E4DACE 5px,#F1ECE4 5px,#F1ECE4 10px)" }} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]">
                        {segs.map((s) => (
                          <span key={s.label} className="inline-flex items-center gap-[6px] text-[#565250]">
                            <span className="w-[9px] h-[9px] rounded-[3px]" style={{ background: s.color }} /> {s.label} · <b className="text-[#1A1A1A] font-abridge">{fmt(s.hours)} hrs</b>
                          </span>
                        ))}
                        <span className="inline-flex items-center gap-[6px] text-[#9A9086]">
                          <span className="w-[9px] h-[9px] rounded-[3px] border border-dashed border-[#C4BCB0]" /> Discharge summary · coming
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  // Intentional empty state: preview the structure (a ghost bar +
                  // note-type legend) rather than a lone floating dash.
                  <div className="max-w-[340px]">
                    <div className="font-abridge text-[23px] text-[#3A342E] leading-[1.2]">The hours given back</div>
                    <p className="text-[14px] text-[#8A8073] leading-[1.6] mt-3">
                      Pick a quick-fill or set the minutes on the left, and the time given back fills in here, split by note type.
                    </p>
                    <div className="mt-7 h-[14px] rounded-full bg-[#F1ECE4]" />
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-[#B0A99E]">
                      <span className="inline-flex items-center gap-[6px]"><span className="w-[9px] h-[9px] rounded-[3px] bg-[#E4DED5]" /> H&amp;P</span>
                      <span className="inline-flex items-center gap-[6px]"><span className="w-[9px] h-[9px] rounded-[3px] bg-[#E4DED5]" /> Progress</span>
                      <span className="inline-flex items-center gap-[6px]"><span className="w-[9px] h-[9px] rounded-[3px] border border-dashed border-[#C4BCB0]" /> Discharge summary · coming</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="pt-[18px] mt-6 border-t border-[#E7E3DD]">
                <p className="text-[12.5px] text-[#565250] leading-[1.55]">
                  Today&apos;s notes only. The discharge summary adds more once it ships; we don&apos;t count what Abridge doesn&apos;t write yet.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              disabled={!isValid}
              onClick={onNext}
              data-testid="ed-timesavings-continue"
              className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)] disabled:opacity-40"
            >
              Continue →
            </button>
          </div>
        </div>
      </EditorialShell>
    );
  }

  // ==================== OUTPATIENT / ED / NURSING ====================
  return (
    <EditorialShell>
      <EditorialHeader stepName="Time Savings" stepIndex={3} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">
          Value Estimator · Step 3 of 9
        </div>
        <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[640px]">
          How much time can Abridge give back?
        </h1>
        <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[600px] leading-[1.5]">
          A couple of minutes off each {noteUnit} adds up fast across your volume. Pick a starting point or type your
          own; confirm the real figure when you measure.
        </p>

        {/* Two balanced halves: left builds it, right shows the result. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[22px] mt-[34px] items-stretch">
          {/* LEFT — the build (input + presets + how it adds up) */}
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] px-7 py-[28px] flex flex-col">
            <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822]">
              Minutes saved per {noteUnit}
            </div>
            <div className="mt-3 inline-flex items-baseline gap-1 border border-[#E4DED6] rounded-[12px] bg-white px-4 h-[54px] w-full max-w-[240px] focus-within:border-[#EA2C00] transition-colors">
              <FormattedNumberInput
                value={state.minutesSavedPerEncounter}
                onChange={handleCustomMinutes}
                step={0.1}
                placeholder="e.g., 2.5"
                data-testid="ed-input-minutes-saved"
                className="flex-1 self-center font-abridge text-[22px] leading-none text-[#1A1A1A] tabular-nums bg-transparent border-0 p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[15px] placeholder:font-sans placeholder:font-normal placeholder:not-italic placeholder:text-[#B5AFA6]"
              />
              <span className="text-[14px] text-[#565250] self-center">min</span>
            </div>
            <div className="mt-3 flex items-center gap-[7px] flex-wrap">
              <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F]">Quick fill</span>
              {scenarioChips.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleScenarioSelect(key)}
                  className={quickFillChip(state.timePathScenario === key)}
                >
                  {label} · {scenarioMinutes[key]}
                </button>
              ))}
            </div>

            <div className="mt-8 pt-7 border-t border-[#E7E3DD]">
              <div className="text-[10px] font-extrabold tracking-[0.06em] uppercase text-[#443A32] mb-3">How it adds up</div>
              <div className="text-[15px] text-[#565250] leading-[1.85]">
                <b className="font-abridge text-[17px] text-[#1A1A1A]">{formatNumber(volumeValue)}</b> Abridge {noteUnit}s a year<br />
                {state.minutesSavedPerEncounter > 0 ? (
                  <><span className="text-[#AFA491]">×</span> <b className="font-abridge text-[17px] text-[#1A1A1A]">{state.minutesSavedPerEncounter} min</b> saved on each</>
                ) : (
                  <span className="text-[#B5AFA6]">× pick a starting point or type the minutes above</span>
                )}
              </div>
              <p className="text-[12px] text-[#7C766F] mt-3 leading-[1.5]">
                The quick-fills are seeded conservatively from {settingWord} implementations. You measure the real number on Progress.
              </p>
            </div>
          </div>

          {/* RIGHT — the result (moderate hero + the human read) */}
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] px-7 py-[28px] flex flex-col">
            <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#443A32]">
              Time given back
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {hoursSaved > 0 ? (
                <>
                  <div className="leading-[0.85]">
                    <span className="font-abridge text-[68px] sm:text-[84px] text-[#EA2C00] tabular-nums">{formatNumber(shownHours)}</span>
                  </div>
                  <div className="text-[16px] text-[#574C41] mt-2">{isNursing ? "nurse" : "clinician"} hours a year</div>
                  <div className="text-[15px] text-[#3A342E] mt-4 leading-[1.5]">
                    ≈ <b className="text-[#1A1A1A]">{(hoursSaved / 2080).toFixed(1)}</b> full-time {roleWord}s&apos; worth of documentation time
                  </div>
                  <div className="mt-5 pt-5 border-t border-[#EFE7DD] text-[15px] text-[#3A342E] leading-[1.5]">
                    about <b className="text-[#1A1A1A]">{perWeek.value} {perWeek.unit}</b> for every {roleWord}, every week
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[15px] text-[#B8B0A6] leading-[1.6]">Set the minutes to see the time given back.</div>
                  <div className="mt-3 font-abridge text-[68px] sm:text-[84px] text-[#E4DED5] tabular-nums leading-[0.85]">&ndash;</div>
                  <div className="text-[16px] text-[#B8B0A6] mt-2">{isNursing ? "nurse" : "clinician"} hours a year</div>
                </>
              )}
            </div>
            <div className="pt-[18px] border-t border-[#E7E3DD]">
              <p className="text-[12.5px] text-[#565250] leading-[1.55]">
                Time back, not dollars yet; we turn it into value on the next screens.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            type="button"
            disabled={!isValid}
            onClick={onNext}
            data-testid="ed-timesavings-continue"
            className="bg-[#EA2C00] text-white text-[15px] font-bold px-7 py-[14px] rounded-[12px] shadow-[0_2px_6px_rgba(234,44,0,0.15)] disabled:opacity-40"
          >
            Continue →
          </button>
        </div>
      </div>
    </EditorialShell>
  );
}
