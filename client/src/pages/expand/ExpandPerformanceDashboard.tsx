import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Moon, FileText, DollarSign, FileCheck, Smile, CheckCircle, TrendingUp, Rocket, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, Area, ComposedChart } from "recharts";
import type { DeploymentData, MetricType, MetricsData, TimelineData } from "./ExpandFlow";
import { type ValueConfigData, calculateTieredROI, type CalculationInputs, EXPAND_ROI_DEFAULTS } from "@/lib/expandRoiCalculator";

interface ExpandPerformanceDashboardProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  timelineData: TimelineData;
  valueConfig: ValueConfigData;
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
  valueConfig,
  onNext,
  onBack,
  onBackToJourney,
}: ExpandPerformanceDashboardProps) {
  
  const isDetailedMode = deploymentData.dataEntryMode === "detailed";
  const months = deploymentData.monthsOnAbridge || 6;
  const providers = deploymentData.providers || 50;
  const encounters = deploymentData.annualEncounters || 65000;
  const utilizationRate = deploymentData.utilizationRate || 70;
  
  const abridgeEncounters = useMemo(() => {
    return Math.round(encounters * (utilizationRate / 100));
  }, [encounters, utilizationRate]);

  // Build calculation inputs for tiered ROI
  const calcInputs: CalculationInputs = useMemo(() => ({
    providers,
    encounters,
    utilizationRate,
    monthsOnAbridge: months,
    wrvuBefore: metricsData.wrvuCapture.before,
    wrvuAfter: metricsData.wrvuCapture.after,
    timeSavingsBefore: metricsData.timeSavings.before,
    timeSavingsAfter: metricsData.timeSavings.after,
    workOutsideWorkBefore: metricsData.workOutsideWork.before,
    workOutsideWorkAfter: metricsData.workOutsideWork.after,
    chartClosureBefore: metricsData.chartClosure.sameDayBefore ?? metricsData.chartClosure.before.within24,
    chartClosureAfter: metricsData.chartClosure.sameDayAfter ?? metricsData.chartClosure.after.within24,
    satisfactionBefore: metricsData.clinicianSatisfaction.before,
    satisfactionAfter: metricsData.clinicianSatisfaction.after,
    valueConfig,
  }), [providers, encounters, utilizationRate, months, metricsData, valueConfig]);

  // Calculate tiered ROI using the new honest calculation
  const roiResult = useMemo(() => calculateTieredROI(calcInputs), [calcInputs]);

  // Extract metric changes for display cards
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
  const losBeforeAvg = losData.averageBefore ?? null;
  const losAfterAvg = losData.averageAfter ?? null;
  const losChange = losBeforeAvg && losAfterAvg ? (losAfterAvg - losBeforeAvg) : null;

  const wrvuData = metricsData.wrvuCapture;
  const wrvuChange = wrvuData.before && wrvuData.after
    ? (((wrvuData.after - wrvuData.before) / wrvuData.before) * 100)
    : null;

  const closureData = metricsData.chartClosure;
  const sameDayBefore = closureData.sameDayBefore ?? closureData.before.within24;
  const sameDayAfter = closureData.sameDayAfter ?? closureData.after.within24;
  const sameDayImprovement = (sameDayAfter || 0) - (sameDayBefore || 0);

  const satData = metricsData.clinicianSatisfaction;
  const satChange = satData.before && satData.after ? satData.after - satData.before : null;

  // Use Tier 1 hard value (annualized) for the Today card to match graph
  const calculateValueRealized = roiResult.tier1HardValue;
  
  // Full scale projection with provider expansion and utilization improvement
  const fullScaleValue = useMemo(() => {
    if (utilizationRate === 0) return roiResult.tier1HardValue;
    
    const targetProviders = providers * 3;
    const targetUtil = Math.min(utilizationRate + 15, 90);
    const providerMultiplier = targetProviders / providers;
    const utilizationMultiplier = targetUtil / utilizationRate;
    const maturityMultiplier = 1.15;
    
    return Math.round(roiResult.tier1HardValue * providerMultiplier * utilizationMultiplier * maturityMultiplier);
  }, [roiResult.tier1HardValue, providers, utilizationRate]);

  // Journey graph data point type
  interface JourneyDataPoint {
    id: string;
    time: string;
    label: string;
    sublabel: string;
    value: number;
    isActual: boolean;
    month: number;
    isToday?: boolean;
    isFullScale?: boolean;
    phase: 'baseline' | 'ramp' | 'current' | 'maturity' | 'expansion' | 'fullScale';
    providerCount: number;
    utilization: number;
  }

  // Calculate hard value breakdown for tooltip
  const hardValueBreakdown = useMemo(() => {
    const breakdown: { name: string; value: number }[] = [];
    
    if (roiResult.tier1Breakdown.wrvuValue > 0) {
      breakdown.push({ name: 'Revenue Capture (wRVU)', value: roiResult.tier1Breakdown.wrvuValue });
    }
    if (roiResult.tier1Breakdown.timeConversionValue > 0) {
      const methodName = valueConfig.timeConversionMethod === 'patientAccess' 
        ? `Patient Access (${valueConfig.conversionPercent}%)` 
        : `Overtime Reduction`;
      breakdown.push({ name: methodName, value: roiResult.tier1Breakdown.timeConversionValue });
    }
    if (roiResult.tier1Breakdown.retentionValue > 0) {
      breakdown.push({ name: 'Retention Value', value: roiResult.tier1Breakdown.retentionValue });
    }
    
    return breakdown;
  }, [roiResult.tier1Breakdown, valueConfig]);

  // Calculate full scale value based on expansion multipliers
  const calculateFullScaleValueFromCurrent = (
    currentValue: number, 
    currentProviders: number, 
    currentUtil: number, 
    targetProviders: number, 
    targetUtil: number
  ) => {
    if (currentUtil === 0 || currentProviders === 0) return currentValue;
    
    const providerMultiplier = targetProviders / currentProviders;
    const utilizationMultiplier = targetUtil / currentUtil;
    const maturityMultiplier = 1.15; // 15% compounding bonus from full maturity
    
    return Math.round(currentValue * providerMultiplier * utilizationMultiplier * maturityMultiplier);
  };

  // Journey graph data - always ascending, anchored to Tier 1 hard value
  const journeyData = useMemo((): JourneyDataPoint[] => {
    const todayValue = roiResult.tier1HardValue; // Annualized Tier 1 hard value
    const targetProviders = providers * 3; // Default 3x expansion
    const targetUtil = Math.min(utilizationRate + 15, 90); // Improve util by 15% capped at 90%
    
    const fullScaleVal = calculateFullScaleValueFromCurrent(
      todayValue,
      providers,
      utilizationRate,
      targetProviders,
      targetUtil
    );
    
    const data: JourneyDataPoint[] = [
      { 
        id: 'before',
        time: "Before", 
        label: "Before", 
        sublabel: "Abridge",
        value: 0, 
        isActual: true, 
        month: 0,
        phase: 'baseline',
        providerCount: providers,
        utilization: 0,
      },
    ];
    
    // Add ramp point at midpoint of their journey
    const midpoint = Math.ceil(months / 2);
    if (midpoint > 0 && midpoint < months) {
      data.push({ 
        id: 'ramp',
        time: `Mo ${midpoint}`, 
        label: `Mo ${midpoint}`, 
        sublabel: "Ramping",
        value: Math.round(todayValue * 0.45), // ~45% at midpoint (adoption curve)
        isActual: true, 
        month: midpoint,
        phase: 'ramp',
        providerCount: providers,
        utilization: Math.round(utilizationRate * 0.7),
      });
    }
    
    // Today point - EXACT match to Tier 1 value
    data.push({ 
      id: 'today',
      time: `Mo ${months}`, 
      label: "Today", 
      sublabel: `${providers} providers`,
      value: todayValue,
      isActual: true, 
      isToday: true,
      month: months,
      phase: 'current',
      providerCount: providers,
      utilization: utilizationRate,
    });
    
    // Projected points - always ascending
    if (months < 12) {
      data.push({ 
        id: 'month12',
        time: "Mo 12", 
        label: "Mo 12", 
        sublabel: "Maturity",
        value: Math.round(todayValue * 1.25), // 25% boost from maturity
        isActual: false, 
        month: 12,
        phase: 'maturity',
        providerCount: providers,
        utilization: Math.min(utilizationRate + 10, 90),
      });
    }
    
    if (months < 24) {
      data.push({ 
        id: 'month24',
        time: "Mo 24", 
        label: "Mo 24", 
        sublabel: "Expansion",
        value: Math.round(todayValue * 2.0), // Starting to scale
        isActual: false, 
        month: 24,
        phase: 'expansion',
        providerCount: Math.round(providers * 1.5),
        utilization: Math.min(utilizationRate + 12, 90),
      });
    }
    
    data.push({ 
      id: 'fullScale',
      time: "Full Scale", 
      label: "Full Scale", 
      sublabel: `${targetProviders} providers`,
      value: fullScaleVal, 
      isActual: false, 
      isFullScale: true,
      month: 36,
      phase: 'fullScale',
      providerCount: targetProviders,
      utilization: targetUtil,
    });
    
    return data;
  }, [roiResult.tier1HardValue, providers, utilizationRate, months]);

  // Custom tooltip component for journey graph
  const JourneyTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: JourneyDataPoint }> }) => {
    if (!active || !payload?.[0]) return null;
    
    const data = payload[0].payload;
    const todayValue = roiResult.tier1HardValue;
    
    return (
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg p-4 min-w-[280px]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-[#111827]">{data.label}</span>
          {data.isToday && (
            <span className="px-2 py-0.5 bg-[#EA2C00] text-white text-[12px] font-semibold rounded">
              You are here
            </span>
          )}
          {data.isFullScale && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[12px] font-semibold rounded">
              Projected
            </span>
          )}
        </div>
        
        <div className="text-xs text-[#6B7280] flex gap-2 mb-3">
          {data.month > 0 && <span>Month {data.month}</span>}
          <span>{data.providerCount} providers</span>
          {data.utilization > 0 && <span>{data.utilization}% utilization</span>}
        </div>
        
        <div className="border-t border-neutral-100 pt-3">
          {data.isActual && data.isToday ? (
            // Show breakdown for Today
            <>
              <div className="text-[12px] font-semibold text-[#6B7280] tracking-wider uppercase mb-2">
                HARD VALUE BREAKDOWN
              </div>
              {hardValueBreakdown.map((item, i) => (
                <div key={i} className="flex justify-between text-sm mb-1">
                  <span className="text-[#6B7280]">{item.name}</span>
                  <span className="font-medium text-[#111827]">{formatCurrency(item.value)}</span>
                </div>
              ))}
              <div className="border-t border-neutral-100 mt-2 pt-2 flex justify-between">
                <span className="font-semibold text-[#111827]">Total</span>
                <span className="font-bold text-emerald-600">{formatCurrency(data.value)}</span>
              </div>
              <div className="mt-2 text-xs text-[#6B7280]">
                ROI: {roiResult.roi.toFixed(1)}x
              </div>
            </>
          ) : data.phase === 'baseline' ? (
            <div className="text-sm text-[#6B7280]">Your starting point before Abridge</div>
          ) : data.isActual ? (
            // Show simple value for actual ramp points
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Value</span>
              <span className="font-bold text-emerald-600">{formatCurrency(data.value)}</span>
            </div>
          ) : (
            // Show projection explanation for future points
            <>
              <div className="text-[12px] font-semibold text-[#6B7280] tracking-wider uppercase mb-2">
                PROJECTED VALUE
              </div>
              <div className="text-xs text-[#6B7280] mb-2">
                Based on your proven {formatCurrency(todayValue)}
              </div>
              <div className="space-y-1 text-xs text-[#6B7280]">
                {data.providerCount > providers && (
                  <div>× {(data.providerCount / providers).toFixed(1)}x providers ({providers} → {data.providerCount})</div>
                )}
                {data.utilization > utilizationRate && (
                  <div>× {(data.utilization / utilizationRate).toFixed(2)}x utilization ({utilizationRate}% → {data.utilization}%)</div>
                )}
                {data.phase === 'fullScale' && (
                  <div>× 1.15x maturity effects</div>
                )}
              </div>
              <div className="border-t border-neutral-100 mt-2 pt-2 flex justify-between">
                <span className="font-semibold text-[#111827]">Projected Total</span>
                <span className="font-bold text-blue-600">{formatCurrency(data.value)}</span>
              </div>
              <div className="mt-2 text-[12px] text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Projection based on current results
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const metricsWithData = selectedMetrics.filter((m) => {
    switch (m) {
      case "timeSavings": return timeSavingsChange !== null;
      case "workOutsideWork": return workOutsideChange !== null;
      case "levelOfService": return losChange !== null && losChange > 0;
      case "wrvuCapture": return wrvuChange !== null;
      case "chartClosure": return sameDayImprovement > 0;
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
      <UnifiedHeader 
        pathType="expand"
        currentStep={5}
        totalSteps={7}
        stepName="Your Journey"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-5xl mx-auto px-6 py-6 md:py-8 pb-10">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          {/* Before Phase */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <span className="text-[12px] font-semibold text-slate-500 tracking-wider uppercase block mb-2">
              BEFORE ABRIDGE
            </span>
            <span className="text-2xl font-bold text-slate-400 block">Baseline</span>
            <span className="text-xs text-slate-400 mt-1 block">Your starting point</span>
          </div>

          {/* Today Phase - Highlighted with Value Realized */}
          <div className="bg-white border-2 border-[#EA2C00] rounded-xl p-5 relative shadow-sm">
            <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-[#EA2C00] text-white text-[12px] font-semibold rounded">
              YOU ARE HERE
            </div>
            <span className="text-[12px] font-semibold text-slate-500 tracking-wider uppercase block mb-2 mt-1">
              TODAY
            </span>
            <span className="text-2xl font-bold text-emerald-600 block" data-testid="text-today-value">
              +{formatCurrency(calculateValueRealized)}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">{months} months · Proven ROI</span>
          </div>

          {/* Full Scale Phase */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <span className="text-[12px] font-semibold text-blue-700 tracking-wider uppercase block mb-2">
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
                  content={<JourneyTooltip />}
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
          {selectedMetrics.includes("levelOfService") && losChange !== null && losChange > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-5" data-testid="card-los">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="font-semibold text-[#111827]">Level of Service</h3>
              </div>
              <div className="mb-2">
                <span className="text-2xl font-bold text-emerald-600">+{losChange.toFixed(2)}</span>
                <span className="text-sm text-[#6B7280] ml-2">avg level increase</span>
              </div>
              <div className="text-xs text-[#6B7280]">
                {losBeforeAvg?.toFixed(2)} → {losAfterAvg?.toFixed(2)}
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
                {sameDayBefore}% → {sameDayAfter}%
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
            <span>At 100% utilization, you could realize <strong>{formatCurrency(fullScaleValue)}/year</strong>, {((fullScaleValue / calculateValueRealized - 1) * 100).toFixed(0)}% more than today</span>
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
