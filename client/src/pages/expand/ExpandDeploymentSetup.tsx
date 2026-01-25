import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Moon, FileText, DollarSign, FileCheck, Smile, Sparkles, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import type { DeploymentData, MetricType } from "./ExpandFlow";

interface ExpandDeploymentSetupProps {
  deploymentData: DeploymentData;
  setDeploymentData: (data: DeploymentData) => void;
  selectedMetrics: MetricType[];
  setSelectedMetrics: (metrics: MetricType[]) => void;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

// PRIMARY metrics - strongest ROI impact, pre-selected by default
const PRIMARY_METRICS = [
  {
    id: "wrvuCapture" as MetricType,
    name: "wRVU per Encounter",
    description: "Revenue capture improvement",
    source: "Clarity",
    icon: DollarSign,
  },
  {
    id: "timeSavings" as MetricType,
    name: "Time in Notes",
    description: "Documentation efficiency",
    source: "Clarity",
    icon: Clock,
  },
  {
    id: "chartClosure" as MetricType,
    name: "Same-Day Chart Closure",
    description: "Revenue cycle acceleration",
    source: "Clarity",
    icon: FileCheck,
  },
];

// SECONDARY metrics - additional evidence, optional
const SECONDARY_METRICS = [
  {
    id: "levelOfService" as MetricType,
    name: "Average E&M Level",
    description: "Coding accuracy",
    source: "Clarity",
    icon: FileText,
  },
  {
    id: "workOutsideWork" as MetricType,
    name: "Work Outside of Work",
    description: "After-hours burden",
    source: "Clarity",
    icon: Moon,
  },
  {
    id: "clinicianSatisfaction" as MetricType,
    name: "Clinician Satisfaction",
    description: "Provider experience",
    source: "Survey",
    icon: Smile,
  },
];

// Combined for backward compatibility
const METRICS_CONFIG = [...PRIMARY_METRICS, ...SECONDARY_METRICS];

export default function ExpandDeploymentSetup({
  deploymentData,
  setDeploymentData,
  selectedMetrics,
  setSelectedMetrics,
  onNext,
  onBack,
  onBackToJourney,
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
      <UnifiedHeader 
        pathType="expand"
        currentStep={2}
        totalSteps={5}
        stepName="Deployment Setup"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-10">
        {/* Why This Matters - Hero Card */}
        <div className="mb-6 md:mb-8 bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-4 md:p-6">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-base md:text-lg font-semibold text-blue-900 mb-1">Why This Matters</h2>
              <p className="text-xs md:text-sm text-blue-700 leading-relaxed">
                You're about to discover the real value your Abridge deployment is creating. 
                This analysis will give you concrete numbers to share with leadership, justify 
                expansion, and celebrate wins with your team.
              </p>
              <div className="flex flex-wrap gap-3 md:gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-blue-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Track real outcomes</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-blue-600">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Quantify your value</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-blue-600">
                  <Target className="w-3.5 h-3.5" />
                  <span>Plan your expansion</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-xl md:text-2xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Your Outpatient Deployment
          </h1>
          <p className="text-sm md:text-base text-[#6B7280]">
            Tell us about your Abridge setup so we can analyze your results
          </p>
        </div>

        {/* Deployment Basics */}
        <section className="mb-8 md:mb-10">
          <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-3 md:mb-4">
            DEPLOYMENT BASICS
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#6B7280]">Providers using Abridge</label>
              <FormattedNumberInput
                placeholder="e.g., 150"
                value={deploymentData.providers ?? 0}
                onChange={(value) =>
                  setDeploymentData({
                    ...deploymentData,
                    providers: value || null,
                  })
                }
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
                data-testid="input-providers"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#6B7280]">Total annual encounters</label>
              <FormattedNumberInput
                placeholder="e.g., 195,000"
                value={deploymentData.annualEncounters ?? 0}
                onChange={(value) =>
                  setDeploymentData({
                    ...deploymentData,
                    annualEncounters: value || null,
                  })
                }
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
                data-testid="input-encounters"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#6B7280]">Utilization rate</label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g., 72"
                  value={deploymentData.utilizationRate ?? ""}
                  onChange={(e) =>
                    setDeploymentData({
                      ...deploymentData,
                      utilizationRate: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-3 pr-8 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
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
                inputMode="numeric"
                placeholder="e.g., 6"
                value={deploymentData.monthsOnAbridge ?? ""}
                onChange={(e) =>
                  setDeploymentData({
                    ...deploymentData,
                    monthsOnAbridge: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
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
        <section className="mb-8 md:mb-10">
          <div className="mb-4 md:mb-6">
            <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-1">
              WHAT METRICS DO YOU HAVE DATA FOR?
            </h2>
          </div>

          {/* PRIMARY METRICS */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-emerald-600 tracking-wider uppercase">PRIMARY METRICS</span>
              <span className="text-xs text-[#6B7280]">(Recommended)</span>
            </div>
            <p className="text-xs text-[#6B7280] mb-3">These have the strongest ROI impact</p>
            
            <div className="space-y-2">
              {PRIMARY_METRICS.map((metric) => {
                const isSelected = selectedMetrics.includes(metric.id);
                const Icon = metric.icon;
                
                return (
                  <div
                    key={metric.id}
                    className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white border-l-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-l-emerald-500 border-emerald-200 bg-emerald-50/30"
                        : "border-l-transparent border-neutral-200 hover:border-neutral-300"
                    }`}
                    onClick={() => toggleMetric(metric.id)}
                    data-testid={`metric-${metric.id}`}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-neutral-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-emerald-100" : "bg-neutral-100"
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-600" : "text-neutral-500"}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[#111827]">{metric.name}</h3>
                      <p className="text-sm text-[#6B7280]">{metric.description}</p>
                    </div>

                    {/* Source */}
                    <span className="text-xs text-neutral-400 flex-shrink-0">Source: {metric.source}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECONDARY METRICS */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase">SECONDARY METRICS</span>
              <span className="text-xs text-neutral-400">(Optional)</span>
            </div>
            <p className="text-xs text-[#6B7280] mb-3">Additional evidence of impact</p>
            
            <div className="space-y-2">
              {SECONDARY_METRICS.map((metric) => {
                const isSelected = selectedMetrics.includes(metric.id);
                const Icon = metric.icon;
                
                return (
                  <div
                    key={metric.id}
                    className={`flex items-center gap-4 p-4 bg-white border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#EA2C00] bg-[#FEF0EC]"
                        : "border-neutral-200 hover:border-neutral-300 opacity-70"
                    }`}
                    onClick={() => toggleMetric(metric.id)}
                    data-testid={`metric-${metric.id}`}
                  >
                    {/* Radio-style circle */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? "border-[#EA2C00]"
                          : "border-neutral-300"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EA2C00]" />
                      )}
                    </div>

                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-[#EA2C00]/10" : "bg-neutral-100"
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? "text-[#EA2C00]" : "text-neutral-400"}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium ${isSelected ? "text-[#111827]" : "text-neutral-600"}`}>{metric.name}</h3>
                    </div>

                    {/* Source */}
                    <span className="text-xs text-neutral-400 flex-shrink-0">Source: {metric.source}</span>
                  </div>
                );
              })}
            </div>
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
