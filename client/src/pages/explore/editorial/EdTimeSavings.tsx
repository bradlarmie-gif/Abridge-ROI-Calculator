import { useEffect } from "react";
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

  // The header promises a conservative starting point ("we start conservative").
  // Seed it once, on first arrival, so the screen never lands on all-zeros that
  // contradict its own copy. Guard on timePathScenario === null (never picked);
  // once seeded this will not re-fire, and it never overrides a user's choice.
  useEffect(() => {
    if (state.timePathScenario == null) {
      updateState({
        timePathScenario: "conservative",
        minutesSavedPerEncounter: scenarioMinutes.conservative,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          How much time does Abridge give back?
        </h1>
        <p className="text-[16.5px] text-[#565250] mt-[14px] max-w-[600px] leading-[1.5]">
          A couple of minutes off each {noteUnit} adds up fast across your volume. We start conservative; you confirm
          the real figure when you measure.
        </p>

        {/* Inline editorial — one centered statement; the minutes is editable inside the sentence */}
        <div className="mt-[38px] max-w-[900px] mx-auto">
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[24px] px-8 sm:px-14 py-[52px] text-center">
            <div className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#443A32]">
              Time given back
            </div>

            <div className="mt-6 text-[25px] sm:text-[31px] leading-[1.35] text-[#3A342E]">
              Take{" "}
              <span className="inline-flex items-baseline">
                <FormattedNumberInput
                  value={state.minutesSavedPerEncounter}
                  onChange={handleCustomMinutes}
                  step={0.1}
                  data-testid="ed-input-minutes-saved"
                  className="w-[72px] font-abridge text-[34px] sm:text-[38px] leading-none text-[#EA2C00] tabular-nums text-center bg-transparent border-0 border-b-2 border-[#EA2C00] rounded-none p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <span className="font-abridge text-[25px] text-[#EA2C00] ml-1">min</span>
              </span>{" "}
              off each of <b className="font-abridge text-[#1A1A1A]">{formatNumber(volumeValue)}</b> {noteUnit}s,
            </div>

            <div className="mt-7 leading-[0.88]">
              <span className="font-abridge text-[76px] sm:text-[100px] text-[#EA2C00] tabular-nums">{hoursSaved > 0 ? formatNumber(shownHours) : "—"}</span>
              <span className="text-[22px] text-[#565250]"> hours a year</span>
            </div>

            {hoursSaved > 0 && (
              <div className="mt-6 text-[17px] text-[#3A342E] leading-[1.5]">
                That&apos;s about <b className="text-[#EA2C00]">{perWeek.value} {perWeek.unit}</b> for every {roleWord}, every week.
              </div>
            )}

            <div className="mt-9 flex items-center justify-center gap-[7px] flex-wrap">
              <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#7C766F]">
                Quick fill
              </span>
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
            <p className="text-[12.5px] text-[#7C766F] mt-5 max-w-[540px] mx-auto leading-[1.5]">
              Seeded conservatively from {settingWord} implementations. Time back, not dollars yet; we turn it into value on the next screens.
            </p>
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
      </div>
    </EditorialShell>
  );
}
