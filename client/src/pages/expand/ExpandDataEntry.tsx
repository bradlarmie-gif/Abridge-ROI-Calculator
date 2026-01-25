import { useMemo, useState } from "react";
import { 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  Moon, 
  FileText, 
  DollarSign, 
  FileCheck, 
  Smile,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import type { 
  DeploymentData, 
  MetricType, 
  MetricsData, 
  TimelineData, 
  TimelineDataPoint,
  MetricEntryMode 
} from "./ExpandFlow";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceDot
} from "recharts";

interface ExpandDataEntryProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  setMetricsData: (data: MetricsData) => void;
  timelineData: TimelineData;
  setTimelineData: (data: TimelineData) => void;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

// Metric configuration with benchmarks
const METRIC_CONFIG = {
  wrvuCapture: {
    name: "wRVU per Encounter",
    description: "Revenue capture improvement",
    icon: DollarSign,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    unit: "wRVU/enc",
    benchmarkText: "Abridge customers typically see 3-7% lift",
    isPositiveGood: true,
    step: 0.01,
  },
  timeSavings: {
    name: "Time in Notes",
    description: "Documentation efficiency",
    icon: Clock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    unit: "min",
    benchmarkText: "Average reduction: 3-5 min per encounter",
    isPositiveGood: false,
    step: 0.1,
  },
  chartClosure: {
    name: "Same-Day Chart Closure",
    description: "Revenue cycle acceleration",
    icon: FileCheck,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    unit: "%",
    benchmarkText: "Typical improvement: 5-15 percentage points",
    isPositiveGood: true,
    step: 1,
  },
  levelOfService: {
    name: "Average E&M Level",
    description: "Coding accuracy",
    icon: FileText,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    unit: "avg level",
    benchmarkText: "Typical increase: 0.2-0.5 levels",
    isPositiveGood: true,
    step: 0.01,
  },
  workOutsideWork: {
    name: "Work Outside of Work",
    description: "After-hours burden",
    icon: Moon,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    unit: "hrs/week",
    benchmarkText: "Typical reduction: 2-5 hours per week",
    isPositiveGood: false,
    step: 0.1,
  },
  clinicianSatisfaction: {
    name: "Clinician Satisfaction",
    description: "Provider experience",
    icon: Smile,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    unit: "pts",
    benchmarkText: "Average improvement: 10-20 points",
    isPositiveGood: true,
    step: 1,
  },
};

// Level of Service - using Level 1-5
const LEVEL_OF_SERVICE = [
  { id: "level5", label: "Level 5", weight: 5 },
  { id: "level4", label: "Level 4", weight: 4 },
  { id: "level3", label: "Level 3", weight: 3 },
  { id: "level2", label: "Level 2", weight: 2 },
  { id: "level1", label: "Level 1", weight: 1 },
];

// Quick vs Trend Mode Toggle
function ModeToggle({ 
  mode, 
  onChange,
  metricId
}: { 
  mode: MetricEntryMode; 
  onChange: (mode: MetricEntryMode) => void;
  metricId: string;
}) {
  return (
    <div className="flex rounded-lg border border-neutral-200 overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => onChange("quick")}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
          mode === "quick" 
            ? "bg-[#EA2C00] text-white" 
            : "bg-white text-neutral-600 hover:bg-neutral-50"
        }`}
        data-testid={`button-mode-quick-${metricId}`}
      >
        <BarChart3 className="w-4 h-4" />
        Quick
        <span className={`text-xs ${mode === "quick" ? "text-white/80" : "text-neutral-400"}`}>
          Before &amp; after only
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChange("trend")}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-all ${
          mode === "trend" 
            ? "bg-[#EA2C00] text-white" 
            : "bg-white text-neutral-600 hover:bg-neutral-50"
        }`}
        data-testid={`button-mode-trend-${metricId}`}
      >
        <TrendingUp className="w-4 h-4" />
        Trend
        <span className={`text-xs ${mode === "trend" ? "text-white/80" : "text-neutral-400"}`}>
          Monthly data points
        </span>
      </button>
    </div>
  );
}

// Quick Entry Component
function QuickEntry({
  before,
  after,
  onBeforeChange,
  onAfterChange,
  unit,
  isPositiveGood,
  step = 1,
  testIdPrefix,
}: {
  before: number | null;
  after: number | null;
  onBeforeChange: (val: number | null) => void;
  onAfterChange: (val: number | null) => void;
  unit: string;
  isPositiveGood: boolean;
  step?: number;
  testIdPrefix: string;
}) {
  const change = before !== null && after !== null
    ? isPositiveGood ? after - before : before - after
    : null;
  const percentChange = change !== null && before !== null && before !== 0
    ? Math.round(Math.abs(((after! - before) / before) * 100))
    : null;
  const isGood = change !== null && change > 0;

  return (
    <div className="flex items-end gap-4 p-5 bg-neutral-50 rounded-xl">
      <div className="flex-1">
        <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">
          BEFORE ABRIDGE
        </span>
        <input
          type="number"
          step={step}
          placeholder="—"
          value={before ?? ""}
          onChange={(e) => onBeforeChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-4 py-3 text-xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EA2C00]"
          data-testid={`input-${testIdPrefix}-before`}
        />
        <span className="text-xs text-[#6B7280] text-center block mt-1">{unit}</span>
      </div>

      <div className="text-2xl text-neutral-300 pb-6">→</div>

      <div className="flex-1">
        <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">
          AFTER ABRIDGE
        </span>
        <input
          type="number"
          step={step}
          placeholder="—"
          value={after ?? ""}
          onChange={(e) => onAfterChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full px-4 py-3 text-xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EA2C00]"
          data-testid={`input-${testIdPrefix}-after`}
        />
        <span className="text-xs text-[#6B7280] text-center block mt-1">{unit}</span>
      </div>

      <div className="text-xl text-neutral-300 pb-6">=</div>

      <div className="flex-1">
        <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">
          CHANGE
        </span>
        {change !== null ? (
          <div className={`px-4 py-3 rounded-lg text-center ${isGood ? "bg-emerald-50" : "bg-red-50"}`}>
            <span className={`text-xl font-bold block ${isGood ? "text-emerald-600" : "text-red-600"}`}>
              {isPositiveGood ? (after! > before! ? "+" : "") : (before! > after! ? "-" : "+")}
              {Math.abs(change).toFixed(step < 1 ? 2 : 0)} {unit}
            </span>
            {percentChange !== null && (
              <span className={`text-sm ${isGood ? "text-emerald-700" : "text-red-700"}`}>
                {percentChange}% {isPositiveGood ? "lift" : "reduction"}
              </span>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 bg-neutral-100 rounded-lg text-center">
            <span className="text-sm text-neutral-400">Enter data</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Trend Entry Component with paste support
function TrendEntry({
  baseline,
  monthlyData,
  months,
  onBaselineChange,
  onMonthChange,
  onPaste,
  unit,
  isPositiveGood,
  testIdPrefix,
}: {
  baseline: number | null;
  monthlyData: (number | null)[];
  months: number;
  onBaselineChange: (val: number | null) => void;
  onMonthChange: (index: number, val: number | null) => void;
  onPaste: (data: string) => void;
  unit: string;
  isPositiveGood: boolean;
  testIdPrefix: string;
}) {
  const [pasteText, setPasteText] = useState("");
  
  const handlePaste = () => {
    if (pasteText.trim()) {
      onPaste(pasteText);
      setPasteText("");
    }
  };

  // Calculate summary stats
  const allValues = [baseline, ...monthlyData].filter((v): v is number => v !== null);
  const hasData = allValues.length >= 2;
  const first = hasData ? allValues[0] : null;
  const last = hasData ? allValues[allValues.length - 1] : null;
  const change = first !== null && last !== null
    ? isPositiveGood ? last - first : first - last
    : null;
  const percentChange = change !== null && first !== null && first !== 0
    ? Math.round(Math.abs(((last! - first) / first) * 100))
    : null;
  const isGood = change !== null && change > 0;

  // Chart data
  const chartData = hasData ? [
    { month: "Base", value: baseline },
    ...monthlyData.slice(0, months).map((val, i) => ({
      month: `M${i + 1}`,
      value: val,
    }))
  ].filter(d => d.value !== null) : [];

  return (
    <div className="space-y-4">
      {/* Paste Area */}
      <div className="p-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
        <label className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block mb-2">
          PASTE YOUR MONTHLY DATA
        </label>
        <textarea
          placeholder={`Format: Month, Value (one per line)\nExample:\nJul 2024, 1.42\nAug 2024, 1.48\n...`}
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EA2C00] resize-none h-20"
          data-testid={`textarea-${testIdPrefix}-paste`}
        />
        {pasteText.trim() && (
          <Button 
            size="sm" 
            onClick={handlePaste}
            className="mt-2"
            data-testid={`button-${testIdPrefix}-parse`}
          >
            Parse Data
          </Button>
        )}
      </div>

      <div className="text-center text-xs text-neutral-400">or enter manually</div>

      {/* Manual Entry Table */}
      <div className="p-4 bg-neutral-50 rounded-xl">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase">MONTH</span>
          <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase">VALUE</span>
        </div>
        
        {/* Baseline */}
        <div className="grid grid-cols-2 gap-2 items-center mb-2">
          <span className="text-sm font-medium text-[#111827]">
            Baseline
            <span className="text-xs text-neutral-400 ml-2">Before Abridge</span>
          </span>
          <input
            type="number"
            step="0.01"
            placeholder="—"
            value={baseline ?? ""}
            onChange={(e) => onBaselineChange(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 text-sm font-semibold border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EA2C00]"
            data-testid={`input-${testIdPrefix}-baseline`}
          />
        </div>

        {/* Monthly entries */}
        {Array.from({ length: months }, (_, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 items-center mb-2">
            <span className={`text-sm font-medium ${i === months - 1 ? "text-[#EA2C00]" : "text-[#111827]"}`}>
              Month {i + 1}
              {i === months - 1 && <span className="text-xs ml-2">Current</span>}
            </span>
            <input
              type="number"
              step="0.01"
              placeholder="—"
              value={monthlyData[i] ?? ""}
              onChange={(e) => onMonthChange(i, e.target.value ? Number(e.target.value) : null)}
              className={`px-3 py-2 text-sm font-semibold border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EA2C00] ${
                i === months - 1 ? "border-[#EA2C00]" : "border-neutral-200"
              }`}
              data-testid={`input-${testIdPrefix}-m${i + 1}`}
            />
          </div>
        ))}
      </div>

      {/* Mini Trend Chart + Summary */}
      {hasData && chartData.length >= 2 && (
        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <div className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-3">YOUR TREND</div>
          
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={isGood ? "#10B981" : "#EF4444"}
                  strokeWidth={2}
                  dot={{ fill: isGood ? "#10B981" : "#EF4444", strokeWidth: 0, r: 4 }}
                />
                {chartData[chartData.length - 1]?.value !== null && (
                  <ReferenceDot
                    x={chartData[chartData.length - 1]?.month}
                    y={chartData[chartData.length - 1]?.value ?? 0}
                    r={6}
                    fill="#EA2C00"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
            <span className="text-sm text-[#6B7280]">
              Baseline: <strong className="text-[#111827]">{first?.toFixed(2)}</strong>
            </span>
            <span className="text-neutral-300">→</span>
            <span className="text-sm text-[#6B7280]">
              Current: <strong className="text-[#111827]">{last?.toFixed(2)}</strong>
            </span>
            <span className="text-neutral-300">=</span>
            <span className={`text-sm font-semibold ${isGood ? "text-emerald-600" : "text-red-600"}`}>
              {change !== null && change > 0 ? "+" : ""}{change?.toFixed(2)} ({percentChange}%)
            </span>
          </div>

          <div className="flex items-center gap-2 mt-2">
            {isGood ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-xs ${isGood ? "text-emerald-600" : "text-red-500"}`}>
              {isGood ? "Consistent improvement" : "Needs attention"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Benchmark display
function BenchmarkCard({ 
  text, 
  current, 
  isGood 
}: { 
  text: string; 
  current: string; 
  isGood: boolean;
}) {
  return (
    <div className="flex items-start gap-3 mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
      <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-xs font-semibold text-blue-800 tracking-wider uppercase">BENCHMARK</span>
        <p className="text-sm text-blue-800 mt-1">{text}</p>
        <p className="text-sm text-blue-700 mt-1">
          You're at: <strong>{current}</strong> — 
          {isGood ? (
            <span className="text-emerald-700 ml-1">Within expected range</span>
          ) : (
            <span className="text-amber-700 ml-1">Building momentum</span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function ExpandDataEntry({
  deploymentData,
  selectedMetrics,
  metricsData,
  setMetricsData,
  timelineData,
  setTimelineData,
  onNext,
  onBack,
  onBackToJourney,
}: ExpandDataEntryProps) {
  
  // Per-metric entry modes (default to "quick")
  const [metricModes, setMetricModes] = useState<Record<MetricType, MetricEntryMode>>({
    wrvuCapture: "quick",
    timeSavings: "quick",
    chartClosure: "quick",
    levelOfService: "quick",
    workOutsideWork: "quick",
    clinicianSatisfaction: "quick",
  });

  // Trend data state for each metric
  const [trendData, setTrendData] = useState<Record<string, { baseline: number | null; monthlyData: (number | null)[] }>>({
    wrvuCapture: { baseline: null, monthlyData: Array(12).fill(null) },
    timeSavings: { baseline: null, monthlyData: Array(12).fill(null) },
    chartClosure: { baseline: null, monthlyData: Array(12).fill(null) },
    levelOfService: { baseline: null, monthlyData: Array(12).fill(null) },
    workOutsideWork: { baseline: null, monthlyData: Array(12).fill(null) },
    clinicianSatisfaction: { baseline: null, monthlyData: Array(12).fill(null) },
  });

  // Expanded state for Level of Service detailed entry
  const [losShowDetailed, setLosShowDetailed] = useState(false);
  const [closureShowDetailed, setClosureShowDetailed] = useState(false);

  const months = deploymentData.monthsOnAbridge || 6;

  const setMetricMode = (metric: MetricType, mode: MetricEntryMode) => {
    setMetricModes(prev => ({ ...prev, [metric]: mode }));
  };

  const updateMetric = <T extends keyof MetricsData>(
    metricKey: T,
    value: MetricsData[T]
  ) => {
    setMetricsData({ ...metricsData, [metricKey]: value });
  };

  const updateTrendData = (metric: string, field: "baseline" | "monthlyData", value: number | null | (number | null)[]) => {
    setTrendData(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [field]: value,
      }
    }));
  };

  const parsePastedData = (metric: string, pasteText: string) => {
    const lines = pasteText.trim().split("\n");
    const values: number[] = [];
    
    lines.forEach(line => {
      const parts = line.split(/[,\t]/);
      const valuePart = parts[parts.length - 1]?.trim();
      const num = parseFloat(valuePart?.replace(/[^0-9.-]/g, "") || "");
      if (!isNaN(num)) {
        values.push(num);
      }
    });

    if (values.length > 0) {
      const baseline = values[0];
      const monthlyData = [...trendData[metric].monthlyData];
      values.slice(1).forEach((val, i) => {
        if (i < monthlyData.length) {
          monthlyData[i] = val;
        }
      });
      
      setTrendData(prev => ({
        ...prev,
        [metric]: { baseline, monthlyData }
      }));

      // Also update metricsData for compatibility
      if (metric === "wrvuCapture" || metric === "timeSavings" || metric === "workOutsideWork" || metric === "clinicianSatisfaction") {
        const lastValue = values[values.length - 1];
        updateMetric(metric as keyof MetricsData, { 
          before: baseline, 
          after: lastValue 
        } as any);
      }
    }
  };

  // Calculate Level of Service averages from distribution
  const calculateLosAverage = (distribution: { [key: string]: number }): number | null => {
    let weighted = 0;
    let total = 0;
    LEVEL_OF_SERVICE.forEach(level => {
      const pct = distribution[level.id] || 0;
      weighted += pct * level.weight;
      total += pct;
    });
    return total > 0 ? weighted / total : null;
  };

  // Determine which metrics are ordered: PRIMARY first, then SECONDARY
  const orderedMetrics = useMemo(() => {
    const primary = ["wrvuCapture", "timeSavings", "chartClosure"] as MetricType[];
    const secondary = ["levelOfService", "workOutsideWork", "clinicianSatisfaction"] as MetricType[];
    return [
      ...primary.filter(m => selectedMetrics.includes(m)),
      ...secondary.filter(m => selectedMetrics.includes(m)),
    ];
  }, [selectedMetrics]);

  // Render a metric section
  const renderMetricSection = (metricId: MetricType) => {
    const config = METRIC_CONFIG[metricId];
    const Icon = config.icon;
    const mode = metricModes[metricId];

    // Special handling for Level of Service
    if (metricId === "levelOfService") {
      const losData = metricsData.levelOfService;
      const avgBefore = losData.averageBefore;
      const avgAfter = losData.averageAfter;
      const change = avgBefore !== null && avgAfter !== null ? avgAfter - avgBefore : null;
      const hasData = change !== null && change > 0;

      return (
        <section key={metricId} className="mb-6 p-5 bg-white border border-neutral-200 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#111827]">{config.name}</h2>
              <p className="text-sm text-[#6B7280]">{config.description}</p>
            </div>
          </div>

          <ModeToggle mode={mode} onChange={(m) => setMetricMode(metricId, m)} metricId={metricId} />

          {mode === "quick" ? (
            <div>
              <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <Info className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-800">
                  This is your weighted average E&M level (usually in billing reports as "Average Level of Service")
                </span>
              </div>

              <QuickEntry
                before={avgBefore}
                after={avgAfter}
                onBeforeChange={(val) => updateMetric("levelOfService", { ...losData, averageBefore: val })}
                onAfterChange={(val) => updateMetric("levelOfService", { ...losData, averageAfter: val })}
                unit={config.unit}
                isPositiveGood={true}
                step={0.01}
                testIdPrefix="los-avg"
              />

              <button
                type="button"
                onClick={() => setLosShowDetailed(!losShowDetailed)}
                className="text-sm text-[#EA2C00] mt-3 flex items-center gap-1 hover:underline"
                data-testid="button-los-show-detailed"
              >
                {losShowDetailed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {losShowDetailed ? "Hide distribution" : "Don't have the average? Calculate from distribution"}
              </button>

              {losShowDetailed && (
                <div className="mt-4 p-4 bg-neutral-50 rounded-xl">
                  <p className="text-xs text-[#6B7280] mb-3">Enter % of encounters at each level (should sum to 100%)</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <span className="text-xs font-semibold text-[#6B7280]">Level</span>
                    <span className="text-xs font-semibold text-[#6B7280] text-center">Before %</span>
                    <span className="text-xs font-semibold text-[#6B7280] text-center">After %</span>
                    
                    {LEVEL_OF_SERVICE.map(level => (
                      <>
                        <span key={`${level.id}-label`} className="text-sm text-[#111827]">{level.label}</span>
                        <input
                          key={`${level.id}-before`}
                          type="number"
                          step="1"
                          placeholder="0"
                          value={losData.before[level.id] || ""}
                          onChange={(e) => updateMetric("levelOfService", {
                            ...losData,
                            before: { ...losData.before, [level.id]: Number(e.target.value) || 0 },
                            averageBefore: calculateLosAverage({ ...losData.before, [level.id]: Number(e.target.value) || 0 }),
                          })}
                          className="px-2 py-1 text-sm text-center border border-neutral-200 rounded bg-white"
                          data-testid={`input-los-${level.id}-before`}
                        />
                        <input
                          key={`${level.id}-after`}
                          type="number"
                          step="1"
                          placeholder="0"
                          value={losData.after[level.id] || ""}
                          onChange={(e) => updateMetric("levelOfService", {
                            ...losData,
                            after: { ...losData.after, [level.id]: Number(e.target.value) || 0 },
                            averageAfter: calculateLosAverage({ ...losData.after, [level.id]: Number(e.target.value) || 0 }),
                          })}
                          className="px-2 py-1 text-sm text-center border border-neutral-200 rounded bg-white"
                          data-testid={`input-los-${level.id}-after`}
                        />
                      </>
                    ))}
                  </div>
                </div>
              )}

              {hasData && (
                <BenchmarkCard
                  text={config.benchmarkText}
                  current={`+${change?.toFixed(2)} levels`}
                  isGood={change !== null && change >= 0.2}
                />
              )}
            </div>
          ) : (
            <TrendEntry
              baseline={trendData.levelOfService.baseline}
              monthlyData={trendData.levelOfService.monthlyData}
              months={months}
              onBaselineChange={(val) => {
                updateTrendData("levelOfService", "baseline", val);
                updateMetric("levelOfService", { ...losData, averageBefore: val });
              }}
              onMonthChange={(i, val) => {
                const newData = [...trendData.levelOfService.monthlyData];
                newData[i] = val;
                updateTrendData("levelOfService", "monthlyData", newData);
                if (i === months - 1) {
                  updateMetric("levelOfService", { ...losData, averageAfter: val });
                }
              }}
              onPaste={(data) => parsePastedData("levelOfService", data)}
              unit={config.unit}
              isPositiveGood={true}
              testIdPrefix="los-trend"
            />
          )}
        </section>
      );
    }

    // Special handling for Chart Closure
    if (metricId === "chartClosure") {
      const closureData = metricsData.chartClosure;
      const sameDayBefore = closureData.sameDayBefore;
      const sameDayAfter = closureData.sameDayAfter;
      const change = sameDayBefore !== null && sameDayAfter !== null ? sameDayAfter - sameDayBefore : null;
      const hasData = change !== null && change > 0;

      return (
        <section key={metricId} className="mb-6 p-5 bg-white border border-neutral-200 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#111827]">{config.name}</h2>
              <p className="text-sm text-[#6B7280]">{config.description}</p>
            </div>
          </div>

          <ModeToggle mode={mode} onChange={(m) => setMetricMode(metricId, m)} metricId={metricId} />

          {mode === "quick" ? (
            <div>
              <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <Info className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-800">
                  What % of charts are closed within 24 hours of the encounter?
                </span>
              </div>

              <QuickEntry
                before={sameDayBefore}
                after={sameDayAfter}
                onBeforeChange={(val) => updateMetric("chartClosure", { ...closureData, sameDayBefore: val })}
                onAfterChange={(val) => updateMetric("chartClosure", { ...closureData, sameDayAfter: val })}
                unit="%"
                isPositiveGood={true}
                step={1}
                testIdPrefix="closure"
              />

              <button
                type="button"
                onClick={() => setClosureShowDetailed(!closureShowDetailed)}
                className="text-sm text-[#EA2C00] mt-3 flex items-center gap-1 hover:underline"
                data-testid="button-closure-show-detailed"
              >
                {closureShowDetailed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {closureShowDetailed ? "Hide breakdown" : "Want to enter full breakdown? (24h/48h/72h+)"}
              </button>

              {closureShowDetailed && (
                <div className="mt-4 p-4 bg-neutral-50 rounded-xl">
                  <p className="text-xs text-[#6B7280] mb-3">Enter % of charts closed in each time bucket</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <span className="text-xs font-semibold text-[#6B7280]">Time Bucket</span>
                    <span className="text-xs font-semibold text-[#6B7280] text-center">Before %</span>
                    <span className="text-xs font-semibold text-[#6B7280] text-center">After %</span>
                    
                    {[
                      { id: "within24", label: "Within 24h" },
                      { id: "24to48", label: "24-48h" },
                      { id: "48to72", label: "48-72h" },
                      { id: "over72", label: "72h+" },
                    ].map(bucket => (
                      <>
                        <span key={`${bucket.id}-label`} className="text-sm text-[#111827]">{bucket.label}</span>
                        <input
                          key={`${bucket.id}-before`}
                          type="number"
                          step="1"
                          placeholder="0"
                          value={closureData.before[bucket.id as keyof typeof closureData.before] || ""}
                          onChange={(e) => updateMetric("chartClosure", {
                            ...closureData,
                            before: { ...closureData.before, [bucket.id]: Number(e.target.value) || 0 },
                          })}
                          className="px-2 py-1 text-sm text-center border border-neutral-200 rounded bg-white"
                        />
                        <input
                          key={`${bucket.id}-after`}
                          type="number"
                          step="1"
                          placeholder="0"
                          value={closureData.after[bucket.id as keyof typeof closureData.after] || ""}
                          onChange={(e) => updateMetric("chartClosure", {
                            ...closureData,
                            after: { ...closureData.after, [bucket.id]: Number(e.target.value) || 0 },
                          })}
                          className="px-2 py-1 text-sm text-center border border-neutral-200 rounded bg-white"
                        />
                      </>
                    ))}
                  </div>
                </div>
              )}

              {hasData && (
                <BenchmarkCard
                  text={config.benchmarkText}
                  current={`+${change}pp same-day closure`}
                  isGood={change !== null && change >= 5}
                />
              )}
            </div>
          ) : (
            <TrendEntry
              baseline={trendData.chartClosure.baseline}
              monthlyData={trendData.chartClosure.monthlyData}
              months={months}
              onBaselineChange={(val) => {
                updateTrendData("chartClosure", "baseline", val);
                updateMetric("chartClosure", { ...closureData, sameDayBefore: val });
              }}
              onMonthChange={(i, val) => {
                const newData = [...trendData.chartClosure.monthlyData];
                newData[i] = val;
                updateTrendData("chartClosure", "monthlyData", newData);
                if (i === months - 1) {
                  updateMetric("chartClosure", { ...closureData, sameDayAfter: val });
                }
              }}
              onPaste={(data) => parsePastedData("chartClosure", data)}
              unit="%"
              isPositiveGood={true}
              testIdPrefix="closure-trend"
            />
          )}
        </section>
      );
    }

    // Generic metrics (wRVU, Time Savings, Work Outside Work, Satisfaction)
    const metricData = metricsData[metricId] as { before: number | null; after: number | null };
    const change = metricData.before !== null && metricData.after !== null
      ? config.isPositiveGood 
        ? metricData.after - metricData.before 
        : metricData.before - metricData.after
      : null;
    const hasData = change !== null && Math.abs(change) > 0;
    const percentChange = hasData && metricData.before !== null && metricData.before !== 0
      ? Math.round(Math.abs(((metricData.after! - metricData.before) / metricData.before) * 100))
      : null;

    return (
      <section key={metricId} className="mb-6 p-5 bg-white border border-neutral-200 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111827]">{config.name}</h2>
            <p className="text-sm text-[#6B7280]">{config.description}</p>
          </div>
        </div>

        <ModeToggle mode={mode} onChange={(m) => setMetricMode(metricId, m)} metricId={metricId} />

        {mode === "quick" ? (
          <div>
            <QuickEntry
              before={metricData.before}
              after={metricData.after}
              onBeforeChange={(val) => updateMetric(metricId, { ...metricData, before: val })}
              onAfterChange={(val) => updateMetric(metricId, { ...metricData, after: val })}
              unit={config.unit}
              isPositiveGood={config.isPositiveGood}
              step={config.step}
              testIdPrefix={metricId}
            />

            {hasData && (
              <BenchmarkCard
                text={config.benchmarkText}
                current={`${percentChange}% ${config.isPositiveGood ? "lift" : "reduction"}`}
                isGood={percentChange !== null && percentChange >= 3}
              />
            )}
          </div>
        ) : (
          <TrendEntry
            baseline={trendData[metricId].baseline}
            monthlyData={trendData[metricId].monthlyData}
            months={months}
            onBaselineChange={(val) => {
              updateTrendData(metricId, "baseline", val);
              updateMetric(metricId, { ...metricData, before: val });
            }}
            onMonthChange={(i, val) => {
              const newData = [...trendData[metricId].monthlyData];
              newData[i] = val;
              updateTrendData(metricId, "monthlyData", newData);
              if (i === months - 1) {
                updateMetric(metricId, { ...metricData, after: val });
              }
            }}
            onPaste={(data) => parsePastedData(metricId, data)}
            unit={config.unit}
            isPositiveGood={config.isPositiveGood}
            testIdPrefix={`${metricId}-trend`}
          />
        )}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <UnifiedHeader 
        pathType="expand"
        currentStep={3}
        totalSteps={5}
        stepName="Enter Data"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-3xl mx-auto px-6 py-6 md:py-8 pb-10">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Enter Your Results
          </h1>
          <p className="text-[#6B7280]">
            {deploymentData.providers} providers · {months} months on Abridge · {selectedMetrics.length} metrics
          </p>
        </div>

        {/* Metric Sections */}
        {orderedMetrics.map(metricId => renderMetricSection(metricId))}

        {/* Actions */}
        <div className="flex justify-end mt-8">
          <Button
            onClick={onNext}
            className="gap-2"
            data-testid="button-next"
          >
            See Your Results
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
