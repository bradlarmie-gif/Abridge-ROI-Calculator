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
  AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeploymentData, MetricType, MetricsData } from "./ExpandFlow";

interface ExpandDataEntryProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  setMetricsData: (data: MetricsData) => void;
  onNext: () => void;
  onBack: () => void;
}

const EM_CODES = ["99215", "99214", "99213", "99212", "99211"];

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

  // Level of Service calculations
  const losData = metricsData.levelOfService;
  const losBeforeTotal = EM_CODES.reduce((sum, code) => sum + (losData.before[code] || 0), 0);
  const losAfterTotal = EM_CODES.reduce((sum, code) => sum + (losData.after[code] || 0), 0);

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
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-sm font-medium text-[#E85D3F]">ABRIDGE</span>
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <span className="font-semibold text-[#111827]">Step 2</span>
            <span>of 5</span>
            <span className="text-neutral-300">·</span>
            <span>Your Data</span>
          </div>
        </div>
      </header>

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
                    Average time savings across Abridge customers: <strong>5-8 min/encounter</strong>
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    You're at: <strong>{timeSavingsChange} min</strong> — 
                    {timeSavingsChange >= 5 ? (
                      <span className="text-emerald-700"> Above average ✓</span>
                    ) : (
                      <span className="text-amber-700"> Room to grow</span>
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
                <p className="text-sm text-[#6B7280]">E/M code distribution — Established patients</p>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-[#6B7280] tracking-wider uppercase">
                <div>CODE</div>
                <div>BEFORE ABRIDGE</div>
                <div>AFTER ABRIDGE</div>
                <div>CHANGE</div>
              </div>

              {/* Rows */}
              {EM_CODES.map((code) => {
                const beforeVal = losData.before[code] || 0;
                const afterVal = losData.after[code] || 0;
                const change = afterVal - beforeVal;

                return (
                  <div key={code} className="grid grid-cols-4 gap-4 p-4 border-b border-neutral-100 items-center">
                    <div className="font-semibold text-[#111827]">{code}</div>
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
                            before: { ...losData.before, [code]: Number(e.target.value) || 0 },
                          })}
                          className="w-16 px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                          data-testid={`input-los-before-${code}`}
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
                            after: { ...losData.after, [code]: Number(e.target.value) || 0 },
                          })}
                          className="w-16 px-2 py-1 text-sm border border-neutral-200 rounded focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                          data-testid={`input-los-after-${code}`}
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

            {closureBeforeTotal === 100 && closureAfterTotal === 100 && sameDayImprovement > 0 && (
              <div className="flex items-center gap-3 mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                <Zap className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <span className="text-xl font-bold text-emerald-600">+{sameDayImprovement}pp</span>
                  <span className="text-sm text-emerald-700 ml-2">improvement in same-day chart closure</span>
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
