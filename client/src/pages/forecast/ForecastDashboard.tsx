import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import { calculateForecast } from "@/lib/forecastCalculator";
import type { ForecastState, ComparisonPricing } from "./types";
import { ContractPricingSection } from "./dashboard/sections/ContractPricingSection";
import { ProvisionedActiveSection } from "./dashboard/sections/ProvisionedActiveSection";
import { AdoptionGrowthSection } from "./dashboard/sections/AdoptionGrowthSection";
import { ValueDriversSection } from "./dashboard/sections/ValueDriversSection";
import { ScenariosSection } from "./dashboard/sections/ScenariosSection";
import { CostCurves } from "./dashboard/charts/CostCurves";
import { NetValueOverTime } from "./dashboard/charts/NetValueOverTime";
import { EncounterTrajectory } from "./dashboard/charts/EncounterTrajectory";
import { AlertsZone } from "./dashboard/AlertsZone";
import { ExportDialog } from "./dashboard/ExportDialog";
import { useSmoothCountUp } from "./dashboard/useSmoothCountUp";
import { fmtCurrencyShort } from "./dashboard/charts/shared";

interface Props {
  state: ForecastState;
  updateState: (updates: Partial<ForecastState>) => void;
  replaceState: (next: ForecastState) => void;
  onBack: () => void;
  onHome: () => void;
}

const STAGGER = 0.05;

export default function ForecastDashboard({
  state,
  updateState,
  replaceState,
  onBack,
  onHome,
}: Props) {
  const [exportOpen, setExportOpen] = useState(false);

  const result = useMemo(() => calculateForecast(state), [state]);
  const isEncounterMode =
    state.currentPricing.model === "perEncounter" ||
    state.currentPricing.model === "hybrid" ||
    state.comparisonPricing.some(
      (c) => c.pricing.model === "perEncounter" || c.pricing.model === "hybrid",
    );

  const applySwap = useCallback(
    (cmp: ComparisonPricing) => {
      // Defer to functional setter to avoid stale-closure race under rapid clicks.
      replaceState({
        ...state,
        currentPricing: { ...cmp.pricing, yearlyEscalators: [...(cmp.pricing.yearlyEscalators ?? [])] },
        comparisonPricing: [
          ...state.comparisonPricing.filter((c) => c.id !== cmp.id),
          {
            id: `cmp-prev-${Date.now().toString(36)}`,
            label: "Previous pricing",
            pricing: { ...state.currentPricing, yearlyEscalators: [...(state.currentPricing.yearlyEscalators ?? [])] },
          },
        ].slice(-3),
      });
    },
    [state, replaceState],
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader
        pathType="forecast"
        currentStep={4}
        totalSteps={4}
        stepName="Dashboard"
        onHome={onHome}
      />

      {/* Sub-header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              data-testid="btn-dashboard-back"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <div>
              <h1 className="text-base font-semibold text-[#1A1A1A]">
                Forecast Dashboard
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Input
                  value={state.partnerName}
                  onChange={(e) => updateState({ partnerName: e.target.value })}
                  placeholder="Untitled partner"
                  data-testid="input-dashboard-partner-name"
                  className="h-7 text-xs px-2 py-0.5 w-56 border-transparent hover:border-neutral-200 focus:border-neutral-300 bg-transparent hover:bg-neutral-50 transition-colors"
                />
                <span className="text-xs text-neutral-400">·</span>
                <span className="text-xs text-neutral-500 whitespace-nowrap">
                  {state.contractTermMonths / 12} yr term
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onHome}
              data-testid="btn-dashboard-home"
            >
              <Home className="w-4 h-4 mr-1.5" /> Home
            </Button>
            <Button
              size="sm"
              data-testid="btn-export"
              onClick={() => setExportOpen(true)}
              className="bg-[#EA2C00] hover:bg-[#C92500] text-white"
            >
              <Download className="w-4 h-4 mr-1.5" /> Export
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex gap-6 items-start">
          {/* Left rail */}
          <motion.aside
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="w-[380px] flex-shrink-0"
          >
            <ScrollArea className="h-[calc(100vh-180px)] pr-3">
              <div className="space-y-3">
                <SectionStagger idx={0}>
                  <ContractPricingSection state={state} updateState={updateState} />
                </SectionStagger>
                <SectionStagger idx={1}>
                  <ProvisionedActiveSection state={state} updateState={updateState} />
                </SectionStagger>
                <SectionStagger idx={2}>
                  <AdoptionGrowthSection state={state} updateState={updateState} />
                </SectionStagger>
                <SectionStagger idx={3}>
                  <ValueDriversSection state={state} updateState={updateState} />
                </SectionStagger>
                <SectionStagger idx={4}>
                  <ScenariosSection
                    state={state}
                    updateState={updateState}
                    replaceState={replaceState}
                  />
                </SectionStagger>
              </div>
            </ScrollArea>
          </motion.aside>

          {/* Right panel */}
          <main className="flex-1 min-w-0">
            <div className="lg:sticky lg:top-4">
              <KpiStrip kpis={result.kpis} contractMonths={state.contractTermMonths} />

              <div className="space-y-4 mt-4">
                <ChartCard title="Cost Curves">
                  <CostCurves
                    result={result}
                    comparisons={state.comparisonPricing}
                    contractStartDate={state.contractStartDate}
                  />
                </ChartCard>
                <ChartCard title="Net Value Over Time">
                  <NetValueOverTime
                    result={result}
                    scenarios={state.scenarios}
                    contractStartDate={state.contractStartDate}
                  />
                </ChartCard>
                {isEncounterMode && (
                  <ChartCard title="Encounter Trajectory">
                    <EncounterTrajectory result={result} state={state} />
                  </ChartCard>
                )}
                <AlertsZone
                  alerts={result.alerts}
                  comparisons={state.comparisonPricing}
                  applySwap={applySwap}
                  state={state}
                />
              </div>
            </div>
          </main>
        </div>
      </div>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} state={state} />
    </div>
  );
}

function SectionStagger({ idx, children }: { idx: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: idx * STAGGER }}
    >
      {children}
    </motion.div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function KpiStrip({
  kpis,
  contractMonths,
}: {
  kpis: import("@/lib/forecastCalculator").ForecastKpis;
  contractMonths: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      <KpiCard label="Total Contract Value" value={kpis.totalContractValue} format="currency" testId="kpi-tcv" />
      <KpiCard
        label="Net Contract Value"
        value={kpis.netContractValue}
        format="currency"
        negative={kpis.netContractValue < 0}
        testId="kpi-ncv"
      />
      <KpiCard
        label="ROI Multiple"
        value={kpis.roiMultiple}
        format="multiple"
        testId="kpi-roi"
      />
      <BreakEvenCard kpis={kpis} contractMonths={contractMonths} />
      {kpis.runwayMonth != null && (
        <KpiCard
          label="Runway"
          value={kpis.runwayMonth}
          format="month"
          testId="kpi-runway"
          accent
        />
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  format,
  negative,
  accent,
  testId,
}: {
  label: string;
  value: number;
  format: "currency" | "multiple" | "month";
  negative?: boolean;
  accent?: boolean;
  testId?: string;
}) {
  const animated = useSmoothCountUp(Number.isFinite(value) ? value : 0);
  let display = "—";
  if (format === "currency") display = fmtCurrencyShort(animated);
  else if (format === "multiple") display = `${animated.toFixed(2)}×`;
  else if (format === "month") display = `Month ${Math.round(animated)}`;

  return (
    <div
      data-testid={testId}
      className={`rounded-lg border p-3 ${
        accent ? "border-[#EA2C00]/30 bg-[#FFF6F2]" : "border-neutral-200 bg-white"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-neutral-500 font-medium">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-bold font-mono ${
          negative ? "text-red-600" : "text-[#1A1A1A]"
        }`}
      >
        {display}
      </p>
    </div>
  );
}

function BreakEvenCard({
  kpis,
  contractMonths,
}: {
  kpis: import("@/lib/forecastCalculator").ForecastKpis;
  contractMonths: number;
}) {
  const fast = kpis.fastBreakEvenMonth;
  const full = kpis.fullBreakEvenMonth;
  let display: string;
  if (fast == null && full == null) {
    display = "Not reached";
  } else if (full == null) {
    display = `Month ${fast} → Not reached within term`;
  } else {
    display = `Month ${fast} → Month ${full}`;
  }
  return (
    <div
      data-testid="kpi-break-even"
      className="rounded-lg border border-neutral-200 bg-white p-3"
    >
      <p className="text-[10px] uppercase tracking-wide text-neutral-500 font-medium">
        Break-Even Band
      </p>
      <p className="mt-1 text-sm font-semibold font-mono text-[#1A1A1A]">{display}</p>
      <p className="text-[10px] text-neutral-400 mt-0.5">
        of {contractMonths} months
      </p>
    </div>
  );
}
