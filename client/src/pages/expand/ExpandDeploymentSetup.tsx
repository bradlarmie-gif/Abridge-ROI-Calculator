import { ArrowLeft, ArrowRight, Check, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type DeploymentData, type MetricType } from "./ExpandFlow";

interface ExpandDeploymentSetupProps {
  deploymentData: DeploymentData;
  setDeploymentData: (data: DeploymentData) => void;
  selectedMetrics: MetricType[];
  setSelectedMetrics: (metrics: MetricType[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const METRICS = [
  {
    id: "timeSavings" as MetricType,
    name: "Time Savings",
    description: "Time in notes per appointment",
    source: "Clarity data",
    recommended: true,
  },
  {
    id: "levelOfService" as MetricType,
    name: "Level of Service",
    description: "E/M code distribution shift",
    source: "Clarity data",
    recommended: true,
  },
  {
    id: "chartClosure" as MetricType,
    name: "Chart Closure Time",
    description: "Time from visit to chart completion",
    source: "Clarity data",
    recommended: true,
  },
  {
    id: "wrvuCapture" as MetricType,
    name: "wRVU Capture",
    description: "wRVUs per encounter",
    source: "Clarity data",
    recommended: true,
  },
  {
    id: "workAfterHours" as MetricType,
    name: "Work After Hours",
    description: "Hours worked outside scheduled time",
    source: "Survey data",
    recommended: false,
  },
];

export default function ExpandDeploymentSetup({
  deploymentData,
  setDeploymentData,
  selectedMetrics,
  setSelectedMetrics,
  onNext,
  onBack,
}: ExpandDeploymentSetupProps) {
  const abridgeEncounters = Math.round(
    deploymentData.annualEncounters * (deploymentData.utilizationRate / 100)
  );

  const toggleMetric = (metric: MetricType) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== metric));
    } else {
      setSelectedMetrics([...selectedMetrics, metric]);
    }
  };

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
          <span className="text-sm text-[#6B7280]">Step 1 of 4 · Your Setup</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[#111827] mb-2">
            Your Outpatient Deployment
          </h1>
          <p className="text-[#6B7280]">Tell us about your Abridge setup</p>
        </div>

        {/* Deployment Basics */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8">
          <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-6">
            Deployment Basics
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm text-[#6B7280] mb-2">
                Providers using Abridge
              </label>
              <input
                type="number"
                value={deploymentData.providers}
                onChange={(e) =>
                  setDeploymentData({
                    ...deploymentData,
                    providers: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 font-mono text-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/20 focus:border-[#E85D3F]"
                data-testid="input-providers"
              />
            </div>

            <div>
              <label className="block text-sm text-[#6B7280] mb-2">
                Total annual encounters
              </label>
              <input
                type="number"
                value={deploymentData.annualEncounters}
                onChange={(e) =>
                  setDeploymentData({
                    ...deploymentData,
                    annualEncounters: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 font-mono text-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/20 focus:border-[#E85D3F]"
                data-testid="input-encounters"
              />
            </div>

            <div>
              <label className="block text-sm text-[#6B7280] mb-2">
                Utilization rate
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={deploymentData.utilizationRate}
                  onChange={(e) =>
                    setDeploymentData({
                      ...deploymentData,
                      utilizationRate: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 pr-10 rounded-lg border border-neutral-200 font-mono text-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/20 focus:border-[#E85D3F]"
                  data-testid="input-utilization"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280]">
                  %
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#6B7280] mb-2">
                Months on Abridge
              </label>
              <input
                type="number"
                value={deploymentData.monthsOnAbridge}
                onChange={(e) =>
                  setDeploymentData({
                    ...deploymentData,
                    monthsOnAbridge: Number(e.target.value),
                  })
                }
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 font-mono text-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#E85D3F]/20 focus:border-[#E85D3F]"
                data-testid="input-months"
              />
            </div>
          </div>

          {/* Calculated stat */}
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-emerald-800">
              <span className="font-mono font-bold">
                {abridgeEncounters.toLocaleString()}
              </span>{" "}
              encounters documented with Abridge
            </span>
          </div>
        </section>

        {/* Metrics Selection */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-1">
              What Do You Want to Measure?
            </h2>
            <p className="text-sm text-[#6B7280]">
              Select the metrics you have data for
            </p>
          </div>

          <div className="space-y-3">
            {METRICS.map((metric) => {
              const isSelected = selectedMetrics.includes(metric.id);
              return (
                <div
                  key={metric.id}
                  className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-orange-50 border-[#E85D3F]"
                      : "bg-neutral-50 border-neutral-200 hover:border-[#E85D3F]/50"
                  }`}
                  onClick={() => toggleMetric(metric.id)}
                  data-testid={`metric-${metric.id}`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-[#E85D3F] border-[#E85D3F]"
                        : "border-neutral-300"
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-[#111827]">{metric.name}</h3>
                      {metric.recommended && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded tracking-wide">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6B7280] mb-1">{metric.description}</p>
                    <p className="text-xs text-[#94a3b8]">Source: {metric.source}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Hint */}
          <div className="flex items-center gap-3 mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              More metrics = more complete picture. Select at least one to continue.
            </p>
          </div>
        </section>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={onNext}
            disabled={selectedMetrics.length === 0}
            className="gap-2"
            data-testid="button-next"
          >
            Enter Your Data
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
