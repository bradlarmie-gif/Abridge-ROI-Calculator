import { useState, useMemo } from "react";
import { ArrowLeft, Share2, FileText, Mail, Link, Target, Lightbulb, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceDot } from "recharts";
import type { DeploymentData, MetricType, MetricsData } from "./ExpandFlow";

interface ExpandJourneyExpansionProps {
  deploymentData: DeploymentData;
  metricsData: MetricsData;
  selectedMetrics: MetricType[];
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function ExpandJourneyExpansion({
  deploymentData,
  metricsData,
  selectedMetrics,
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

  // Calculate value from their actual data
  const calculatedROI = useMemo(() => {
    const abridgeEncounters = (deploymentData.annualEncounters || 0) * (utilizationRate / 100);
    const conversionRate = 0.50;
    const wrvuConversionFactor = 33;
    
    let timeSavingsValue = 0;
    let wrvuValue = 0;
    let workOutsideValue = 0;

    if (selectedMetrics.includes("timeSavings") && metricsData.timeSavings.before && metricsData.timeSavings.after) {
      const minutesSaved = metricsData.timeSavings.before - metricsData.timeSavings.after;
      const hoursSaved = (minutesSaved * abridgeEncounters) / 60;
      timeSavingsValue = hoursSaved * 150 * conversionRate;
    }

    if (selectedMetrics.includes("wrvuCapture") && metricsData.wrvuCapture.before && metricsData.wrvuCapture.after) {
      const wrvuLift = metricsData.wrvuCapture.after - metricsData.wrvuCapture.before;
      const incrementalWrvus = wrvuLift * abridgeEncounters;
      wrvuValue = incrementalWrvus * wrvuConversionFactor * conversionRate;
    }

    if (selectedMetrics.includes("workOutsideWork") && metricsData.workOutsideWork.before && metricsData.workOutsideWork.after) {
      const hoursReclaimed = metricsData.workOutsideWork.before - metricsData.workOutsideWork.after;
      workOutsideValue = hoursReclaimed * 48 * providers * 50 * conversionRate;
    }

    const totalValue = timeSavingsValue + wrvuValue + workOutsideValue;
    const monthlyPerProvider = 250;
    const annualInvestment = providers * monthlyPerProvider * 12;
    const netValue = totalValue - annualInvestment;
    const roi = annualInvestment > 0 ? totalValue / annualInvestment : 0;

    return { totalValue, netValue, roi, annualInvestment };
  }, [deploymentData, metricsData, selectedMetrics, providers, utilizationRate]);

  // Value per provider (from their actual data)
  const valuePerProvider = calculatedROI.totalValue / providers;

  // Generate curve data points - only if valid expansion data
  const chartData = useMemo(() => {
    const points = [];
    const currentProviders = providers;
    
    // If no valid expansion, just return current point
    if (!hasValidExpansion) {
      return [{
        providers: currentProviders,
        value: calculatedROI.netValue,
        isCurrent: true,
        isTarget: false,
      }];
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

      points.push({
        providers: providerCount,
        value: Math.round(value),
        isCurrent: i === 0,
        isTarget: i === steps,
      });
    }

    return points;
  }, [providers, expansionTarget, valuePerProvider, utilizationRate, hasValidExpansion, calculatedROI.netValue]);

  const currentValue = calculatedROI.netValue;
  const targetValue = hasValidExpansion ? chartData[chartData.length - 1].value : 0;
  const expansionValue = hasValidExpansion ? targetValue - currentValue : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <GlobalHeader pageName="Expand Journey" currentStep={5} totalSteps={5} onLogoClick={onBackToJourney} />

      <main className="max-w-5xl mx-auto px-6 pt-[96px] pb-10">
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-500 flex items-center gap-1 -ml-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
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
        <div className="grid grid-cols-3 gap-6 mb-10">
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
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
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
                  tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                  width={70}
                />

                {hasValidExpansion && (
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#059669"
                    strokeWidth={3}
                    fill="url(#journeyGradient)"
                  />
                )}

                {/* Current marker - always visible */}
                <ReferenceDot
                  x={chartData[0].providers}
                  y={chartData[0].value}
                  r={10}
                  fill="#f97316"
                  stroke="white"
                  strokeWidth={3}
                />

                {/* Target marker - only when valid expansion */}
                {hasValidExpansion && (
                  <ReferenceDot
                    x={chartData[chartData.length - 1].providers}
                    y={chartData[chartData.length - 1].value}
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
          <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f97316]" />
              <span className="text-sm text-[#6B7280]">You are here ({providers} providers)</span>
            </div>
            {hasValidExpansion && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
                <span className="text-sm text-[#6B7280]">Your expansion target ({expansionTarget.providers} providers)</span>
              </div>
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
          <Button variant="outline" className="gap-2" data-testid="button-export-pdf">
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
