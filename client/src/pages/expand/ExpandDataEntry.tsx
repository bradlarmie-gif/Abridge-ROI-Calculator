import { useMemo, useState, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Info,
  Sparkles,
  Check,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableNumberInput } from "@/components/ui/editable-number-input";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { TermTooltip, TERMS } from "@/components/TermTooltip";
import type { 
  DeploymentData, 
  MetricType, 
  MetricsData, 
  TimelineData, 
  TimelineDataPoint,
  MetricEntryMode,
  MetricTrendData,
  MetricEntryModeState
} from "./ExpandFlow";
import { EXPAND_ROI_DEFAULTS } from "@/lib/expandRoiCalculator";
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
  metricTrendData: MetricTrendData;
  setMetricTrendData: (data: MetricTrendData) => void;
  metricEntryModes: MetricEntryModeState;
  setMetricEntryModes: (modes: MetricEntryModeState) => void;
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
    benchmarkText: "Abridge customers typically see 3-9% lift",
    benchmarkWhisper: "Typical range: 1.8-2.8 wRVU/encounter",
    benchmarkMin: 3,
    benchmarkMax: 9,
    isPositiveGood: true,
    step: 0.01,
    tooltipKey: "wRVU" as keyof typeof TERMS,
  },
  timeSavings: {
    name: "Time in Notes",
    description: "Documentation efficiency",
    icon: Clock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    unit: "min",
    benchmarkText: "Average reduction: 2-4.5 min per encounter",
    benchmarkWhisper: "Typical: 2-12 min/encounter baseline",
    benchmarkMin: 2,
    benchmarkMax: 4.5,
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
    benchmarkWhisper: "Typical: 40-95% same-day closure",
    benchmarkMin: 5,
    benchmarkMax: 15,
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
    benchmarkWhisper: "Typical average: 3.0-4.5",
    benchmarkMin: 0.2,
    benchmarkMax: 0.5,
    isPositiveGood: true,
    step: 0.01,
    tooltipKey: "emLevel" as keyof typeof TERMS,
  },
  workOutsideWork: {
    name: "Work Outside of Work",
    description: "After-hours burden",
    icon: Moon,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    unit: "hrs/week",
    benchmarkText: "Typical reduction: 2-5 hours per week",
    benchmarkWhisper: "Typical: 5-15 hrs/week before Abridge",
    benchmarkMin: 2,
    benchmarkMax: 5,
    isPositiveGood: false,
    step: 0.1,
    tooltipKey: "pajamaTime" as keyof typeof TERMS,
  },
  clinicianSatisfaction: {
    name: "Clinician Satisfaction",
    description: "Provider experience",
    icon: Smile,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    unit: "pts",
    benchmarkText: "Average improvement: 10-20 points",
    benchmarkWhisper: "Typical: 50-100 point scale",
    benchmarkMin: 10,
    benchmarkMax: 20,
    isPositiveGood: true,
    step: 1,
  },
  utilization: {
    name: "Utilization Rate",
    description: "Adoption across eligible providers",
    icon: TrendingUp,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    unit: "%",
    benchmarkText: "Strong deployments reach 75%+ utilization",
    benchmarkWhisper: "Typical range: 40-90% depending on rollout phase",
    benchmarkMin: 60,
    benchmarkMax: 85,
    isPositiveGood: true,
    step: 1,
  },
  diagnosisCapture: {
    name: "Diagnosis Capture",
    description: "HCC/RAF score improvement",
    icon: FileText,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    unit: "diagnoses/enc",
    benchmarkText: "Typical improvement: 0.5-2 additional diagnoses per encounter",
    benchmarkWhisper: "Measured via HCC recapture rate or RAF score delta",
    benchmarkMin: 0.5,
    benchmarkMax: 2,
    isPositiveGood: true,
    step: 0.1,
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

// Premium Mode Toggle - Quick is default, Trend is advanced
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
    <div className="mb-4">
      {/* Quick mode is always visible */}
      {mode === "quick" && (
        <button
          type="button"
          onClick={() => onChange("trend")}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-[#EA2C00] transition-colors group"
          data-testid={`button-mode-trend-${metricId}`}
        >
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-neutral-300 group-hover:border-[#EA2C00]/50 group-hover:bg-[#FEF0EC]/30 transition-all">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-medium">Have monthly data?</span>
            <span className="text-neutral-400 group-hover:text-[#EA2C00]">Enter trend data</span>
          </div>
        </button>
      )}
      
      {/* Trend mode header with back option */}
      {mode === "trend" && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 bg-gradient-to-r from-[#FEF0EC] to-white border border-[#EA2C00]/20 rounded-xl mb-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EA2C00] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-[#111827]">Advanced: Trend Entry</span>
              <p className="text-xs text-neutral-500">Monthly data unlocks richer analysis in your report</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange("quick")}
            className="text-xs text-neutral-500 hover:text-[#EA2C00] transition-colors px-3 py-1.5 rounded-lg hover:bg-white"
            data-testid={`button-mode-quick-${metricId}`}
          >
            Switch to Quick
          </button>
        </motion.div>
      )}
    </div>
  );
}

// Benchmark feedback badge
function BenchmarkBadge({ 
  change, 
  benchmarkMin, 
  benchmarkMax, 
  isPositiveGood,
  metricName 
}: { 
  change: number | null; 
  benchmarkMin: number;
  benchmarkMax: number;
  isPositiveGood: boolean;
  metricName: string;
}) {
  if (change === null) return null;
  
  const actualChange = isPositiveGood ? change : -change; // Normalize for comparison
  
  let status: "excellent" | "good" | "developing" | "below";
  let message: string;
  
  if (actualChange >= benchmarkMax) {
    status = "excellent";
    message = "Exceptional result";
  } else if (actualChange >= benchmarkMin) {
    status = "good";
    message = "Strong improvement";
  } else if (actualChange > 0) {
    status = "developing";
    message = "Room to grow";
  } else {
    status = "below";
    message = "Opportunity ahead";
  }
  
  const styles = {
    excellent: "bg-emerald-100 text-emerald-700 border-emerald-200",
    good: "bg-blue-100 text-blue-700 border-blue-200",
    developing: "bg-amber-100 text-amber-700 border-amber-200",
    below: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };
  
  const icons = {
    excellent: <Zap className="w-3 h-3" />,
    good: <TrendingUp className="w-3 h-3" />,
    developing: <TrendingUp className="w-3 h-3" />,
    below: <TrendingDown className="w-3 h-3" />,
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${styles[status]}`}
      data-testid={`badge-benchmark-${metricName}`}
    >
      {icons[status]}
      {message}
    </motion.div>
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
  benchmarkWhisper,
  benchmarkMin,
  benchmarkMax,
}: {
  before: number | null;
  after: number | null;
  onBeforeChange: (val: number | null) => void;
  onAfterChange: (val: number | null) => void;
  unit: string;
  isPositiveGood: boolean;
  step?: number;
  testIdPrefix: string;
  benchmarkWhisper?: string;
  benchmarkMin?: number;
  benchmarkMax?: number;
}) {
  const change = before !== null && after !== null
    ? isPositiveGood ? after - before : before - after
    : null;
  const percentChange = change !== null && before !== null && before !== 0
    ? Math.round(Math.abs(((after! - before) / before) * 100))
    : null;
  const isGood = change !== null && change > 0;
  const hasData = before !== null || after !== null;

  return (
    <div className="p-5 sm:p-6 bg-gradient-to-br from-neutral-50 to-white rounded-xl border border-neutral-100 space-y-5">
      {/* Visual journey header */}
      <div className="flex items-center justify-center gap-2 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-3 text-sm">
          <span className={`font-medium ${before !== null ? "text-neutral-700" : "text-neutral-400"}`}>
            Before
          </span>
          <div className="flex items-center gap-1">
            <div className={`w-8 h-0.5 ${hasData ? "bg-gradient-to-r from-neutral-300 to-[#EA2C00]" : "bg-neutral-200"}`} />
            <ArrowRight className={`w-4 h-4 ${hasData ? "text-[#EA2C00]" : "text-neutral-300"}`} />
          </div>
          <span className={`font-medium ${after !== null ? "text-[#EA2C00]" : "text-neutral-400"}`}>
            After
          </span>
        </div>
      </div>

      {/* Before/After/Change grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Before */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block">
            BEFORE ABRIDGE
          </span>
          <input
            type="number"
            inputMode="decimal"
            step={step}
            placeholder="—"
            value={before ?? ""}
            onChange={(e) => onBeforeChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-3 text-xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EA2C00] transition-shadow"
            data-testid={`input-${testIdPrefix}-before`}
          />
          <span className="text-xs text-[#6B7280] text-center block">{unit}</span>
        </div>

        {/* After */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block">
            AFTER ABRIDGE
          </span>
          <input
            type="number"
            inputMode="decimal"
            step={step}
            placeholder="—"
            value={after ?? ""}
            onChange={(e) => onAfterChange(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-3 text-xl font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EA2C00] transition-shadow"
            data-testid={`input-${testIdPrefix}-after`}
          />
          <span className="text-xs text-[#6B7280] text-center block">{unit}</span>
        </div>

        {/* Change result - spans both cols on mobile */}
        <div className="col-span-2 sm:col-span-1 space-y-2">
          <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase block">
            YOUR IMPACT
          </span>
          {change !== null ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`px-4 py-3 rounded-lg text-center ${isGood ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}
            >
              <span className={`text-xl font-bold ${isGood ? "text-emerald-600" : "text-red-600"}`}>
                {isPositiveGood ? (after! > before! ? "+" : "") : (before! > after! ? "-" : "+")}
                {Math.abs(change).toFixed(step < 1 ? 2 : 0)}
              </span>
              <span className={`text-sm ml-1 ${isGood ? "text-emerald-600" : "text-red-600"}`}>{unit}</span>
              {percentChange !== null && (
                <span className={`text-sm block mt-1 font-medium ${isGood ? "text-emerald-700" : "text-red-700"}`}>
                  {percentChange}% {isPositiveGood ? "lift" : "reduction"}
                </span>
              )}
              {/* Benchmark Badge */}
              {benchmarkMin !== undefined && benchmarkMax !== undefined && (
                <div className="mt-2">
                  <BenchmarkBadge 
                    change={change} 
                    benchmarkMin={benchmarkMin} 
                    benchmarkMax={benchmarkMax}
                    isPositiveGood={isPositiveGood}
                    metricName={testIdPrefix}
                  />
                </div>
              )}
            </motion.div>
          ) : (
            <div className="px-4 py-3 bg-neutral-50 rounded-lg text-center border border-dashed border-neutral-200">
              <span className="text-lg text-neutral-300">—</span>
              <span className="text-xs block mt-1 text-neutral-400">Enter values to see impact</span>
            </div>
          )}
        </div>
      </div>

      {/* Benchmark Whisper - enhanced styling */}
      {benchmarkWhisper && (
        <div className="flex items-center gap-2.5 text-xs text-neutral-600 pt-3 mt-1 border-t border-neutral-100 bg-blue-50/30 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 px-5 sm:px-6 py-3 rounded-b-xl">
          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Info className="w-3 h-3 text-blue-600" />
          </div>
          <span className="text-blue-800">{benchmarkWhisper}</span>
        </div>
      )}
    </div>
  );
}

// Premium Trend Entry Component with live chart and visual feedback
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
  const [showPaste, setShowPaste] = useState(false);
  const [recentlyFilled, setRecentlyFilled] = useState<string | null>(null);
  
  const handlePaste = () => {
    if (pasteText.trim()) {
      onPaste(pasteText);
      setPasteText("");
      setShowPaste(false);
    }
  };

  // Calculate progress
  const totalCells = months + 1; // baseline + months
  const filledCells = [baseline, ...monthlyData.slice(0, months)].filter(v => v !== null).length;
  const progress = Math.round((filledCells / totalCells) * 100);
  const isComplete = filledCells === totalCells;

  // Calculate summary stats
  const allValues = [baseline, ...monthlyData.slice(0, months)].filter((v): v is number => v !== null);
  const hasData = allValues.length >= 2;
  const first = baseline;
  const filledMonthlyValues = monthlyData.slice(0, months).filter((v): v is number => v !== null);
  const last = filledMonthlyValues.length > 0 ? filledMonthlyValues[filledMonthlyValues.length - 1] : null;
  const change = first !== null && last !== null
    ? isPositiveGood ? last - first : first - last
    : null;
  const percentChange = change !== null && first !== null && first !== 0
    ? Math.round(Math.abs(((last! - first) / first) * 100))
    : null;
  const isGood = change !== null && change > 0;

  // Chart data - only show filled values
  const chartData = [
    { month: "Base", value: baseline, index: -1 },
    ...monthlyData.slice(0, months).map((val, i) => ({
      month: `M${i + 1}`,
      value: val,
      index: i,
    }))
  ].filter(d => d.value !== null);

  const handleCellChange = (key: string, value: number | null) => {
    if (value !== null) {
      setRecentlyFilled(key);
      setTimeout(() => setRecentlyFilled(null), 600);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4"
    >
      {/* Progress Bar */}
      <div className="p-4 bg-gradient-to-r from-neutral-50 to-white border border-neutral-200 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-600 tracking-wider uppercase">
              Data Entry Progress
            </span>
            {isComplete && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold"
              >
                <Check className="w-3 h-3" />
                Complete
              </motion.div>
            )}
          </div>
          <span className="text-sm font-bold text-[#111827]">{filledCells} / {totalCells}</span>
        </div>
        <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full rounded-full ${isComplete ? "bg-emerald-500" : "bg-[#EA2C00]"}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Live Chart Preview - Always visible, updates in real-time */}
      <div className="p-4 bg-white border border-neutral-200 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#EA2C00]" />
            <span className="text-xs font-semibold text-neutral-600 tracking-wider uppercase">
              Live Preview
            </span>
          </div>
          {hasData && (
            <motion.div 
              key={`${first}-${last}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                isGood ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {isGood ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {change !== null && change > 0 ? "+" : ""}{change?.toFixed(2)} {unit}
              {percentChange !== null && ` (${percentChange}%)`}
            </motion.div>
          )}
        </div>
        
        <div className="h-36">
          {chartData.length >= 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  axisLine={{ stroke: "#E5E7EB" }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  domain={["auto", "auto"]}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chartData.length >= 2 ? (isGood ? "#10B981" : "#F59E0B") : "#EA2C00"}
                  strokeWidth={3}
                  dot={{ fill: "#fff", stroke: chartData.length >= 2 ? (isGood ? "#10B981" : "#F59E0B") : "#EA2C00", strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: "#EA2C00" }}
                  animationDuration={300}
                />
                {chartData.length > 0 && (
                  <ReferenceDot
                    x={chartData[chartData.length - 1]?.month}
                    y={chartData[chartData.length - 1]?.value ?? 0}
                    r={8}
                    fill="#EA2C00"
                    stroke="#fff"
                    strokeWidth={3}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
              Enter data below to see your trend
            </div>
          )}
        </div>

        {hasData && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 text-sm">
            <div className="text-neutral-500">
              Started at <strong className="text-[#111827]">{first?.toFixed(2)} {unit}</strong>
            </div>
            <div className="text-neutral-300">→</div>
            <div className="text-neutral-500">
              Now at <strong className="text-[#111827]">{last?.toFixed(2)} {unit}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Data Entry Grid - Premium styling */}
      <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-neutral-600 tracking-wider uppercase">
            Monthly Values
          </span>
          <button
            type="button"
            onClick={() => setShowPaste(!showPaste)}
            className="text-xs text-[#EA2C00] hover:underline flex items-center gap-1"
          >
            {showPaste ? "Hide paste" : "Paste from spreadsheet"}
          </button>
        </div>

        {/* Paste Area - Collapsed by default */}
        <AnimatePresence>
          {showPaste && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-3 bg-white border border-dashed border-neutral-300 rounded-lg">
                <textarea
                  placeholder={`Paste values (one per line):\n1.42\n1.48\n1.51\n...`}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[#EA2C00] resize-none h-20"
                  data-testid={`textarea-${testIdPrefix}-paste`}
                />
                {pasteText.trim() && (
                  <Button 
                    size="sm" 
                    onClick={handlePaste}
                    className="mt-2"
                    data-testid={`button-${testIdPrefix}-parse`}
                  >
                    Apply Data
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Baseline Row */}
        <motion.div 
          className={`flex items-center gap-3 p-3 rounded-lg mb-2 transition-all duration-300 ${
            recentlyFilled === "baseline" 
              ? "bg-emerald-50 border border-emerald-200" 
              : baseline !== null 
                ? "bg-white border border-neutral-200" 
                : "bg-white border border-dashed border-neutral-300"
          }`}
          animate={recentlyFilled === "baseline" ? { scale: [1, 1.01, 1] } : {}}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#111827]">Baseline</span>
              <span className="text-xs text-neutral-400 px-2 py-0.5 bg-neutral-100 rounded">Before Abridge</span>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="—"
              value={baseline ?? ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                onBaselineChange(val);
                handleCellChange("baseline", val);
              }}
              className="w-24 px-3 py-2 text-sm font-bold text-center border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
              data-testid={`input-${testIdPrefix}-baseline`}
            />
            {baseline !== null && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
              >
                <Check className="w-2.5 h-2.5 text-white" />
              </motion.div>
            )}
          </div>
          <span className="text-xs text-neutral-400 w-12">{unit}</span>
        </motion.div>

        {/* Monthly Entries */}
        <div className="space-y-2">
          {Array.from({ length: months }, (_, i) => {
            const isCurrent = i === months - 1;
            const isFilled = monthlyData[i] !== null;
            const isRecentlyFilled = recentlyFilled === `m${i}`;
            
            return (
              <motion.div 
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                  isRecentlyFilled
                    ? "bg-emerald-50 border border-emerald-200"
                    : isFilled 
                      ? "bg-white border border-neutral-200" 
                      : "bg-white border border-dashed border-neutral-300"
                } ${isCurrent ? "ring-2 ring-[#EA2C00]/20" : ""}`}
                animate={isRecentlyFilled ? { scale: [1, 1.01, 1] } : {}}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isCurrent ? "text-[#EA2C00]" : "text-[#111827]"}`}>
                      Month {i + 1}
                    </span>
                    {isCurrent && (
                      <span className="text-xs text-white px-2 py-0.5 bg-[#EA2C00] rounded font-medium">
                        Current
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="—"
                    value={monthlyData[i] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      onMonthChange(i, val);
                      handleCellChange(`m${i}`, val);
                    }}
                    className={`w-24 px-3 py-2 text-sm font-bold text-center border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent ${
                      isCurrent ? "border-[#EA2C00]" : "border-neutral-200"
                    }`}
                    data-testid={`input-${testIdPrefix}-m${i + 1}`}
                  />
                  {isFilled && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-1 -top-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  )}
                </div>
                <span className="text-xs text-neutral-400 w-12">{unit}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Completion Message */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-emerald-800">Trend data complete!</span>
                <p className="text-xs text-emerald-600">This will appear in your results and PDF report</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Benchmark status helper
type BenchmarkStatus = "below" | "within" | "above";

function getBenchmarkStatus(value: number | null, min: number, max: number): BenchmarkStatus {
  if (value === null) return "below";
  if (value < min) return "below";
  if (value > max) return "above";
  return "within";
}

// Benchmark display
function BenchmarkCard({ 
  text, 
  current, 
  status 
}: { 
  text: string; 
  current: string; 
  status: BenchmarkStatus;
}) {
  const statusConfig = {
    below: {
      label: "Building momentum",
      color: "text-amber-700",
    },
    within: {
      label: "Within expected range",
      color: "text-emerald-700",
    },
    above: {
      label: "Above typical range",
      color: "text-blue-700",
    },
  };
  
  const config = statusConfig[status];
  
  return (
    <div className="flex items-start gap-3 mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
      <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-xs font-semibold text-blue-800 tracking-wider uppercase">BENCHMARK</span>
        <p className="text-sm text-blue-800 mt-1">{text}</p>
        <p className="text-sm text-blue-700 mt-1">
          You're at: <strong>{current}</strong> — 
          <span className={`${config.color} ml-1`}>{config.label}</span>
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
  metricTrendData,
  setMetricTrendData,
  metricEntryModes,
  setMetricEntryModes,
  onNext,
  onBack,
  onBackToJourney,
}: ExpandDataEntryProps) {
  
  // Expanded state for Level of Service detailed entry
  const [losShowDetailed, setLosShowDetailed] = useState(false);
  const [closureShowDetailed, setClosureShowDetailed] = useState(false);

  const months = deploymentData.monthsOnAbridge || 6;

  const setMetricMode = (metric: MetricType, mode: MetricEntryMode) => {
    setMetricEntryModes({ ...metricEntryModes, [metric]: mode });
  };

  const updateMetric = <T extends keyof MetricsData>(
    metricKey: T,
    value: MetricsData[T]
  ) => {
    setMetricsData({ ...metricsData, [metricKey]: value });
  };

  const updateTrendData = (metric: keyof MetricTrendData, field: "baseline" | "monthlyData", value: number | null | (number | null)[]) => {
    setMetricTrendData({
      ...metricTrendData,
      [metric]: {
        ...metricTrendData[metric],
        [field]: value,
      }
    });
  };

  const parsePastedData = (metric: keyof MetricTrendData, pasteText: string) => {
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
      const monthlyData = [...metricTrendData[metric].monthlyData];
      values.slice(1).forEach((val, i) => {
        if (i < monthlyData.length) {
          monthlyData[i] = val;
        }
      });
      
      setMetricTrendData({
        ...metricTrendData,
        [metric]: { baseline, monthlyData }
      } as MetricTrendData);

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

  // Organize metrics by tier for ordering and context
  const TIER_1 = ["wrvuCapture", "levelOfService", "diagnosisCapture"] as MetricType[];
  const TIER_2 = ["timeSavings", "workOutsideWork"] as MetricType[];
  const TIER_3 = ["utilization", "chartClosure", "clinicianSatisfaction"] as MetricType[];
  
  const getMetricTier = (metricId: MetricType): 1 | 2 | 3 => {
    if (TIER_1.includes(metricId)) return 1;
    if (TIER_2.includes(metricId)) return 2;
    return 3;
  };
  
  const getTierConfig = (tier: 1 | 2 | 3) => ({
    1: { label: "Core Financial Value", color: "emerald", description: "The bottom line" },
    2: { label: "Operational Efficiency", color: "blue", description: "Where the hours went" },
    3: { label: "Quality Indicators", color: "amber", description: "The human signals" },
  }[tier]);

  // Determine which metrics are ordered by tier
  const orderedMetrics = useMemo(() => {
    return [
      ...TIER_1.filter(m => selectedMetrics.includes(m)),
      ...TIER_2.filter(m => selectedMetrics.includes(m)),
      ...TIER_3.filter(m => selectedMetrics.includes(m)),
    ];
  }, [selectedMetrics]);
  
  // Calculate completion status
  const completedMetrics = orderedMetrics.filter(metricId => {
    const data = metricsData[metricId];
    if (metricId === "levelOfService") {
      const losData = data as typeof metricsData.levelOfService;
      return losData.averageBefore !== null && losData.averageAfter !== null;
    }
    if (metricId === "chartClosure") {
      const closureData = data as typeof metricsData.chartClosure;
      return closureData.sameDayBefore !== null && closureData.sameDayAfter !== null;
    }
    const simpleData = data as { before: number | null; after: number | null };
    return simpleData.before !== null && simpleData.after !== null;
  });
  
  // Guard against division by zero
  const progressPercent = orderedMetrics.length > 0 
    ? Math.round((completedMetrics.length / orderedMetrics.length) * 100) 
    : 0;

  // Calculate live value preview
  const valuePreview = useMemo(() => {
    const encounters = deploymentData.annualEncounters && deploymentData.utilizationRate
      ? Math.round(deploymentData.annualEncounters * (deploymentData.utilizationRate / 100))
      : 0;
    
    let totalValue = 0;
    const breakdown: { label: string; value: number; icon: string }[] = [];
    
    // wRVU Value (Tier 1)
    const wrvuData = metricsData.wrvuCapture;
    if (wrvuData.before !== null && wrvuData.after !== null && wrvuData.after > wrvuData.before) {
      const lift = wrvuData.after - wrvuData.before;
      const wrvuValue = Math.round(lift * encounters * EXPAND_ROI_DEFAULTS.dollarPerWRVU * EXPAND_ROI_DEFAULTS.wrvuAttribution);
      if (wrvuValue > 0) {
        totalValue += wrvuValue;
        breakdown.push({ label: "wRVU Capture", value: wrvuValue, icon: "dollar" });
      }
    }
    
    // Time Savings (show hours, not dollars yet - that's in Value Config)
    const timeData = metricsData.timeSavings;
    let hoursSaved = 0;
    if (timeData.before !== null && timeData.after !== null && timeData.before > timeData.after) {
      const minsSaved = timeData.before - timeData.after;
      hoursSaved = Math.round((minsSaved * encounters) / 60);
    }
    
    return {
      totalValue,
      breakdown,
      hoursSaved,
      hasAnyValue: totalValue > 0 || hoursSaved > 0,
      isComplete: completedMetrics.length === orderedMetrics.length && orderedMetrics.length > 0,
    };
  }, [metricsData, deploymentData, completedMetrics.length, orderedMetrics.length]);

  // Render a metric section
  const renderMetricSection = (metricId: MetricType) => {
    const config = METRIC_CONFIG[metricId];
    const Icon = config.icon;
    const mode = metricEntryModes[metricId];

    // Special handling for Level of Service
    if (metricId === "levelOfService") {
      const losData = metricsData.levelOfService;
      const avgBefore = losData.averageBefore;
      const avgAfter = losData.averageAfter;
      const change = avgBefore !== null && avgAfter !== null ? avgAfter - avgBefore : null;
      const hasData = change !== null && change > 0;

      return (
        <section key={metricId} className="mb-8 p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#111827]">
                Average <TermTooltip {...TERMS.emLevel} />
              </h2>
              <p className="text-sm text-[#6B7280]">{config.description}</p>
            </div>
          </div>

          <ModeToggle mode={mode} onChange={(m) => setMetricMode(metricId, m)} metricId={metricId} />

          {mode === "quick" ? (
            <div>
              <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <Info className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-800">
                  This is your weighted average <TermTooltip {...TERMS.emLevel} /> (usually in billing reports as "Average Level of Service")
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
                benchmarkWhisper="Typical average: 3.0-4.5 across specialties"
                benchmarkMin={0.2}
                benchmarkMax={0.5}
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

              <AnimatePresence>
                {losShowDetailed && (
                  <motion.div 
                    className="mt-4 p-4 bg-neutral-50 rounded-xl overflow-hidden"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <p className="text-xs text-[#6B7280] mb-3">Enter % of encounters at each level (should sum to 100%)</p>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <span className="text-xs font-semibold text-[#6B7280]">Level</span>
                      <span className="text-xs font-semibold text-[#6B7280] text-center">Before %</span>
                      <span className="text-xs font-semibold text-[#6B7280] text-center">After %</span>
                      
                      {LEVEL_OF_SERVICE.map(level => (
                        <Fragment key={level.id}>
                          <span className="text-sm text-[#111827]">{level.label}</span>
                          <EditableNumberInput
                            step="1"
                            value={losData.before[level.id] || 0}
                            onChange={(val) => updateMetric("levelOfService", {
                              ...losData,
                              before: { ...losData.before, [level.id]: val },
                              averageBefore: calculateLosAverage({ ...losData.before, [level.id]: val }),
                            })}
                            className="px-2 py-1 text-sm text-center border border-neutral-200 rounded bg-white"
                            data-testid={`input-los-${level.id}-before`}
                          />
                          <EditableNumberInput
                            step="1"
                            value={losData.after[level.id] || 0}
                            onChange={(val) => updateMetric("levelOfService", {
                              ...losData,
                              after: { ...losData.after, [level.id]: val },
                              averageAfter: calculateLosAverage({ ...losData.after, [level.id]: val }),
                            })}
                            className="px-2 py-1 text-sm text-center border border-neutral-200 rounded bg-white"
                            data-testid={`input-los-${level.id}-after`}
                          />
                        </Fragment>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {hasData && (
                <BenchmarkCard
                  text={config.benchmarkText}
                  current={`+${change?.toFixed(2)} levels`}
                  status={getBenchmarkStatus(change, config.benchmarkMin, config.benchmarkMax)}
                />
              )}
            </div>
          ) : (
            <TrendEntry
              baseline={metricTrendData.levelOfService.baseline}
              monthlyData={metricTrendData.levelOfService.monthlyData}
              months={months}
              onBaselineChange={(val) => {
                updateTrendData("levelOfService", "baseline", val);
                updateMetric("levelOfService", { ...losData, averageBefore: val });
              }}
              onMonthChange={(i, val) => {
                const newData = [...metricTrendData.levelOfService.monthlyData];
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
        <section key={metricId} className="mb-8 p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
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
                benchmarkWhisper="Typical: 40-95% same-day closure"
                benchmarkMin={5}
                benchmarkMax={15}
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

              <AnimatePresence>
                {closureShowDetailed && (
                  <motion.div 
                    className="mt-4 p-4 bg-neutral-50 rounded-xl overflow-hidden"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
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
                        <Fragment key={bucket.id}>
                          <span className="text-sm text-[#111827]">{bucket.label}</span>
                          <EditableNumberInput
                            step="1"
                            value={closureData.before[bucket.id as keyof typeof closureData.before] || 0}
                            onChange={(val) => updateMetric("chartClosure", {
                              ...closureData,
                              before: { ...closureData.before, [bucket.id]: val },
                            })}
                            className="px-2 py-1 text-sm text-center border border-neutral-200 rounded bg-white"
                          />
                          <EditableNumberInput
                            step="1"
                            value={closureData.after[bucket.id as keyof typeof closureData.after] || 0}
                            onChange={(val) => updateMetric("chartClosure", {
                              ...closureData,
                              after: { ...closureData.after, [bucket.id]: val },
                            })}
                            className="px-2 py-1 text-sm text-center border border-neutral-200 rounded bg-white"
                          />
                        </Fragment>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {hasData && (
                <BenchmarkCard
                  text={config.benchmarkText}
                  current={`+${change}pp same-day closure`}
                  status={getBenchmarkStatus(change, config.benchmarkMin, config.benchmarkMax)}
                />
              )}
            </div>
          ) : (
            <TrendEntry
              baseline={metricTrendData.chartClosure.baseline}
              monthlyData={metricTrendData.chartClosure.monthlyData}
              months={months}
              onBaselineChange={(val) => {
                updateTrendData("chartClosure", "baseline", val);
                updateMetric("chartClosure", { ...closureData, sameDayBefore: val });
              }}
              onMonthChange={(i, val) => {
                const newData = [...metricTrendData.chartClosure.monthlyData];
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
      <section key={metricId} className="mb-8 p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111827]">
              {'tooltipKey' in config && config.tooltipKey === "wRVU" ? (
                <><TermTooltip {...TERMS.wRVU} /> per Encounter</>
              ) : 'tooltipKey' in config && config.tooltipKey === "pajamaTime" ? (
                <>Work Outside Work (<TermTooltip {...TERMS.pajamaTime} />)</>
              ) : config.name}
            </h2>
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
              benchmarkWhisper={config.benchmarkWhisper}
              benchmarkMin={config.benchmarkMin}
              benchmarkMax={config.benchmarkMax}
            />

            {hasData && (
              <BenchmarkCard
                text={config.benchmarkText}
                current={`${percentChange}% ${config.isPositiveGood ? "lift" : "reduction"}`}
                status={getBenchmarkStatus(percentChange, config.benchmarkMin, config.benchmarkMax)}
              />
            )}
          </div>
        ) : (
          <TrendEntry
            baseline={metricTrendData[metricId].baseline}
            monthlyData={metricTrendData[metricId].monthlyData}
            months={months}
            onBaselineChange={(val) => {
              updateTrendData(metricId, "baseline", val);
              updateMetric(metricId, { ...metricData, before: val });
            }}
            onMonthChange={(i, val) => {
              const newData = [...metricTrendData[metricId].monthlyData];
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
        currentStep={2}
        totalSteps={5}
        stepName="Your Numbers"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-3xl mx-auto px-6 py-6 md:py-8 pb-10">
        {/* Soul Hero */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Your Numbers, Your Story
          </h1>
          <p className="text-[#6B7280] mb-4">
            Each metric you enter becomes part of your value narrative. We'll show you what it means as you go.
          </p>
          
          {/* Progress Bar */}
          <div className="p-4 bg-white border border-neutral-200 rounded-xl" data-testid="progress-container">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[#111827]" data-testid="text-progress-count">
                  {completedMetrics.length} of {orderedMetrics.length} metrics documented
                </span>
                {completedMetrics.length === orderedMetrics.length && orderedMetrics.length > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold" data-testid="badge-complete">
                    <Check className="w-3 h-3" />
                    Complete
                  </span>
                )}
              </div>
              <span className="text-sm text-[#6B7280]" data-testid="text-deployment-info">
                {deploymentData.providers} providers · {months} months
              </span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden" data-testid="progress-bar-track">
              <motion.div 
                className={`h-full rounded-full ${completedMetrics.length === orderedMetrics.length && orderedMetrics.length > 0 ? "bg-emerald-500" : "bg-[#EA2C00]"}`}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                data-testid="progress-bar-fill"
              />
            </div>
          </div>
        </div>

        {/* Metric Sections with Tier Headers */}
        {orderedMetrics.map((metricId, index) => {
          const tier = getMetricTier(metricId);
          const tierConfig = getTierConfig(tier);
          const prevTier = index > 0 ? getMetricTier(orderedMetrics[index - 1]) : 0;
          const showTierHeader = tier !== prevTier;
          
          return (
            <Fragment key={metricId}>
              {showTierHeader && tierConfig && (
                <div className={`flex items-center gap-2 mb-4 mt-8 first:mt-0`} data-testid={`tier-header-${tier}`}>
                  <div className={`w-2 h-2 rounded-full ${
                    tier === 1 ? "bg-emerald-500" : tier === 2 ? "bg-blue-500" : "bg-amber-500"
                  }`} />
                  <span className={`text-sm font-semibold ${
                    tier === 1 ? "text-emerald-700" : tier === 2 ? "text-blue-700" : "text-amber-700"
                  }`} data-testid={`text-tier-label-${tier}`}>
                    {tierConfig.label}
                  </span>
                  <span className={`text-xs ${
                    tier === 1 ? "text-emerald-600" : tier === 2 ? "text-blue-600" : "text-amber-600"
                  }`} data-testid={`text-tier-description-${tier}`}>
                    {tierConfig.description}
                  </span>
                </div>
              )}
              {renderMetricSection(metricId)}
            </Fragment>
          );
        })}

        {/* Value Preview - Live Value So Far */}
        {valuePreview.hasAnyValue && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl text-white"
            data-testid="value-preview-card"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-xs font-medium tracking-wide uppercase">Value Taking Shape</span>
            </div>
            
            <div className="flex flex-wrap items-baseline gap-4 mb-3">
              {valuePreview.totalValue > 0 && (
                <div>
                  <span className="text-2xl md:text-3xl font-bold text-emerald-400" data-testid="text-value-total">
                    ${valuePreview.totalValue.toLocaleString()}
                  </span>
                  <span className="text-slate-400 text-sm ml-2">annual value (so far)</span>
                </div>
              )}
              {valuePreview.hoursSaved > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-lg font-semibold text-blue-400" data-testid="text-hours-saved">
                    {valuePreview.hoursSaved.toLocaleString()} hours
                  </span>
                  <span className="text-slate-400 text-sm">saved annually</span>
                </div>
              )}
            </div>
            
            <p className="text-slate-400 text-sm">
              {valuePreview.isComplete 
                ? "All metrics documented. Ready to see your full impact?"
                : "Keep going — your story is taking shape. We'll show you the full picture next."}
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex justify-end mt-8">
          <Button
            onClick={onNext}
            className="gap-2"
            data-testid="button-next"
          >
            {valuePreview.hasAnyValue ? "See Your Impact" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
