import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState, type TimePathScenario } from "../ExploreFlow";
import { useCountUp } from "@/lib/useCountUp";

interface EdTimeSavingsProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  onReturnToBusinessCase?: () => void;
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

  return (
    <EditorialShell>
      <EditorialHeader stepName="Time Savings" stepIndex={3} onBack={onBack} onHome={onHome} />
      <div className="max-w-[1160px] mx-auto px-5 sm:px-8 lg:px-12 pt-12 pb-14">
        <div className="text-[11px] font-extrabold tracking-[1.3px] uppercase text-[#565250]">
          Explore · Step 3 of 9
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
                  className={`text-[12px] font-bold border rounded-[9px] px-[11px] py-[6px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-1 ${
                    state.timePathScenario === key
                      ? "border-[#EA2C00] text-[#EA2C00] bg-[#FFF7F4]"
                      : "border-[#E7E3DD] text-[#565250] bg-white hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                  }`}
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
                  <div className="text-[16px] text-[#574C41] mt-2">clinician hours a year</div>
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
                  <div className="text-[16px] text-[#B8B0A6] mt-2">clinician hours a year</div>
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
