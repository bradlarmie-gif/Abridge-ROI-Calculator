import { useMemo } from "react";
import { ArrowRight, ArrowLeft, AlertTriangle, Clock, DollarSign, Moon, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeploymentData, MetricType, MetricsData } from "./ExpandFlow";

interface ExpandROIStoryProps {
  deploymentData: DeploymentData;
  metricsData: MetricsData;
  selectedMetrics: MetricType[];
  onNext: () => void;
  onBack: () => void;
}

export default function ExpandROIStory({
  deploymentData,
  metricsData,
  selectedMetrics,
  onNext,
  onBack,
}: ExpandROIStoryProps) {
  
  const abridgeEncounters = useMemo(() => {
    if (deploymentData.annualEncounters && deploymentData.utilizationRate) {
      return Math.round(deploymentData.annualEncounters * (deploymentData.utilizationRate / 100));
    }
    return 0;
  }, [deploymentData]);

  // Calculate ROI values
  const calculations = useMemo(() => {
    const providers = deploymentData.providers || 0;
    const conversionRate = 0.50; // Conservative 50%
    const wrvuConversionFactor = 33; // $/wRVU
    
    let timeSavingsValue = 0;
    let wrvuValue = 0;
    let workOutsideValue = 0;

    // Time Savings Value
    if (selectedMetrics.includes("timeSavings") && metricsData.timeSavings.before && metricsData.timeSavings.after) {
      const minutesSaved = metricsData.timeSavings.before - metricsData.timeSavings.after;
      const hoursSaved = (minutesSaved * abridgeEncounters) / 60;
      const hourlyRate = 150; // Assumed hourly value
      timeSavingsValue = hoursSaved * hourlyRate * conversionRate;
    }

    // wRVU Value
    if (selectedMetrics.includes("wrvuCapture") && metricsData.wrvuCapture.before && metricsData.wrvuCapture.after) {
      const wrvuLift = metricsData.wrvuCapture.after - metricsData.wrvuCapture.before;
      const incrementalWrvus = wrvuLift * abridgeEncounters;
      wrvuValue = incrementalWrvus * wrvuConversionFactor * conversionRate;
    }

    // Work Outside Work Value (Quality of Life)
    if (selectedMetrics.includes("workOutsideWork") && metricsData.workOutsideWork.before && metricsData.workOutsideWork.after) {
      const hoursReclaimed = metricsData.workOutsideWork.before - metricsData.workOutsideWork.after;
      const weeksPerYear = 48;
      workOutsideValue = hoursReclaimed * weeksPerYear * providers * 50 * conversionRate; // $50/hr value
    }

    const totalValue = timeSavingsValue + wrvuValue + workOutsideValue;
    
    // Investment (rough estimate based on providers)
    const monthlyPerProvider = 250;
    const annualInvestment = providers * monthlyPerProvider * 12;
    
    const netValue = totalValue - annualInvestment;
    const roi = annualInvestment > 0 ? totalValue / annualInvestment : 0;

    return {
      timeSavingsValue,
      wrvuValue,
      workOutsideValue,
      totalValue,
      annualInvestment,
      netValue,
      roi,
      providers,
      conversionRate,
      wrvuConversionFactor,
    };
  }, [deploymentData, metricsData, selectedMetrics, abridgeEncounters]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#6B7280] hover:text-[#111827] transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>
          <span className="text-sm font-medium text-[#E85D3F]">ABRIDGE</span>
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <span className="font-semibold text-[#111827]">Step 4</span>
            <span>of 5</span>
            <span className="text-neutral-300">·</span>
            <span>Your ROI</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Your ROI Story
          </h1>
          <p className="text-[#6B7280]">
            Based on your actual Abridge data
          </p>
        </div>

        {/* Hero ROI - TWO METRICS ONLY */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Net Annual Value */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center" data-testid="roi-net-value">
            <span className="text-4xl font-bold text-emerald-600">
              ${Math.round(calculations.netValue).toLocaleString()}
            </span>
            <span className="block text-xs font-semibold text-[#6B7280] tracking-wider uppercase mt-2">
              NET ANNUAL VALUE
            </span>
          </div>

          {/* ROI */}
          <div className="bg-[#1e293b] rounded-2xl p-8 text-center" data-testid="roi-multiple">
            <span className="text-4xl font-bold text-white">
              {calculations.roi.toFixed(1)}x
            </span>
            <span className="block text-xs font-semibold text-neutral-400 tracking-wider uppercase mt-2">
              RETURN ON INVESTMENT
            </span>
          </div>
        </div>

        {/* Summary Line */}
        <div className="flex items-center justify-center gap-6 p-4 text-sm text-[#6B7280] mb-4">
          <span>Total Value: <strong className="text-[#111827]">${Math.round(calculations.totalValue).toLocaleString()}</strong></span>
          <span className="text-neutral-300">│</span>
          <span>Investment: <strong className="text-[#111827]">${Math.round(calculations.annualInvestment).toLocaleString()}</strong></span>
        </div>

        {/* Conservative Badge */}
        <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-10">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-800">
            Conservative estimate — uses {Math.round(calculations.conversionRate * 100)}% conversion rates
          </span>
        </div>

        {/* Value Breakdown */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-4">
            VALUE BREAKDOWN
          </h2>

          <div className="space-y-4">
            {/* Time Savings */}
            {calculations.timeSavingsValue > 0 && (
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111827]">Time Savings</h3>
                      <p className="text-sm text-[#6B7280]">Documentation efficiency gains</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">
                    ${Math.round(calculations.timeSavingsValue).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-[#6B7280] bg-neutral-50 rounded-lg p-3">
                  <p>
                    {metricsData.timeSavings.before && metricsData.timeSavings.after && (
                      <>
                        {(metricsData.timeSavings.before - metricsData.timeSavings.after)} min saved × {abridgeEncounters.toLocaleString()} encounters ÷ 60 × $150/hr × 50% conversion
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* wRVU Value */}
            {calculations.wrvuValue > 0 && (
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111827]">wRVU Lift</h3>
                      <p className="text-sm text-[#6B7280]">Revenue capture improvement</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">
                    ${Math.round(calculations.wrvuValue).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-[#6B7280] bg-neutral-50 rounded-lg p-3">
                  <p>
                    {metricsData.wrvuCapture.before && metricsData.wrvuCapture.after && (
                      <>
                        +{(metricsData.wrvuCapture.after - metricsData.wrvuCapture.before).toFixed(2)} wRVU/enc × {abridgeEncounters.toLocaleString()} encounters × ${calculations.wrvuConversionFactor}/wRVU × 50% conversion
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Work Outside Work Value */}
            {calculations.workOutsideValue > 0 && (
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Moon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111827]">Quality of Life</h3>
                      <p className="text-sm text-[#6B7280]">Reduced after-hours work</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">
                    ${Math.round(calculations.workOutsideValue).toLocaleString()}
                  </span>
                </div>
                <div className="text-xs text-[#6B7280] bg-neutral-50 rounded-lg p-3">
                  <p>
                    {metricsData.workOutsideWork.before && metricsData.workOutsideWork.after && (
                      <>
                        {metricsData.workOutsideWork.before - metricsData.workOutsideWork.after} hrs/week × 48 weeks × {calculations.providers} providers × $50/hr × 50% conversion
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Methodology Note */}
        <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-xl mb-10">
          <div className="flex items-start gap-3">
            <ClipboardList className="w-5 h-5 text-neutral-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[#111827] mb-2">About These Numbers</h3>
              <ul className="text-sm text-[#6B7280] space-y-1">
                <li>• All values use a <strong>50% conversion rate</strong> to be conservative</li>
                <li>• wRVU value uses <strong>${calculations.wrvuConversionFactor}/wRVU</strong> (Medicare blended rate)</li>
                <li>• Time savings valued at <strong>$150/hour</strong> provider opportunity cost</li>
                <li>• Investment estimated at <strong>$250/provider/month</strong></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={onNext}
            className="gap-2"
            data-testid="button-next"
          >
            See Your Expansion Potential
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
