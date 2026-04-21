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
  type ForecastCareSetting,
  type ForecastState,
  CARE_SETTING_LABELS,
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

const CARE_SETTING_ICONS: Record<ForecastCareSetting, LucideIcon> = {
  outpatient: Stethoscope,
  ed: Activity,
  inpatient: Bed,
  nursing: HeartPulse,
};

function shareInsight(pct: number): string {
  if (pct >= 60) return "Strong penetration — ambient is core to your workflow";
  if (pct >= 30) return "Meaningful footprint — significant room to grow";
  return "Early adoption — major expansion opportunity";
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
                  title={CARE_SETTING_LABELS[s]}
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
                      className="h-12 font-mono focus-visible:ring-[#EA2C00]/30"
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
                      className="h-12 font-mono focus-visible:ring-[#EA2C00]/30"
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
                      className="h-12 font-mono focus-visible:ring-[#EA2C00]/30"
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
                      className="h-12 font-mono focus-visible:ring-[#EA2C00]/30"
                    />
                  </div>
                </div>
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
                  <p
                    className="font-mono font-bold text-[#EA2C00] leading-none"
                    style={{ fontSize: "3.75rem" }}
                    data-testid="text-encounter-share-pct"
                  >
                    {sharePct.toFixed(1)}%
                  </p>
                  <p className="text-xs text-neutral-500 leading-relaxed mt-4">
                    {state.totalOrgEncountersLTM > 0
                      ? `${state.abridgeEncountersLTM.toLocaleString()} of ${state.totalOrgEncountersLTM.toLocaleString()} encounters in the last 12 months`
                      : "Enter encounter counts to derive share."}
                  </p>
                  {state.totalOrgEncountersLTM > 0 && (
                    <div className="mt-4 pt-4 border-t border-neutral-100">
                      <p
                        className="text-sm font-medium text-[#1A1A1A] leading-snug"
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
            <Button
              onClick={onNext}
              data-testid="btn-baseline-continue"
              className="bg-[#EA2C00] hover:bg-[#C92500] text-white"
            >
              Continue to Contract & Pricing
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
