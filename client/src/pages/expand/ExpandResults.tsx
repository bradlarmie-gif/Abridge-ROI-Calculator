import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, DollarSign, TrendingUp, Rocket, Clock, Moon, Smile, FileText, Mail, Link, AlertTriangle, Info, ChevronRight, Loader2, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, Area, LineChart, CartesianGrid } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { TermTooltip, TERMS } from "@/components/TermTooltip";
import type { DeploymentData, MetricType, MetricsData, TimelineData, MetricTrendData, MetricEntryModeState } from "./ExpandFlow";
import { type ValueConfigData, calculateTieredROI, type CalculationInputs, EXPAND_ROI_DEFAULTS, formatCurrency } from "@/lib/expandRoiCalculator";
import { generateExpandROIPDFBlob, generateExpandROIPDF, type ExpandPDFData } from "@/lib/expand-pdf-generator";
import { PDFExportModal } from "@/components/switch/PDFExportModal";

interface ExpandResultsProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  timelineData: TimelineData;
  metricTrendData: MetricTrendData;
  metricEntryModes: MetricEntryModeState;
  valueConfig: ValueConfigData;
  onBack: () => void;
  onBackToJourney?: () => void;
}

const MAX_UTILIZATION = 85;

export default function ExpandResults({
  deploymentData,
  selectedMetrics,
  metricsData,
  timelineData,
  metricTrendData,
  metricEntryModes,
  valueConfig,
  onBack,
  onBackToJourney,
}: ExpandResultsProps) {
  const { toast } = useToast();
  
  const providers = deploymentData.providers || 50;
  const encounters = deploymentData.annualEncounters || 65000;
  const utilizationRate = Math.min(deploymentData.utilizationRate || 70, MAX_UTILIZATION);
  const months = deploymentData.monthsOnAbridge || 6;

  const [targetProviders, setTargetProviders] = useState<number | "">(providers * 3);
  const [targetUtilization, setTargetUtilization] = useState(Math.min(utilizationRate + 15, MAX_UTILIZATION));

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

  const roiResult = useMemo(() => calculateTieredROI(calcInputs), [calcInputs]);

  const currentValue = roiResult.tier1HardValue;
  const valuePerProvider = providers > 0 ? currentValue / providers : 0;

  const expansionCalc = useMemo(() => {
    if (targetProviders === "" || targetProviders <= providers) {
      return null;
    }
    
    const targetProvidersNum = targetProviders as number;
    const targetUtil = Math.min(targetUtilization, MAX_UTILIZATION);
    
    const providerMultiplier = targetProvidersNum / providers;
    const utilizationMultiplier = utilizationRate > 0 ? targetUtil / utilizationRate : 1;
    const maturityMultiplier = 1.15;
    
    const projectedValue = Math.round(currentValue * providerMultiplier * utilizationMultiplier * maturityMultiplier);
    const expansionValue = projectedValue - currentValue;
    
    return {
      projectedValue,
      expansionValue,
      providerMultiplier,
      utilizationMultiplier,
      maturityMultiplier,
      targetProviders: targetProvidersNum,
      targetUtilization: targetUtil,
    };
  }, [targetProviders, targetUtilization, providers, utilizationRate, currentValue]);

  interface JourneyDataPoint {
    id: string;
    time: string;
    label: string;
    value: number;
    isActual: boolean;
    isToday?: boolean;
    isFullScale?: boolean;
  }

  const journeyData = useMemo((): JourneyDataPoint[] => {
    const todayValue = currentValue;
    const fullScaleValue = expansionCalc?.projectedValue || todayValue * 3;
    const dollarPerWRVU = EXPAND_ROI_DEFAULTS.dollarPerWRVU;
    const attribution = valueConfig.wrvuAttribution;
    const eligibleEnc = encounters * (utilizationRate / 100);
    
    // Check if we have real trend data from wRVU (primary value driver)
    const wrvuTrend = metricTrendData.wrvuCapture;
    const filledData = wrvuTrend.monthlyData.map((v, i) => v !== null ? { value: v, index: i } : null).filter((x): x is { value: number; index: number } => x !== null);
    const hasRealTrendData = wrvuTrend.baseline !== null && filledData.length > 0;
    
    if (hasRealTrendData && wrvuTrend.baseline !== null) {
      const baseline = wrvuTrend.baseline;
      const lastFilledIndex = filledData.length - 1;
      const dataPoints: JourneyDataPoint[] = [
        { id: 'baseline', time: 'Before', label: 'Baseline', value: 0, isActual: true },
      ];
      
      // Add actual monthly data points (O(n) - precomputed lastFilledIndex)
      filledData.forEach((item, idx) => {
        const wrvuLift = Math.max(0, item.value - baseline);
        const monthValue = Math.round(wrvuLift * eligibleEnc * dollarPerWRVU * attribution);
        const isCurrent = idx === lastFilledIndex;
        dataPoints.push({
          id: `m${item.index + 1}`,
          time: `Mo ${item.index + 1}`,
          label: isCurrent ? 'Today' : `Month ${item.index + 1}`,
          value: monthValue,
          isActual: true,
          isToday: isCurrent,
        });
      });
      
      // Add projection points
      const maturityValue = Math.round(todayValue * 1.25);
      dataPoints.push(
        { id: 'maturity', time: 'Mo 12', label: 'Maturity', value: maturityValue, isActual: false },
        { id: 'fullScale', time: 'Full Scale', label: 'Full Adoption', value: fullScaleValue, isActual: false, isFullScale: true },
      );
      
      return dataPoints;
    }
    
    // Fallback to synthetic journey based on before/after
    const rampValue = Math.round(todayValue * 0.45);
    const maturityValue = Math.round(todayValue * 1.25);
    const expansionValue = Math.round(todayValue * 2);
    
    return [
      { id: 'baseline', time: 'Before', label: 'Baseline', value: 0, isActual: true },
      { id: 'ramp', time: `Mo ${Math.round(months * 0.5)}`, label: 'Ramp-up', value: rampValue, isActual: true },
      { id: 'today', time: 'Today', label: 'Today', value: todayValue, isActual: true, isToday: true },
      { id: 'maturity', time: 'Mo 12', label: 'Maturity', value: maturityValue, isActual: false },
      { id: 'expansion', time: 'Mo 24', label: 'Expansion', value: expansionValue, isActual: false },
      { id: 'fullScale', time: 'Full Scale', label: 'Full Adoption', value: fullScaleValue, isActual: false, isFullScale: true },
    ];
  }, [currentValue, months, expansionCalc, metricTrendData, encounters, utilizationRate]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: JourneyDataPoint }> }) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-500">{data.label}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            data.isToday ? 'bg-[#EA2C00] text-white' : data.isActual ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {data.isToday ? 'You are here' : data.isActual ? 'Actual' : 'Projected'}
          </span>
        </div>
        <div className="text-lg font-bold text-[#111827]">{formatCurrency(data.value)}/year</div>
        {data.isFullScale && expansionCalc && (
          <div className="mt-2 pt-2 border-t border-neutral-100 text-xs text-neutral-600">
            At {expansionCalc.targetProviders} providers, {expansionCalc.targetUtilization}% adoption
          </div>
        )}
      </div>
    );
  };

  const [isExporting, setIsExporting] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [preparedBy, setPreparedBy] = useState("");

  const buildPDFData = useCallback((clientNameOverride?: string, preparedByOverride?: string): ExpandPDFData => {
    const documentedEncounters = Math.round(encounters * utilizationRate / 100);
    
    const metrics: ExpandPDFData['metrics'] = [];
    
    // Helper to convert timeline data OR metricTrendData to trend array
    const getTrend = (timelinePoints: typeof timelineData.timeSavings, metricKey?: keyof MetricTrendData) => {
      // Check if user entered trend data in Advanced mode first
      if (metricKey && metricEntryModes[metricKey as keyof MetricEntryModeState] === 'trend') {
        const trendData = metricTrendData[metricKey];
        if (trendData && (trendData.baseline !== null || trendData.monthlyData.some((v: number | null) => v !== null))) {
          const points: { month: string; value: number }[] = [];
          if (trendData.baseline !== null) {
            points.push({ month: 'Baseline', value: trendData.baseline });
          }
          trendData.monthlyData.forEach((val: number | null, i: number) => {
            if (val !== null) {
              points.push({ month: `Month ${i + 1}`, value: val });
            }
          });
          if (points.length >= 2) return points;
        }
      }
      
      // Fall back to timeline data
      const validPoints = timelinePoints.filter(p => p.value !== null);
      if (validPoints.length < 2) return undefined;
      return validPoints.map(p => ({ month: p.label || `Month ${p.month}`, value: p.value as number }));
    };
    
    // wRVU metric with full details
    if (roiResult.tier1Breakdown.wrvuValue > 0 || metricsData.wrvuCapture.before || metricsData.wrvuCapture.after) {
      const wrvuLift = (metricsData.wrvuCapture.after || 0) - (metricsData.wrvuCapture.before || 0);
      const wrvuLiftPercent = metricsData.wrvuCapture.before ? (wrvuLift / metricsData.wrvuCapture.before) * 100 : 0;
      const isAboveTypical = wrvuLiftPercent > 7;
      const isBelowTypical = wrvuLiftPercent < 3 && wrvuLiftPercent > 0;
      const wrvuTrend = getTrend(timelineData.wrvuCapture, 'wrvuCapture');
      
      metrics.push({
        id: 'wrvu',
        name: 'wRVU Per Encounter',
        description: 'Revenue capture improvement',
        before: metricsData.wrvuCapture.before || 0,
        after: metricsData.wrvuCapture.after || 0,
        change: wrvuLift,
        changePercent: wrvuLiftPercent,
        unit: 'wRVU/enc',
        isPositiveGood: true,
        value: roiResult.tier1Breakdown.wrvuValue,
        formula: `+${wrvuLift.toFixed(2)} wRVU/enc × ${documentedEncounters.toLocaleString()} encounters × $${EXPAND_ROI_DEFAULTS.dollarPerWRVU}/wRVU × ${Math.round(valueConfig.wrvuAttribution * 100)}% attribution`,
        formulaExplanation: `We use Medicare's $33 conversion factor and ${Math.round(valueConfig.wrvuAttribution * 100)}% attribution to Abridge. If your payer mix is commercial-heavy (where conversion factors run $45-65), actual revenue impact may be 30-50% higher.`,
        whatThisMeans: `Here's what we're seeing: A ${wrvuLiftPercent.toFixed(1)}% lift in wRVU typically means your documentation is now capturing clinical complexity that was always there—providers aren't doing more, the notes are just reflecting reality better. ${isAboveTypical ? `Your ${wrvuLiftPercent.toFixed(0)}% lift is above our typical 3-7% range, which is interesting. This could mean several things: your baseline documentation may have been particularly sparse, or you have complex patient populations that benefit more from thorough capture. It's worth exploring—if you can validate the baseline methodology, this becomes a powerful proof point.` : `This is a pattern we see across deployments: when AI handles the documentation mechanics, providers naturally capture more detail because the friction is gone.`}`,
        benchmark: {
          typicalRange: '3-7% lift',
          typicalMin: 3,
          typicalMax: 7,
          status: isAboveTypical ? 'above' : isBelowTypical ? 'below' : 'within',
          statusLabel: isAboveTypical ? 'Above typical range' : isBelowTypical ? 'Below typical range' : 'Within typical range',
        },
        warningMessage: isAboveTypical ? `Your results exceed our typical range. This isn't necessarily wrong—some organizations do see higher lift, especially if baseline documentation was sparse. But we recommend confirming: Was baseline measured the same way as current? Were there other coding or documentation initiatives during this period? Is the provider population consistent between periods?` : undefined,
        trendDirection: wrvuLift > 0 ? 'improving' : wrvuLift < 0 ? 'declining' : 'stable',
        trend: wrvuTrend,
      });
    }
    
    // Time savings metric - Note: time going DOWN is improvement, so change is positive when improving
    if (metricsData.timeSavings.before || metricsData.timeSavings.after) {
      const beforeTime = metricsData.timeSavings.before || 0;
      const afterTime = metricsData.timeSavings.after || 0;
      const timeSaved = beforeTime - afterTime; // Positive = improvement
      const timeSavedPercent = beforeTime > 0 ? (timeSaved / beforeTime) * 100 : 0;
      const timeTrend = getTrend(timelineData.timeSavings, 'timeSavings');
      
      metrics.push({
        id: 'timeSavings',
        name: 'Time in Notes',
        description: 'Documentation efficiency',
        before: beforeTime,
        after: afterTime,
        change: timeSaved, // Positive means improvement (time reduced)
        changePercent: timeSavedPercent,
        unit: 'min/encounter',
        isPositiveGood: false, // Lower is better for display purposes
        value: roiResult.tier1Breakdown.timeConversionValue > 0 ? roiResult.tier1Breakdown.timeConversionValue : undefined,
        formula: roiResult.tier1Breakdown.timeConversionValue > 0 
          ? `${timeSaved.toFixed(0)} min saved × ${documentedEncounters.toLocaleString()} enc ÷ 60 × $150/hr × ${valueConfig.conversionPercent}%`
          : undefined,
        whatThisMeans: `Let's think about what ${timeSaved.toFixed(0)} minutes saved really means: That's ${Math.round(timeSaved * documentedEncounters / 60).toLocaleString()} hours annually—time that was previously locked up in documentation. The interesting question is: where does that time actually go? We've seen organizations channel it three ways: back to patients (more access, longer visits), back to providers (better work-life balance), or to operations (overtime reduction). Which path makes sense for you depends on your current priorities. ${timeSaved >= 4 ? `The ${timeSaved.toFixed(0)}-minute reduction you're seeing is meaningful—it's the kind of lift that providers notice in their daily rhythm.` : `You're in the early stages of time recapture. As providers build fluency with the tool, we typically see these numbers grow.`}`,
        benchmark: {
          typicalRange: '3-5 min reduction',
          typicalMin: 3,
          typicalMax: 5,
          status: timeSaved > 5 ? 'above' : timeSaved < 3 && timeSaved > 0 ? 'below' : 'within',
          statusLabel: timeSaved > 5 ? 'Above typical' : timeSaved < 3 && timeSaved > 0 ? 'Below typical' : 'Within typical range',
        },
        trendDirection: timeSaved > 0 ? 'improving' : 'stable',
        trend: timeTrend,
      });
    }
    
    // Work Outside Work (Pajama Time) metric
    if (metricsData.workOutsideWork.before || metricsData.workOutsideWork.after) {
      const beforeHrs = metricsData.workOutsideWork.before || 0;
      const afterHrs = metricsData.workOutsideWork.after || 0;
      const hoursReduced = beforeHrs - afterHrs;
      const reductionPercent = beforeHrs > 0 ? (hoursReduced / beforeHrs) * 100 : 0;
      const wowTrend = getTrend(timelineData.workOutsideWork, 'workOutsideWork');
      
      metrics.push({
        id: 'workOutsideWork',
        name: 'Work Outside Work',
        description: 'After-hours documentation',
        before: beforeHrs,
        after: afterHrs,
        change: hoursReduced,
        changePercent: reductionPercent,
        unit: 'hrs/week',
        isPositiveGood: false, // Lower is better
        whatThisMeans: `This one matters more than the numbers suggest. ${hoursReduced.toFixed(1)} hours per week might not sound like much, but talk to any clinician and they'll tell you—those evening hours aren't just time, they're the difference between seeing your kids before bedtime and catching up on charts at 10pm. We've found this metric often predicts retention outcomes 6-12 months down the road. ${hoursReduced >= 3 ? `The reduction you're seeing is substantial—in our experience, providers really feel this difference in their daily lives.` : `You're starting to see movement here. As adoption deepens, this number often grows because providers start trusting the AI to handle more of the documentation load.`}`,
        benchmark: {
          typicalRange: '2-4 hr/week reduction',
          typicalMin: 2,
          typicalMax: 4,
          status: hoursReduced > 4 ? 'above' : hoursReduced < 2 && hoursReduced > 0 ? 'below' : 'within',
          statusLabel: hoursReduced > 4 ? 'Above typical' : hoursReduced < 2 && hoursReduced > 0 ? 'Below typical' : 'Within typical range',
        },
        trendDirection: hoursReduced > 0 ? 'improving' : 'stable',
        trend: wowTrend,
      });
    }
    
    // Chart Closure metric
    const chartClosureBefore = metricsData.chartClosure.sameDayBefore ?? metricsData.chartClosure.before.within24;
    const chartClosureAfter = metricsData.chartClosure.sameDayAfter ?? metricsData.chartClosure.after.within24;
    if (chartClosureBefore || chartClosureAfter) {
      const closureImprovement = (chartClosureAfter || 0) - (chartClosureBefore || 0);
      
      metrics.push({
        id: 'chartClosure',
        name: 'Same-Day Chart Closure',
        description: 'Documentation timeliness',
        before: chartClosureBefore || 0,
        after: chartClosureAfter || 0,
        change: closureImprovement,
        changePercent: closureImprovement, // Already in percentage points
        unit: '%',
        isPositiveGood: true,
        whatThisMeans: `Chart closure is one of those metrics that tells a bigger story. When charts close same-day, it usually means providers are documenting in real-time rather than batching at the end of the day (or week). ${closureImprovement > 0 ? `Your ${closureImprovement} percentage point improvement suggests the workflow is clicking—providers are trusting the AI draft enough to finalize notes between patients.` : `We're not seeing significant movement here yet.`} Beyond the workflow signal, there's a downstream revenue impact: faster closure means faster billing cycles and reduced compliance exposure. Worth watching as your deployment matures.`,
        benchmark: {
          typicalRange: '10-20 percentage point improvement',
          typicalMin: 10,
          typicalMax: 20,
          status: closureImprovement > 20 ? 'above' : closureImprovement < 10 && closureImprovement > 0 ? 'below' : 'within',
          statusLabel: closureImprovement > 20 ? 'Exceptional' : closureImprovement < 10 && closureImprovement > 0 ? 'Below typical' : 'Within typical range',
        },
        trendDirection: closureImprovement > 0 ? 'improving' : closureImprovement < 0 ? 'declining' : 'stable',
      });
    }
    
    // Clinician Satisfaction metric
    if (metricsData.clinicianSatisfaction.before || metricsData.clinicianSatisfaction.after) {
      const satBefore = metricsData.clinicianSatisfaction.before || 0;
      const satAfter = metricsData.clinicianSatisfaction.after || 0;
      const satImprovement = satAfter - satBefore;
      const satTrend = getTrend(timelineData.clinicianSatisfaction, 'clinicianSatisfaction');
      
      metrics.push({
        id: 'clinicianSatisfaction',
        name: 'Clinician Satisfaction',
        description: 'Provider experience indicator',
        before: satBefore,
        after: satAfter,
        change: satImprovement,
        changePercent: satBefore > 0 ? (satImprovement / satBefore) * 100 : 0,
        unit: 'points',
        isPositiveGood: true,
        whatThisMeans: `Here's what's interesting about satisfaction scores: they're often a leading indicator. We've seen organizations where satisfaction improvements precede retention benefits by 6-12 months—it's like an early warning system in reverse. ${satImprovement >= 10 ? `A ${satImprovement}-point improvement is notable. Providers are telling you something is working. The question worth exploring: what specifically is driving this? Is it time savings, reduced after-hours work, or something else?` : satImprovement > 0 ? `You're seeing early movement here. As adoption deepens and providers experience the full benefit, these scores often continue climbing.` : `Satisfaction takes time to shift. Keep monitoring as providers build familiarity with the workflow.`}`,
        benchmark: {
          typicalRange: '5-15 point improvement',
          typicalMin: 5,
          typicalMax: 15,
          status: satImprovement > 15 ? 'above' : satImprovement < 5 && satImprovement > 0 ? 'below' : 'within',
          statusLabel: satImprovement > 15 ? 'Exceptional' : satImprovement < 5 && satImprovement > 0 ? 'Early stage' : 'Within typical range',
        },
        trendDirection: satImprovement > 0 ? 'improving' : satImprovement < 0 ? 'declining' : 'stable',
        trend: satTrend,
      });
    }
    
    // Build tier 2 items with formulas
    const tier2Items: ExpandPDFData['tier2Items'] = [];
    if (roiResult.tier2EfficiencyMetrics.hoursSaved > 0) {
      tier2Items.push({ 
        label: 'Time Saved', 
        value: `${roiResult.tier2EfficiencyMetrics.hoursSaved.toLocaleString()} hours/year`,
        formula: `${((metricsData.timeSavings.before || 0) - (metricsData.timeSavings.after || 0)).toFixed(0)} min/encounter × ${documentedEncounters.toLocaleString()} encounters ÷ 60`,
      });
    }
    if (roiResult.tier2EfficiencyMetrics.pajamaTimeWeekly > 0) {
      tier2Items.push({ 
        label: 'Pajama Time Eliminated', 
        value: `-${roiResult.tier2EfficiencyMetrics.pajamaTimeWeekly} hrs/week`,
        explanation: 'Per-provider average reduction in after-hours documentation',
      });
    }
    if (roiResult.tier2EfficiencyMetrics.chartClosureImprovement > 0) {
      tier2Items.push({ 
        label: 'Chart Closure Improvement', 
        value: `+${roiResult.tier2EfficiencyMetrics.chartClosureImprovement}%`,
        explanation: `Same-day closure rate improved by ${roiResult.tier2EfficiencyMetrics.chartClosureImprovement} percentage points`,
      });
    }
    
    // Build tier 3 items
    const tier3Items: ExpandPDFData['tier3Items'] = [];
    if (roiResult.tier3LeadingIndicators.satisfactionImprovement > 0) {
      tier3Items.push({
        label: 'Clinician Satisfaction',
        value: `${roiResult.tier3LeadingIndicators.satisfactionBefore} → ${roiResult.tier3LeadingIndicators.satisfactionAfter} (+${roiResult.tier3LeadingIndicators.satisfactionImprovement.toFixed(0)} pts)`,
        explanation: 'Satisfaction is a leading indicator for retention. Improvements here typically precede turnover reduction by 6-12 months.',
      });
    }
    
    // Generate "What's Working Well" based on metrics - educational, coaching tone
    const workingWell: string[] = [];
    const wrvuMetric = metrics.find(m => m.id === 'wrvu');
    if (wrvuMetric && wrvuMetric.changePercent > 0) {
      workingWell.push(`Revenue capture is responding—${wrvuMetric.changePercent.toFixed(0)}% wRVU lift suggests documentation is better reflecting clinical complexity`);
    }
    const timeMetric = metrics.find(m => m.id === 'timeSavings');
    if (timeMetric && timeMetric.change > 0) {
      workingWell.push(`Providers are reclaiming time—${timeMetric.change.toFixed(0)} min/encounter freed up, which compounds across your volume`);
    }
    const wowMetric = metrics.find(m => m.id === 'workOutsideWork');
    if (wowMetric && wowMetric.change > 0) {
      workingWell.push(`Evening documentation dropping—${wowMetric.change.toFixed(1)} hrs/week back, a leading indicator for retention`);
    }
    const chartMetric = metrics.find(m => m.id === 'chartClosure');
    if (chartMetric && chartMetric.change > 0) {
      workingWell.push(`Real-time documentation emerging—${chartMetric.change.toFixed(0)}pt closure improvement suggests workflow is clicking`);
    }
    const satMetric = metrics.find(m => m.id === 'clinicianSatisfaction');
    if (satMetric && satMetric.change > 0) {
      workingWell.push(`Provider experience trending positive—+${satMetric.change.toFixed(0)} pts often precedes broader culture benefits`);
    }
    // Add default message if nothing is working well yet
    if (workingWell.length === 0) {
      workingWell.push('Still gathering signal—early deployments often show clearer patterns after 2-3 months of consistent use');
    }
    
    // Generate "Areas to Watch" - exploratory, hypothesis-driven language
    const areasToWatch: string[] = [];
    if (utilizationRate < 80) {
      areasToWatch.push(`Utilization at ${utilizationRate}%—worth exploring what's keeping remaining providers from adopting. Training gaps? Specialty-specific barriers?`);
    }
    if (wrvuMetric?.benchmark?.status === 'above') {
      areasToWatch.push(`wRVU lift above typical—exciting if validated. Consider auditing baseline methodology to confirm this is real lift vs. measurement change`);
    }
    if (valueConfig.timeConversionMethod === 'none' || !roiResult.tier1Breakdown.timeConversionValue) {
      areasToWatch.push(`Time savings currently unrealized—the hours are there, but haven't yet converted to patient access or reduced overtime. Worth a conversation with ops.`);
    }
    if (areasToWatch.length === 0) {
      areasToWatch.push(`No red flags—keep gathering data and watch for emerging patterns as deployment matures`);
    }
    
    // Generate optimization opportunities - action-oriented coaching language
    const optimizationOpportunities: ExpandPDFData['optimizationOpportunities'] = [];
    
    if (utilizationRate < 80) {
      const utilizationGap = 85 - utilizationRate;
      const potentialValue = Math.round(currentValue * (utilizationGap / utilizationRate) * 0.7);
      optimizationOpportunities.push({
        title: 'Deepen Adoption',
        current: `${utilizationRate}% of providers using consistently`,
        target: '80-85% (where value compounds)',
        potentialValue,
        action: 'Look for patterns: Which specialties or sites are lagging? Often there are 2-3 common barriers that, once addressed, unlock the next wave of adoption.',
      });
    }
    
    if (valueConfig.timeConversionMethod === 'none' && roiResult.tier2EfficiencyMetrics.hoursSaved > 0) {
      const hoursSaved = roiResult.tier2EfficiencyMetrics.hoursSaved;
      const potentialValue = Math.round(hoursSaved * 150 * 0.15);
      optimizationOpportunities.push({
        title: 'Convert Time to Value',
        current: `${hoursSaved.toLocaleString()} hrs/year reclaimed but not monetized`,
        target: '15-20% converting to patient access or OT reduction',
        potentialValue,
        action: 'This is a collaboration opportunity with scheduling/ops. The time savings are real—the question is how to redirect that capacity intentionally rather than letting it dissipate.',
      });
    }
    
    if (wrvuMetric?.benchmark?.status === 'above') {
      optimizationOpportunities.push({
        title: 'Validate Your Standout Results',
        current: `${wrvuMetric.changePercent.toFixed(0)}% wRVU lift (above typical)`,
        target: 'Confirmed, defensible methodology',
        potentialValue: 0,
        action: 'High-lift results are great news if they hold up to scrutiny. Quick audit: Was baseline measured consistently? Any other coding initiatives running in parallel? If you can answer "yes" to both, this becomes a compelling proof point.',
      });
    }
    
    return {
      clientName: clientNameOverride,
      preparedBy: preparedByOverride,
      organizationName: undefined,
      careSetting: 'Outpatient',
      providers,
      encounters,
      utilizationRate,
      monthsOnAbridge: months,
      documentedEncounters,
      tier1Value: roiResult.tier1HardValue,
      tier2Items,
      tier3Items,
      metrics,
      expansion: {
        currentProviders: providers,
        currentUtilization: utilizationRate,
        currentValue: currentValue,
        targetProviders: expansionCalc?.targetProviders || providers * 3,
        targetUtilization: expansionCalc?.targetUtilization || Math.min(utilizationRate + 15, MAX_UTILIZATION),
        projectedValue: expansionCalc?.projectedValue || currentValue * 3,
        expansionValue: expansionCalc?.expansionValue || currentValue * 2,
      },
      valueConfig: {
        timeConversionMethod: valueConfig.timeConversionMethod,
        conversionPercent: valueConfig.conversionPercent,
        retentionEnabled: valueConfig.estimateRetention,
      },
      workingWell,
      areasToWatch,
      optimizationOpportunities,
      warnings: roiResult.warnings.map(w => ({
        type: w.type,
        title: w.title,
        message: w.message,
        severity: w.severity,
      })),
    };
  }, [providers, encounters, utilizationRate, months, metricsData, timelineData, metricTrendData, metricEntryModes, valueConfig, roiResult, currentValue, expansionCalc]);

  const handleOpenExportModal = () => {
    setShowExportModal(true);
  };

  const handleExportPDF = async (exportClientName: string, exportPreparedBy: string) => {
    setClientName(exportClientName);
    setPreparedBy(exportPreparedBy);
    setIsExporting(true);
    try {
      const pdfData = buildPDFData(exportClientName, exportPreparedBy);
      await generateExpandROIPDF(pdfData);
      setShowExportModal(false);
      toast({ 
        title: "PDF exported", 
        description: "Your value realization report has been downloaded" 
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ 
        title: "Export failed", 
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied", description: "Link copied to clipboard" });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]" data-testid="expand-results">
      <UnifiedHeader 
        pathType="expand"
        currentStep={5}
        totalSteps={5}
        stepName="Your Results"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />
      
      <div className="py-6 md:py-8 px-4 md:px-6 pb-8 max-w-5xl mx-auto">
        <motion.div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="text-center sm:text-left mb-4 sm:mb-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-[#1F2937] mb-2">
              Your Abridge Results
            </h1>
            <p className="text-sm md:text-base text-[#6B7280]">
              {providers} providers · {months} mo · {utilizationRate}% utilization
            </p>
          </div>
          <Button 
            onClick={handleOpenExportModal}
            disabled={isExporting}
            className="bg-[#EA2C00] hover:bg-[#d12700] text-white gap-2"
            data-testid="button-export-pdf"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? 'Generating...' : 'Export PDF'}
          </Button>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 md:mb-8">
          <motion.div 
            className="bg-white border border-neutral-200 rounded-xl p-4 md:p-6 text-center" 
            data-testid="card-current-value"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto mb-2 md:mb-3">
              <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
            </div>
            <span className="text-2xl md:text-3xl font-bold text-emerald-600">{formatCurrency(currentValue)}</span>
            <span className="block text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Current Value</span>
            <span className="text-xs text-[#9CA3AF]">Proven results</span>
          </motion.div>
          
          <motion.div 
            className="bg-[#1e293b] rounded-xl p-4 md:p-6 text-center" 
            data-testid="card-value-per-provider"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
          >
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <span className="text-2xl md:text-3xl font-bold text-white">{formatCurrency(valuePerProvider)}</span>
            <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wide mt-1">Value/Provider</span>
            <span className="text-xs text-neutral-500">Based on {providers} providers</span>
          </motion.div>
          
          <motion.div 
            className={`rounded-xl p-4 md:p-6 text-center cursor-pointer hover-elevate active-elevate-2 ${expansionCalc ? 'bg-blue-50 border border-blue-200' : 'bg-neutral-50 border border-neutral-200'}`} 
            data-testid="card-expansion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
            onClick={() => document.getElementById('expansion-section')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3 ${expansionCalc ? 'bg-blue-100' : 'bg-neutral-200'}`}>
              <Rocket className={`w-4 h-4 md:w-5 md:h-5 ${expansionCalc ? 'text-blue-600' : 'text-neutral-400'}`} />
            </div>
            <span className={`text-2xl md:text-3xl font-bold ${expansionCalc ? 'text-blue-600' : 'text-neutral-400'}`}>
              {expansionCalc ? `+${formatCurrency(expansionCalc.expansionValue)}` : '--'}
            </span>
            <span className="block text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Expansion Potential</span>
            <span className="text-xs text-[#9CA3AF]">
              {expansionCalc ? `At ${expansionCalc.targetProviders} providers` : 'Click to model growth'}
            </span>
            <span className="block text-xs text-blue-500 mt-1">
              Click to explore
            </span>
          </motion.div>
        </div>
        
        <div className="bg-white border border-neutral-200 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-3 md:mb-4">
            Your Value Journey
          </h2>
          
          <div className="h-48 sm:h-52 md:h-64 overflow-x-auto -mx-2 md:mx-0">
            <div className="min-w-[280px] h-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={journeyData} margin={{ top: 15, right: 15, left: 10, bottom: 8 }}>
                  <defs>
                    <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="time" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                    tickFormatter={(v) => formatCurrency(v)}
                    width={55}
                  />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  fill="url(#valueGradient)" 
                  stroke="none"
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={(props: { cx: number; cy: number; payload: JourneyDataPoint }) => {
                    const { cx, cy, payload } = props;
                    if (payload.isToday) {
                      return (
                        <g key={payload.id}>
                          <circle cx={cx} cy={cy} r={10} fill="#EA2C00" stroke="white" strokeWidth={3} />
                        </g>
                      );
                    }
                    return (
                      <circle 
                        key={payload.id}
                        cx={cx} 
                        cy={cy} 
                        r={6} 
                        fill={payload.isActual ? "#10B981" : "#3B82F6"} 
                        stroke="white" 
                        strokeWidth={2}
                      />
                    );
                  }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-6 mt-3 md:mt-4 text-xs md:text-sm">
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-500"></div>
              <span className="text-[#6B7280]">Actual</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-blue-500"></div>
              <span className="text-[#6B7280]">Projected</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-[#EA2C00]"></div>
              <span className="text-[#6B7280]">You are here</span>
            </div>
          </div>
        </div>
        
        <div 
          id="expansion-section"
          className="bg-gradient-to-br from-blue-50 via-white to-emerald-50 border-2 border-blue-200 rounded-xl p-4 md:p-6 mb-6 md:mb-8 shadow-sm scroll-mt-20"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-600 text-white rounded uppercase tracking-wide animate-pulse">
              Expansion Opportunity
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-[#1F2937] mb-2">
            Model Your Growth Potential
          </h2>
          <p className="text-sm text-[#6B7280] mb-4 md:mb-6">
            Based on your proven results, here's what full-scale adoption could unlock. 
            <span className="text-blue-700 font-medium"> Adjust the sliders to see the impact.</span>
          </p>
          
          <div className="flex flex-col md:flex-row md:items-stretch gap-4 md:gap-6">
            <div className="bg-neutral-50 rounded-lg p-4 md:p-5 flex-1">
              <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3 md:mb-4">Current State</h4>
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Providers</span>
                  <span className="font-medium text-[#1F2937]">{providers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Utilization</span>
                  <span className="font-medium text-[#1F2937]">{utilizationRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#6B7280]">Annual Value</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(currentValue)}</span>
                </div>
              </div>
            </div>
            
            <div className="hidden md:flex items-center justify-center">
              <ChevronRight className="w-8 h-8 text-neutral-300" />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-5 flex-1">
              <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3 md:mb-4">Expansion Target</h4>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <label className="text-sm text-[#6B7280] block mb-1">Total providers</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={targetProviders}
                    onChange={(e) => setTargetProviders(e.target.value ? parseInt(e.target.value) : "")}
                    placeholder="e.g., 150"
                    min={providers + 1}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
                    data-testid="input-target-providers"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-[#6B7280] block mb-1">Target utilization</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={utilizationRate}
                      max={MAX_UTILIZATION}
                      value={targetUtilization}
                      onChange={(e) => setTargetUtilization(parseInt(e.target.value))}
                      className="flex-1 accent-[#EA2C00]"
                      data-testid="slider-target-utilization"
                    />
                    <span className="font-medium text-[#1F2937] w-12 text-right">{targetUtilization}%</span>
                  </div>
                  <span className="text-xs text-[#9CA3AF]">Most organizations reach 75-85% at maturity</span>
                </div>
                
              </div>
            </div>
          </div>
          
          {expansionCalc && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              <div className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="text-center bg-white/10 rounded-lg p-3">
                    <span className="block text-3xl font-bold">{formatCurrency(expansionCalc.projectedValue)}</span>
                    <span className="text-sm text-white/80">Projected Annual Value</span>
                  </div>
                  <div className="text-center bg-white/10 rounded-lg p-3">
                    <span className="block text-3xl font-bold text-emerald-200">+{formatCurrency(expansionCalc.expansionValue)}</span>
                    <span className="text-sm text-white/80">Additional Value</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-white/90 justify-center">
                  <TrendingUp className="w-4 h-4" />
                  <span>
                    {((expansionCalc.projectedValue / currentValue - 1) * 100).toFixed(0)}% increase from current state
                  </span>
                </div>
              </div>
              
              <div className="bg-white border border-neutral-200 rounded-lg p-4 mt-4 text-sm text-[#6B7280]">
                <button 
                  type="button"
                  className="flex items-center gap-2 text-[#1F2937] font-medium cursor-default"
                >
                  How we calculated this:
                </button>
                <ul className="mt-2 space-y-1 ml-4 list-disc">
                  <li>Your value per provider: {formatCurrency(valuePerProvider)}</li>
                  <li>× {expansionCalc.targetProviders} providers = {formatCurrency(valuePerProvider * expansionCalc.targetProviders)}</li>
                  <li>× {expansionCalc.utilizationMultiplier.toFixed(2)}x utilization boost ({utilizationRate}% → {expansionCalc.targetUtilization}%)</li>
                  <li>× 1.15x maturity effects (organizations typically see improvement with tenure)</li>
                  <li>= <strong className="text-blue-600">{formatCurrency(expansionCalc.projectedValue)}</strong></li>
                </ul>
              </div>
            </motion.div>
          )}
        </div>
        
        <div className="bg-white border border-neutral-200 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1F2937]">
              How We Measure Value
            </h2>
            <span className="text-xs text-[#6B7280] px-2 py-1 bg-neutral-100 rounded-full">
              3 categories
            </span>
          </div>
          <p className="text-sm text-[#6B7280] mb-4">
            We organize value into three tiers based on how defensible the numbers are
          </p>
          
          <div className="space-y-4">
            {/* Tier 1: Measurable Financial Impact */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="font-semibold text-[#1F2937]">Measurable Financial Impact</span>
                  </div>
                  <p className="text-xs text-[#6B7280] ml-8">Revenue you can track in billing reports</p>
                </div>
                <span className="text-xl font-bold text-emerald-600">{formatCurrency(roiResult.tier1HardValue)}</span>
              </div>
              
              <div className="space-y-2 ml-8 text-sm text-[#6B7280]">
                {roiResult.tier1Breakdown.wrvuValue > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-emerald-100 last:border-0">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                      <TermTooltip {...TERMS.wRVU} /> Lift
                    </span>
                    <span className="font-medium text-emerald-700">{formatCurrency(roiResult.tier1Breakdown.wrvuValue)}</span>
                  </div>
                )}
                {roiResult.tier1Breakdown.timeConversionValue > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-emerald-100 last:border-0">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                      {valueConfig.timeConversionMethod === 'patientAccess' 
                        ? `Additional Patient Access`
                        : 'Overtime Cost Reduction'}
                    </span>
                    <span className="font-medium text-emerald-700">{formatCurrency(roiResult.tier1Breakdown.timeConversionValue)}</span>
                  </div>
                )}
                {roiResult.tier1Breakdown.retentionValue > 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                      Retention Value
                    </span>
                    <span className="font-medium text-emerald-700">{formatCurrency(roiResult.tier1Breakdown.retentionValue)}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tier 2: Operational Gains */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div>
                  <span className="font-semibold text-[#1F2937]">Operational Gains</span>
                  <span className="text-xs text-blue-600 ml-2 px-2 py-0.5 bg-blue-100 rounded-full">Time-based</span>
                </div>
              </div>
              <p className="text-xs text-[#6B7280] ml-8 mb-3">Real improvements, but harder to convert to dollars</p>
              
              <div className="space-y-2 ml-8 text-sm text-[#6B7280]">
                {roiResult.tier2EfficiencyMetrics.hoursSaved > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-blue-100 last:border-0">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                      Documentation time saved
                    </span>
                    <span className="font-medium text-blue-600">{roiResult.tier2EfficiencyMetrics.hoursSaved.toLocaleString()} hrs/year</span>
                  </div>
                )}
                {roiResult.tier2EfficiencyMetrics.pajamaTimeWeekly > 0 && (
                  <div className="flex items-center justify-between py-1 border-b border-blue-100 last:border-0">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                      <TermTooltip {...TERMS.pajamaTime} /> eliminated
                    </span>
                    <span className="font-medium text-blue-600">{roiResult.tier2EfficiencyMetrics.pajamaTimeWeekly} hrs/week</span>
                  </div>
                )}
                {roiResult.tier2EfficiencyMetrics.chartClosureImprovement > 0 && (
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                      Same-day chart closure
                    </span>
                    <span className="font-medium text-blue-600">+{roiResult.tier2EfficiencyMetrics.chartClosureImprovement}%</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tier 3: Leading Indicators */}
            {roiResult.tier3LeadingIndicators.satisfactionImprovement > 0 && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-white border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                    <Smile className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#1F2937]">Leading Indicators</span>
                    <span className="text-xs text-purple-600 ml-2 px-2 py-0.5 bg-purple-100 rounded-full">Experience</span>
                  </div>
                </div>
                <p className="text-xs text-[#6B7280] ml-8 mb-3">Signals that predict long-term success</p>
                
                <div className="ml-8 text-sm text-[#6B7280]">
                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                      Clinician satisfaction
                    </span>
                    <span className="font-medium text-purple-600">
                      {roiResult.tier3LeadingIndicators.satisfactionBefore} → {roiResult.tier3LeadingIndicators.satisfactionAfter}
                      <span className="text-purple-500 ml-1">(+{roiResult.tier3LeadingIndicators.satisfactionImprovement.toFixed(0)} pts)</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Trend Analysis Section - shown when user has entered trend data */}
        {(() => {
          const metricsWithTrendData = (Object.keys(metricEntryModes) as (keyof typeof metricEntryModes)[])
            .filter(metric => {
              if (metricEntryModes[metric] !== 'trend') return false;
              const trendData = metricTrendData[metric];
              return trendData && (trendData.baseline !== null || trendData.monthlyData.some((v: number | null) => v !== null));
            });
          
          if (metricsWithTrendData.length === 0) return null;
          
          const METRIC_DISPLAY: Record<string, { label: string; color: string; unit: string }> = {
            wrvuCapture: { label: 'wRVU Capture', color: '#059669', unit: 'wRVUs' },
            timeSavings: { label: 'Time Savings', color: '#2563eb', unit: 'min' },
            chartClosure: { label: 'Chart Closure', color: '#7c3aed', unit: '%' },
            workOutsideWork: { label: 'Pajama Time', color: '#dc2626', unit: 'min' },
            clinicianSatisfaction: { label: 'Satisfaction', color: '#ea580c', unit: '/10' },
            levelOfService: { label: 'Level of Service', color: '#0d9488', unit: 'avg' },
          };
          
          return (
            <motion.div 
              className="bg-white border border-neutral-200 rounded-xl p-4 md:p-6 mb-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#1F2937]">Your Journey</h2>
                  <p className="text-xs text-[#6B7280]">Monthly progression from your trend data</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metricsWithTrendData.map((metric) => {
                  const trendData = metricTrendData[metric];
                  const display = METRIC_DISPLAY[metric] || { label: metric, color: '#6B7280', unit: '' };
                  
                  const chartData = [
                    { month: 'Baseline', value: trendData.baseline },
                    ...trendData.monthlyData.map((val: number | null, i: number) => ({
                      month: `M${i + 1}`,
                      value: val,
                    })),
                  ].filter(d => d.value !== null);
                  
                  if (chartData.length < 2) return null;
                  
                  const values = chartData.map(d => d.value as number);
                  const minVal = Math.min(...values);
                  const maxVal = Math.max(...values);
                  const range = maxVal - minVal;
                  const yMin = Math.floor(minVal - range * 0.1);
                  const yMax = Math.ceil(maxVal + range * 0.1);
                  
                  const change = values[values.length - 1] - values[0];
                  const changePercent = values[0] !== 0 ? ((change / values[0]) * 100) : 0;
                  const isPositive = metric === 'workOutsideWork' ? change < 0 : change > 0;
                  
                  return (
                    <motion.div 
                      key={metric}
                      className="bg-neutral-50 rounded-lg p-4"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-[#1F2937]">{display.label}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
                        </span>
                      </div>
                      
                      {/* Y-axis label */}
                      <div className="text-[9px] text-[#9CA3AF] text-center mb-1 uppercase tracking-wide">
                        {display.unit}
                      </div>
                      
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 10, fill: '#9CA3AF' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis 
                              domain={[yMin, yMax]}
                              tick={{ fontSize: 10, fill: '#9CA3AF' }}
                              axisLine={false}
                              tickLine={false}
                              width={35}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                              formatter={(value: number) => [`${value.toFixed(2)} ${display.unit}`, display.label]}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke={display.color} 
                              strokeWidth={2}
                              dot={{ r: 3, fill: display.color, strokeWidth: 0 }}
                              activeDot={{ r: 5, fill: display.color, strokeWidth: 2, stroke: 'white' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 text-xs text-[#6B7280]">
                        <span>Start: {values[0].toFixed(2)}</span>
                        <span>Current: {values[values.length - 1].toFixed(2)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })()}
        
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#6B7280]" />
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Methodology</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm text-[#6B7280]">
            <div>wRVU valued at ${EXPAND_ROI_DEFAULTS.dollarPerWRVU} (Medicare blended conversion factor)</div>
            <div>{Math.round(valueConfig.wrvuAttribution * 100)}% attribution to Abridge {valueConfig.wrvuAttribution <= 0.5 ? '(conservative)' : valueConfig.wrvuAttribution >= 0.6 ? '(optimistic)' : ''}</div>
          </div>
        </div>
        
        {roiResult.warnings.length > 0 && (
          <div className="space-y-2 mb-8">
            {roiResult.warnings.map((warning, idx) => (
              <div 
                key={idx} 
                className={`flex items-start gap-2 p-3 border rounded-lg ${
                  warning.severity === "info" 
                    ? "bg-blue-50 border-blue-200 text-blue-700" 
                    : "bg-amber-50 border-amber-200 text-amber-700"
                }`}
              >
                {warning.severity === "info" ? (
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <span className="text-sm font-medium block">{warning.title}</span>
                  <span className="text-xs">{warning.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        </div>

      <PDFExportModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        onExport={handleExportPDF}
        isGenerating={isExporting}
      />
    </div>
  );
}
