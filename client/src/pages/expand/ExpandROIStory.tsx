import { useMemo } from "react";
import { ArrowRight, ArrowLeft, AlertTriangle, Clock, DollarSign, Moon, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import type { DeploymentData, MetricType, MetricsData } from "./ExpandFlow";
import { type ValueConfigData, calculateTieredROI, type CalculationInputs, EXPAND_ROI_DEFAULTS, formatCurrency } from "@/lib/expandRoiCalculator";

interface ExpandROIStoryProps {
  deploymentData: DeploymentData;
  metricsData: MetricsData;
  selectedMetrics: MetricType[];
  valueConfig: ValueConfigData;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function ExpandROIStory({
  deploymentData,
  metricsData,
  selectedMetrics,
  valueConfig,
  onNext,
  onBack,
  onBackToJourney,
}: ExpandROIStoryProps) {
  
  const providers = deploymentData.providers || 50;
  const encounters = deploymentData.annualEncounters || 65000;
  const utilizationRate = deploymentData.utilizationRate || 70;
  const months = deploymentData.monthsOnAbridge || 6;
  
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

  // Map to old calculation structure for UI compatibility
  const calculations = useMemo(() => {
    return {
      timeSavingsValue: 0, // Not separately valued - shown in tier 2
      wrvuValue: roiResult.tier1Breakdown.wrvuValue,
      workOutsideValue: 0, // Not separately valued - shown in tier 2
      totalValue: roiResult.tier1HardValue,
      annualInvestment: roiResult.investment,
      netValue: roiResult.netValue,
      roi: roiResult.roi,
      providers,
      conversionRate: EXPAND_ROI_DEFAULTS.wrvuAttribution,
      wrvuConversionFactor: EXPAND_ROI_DEFAULTS.dollarPerWRVU,
    };
  }, [roiResult, providers]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <UnifiedHeader 
        pathType="expand"
        currentStep={6}
        totalSteps={7}
        stepName="ROI Story"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-4xl mx-auto px-6 py-6 md:py-8 pb-10">
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
