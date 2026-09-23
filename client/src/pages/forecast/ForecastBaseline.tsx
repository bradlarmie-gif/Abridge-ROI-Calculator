import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bed,
  HeartPulse,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { CareSettingCard } from "@/components/CareSettingCard";
import { BackgroundPattern } from "@/components/BackgroundPattern";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BENCHMARK_MOM_GROWTH_PCT,
  type ForecastCareSetting,
  type ForecastState,
  makeDefaultEncounterShareCurve,
} from "./types";
import { TrendingUp } from "lucide-react";

const CARE_SETTING_DISPLAY_LABELS: Record<ForecastCareSetting, string> = {
  outpatient: "Outpatient",
  ed: "ED",
  inpatient: "Inpatient",
  nursing: "Nursing",
};

interface ForecastBaselineProps {
  state: ForecastState;
  updateState: (updates: Partial<ForecastState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const FORECAST_STEP_LABELS = ["Start", "Baseline", "Contract & Pricing"];

const CARE_SETTING_ORDER: ForecastCareSetting[] = [
  "outpatient",
  "ed",
  "inpatient",
  "nursing",
];

const CARE_SETTING_ICONS: Record<ForecastCareSetting, LucideIcon> = {
  outpatient: Stethoscope,
  ed: Activity,
  inpatient: Bed,
  nursing: HeartPulse,
};

function shareInsight(pct: number): string {
  if (pct >= 60) return "Strong penetration: ambient is core to your workflow";
  if (pct >= 30) return "Meaningful footprint: significant room to grow";
  return "Early adoption: major expansion opportunity";
}

export default function ForecastBaseline({
  state,
  updateState,
  onNext,
  onBack,
  onHome,
}: ForecastBaselineProps) {
  const sharePct = useMemo(() => {
    if (!state.totalOrgEncountersLTM || state.totalOrgEncountersLTM <= 0) return 0;
    return (state.abridgeEncountersLTM / state.totalOrgEncountersLTM) * 100;
  }, [state.abridgeEncountersLTM, state.totalOrgEncountersLTM]);

  const toggleCareSetting = (s: ForecastCareSetting) => {
    const isOn = state.careSettings.includes(s);
    const next = isOn
      ? state.careSettings.filter((c) => c !== s)
      : [...state.careSettings, s];
    updateState({
      careSettings: next.length > 0 ? next : state.careSettings,
      ...(s === "nursing" && isOn ? { nursingStaffedBeds: 0 } : {}),
    });
  };

  const onShareDerivationChange = () => {
    updateState({
      encounterShareCurve: makeDefaultEncounterShareCurve(
        state.contractTermMonths,
        sharePct,
      ),
    });
  };

  const nursingActive = state.careSettings.includes("nursing");

  const canContinue =
    state.activeUsersToday > 0 && state.abridgeEncountersLTM > 0;

  const uncapturedPerMonth = useMemo(() => {
    const diff = state.totalOrgEncountersLTM - state.abridgeEncountersLTM;
    if (diff <= 0) return 0;
    return Math.round(diff / 12);
  }, [state.totalOrgEncountersLTM, state.abridgeEncountersLTM]);

  const updateHistoricalGrowthAt = (idx: number, val: number) => {
    const next = [...state.historicalGrowthMonthly];
    while (next.length <= idx) next.push(BENCHMARK_MOM_GROWTH_PCT);
    next[idx] = val;
    updateState({ historicalGrowthMonthly: next.slice(0, 6) });
  };

  const setGrowthSource = (src: "benchmark" | "historical") => {
    if (src === "benchmark") {
      updateState({
        growthSource: "benchmark",
        historicalGrowthMonthly: [BENCHMARK_MOM_GROWTH_PCT],
      });
    } else {
      const seeded =
        state.historicalGrowthMonthly.length > 1
          ? state.historicalGrowthMonthly
          : Array(6).fill(BENCHMARK_MOM_GROWTH_PCT);
      updateState({
        growthSource: "historical",
        historicalGrowthMonthly: seeded.slice(0, 6),
      });
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      <BackgroundPattern />

      <div className="relative z-10">
        <UnifiedHeader
          pathType="forecast"
          currentStep={2}
          totalSteps={3}
          stepName="Baseline"
          onBack={onBack}
          onHome={onHome}
          stepLabels={FORECAST_STEP_LABELS}
        />
        <UnifiedHeaderSpacer />

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-12"
          >
            <p
              className="text-[11px] uppercase font-medium text-[#EA2C00] mb-3"
              style={{ letterSpacing: "2.5px" }}
            >
              Step 2 · Current Baseline
            </p>
            <h1
              className="text-3xl md:text-4xl font-bold text-[#1A1A1A] font-abridge uppercase"
              style={{ letterSpacing: "0.005em" }}
            >
              Where are you today?
            </h1>
            <div className="h-0.5 w-10 bg-[#EA2C00] mt-3" />
          </motion.div>

          {/* Care Settings strip */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="mb-10"
            data-testid="section-care-settings"
          >
            <div className="flex items-center gap-2 mb-4">
              <h2
                className="text-xs font-semibold uppercase text-[#888888]"
                style={{ letterSpacing: "1.5px" }}
              >
                Care Settings Active
              </h2>
              <span className="text-xs text-neutral-400">·</span>
              <span className="text-xs text-neutral-400">Multi-select</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CARE_SETTING_ORDER.map((s) => (
                <CareSettingCard
                  key={s}
                  icon={CARE_SETTING_ICONS[s]}
                  title={CARE_SETTING_DISPLAY_LABELS[s]}
                  selected={state.careSettings.includes(s)}
                  onClick={() => toggleCareSetting(s)}
                />
              ))}
            </div>

            <AnimatePresence>
              {nursingActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4">
                    <div className="bg-white border border-neutral-100 rounded-xl shadow-sm p-5 max-w-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <HeartPulse className="w-3.5 h-3.5 text-[#EA2C00]" />
                        <Label
                          className="text-[11px] font-semibold uppercase text-[#888888]"
                          style={{ letterSpacing: "1.5px" }}
                        >
                          Nursing staffed beds
                        </Label>
                      </div>
                      <FormattedNumberInput
                        data-testid="input-nursing-beds"
                        value={state.nursingStaffedBeds || ""}
                        onChange={(v) => updateState({ nursingStaffedBeds: v })}
                        placeholder="e.g. 250"
                        className="h-11"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* Two-column hero: Baseline + Encounter Share */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            {/* Baseline card */}
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              data-testid="section-baseline"
              className="bg-white rounded-xl border border-neutral-100 shadow-md p-8"
            >
              {/* Users & Seats row */}
              <div className="border-b border-neutral-100 pb-6 mb-6">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-neutral-100">
                  <Users className="w-3.5 h-3.5 text-[#888888]" />
                  <h3
                    className="text-xs font-semibold uppercase text-[#888888]"
                    style={{ letterSpacing: "1.5px" }}
                  >
                    Users & Seats
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="active-users"
                      className="text-xs text-neutral-500 font-medium"
                    >
                      Active Users Today
                    </Label>
                    <FormattedNumberInput
                      data-testid="input-forecast-active-users"
                      value={state.activeUsersToday || ""}
                      onChange={(v) => updateState({ activeUsersToday: v })}
                      placeholder="e.g. 1,200"
                      className="h-12 font-sans font-semibold focus-visible:ring-[#EA2C00]/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="provisioned-seats"
                      className="text-xs text-neutral-500 font-medium"
                    >
                      Provisioned Seats
                    </Label>
                    <FormattedNumberInput
                      data-testid="input-forecast-provisioned-seats"
                      value={state.provisionedSeats || ""}
                      onChange={(v) => updateState({ provisionedSeats: v })}
                      placeholder="e.g. 1,500"
                      className="h-12 font-sans font-semibold focus-visible:ring-[#EA2C00]/30"
                    />
                  </div>
                </div>
              </div>

              {/* Encounters row */}
              <div>
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-neutral-100">
                  <Activity className="w-3.5 h-3.5 text-[#888888]" />
                  <h3
                    className="text-xs font-semibold uppercase text-[#888888]"
                    style={{ letterSpacing: "1.5px" }}
                  >
                    Encounters · Last 12 Months
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs text-neutral-500 font-medium">
                      Encounters on Abridge
                    </Label>
                    <FormattedNumberInput
                      data-testid="input-forecast-abridge-encounters"
                      value={state.abridgeEncountersLTM || ""}
                      onChange={(v) => updateState({ abridgeEncountersLTM: v })}
                      onBlurValue={onShareDerivationChange}
                      placeholder="e.g. 600,000"
                      className="h-12 font-sans font-semibold focus-visible:ring-[#EA2C00]/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-neutral-500 font-medium">
                      Total Organizational Encounters
                    </Label>
                    <FormattedNumberInput
                      data-testid="input-forecast-total-encounters"
                      value={state.totalOrgEncountersLTM || ""}
                      onChange={(v) => updateState({ totalOrgEncountersLTM: v })}
                      onBlurValue={onShareDerivationChange}
                      placeholder="e.g. 1,000,000"
                      className="h-12 font-sans font-semibold focus-visible:ring-[#EA2C00]/30"
                    />
                  </div>
                </div>
              </div>

              {/* Encounter Growth */}
              <div className="border-t border-neutral-100 pt-6 mt-6">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-neutral-100">
                  <TrendingUp className="w-3.5 h-3.5 text-[#888888]" />
                  <h3
                    className="text-xs font-semibold uppercase text-[#888888]"
                    style={{ letterSpacing: "1.5px" }}
                  >
                    Encounter Growth
                  </h3>
                </div>
                <div
                  className="inline-flex rounded-md border border-neutral-200 bg-[#F5F0EB] p-1 mb-4"
                  data-testid="toggle-growth-source"
                >
                  {(["benchmark", "historical"] as const).map((opt) => {
                    const isActive = state.growthSource === opt;
                    const label =
                      opt === "benchmark"
                        ? `Benchmark (${BENCHMARK_MOM_GROWTH_PCT}% MoM)`
                        : "Historical";
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setGrowthSource(opt)}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                          isActive
                            ? "bg-[#1A1A1A] text-white"
                            : "text-[#666666] hover:text-[#1A1A1A]"
                        }`}
                        data-testid={`btn-growth-source-${opt}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <AnimatePresence initial={false}>
                  {state.growthSource === "historical" && (
                    <motion.div
                      key="historical-inputs"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs text-neutral-500 mb-3">
                        Enter month-over-month growth % for the last 6 months
                        (most recent first).
                      </p>
                      <div
                        className="grid grid-cols-3 md:grid-cols-6 gap-3"
                        data-testid="grid-historical-growth"
                      >
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="space-y-1.5">
                            <Label className="text-[11px] text-neutral-500 font-medium">
                              M-{i + 1}
                            </Label>
                            <div className="relative">
                              <FormattedNumberInput
                                data-testid={`input-historical-growth-${i}`}
                                value={state.historicalGrowthMonthly[i] ?? ""}
                                onChange={(v) => updateHistoricalGrowthAt(i, v)}
                                placeholder="4"
                                className="h-10 pr-7 font-sans font-semibold focus-visible:ring-[#EA2C00]/30"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">
                                %
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>

            {/* Abridge Encounter Share hero */}
            <motion.aside
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24 }}
              data-testid="section-encounter-share"
            >
              <div className="lg:sticky lg:top-24">
                <div className="bg-white rounded-xl border border-neutral-100 shadow-md border-l-4 border-l-[#EA2C00] p-8">
                  <p
                    className="text-[11px] font-semibold uppercase text-[#888888] mb-3"
                    style={{ letterSpacing: "1.5px" }}
                  >
                    Abridge Encounter Share
                  </p>
                  {state.totalOrgEncountersLTM > 0 ? (
                    <p
                      className="font-abridge font-bold text-[#EA2C00] leading-none text-7xl"
                      data-testid="text-encounter-share-pct"
                    >
                      {sharePct.toFixed(1)}%
                    </p>
                  ) : (
                    <p
                      className="font-abridge font-bold text-neutral-300 leading-none text-7xl"
                      data-testid="text-encounter-share-pct"
                    >
                      —
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 leading-relaxed mt-4 font-sans">
                    {state.totalOrgEncountersLTM > 0
                      ? (
                        <>
                          <span className="font-sans font-semibold text-[#1A1A1A]">
                            {state.abridgeEncountersLTM.toLocaleString()}
                          </span>{" "}
                          of{" "}
                          <span className="font-sans font-semibold text-[#1A1A1A]">
                            {state.totalOrgEncountersLTM.toLocaleString()}
                          </span>{" "}
                          encounters in the last 12 months
                        </>
                      )
                      : "Enter encounter counts to derive share."}
                  </p>
                  {state.totalOrgEncountersLTM > 0 && (
                    <div className="mt-4 pt-4 border-t border-neutral-100">
                      <div
                        className="relative h-2 rounded-full bg-neutral-100 overflow-visible"
                        data-testid="bar-encounter-penetration"
                      >
                        <div
                          className="absolute top-0 left-0 h-full rounded-full bg-[#EA2C00] transition-all duration-300"
                          style={{ width: `${Math.min(sharePct, 100)}%` }}
                        />
                        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#EA2C00] border-2 border-white shadow-sm" />
                        <div
                          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#1A1A1A] border-2 border-white shadow-sm"
                          style={{ left: `${Math.min(sharePct, 100)}%` }}
                        />
                        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-neutral-300 border-2 border-white shadow-sm" />
                      </div>
                      <div className="flex justify-between mt-3 text-[11px] text-neutral-500">
                        <span className="font-medium text-[#1A1A1A]">Today</span>
                        <span>Full org penetration</span>
                      </div>
                      <p
                        className="text-xs font-sans font-semibold text-neutral-600 mt-3"
                        data-testid="text-uncaptured-encounters"
                      >
                        Uncaptured encounters: ~{uncapturedPerMonth.toLocaleString()}/month
                      </p>
                      <p
                        className="text-sm font-medium text-[#1A1A1A] leading-snug mt-4 pt-4 border-t border-neutral-100"
                        data-testid="text-encounter-share-insight"
                      >
                        {shareInsight(sharePct)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          </div>

          {/* Footer nav */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.32 }}
            className="flex items-center justify-between mt-12"
          >
            <Button
              variant="outline"
              onClick={onBack}
              data-testid="btn-baseline-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={canContinue ? -1 : 0}>
                    <Button
                      onClick={onNext}
                      disabled={!canContinue}
                      data-testid="btn-baseline-continue"
                      className="bg-[#EA2C00] hover:bg-[#C92500] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to Contract & Pricing
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canContinue && (
                  <TooltipContent>
                    Enter active users and encounter counts to continue
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
