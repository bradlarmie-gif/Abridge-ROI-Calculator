import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import {
  type ForecastCareSetting,
  type ForecastState,
  type GrowthSource,
  CARE_SETTING_LABELS,
  VALUE_DOMAIN_LABELS,
  BENCHMARK_MOM_GROWTH_PCT,
  makeDefaultEncounterShareCurve,
} from "./types";

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

  const benchmarkGrowth =
    state.growthSource === "benchmark"
      ? state.historicalGrowthMonthly[0] ?? BENCHMARK_MOM_GROWTH_PCT
      : BENCHMARK_MOM_GROWTH_PCT;

  const historicalSix = useMemo(() => {
    if (state.growthSource !== "historical") return Array(6).fill(0);
    const arr = state.historicalGrowthMonthly.slice(0, 6);
    while (arr.length < 6) arr.push(0);
    return arr;
  }, [state.growthSource, state.historicalGrowthMonthly]);

  const toggleCareSetting = (s: ForecastCareSetting) => {
    const isOn = state.careSettings.includes(s);
    const next = isOn
      ? state.careSettings.filter((c) => c !== s)
      : [...state.careSettings, s];
    updateState({
      careSettings: next.length > 0 ? next : state.careSettings,
      // If nursing turned off, also turn off the encounter-share curve assumption for nursing
      ...(s === "nursing" && isOn ? { nursingStaffedBeds: 0 } : {}),
    });
  };

  const onShareDerivationChange = () => {
    // When user updates encounter counts, refresh the encounter-share curve to use the
    // latest derived basis share so projections keep tracking the input.
    updateState({
      encounterShareCurve: makeDefaultEncounterShareCurve(
        state.contractTermMonths,
        sharePct,
      ),
    });
  };

  const setGrowthSource = (next: GrowthSource) => {
    if (next === state.growthSource) return;
    if (next === "benchmark") {
      updateState({
        growthSource: "benchmark",
        historicalGrowthMonthly: [BENCHMARK_MOM_GROWTH_PCT],
      });
    } else {
      updateState({
        growthSource: "historical",
        historicalGrowthMonthly: Array(6).fill(BENCHMARK_MOM_GROWTH_PCT),
      });
    }
  };

  const updateHistoricalMonth = (idx: number, v: number) => {
    const arr = state.historicalGrowthMonthly.slice(0, 6);
    while (arr.length < 6) arr.push(0);
    arr[idx] = v;
    updateState({ historicalGrowthMonthly: arr });
  };

  const removeDriver = (id: string) => {
    updateState({ valueDrivers: state.valueDrivers.filter((d) => d.id !== id) });
  };

  return (
    <div className="min-h-screen bg-white">
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

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p
            className="text-[11px] uppercase font-medium text-[#EA2C00] mb-3"
            style={{ letterSpacing: "2.5px" }}
          >
            Step 2 · Current Baseline
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-[#1A1A1A] font-abridge uppercase mb-3"
            style={{ letterSpacing: "0.02em" }}
          >
            Where are you today?
          </h1>
          <p className="text-base text-[#666666] max-w-2xl leading-relaxed mb-10">
            Confirm the current state. Most of this auto-populates from a Measure import.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div className="space-y-8">
            {/* Users & seats */}
            <Card>
              <CardContent className="p-6 space-y-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1A1A1A]">
                  Users & seats
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="active-users" className="text-xs uppercase tracking-wide text-neutral-500">
                      Active users today
                    </Label>
                    <FormattedNumberInput
                      data-testid="input-forecast-active-users"
                      value={state.activeUsersToday || ""}
                      onChange={(v) => updateState({ activeUsersToday: v })}
                      placeholder="e.g. 1,200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provisioned-seats" className="text-xs uppercase tracking-wide text-neutral-500">
                      Provisioned seats
                    </Label>
                    <FormattedNumberInput
                      data-testid="input-forecast-provisioned-seats"
                      value={state.provisionedSeats || ""}
                      onChange={(v) => updateState({ provisionedSeats: v })}
                      placeholder="e.g. 1,500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Encounters */}
            <Card>
              <CardContent className="p-6 space-y-5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1A1A1A]">
                  Encounters (last 12 months)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-neutral-500">
                      On Abridge
                    </Label>
                    <FormattedNumberInput
                      data-testid="input-forecast-abridge-encounters"
                      value={state.abridgeEncountersLTM || ""}
                      onChange={(v) => updateState({ abridgeEncountersLTM: v })}
                      onBlurValue={onShareDerivationChange}
                      placeholder="e.g. 600,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-neutral-500">
                      Total org encounters
                    </Label>
                    <FormattedNumberInput
                      data-testid="input-forecast-total-encounters"
                      value={state.totalOrgEncountersLTM || ""}
                      onChange={(v) => updateState({ totalOrgEncountersLTM: v })}
                      onBlurValue={onShareDerivationChange}
                      placeholder="e.g. 1,000,000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Growth */}
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1A1A1A]">
                    Historical growth (MoM)
                  </h2>
                  <div className="inline-flex rounded-md border border-neutral-200 p-0.5 bg-neutral-50 text-xs">
                    <button
                      type="button"
                      data-testid="btn-growth-benchmark"
                      onClick={() => setGrowthSource("benchmark")}
                      className={`px-3 py-1.5 rounded ${
                        state.growthSource === "benchmark"
                          ? "bg-white text-[#1A1A1A] shadow-sm"
                          : "text-neutral-500"
                      }`}
                    >
                      Use benchmark
                    </button>
                    <button
                      type="button"
                      data-testid="btn-growth-historical"
                      onClick={() => setGrowthSource("historical")}
                      className={`px-3 py-1.5 rounded ${
                        state.growthSource === "historical"
                          ? "bg-white text-[#1A1A1A] shadow-sm"
                          : "text-neutral-500"
                      }`}
                    >
                      Paste last 6 months
                    </button>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {state.growthSource === "benchmark" ? (
                    <motion.div
                      key="benchmark"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          AMC benchmark
                        </Badge>
                        <span className="text-2xl font-mono font-bold text-[#1A1A1A]">
                          {benchmarkGrowth.toFixed(1)}%
                        </span>
                      </div>
                      <Slider
                        data-testid="slider-growth-benchmark"
                        value={[benchmarkGrowth]}
                        min={0}
                        max={15}
                        step={0.5}
                        onValueChange={(v) =>
                          updateState({ historicalGrowthMonthly: [v[0]] })
                        }
                      />
                      <p className="text-xs text-neutral-500">
                        Placeholder benchmark — override anytime.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="historical"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18 }}
                      className="grid grid-cols-3 md:grid-cols-6 gap-3"
                    >
                      {historicalSix.map((v, idx) => (
                        <div key={idx} className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wide text-neutral-500">
                            M-{6 - idx}
                          </Label>
                          <FormattedNumberInput
                            data-testid={`input-growth-month-${idx}`}
                            value={v || ""}
                            onChange={(nv) => updateHistoricalMonth(idx, nv)}
                            step={0.1}
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Care settings */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1A1A1A]">
                  Care settings active
                </h2>
                <div className="flex flex-wrap gap-2">
                  {CARE_SETTING_ORDER.map((s) => {
                    const active = state.careSettings.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        data-testid={`chip-care-setting-${s}`}
                        onClick={() => toggleCareSetting(s)}
                        className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                          active
                            ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                            : "bg-white text-[#1A1A1A] border-neutral-200 hover:border-neutral-400"
                        }`}
                      >
                        {CARE_SETTING_LABELS[s]}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {state.careSettings.includes("nursing") && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 max-w-xs space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-neutral-500">
                          Nursing staffed beds
                        </Label>
                        <FormattedNumberInput
                          data-testid="input-nursing-beds"
                          value={state.nursingStaffedBeds || ""}
                          onChange={(v) => updateState({ nursingStaffedBeds: v })}
                          placeholder="e.g. 250"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Imported value drivers */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[#1A1A1A]">
                    Imported value drivers
                  </h2>
                  {state.valueDrivers.length > 0 && (
                    <span className="text-xs text-neutral-500">
                      {state.valueDrivers.length} driver
                      {state.valueDrivers.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>

                {state.valueDrivers.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
                    <Sparkles className="w-5 h-5 mx-auto mb-2 text-neutral-400" />
                    <p className="text-sm text-neutral-600">
                      Add drivers later on the Dashboard.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {state.valueDrivers.map((d) => (
                      <div
                        key={d.id}
                        data-testid={`card-driver-${d.id}`}
                        className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-medium text-[#1A1A1A] truncate">
                              {d.label}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase tracking-wide"
                            >
                              {VALUE_DOMAIN_LABELS[d.domain]}
                            </Badge>
                            {d.source === "measure" && (
                              <Badge className="text-[10px] uppercase tracking-wide bg-[#FBE9E2] text-[#A82200] hover:bg-[#FBE9E2]">
                                from Measure
                              </Badge>
                            )}
                          </div>
                          {typeof d.measuredDelta === "number" && (
                            <p className="text-xs text-neutral-500 font-mono">
                              measured Δ {d.measuredDelta.toLocaleString()}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          data-testid={`btn-remove-driver-${d.id}`}
                          onClick={() => removeDriver(d.id)}
                          className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
                          aria-label={`Remove ${d.label}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right rail: derived share */}
          <aside className="space-y-4">
            <div className="sticky top-24">
              <Card className="border-l-4 border-l-[#EA2C00]">
                <CardContent className="p-6 space-y-3">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-500">
                    Abridge encounter share
                  </p>
                  <p
                    className="text-5xl font-mono font-bold text-[#1A1A1A]"
                    data-testid="text-encounter-share-pct"
                  >
                    {sharePct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    {state.totalOrgEncountersLTM > 0
                      ? `${state.abridgeEncountersLTM.toLocaleString()} of ${state.totalOrgEncountersLTM.toLocaleString()} encounters in the last 12 months`
                      : "Enter encounter counts to derive share."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-between mt-12">
          <Button
            variant="outline"
            onClick={onBack}
            data-testid="btn-baseline-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={onNext}
            data-testid="btn-baseline-continue"
            className="bg-[#EA2C00] hover:bg-[#C92500] text-white"
          >
            Continue to Contract & Pricing
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
