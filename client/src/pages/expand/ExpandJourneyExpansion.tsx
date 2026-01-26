import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, Share2, FileText, Mail, Link, Target, Lightbulb, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceDot } from "recharts";
import { useToast } from "@/hooks/use-toast";
import type { DeploymentData, MetricType, MetricsData } from "./ExpandFlow";
import { type ValueConfigData, calculateTieredROI, type CalculationInputs, EXPAND_ROI_DEFAULTS } from "@/lib/expandRoiCalculator";

interface ExpandJourneyExpansionProps {
  deploymentData: DeploymentData;
  metricsData: MetricsData;
  selectedMetrics: MetricType[];
  valueConfig: ValueConfigData;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function ExpandJourneyExpansion({
  deploymentData,
  metricsData,
  selectedMetrics,
  valueConfig,
  onBack,
  onBackToJourney,
}: ExpandJourneyExpansionProps) {
  
  const providers = deploymentData.providers || 100;
  const utilizationRate = deploymentData.utilizationRate || 70;
  
  const [expansionTarget, setExpansionTarget] = useState<{
    providers: number | "";
    utilization: number | "";
  }>({
    providers: "",
    utilization: "",
  });

  // Validation states
  const providerError = useMemo(() => {
    if (expansionTarget.providers === "") return null;
    if (typeof expansionTarget.providers === "number" && expansionTarget.providers <= providers) {
      return `Expansion must be greater than current ${providers} providers`;
    }
    return null;
  }, [expansionTarget.providers, providers]);

  const utilizationError = useMemo(() => {
    if (expansionTarget.utilization === "") return null;
    if (typeof expansionTarget.utilization === "number" && (expansionTarget.utilization < 50 || expansionTarget.utilization > 90)) {
      return "Utilization must be between 50% and 90%";
    }
    return null;
  }, [expansionTarget.utilization]);

  // Check if valid expansion data is entered
  const hasValidExpansion = useMemo(() => {
    return (
      typeof expansionTarget.providers === "number" && 
      expansionTarget.providers > providers &&
      typeof expansionTarget.utilization === "number" &&
      expansionTarget.utilization >= 50 &&
      expansionTarget.utilization <= 90
    );
  }, [expansionTarget, providers]);

  const encounters = deploymentData.annualEncounters || 65000;
  const months = deploymentData.monthsOnAbridge || 6;

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

  // Map to old structure for backward compatibility
  const calculatedROI = useMemo(() => {
    return {
      totalValue: roiResult.tier1HardValue,
      netValue: roiResult.netValue,
      roi: roiResult.roi,
      annualInvestment: roiResult.investment,
    };
  }, [roiResult]);

  // Value per provider (from their actual data)
  const valuePerProvider = calculatedROI.totalValue / providers;

  // Generate smart X-axis ticks
  const generateXAxisTicks = useCallback((start: number, end: number, count: number = 6) => {
    const ticks = [];
    const step = (end - start) / (count - 1);
    for (let i = 0; i < count; i++) {
      ticks.push(Math.round(start + step * i));
    }
    return ticks;
  }, []);

  // Generate curve data points - only if valid expansion data
  const chartData = useMemo(() => {
    const points = [];
    const currentProviders = providers;
    
    // If no valid expansion, create a range to show context
    if (!hasValidExpansion) {
      // Default range: current to 2.5x current
      const defaultMax = Math.round(currentProviders * 2.5);
      const steps = 20;
      
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const providerCount = Math.round(currentProviders + (defaultMax - currentProviders) * progress);
        points.push({
          providers: providerCount,
          value: i === 0 ? calculatedROI.netValue : undefined, // Only current point has value
          linearValue: undefined,
          isCurrent: i === 0,
          isTarget: false,
        });
      }
      return points;
    }

    const targetProviders = expansionTarget.providers as number;
    const targetUtilization = expansionTarget.utilization as number;
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const providerCount = Math.round(currentProviders + (targetProviders - currentProviders) * progress);

      // Utilization improves as adoption matures
      const utilization = (
        utilizationRate + 
        (targetUtilization - utilizationRate) * progress
      ) / 100;

      // Value scales with providers and utilization improvement
      const utilizationMultiplier = utilization / (utilizationRate / 100);
      const value = valuePerProvider * providerCount * utilizationMultiplier;
      
      // Linear projection (simpler growth, no utilization improvement)
      const linearValue = valuePerProvider * providerCount;

      points.push({
        providers: providerCount,
        value: Math.round(value),
        linearValue: Math.round(linearValue),
        isCurrent: i === 0,
        isTarget: i === steps,
      });
    }

    return points;
  }, [providers, expansionTarget, valuePerProvider, utilizationRate, hasValidExpansion, calculatedROI.netValue]);

  // Calculate X-axis domain and ticks
  const xAxisConfig = useMemo(() => {
    const start = providers;
    const end = hasValidExpansion 
      ? (expansionTarget.providers as number)
      : Math.round(providers * 2.5);
    
    const ticks = generateXAxisTicks(start, end, 6);
    return { start, end, ticks };
  }, [providers, hasValidExpansion, expansionTarget.providers, generateXAxisTicks]);

  // Calculate Y-axis domain with padding
  const yAxisConfig = useMemo(() => {
    const maxValue = hasValidExpansion 
      ? chartData[chartData.length - 1].value || 0
      : calculatedROI.netValue;
    const minValue = 0;
    const maxWithPadding = Math.round(maxValue * 1.1); // 10% padding at top
    return { min: minValue, max: maxWithPadding };
  }, [hasValidExpansion, chartData, calculatedROI.netValue]);

  const currentValue = calculatedROI.netValue;
  const targetValue = hasValidExpansion ? (chartData[chartData.length - 1].value ?? 0) : 0;
  const expansionValue = hasValidExpansion ? targetValue - currentValue : 0;

  const { toast } = useToast();

  const handleExportPDF = useCallback(() => {
    const formatCurrency = (val: number) => 
      val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : `$${val.toLocaleString()}`;

    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Abridge ROI - Expansion Report</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #E5E7EB; }
          .logo { font-size: 24px; font-weight: bold; color: #EA2C00; }
          .date { color: #6B7280; font-size: 12px; }
          h1 { font-size: 28px; margin-bottom: 8px; }
          .subtitle { color: #6B7280; margin-bottom: 30px; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
          .stat-card { background: #F9FAFB; border-radius: 12px; padding: 20px; text-align: center; }
          .stat-card.dark { background: #1e293b; color: white; }
          .stat-card.green { background: #ECFDF5; border: 1px solid #10B981; }
          .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; margin-bottom: 8px; }
          .stat-card.dark .stat-label { color: #9CA3AF; }
          .stat-card.green .stat-label { color: #059669; }
          .stat-value { font-size: 28px; font-weight: bold; }
          .stat-card.green .stat-value { color: #059669; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #E5E7EB; }
          .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .comparison-card { padding: 20px; border-radius: 12px; border: 1px solid #E5E7EB; }
          .comparison-card.current { border-left: 4px solid #f97316; }
          .comparison-card.target { border-left: 4px solid #10B981; background: #ECFDF5; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
          .row:last-child { border-bottom: none; }
          .row-label { color: #6B7280; }
          .row-value { font-weight: 600; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ABRIDGE</div>
          <div class="date">Generated ${new Date().toLocaleDateString()}</div>
        </div>
        
        <h1>Your Growth Trajectory</h1>
        <p class="subtitle">Based on your proven results</p>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Current Net Value</div>
            <div class="stat-value">${formatCurrency(currentValue)}</div>
          </div>
          <div class="stat-card dark">
            <div class="stat-label">Return on Investment</div>
            <div class="stat-value">${calculatedROI.roi.toFixed(1)}x</div>
          </div>
          <div class="stat-card green">
            <div class="stat-label">Expansion Value</div>
            <div class="stat-value">${hasValidExpansion ? '+' + formatCurrency(expansionValue) : '$0'}</div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Expansion Comparison</div>
          <div class="comparison">
            <div class="comparison-card current">
              <h3 style="font-size: 14px; margin-bottom: 16px;">CURRENT STATE</h3>
              <div class="row">
                <span class="row-label">Providers</span>
                <span class="row-value">${providers}</span>
              </div>
              <div class="row">
                <span class="row-label">Utilization</span>
                <span class="row-value">${utilizationRate}%</span>
              </div>
              <div class="row">
                <span class="row-label">Annual Value</span>
                <span class="row-value" style="color: #059669;">${formatCurrency(currentValue)}</span>
              </div>
            </div>
            ${hasValidExpansion ? `
            <div class="comparison-card target">
              <h3 style="font-size: 14px; margin-bottom: 16px;">EXPANSION TARGET</h3>
              <div class="row">
                <span class="row-label">Providers</span>
                <span class="row-value">${expansionTarget.providers}</span>
              </div>
              <div class="row">
                <span class="row-label">Utilization</span>
                <span class="row-value">${expansionTarget.utilization}%</span>
              </div>
              <div class="row">
                <span class="row-label">Projected Value</span>
                <span class="row-value" style="color: #059669;">${formatCurrency(targetValue)}</span>
              </div>
            </div>
            ` : `
            <div class="comparison-card">
              <p style="color: #6B7280; text-align: center; padding: 40px 0;">Enter expansion targets to see projections</p>
            </div>
            `}
          </div>
        </div>
        
        ${hasValidExpansion ? `
        <div class="section">
          <div class="section-title">How We Calculated This</div>
          <ul style="color: #6B7280; padding-left: 20px; line-height: 1.8;">
            <li>Value per provider: <strong style="color: #111827;">${formatCurrency(Math.round(valuePerProvider))}</strong></li>
            <li>Scales with providers + utilization improvement</li>
            <li>Utilization: ${utilizationRate}% → ${expansionTarget.utilization}% as adoption matures</li>
          </ul>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Generated by Abridge ROI Calculator • ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
      
      toast({
        title: "PDF Ready",
        description: "Your expansion report is ready to print or save as PDF.",
      });
    }
  }, [currentValue, calculatedROI.roi, hasValidExpansion, expansionValue, providers, utilizationRate, expansionTarget, targetValue, valuePerProvider, toast]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <UnifiedHeader 
        pathType="expand"
        currentStep={7}
        totalSteps={7}
        stepName="Growth Trajectory"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-5xl mx-auto px-6 py-6 md:py-8 pb-10">
        <div className="flex items-center justify-end mb-8">
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            data-testid="button-export"
          >
            <Share2 className="w-4 h-4" />
            Export & Share
          </Button>
        </div>
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Your Growth Trajectory
          </h1>
          <p className="text-[#6B7280]">
            Based on your proven results, here's how value scales with expansion
          </p>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10">
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-center" data-testid="summary-net-value">
            <span className="block text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-2">
              CURRENT NET VALUE
            </span>
            <span className="text-3xl font-bold text-[#111827]">
              ${currentValue.toLocaleString()}
            </span>
          </div>
          
          <div className="bg-[#1e293b] rounded-2xl p-6 text-center" data-testid="summary-roi">
            <span className="block text-xs font-semibold text-neutral-400 tracking-wider uppercase mb-2">
              RETURN ON INVESTMENT
            </span>
            <span className="text-3xl font-bold text-white">
              {calculatedROI.roi.toFixed(1)}x
            </span>
          </div>
          
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center" data-testid="summary-expansion">
            <span className="block text-xs font-semibold text-emerald-700 tracking-wider uppercase mb-2">
              EXPANSION VALUE
            </span>
            {hasValidExpansion ? (
              <span className="text-3xl font-bold text-emerald-600">
                +${expansionValue >= 1000000 
                  ? `${(expansionValue / 1000000).toFixed(1)}M` 
                  : expansionValue.toLocaleString()}
              </span>
            ) : (
              <div>
                <span className="text-3xl font-bold text-emerald-600">$0</span>
                <p className="text-xs text-emerald-600 mt-1">Enter targets below</p>
              </div>
            )}
          </div>
        </div>

        {/* Growth Chart */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 mb-10">
          <div className="h-[400px] relative">
            {!hasValidExpansion && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="bg-white/90 px-6 py-4 rounded-xl border border-neutral-200 text-center">
                  <p className="text-[#6B7280] text-sm">Enter expansion targets below to see growth projection</p>
                </div>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                <defs>
                  <linearGradient id="journeyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="providers"
                  type="number"
                  domain={[xAxisConfig.start, xAxisConfig.end]}
                  ticks={xAxisConfig.ticks}
                  allowDecimals={false}
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={(value) => String(Math.round(value))}
                  label={{
                    value: "PROVIDERS",
                    position: "bottom",
                    fill: "#94a3b8",
                    fontSize: 11,
                    offset: 20,
                  }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  domain={[0, yAxisConfig.max]}
                  tickFormatter={(v) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${Math.round(v / 1000)}K`}
                  width={70}
                />

                {/* Linear projection line - dashed, only when expansion entered */}
                {hasValidExpansion && (
                  <Area
                    type="monotone"
                    dataKey="linearValue"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="none"
                  />
                )}

                {/* Main growth curve - only when expansion entered */}
                {hasValidExpansion && (
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#059669"
                    strokeWidth={3}
                    fill="url(#journeyGradient)"
                    animationDuration={800}
                    animationEasing="ease-out"
                  />
                )}

                {/* Current marker - always visible */}
                <ReferenceDot
                  x={chartData[0].providers}
                  y={chartData[0].value ?? currentValue}
                  r={10}
                  fill="#f97316"
                  stroke="white"
                  strokeWidth={3}
                />

                {/* Target marker - only when valid expansion */}
                {hasValidExpansion && chartData[chartData.length - 1].value !== undefined && (
                  <ReferenceDot
                    x={chartData[chartData.length - 1].providers}
                    y={chartData[chartData.length - 1].value!}
                    r={10}
                    fill="#059669"
                    stroke="white"
                    strokeWidth={3}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-neutral-100 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f97316]" />
              <span className="text-sm text-[#6B7280]">Pilot (Today)</span>
            </div>
            {hasValidExpansion && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 bg-emerald-600" />
                  <span className="text-sm text-[#6B7280]">Projected value (with compounding)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-0.5 border-t-2 border-dashed border-[#9CA3AF]" />
                  <span className="text-sm text-[#6B7280]">Linear projection</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-600" />
                  <span className="text-sm text-[#6B7280]">Full Scale</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Model Your Expansion */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-[#f97316]" />
            <h2 className="text-lg font-semibold text-[#111827]">MODEL YOUR EXPANSION</h2>
          </div>
          <p className="text-sm text-[#6B7280] mb-6 ml-9">
            Model what full-scale deployment could look like if you expand beyond your current pilot.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Current State */}
            <div className="border-l-4 border-[#f97316] bg-white border border-neutral-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-[#f97316]" />
                <div>
                  <h3 className="font-semibold text-[#111827]">CURRENT STATE</h3>
                  <p className="text-xs text-[#6B7280]">Your proven results</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Providers</span>
                  <span className="font-semibold text-[#111827]">{providers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#6B7280]">Utilization</span>
                  <span className="font-semibold text-[#111827]">{utilizationRate}%</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-neutral-100">
                  <span className="text-sm text-[#6B7280]">Annual Value</span>
                  <span className="font-bold text-emerald-600">${currentValue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center text-4xl text-neutral-300">
              →
            </div>

            {/* Target State */}
            <div className="border-l-4 border-emerald-500 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <div>
                  <h3 className="font-semibold text-[#111827]">EXPANSION TARGET</h3>
                  <p className="text-xs text-[#6B7280]">What if you scaled to more providers?</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#6B7280] block mb-1">Total providers</label>
                  <input
                    type="number"
                    value={expansionTarget.providers}
                    placeholder="e.g., 150"
                    onChange={(e) => setExpansionTarget({
                      ...expansionTarget,
                      providers: e.target.value === "" ? "" : Number(e.target.value),
                    })}
                    className={`w-full px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      providerError ? "border-red-300" : "border-emerald-200"
                    }`}
                    data-testid="input-expansion-providers"
                  />
                  {providerError && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      {providerError}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-[#6B7280] block mb-1">Target utilization</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={expansionTarget.utilization}
                      placeholder="e.g., 75"
                      onChange={(e) => setExpansionTarget({
                        ...expansionTarget,
                        utilization: e.target.value === "" ? "" : Number(e.target.value),
                      })}
                      className={`flex-1 px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        utilizationError ? "border-red-300" : "border-emerald-200"
                      }`}
                      data-testid="input-expansion-utilization"
                    />
                    <span className="text-sm text-[#6B7280]">%</span>
                  </div>
                  {utilizationError && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                      <AlertCircle className="w-3 h-3" />
                      {utilizationError}
                    </div>
                  )}
                </div>
                {hasValidExpansion && (
                  <div className="flex justify-between pt-3 border-t border-emerald-200">
                    <span className="text-sm text-[#6B7280]">Projected Value</span>
                    <span className="font-bold text-emerald-600">${targetValue.toLocaleString()}</span>
                  </div>
                )}
                {hasValidExpansion && (
                  <div className="bg-emerald-100 rounded-lg p-3 text-center mt-2">
                    <span className="text-xs text-emerald-700 font-medium">EXPANSION VALUE</span>
                    <p className="text-lg font-bold text-emerald-600">
                      +${expansionValue >= 1000000 
                        ? `${(expansionValue / 1000000).toFixed(1)}M` 
                        : expansionValue.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calculation Transparency - only show when valid expansion */}
        {hasValidExpansion && (
          <div className="flex items-start gap-3 p-5 bg-neutral-50 border border-neutral-200 rounded-xl mb-10">
            <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#111827]">How we calculated this:</strong>
              <ul className="text-sm text-[#6B7280] mt-2 space-y-1">
                <li>• Your current value per provider: <strong>${Math.round(valuePerProvider).toLocaleString()}</strong></li>
                <li>• Scales with providers + utilization improvement</li>
                <li>• Assumes utilization increases from {utilizationRate}% → {expansionTarget.utilization}% as adoption matures</li>
              </ul>
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" className="gap-2" onClick={handleExportPDF} data-testid="button-export-pdf">
            <FileText className="w-4 h-4" />
            Export as PDF
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-share-email">
            <Mail className="w-4 h-4" />
            Share via Email
          </Button>
          <Button variant="outline" className="gap-2" data-testid="button-copy-link">
            <Link className="w-4 h-4" />
            Copy Link
          </Button>
        </div>
      </main>
    </div>
  );
}
