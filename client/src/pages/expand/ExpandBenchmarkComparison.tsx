import { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Target,
  Sparkles,
  DollarSign,
  Clock,
  FileCheck,
  FileText,
  Moon,
  Smile
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import type { DeploymentData, MetricType, MetricsData } from "./ExpandFlow";

interface ExpandBenchmarkComparisonProps {
  deploymentData: DeploymentData;
  selectedMetrics: MetricType[];
  metricsData: MetricsData;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

interface BenchmarkConfig {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  unit: string;
  typicalMin: number;
  typicalMax: number;
  topPerformer: number;
  isHigherBetter: boolean;
  getValue: (data: MetricsData) => number | null;
  formatValue: (val: number) => string;
  insight: (val: number, status: string) => string;
}

// Abridge benchmarks for each metric
const BENCHMARKS: Record<MetricType, BenchmarkConfig> = {
  wrvuCapture: {
    name: "wRVU per Encounter",
    icon: DollarSign,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    unit: "% lift",
    typicalMin: 3,
    typicalMax: 9,
    topPerformer: 12,
    isHigherBetter: true,
    getValue: (data: MetricsData) => {
      const before = data.wrvuCapture.before;
      const after = data.wrvuCapture.after;
      if (!before || !after || before === 0) return null;
      return ((after - before) / before) * 100;
    },
    formatValue: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`,
    insight: (val: number, status: string) => {
      if (status === 'above') return "Exceptional capture improvement. Your documentation is clearly driving revenue.";
      if (status === 'on-track') return "Solid wRVU improvement. You're capturing more of the work providers actually do.";
      return "Room to grow. Better documentation quality typically drives higher capture rates.";
    }
  },
  timeSavings: {
    name: "Time in Notes",
    icon: Clock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    unit: "min reduction",
    typicalMin: 3,
    typicalMax: 5,
    topPerformer: 7,
    isHigherBetter: true, // Higher reduction is better
    getValue: (data: MetricsData) => {
      const before = data.timeSavings.before;
      const after = data.timeSavings.after;
      if (before === null || after === null) return null;
      return before - after;
    },
    formatValue: (val: number) => `${val >= 0 ? '-' : '+'}${Math.abs(val).toFixed(1)} min`,
    insight: (val: number, status: string) => {
      if (status === 'above') return "Outstanding efficiency gains. Providers are spending significantly less time on notes.";
      if (status === 'on-track') return "Good time savings. This translates directly to provider satisfaction and capacity.";
      return "Early-stage gains. Time savings typically grow as providers build fluency with the tool.";
    }
  },
  chartClosure: {
    name: "Same-Day Chart Closure",
    icon: FileCheck,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    unit: "% improvement",
    typicalMin: 10,
    typicalMax: 25,
    topPerformer: 40,
    isHigherBetter: true,
    getValue: (data: MetricsData) => {
      const before = data.chartClosure.sameDayBefore ?? data.chartClosure.before.within24;
      const after = data.chartClosure.sameDayAfter ?? data.chartClosure.after.within24;
      if (before === null || after === null) return null;
      return after - before;
    },
    formatValue: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(0)}pts`,
    insight: (val: number, status: string) => {
      if (status === 'above') return "Excellent closure rates. This accelerates your revenue cycle significantly.";
      if (status === 'on-track') return "Healthy improvement. Same-day closure reduces AR days and improves cash flow.";
      return "Opportunity here. Chart closure often improves as workflow integration matures.";
    }
  },
  levelOfService: {
    name: "Average E&M Level",
    icon: FileText,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    unit: "level increase",
    typicalMin: 0.2,
    typicalMax: 0.5,
    topPerformer: 0.8,
    isHigherBetter: true,
    getValue: (data: MetricsData) => {
      const before = data.levelOfService.averageBefore;
      const after = data.levelOfService.averageAfter;
      if (before === null || after === null) return null;
      return after - before;
    },
    formatValue: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}`,
    insight: (val: number, status: string) => {
      if (status === 'above') return "Strong coding improvement. Documentation is capturing complexity appropriately.";
      if (status === 'on-track') return "Good level improvement. Better notes = more accurate coding.";
      return "Watch this metric. Level improvement often follows utilization gains.";
    }
  },
  workOutsideWork: {
    name: "Work Outside of Work",
    icon: Moon,
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
    unit: "hrs/week reduction",
    typicalMin: 2,
    typicalMax: 5,
    topPerformer: 8,
    isHigherBetter: true,
    getValue: (data: MetricsData) => {
      const before = data.workOutsideWork.before;
      const after = data.workOutsideWork.after;
      if (before === null || after === null) return null;
      return before - after;
    },
    formatValue: (val: number) => `${val >= 0 ? '-' : '+'}${Math.abs(val).toFixed(1)} hrs`,
    insight: (val: number, status: string) => {
      if (status === 'above') return "Major quality of life improvement. Providers are getting their evenings back.";
      if (status === 'on-track') return "Meaningful reduction. This directly impacts burnout and retention.";
      return "Still early. Pajama time reduction typically follows in-clinic efficiency gains.";
    }
  },
  clinicianSatisfaction: {
    name: "Clinician Satisfaction",
    icon: Smile,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
    unit: "point improvement",
    typicalMin: 10,
    typicalMax: 25,
    topPerformer: 40,
    isHigherBetter: true,
    getValue: (data: MetricsData) => {
      const before = data.clinicianSatisfaction.before;
      const after = data.clinicianSatisfaction.after;
      if (before === null || after === null) return null;
      return after - before;
    },
    formatValue: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(0)}pts`,
    insight: (val: number, status: string) => {
      if (status === 'above') return "Exceptional satisfaction lift. Your providers love this tool.";
      if (status === 'on-track') return "Strong satisfaction improvement. Happy providers = lower turnover.";
      return "Room to grow. Satisfaction often lags initial adoption by a few months.";
    }
  },
  utilization: {
    name: "Utilization Rate",
    icon: TrendingUp,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    unit: "% improvement",
    typicalMin: 10,
    typicalMax: 25,
    topPerformer: 40,
    isHigherBetter: true,
    getValue: (data: MetricsData) => {
      const before = data.utilization.before;
      const after = data.utilization.after;
      if (before === null || after === null) return null;
      return after - before;
    },
    formatValue: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(0)}pts`,
    insight: (val: number, status: string) => {
      if (status === 'above') return "Outstanding adoption growth. Providers are embracing the tool.";
      if (status === 'on-track') return "Healthy adoption trajectory. Keep the momentum going.";
      return "Adoption is building. Focus on training and workflow integration.";
    }
  },
  diagnosisCapture: {
    name: "Diagnosis Capture",
    icon: Target,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
    unit: "% improvement",
    typicalMin: 2,
    typicalMax: 5,
    topPerformer: 10,
    isHigherBetter: true,
    getValue: (data: MetricsData) => {
      const before = data.diagnosisCapture.before;
      const after = data.diagnosisCapture.after;
      if (before === null || after === null) return null;
      return after - before;
    },
    formatValue: (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`,
    insight: (val: number, status: string) => {
      if (status === 'above') return "Excellent HCC capture improvement. Documentation is driving risk adjustment revenue.";
      if (status === 'on-track') return "Good diagnosis capture. Complete documentation supports accurate coding.";
      return "Early gains in diagnosis capture. This typically grows with documentation quality.";
    }
  },
};

function getStatus(value: number, benchmark: typeof BENCHMARKS.wrvuCapture): 'above' | 'on-track' | 'developing' {
  if (value >= benchmark.typicalMax) return 'above';
  if (value >= benchmark.typicalMin) return 'on-track';
  return 'developing';
}

function getStatusConfig(status: 'above' | 'on-track' | 'developing') {
  switch (status) {
    case 'above':
      return {
        label: 'Exceeding',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: CheckCircle2,
        barColor: 'bg-emerald-500',
      };
    case 'on-track':
      return {
        label: 'On Track',
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: TrendingUp,
        barColor: 'bg-blue-500',
      };
    case 'developing':
      return {
        label: 'Developing',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: AlertCircle,
        barColor: 'bg-amber-500',
      };
  }
}

export default function ExpandBenchmarkComparison({
  deploymentData,
  selectedMetrics,
  metricsData,
  onNext,
  onBack,
  onBackToJourney,
}: ExpandBenchmarkComparisonProps) {
  
  // Calculate scores for each selected metric
  const metricResults = useMemo(() => {
    return selectedMetrics.map(metricId => {
      const benchmark = BENCHMARKS[metricId];
      if (!benchmark) return null;
      
      const value = benchmark.getValue(metricsData);
      if (value === null) return null;
      
      const status = getStatus(value, benchmark);
      const statusConfig = getStatusConfig(status);
      
      // Calculate progress bar percentage (cap at 100%)
      const progressPercent = Math.min((value / benchmark.topPerformer) * 100, 100);
      
      return {
        id: metricId,
        benchmark: {
          ...benchmark,
          insight: benchmark.insight as (val: number, status: string) => string,
        },
        value,
        status,
        statusConfig,
        progressPercent,
        insight: benchmark.insight(value, status) as string,
      };
    }).filter(Boolean);
  }, [selectedMetrics, metricsData]);

  // Calculate overall deployment health score
  const healthScore = useMemo(() => {
    if (metricResults.length === 0) return 0;
    
    const scores: number[] = metricResults.map(result => {
      if (!result) return 0;
      if (result.status === 'above') return 100;
      if (result.status === 'on-track') return 75;
      return 40;
    });
    
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [metricResults]);

  const getHealthLabel = (score: number) => {
    if (score >= 85) return { label: 'Thriving', color: 'text-emerald-600' };
    if (score >= 65) return { label: 'Healthy', color: 'text-blue-600' };
    if (score >= 45) return { label: 'Developing', color: 'text-amber-600' };
    return { label: 'Early Stage', color: 'text-neutral-600' };
  };

  const healthLabel = getHealthLabel(healthScore);
  
  const aboveCount = metricResults.filter(r => r?.status === 'above').length;
  const onTrackCount = metricResults.filter(r => r?.status === 'on-track').length;
  const developingCount = metricResults.filter(r => r?.status === 'developing').length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <UnifiedHeader 
        pathType="expand"
        currentStep={3}
        totalSteps={5}
        stepName="Your Impact"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-10">
        {/* Hero Section - The Reveal */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
            Here's What You've Built
          </h1>
          <p className="text-base text-[#6B7280] max-w-2xl mx-auto">
            Your data tells a story of transformation. Let's see how you compare to other 
            successful ambient AI deployments.
          </p>
        </motion.div>

        {/* Overall Health Score Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white border border-neutral-200 rounded-2xl p-6 md:p-8 mb-8 shadow-sm"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-neutral-50 flex items-center justify-center relative border border-neutral-100">
                <div className="text-center">
                  <div className="text-4xl md:text-5xl font-bold text-[#1F2937]">{healthScore}</div>
                  <div className="text-xs text-[#6B7280] uppercase tracking-wider font-medium">Health Score</div>
                </div>
                {/* Circular progress indicator */}
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    stroke="#E5E7EB" 
                    strokeWidth="6" 
                    fill="none" 
                  />
                  <circle 
                    cx="50" cy="50" r="45" 
                    stroke={healthScore >= 65 ? '#10B981' : healthScore >= 45 ? '#3B82F6' : '#F59E0B'}
                    strokeWidth="6" 
                    fill="none" 
                    strokeDasharray={`${(healthScore / 100) * 283} 283`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span className={`text-xl font-semibold ${healthLabel.color}`}>
                  {healthLabel.label}
                </span>
              </div>
              <p className="text-[#4B5563] text-sm md:text-base mb-4 leading-relaxed">
                {healthScore >= 65 
                  ? "Your deployment is performing well across key metrics. You're realizing real value."
                  : healthScore >= 45
                  ? "You're making progress. Some metrics are strong, others have room to grow."
                  : "You're in the early stages. This is normal — value compounds over time."
                }
              </p>
              
              {/* Status summary pills */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                {aboveCount > 0 && (
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                    {aboveCount} Exceeding
                  </span>
                )}
                {onTrackCount > 0 && (
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    {onTrackCount} On Track
                  </span>
                )}
                {developingCount > 0 && (
                  <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                    {developingCount} Developing
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Per-Metric Breakdown */}
        <div className="space-y-4 mb-8">
          <h2 className="text-sm font-semibold text-[#6B7280] tracking-wider uppercase mb-4">
            METRIC BY METRIC
          </h2>
          
          {metricResults.map((result, index) => {
            if (!result) return null;
            const Icon = result.benchmark.icon;
            const StatusIcon = result.statusConfig.icon;
            
            return (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`bg-white rounded-xl border ${result.statusConfig.border} p-5 md:p-6`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl ${result.benchmark.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 md:w-6 md:h-6 ${result.benchmark.iconColor}`} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-[#111827]">{result.benchmark.name}</h3>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${result.statusConfig.bg}`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${result.statusConfig.color}`} />
                        <span className={`text-xs font-semibold ${result.statusConfig.color}`}>
                          {result.statusConfig.label}
                        </span>
                      </div>
                    </div>
                    
                    {/* Value and benchmark comparison */}
                    <div className="flex items-center gap-4 mb-3">
                      <div>
                        <span className="text-2xl font-bold text-[#111827]">
                          {result.benchmark.formatValue(result.value)}
                        </span>
                        <span className="text-sm text-[#6B7280] ml-2">your result</span>
                      </div>
                      <div className="text-sm text-[#9CA3AF]">
                        vs. typical {result.benchmark.typicalMin}–{result.benchmark.typicalMax} {result.benchmark.unit}
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full rounded-full ${result.statusConfig.barColor}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${result.progressPercent}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-[#9CA3AF] mt-1">
                        <span>Baseline</span>
                        <span>Top performer ({result.benchmark.topPerformer} {result.benchmark.unit})</span>
                      </div>
                    </div>
                    
                    {/* Insight */}
                    <p className="text-sm text-[#6B7280] leading-relaxed">
                      {result.insight}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {metricResults.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-amber-800">
                Enter your before/after data to see how you compare to benchmarks.
              </p>
            </div>
          )}
        </div>

        {/* What This Means */}
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-5 md:p-6 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">What This Tells You</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                {healthScore >= 65 
                  ? "You're in a strong position. The value you're seeing is real and measurable. The next step is translating these results into financial terms your leadership can act on."
                  : healthScore >= 45
                  ? "You're on the journey. Some metrics are performing well, while others need attention. This is common at your stage — the key is understanding which levers to pull."
                  : "You're building the foundation. Early-stage deployments often show mixed results as providers adapt. Focus on utilization first — other metrics follow."
                }
              </p>
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
            See Your Value
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
