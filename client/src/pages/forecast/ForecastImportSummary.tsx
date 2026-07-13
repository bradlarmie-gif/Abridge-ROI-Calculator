import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, TrendingUp } from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { type ForecastState } from "./types";

interface ForecastImportSummaryProps {
  state: ForecastState;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const FORECAST_STEP_LABELS = ["Start", "Baseline", "Contract & Pricing"];

function formatCurrency(n: number): string {
  if (!isFinite(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}

function formatChange(before: number | undefined, after: number | undefined): string {
  if (before === undefined || after === undefined) return "—";
  const delta = after - before;
  const sign = delta > 0 ? "+" : delta < 0 ? "" : "";
  if (Math.abs(delta) < 0.01) return "0";
  return `${sign}${delta.toFixed(2)}`;
}

function formatMetric(v: number | undefined, unitLabel?: string): string {
  if (v === undefined) return "—";
  const formatted = Math.abs(v) >= 100 ? Math.round(v).toLocaleString() : v.toFixed(2);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

export default function ForecastImportSummary({
  state,
  onNext,
  onBack,
  onHome,
}: ForecastImportSummaryProps) {
  const measureDrivers = useMemo(
    () => state.valueDrivers.filter((d) => d.source === "measure"),
    [state.valueDrivers],
  );

  const totalAnnualValue = useMemo(() => {
    return measureDrivers.reduce((acc, d) => acc + (d.projectedDelta || 0), 0);
  }, [measureDrivers]);

  const years = Math.max(1, Math.round(state.contractTermMonths / 12));

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="forecast"
        currentStep={1}
        totalSteps={3}
        stepName="Imported"
        onBack={onBack}
        onHome={onHome}
        stepLabels={FORECAST_STEP_LABELS}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-16">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-10 md:mb-12"
        >
          <p
            className="text-[11px] uppercase font-medium text-[#EA2C00] mb-3"
            style={{ letterSpacing: "2.5px" }}
          >
            Imported from Measure
          </p>
          <h1
            className="text-3xl md:text-5xl font-bold text-[#1A1A1A] font-abridge uppercase mb-4"
            style={{ letterSpacing: "0.02em" }}
          >
            What we&apos;ve measured
          </h1>
          {state.partnerName && (
            <p
              className="text-base md:text-lg text-[#666666] font-medium"
              data-testid="text-import-partner-name"
            >
              {state.partnerName}
            </p>
          )}
        </motion.div>

        {/* Baseline summary */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="bg-[#F5F0EB] rounded-xl p-5 md:p-6 mb-8"
          data-testid="section-import-baseline"
        >
          <p
            className="text-[11px] uppercase font-medium text-[#666666] mb-4"
            style={{ letterSpacing: "1.5px" }}
          >
            Baseline snapshot
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BaselineStat label="Active Users" value={formatNumber(state.activeUsersToday)} testId="stat-active-users" />
            <BaselineStat label="Provisioned Seats" value={formatNumber(state.provisionedSeats)} testId="stat-provisioned-seats" />
            <BaselineStat label="Encounters on Abridge" value={formatNumber(state.abridgeEncountersLTM)} testId="stat-abridge-encounters" />
            <BaselineStat label="Total Org Encounters" value={formatNumber(state.totalOrgEncountersLTM)} testId="stat-total-encounters" />
          </div>
        </motion.section>

        {/* Driver table */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mb-8"
          data-testid="section-import-drivers"
        >
          <div className="px-5 md:px-6 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#EA2C00]" />
              <h2
                className="text-xs font-semibold uppercase text-[#1A1A1A]"
                style={{ letterSpacing: "1.5px" }}
              >
                Measured value drivers
              </h2>
            </div>
            {measureDrivers.length > 0 && (
              <p className="text-xs text-neutral-500">
                <span className="font-semibold text-[#1A1A1A]">{formatCurrency(totalAnnualValue)}</span>{" "}
                total annual value
              </p>
            )}
          </div>

          {measureDrivers.length === 0 ? (
            <div className="px-5 md:px-6 py-10 text-center">
              <TrendingUp className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">
                No measured drivers were imported. You can still build a forecast from the baseline.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-import-drivers">
                <thead className="bg-[#FAFAFA] border-b border-neutral-100">
                  <tr className="text-[11px] uppercase text-[#888888]" style={{ letterSpacing: "1.5px" }}>
                    <th className="text-left font-semibold px-5 md:px-6 py-3">Outcome</th>
                    <th className="text-right font-semibold px-4 py-3">Before</th>
                    <th className="text-right font-semibold px-4 py-3">After</th>
                    <th className="text-right font-semibold px-4 py-3">Change</th>
                    <th className="text-right font-semibold px-5 md:px-6 py-3">Annual Value</th>
                  </tr>
                </thead>
                <tbody>
                  {measureDrivers.map((d, i) => (
                    <tr
                      key={d.id}
                      className={i % 2 === 0 ? "bg-white" : "bg-[#FCFAF8]"}
                      data-testid={`row-driver-${d.id}`}
                    >
                      <td className="px-5 md:px-6 py-3">
                        <p className="font-medium text-[#1A1A1A]">{d.label}</p>
                        <p className="text-[11px] text-neutral-400 capitalize mt-0.5">
                          {d.domain} · {d.category}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-[#666666] font-mono text-xs">
                        {formatMetric(d.baselineValue, d.unitLabel)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#1A1A1A] font-mono text-xs font-semibold">
                        {formatMetric(d.measuredValue, d.unitLabel)}
                      </td>
                      <td className="px-4 py-3 text-right text-[#EA2C00] font-mono text-xs font-semibold">
                        {formatChange(d.baselineValue, d.measuredValue)}
                      </td>
                      <td className="px-5 md:px-6 py-3 text-right">
                        <span className="font-semibold text-[#1A1A1A]">
                          {formatCurrency(d.projectedDelta)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        {/* Hero callout */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="bg-[#1A1A1A] rounded-xl p-7 md:p-9 mb-8 text-white relative overflow-hidden"
          data-testid="section-import-callout"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#EA2C00]/10 rounded-full blur-3xl pointer-events-none" />
          <p
            className="text-[11px] uppercase font-medium text-[#EA2C00] mb-3 relative"
            style={{ letterSpacing: "2.5px" }}
          >
            Your measured outcomes
          </p>
          <h2
            className="text-2xl md:text-3xl font-bold font-abridge uppercase leading-tight relative max-w-3xl"
            style={{ letterSpacing: "0.01em" }}
          >
            These are your measured outcomes. Let&apos;s model what they mean over the next {years} year{years === 1 ? "" : "s"}.
          </h2>
        </motion.section>

        {/* Footer nav */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.32 }}
          className="flex items-center justify-between gap-4"
        >
          <Button variant="outline" onClick={onBack} data-testid="btn-import-back">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            onClick={onNext}
            className="bg-[#EA2C00] hover:bg-[#C92500] text-white"
            data-testid="btn-import-continue"
          >
            Build the Forecast
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function BaselineStat({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div data-testid={testId}>
      <p
        className="text-[10px] uppercase font-medium text-[#888888] mb-1.5"
        style={{ letterSpacing: "1.2px" }}
      >
        {label}
      </p>
      <p className="text-lg md:text-xl font-bold text-[#1A1A1A] font-sans">{value}</p>
    </div>
  );
}
