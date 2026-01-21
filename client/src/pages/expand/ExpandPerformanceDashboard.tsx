import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Moon, FileText, DollarSign, FileCheck, Smile, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import type { DeploymentData, MetricType, MetricsData } from "./ExpandFlow";

interface ExpandPerformanceDashboardProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  onNext: () => void;
  onBack: () => void;
}

export default function ExpandPerformanceDashboard({
  deploymentData,
  selectedMetrics,
  metricsData,
  onNext,
  onBack,
}: ExpandPerformanceDashboardProps) {
  
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
  const losShift = (losData.after["99215"] || 0) - (losData.before["99215"] || 0);

  const wrvuData = metricsData.wrvuCapture;
  const wrvuChange = wrvuData.before && wrvuData.after
    ? (((wrvuData.after - wrvuData.before) / wrvuData.before) * 100)
    : null;

  const closureData = metricsData.chartClosure;
  const sameDayImprovement = closureData.after.within24 - closureData.before.within24;

  const satData = metricsData.clinicianSatisfaction;
  const satChange = satData.before && satData.after ? satData.after - satData.before : null;

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

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <GlobalHeader pageName="Expand Dashboard" currentStep={3} totalSteps={5} />

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
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Your Performance Summary
          </h1>
          <p className="text-[#6B7280]">
            Here's what your data shows after {deploymentData.monthsOnAbridge} months on Abridge
          </p>
        </div>

        {/* Context Bar */}
        <div className="flex items-center justify-center gap-6 p-4 bg-white border border-neutral-200 rounded-xl mb-8">
          <div className="text-center">
            <span className="text-2xl font-bold text-[#111827]">{deploymentData.providers}</span>
            <span className="text-sm text-[#6B7280] ml-1">providers</span>
          </div>
          <span className="text-neutral-300">·</span>
          <div className="text-center">
            <span className="text-2xl font-bold text-[#111827]">{abridgeEncounters.toLocaleString()}</span>
            <span className="text-sm text-[#6B7280] ml-1">Abridge encounters</span>
          </div>
          <span className="text-neutral-300">·</span>
          <div className="text-center">
            <span className="text-2xl font-bold text-[#111827]">{deploymentData.utilizationRate}%</span>
            <span className="text-sm text-[#6B7280] ml-1">utilization</span>
          </div>
        </div>

        {/* Performance Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Time Savings Card */}
          {selectedMetrics.includes("timeSavings") && timeSavingsChange !== null && (
            <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-time-savings">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-[#111827]">Time Savings</h3>
              </div>
              <div className="mb-3">
                <span className="text-3xl font-bold text-emerald-600">-{timeSavingsChange} min</span>
                <span className="text-sm text-[#6B7280] ml-2">per encounter</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-3">
                <span>{timeSavings.before} min</span>
                <span>→</span>
                <span>{timeSavings.after} min</span>
              </div>
              <div className="text-sm text-emerald-600 font-medium">
                {timeSavingsPercent}% reduction
              </div>
            </div>
          )}

          {/* Work Outside Work Card */}
          {selectedMetrics.includes("workOutsideWork") && workOutsideChange !== null && (
            <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-work-outside">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Moon className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-[#111827]">Work Outside of Work</h3>
              </div>
              <div className="mb-3">
                <span className="text-3xl font-bold text-emerald-600">-{workOutsideChange} hrs</span>
                <span className="text-sm text-[#6B7280] ml-2">per week</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <span>{workOutside.before} hrs</span>
                <span>→</span>
                <span>{workOutside.after} hrs</span>
              </div>
            </div>
          )}

          {/* Level of Service Card */}
          {selectedMetrics.includes("levelOfService") && losShift > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-los">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="font-semibold text-[#111827]">Level of Service</h3>
              </div>
              <div className="mb-3">
                <span className="text-3xl font-bold text-emerald-600">+{losShift}pp</span>
                <span className="text-sm text-[#6B7280] ml-2">shift to Level 5</span>
              </div>
              {/* Mini E/M bars */}
              <div className="space-y-2">
                {["99215", "99214", "99213"].map((code) => (
                  <div key={code} className="flex items-center gap-2">
                    <span className="text-xs text-[#6B7280] w-12">{code}</span>
                    <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-neutral-300 absolute left-0"
                        style={{ width: `${losData.before[code] || 0}%` }}
                      />
                      <div 
                        className="h-full bg-emerald-500 absolute left-0"
                        style={{ width: `${losData.after[code] || 0}%`, opacity: 0.7 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* wRVU Card */}
          {selectedMetrics.includes("wrvuCapture") && wrvuChange !== null && (
            <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-wrvu">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
                <h3 className="font-semibold text-[#111827]">wRVU Capture</h3>
              </div>
              <div className="mb-3">
                <span className="text-3xl font-bold text-emerald-600">+{wrvuChange.toFixed(1)}%</span>
                <span className="text-sm text-[#6B7280] ml-2">lift</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <span>{wrvuData.before} wRVU/enc</span>
                <span>→</span>
                <span>{wrvuData.after} wRVU/enc</span>
              </div>
            </div>
          )}

          {/* Chart Closure Card */}
          {selectedMetrics.includes("chartClosure") && sameDayImprovement > 0 && (
            <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-closure">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <FileCheck className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-semibold text-[#111827]">Chart Closure</h3>
              </div>
              <div className="mb-3">
                <span className="text-3xl font-bold text-emerald-600">+{sameDayImprovement}pp</span>
                <span className="text-sm text-[#6B7280] ml-2">same-day closure</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <span>{closureData.before.within24}%</span>
                <span>→</span>
                <span>{closureData.after.within24}%</span>
              </div>
            </div>
          )}

          {/* Satisfaction Card */}
          {selectedMetrics.includes("clinicianSatisfaction") && satChange !== null && (
            <div className="bg-white border border-neutral-200 rounded-xl p-6" data-testid="card-satisfaction">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                  <Smile className="w-4 h-4 text-pink-600" />
                </div>
                <h3 className="font-semibold text-[#111827]">Satisfaction</h3>
              </div>
              <div className="mb-3">
                <span className="text-3xl font-bold text-emerald-600">+{satChange.toFixed(1)}</span>
                <span className="text-sm text-[#6B7280] ml-2">points</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-2">
                <span>{satData.before}/10</span>
                <span>→</span>
                <span>{satData.after}/10</span>
              </div>
              {satData.recommendRate && (
                <div className="text-sm text-[#6B7280]">
                  {satData.recommendRate}% would recommend
                </div>
              )}
            </div>
          )}
        </div>

        {/* Success Summary */}
        {metricsWithData.length > 0 && (
          <div className="flex items-center gap-3 p-5 bg-emerald-50 border border-emerald-200 rounded-xl mb-8">
            <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <p className="text-emerald-800">
              Your deployment is showing <strong>positive results across {metricsWithData.length} metrics</strong>. 
              Let's see what this means for your ROI.
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
            Calculate Your ROI
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
