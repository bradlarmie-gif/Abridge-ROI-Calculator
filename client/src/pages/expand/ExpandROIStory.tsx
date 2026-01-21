import { ArrowLeft, ArrowRight, Clock, DollarSign, AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type DeploymentData, type MetricType, type MetricsData } from "./ExpandFlow";

interface ExpandROIStoryProps {
  deploymentData: DeploymentData;
  metricsData: MetricsData;
  selectedMetrics: MetricType[];
  onNext: () => void;
  onBack: () => void;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function ExpandROIStory({
  deploymentData,
  metricsData,
  selectedMetrics,
  onNext,
  onBack,
}: ExpandROIStoryProps) {
  const abridgeEncounters = Math.round(
    deploymentData.annualEncounters * (deploymentData.utilizationRate / 100)
  );

  // Investment calculation
  const pricePerProvider = 150;
  const annualInvestment = deploymentData.providers * pricePerProvider * 12;

  // Time savings value
  const timeSavings = metricsData.timeSavings.before - metricsData.timeSavings.after;
  const totalHoursSaved = (timeSavings * abridgeEncounters) / 60;
  const realizedHours = totalHoursSaved * 0.5; // 50% conversion
  const hourlyValue = 75;
  const timeSavingsValue = Math.round(realizedHours * hourlyValue);

  // wRVU value
  const wrvuLift = metricsData.wrvuCapture.after - metricsData.wrvuCapture.before;
  const totalWrvuGain = wrvuLift * abridgeEncounters;
  const conversionFactor = 33;
  const realizationRate = 0.5;
  const wrvuValue = Math.round(totalWrvuGain * conversionFactor * realizationRate);

  // Totals
  const totalValue = timeSavingsValue + wrvuValue;
  const netValue = totalValue - annualInvestment;
  const roi = (totalValue / annualInvestment).toFixed(1);
  const paybackMonths = Math.round((annualInvestment / totalValue) * 12);

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
          <span className="text-sm text-[#6B7280]">Step 3 of 4 · Your ROI</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[#111827] mb-2">Your ROI Story</h1>
          <p className="text-[#6B7280]">Based on your actual Abridge data</p>
        </div>

        {/* Hero ROI Cards */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Net Annual Value */}
            <div className="bg-emerald-50 rounded-xl p-6 text-center border border-emerald-100">
              <div className="font-mono font-bold text-4xl text-emerald-600 mb-2" data-testid="roi-net-value">
                {formatCurrency(netValue)}
              </div>
              <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Net Annual Value
              </div>
            </div>

            {/* ROI */}
            <div className="bg-[#111827] rounded-xl p-6 text-center">
              <div className="font-mono font-bold text-4xl text-white mb-2" data-testid="roi-multiple">
                {roi}x
              </div>
              <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                ROI
              </div>
            </div>

            {/* Payback */}
            <div className="bg-neutral-100 rounded-xl p-6 text-center border border-neutral-200">
              <div className="font-mono font-bold text-4xl text-[#111827] mb-2" data-testid="roi-payback">
                {paybackMonths} mo
              </div>
              <div className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">
                Payback
              </div>
            </div>
          </div>

          {/* Summary Line */}
          <div className="flex justify-center gap-6 text-sm text-[#6B7280] mb-4">
            <span>Total Value: <span className="font-semibold text-[#111827]">{formatCurrency(totalValue)}</span></span>
            <span className="text-neutral-300">│</span>
            <span>Investment: <span className="font-semibold text-[#111827]">{formatCurrency(annualInvestment)}</span></span>
          </div>

          {/* Conservative Note */}
          <div className="flex items-center justify-center gap-2 text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span>Conservative estimate — uses typical conversion rates</span>
          </div>
        </section>

        {/* Value Breakdown */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              Value Breakdown
            </h2>
            <p className="text-sm text-[#6B7280]">How we calculated this</p>
          </div>

          {/* Time Savings Card */}
          <div className="border border-neutral-200 rounded-xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <span className="font-semibold text-[#111827] uppercase text-sm tracking-wide">
                  Time Savings
                </span>
              </div>
              <span className="font-mono font-bold text-lg text-emerald-600">
                {formatCurrency(timeSavingsValue)}
              </span>
            </div>

            <div className="bg-neutral-50 rounded-lg p-4 text-sm text-[#6B7280]">
              <p className="font-semibold text-[#111827] mb-2">Your data:</p>
              <ul className="space-y-1 mb-4">
                <li>• {timeSavings} minutes saved per encounter</li>
                <li>• {abridgeEncounters.toLocaleString()} Abridge encounters</li>
                <li>• = {totalHoursSaved.toLocaleString()} hours returned annually</li>
              </ul>
              <p className="font-semibold text-[#111827] mb-2">Conversion:</p>
              <ul className="space-y-1">
                <li>• 50% of time converts to realized value</li>
                <li>• ${hourlyValue}/hr productivity value</li>
                <li>• = {realizedHours.toLocaleString()} hrs × ${hourlyValue} = {formatCurrency(timeSavingsValue)}</li>
              </ul>
            </div>
          </div>

          {/* wRVU Card */}
          <div className="border border-neutral-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="font-semibold text-[#111827] uppercase text-sm tracking-wide">
                  wRVU Lift
                </span>
              </div>
              <span className="font-mono font-bold text-lg text-emerald-600">
                {formatCurrency(wrvuValue)}
              </span>
            </div>

            <div className="bg-neutral-50 rounded-lg p-4 text-sm text-[#6B7280]">
              <p className="font-semibold text-[#111827] mb-2">Your data:</p>
              <ul className="space-y-1 mb-4">
                <li>• {((wrvuLift / metricsData.wrvuCapture.before) * 100).toFixed(1)}% wRVU lift ({metricsData.wrvuCapture.before} → {metricsData.wrvuCapture.after})</li>
                <li>• {abridgeEncounters.toLocaleString()} Abridge encounters</li>
                <li>• = {totalWrvuGain.toLocaleString()} additional wRVUs captured</li>
              </ul>
              <p className="font-semibold text-[#111827] mb-2">Conversion:</p>
              <ul className="space-y-1">
                <li>• ${conversionFactor} Medicare conversion factor (conservative)</li>
                <li>• 50% realization rate (audit/coding variability)</li>
                <li>• = {totalWrvuGain.toLocaleString()} × ${conversionFactor} × 50% = {formatCurrency(wrvuValue)}</li>
              </ul>
            </div>
          </div>
        </section>

        {/* About These Numbers */}
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-8 mb-8">
          <div className="flex gap-4">
            <Lightbulb className="w-6 h-6 text-slate-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-[#111827] mb-3">About These Numbers</h3>
              <p className="text-sm text-slate-600 mb-4">
                We apply conservative conversion rates to your data:
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <strong>Time savings:</strong> 50% of saved time converts to value (the rest improves quality of life)
                </li>
                <li>
                  <strong>wRVU lift:</strong> 50% realization after coding/audit (not every improvement results in billed change)
                </li>
                <li>
                  <strong>Medicare rates:</strong> We use $33/wRVU as baseline (commercial payers pay 30-50% more)
                </li>
              </ul>
              <p className="text-sm text-slate-700 mt-4 font-medium">
                These are real, defensible numbers you can share with finance.
              </p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={onNext}
            className="gap-2"
            data-testid="button-next"
          >
            See Your Journey
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
