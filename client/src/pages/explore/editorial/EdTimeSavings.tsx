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

const sectLabel = "text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#8C8073]";

// Editorial entry figure: a coral-underlined number that hugs its width, with a
// small unit beside it. Matches the Practice page's input styling.
function NumBox({ value, onChange, suffix, step = 0.5, testId }: { value: number; onChange: (n: number) => void; suffix: string; step?: number; testId?: string }) {
  return (
    <span className="flex items-baseline justify-end gap-[5px] border-b-2 border-[#EA2C00] pb-[2px] whitespace-nowrap w-[120px]">
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        data-testid={testId}
        className="max-w-full [field-sizing:content] text-right font-abridge text-[30px] text-[#1A1A1A] tabular-nums bg-transparent border-0 p-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span className="font-sans text-[13px] text-[#8C8073]">{suffix}</span>
    </span>
  );
}

function NoteRow({ title, sub, value, onChange, testId }: { title: string; sub: string; value: number; onChange: (n: number) => void; testId?: string }) {
  return (
    <div className="flex items-end justify-between gap-6 py-5 border-b border-[#EDE8E1]">
      <div>
        <div className="font-abridge text-[16px] font-bold text-[#1A1A1A]">{title}</div>
        <div className="text-[13px] text-[#8C8073] mt-1 leading-[1.45] max-w-[320px]">{sub}</div>
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
        <div className="max-w-[1080px] mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-14">
          <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">Value Estimator · Step 3 of 9</div>
          <h1 className="font-abridge text-[27px] sm:text-[34px] lg:text-[40px] leading-[1.08] text-[#1A1A1A] mt-[10px] max-w-[680px]">
            How much time can Abridge give back?
          </h1>
          <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[640px] leading-[1.5]">
            An inpatient stay is several notes, not one: an H&amp;P on admission and a progress note each day. This is
            the total time saved across the notes Abridge writes today, per admission.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1px_1fr] gap-x-[56px] gap-y-10 mt-[46px]">
            {/* LEFT — the build */}
            <div>
              <div className={sectLabel}>Minutes saved, by note type</div>
              <div className="mt-4 flex items-center gap-[7px] flex-wrap">
                <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#B0A99E]">Quick fill</span>
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
                  <div className="flex items-end justify-between gap-6 py-5 border-b border-[#EDE8E1]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-abridge text-[16px] font-bold text-[#1A1A1A]">Consults</span>
                        <button type="button" onClick={() => updateState({ inpatientConsultsEnabled: false })} className="text-[#B5AFA6] hover:text-[#EA2C00]" aria-label="Remove consults">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[13px] text-[#8C8073] mt-1 leading-[1.45] max-w-[320px]">Average time saved per admission from consults.</div>
                    </div>
                    <NumBox value={state.inpatientConsultMinutes} onChange={setConsultMin} suffix="min" testId="ed-input-consult-minutes" />
                  </div>
                ) : (
                  <button type="button" onClick={() => updateState({ inpatientConsultsEnabled: true })} className="flex items-center gap-1.5 text-[13px] font-bold text-[#EA2C00] py-5 border-b border-[#EDE8E1] w-full">
                    <Plus className="w-3.5 h-3.5" /> Add consults (optional)
                  </button>
                )}
                {/* Discharge summary — COMING SOON, not counted (Abridge does not write it yet) */}
                <div className="flex items-end justify-between gap-6 py-5 border-b border-[#EDE8E1]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-abridge text-[16px] font-bold text-[#C6BEB2]">Discharge summary</span>
                      <span className="text-[9px] font-extrabold tracking-[0.06em] uppercase text-[#B0A99E] border border-[#E7E1D8] rounded-[5px] px-[6px] py-[2px]">Coming soon</span>
                    </div>
                    <div className="text-[13px] text-[#C6BEB2] mt-1 leading-[1.45] max-w-[320px]">The other heavy note. More time back once it lands, not counted today.</div>
                  </div>
                  <span className="text-[12px] text-[#C6BEB2] italic whitespace-nowrap flex-shrink-0">not counted yet</span>
                </div>
              </div>

              {/* How it adds up — admissions + ALOS live inline in the math. */}
              <div className="mt-8">
                <div className="text-[15px] text-[#3A342E] leading-[1.7]">
                  <b className="font-bold text-[#1A1A1A]">{fmt(eligibleEncounters)}</b> admissions on Abridge a year, at a{" "}
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
                </div>
                {entered ? (
                  <>
                    <div className="text-[14px] text-[#8C8073] mt-[9px]">H&amp;P · {fmt(eligibleEncounters)} × {state.inpatientHpMinutes} min = <b className="font-bold text-[#1A1A1A]">{fmt(ipHpHours)} hrs</b></div>
                    <div className="text-[14px] text-[#8C8073] mt-[9px]">Progress · {fmt(eligibleEncounters)} × {Math.round(ipProgressDays * 10) / 10} days after admission × {state.inpatientProgressMinutes} min = <b className="font-bold text-[#1A1A1A]">{fmt(ipProgHours)} hrs</b></div>
                    {state.inpatientConsultsEnabled && ipConsultHours > 0 && (
                      <div className="text-[14px] text-[#8C8073] mt-[9px]">Consults · {fmt(eligibleEncounters)} × {state.inpatientConsultMinutes} min = <b className="font-bold text-[#1A1A1A]">{fmt(ipConsultHours)} hrs</b></div>
                    )}
                  </>
                ) : (
                  <div className="text-[14px] text-[#B5AFA6] mt-[9px]">Pick a quick-fill or type the minutes above to see it add up.</div>
                )}
              </div>
            </div>

            {/* vertical hairline */}
            <div className="hidden lg:block bg-[#E8E2DA]" />

            {/* RIGHT — time given back + contribution viz */}
            <div>
              <div className={sectLabel}>Time given back</div>
              {entered ? (
                <>
                  <div className="font-abridge text-[64px] sm:text-[88px] text-[#EA2C00] leading-[0.88] tabular-nums mt-[22px]">{formatNumber(shownIpHours)}</div>
                  <div className="font-abridge text-[20px] text-[#1A1A1A] mt-3">clinician hours a year</div>
                  <div className="text-[15.5px] text-[#565250] mt-[18px] leading-[1.5]">
                    ≈ <b className="font-bold text-[#1A1A1A]">{fmt(ipPerStay)} min</b> saved per stay · ≈ <b className="font-bold text-[#1A1A1A]">{(ipTotalHours / 2080).toFixed(1)}</b> full-time hospitalists&apos; worth
                  </div>
                  <div className="flex h-[10px] rounded-full overflow-hidden gap-[2px] mt-[30px] max-w-[460px]">
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
                  <div className="mt-9 border-t border-[#EDE8E1] pt-5 text-[13.5px] text-[#8C8073] leading-[1.55] max-w-[420px]">
                    Today&apos;s notes only. The discharge summary adds more once it ships; we don&apos;t count what Abridge doesn&apos;t write yet.
                  </div>
                </>
              ) : (
                <div className="mt-[22px] max-w-[360px]">
                  <div className="font-abridge text-[23px] text-[#3A342E] leading-[1.2]">The hours given back</div>
                  <p className="text-[14px] text-[#8A8073] leading-[1.6] mt-3">
                    Pick a quick-fill or set the minutes on the left, and the time given back fills in here, split by note type.
                  </p>
                  <div className="mt-7 h-[10px] rounded-full bg-[#F1ECE4] max-w-[460px]" />
                  <div className="mt-4 flex flex-wrap gap-x-[22px] gap-y-[9px] text-[13px] text-[#B0A99E]">
                    <span className="flex items-center gap-[7px]"><span className="w-[9px] h-[9px] rounded-full bg-[#E4DED5]" /> H&amp;P</span>
                    <span className="flex items-center gap-[7px]"><span className="w-[9px] h-[9px] rounded-full bg-[#E4DED5]" /> Progress</span>
                    <span>Discharge summary · coming</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-14">
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
      <div className="max-w-[1080px] mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-14">
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

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1px_1fr] gap-x-[56px] gap-y-10 mt-[46px]">
          {/* LEFT — the build */}
          <div>
            <div className={sectLabel}>Minutes saved per {noteUnit}</div>

            <div className="flex items-end justify-between gap-6 py-5 border-b border-[#EDE8E1] mt-4">
              <div>
                <div className="font-abridge text-[16px] font-bold text-[#1A1A1A]">Time saved per {noteUnit}</div>
                <div className="text-[13px] text-[#8C8073] mt-1 leading-[1.45] max-w-[320px]">The average minutes Abridge takes off each {noteUnit}.</div>
              </div>
              <span className="inline-flex items-baseline gap-[5px] border-b-2 border-[#EA2C00] pb-[2px] whitespace-nowrap">
                <FormattedNumberInput
                  value={state.minutesSavedPerEncounter}
                  onChange={handleCustomMinutes}
                  step={0.1}
                  placeholder="e.g. 2.5"
                  data-testid="ed-input-minutes-saved"
                  className="min-w-[36px] max-w-[120px] [field-sizing:content] text-right font-abridge text-[30px] leading-none text-[#1A1A1A] tabular-nums bg-transparent border-0 p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-[15px] placeholder:font-sans placeholder:font-normal placeholder:not-italic placeholder:text-[#C7BFB4]"
                />
                <span className="font-sans text-[13px] text-[#8C8073]">min</span>
              </span>
            </div>
            <div className="mt-[14px] flex items-center gap-[7px] flex-wrap">
              <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#B0A99E]">Quick fill</span>
              {scenarioChips.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => handleScenarioSelect(key)} className={quickFillChip(state.timePathScenario === key)}>
                  {label} · {scenarioMinutes[key]}
                </button>
              ))}
            </div>

            <div className="mt-8">
              <div className="text-[15px] text-[#3A342E] leading-[1.7]">
                <b className="font-bold text-[#1A1A1A]">{formatNumber(volumeValue)}</b> Abridge {noteUnit}s a year
              </div>
              {state.minutesSavedPerEncounter > 0 ? (
                <div className="text-[14px] text-[#8C8073] mt-[9px]">
                  × <b className="font-bold text-[#1A1A1A]">{state.minutesSavedPerEncounter} min</b> saved on each = <b className="font-bold text-[#1A1A1A]">{formatNumber(hoursSaved)} hrs</b>
                </div>
              ) : (
                <div className="text-[14px] text-[#B5AFA6] mt-[9px]">Pick a starting point or type the minutes above to see it add up.</div>
              )}
              <p className="text-[12.5px] text-[#B0A99E] mt-4 leading-[1.5] max-w-[360px]">
                The quick-fills are seeded conservatively from {settingWord} implementations. You measure the real number on Progress.
              </p>
            </div>
          </div>

          {/* vertical hairline */}
          <div className="hidden lg:block bg-[#E8E2DA]" />

          {/* RIGHT — the result */}
          <div>
            <div className={sectLabel}>Time given back</div>
            {hoursSaved > 0 ? (
              <>
                <div className="font-abridge text-[64px] sm:text-[88px] text-[#EA2C00] leading-[0.88] tabular-nums mt-[22px]">{formatNumber(shownHours)}</div>
                <div className="font-abridge text-[20px] text-[#1A1A1A] mt-3">{isNursing ? "nurse" : "clinician"} hours a year</div>
                <div className="text-[15.5px] text-[#565250] mt-[18px] leading-[1.5]">
                  ≈ <b className="font-bold text-[#1A1A1A]">{(hoursSaved / 2080).toFixed(1)}</b> full-time {roleWord}s&apos; worth of documentation time
                </div>
                <div className="mt-[18px] text-[15.5px] text-[#565250] leading-[1.5]">
                  about <b className="font-bold text-[#1A1A1A]">{perWeek.value} {perWeek.unit}</b> for every {roleWord}, every week
                </div>
                <div className="mt-9 border-t border-[#EDE8E1] pt-5 text-[13.5px] text-[#8C8073] leading-[1.55] max-w-[420px]">
                  Time back, not dollars yet; we turn it into value on the next screens.
                </div>
              </>
            ) : (
              <div className="mt-[22px] max-w-[360px]">
                <div className="font-abridge text-[23px] text-[#3A342E] leading-[1.2]">The hours given back</div>
                <p className="text-[14px] text-[#8A8073] leading-[1.6] mt-3">
                  Set the minutes on the left and the time given back fills in here, in {isNursing ? "nurse" : "clinician"} hours a year.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-14">
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
