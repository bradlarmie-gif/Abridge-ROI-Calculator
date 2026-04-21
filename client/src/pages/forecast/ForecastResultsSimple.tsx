import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { Button } from "@/components/ui/button";
import { KpiCard, KpiGrid } from "@/components/KpiCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { calculateForecast } from "@/lib/forecastCalculator";
import type { ForecastState } from "./types";

interface ForecastResultsSimpleProps {
  state: ForecastState;
  onBack: () => void;
  onHome: () => void;
}

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export default function ForecastResultsSimple({
  state,
  onBack,
  onHome,
}: ForecastResultsSimpleProps) {
  const result = useMemo(() => calculateForecast(state), [state]);
  const { kpis } = result;

  const isEncounterMode =
    state.currentPricing.model === "perEncounter" ||
    state.currentPricing.model === "hybrid";

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="forecast"
        currentStep={3}
        totalSteps={3}
        stepName="Dashboard (preview)"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <p
            className="text-[11px] uppercase font-medium text-[#EA2C00] mb-3"
            style={{ letterSpacing: "2.5px" }}
          >
            Forecast results
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-[#1A1A1A] font-abridge uppercase mb-3"
            style={{ letterSpacing: "0.02em" }}
          >
            {state.partnerName || "Untitled partner"} · {state.contractTermMonths / 12}-year forecast
          </h1>
          <p className="text-sm text-neutral-500">
            This will become the full Dashboard in Phase 3.
          </p>
        </motion.div>

        {state.valueDrivers.length === 0 && (
          <div
            data-testid="banner-no-drivers"
            className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <strong>No value drivers yet.</strong> Cost projects from your pricing
            inputs, but value-side KPIs read $0 until you add drivers. Driver editing
            arrives on the full Dashboard in Phase 3.
          </div>
        )}

        <KpiGrid>
          <KpiCard
            label="Total Contract Value"
            value={fmtMoney(kpis.totalContractValue)}
            variant="positive"
          />
          <KpiCard
            label="Net Contract Value"
            value={fmtMoney(kpis.netContractValue)}
            variant={kpis.netContractValue >= 0 ? "positive" : "negative"}
          />
          <KpiCard
            label="ROI Multiple"
            value={`${kpis.roiMultiple.toFixed(2)}×`}
            variant="default"
          />
          <KpiCard
            label="Total Cost"
            value={fmtMoney(kpis.totalContractCost)}
            variant="black"
          />
          <KpiCard
            label="Fast Break-Even"
            value={kpis.fastBreakEvenMonth ? `M${kpis.fastBreakEvenMonth}` : "Not reached"}
            subtitle="excludes long-term drivers"
            variant="neutral"
          />
          <KpiCard
            label="Full Break-Even"
            value={kpis.fullBreakEvenMonth ? `M${kpis.fullBreakEvenMonth}` : "Not reached"}
            subtitle="all drivers"
            variant="neutral"
          />
          {isEncounterMode && (
            <KpiCard
              label="Runway Month"
              value={kpis.runwayMonth ? `M${kpis.runwayMonth}` : "—"}
              subtitle={
                state.currentPricing.contractEncounterLimit
                  ? `${state.currentPricing.contractEncounterLimit.toLocaleString()} encounter limit`
                  : "no limit set"
              }
              variant={kpis.runwayMonth ? "negative" : "neutral"}
            />
          )}
          {isEncounterMode && (
            <KpiCard
              label="Projected Overage"
              value={fmtMoney(kpis.projectedOverage)}
              variant={kpis.projectedOverage > 0 ? "negative" : "neutral"}
            />
          )}
        </KpiGrid>

        {result.alerts.length > 0 && (
          <div className="mt-8 space-y-3">
            {result.alerts.map((a, i) => (
              <Alert
                key={`${a.type}-${i}`}
                data-testid={`alert-${a.type}`}
                className="border-[#EA2C00]/30 bg-[#FBE9E2]"
              >
                <AlertDescription className="text-[#1A1A1A]">
                  {a.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <details
            className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
            open
          >
            <summary className="text-sm font-semibold text-[#1A1A1A] cursor-pointer">
              KPIs (raw)
            </summary>
            <pre
              className="mt-3 text-xs font-mono text-neutral-700 overflow-x-auto"
              data-testid="pre-kpis-raw"
            >
              {JSON.stringify(kpis, null, 2)}
            </pre>
          </details>

          <details className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <summary className="text-sm font-semibold text-[#1A1A1A] cursor-pointer">
              First 12 months (raw)
            </summary>
            <pre
              className="mt-3 text-xs font-mono text-neutral-700 overflow-x-auto"
              data-testid="pre-monthly-raw"
            >
              {JSON.stringify(result.monthly.slice(0, 12), null, 2)}
            </pre>
          </details>
        </div>

        <div className="flex items-center justify-between mt-10">
          <Button
            variant="outline"
            onClick={onBack}
            data-testid="btn-results-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Contract
          </Button>
          <p className="text-xs text-neutral-500">
            This will become the Dashboard in Phase 3.
          </p>
        </div>
      </div>
    </div>
  );
}
