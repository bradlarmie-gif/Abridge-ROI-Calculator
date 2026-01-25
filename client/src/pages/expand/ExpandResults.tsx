import { useState, useMemo } from "react";
import { ArrowLeft, DollarSign, TrendingUp, Rocket, Clock, Moon, Smile, FileText, Mail, Link, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot, Area } from "recharts";
import { useToast } from "@/hooks/use-toast";
import type { DeploymentData, MetricType, MetricsData, TimelineData } from "./ExpandFlow";
import { type ValueConfigData, calculateTieredROI, type CalculationInputs, EXPAND_ROI_DEFAULTS, formatCurrency } from "@/lib/expandRoiCalculator";

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

  const handleExportPDF = () => {
    toast({ title: "Export feature", description: "PDF export coming soon" });
  };
  
  const handleShareEmail = () => {
    toast({ title: "Share feature", description: "Email sharing coming soon" });
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
          <Button variant="outline" size="sm" onClick={handleExportPDF} data-testid="button-export-pdf">
            <FileText className="w-4 h-4 mr-1" /> Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareEmail} data-testid="button-share-email">
            <Mail className="w-4 h-4 mr-1" /> Share
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
              <div key={idx} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium block">{warning.title}</span>
                  <span className="text-xs">{warning.message}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf-bottom">
            <FileText className="w-4 h-4 mr-2" /> Export as PDF
          </Button>
          <Button variant="outline" onClick={handleShareEmail} data-testid="button-share-email-bottom">
            <Mail className="w-4 h-4 mr-2" /> Share via Email
          </Button>
          <Button variant="outline" onClick={handleCopyLink} data-testid="button-copy-link-bottom">
            <Link className="w-4 h-4 mr-2" /> Copy Link
          </Button>
        </div>
      </div>
    </div>
  );
}
