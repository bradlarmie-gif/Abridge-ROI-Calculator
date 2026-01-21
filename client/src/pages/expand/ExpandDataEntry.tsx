import { 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  Moon, 
  FileText, 
  DollarSign, 
  FileCheck, 
  Smile,
  Zap, 
  Calendar, 
  CalendarDays, 
  Hourglass, 
  BarChart3, 
  Lightbulb, 
  AlertTriangle,
  Info,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import type { DeploymentData, MetricType, MetricsData } from "./ExpandFlow";

interface ExpandDataEntryProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  setMetricsData: (data: MetricsData) => void;
  onNext: () => void;
  onBack: () => void;
}

// Level of Service - using Level 1-5 instead of CPT codes
const LEVEL_OF_SERVICE = [
  { id: "level5", label: "Level 5", description: "High complexity" },
  { id: "level4", label: "Level 4", description: "Moderate-high complexity" },
  { id: "level3", label: "Level 3", description: "Moderate complexity" },
  { id: "level2", label: "Level 2", description: "Low complexity" },
  { id: "level1", label: "Level 1", description: "Minimal complexity" },
];

const LEVEL_WEIGHTS: { [key: string]: number } = {
  level5: 5,
  level4: 4,
  level3: 3,
  level2: 2,
  level1: 1,
};

// Helper to format numbers with commas
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return Number(value).toLocaleString();
};

const CLOSURE_BUCKETS = [
  { id: "within24", label: "Within 24 hours", Icon: Zap },
  { id: "24to48", label: "24-48 hours", Icon: Calendar },
  { id: "48to72", label: "48-72 hours", Icon: CalendarDays },
  { id: "over72", label: "72+ hours", Icon: Hourglass },
] as const;

export default function ExpandDataEntry({
  deploymentData,
  selectedMetrics,
  metricsData,
  setMetricsData,
  onNext,
  onBack,
}: ExpandDataEntryProps) {
  
  const updateMetric = <T extends keyof MetricsData>(
    metricKey: T,
    value: MetricsData[T]
  ) => {
    setMetricsData({ ...metricsData, [metricKey]: value });
  };

  // Time Savings calculations
  const timeSavings = metricsData.timeSavings;
  const timeSavingsChange = timeSavings.before && timeSavings.after 
    ? timeSavings.before - timeSavings.after 
    : null;
  const timeSavingsPercent = timeSavingsChange && timeSavings.before
    ? Math.round((timeSavingsChange / timeSavings.before) * 100)
    : null;

  // Work Outside Work calculations
  const workOutside = metricsData.workOutsideWork;
  const workOutsideChange = workOutside.before && workOutside.after
    ? workOutside.before - workOutside.after
    : null;

  // Work Outside Work - annual impact (explicit null checks)
  const annualHoursSaved = workOutsideChange !== null && deploymentData.providers !== null
    ? workOutsideChange * 48 * deploymentData.providers // 48 work weeks
    : null;

  // Level of Service calculations - using Level 1-5
  const losData = metricsData.levelOfService;
  const losBeforeTotal = LEVEL_OF_SERVICE.reduce((sum, level) => sum + (losData.before[level.id] || 0), 0);
  const losAfterTotal = LEVEL_OF_SERVICE.reduce((sum, level) => sum + (losData.after[level.id] || 0), 0);

  // Calculate weighted averages for Level of Service
  const calculateWeightedAverage = (distribution: { [key: string]: number }): number | null => {
    let weighted = 0;
    let total = 0;
    LEVEL_OF_SERVICE.forEach(level => {
      const pct = distribution[level.id] || 0;
      weighted += pct * LEVEL_WEIGHTS[level.id];
      total += pct;
    });
    return total > 0 ? weighted / total : null;
  };

  const losBeforeAvg = calculateWeightedAverage(losData.before);
  const losAfterAvg = calculateWeightedAverage(losData.after);
  // Explicit null checks to handle zero averages correctly
  const losAvgChange = losBeforeAvg !== null && losAfterAvg !== null && losBeforeAvg !== 0
    ? (((losAfterAvg - losBeforeAvg) / losBeforeAvg) * 100)
    : null;

  // wRVU calculations
  const wrvuData = metricsData.wrvuCapture;
  const wrvuChange = wrvuData.before && wrvuData.after
    ? (((wrvuData.after - wrvuData.before) / wrvuData.before) * 100)
    : null;

  // Chart Closure calculations
  const closureData = metricsData.chartClosure;
  const closureBeforeTotal = Object.values(closureData.before).reduce((a, b) => a + b, 0);
  const closureAfterTotal = Object.values(closureData.after).reduce((a, b) => a + b, 0);
  const sameDayImprovement = closureData.after.within24 - closureData.before.within24;

  // Satisfaction calculations
  const satData = metricsData.clinicianSatisfaction;
  const satChange = satData.before && satData.after ? satData.after - satData.before : null;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <GlobalHeader pageName="Expand Data Entry" currentStep={2} totalSteps={5} />

      <div className="max-w-5xl mx-auto px-6 pt-[96px]">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-500 flex items-center gap-1 mb-8 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Enter Your Results
          </h1>
          <p className="text-[#6B7280]">
            {deploymentData.providers} providers · {deploymentData.monthsOnAbridge} months on Abridge · {selectedMetrics.length} metrics selected
          </p>
        </div>

        {/* Time Savings */}
        {selectedMetrics.includes("timeSavings") && (
          <section className="mb-8 p-6 bg-white border border-neutral-200 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">Time Savings</h2>
                <p className="text-sm text-[#6B7280]">Average time in notes per appointment</p>
              </div>
            </div>

            <div className="flex items-end gap-6 p-6 bg-neutral-50 rounded-xl">
              <div className="flex-1">
                <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">BEFORE ABRIDGE</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="—"
                    value={timeSavings.before ?? ""}
                    onChange={(e) => updateMetric("timeSavings", {
                      ...timeSavings,
                      before: e.target.value ? Number(e.target.value) : null,
                    })}
                    className="w-full px-4 py-4 text-2xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                    data-testid="input-time-before"
                  />
                </div>
                <span className="text-xs text-[#6B7280] text-center block mt-2">minutes</span>
              </div>

              <div className="text-2xl text-neutral-300 pb-8">→</div>

              <div className="flex-1">
                <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">AFTER ABRIDGE</span>
                <input
                  type="number"
                  step="0.1"
                  placeholder="—"
                  value={timeSavings.after ?? ""}
                  onChange={(e) => updateMetric("timeSavings", {
                    ...timeSavings,
                    after: e.target.value ? Number(e.target.value) : null,
                  })}
                  className="w-full px-4 py-4 text-2xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                  data-testid="input-time-after"
                />
                <span className="text-xs text-[#6B7280] text-center block mt-2">minutes</span>
              </div>

              <div className="text-xl text-neutral-300 pb-8">=</div>

              <div className="flex-1">
                <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">CHANGE</span>
                {timeSavingsChange !== null ? (
                  <div className="px-4 py-4 bg-emerald-50 rounded-lg text-center">
                    <span className="text-xl font-bold text-emerald-600 block">-{timeSavingsChange} min/enc</span>
                    <span className="text-sm text-emerald-700">{timeSavingsPercent}% reduction</span>
                  </div>
                ) : (
                  <div className="px-4 py-4 bg-neutral-100 rounded-lg text-center">
                    <span className="text-sm text-neutral-400">Enter data</span>
                  </div>
                )}
              </div>
            </div>

            {timeSavingsChange !== null && (
              <div className="flex items-start gap-3 mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-blue-800 tracking-wider uppercase">BENCHMARK</span>
                  <p className="text-sm text-blue-800 mt-1">
                    Average time savings across Abridge customers: <strong>3-5 min/encounter</strong>
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    You're at: <strong>{timeSavingsChange} min</strong> — 
                    {timeSavingsChange >= 3 ? (
                      <span className="text-emerald-700 flex items-center gap-1 inline-flex">
                        <CheckCircle className="w-4 h-4" /> Within expected range
                      </span>
                    ) : (
                      <span className="text-amber-700"> Building momentum</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Work Outside of Work */}
        {selectedMetrics.includes("workOutsideWork") && (
          <section className="mb-8 p-6 bg-white border border-neutral-200 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Moon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">Work Outside of Work</h2>
                <p className="text-sm text-[#6B7280]">Weekly hours worked outside scheduled time</p>
              </div>
            </div>

            <div className="flex items-end gap-6 p-6 bg-neutral-50 rounded-xl">
              <div className="flex-1">
                <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">BEFORE ABRIDGE</span>
                <input
                  type="number"
                  placeholder="—"
                  value={workOutside.before ?? ""}
                  onChange={(e) => updateMetric("workOutsideWork", {
                    ...workOutside,
                    before: e.target.value ? Number(e.target.value) : null,
                  })}
                  className="w-full px-4 py-4 text-2xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                  data-testid="input-wow-before"
                />
                <span className="text-xs text-[#6B7280] text-center block mt-2">hours/week</span>
              </div>

              <div className="text-2xl text-neutral-300 pb-8">→</div>

              <div className="flex-1">
                <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">AFTER ABRIDGE</span>
                <input
                  type="number"
                  placeholder="—"
                  value={workOutside.after ?? ""}
                  onChange={(e) => updateMetric("workOutsideWork", {
                    ...workOutside,
                    after: e.target.value ? Number(e.target.value) : null,
                  })}
                  className="w-full px-4 py-4 text-2xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                  data-testid="input-wow-after"
                />
                <span className="text-xs text-[#6B7280] text-center block mt-2">hours/week</span>
              </div>

              <div className="text-xl text-neutral-300 pb-8">=</div>

              <div className="flex-1">
                <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">CHANGE</span>
                {workOutsideChange !== null ? (
                  <div className="px-4 py-4 bg-emerald-50 rounded-lg text-center">
                    <span className="text-xl font-bold text-emerald-600 block">-{workOutsideChange} hrs/week</span>
                  </div>
                ) : (
                  <div className="px-4 py-4 bg-neutral-100 rounded-lg text-center">
                    <span className="text-sm text-neutral-400">Enter data</span>
                  </div>
                )}
              </div>
            </div>

            {/* Why This Matters Callout */}
            <div className="mt-5 p-5 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-semibold text-amber-800 tracking-wider uppercase">WHY THIS MATTERS</span>
              </div>
              <div className="text-sm text-amber-900 space-y-3">
                <p>
                  "Pajama time" — work done at home after hours — is the #1 driver of physician burnout. 
                  Reducing it directly impacts:
                </p>
                <ul className="space-y-1 ml-4">
                  <li><strong>Retention:</strong> Less burnout = lower turnover</li>
                  <li><strong>Quality of life:</strong> Time back with family</li>
                  <li><strong>Next-day performance:</strong> Rested providers deliver better care</li>
                </ul>
                {annualHoursSaved !== null && annualHoursSaved > 0 && (
                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-amber-200" data-testid="wow-annual-impact">
                    <span className="text-amber-700">Your annual impact:</span>
                    <span className="font-semibold text-amber-900" data-testid="text-annual-hours-saved">{formatNumber(annualHoursSaved)} hours returned to providers</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Level of Service */}
        {selectedMetrics.includes("levelOfService") && (
          <section className="mb-8 p-6 bg-white border border-neutral-200 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">Level of Service</h2>
                <p className="text-sm text-[#6B7280]">E/M code distribution</p>
              </div>
            </div>

            {/* Blend Note */}
            <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg mb-5">
              <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-slate-600">
                Enter your blended distribution across new and established patient visits. 
                Level 5 = highest complexity, Level 1 = lowest.
              </span>
            </div>

            {/* Averages Summary - Prominent */}
            {losBeforeAvg !== null && losAfterAvg !== null && losBeforeTotal === 100 && losAfterTotal === 100 && (
              <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl mb-6" data-testid="los-averages-summary">
                <div className="flex items-center justify-center gap-8 flex-wrap">
                  <div className="text-center">
                    <span className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">AVERAGE BEFORE</span>
                    <span className="text-3xl font-bold text-slate-400" data-testid="text-los-avg-before">{losBeforeAvg.toFixed(2)}</span>
                  </div>
                  <div className="text-2xl text-slate-300">→</div>
                  <div className="text-center">
                    <span className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">AVERAGE AFTER</span>
                    <span className="text-3xl font-bold text-slate-700" data-testid="text-los-avg-after">{losAfterAvg.toFixed(2)}</span>
                  </div>
                  <div className="text-center bg-white px-6 py-4 rounded-lg border border-emerald-200">
                    <span className="block text-xs font-semibold text-slate-500 tracking-wider uppercase mb-1">CHANGE</span>
                    <span className="text-3xl font-bold text-emerald-600" data-testid="text-los-avg-change">
                      {losAvgChange !== null && losAvgChange > 0 ? "+" : ""}{losAvgChange !== null ? losAvgChange.toFixed(1) : "0.0"}%
                    </span>
                  </div>
                </div>
                <p className="text-center text-xs text-slate-500 mt-4">
                  Weighted average where Level 1 = 1, Level 2 = 2, etc.
                </p>
              </div>
            )}

            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-[#6B7280] tracking-wider uppercase">
                <div>LEVEL</div>
                <div>BEFORE ABRIDGE</div>
                <div>AFTER ABRIDGE</div>
                <div>CHANGE</div>
              </div>

              {/* Rows */}
              {LEVEL_OF_SERVICE.map((level) => {
                const beforeVal = losData.before[level.id] || 0;
                const afterVal = losData.after[level.id] || 0;
                const change = afterVal - beforeVal;

                return (
                  <div key={level.id} className="grid grid-cols-4 gap-4 p-4 border-b border-neutral-100 items-center">
                    <div>
                      <span className="font-semibold text-[#111827]">{level.label}</span>
                      <span className="text-xs text-slate-500 block">{level.description}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={beforeVal || ""}
                          onChange={(e) => updateMetric("levelOfService", {
                            ...losData,
                            before: { ...losData.before, [level.id]: Number(e.target.value) || 0 },
                          })}
                          className="w-16 px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                          data-testid={`input-los-before-${level.id}`}
                        />
                        <span className="text-xs text-[#6B7280]">%</span>
                      </div>
                      <div className="h-2 bg-neutral-200 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-neutral-400 rounded-full" style={{ width: `${beforeVal}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={afterVal || ""}
                          onChange={(e) => updateMetric("levelOfService", {
                            ...losData,
                            after: { ...losData.after, [level.id]: Number(e.target.value) || 0 },
                          })}
                          className="w-16 px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                          data-testid={`input-los-after-${level.id}`}
                        />
                        <span className="text-xs text-[#6B7280]">%</span>
                      </div>
                      <div className="h-2 bg-neutral-200 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${afterVal}%` }} />
                      </div>
                    </div>
                    <div className="text-center">
                      {change !== 0 ? (
                        <span className={`font-semibold ${change > 0 ? "text-emerald-600" : "text-orange-500"}`}>
                          {change > 0 ? "↑" : "↓"} {Math.abs(change)}pp
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Totals */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 text-sm font-semibold">
                <div>TOTAL</div>
                <div className={losBeforeTotal === 100 ? "text-emerald-600" : "text-red-500"}>
                  {losBeforeTotal}% {losBeforeTotal !== 100 && "(must = 100%)"}
                </div>
                <div className={losAfterTotal === 100 ? "text-emerald-600" : "text-red-500"}>
                  {losAfterTotal}% {losAfterTotal !== 100 && "(must = 100%)"}
                </div>
                <div></div>
              </div>
            </div>

            {/* Insight */}
            {losAvgChange !== null && losAvgChange > 0 && (
              <div className="mt-5 p-5 bg-emerald-50 border border-emerald-200 rounded-xl" data-testid="los-insight-callout">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-800" data-testid="text-los-shift">+{losAvgChange.toFixed(1)}% shift in average level of service</strong>
                    <p className="text-sm text-emerald-700 mt-1">
                      This suggests more complete documentation of clinical complexity. 
                      Better documentation captures work already being done — not upcoding.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* wRVU Capture */}
        {selectedMetrics.includes("wrvuCapture") && (
          <section className="mb-8 p-6 bg-white border border-neutral-200 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">wRVU Capture</h2>
                <p className="text-sm text-[#6B7280]">Average wRVUs per encounter</p>
              </div>
            </div>

            <div className="flex items-end gap-6 p-6 bg-neutral-50 rounded-xl">
              <div className="flex-1">
                <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">BEFORE ABRIDGE</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="—"
                  value={wrvuData.before ?? ""}
                  onChange={(e) => updateMetric("wrvuCapture", {
                    ...wrvuData,
                    before: e.target.value ? Number(e.target.value) : null,
                  })}
                  className="w-full px-4 py-4 text-2xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                  data-testid="input-wrvu-before"
                />
                <span className="text-xs text-[#6B7280] text-center block mt-2">wRVU/enc</span>
              </div>

              <div className="text-2xl text-neutral-300 pb-8">→</div>

              <div className="flex-1">
                <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">AFTER ABRIDGE</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="—"
                  value={wrvuData.after ?? ""}
                  onChange={(e) => updateMetric("wrvuCapture", {
                    ...wrvuData,
                    after: e.target.value ? Number(e.target.value) : null,
                  })}
                  className="w-full px-4 py-4 text-2xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                  data-testid="input-wrvu-after"
                />
                <span className="text-xs text-[#6B7280] text-center block mt-2">wRVU/enc</span>
              </div>

              <div className="text-xl text-neutral-300 pb-8">=</div>

              <div className="flex-1">
                <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">CHANGE</span>
                {wrvuChange !== null ? (
                  <div className="px-4 py-4 bg-emerald-50 rounded-lg text-center">
                    <span className="text-xl font-bold text-emerald-600 block">+{wrvuChange.toFixed(1)}%</span>
                    <span className="text-sm text-emerald-700">lift</span>
                  </div>
                ) : (
                  <div className="px-4 py-4 bg-neutral-100 rounded-lg text-center">
                    <span className="text-sm text-neutral-400">Enter data</span>
                  </div>
                )}
              </div>
            </div>

            {/* Neutral Reference Range */}
            {wrvuChange !== null && (
              <div className="flex items-start gap-3 mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <BarChart3 className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-slate-600 tracking-wider uppercase">REFERENCE RANGE</span>
                  <p className="text-sm text-slate-700 mt-1">
                    wRVU lift across Abridge customers typically ranges from <strong>3-7%</strong>
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Your result: <strong>{wrvuChange.toFixed(1)}%</strong>
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Chart Closure */}
        {selectedMetrics.includes("chartClosure") && (
          <section className="mb-8 p-6 bg-white border border-neutral-200 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">Chart Closure Time</h2>
                <p className="text-sm text-[#6B7280]">What % of charts are closed within each time window?</p>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-[#6B7280] tracking-wider uppercase">
                <div>TIME BUCKET</div>
                <div>BEFORE ABRIDGE</div>
                <div>AFTER ABRIDGE</div>
                <div>CHANGE</div>
              </div>

              {/* Rows */}
              {CLOSURE_BUCKETS.map((bucket) => {
                const beforeVal = closureData.before[bucket.id] || 0;
                const afterVal = closureData.after[bucket.id] || 0;
                const change = afterVal - beforeVal;
                const isGood = (bucket.id === "within24" && change > 0) || (bucket.id !== "within24" && change < 0);

                const BucketIcon = bucket.Icon;
                return (
                  <div key={bucket.id} className="grid grid-cols-4 gap-4 p-4 border-b border-neutral-100 items-center">
                    <div className="flex items-center gap-2">
                      <BucketIcon className="w-4 h-4 text-neutral-500" />
                      <span className="font-medium text-[#111827]">{bucket.label}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={beforeVal || ""}
                          onChange={(e) => updateMetric("chartClosure", {
                            ...closureData,
                            before: { ...closureData.before, [bucket.id]: Number(e.target.value) || 0 },
                          })}
                          className="w-16 px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                          data-testid={`input-closure-before-${bucket.id}`}
                        />
                        <span className="text-xs text-[#6B7280]">%</span>
                      </div>
                      <div className="h-2 bg-neutral-200 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-neutral-400 rounded-full" style={{ width: `${Math.min(beforeVal, 100)}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={afterVal || ""}
                          onChange={(e) => updateMetric("chartClosure", {
                            ...closureData,
                            after: { ...closureData.after, [bucket.id]: Number(e.target.value) || 0 },
                          })}
                          className="w-16 px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                          data-testid={`input-closure-after-${bucket.id}`}
                        />
                        <span className="text-xs text-[#6B7280]">%</span>
                      </div>
                      <div className="h-2 bg-neutral-200 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(afterVal, 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-center">
                      {change !== 0 ? (
                        <span className={`font-semibold ${isGood ? "text-emerald-600" : "text-orange-500"}`}>
                          {change > 0 ? "↑" : "↓"} {Math.abs(change)}pp
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Totals */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 text-sm font-semibold">
                <div>TOTAL</div>
                <div className={closureBeforeTotal === 100 ? "text-emerald-600" : "text-red-500"}>
                  {closureBeforeTotal}%
                </div>
                <div className={closureAfterTotal === 100 ? "text-emerald-600" : "text-red-500"}>
                  {closureAfterTotal}%
                </div>
                <div></div>
              </div>
            </div>

            {/* Revenue Cycle Impact */}
            {closureBeforeTotal === 100 && closureAfterTotal === 100 && sameDayImprovement > 0 && (
              <div className="mt-5 p-5 bg-emerald-50 border border-emerald-200 rounded-xl" data-testid="revenue-cycle-impact-callout">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-800 tracking-wider uppercase">REVENUE CYCLE IMPACT</span>
                </div>
                <div className="text-sm text-emerald-900">
                  <p className="mb-4">
                    Faster chart closure accelerates billing and improves cash flow.
                  </p>
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-emerald-700">Same-day closure improvement</span>
                      <span className="font-semibold text-emerald-600" data-testid="text-sameday-improvement">+{sameDayImprovement}pp</span>
                    </div>
                    {sameDayImprovement >= 20 && (
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-emerald-200">
                        <span className="text-emerald-700">Estimated impact on days in A/R</span>
                        <span className="font-semibold text-emerald-600" data-testid="text-ar-days-impact">-2 to -5 days</span>
                      </div>
                    )}
                    {sameDayImprovement >= 40 && (
                      <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-emerald-200">
                        <span className="text-emerald-700">Potential days cash on hand improvement</span>
                        <span className="font-semibold text-emerald-600" data-testid="text-cash-days-improvement">+1 to +3 days</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-emerald-700 italic">
                    Organizations with high same-day closure rates typically see reduced A/R aging 
                    and improved cash position. Actual impact depends on payer mix and billing workflows.
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Clinician Satisfaction */}
        {selectedMetrics.includes("clinicianSatisfaction") && (
          <section className="mb-8 p-6 bg-white border border-neutral-200 rounded-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center">
                <Smile className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#111827]">Clinician Satisfaction</h2>
                <p className="text-sm text-[#6B7280]">How has provider satisfaction changed?</p>
              </div>
            </div>

            {/* Satisfaction Score */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[#111827] mb-4">Overall satisfaction score</h3>
              <div className="flex items-end gap-6 p-6 bg-neutral-50 rounded-xl">
                <div className="flex-1">
                  <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">BEFORE ABRIDGE</span>
                  <div className="flex items-center gap-2 justify-center">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.1"
                      placeholder="—"
                      value={satData.before ?? ""}
                      onChange={(e) => updateMetric("clinicianSatisfaction", {
                        ...satData,
                        before: e.target.value ? Number(e.target.value) : null,
                      })}
                      className="w-20 px-4 py-4 text-2xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                      data-testid="input-sat-before"
                    />
                    <span className="text-lg text-[#6B7280]">/ 10</span>
                  </div>
                </div>

                <div className="text-2xl text-neutral-300 pb-4">→</div>

                <div className="flex-1">
                  <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">AFTER ABRIDGE</span>
                  <div className="flex items-center gap-2 justify-center">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.1"
                      placeholder="—"
                      value={satData.after ?? ""}
                      onChange={(e) => updateMetric("clinicianSatisfaction", {
                        ...satData,
                        after: e.target.value ? Number(e.target.value) : null,
                      })}
                      className="w-20 px-4 py-4 text-2xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                      data-testid="input-sat-after"
                    />
                    <span className="text-lg text-[#6B7280]">/ 10</span>
                  </div>
                </div>

                {satChange !== null && (
                  <>
                    <div className="text-xl text-neutral-300 pb-4">=</div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">CHANGE</span>
                      <div className={`px-4 py-4 rounded-lg text-center ${satChange > 0 ? "bg-emerald-50" : "bg-neutral-100"}`}>
                        <span className={`text-xl font-bold ${satChange > 0 ? "text-emerald-600" : "text-neutral-600"}`}>
                          {satChange > 0 ? "+" : ""}{satChange.toFixed(1)} points
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Recommendation Rate */}
            <div>
              <h3 className="text-sm font-semibold text-[#111827] mb-4">% of providers who would recommend Abridge to a colleague</h3>
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="—"
                  value={satData.recommendRate ?? ""}
                  onChange={(e) => updateMetric("clinicianSatisfaction", {
                    ...satData,
                    recommendRate: e.target.value ? Number(e.target.value) : null,
                  })}
                  className="w-24 px-4 py-4 text-2xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                  data-testid="input-sat-recommend"
                />
                <span className="text-lg text-[#6B7280]">%</span>
              </div>
            </div>

            {satChange !== null && satChange > 0 && (
              <div className="mt-6 p-5 bg-pink-50 border border-pink-100 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-pink-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-pink-800 tracking-wider uppercase mb-2">WHY THIS MATTERS FOR ROI</h4>
                    <p className="text-sm text-pink-800 mb-3">
                      Higher satisfaction correlates with lower burnout and turnover. 
                      Based on your improvement, we estimate potential retention value:
                    </p>
                    <ul className="text-sm text-pink-800 space-y-1 mb-3">
                      <li>• Satisfaction improvement: <strong>+{satChange.toFixed(1)} points</strong></li>
                      <li>• Estimated turnover reduction: <strong>10-15%</strong></li>
                      <li>• At $400K replacement cost per provider, this represents significant potential value over time</li>
                    </ul>
                    <div className="flex items-center gap-2 p-2 bg-white/50 rounded">
                      <AlertTriangle className="w-4 h-4 text-pink-600" />
                      <span className="text-xs text-pink-700">Retention impact is typically measurable after 12-18 months.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={onNext}
            className="gap-2"
            data-testid="button-next"
          >
            See Your Performance
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
