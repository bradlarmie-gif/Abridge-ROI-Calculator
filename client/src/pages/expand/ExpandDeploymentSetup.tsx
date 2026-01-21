import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Moon, FileText, DollarSign, FileCheck, Smile, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeploymentData, MetricType } from "./ExpandFlow";

interface ExpandDeploymentSetupProps {
  deploymentData: DeploymentData;
  setDeploymentData: (data: DeploymentData) => void;
  selectedMetrics: MetricType[];
  setSelectedMetrics: (metrics: MetricType[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const METRICS_CONFIG = [
  {
    id: "timeSavings" as MetricType,
    name: "Time Savings",
    description: "Time in notes per appointment",
    source: "Clarity data",
    icon: Clock,
    recommended: true,
  },
  {
    id: "workOutsideWork" as MetricType,
    name: "Work Outside of Work",
    description: "Hours worked outside scheduled time",
    source: "Clarity data",
    icon: Moon,
    recommended: true,
  },
  {
    id: "levelOfService" as MetricType,
    name: "Level of Service",
    description: "E/M code distribution (99211-99215)",
    source: "Clarity data",
    icon: FileText,
    recommended: true,
  },
  {
    id: "wrvuCapture" as MetricType,
    name: "wRVU Capture",
    description: "wRVUs per encounter",
    source: "Clarity data",
    icon: DollarSign,
    recommended: true,
  },
  {
    id: "chartClosure" as MetricType,
    name: "Chart Closure Time",
    description: "% of charts closed within 24h, 48h, 72h+",
    source: "Clarity data",
    icon: FileCheck,
    recommended: false,
  },
  {
    id: "clinicianSatisfaction" as MetricType,
    name: "Clinician Satisfaction",
    description: "Satisfaction scores, burnout indicators",
    source: "Survey data",
    icon: Smile,
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
  
  const abridgeEncounters = useMemo(() => {
    if (deploymentData.providers && deploymentData.annualEncounters && deploymentData.utilizationRate) {
      return Math.round(deploymentData.annualEncounters * (deploymentData.utilizationRate / 100));
    }
    return null;
  }, [deploymentData]);

  const toggleMetric = (metricId: MetricType) => {
    if (selectedMetrics.includes(metricId)) {
      setSelectedMetrics(selectedMetrics.filter((m) => m !== metricId));
    } else {
      setSelectedMetrics([...selectedMetrics, metricId]);
    }
  };

  const canProceed =
    deploymentData.providers &&
    deploymentData.annualEncounters &&
    deploymentData.utilizationRate &&
    deploymentData.monthsOnAbridge &&
    selectedMetrics.length > 0;

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
            <span className="font-semibold text-[#111827]">Step 1</span>
            <span>of 5</span>
            <span className="text-neutral-300">·</span>
            <span>Your Setup</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Your Outpatient Deployment
          </h1>
          <p className="text-[#6B7280]">
            Tell us about your Abridge setup so we can analyze your results
          </p>
        </div>

        {/* Deployment Basics */}
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-4">
            DEPLOYMENT BASICS
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#6B7280]">Providers using Abridge</label>
              <input
                type="number"
                placeholder="e.g., 150"
                value={deploymentData.providers ?? ""}
                onChange={(e) =>
                  setDeploymentData({
                    ...deploymentData,
                    providers: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent"
                data-testid="input-providers"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#6B7280]">Total annual encounters</label>
              <input
                type="number"
                placeholder="e.g., 195000"
                value={deploymentData.annualEncounters ?? ""}
                onChange={(e) =>
                  setDeploymentData({
                    ...deploymentData,
                    annualEncounters: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent"
                data-testid="input-encounters"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#6B7280]">Utilization rate</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="e.g., 72"
                  value={deploymentData.utilizationRate ?? ""}
                  onChange={(e) =>
                    setDeploymentData({
                      ...deploymentData,
                      utilizationRate: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-3 pr-8 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent"
                  data-testid="input-utilization"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]">%</span>
              </div>
              <span className="text-[10px] text-[#6B7280]">% of encounters using Abridge</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#6B7280]">Months on Abridge</label>
              <input
                type="number"
                placeholder="e.g., 6"
                value={deploymentData.monthsOnAbridge ?? ""}
                onChange={(e) =>
                  setDeploymentData({
                    ...deploymentData,
                    monthsOnAbridge: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent"
                data-testid="input-months"
              />
            </div>
          </div>

          {/* Calculated encounters */}
          {abridgeEncounters && (
            <div className="flex items-center gap-2 mt-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-[#6B7280]">
                <strong className="text-[#111827]">{abridgeEncounters.toLocaleString()}</strong> encounters documented with Abridge
              </span>
            </div>
          )}
        </section>

        {/* Metrics Selection */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-1">
              WHAT DO YOU WANT TO MEASURE?
            </h2>
            <p className="text-sm text-[#6B7280]">Select the metrics you have data for</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {METRICS_CONFIG.map((metric) => {
              const isSelected = selectedMetrics.includes(metric.id);
              const Icon = metric.icon;
              
              return (
                <div
                  key={metric.id}
                  className={`flex items-start gap-4 p-5 bg-white border rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "border-[#f97316] bg-orange-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                  onClick={() => toggleMetric(metric.id)}
                  data-testid={`metric-${metric.id}`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-[#f97316] border-[#f97316]"
                        : "border-neutral-300 bg-white"
                    }`}
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M10 3L4.5 8.5L2 6"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-neutral-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#111827]">{metric.name}</h3>
                      {metric.recommended && (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-semibold rounded tracking-wide">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#6B7280]">{metric.description}</p>
                    <p className="text-xs text-neutral-400 mt-1">Source: {metric.source}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-4 p-3 bg-neutral-50 rounded-lg">
            <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-[#6B7280]">
              Select at least one metric to continue. More metrics = more complete picture.
            </p>
          </div>
        </section>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={onNext}
            disabled={!canProceed}
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
