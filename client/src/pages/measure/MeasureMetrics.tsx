import { ArrowRight, ArrowLeft, DollarSign, Clock, Heart, Check, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
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

const CATEGORY_CONFIG = {
  financial: { 
    icon: DollarSign,
    gradient: 'from-emerald-50 to-teal-50',
    border: 'border-emerald-200/60',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    activeBorder: 'border-emerald-400',
    activeBg: 'bg-emerald-50',
  },
  operational: { 
    icon: Clock,
    gradient: 'from-blue-50 to-indigo-50',
    border: 'border-blue-200/60',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    activeBorder: 'border-blue-400',
    activeBg: 'bg-blue-50',
  },
  quality: { 
    icon: Heart,
    gradient: 'from-purple-50 to-pink-50',
    border: 'border-purple-200/60',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    activeBorder: 'border-purple-400',
    activeBg: 'bg-purple-50',
  },
};

interface MetricCheckboxProps {
  metricKey: MetricKey;
  name: string;
  description: string;
  isRecommended: boolean;
  isSelected: boolean;
  onToggle: () => void;
  categoryConfig: typeof CATEGORY_CONFIG.financial;
}

function MetricCheckbox({ metricKey, name, description, isRecommended, isSelected, onToggle, categoryConfig }: MetricCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 group ${
        isSelected 
          ? `${categoryConfig.activeBorder} ${categoryConfig.activeBg} shadow-sm` 
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
      data-testid={`checkbox-${metricKey}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
          isSelected 
            ? `${categoryConfig.iconBg} ${categoryConfig.activeBorder}` 
            : 'border-slate-300 bg-white group-hover:border-slate-400'
        }`}>
          {isSelected && <Check className={`w-4 h-4 ${categoryConfig.iconColor}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{name}</span>
            {isRecommended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-xs font-semibold rounded-full shadow-sm">
                <Star className="w-3 h-3" />
                Recommended
              </span>
            )}
          </div>
          <p className={`text-sm mt-0.5 ${isSelected ? 'text-slate-600' : 'text-slate-500'}`}>{description}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Premium background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-100/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-100/20 via-transparent to-transparent pointer-events-none" />
      
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
        <main className="relative z-10 max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10">
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-purple-50 border border-emerald-200/50 rounded-full text-sm text-emerald-700 shadow-sm mb-4">
              <Sparkles className="w-4 h-4 text-[#EA2C00]" />
              <span className="font-semibold">Select Your Metrics</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight" data-testid="text-metrics-title">
              Which Metrics Can You Document?
            </h1>
            <p className="text-base md:text-lg text-slate-500 max-w-lg mx-auto">
              Select the metrics you have before/after data for. We'll build your value story from what you choose.
            </p>
          </motion.div>

          <div className="space-y-6">
            {categories.map((category, categoryIdx) => {
              const config = CATEGORY_CONFIG[category.key];
              const CategoryIcon = config.icon;
              const metrics = getMetricsByCategory(category.key);
              
              return (
                <motion.div 
                  key={category.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: categoryIdx * 0.1 }}
                  className={`bg-gradient-to-br ${config.gradient} ${config.border} border rounded-2xl p-5 md:p-6 shadow-sm`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${config.iconBg} flex items-center justify-center shadow-sm`}>
                      <CategoryIcon className={`w-5 h-5 ${config.iconColor}`} />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900">{category.title}</h2>
                      <p className="text-sm text-slate-500">{category.subtitle}</p>
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
                        categoryConfig={config}
                      />
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div 
            className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                selectedCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {selectedCount}
              </div>
              <span className="text-sm text-slate-600">metrics selected</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={onBack}
                className="h-12 text-base font-medium border-2 hover:bg-slate-50"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={onNext}
                disabled={!canProceed}
                className="bg-gradient-to-r from-[#EA2C00] to-[#d12700] hover:from-[#d12700] hover:to-[#b82300] text-white h-12 px-6 text-base font-semibold shadow-lg shadow-[#EA2C00]/20 disabled:opacity-50 disabled:shadow-none"
                data-testid="button-document"
              >
                Document Your Numbers
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </main>
      </PageTransition>
    </div>
  );
}
