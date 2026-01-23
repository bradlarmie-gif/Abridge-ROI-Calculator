import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Moon, FileText, DollarSign, FileCheck, Smile, CheckCircle, TrendingUp, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, Area, ComposedChart } from "recharts";
import type { DeploymentData, MetricType, MetricsData, TimelineData } from "./ExpandFlow";

interface ExpandPerformanceDashboardProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  timelineData: TimelineData;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

// Format currency
const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

// Mini sparkline for metric cards
function MiniSparkline({ data, isPositiveGood = false }: { data: (number | null)[]; isPositiveGood?: boolean }) {
  const validData = data.filter((d): d is number => d !== null);
  if (validData.length < 2) return null;
  
  const min = Math.min(...validData);
  const max = Math.max(...validData);
  const range = max - min || 1;
  
  const width = 80;
  const height = 24;
  const padding = 3;
  
  const points = validData.map((value, i) => {
    const x = padding + (i / (validData.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");
  
  const trend = validData[validData.length - 1] - validData[0];
  const isGood = isPositiveGood ? trend > 0 : trend < 0;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isGood ? "#10B981" : "#EF4444"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ExpandPerformanceDashboard({
  deploymentData,
  selectedMetrics,
  metricsData,
  timelineData,
  onNext,
  onBack,
  onBackToJourney,
}: ExpandPerformanceDashboardProps) {
  
  const isDetailedMode = deploymentData.dataEntryMode === "detailed";
  const months = deploymentData.monthsOnAbridge || 6;
  
  const abridgeEncounters = useMemo(() => {
    if (deploymentData.annualEncounters && deploymentData.utilizationRate) {
      return Math.round(deploymentData.annualEncounters * (deploymentData.utilizationRate / 100));
    }
    return 0;
  }, [deploymentData]);

  // Calculate metrics
  const timeSavings = metricsData.timeSavings;
  const timeSavingsChange = timeSavings.before && timeSavings.after 
    ? timeSavings.before - timeSavings.after 
    : null;
  const timeSavingsPercent = timeSavingsChange && timeSavings.before
    ? Math.round((timeSavingsChange / timeSavings.before) * 100)
    : null;

  const workOutside = metricsData.workOutsideWork;
  const workOutsideChange = workOutside.before && workOutside.after
    ? workOutside.before - workOutside.after
    : null;

  const losData = metricsData.levelOfService;
  const losShift = (losData.after["level5"] || 0) - (losData.before["level5"] || 0);

  const wrvuData = metricsData.wrvuCapture;
  const wrvuChange = wrvuData.before && wrvuData.after
    ? (((wrvuData.after - wrvuData.before) / wrvuData.before) * 100)
    : null;

  const closureData = metricsData.chartClosure;
  const sameDayImprovement = closureData.after.within24 - closureData.before.within24;

  const satData = metricsData.clinicianSatisfaction;
  const satChange = satData.before && satData.after ? satData.after - satData.before : null;

  // Calculate total value realized based on metrics
  const calculateValueRealized = useMemo(() => {
    let totalValue = 0;
    const providers = deploymentData.providers || 100;
    const encounters = abridgeEncounters || 100000;
    
    // Time savings: 4 min saved × $75/hr × encounters
    if (timeSavingsChange && timeSavingsChange > 0) {
      const hourlyRate = 75;
      const hoursSaved = (timeSavingsChange / 60) * encounters;
      totalValue += hoursSaved * hourlyRate;
    }
    
    // Work outside work: reduced hours × provider salary impact
    if (workOutsideChange && workOutsideChange > 0) {
      const weeklyValue = workOutsideChange * 100; // $100/hr
      totalValue += weeklyValue * 48 * providers; // 48 work weeks
    }
    
    // wRVU lift
    if (wrvuChange && wrvuChange > 0) {
      const avgWrvuValue = 50;
      const baseWrvu = 2.0;
      const additionalWrvu = baseWrvu * (wrvuChange / 100);
      totalValue += additionalWrvu * encounters * avgWrvuValue;
    }
    
    // Scale to partial year
    const yearFraction = months / 12;
    return Math.round(totalValue * yearFraction);
  }, [timeSavingsChange, workOutsideChange, wrvuChange, months, abridgeEncounters, deploymentData.providers]);
  
  // Full scale projection (100% utilization)
  const fullScaleValue = useMemo(() => {
    const utilRate = deploymentData.utilizationRate || 70;
    if (utilRate === 0) return calculateValueRealized;
    return Math.round((calculateValueRealized / (months / 12)) * (100 / utilRate));
  }, [calculateValueRealized, months, deploymentData.utilizationRate]);

  // Journey graph data
  const journeyData = useMemo(() => {
    const annualValue = calculateValueRealized / (months / 12);
    const data = [
      { time: "Before", label: "Baseline", value: 0, isActual: true, month: 0 },
    ];
    
    // Add intermediate points based on months
    if (months > 3) {
      data.push({ time: "Mo 3", label: "3 mo", value: Math.round(annualValue * 0.25), isActual: true, month: 3 });
    }
    if (months > 6) {
      data.push({ time: "Mo 6", label: "6 mo", value: Math.round(annualValue * 0.5), isActual: true, month: 6 });
    }
    
    // Today point
    data.push({ 
      time: `Mo ${months}`, 
      label: "Today", 
      value: calculateValueRealized, 
      isActual: true, 
      isToday: true,
      month: months 
    });
    
    // Projected points
    if (months < 12) {
      data.push({ time: "Mo 12", label: "12 mo", value: Math.round(annualValue * 1.1), isActual: false, month: 12 });
    }
    if (months < 24) {
      data.push({ time: "Mo 24", label: "24 mo", value: Math.round(annualValue * 2.2), isActual: false, month: 24 });
    }
    data.push({ 
      time: "Full Scale", 
      label: "Full Scale", 
      value: fullScaleValue, 
      isActual: false, 
      isFullScale: true,
      month: 36 
    });
    
    return data;
  }, [calculateValueRealized, fullScaleValue, months]);

  const metricsWithData = selectedMetrics.filter((m) => {
    switch (m) {
      case "timeSavings": return timeSavingsChange !== null;
      case "workOutsideWork": return workOutsideChange !== null;
      case "levelOfService": return losShift !== 0;
      case "wrvuCapture": return wrvuChange !== null;
      case "chartClosure": return sameDayImprovement !== 0;
      case "clinicianSatisfaction": return satChange !== null;
      default: return false;
    }
  });

  // Get timeline data for sparklines
  const getTimelineValues = (metricKey: keyof TimelineData): (number | null)[] => {
    const timeline = timelineData[metricKey] || [];
    return timeline.map(p => p.value);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <GlobalHeader pageName="Your Journey" currentStep={3} totalSteps={5} onLogoClick={onBackToJourney} />

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

      <main className="max-w-5xl mx-auto px-6 pb-10">
        {/* Journey Overview Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Your Abridge Journey
          </h1>
          <p className="text-[#6B7280]">
            {deploymentData.providers} providers · {months} months on Abridge · {deploymentData.utilizationRate}% utilization
          </p>
        </div>

        {/* Three-Phase Journey Overview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Before Phase */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase block mb-2">
              BEFORE ABRIDGE
            </span>
            <span className="text-2xl font-bold text-slate-400 block">Baseline</span>
            <span className="text-xs text-slate-400 mt-1 block">Your starting point</span>
          </div>

          {/* Today Phase - Highlighted with Value Realized */}
          <div className="bg-white border-2 border-[#EA2C00] rounded-xl p-5 relative shadow-sm">
            <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-[#EA2C00] text-white text-[10px] font-semibold rounded">
              YOU ARE HERE
            </div>
            <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase block mb-2 mt-1">
              TODAY
            </span>
            <span className="text-2xl font-bold text-emerald-600 block" data-testid="text-today-value">
              +{formatCurrency(calculateValueRealized)}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">{months} months · Proven ROI</span>
          </div>

          {/* Full Scale Phase */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <span className="text-[10px] font-semibold text-blue-700 tracking-wider uppercase block mb-2">
              FULL SCALE
            </span>
            <span className="text-2xl font-bold text-blue-600 block" data-testid="text-full-scale">
              {formatCurrency(fullScaleValue)}
            </span>
            <span className="text-xs text-blue-600 mt-1 block">If you expand</span>
          </div>
        </div>

        {/* Journey Graph */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#111827]">Your Value Journey</h3>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-emerald-500"></div>
                <span className="text-slate-500">Actual results</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 border-t-2 border-dashed border-emerald-400"></div>
                <span className="text-slate-500">Projected growth</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={journeyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), "Value"]}
                  labelStyle={{ color: '#111827', fontWeight: 600 }}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                {/* Actual results - solid line with fill */}
                <Area
                  type="monotone"
                  dataKey={(d: typeof journeyData[0]) => d.isActual ? d.value : null}
                  fill="url(#actualGradient)"
                  stroke="#10B981"
                  strokeWidth={3}
                  connectNulls={false}
                />
                {/* Projected - dashed line */}
                <Line
                  type="monotone"
                  dataKey={(d: typeof journeyData[0]) => !d.isActual || d.isToday ? d.value : null}
                  stroke="#10B981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  strokeOpacity={0.6}
                  dot={false}
                  connectNulls
                />
                {/* "You are here" marker */}
                {journeyData.filter(d => d.isToday).map((d, i) => (
                  <ReferenceDot
                    key={i}
                    x={d.time}
                    y={d.value}
                    r={8}
                    fill="#EA2C00"
                    stroke="white"
                    strokeWidth={3}
                  />
                ))}
                {/* Full scale marker */}
                {journeyData.filter(d => d.isFullScale).map((d, i) => (
                  <ReferenceDot
                    key={i}
                    x={d.time}
                    y={d.value}
                    r={6}
                    fill="#3B82F6"
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* "You are here" annotation */}
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-3 h-3 rounded-full bg-[#EA2C00] animate-pulse"></div>
            <span className="text-sm text-slate-500">
              You are here: <span className="font-semibold text-[#111827]">{formatCurrency(calculateValueRealized)}/year</span> after {months} months
            </span>
          </div>
        </div>

        {/* Value Breakdown Header */}
        <div className="mb-4">
          <h3 className="font-semibold text-[#111827]">Value Breakdown</h3>
          <p className="text-sm text-[#6B7280]">How your {months}-month results translate to dollars</p>
        </div>

        {/* Performance Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          
          {/* Time Savings Card */}
          {selectedMetrics.includes("timeSavings") && timeSavingsChange !== null && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5" data-testid="card-time-savings">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-[#111827]">Time Savings</h3>
                </div>
                {isDetailedMode && getTimelineValues("timeSavings").length >= 2 && (
                  <MiniSparkline data={getTimelineValues("timeSavings")} isPositiveGood={false} />
                )}
              </div>
              <div className="mb-2">
                <span className="text-2xl font-bold text-emerald-600">-{timeSavingsChange} min</span>
                <span className="text-sm text-[#6B7280] ml-2">per encounter</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <span>{timeSavings.before} min → {timeSavings.after} min</span>
                <span className="text-emerald-600 font-medium">({timeSavingsPercent}% reduction)</span>
              </div>
            </div>
          )}

          {/* Work Outside Work Card */}
          {selectedMetrics.includes("workOutsideWork") && workOutsideChange !== null && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5" data-testid="card-work-outside">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Moon className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-[#111827]">Work Outside Work</h3>
                </div>
                {isDetailedMode && getTimelineValues("workOutsideWork").length >= 2 && (
                  <MiniSparkline data={getTimelineValues("workOutsideWork")} isPositiveGood={false} />
                )}
              </div>
              <div className="mb-2">
                <span className="text-2xl font-bold text-emerald-600">-{workOutsideChange} hrs</span>
                <span className="text-sm text-[#6B7280] ml-2">per week</span>
              </div>
              <div className="text-xs text-[#6B7280]">
                {workOutside.before} hrs → {workOutside.after} hrs
              </div>
            </div>
          )}

          {/* Level of Service Card */}
          {selectedMetrics.includes("levelOfService") && losShift > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5" data-testid="card-los">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="font-semibold text-[#111827]">Level of Service</h3>
              </div>
              <div className="mb-2">
                <span className="text-2xl font-bold text-emerald-600">+{losShift}pp</span>
                <span className="text-sm text-[#6B7280] ml-2">shift to Level 5</span>
              </div>
            </div>
          )}

          {/* wRVU Card */}
          {selectedMetrics.includes("wrvuCapture") && wrvuChange !== null && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5" data-testid="card-wrvu">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-[#111827]">wRVU Capture</h3>
                </div>
                {isDetailedMode && getTimelineValues("wrvuCapture").length >= 2 && (
                  <MiniSparkline data={getTimelineValues("wrvuCapture")} isPositiveGood={true} />
                )}
              </div>
              <div className="mb-2">
                <span className="text-2xl font-bold text-emerald-600">+{wrvuChange.toFixed(1)}%</span>
                <span className="text-sm text-[#6B7280] ml-2">lift</span>
              </div>
              <div className="text-xs text-[#6B7280]">
                {wrvuData.before} → {wrvuData.after} wRVU/enc
              </div>
            </div>
          )}

          {/* Chart Closure Card */}
          {selectedMetrics.includes("chartClosure") && sameDayImprovement > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5" data-testid="card-closure">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-semibold text-[#111827]">Chart Closure</h3>
              </div>
              <div className="mb-2">
                <span className="text-2xl font-bold text-emerald-600">+{sameDayImprovement}pp</span>
                <span className="text-sm text-[#6B7280] ml-2">same-day closure</span>
              </div>
              <div className="text-xs text-[#6B7280]">
                {closureData.before.within24}% → {closureData.after.within24}%
              </div>
            </div>
          )}

          {/* Satisfaction Card */}
          {selectedMetrics.includes("clinicianSatisfaction") && satChange !== null && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5" data-testid="card-satisfaction">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                    <Smile className="w-4 h-4 text-pink-600" />
                  </div>
                  <h3 className="font-semibold text-[#111827]">Satisfaction</h3>
                </div>
                {isDetailedMode && getTimelineValues("clinicianSatisfaction").length >= 2 && (
                  <MiniSparkline data={getTimelineValues("clinicianSatisfaction")} isPositiveGood={true} />
                )}
              </div>
              <div className="mb-2">
                <span className="text-2xl font-bold text-emerald-600">+{satChange.toFixed(1)}</span>
                <span className="text-sm text-[#6B7280] ml-2">points</span>
              </div>
              <div className="text-xs text-[#6B7280]">
                {satData.before}/10 → {satData.after}/10
                {satData.recommendRate && ` · ${satData.recommendRate}% would recommend`}
              </div>
            </div>
          )}
        </div>

        {/* What's Next Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-[#111827]">What's Next?</h3>
              <p className="text-sm text-blue-700">Model what full-scale deployment could look like based on your proven results</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <TrendingUp className="w-4 h-4" />
            <span>At 100% utilization, you could realize <strong>{formatCurrency(fullScaleValue)}/year</strong> — {((fullScaleValue / calculateValueRealized - 1) * 100).toFixed(0)}% more than today</span>
          </div>
        </div>

        {/* Success Summary */}
        {metricsWithData.length > 0 && (
          <div className="flex items-center gap-3 p-5 bg-emerald-50 border border-emerald-200 rounded-xl mb-8">
            <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <p className="text-emerald-800">
              Your deployment is showing <strong>positive results across {metricsWithData.length} metrics</strong>. 
              Ready to see your full ROI story?
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={onNext}
            className="gap-2"
            data-testid="button-next"
          >
            See Your ROI Story
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
