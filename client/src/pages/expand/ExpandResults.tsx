import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, DollarSign, TrendingUp, Rocket, Clock, Moon, Smile, FileText, Mail, Link, AlertTriangle, Info, ChevronRight, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, Area } from "recharts";
import { useToast } from "@/hooks/use-toast";
import type { DeploymentData, MetricType, MetricsData, TimelineData } from "./ExpandFlow";
import { type ValueConfigData, calculateTieredROI, type CalculationInputs, EXPAND_ROI_DEFAULTS, formatCurrency } from "@/lib/expandRoiCalculator";
import { generateExpandROIPDFBlob, generateExpandROIPDF, type ExpandPDFData } from "@/lib/expand-pdf-generator";

interface ExpandResultsProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  timelineData: TimelineData;
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
  const [investmentPerProvider, setInvestmentPerProvider] = useState(EXPAND_ROI_DEFAULTS.investmentPerProvider);

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
  const currentInvestment = providers * investmentPerProvider * 12;
  const currentROI = currentInvestment > 0 ? currentValue / currentInvestment : 0;

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
    const projectedInvestment = targetProvidersNum * investmentPerProvider * 12;
    const projectedROI = projectedInvestment > 0 ? projectedValue / projectedInvestment : 0;
    const expansionValue = projectedValue - currentValue;
    
    return {
      projectedValue,
      projectedInvestment,
      projectedROI,
      expansionValue,
      providerMultiplier,
      utilizationMultiplier,
      maturityMultiplier,
      targetProviders: targetProvidersNum,
      targetUtilization: targetUtil,
    };
  }, [targetProviders, targetUtilization, providers, utilizationRate, currentValue, investmentPerProvider]);

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
  }, [currentValue, months, expansionCalc]);

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
  const [isSharing, setIsSharing] = useState(false);

  const buildPDFData = useCallback((): ExpandPDFData => {
    const documentedEncounters = Math.round(encounters * utilizationRate / 100);
    
    const metrics: ExpandPDFData['metrics'] = [];
    
    // Helper to convert timeline data to trend array
    const getTrend = (timelinePoints: typeof timelineData.timeSavings) => {
      const validPoints = timelinePoints.filter(p => p.value !== null);
      if (validPoints.length < 2) return undefined;
      return validPoints.map(p => ({ month: p.month, value: p.value as number, label: p.label }));
    };
    
    // wRVU metric with full details
    if (roiResult.tier1Breakdown.wrvuValue > 0 || metricsData.wrvuCapture.before || metricsData.wrvuCapture.after) {
      const wrvuLift = (metricsData.wrvuCapture.after || 0) - (metricsData.wrvuCapture.before || 0);
      const wrvuLiftPercent = metricsData.wrvuCapture.before ? (wrvuLift / metricsData.wrvuCapture.before) * 100 : 0;
      const isAboveTypical = wrvuLiftPercent > 7;
      const isBelowTypical = wrvuLiftPercent < 3 && wrvuLiftPercent > 0;
      const wrvuTrend = getTrend(timelineData.wrvuCapture);
      
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
        formula: `+${wrvuLift.toFixed(2)} wRVU/enc × ${documentedEncounters.toLocaleString()} encounters × $${EXPAND_ROI_DEFAULTS.dollarPerWRVU}/wRVU × 50% attribution`,
        formulaExplanation: `We use Medicare's $33 conversion factor and 50% attribution to Abridge. If your payer mix is commercial-heavy (where conversion factors run $45-65), actual revenue impact may be 30-50% higher.`,
        whatThisMeans: `wRVU improvement indicates that documentation is capturing more of the clinical complexity that was always present in your encounters. This isn't about changing how providers practice—it's about making sure the note reflects what actually happened in the room.${isAboveTypical ? ` The ${wrvuLiftPercent.toFixed(0)}% lift you're seeing is substantial. If confirmed, it suggests there was significant under-documentation in your baseline state.` : ''}`,
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
      const timeTrend = getTrend(timelineData.timeSavings);
      
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
        whatThisMeans: `Each minute saved per encounter translates to ${Math.round(timeSaved * documentedEncounters / 60).toLocaleString()} hours annually. This time can go toward patient care, work-life balance, or additional encounters—depending on your organizational priorities.`,
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
      const wowTrend = getTrend(timelineData.workOutsideWork);
      
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
        whatThisMeans: `Reducing after-hours documentation by ${hoursReduced.toFixed(1)} hours per week per provider directly improves work-life balance. This is often the most emotionally resonant metric for clinicians—it represents time reclaimed for family, rest, and personal pursuits.`,
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
        whatThisMeans: `Same-day chart closure improves billing cycle times, reduces compliance risk, and indicates providers are completing documentation in real-time rather than batching. A ${closureImprovement > 0 ? `+${closureImprovement}%` : `${closureImprovement}%`} improvement suggests AI-assisted documentation is enabling more efficient workflows.`,
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
      const satTrend = getTrend(timelineData.clinicianSatisfaction);
      
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
        whatThisMeans: `Clinician satisfaction is a leading indicator of retention. Organizations typically see satisfaction improvements 3-6 months before measurable retention benefits. A ${satImprovement > 0 ? `+${satImprovement}` : satImprovement} point improvement indicates meaningful positive impact on provider experience.`,
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
    
    // Generate "What's Working Well" based on metrics
    const workingWell: string[] = [];
    const wrvuMetric = metrics.find(m => m.id === 'wrvu');
    if (wrvuMetric && wrvuMetric.changePercent > 0) {
      workingWell.push(`wRVU capture showing ${wrvuMetric.benchmark?.status === 'above' ? 'strong' : 'solid'} improvement (${wrvuMetric.changePercent.toFixed(0)}% lift)`);
    }
    const timeMetric = metrics.find(m => m.id === 'timeSavings');
    if (timeMetric && timeMetric.change > 0) {
      workingWell.push(`Time in notes reduced by ${timeMetric.change.toFixed(0)} minutes per encounter`);
    }
    const wowMetric = metrics.find(m => m.id === 'workOutsideWork');
    if (wowMetric && wowMetric.change > 0) {
      workingWell.push(`After-hours work reduced by ${wowMetric.change.toFixed(1)} hours per week`);
    }
    const chartMetric = metrics.find(m => m.id === 'chartClosure');
    if (chartMetric && chartMetric.change > 0) {
      workingWell.push(`Same-day chart closure up ${chartMetric.change.toFixed(0)} percentage points`);
    }
    const satMetric = metrics.find(m => m.id === 'clinicianSatisfaction');
    if (satMetric && satMetric.change > 0) {
      workingWell.push(`Clinician satisfaction improved ${satMetric.change.toFixed(0)} points`);
    }
    // Add default message if nothing is working well yet
    if (workingWell.length === 0) {
      workingWell.push('Data collection in progress—continue monitoring as deployment matures');
    }
    
    // Generate "Areas to Watch"
    const areasToWatch: string[] = [];
    if (utilizationRate < 80) {
      areasToWatch.push(`Utilization at ${utilizationRate}%—room to grow toward 80-85% at maturity`);
    }
    if (wrvuMetric?.benchmark?.status === 'above') {
      areasToWatch.push(`wRVU lift above typical range—recommend validating baseline`);
    }
    if (valueConfig.timeConversionMethod === 'none' || !roiResult.tier1Breakdown.timeConversionValue) {
      areasToWatch.push(`Time savings not yet converting to patient access or overtime reduction`);
    }
    if (areasToWatch.length === 0) {
      areasToWatch.push(`Continue monitoring metrics as deployment matures`);
    }
    
    // Generate optimization opportunities
    const optimizationOpportunities: ExpandPDFData['optimizationOpportunities'] = [];
    
    if (utilizationRate < 80) {
      const utilizationGap = 85 - utilizationRate;
      const potentialValue = Math.round(currentValue * (utilizationGap / utilizationRate) * 0.7);
      optimizationOpportunities.push({
        title: 'Utilization Focus',
        current: `${utilizationRate}%`,
        target: '80-85%',
        potentialValue,
        action: 'Identify providers below 60% and address barriers to adoption',
      });
    }
    
    if (valueConfig.timeConversionMethod === 'none' && roiResult.tier2EfficiencyMetrics.hoursSaved > 0) {
      const hoursSaved = roiResult.tier2EfficiencyMetrics.hoursSaved;
      const potentialValue = Math.round(hoursSaved * 150 * 0.15);
      optimizationOpportunities.push({
        title: 'Time Conversion',
        current: `${hoursSaved.toLocaleString()} hrs/year saved, 0% converted`,
        target: '15-20% conversion to patient access',
        potentialValue,
        action: 'Review scheduling capacity with operations to convert saved time to visits',
      });
    }
    
    if (wrvuMetric?.benchmark?.status === 'above') {
      optimizationOpportunities.push({
        title: 'Validate High Performers',
        current: `${wrvuMetric.changePercent.toFixed(0)}% wRVU lift`,
        target: 'Confirmed methodology',
        potentialValue: 0,
        action: 'Audit baseline methodology, confirm no other initiatives contributing to lift',
      });
    }
    
    return {
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
      investment: currentInvestment,
      roi: currentROI,
      metrics,
      expansion: {
        currentProviders: providers,
        currentUtilization: utilizationRate,
        currentValue: currentValue,
        targetProviders: expansionCalc?.targetProviders || providers * 3,
        targetUtilization: expansionCalc?.targetUtilization || Math.min(utilizationRate + 15, MAX_UTILIZATION),
        projectedValue: expansionCalc?.projectedValue || currentValue * 3,
        investmentPerProvider,
        projectedROI: expansionCalc?.projectedROI || currentROI,
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
  }, [providers, encounters, utilizationRate, months, metricsData, timelineData, valueConfig, roiResult, currentValue, currentInvestment, currentROI, expansionCalc, investmentPerProvider]);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const pdfData = buildPDFData();
      await generateExpandROIPDF(pdfData);
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
  
  const handleShareEmail = async () => {
    setIsSharing(true);
    try {
      const pdfData = buildPDFData();
      const { blob, filename } = await generateExpandROIPDFBlob(pdfData);
      
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: 'application/pdf' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Abridge Value Realization Report',
            text: `Value realization report for ${providers} providers over ${months} months on Abridge`,
          });
          toast({ title: "Shared successfully" });
        } else {
          const url = URL.createObjectURL(blob);
          window.open(`mailto:?subject=Abridge Value Realization Report&body=Please find the attached value realization report. Download: ${window.location.href}`);
          URL.revokeObjectURL(url);
          toast({ title: "Email client opened", description: "Attach the downloaded PDF to share" });
        }
      } else {
        window.open(`mailto:?subject=Abridge Value Realization Report&body=View the value realization report at: ${window.location.href}`);
        toast({ title: "Email client opened" });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Share error:', error);
        toast({ 
          title: "Share failed", 
          description: "There was an error sharing. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsSharing(false);
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
      
      <div className="py-6 md:py-8 px-6 pb-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-end mb-6 gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting} data-testid="button-export-pdf">
            {isExporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
            {isExporting ? 'Generating...' : 'Export PDF'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareEmail} disabled={isSharing} data-testid="button-share-email">
            {isSharing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Share2 className="w-4 h-4 mr-1" />}
            {isSharing ? 'Sharing...' : 'Share'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink} data-testid="button-copy-link">
            <Link className="w-4 h-4 mr-1" /> Copy Link
          </Button>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[#1F2937] mb-2">
            Your Abridge Results
          </h1>
          <p className="text-[#6B7280]">
            {providers} providers · {months} months on Abridge · {utilizationRate}% utilization
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
          <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center" data-testid="card-current-value">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-3xl font-bold text-emerald-600">{formatCurrency(currentValue)}</span>
            <span className="block text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Current Value</span>
            <span className="text-xs text-[#9CA3AF]">Proven results</span>
          </div>
          
          <div className="bg-[#1e293b] rounded-xl p-6 text-center" data-testid="card-roi">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">{currentROI.toFixed(1)}x</span>
            <span className="block text-xs font-medium text-neutral-400 uppercase tracking-wide mt-1">ROI</span>
            <span className="text-xs text-neutral-500">${(investmentPerProvider * providers * 12).toLocaleString()}/yr investment</span>
          </div>
          
          <div className={`rounded-xl p-6 text-center ${expansionCalc ? 'bg-blue-50 border border-blue-200' : 'bg-neutral-50 border border-neutral-200'}`} data-testid="card-expansion">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3 ${expansionCalc ? 'bg-blue-100' : 'bg-neutral-200'}`}>
              <Rocket className={`w-5 h-5 ${expansionCalc ? 'text-blue-600' : 'text-neutral-400'}`} />
            </div>
            <span className={`text-3xl font-bold ${expansionCalc ? 'text-blue-600' : 'text-neutral-400'}`}>
              {expansionCalc ? `+${formatCurrency(expansionCalc.expansionValue)}` : '--'}
            </span>
            <span className="block text-xs font-medium text-[#6B7280] uppercase tracking-wide mt-1">Expansion Potential</span>
            <span className="text-xs text-[#9CA3AF]">
              {expansionCalc ? `At ${expansionCalc.targetProviders} providers` : 'Configure below'}
            </span>
          </div>
        </div>
        
        <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-8">
          <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-4">
            Your Value Journey
          </h2>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={journeyData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
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
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickFormatter={(v) => formatCurrency(v)}
                  width={80}
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
          
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-[#6B7280]">Actual results</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-[#6B7280]">Projected growth</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#EA2C00]"></div>
              <span className="text-[#6B7280]">You are here</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-8">
          <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-4">
            Value Breakdown
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-[#1F2937]">Tier 1: Hard Value</span>
                </div>
                <span className="text-lg font-bold text-emerald-600">{formatCurrency(roiResult.tier1HardValue)}</span>
              </div>
              
              <div className="space-y-2 ml-6 text-sm text-[#6B7280]">
                {roiResult.tier1Breakdown.wrvuValue > 0 && (
                  <div className="flex items-center justify-between">
                    <span>wRVU Lift: +{(metricsData.wrvuCapture.after || 0) - (metricsData.wrvuCapture.before || 0) > 0 
                      ? ((metricsData.wrvuCapture.after || 0) - (metricsData.wrvuCapture.before || 0)).toFixed(2) 
                      : '0'} × {Math.round(encounters * utilizationRate / 100).toLocaleString()} enc × ${EXPAND_ROI_DEFAULTS.dollarPerWRVU} × 50%</span>
                    <span className="font-medium text-[#1F2937]">{formatCurrency(roiResult.tier1Breakdown.wrvuValue)}</span>
                  </div>
                )}
                {roiResult.tier1Breakdown.timeConversionValue > 0 && (
                  <div className="flex items-center justify-between">
                    <span>
                      {valueConfig.timeConversionMethod === 'patientAccess' 
                        ? `Patient Access (${valueConfig.conversionPercent}%)`
                        : 'Overtime Reduction'}
                    </span>
                    <span className="font-medium text-[#1F2937]">{formatCurrency(roiResult.tier1Breakdown.timeConversionValue)}</span>
                  </div>
                )}
                {roiResult.tier1Breakdown.retentionValue > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Retention ({valueConfig.departuresPrevented} departures prevented)</span>
                    <span className="font-medium text-[#1F2937]">{formatCurrency(roiResult.tier1Breakdown.retentionValue)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-[#1F2937]">Tier 2: Efficiency Gains</span>
                <span className="text-xs text-[#6B7280] ml-auto">(not dollarized)</span>
              </div>
              
              <div className="space-y-2 ml-6 text-sm text-[#6B7280]">
                {roiResult.tier2EfficiencyMetrics.hoursSaved > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Time saved
                    </span>
                    <span className="font-medium text-blue-600">{roiResult.tier2EfficiencyMetrics.hoursSaved.toLocaleString()} hours/year</span>
                  </div>
                )}
                {roiResult.tier2EfficiencyMetrics.pajamaTimeWeekly > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Moon className="w-3 h-3" /> Pajama time eliminated
                    </span>
                    <span className="font-medium text-blue-600">-{roiResult.tier2EfficiencyMetrics.pajamaTimeWeekly} hrs/week</span>
                  </div>
                )}
                {roiResult.tier2EfficiencyMetrics.chartClosureImprovement > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Chart closure improvement</span>
                    <span className="font-medium text-blue-600">+{roiResult.tier2EfficiencyMetrics.chartClosureImprovement}%</span>
                  </div>
                )}
              </div>
            </div>
            
            {roiResult.tier3LeadingIndicators.satisfactionImprovement > 0 && (
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Smile className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-[#1F2937]">Tier 3: Leading Indicators</span>
                  <span className="text-xs text-[#6B7280] ml-auto">(qualitative)</span>
                </div>
                
                <div className="ml-6 text-sm text-[#6B7280]">
                  <div className="flex items-center justify-between">
                    <span>Satisfaction improvement</span>
                    <span className="font-medium text-purple-600">
                      {roiResult.tier3LeadingIndicators.satisfactionBefore} → {roiResult.tier3LeadingIndicators.satisfactionAfter} (+{roiResult.tier3LeadingIndicators.satisfactionImprovement.toFixed(1)} points)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-8">
          <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-4">
            Model Your Expansion
          </h2>
          <p className="text-sm text-[#6B7280] mb-6">
            Based on your proven results, here's what full-scale could look like
          </p>
          
          <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-start">
            <div className="bg-neutral-50 rounded-lg p-5">
              <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Current State</h4>
              <div className="space-y-3">
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
            
            <div className="flex items-center justify-center h-full pt-12">
              <ChevronRight className="w-8 h-8 text-neutral-300" />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-4">Expansion Target</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[#6B7280] block mb-1">Total providers</label>
                  <input
                    type="number"
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
                
                <div>
                  <label className="text-sm text-[#6B7280] block mb-1">Investment ($/provider/month)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B7280]">$</span>
                    <input
                      type="number"
                      value={investmentPerProvider}
                      onChange={(e) => setInvestmentPerProvider(e.target.value ? parseInt(e.target.value) : EXPAND_ROI_DEFAULTS.investmentPerProvider)}
                      placeholder="250"
                      min={1}
                      className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
                      data-testid="input-investment"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {expansionCalc && (
            <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-blue-600">{formatCurrency(expansionCalc.projectedValue)}</span>
                  <span className="text-xs text-[#6B7280] uppercase">Projected Annual Value</span>
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-bold text-emerald-600">+{formatCurrency(expansionCalc.expansionValue)}</span>
                  <span className="text-xs text-[#6B7280] uppercase">Expansion Value</span>
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-bold text-[#EA2C00]">{expansionCalc.projectedROI.toFixed(1)}x</span>
                  <span className="text-xs text-[#6B7280] uppercase">Projected ROI</span>
                </div>
              </div>
              
              <div className="bg-white/70 rounded-lg p-4 text-sm text-[#6B7280]">
                <strong className="text-[#1F2937]">How we calculated this:</strong>
                <ul className="mt-2 space-y-1 ml-4 list-disc">
                  <li>Your value per provider: {formatCurrency(valuePerProvider)}</li>
                  <li>× {expansionCalc.targetProviders} providers = {formatCurrency(valuePerProvider * expansionCalc.targetProviders)}</li>
                  <li>× {expansionCalc.utilizationMultiplier.toFixed(2)}x utilization boost ({utilizationRate}% → {expansionCalc.targetUtilization}%)</li>
                  <li>× 1.15x maturity effects</li>
                  <li>= <strong className="text-blue-600">{formatCurrency(expansionCalc.projectedValue)}</strong></li>
                </ul>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#6B7280]" />
            <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Methodology</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-[#6B7280]">
            <div>wRVU at ${EXPAND_ROI_DEFAULTS.dollarPerWRVU} (Medicare blended)</div>
            <div>{Math.round(EXPAND_ROI_DEFAULTS.wrvuAttribution * 100)}% attribution to Abridge</div>
            <div className="flex items-center gap-2">
              Investment: ${investmentPerProvider}/provider/month
              <span className="text-xs text-blue-600">(editable above)</span>
            </div>
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
        
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting} data-testid="button-export-pdf-bottom">
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            {isExporting ? 'Generating...' : 'Export as PDF'}
          </Button>
          <Button variant="outline" onClick={handleShareEmail} disabled={isSharing} data-testid="button-share-email-bottom">
            {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
            {isSharing ? 'Sharing...' : 'Share'}
          </Button>
          <Button variant="outline" onClick={handleCopyLink} data-testid="button-copy-link-bottom">
            <Link className="w-4 h-4 mr-2" /> Copy Link
          </Button>
        </div>
      </div>
    </div>
  );
}
