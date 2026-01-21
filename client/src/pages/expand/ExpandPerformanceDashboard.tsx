import { useMemo } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, FileText, DollarSign, BarChart3, TrendingDown, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type DeploymentData, type MetricType, type MetricsData } from "./ExpandFlow";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";

interface ExpandPerformanceDashboardProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  setMetricsData: (data: MetricsData) => void;
  onNext: () => void;
  onBack: () => void;
}

// Helper to generate simulated distribution data
function generateDistribution(median: number, variance: number) {
  const points = [];
  for (let i = 0; i <= 20; i++) {
    const x = median * (0.2 + (i / 20) * 1.6);
    const y = Math.exp(-Math.pow(x - median, 2) / (2 * Math.pow(median * variance, 2)));
    points.push({ x: parseFloat(x.toFixed(1)), y: y * 100 });
  }
  return points;
}

// Bell Curve Chart Component
function BellCurveChart({ 
  data, 
  median, 
  unit, 
  segments 
}: { 
  data: { x: number; y: number }[]; 
  median: number; 
  unit: string; 
  segments: { label: string; percent: number; range: string }[];
}) {
  return (
    <div>
      {/* Chart */}
      <div className="h-48 mb-4 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <defs>
              <linearGradient id="bellGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            
            <XAxis
              dataKey="x"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#6B7280", fontSize: 11 }}
              tickFormatter={(v) => `${v}${unit}`}
            />
            
            <YAxis hide />
            
            <Area
              type="monotone"
              dataKey="y"
              stroke="#059669"
              strokeWidth={2}
              fill="url(#bellGradient)"
            />
            
            <ReferenceLine
              x={parseFloat(median.toFixed(1))}
              stroke="#1e293b"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      {/* Median Label */}
      <div className="text-center mb-4">
        <span className="text-xs text-[#6B7280] uppercase tracking-wide">MEDIAN</span>
        <div className="font-mono font-bold text-lg text-[#111827]">{median} {unit}</div>
      </div>
      
      {/* Segments */}
      <div className="flex gap-4">
        {segments.map((segment, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="font-mono font-bold text-lg text-[#111827]">{segment.percent}%</div>
            <div className="text-xs text-[#6B7280] mb-2">{segment.label}</div>
            <div 
              className={`h-2 rounded-full mx-auto ${
                segment.range === 'low' ? 'bg-neutral-300' :
                segment.range === 'mid' ? 'bg-emerald-400' :
                'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(segment.percent, 100)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Level of Service Chart Component
function LevelOfServiceChart({ 
  before, 
  after, 
  shifts 
}: { 
  before: { [key: string]: number }; 
  after: { [key: string]: number }; 
  shifts: { [key: string]: number };
}) {
  const levels = ["99215", "99214", "99213", "99212", "99211"];
  
  return (
    <div className="bg-neutral-50 rounded-xl p-6">
      {/* Headers */}
      <div className="grid grid-cols-[60px_1fr_1fr_80px] gap-4 mb-4">
        <div />
        <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Before</div>
        <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">After</div>
        <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide text-center">Change</div>
      </div>
      
      {/* Rows */}
      {levels.map((level) => {
        const beforeVal = before[level] || 0;
        const afterVal = after[level] || 0;
        const shift = shifts[level] || 0;
        const isPositive = shift > 0;
        const isNegative = shift < 0;
        
        return (
          <div key={level} className="grid grid-cols-[60px_1fr_1fr_80px] gap-4 items-center py-2 border-b border-neutral-200 last:border-0">
            <div className="font-mono font-semibold text-sm text-[#111827]">{level}</div>
            
            <div className="flex items-center gap-2">
              <div 
                className="h-6 bg-neutral-400 rounded"
                style={{ width: `${Math.min(beforeVal * 2, 100)}%` }}
              />
              <span className="text-sm text-[#6B7280] font-mono">{beforeVal}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div 
                className="h-6 bg-emerald-500 rounded"
                style={{ width: `${Math.min(afterVal * 2, 100)}%` }}
              />
              <span className="text-sm text-[#6B7280] font-mono">{afterVal}%</span>
            </div>
            
            <div className={`text-center font-semibold text-sm ${
              isPositive ? 'text-emerald-600' : isNegative ? 'text-[#E85D3F]' : 'text-[#6B7280]'
            }`}>
              {isPositive && "↑"}
              {isNegative && "↓"}
              {shift !== 0 ? `${Math.abs(shift)}pp` : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Trend Chart Component
function TrendChart({ data }: { data: { month: string; value: number }[] }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12 }}
            tickFormatter={(v) => `${v}h`}
          />
          <Tooltip
            formatter={(value: number) => [`${value} hours`, "Time to close"]}
            contentStyle={{
              background: "#1e293b",
              border: "none",
              borderRadius: "8px",
              color: "white",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#059669"
            strokeWidth={3}
            dot={{ fill: "#059669", strokeWidth: 0, r: 5 }}
            activeDot={{ r: 7, fill: "#059669" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ExpandPerformanceDashboard({
  deploymentData,
  selectedMetrics,
  metricsData,
  setMetricsData,
  onNext,
  onBack,
}: ExpandPerformanceDashboardProps) {
  const abridgeEncounters = Math.round(
    deploymentData.annualEncounters * (deploymentData.utilizationRate / 100)
  );

  // Time Savings Calculations
  const timeSavingsCalc = useMemo(() => {
    if (!selectedMetrics.includes("timeSavings")) return null;
    const { before, after } = metricsData.timeSavings;
    const savings = before - after;
    const totalHours = (savings * abridgeEncounters) / 60;
    return {
      before,
      after,
      savings,
      percentReduction: Math.round((savings / before) * 100),
      totalHours: Math.round(totalHours),
      distribution: generateDistribution(savings, 0.3),
      percentBenefiting: 92,
    };
  }, [metricsData.timeSavings, abridgeEncounters, selectedMetrics]);

  // wRVU Calculations
  const wrvuCalc = useMemo(() => {
    if (!selectedMetrics.includes("wrvuCapture")) return null;
    const { before, after } = metricsData.wrvuCapture;
    const lift = after - before;
    const liftPercent = (lift / before) * 100;
    const totalWrvuGain = lift * abridgeEncounters;
    return {
      before,
      after,
      lift,
      liftPercent: liftPercent.toFixed(1),
      totalWrvuGain: Math.round(totalWrvuGain),
      distribution: generateDistribution(liftPercent, 0.4),
      percentBenefiting: 85,
    };
  }, [metricsData.wrvuCapture, abridgeEncounters, selectedMetrics]);

  // Chart Closure Calculations
  const chartClosureCalc = useMemo(() => {
    if (!selectedMetrics.includes("chartClosure")) return null;
    const { before, after } = metricsData.chartClosure;
    const reduction = before - after;
    const percentFaster = Math.round((reduction / before) * 100);
    return {
      before,
      after,
      reduction,
      percentFaster,
      trend: [
        { month: "M1", value: before },
        { month: "M2", value: Math.round(before * 0.6) },
        { month: "M3", value: Math.round(before * 0.35) },
        { month: "M4", value: Math.round(before * 0.2) },
        { month: "M5", value: Math.round(after * 1.2) },
        { month: "M6", value: after },
      ],
    };
  }, [metricsData.chartClosure, selectedMetrics]);

  // Level of Service Calculations
  const losCalc = useMemo(() => {
    if (!selectedMetrics.includes("levelOfService")) return null;
    const { before, after } = metricsData.levelOfService;
    const shifts: { [key: string]: number } = {};
    Object.keys(before).forEach((level) => {
      shifts[level] = after[level] - before[level];
    });
    return { before, after, shifts };
  }, [metricsData.levelOfService, selectedMetrics]);

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-sm text-[#6B7280]">Step 2 of 4 · Your Performance</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[#111827] mb-2">Your Performance</h1>
          <p className="text-[#6B7280]">
            {deploymentData.providers} providers · {deploymentData.monthsOnAbridge} months on Abridge
          </p>
        </div>

        {/* Time Savings Section */}
        {timeSavingsCalc && (
          <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
                Time Savings
              </h2>
            </div>

            {/* Before/After Card */}
            <div className="flex items-center gap-6 bg-neutral-50 rounded-xl p-6 mb-6">
              <div className="flex-1">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Before</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={metricsData.timeSavings.before}
                    onChange={(e) =>
                      setMetricsData({
                        ...metricsData,
                        timeSavings: { ...metricsData.timeSavings, before: Number(e.target.value) },
                      })
                    }
                    className="w-20 px-3 py-2 rounded-lg border border-neutral-200 font-mono text-xl font-bold text-center"
                    data-testid="input-time-before"
                  />
                  <span className="text-sm text-[#6B7280]">min in notes</span>
                </div>
              </div>

              <div className="text-2xl text-neutral-300">→</div>

              <div className="flex-1">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">After</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={metricsData.timeSavings.after}
                    onChange={(e) =>
                      setMetricsData({
                        ...metricsData,
                        timeSavings: { ...metricsData.timeSavings, after: Number(e.target.value) },
                      })
                    }
                    className="w-20 px-3 py-2 rounded-lg border border-neutral-200 font-mono text-xl font-bold text-center"
                    data-testid="input-time-after"
                  />
                  <span className="text-sm text-[#6B7280]">min in notes</span>
                </div>
              </div>

              <div className="text-2xl text-neutral-300">=</div>

              <div className="flex-1">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Change</div>
                <div className="bg-emerald-100 rounded-lg p-3">
                  <div className="font-mono font-bold text-xl text-emerald-700">
                    -{timeSavingsCalc.savings} min/enc
                  </div>
                  <div className="text-sm text-emerald-600">
                    {timeSavingsCalc.percentReduction}% reduction
                  </div>
                </div>
              </div>
            </div>

            {/* Distribution */}
            <div className="border border-neutral-200 rounded-xl p-6 mb-6">
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                Provider Distribution
              </h3>
              <p className="text-sm text-[#6B7280] mb-6">
                How are savings distributed across your providers?
              </p>
              
              <BellCurveChart
                data={timeSavingsCalc.distribution}
                median={timeSavingsCalc.savings}
                unit="min"
                segments={[
                  { label: "< 3 min", percent: 8, range: "low" },
                  { label: "3-10 min", percent: 72, range: "mid" },
                  { label: "> 10 min", percent: 20, range: "high" },
                ]}
              />

              <div className="flex items-center gap-3 mt-6 p-4 bg-emerald-50 rounded-lg">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">
                  {timeSavingsCalc.percentBenefiting}% of providers are saving meaningful time
                </span>
              </div>
            </div>

            {/* Benchmark */}
            <div className="flex gap-4 p-5 bg-slate-100 rounded-xl">
              <BarChart3 className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                  Benchmark
                </div>
                <p className="text-sm text-slate-600">
                  Average time savings across Abridge customers: <strong>5-8 min/encounter</strong>
                </p>
                <p className="text-sm text-slate-600">
                  You're at: <strong>{timeSavingsCalc.savings} min</strong> — Above average ✓
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Level of Service Section */}
        {losCalc && (
          <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
                Level of Service
              </h2>
            </div>

            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">
              E/M Distribution Shift
            </h3>

            <LevelOfServiceChart
              before={losCalc.before}
              after={losCalc.after}
              shifts={losCalc.shifts}
            />

            <div className="flex gap-4 mt-6 p-5 bg-blue-50 rounded-xl">
              <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <strong className="text-blue-800">
                  +{losCalc.shifts["99215"]} percentage point shift to Level 5
                </strong>
                <p className="text-sm text-blue-700 mt-1">
                  This suggests more complete documentation of complex visits. Not upcoding — capturing work already being done.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Chart Closure Time Section */}
        {chartClosureCalc && (
          <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
                Chart Closure Time
              </h2>
            </div>

            {/* Before/After Card */}
            <div className="flex items-center gap-6 bg-neutral-50 rounded-xl p-6 mb-6">
              <div className="flex-1">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Before</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={metricsData.chartClosure.before}
                    onChange={(e) =>
                      setMetricsData({
                        ...metricsData,
                        chartClosure: { ...metricsData.chartClosure, before: Number(e.target.value) },
                      })
                    }
                    className="w-20 px-3 py-2 rounded-lg border border-neutral-200 font-mono text-xl font-bold text-center"
                  />
                  <span className="text-sm text-[#6B7280]">hours to close</span>
                </div>
              </div>

              <div className="text-2xl text-neutral-300">→</div>

              <div className="flex-1">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">After</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={metricsData.chartClosure.after}
                    onChange={(e) =>
                      setMetricsData({
                        ...metricsData,
                        chartClosure: { ...metricsData.chartClosure, after: Number(e.target.value) },
                      })
                    }
                    className="w-20 px-3 py-2 rounded-lg border border-neutral-200 font-mono text-xl font-bold text-center"
                  />
                  <span className="text-sm text-[#6B7280]">hours to close</span>
                </div>
              </div>

              <div className="text-2xl text-neutral-300">=</div>

              <div className="flex-1">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Change</div>
                <div className="bg-emerald-100 rounded-lg p-3">
                  <div className="font-mono font-bold text-xl text-emerald-700">
                    {chartClosureCalc.percentFaster}% faster
                  </div>
                  <div className="text-sm text-emerald-600">
                    -{chartClosureCalc.reduction.toFixed(1)} hours
                  </div>
                </div>
              </div>
            </div>

            {/* Trend */}
            <div className="border border-neutral-200 rounded-xl p-6">
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">
                Trend Over Time
              </h3>
              
              <TrendChart data={chartClosureCalc.trend} />

              <div className="flex gap-4 mt-6 p-4 bg-purple-50 rounded-lg">
                <Lightbulb className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <span className="text-sm text-purple-800">
                  Claims submitted faster = improved cash flow
                </span>
              </div>
            </div>
          </section>
        )}

        {/* wRVU Capture Section */}
        {wrvuCalc && (
          <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-sm font-semibold text-[#111827] uppercase tracking-wide">
                wRVU Capture
              </h2>
            </div>

            {/* Before/After Card */}
            <div className="flex items-center gap-6 bg-neutral-50 rounded-xl p-6 mb-6">
              <div className="flex-1">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Before</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={metricsData.wrvuCapture.before}
                    onChange={(e) =>
                      setMetricsData({
                        ...metricsData,
                        wrvuCapture: { ...metricsData.wrvuCapture, before: Number(e.target.value) },
                      })
                    }
                    className="w-20 px-3 py-2 rounded-lg border border-neutral-200 font-mono text-xl font-bold text-center"
                    data-testid="input-wrvu-before"
                  />
                  <span className="text-sm text-[#6B7280]">wRVU/enc</span>
                </div>
              </div>

              <div className="text-2xl text-neutral-300">→</div>

              <div className="flex-1">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">After</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={metricsData.wrvuCapture.after}
                    onChange={(e) =>
                      setMetricsData({
                        ...metricsData,
                        wrvuCapture: { ...metricsData.wrvuCapture, after: Number(e.target.value) },
                      })
                    }
                    className="w-20 px-3 py-2 rounded-lg border border-neutral-200 font-mono text-xl font-bold text-center"
                    data-testid="input-wrvu-after"
                  />
                  <span className="text-sm text-[#6B7280]">wRVU/enc</span>
                </div>
              </div>

              <div className="text-2xl text-neutral-300">=</div>

              <div className="flex-1">
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Change</div>
                <div className="bg-emerald-100 rounded-lg p-3">
                  <div className="font-mono font-bold text-xl text-emerald-700">
                    +{wrvuCalc.liftPercent}% lift
                  </div>
                  <div className="text-sm text-emerald-600">
                    +{wrvuCalc.lift.toFixed(2)} wRVU/enc
                  </div>
                </div>
              </div>
            </div>

            {/* Distribution */}
            <div className="border border-neutral-200 rounded-xl p-6 mb-6">
              <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">
                Provider Distribution
              </h3>
              
              <BellCurveChart
                data={wrvuCalc.distribution}
                median={parseFloat(wrvuCalc.liftPercent)}
                unit="%"
                segments={[
                  { label: "< 2% lift", percent: 15, range: "low" },
                  { label: "2-7% lift", percent: 65, range: "mid" },
                  { label: "> 7% lift", percent: 20, range: "high" },
                ]}
              />

              <div className="flex items-center gap-3 mt-6 p-4 bg-emerald-50 rounded-lg">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-800">
                  {wrvuCalc.percentBenefiting}% of providers seeing meaningful wRVU improvement
                </span>
              </div>
            </div>

            {/* Benchmark */}
            <div className="flex gap-4 p-5 bg-slate-100 rounded-xl">
              <BarChart3 className="w-5 h-5 text-slate-500 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                  Benchmark
                </div>
                <p className="text-sm text-slate-600">
                  Average wRVU lift across Abridge customers: <strong>3-6%</strong>
                </p>
                <p className="text-sm text-slate-600">
                  You're at: <strong>{wrvuCalc.liftPercent}%</strong> — On track ✓
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={onNext}
            className="gap-2"
            data-testid="button-next"
          >
            See Your ROI
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
