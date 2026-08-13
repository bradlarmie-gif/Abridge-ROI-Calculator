import { EditorialHeader, EditorialShell } from "./EditorialHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { type ExploreState, type TimePathScenario } from "../ExploreFlow";

interface EdTimeSavingsProps {
  state: ExploreState;
  updateState: (updates: Partial<ExploreState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
  onReturnToBusinessCase?: () => void;
}

const inputBase =
  "h-[56px] w-full rounded-[14px] border-[1.5px] border-[#E4DED6] bg-white px-[18px] text-[20px] font-abridge text-[#1A1A1A] tabular-nums shadow-[0_1px_2px_rgba(40,30,20,0.04)] transition-[box-shadow,border-color] focus-visible:outline-none focus-visible:border-[#EA2C00] focus-visible:shadow-[0_0_0_3px_#FBD9CE] placeholder:text-[#B5AFA6] placeholder:font-normal placeholder:not-italic placeholder:font-sans placeholder:text-[16px]";

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

  const nursingShiftsPerYear = state.numberOfProviders * state.nursingShiftsPerNurseYear;
  const nursingEligibleShifts = Math.round(nursingShiftsPerYear * (state.utilizationPercent / 100));

  const hoursSaved = isNursing
    ? Math.round((state.minutesSavedPerEncounter * nursingEligibleShifts) / 60)
    : Math.round((state.minutesSavedPerEncounter * eligibleEncounters) / 60);

  const hoursPerProvider = state.numberOfProviders > 0 ? Math.round(hoursSaved / state.numberOfProviders) : 0;

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

  const noteUnit = isNursing ? "shift" : "note";
  const volumeLabel = isNursing ? "Abridge-enabled shifts" : "Abridge-enabled encounters";
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

        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-[22px] mt-[34px] items-stretch">
          {/* Form */}
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] px-7 py-[26px] h-full">
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822] mb-[10px]">
                Minutes saved per {noteUnit}
              </div>
              <div className="relative">
                <FormattedNumberInput
                  value={state.minutesSavedPerEncounter}
                  onChange={handleCustomMinutes}
                  placeholder="e.g., 3"
                  className={`${inputBase} pr-14`}
                  data-testid="ed-input-minutes-saved"
                />
                <span className="absolute right-[15px] top-1/2 -translate-y-1/2 text-[#565250] text-[14px] font-semibold">
                  min
                </span>
              </div>
              <div className="flex items-center gap-[7px] mt-[10px] flex-wrap">
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
              <p className="text-[12.5px] text-[#565250] mt-[10px]">
                Seeded conservatively from {settingWord} implementations. You measure the real number on Progress.
              </p>
            </div>

            <div className="mt-[22px] border-t border-[#E7E3DD] pt-[18px]">
              <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#2E2822] mb-3">
                How it adds up
              </div>
              <div className="flex items-center gap-3 text-[14px] text-[#565250]">
                <span className="font-abridge text-[18px] text-[#1A1A1A] tabular-nums">
                  {formatNumber(volumeValue)}
                </span>
                {volumeLabel}
              </div>
              <div className="flex items-center gap-3 text-[14px] text-[#565250] mt-[10px]">
                <span className="font-abridge text-[18px] text-[#1A1A1A] tabular-nums">
                  × {state.minutesSavedPerEncounter} min
                </span>
                saved per {noteUnit}
              </div>
              <div className="text-[14px] text-[#565250] mt-3">
                ={" "}
                <span className="font-abridge text-[20px] text-[#EA2C00] tabular-nums">
                  {formatNumber(hoursSaved)} hours
                </span>{" "}
                given back a year
              </div>
            </div>
          </div>

          {/* Snapshot */}
          <div className="bg-[#FDFBF8] border border-[#E7E3DD] rounded-[20px] px-7 py-[26px] flex flex-col">
            <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#443A32]">
              Time given back
            </div>
            <div className="mt-3 leading-none">
              <span className="font-abridge text-[42px] sm:text-[52px] text-[#EA2C00] tabular-nums">{formatNumber(hoursSaved)}</span>
              <span className="text-[14px] text-[#565250]"> hours a year</span>
            </div>

            {hoursSaved > 0 ? (
              <>
                <div className="text-[12px] text-[#7C766F] font-semibold mt-6 mb-2">
                  A couple of minutes a {noteUnit}, compounding across the year
                </div>
                <svg viewBox="0 0 300 74" preserveAspectRatio="none" className="w-full h-[74px] block">
                  <defs>
                    <linearGradient id="tsfill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#EA2C00" stopOpacity="0.16" />
                      <stop offset="1" stopColor="#EA2C00" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,70 C80,66 150,50 300,8 L300,74 L0,74 Z" fill="url(#tsfill)" />
                  <path d="M0,70 C80,66 150,50 300,8" fill="none" stroke="#EA2C00" strokeWidth="2.5" />
                  <circle cx="300" cy="8" r="3.5" fill="#EA2C00" />
                </svg>
                <div className="flex justify-between text-[11px] text-[#9C8E7E] font-semibold mt-1">
                  <span>Month 1</span><span>Month 12</span>
                </div>

                <div className="mt-5 bg-[#FFF7F4] border border-[#F5D3C8] rounded-[12px] px-4 py-[13px]">
                  <div className="text-[11px] font-extrabold tracking-[0.06em] uppercase text-[#B02200]">
                    Per {roleWord}, every week
                  </div>
                  <div className="font-abridge text-[28px] text-[#EA2C00] mt-[5px] leading-none tabular-nums">
                    {perWeek.value}
                    <span className="text-[13px] text-[#EA2C00] opacity-70"> {perWeek.unit}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6 text-[13px] text-[#7C766F] italic">Enter minutes saved to see the time given back.</div>
            )}

            <div className="mt-auto pt-[18px] border-t border-[#E7E3DD] mt-6">
              <p className="text-[12.5px] text-[#565250] leading-[1.55]">
                <b className="text-[#1A1A1A]">{formatNumber(volumeValue)}</b> {volumeLabel.toLowerCase()} × <b className="text-[#1A1A1A]">{state.minutesSavedPerEncounter} min</b> = <b className="text-[#EA2C00]">{formatNumber(hoursSaved)} hours</b>{state.numberOfProviders > 0 ? <>, about <b className="text-[#1A1A1A]">{formatNumber(hoursPerProvider)}</b> per {roleWord}</> : null}. This is time back, not dollars yet; we turn it into value on the next screens.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-[30px]">
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
