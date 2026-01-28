import { useMemo } from "react";
import { ArrowRight, ArrowLeft, Clock, Moon, FileText, DollarSign, FileCheck, Smile, Sparkles, TrendingUp, Target, BadgeDollarSign, Scale, Activity } from "lucide-react";
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

// TIER 1: Core Financial Value - Direct revenue connection
const TIER_1_METRICS = [
  {
    id: "wrvuCapture" as MetricType,
    name: "wRVU per Encounter",
    description: "Revenue capture from complete documentation",
    dollarizable: "$33/wRVU × attribution %",
    source: "Clarity/Epic",
    icon: DollarSign,
    recommended: true,
  },
  {
    id: "levelOfService" as MetricType,
    name: "Average E&M Level",
    description: "Coding accuracy from complete documentation",
    dollarizable: "Level shifts have payer-specific values",
    source: "Clarity/Epic",
    icon: FileText,
    recommended: true,
  },
  {
    id: "diagnosisCapture" as MetricType,
    name: "Diagnosis Capture",
    description: "HCC/RAF score improvement from complete documentation",
    dollarizable: "Direct risk adjustment revenue impact",
    source: "Clarity/Epic",
    icon: Target,
    recommended: false,
  },
];

// TIER 2: Operational Efficiency - Time that can become dollars
const TIER_2_METRICS = [
  {
    id: "timeSavings" as MetricType,
    name: "Time in Notes",
    description: "Minutes per encounter spent documenting",
    dollarizable: "You choose: patient access, overtime, or hours",
    source: "Clarity/Epic",
    icon: Clock,
    recommended: true,
  },
  {
    id: "workOutsideWork" as MetricType,
    name: "Work Outside of Work",
    description: "After-hours documentation burden",
    dollarizable: "Connect to overtime or retention value",
    source: "Clarity/Epic",
    icon: Moon,
    recommended: false,
  },
];

// TIER 3: Quality Indicators - Important proof points
const TIER_3_METRICS = [
  {
    id: "utilization" as MetricType,
    name: "Utilization Rate",
    description: "Percentage of eligible providers actively using Abridge",
    dollarizable: "Unlocks full value of other metrics",
    source: "Clarity/Epic",
    icon: TrendingUp,
    recommended: false,
  },
  {
    id: "chartClosure" as MetricType,
    name: "Same-Day Chart Closure",
    description: "Real-time documentation behavior",
    dollarizable: "Validates workflow adoption",
    source: "Clarity/Epic",
    icon: FileCheck,
    recommended: false,
  },
  {
    id: "clinicianSatisfaction" as MetricType,
    name: "Clinician Satisfaction",
    description: "Leading indicator for retention",
    dollarizable: "Supports the retention story",
    source: "Survey",
    icon: Smile,
    recommended: false,
  },
];

// Combined for backward compatibility
const METRICS_CONFIG = [...TIER_1_METRICS, ...TIER_2_METRICS, ...TIER_3_METRICS];

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
        currentStep={1}
        totalSteps={5}
        stepName="Your Deployment"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-10">
        {/* Soul Hero - Celebrating What You've Built */}
        <div className="mb-8 md:mb-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium tracking-wide uppercase">Your Value Story</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-3" data-testid="text-page-title">
            Documenting What You've Accomplished
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-2xl mb-6">
            You believed in this investment. Your organization trusted you. Now let's turn your results 
            into a story you can share — with the rigor your leadership expects and the clarity 
            your team deserves.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white/90">Your real outcomes</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white/90">Clear value created</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white/90">What's possible next</span>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-[#111827] mb-1">
            Tell Us About Your Deployment
          </h2>
          <p className="text-sm text-[#6B7280]">
            We'll use this to calculate your value per provider and compare you to benchmarks.
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
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#111827] mb-2">
              Which Metrics Are You Tracking?
            </h2>
            <p className="text-sm text-[#6B7280]">
              Select the metrics you have data for. We've organized these by how directly they connect to 
              financial value — so your story is clear and compelling at every level.
            </p>
          </div>

          {/* TIER 1: Core Financial Value */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div>
                <span className="text-sm font-semibold text-emerald-700">Core Financial Value</span>
                <span className="text-xs text-emerald-600 ml-2">Direct revenue connection</span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] mb-3 ml-9">These connect directly to revenue — the clearest part of your value story.</p>
            
            <div className="space-y-2">
              {TIER_1_METRICS.map((metric) => {
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
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-emerald-500 border-emerald-500" : "border-neutral-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-emerald-100" : "bg-neutral-100"
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? "text-emerald-600" : "text-neutral-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[#111827]">{metric.name}</h3>
                        {metric.recommended && (
                          <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Recommended</span>
                        )}
                      </div>
                      <p className="text-sm text-[#6B7280]">{metric.description}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">{metric.dollarizable}</p>
                    </div>
                    <span className="text-xs text-neutral-400 flex-shrink-0 hidden sm:block">{metric.source}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TIER 2: Operational Efficiency */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div>
                <span className="text-sm font-semibold text-blue-700">Operational Efficiency</span>
                <span className="text-xs text-blue-600 ml-2">Time that can become dollars</span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] mb-3 ml-9">Time saved is real. You decide how to express its value — or just show the hours.</p>
            
            <div className="space-y-2">
              {TIER_2_METRICS.map((metric) => {
                const isSelected = selectedMetrics.includes(metric.id);
                const Icon = metric.icon;
                
                return (
                  <div
                    key={metric.id}
                    className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white border-l-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-l-blue-500 border-blue-200 bg-blue-50/30"
                        : "border-l-transparent border-neutral-200 hover:border-neutral-300"
                    }`}
                    onClick={() => toggleMetric(metric.id)}
                    data-testid={`metric-${metric.id}`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-blue-500 border-blue-500" : "border-neutral-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-blue-100" : "bg-neutral-100"
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-neutral-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[#111827]">{metric.name}</h3>
                        {metric.recommended && (
                          <span className="text-[10px] font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Recommended</span>
                        )}
                      </div>
                      <p className="text-sm text-[#6B7280]">{metric.description}</p>
                      <p className="text-xs text-blue-600 mt-0.5">{metric.dollarizable}</p>
                    </div>
                    <span className="text-xs text-neutral-400 flex-shrink-0 hidden sm:block">{metric.source}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TIER 3: Quality Indicators */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <span className="text-sm font-semibold text-amber-700">Quality Indicators</span>
                <span className="text-xs text-amber-600 ml-2">Proof points that matter</span>
              </div>
            </div>
            <p className="text-xs text-[#6B7280] mb-3 ml-9">These show the behavioral change — adoption happening, habits shifting.</p>
            
            <div className="space-y-2">
              {TIER_3_METRICS.map((metric) => {
                const isSelected = selectedMetrics.includes(metric.id);
                const Icon = metric.icon;
                
                return (
                  <div
                    key={metric.id}
                    className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white border-l-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "border-l-amber-500 border-amber-200 bg-amber-50/30"
                        : "border-l-transparent border-neutral-200 hover:border-neutral-300 opacity-80"
                    }`}
                    onClick={() => toggleMetric(metric.id)}
                    data-testid={`metric-${metric.id}`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-amber-500 border-amber-500" : "border-neutral-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-amber-100" : "bg-neutral-100"
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? "text-amber-600" : "text-neutral-400"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium ${isSelected ? "text-[#111827]" : "text-neutral-600"}`}>{metric.name}</h3>
                      <p className="text-sm text-[#6B7280]">{metric.description}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{metric.dollarizable}</p>
                    </div>
                    <span className="text-xs text-neutral-400 flex-shrink-0 hidden sm:block">{metric.source}</span>
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
