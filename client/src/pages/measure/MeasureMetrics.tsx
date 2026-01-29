import { ArrowRight, ArrowLeft, DollarSign, Clock, Heart, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { 
  type MetricSelection, 
  type MetricKey,
  METRIC_DEFINITIONS,
  getMetricsByCategory 
} from "@/lib/measureCalculator";

interface MeasureMetricsProps {
  selectedMetrics: MetricSelection;
  updateMetric: (key: MetricKey, value: boolean) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const CATEGORY_ICONS = {
  financial: DollarSign,
  operational: Clock,
  quality: Heart,
};

const CATEGORY_COLORS = {
  financial: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600' },
  operational: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
  quality: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
};

interface MetricCheckboxProps {
  metricKey: MetricKey;
  name: string;
  description: string;
  isRecommended: boolean;
  isSelected: boolean;
  onToggle: () => void;
}

function MetricCheckbox({ metricKey, name, description, isRecommended, isSelected, onToggle }: MetricCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected 
          ? 'border-[#EA2C00] bg-orange-50' 
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
      data-testid={`checkbox-${metricKey}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
          isSelected 
            ? 'bg-[#EA2C00] border-[#EA2C00]' 
            : 'border-slate-300 bg-white'
        }`}>
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[#111827]">{name}</span>
            {isRecommended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                <Star className="w-3 h-3" />
                Recommended
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B7280] mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}

export default function MeasureMetrics({ 
  selectedMetrics, 
  updateMetric, 
  onNext, 
  onBack,
  onHome 
}: MeasureMetricsProps) {
  const selectedCount = Object.values(selectedMetrics).filter(Boolean).length;
  const canProceed = selectedCount > 0;

  const categories = [
    { key: 'financial' as const, title: 'Core Financial Value', subtitle: 'The bottom line' },
    { key: 'operational' as const, title: 'Operational Efficiency', subtitle: 'Where the hours went' },
    { key: 'quality' as const, title: 'Quality Indicators', subtitle: 'The human signals' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <UnifiedHeader 
        pathType="measure"
        currentStep={2} 
        totalSteps={5}
        stepName="Metrics"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <PageTransition pageKey="measure-metrics">
        <main className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-metrics-title">
              Which Metrics Can You Document?
            </h1>
            <p className="text-base md:text-lg text-[#6B7280]">
              Select the metrics you have before/after data for. We'll build your value story from what you choose.
            </p>
          </div>

          <div className="space-y-6">
            {categories.map(category => {
              const CategoryIcon = CATEGORY_ICONS[category.key];
              const colors = CATEGORY_COLORS[category.key];
              const metrics = getMetricsByCategory(category.key);
              
              return (
                <div 
                  key={category.key}
                  className={`${colors.bg} ${colors.border} border rounded-xl p-4 md:p-6`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <CategoryIcon className={`w-5 h-5 ${colors.icon}`} />
                    <div>
                      <h2 className="font-bold text-[#111827]">{category.title}</h2>
                      <p className="text-sm text-[#6B7280]">{category.subtitle}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {metrics.map(metric => (
                      <MetricCheckbox
                        key={metric.key}
                        metricKey={metric.key}
                        name={metric.name}
                        description={metric.description}
                        isRecommended={metric.isRecommended}
                        isSelected={selectedMetrics[metric.key]}
                        onToggle={() => updateMetric(metric.key, !selectedMetrics[metric.key])}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#6B7280]">
              Selected: <span className="font-semibold text-[#111827]">{selectedCount} metrics</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={onBack}
                className="h-12 text-base font-medium"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={onNext}
                disabled={!canProceed}
                className="bg-[#EA2C00] hover:bg-[#d12700] text-white h-12 px-6 text-base font-semibold disabled:opacity-50"
                data-testid="button-document"
              >
                Document Your Numbers
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </main>
      </PageTransition>
    </div>
  );
}
