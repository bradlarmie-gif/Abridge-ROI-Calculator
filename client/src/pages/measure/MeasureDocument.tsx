import { useState, useMemo } from "react";
import { ArrowRight, ArrowLeft, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  type MeasureState,
  type MetricDefinition,
  type BeforeAfterData,
  getSelectedMetricDefinitions,
  formatCurrency,
  calculateMeasureResults,
} from "@/lib/measureCalculator";

interface MeasureDocumentProps {
  state: MeasureState;
  updateMetricData: (key: string, field: 'before' | 'after', value: number | null) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureDocument({ 
  state, 
  updateMetricData, 
  onNext, 
  onBack,
  onHome 
}: MeasureDocumentProps) {
  const selectedMetrics = useMemo(() => 
    getSelectedMetricDefinitions(state.selectedMetrics), 
    [state.selectedMetrics]
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentMetric = selectedMetrics[currentIndex];
  const totalMetrics = selectedMetrics.length;
  
  const currentData = currentMetric ? state.metricData[currentMetric.key] : { before: null, after: null };
  
  const results = useMemo(() => calculateMeasureResults(state), [state]);
  
  const valueSoFar = results.totalValue;
  
  const hasValidData = currentData.before !== null && currentData.after !== null;
  
  const currentResult = useMemo(() => {
    if (!currentMetric || !hasValidData) return null;
    return currentMetric.calculateValue(currentData, state.deployment);
  }, [currentMetric, currentData, state.deployment, hasValidData]);

  const liftPercent = useMemo(() => {
    if (!currentData.before || currentData.before === 0 || currentData.after === null) return null;
    
    if (currentMetric?.category === 'operational' && currentMetric.key !== 'utilizationRate') {
      return ((currentData.before - currentData.after) / currentData.before) * 100;
    }
    return ((currentData.after - currentData.before) / currentData.before) * 100;
  }, [currentData, currentMetric]);

  const liftDisplay = useMemo(() => {
    if (!currentData.before || currentData.after === null) return null;
    
    if (currentMetric?.category === 'operational' && currentMetric.key !== 'utilizationRate') {
      return currentData.before - currentData.after;
    }
    return currentData.after - currentData.before;
  }, [currentData, currentMetric]);

  const getBenchmarkStatus = () => {
    if (liftPercent === null || !currentMetric) return null;
    const absLift = Math.abs(liftPercent);
    const { low, high } = currentMetric.benchmarkRange;
    
    if (absLift >= high) return { label: 'Above typical range', isStrong: true };
    if (absLift >= low) return { label: 'Within typical range', isStrong: false };
    return { label: 'Below typical range', isStrong: false };
  };

  const handleNext = () => {
    if (currentIndex < totalMetrics - 1) {
      setCurrentIndex(currentIndex + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onNext();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onBack();
    }
  };

  if (!currentMetric) {
    return null;
  }

  const benchmarkStatus = getBenchmarkStatus();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <UnifiedHeader 
        pathType="measure"
        currentStep={3} 
        totalSteps={5}
        stepName="Document"
        onBack={handleBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <PageTransition pageKey={`measure-document-${currentMetric.slug}`}>
        <main className="max-w-xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-[#6B7280] mb-2">
              <span>Metric {currentIndex + 1} of {totalMetrics}</span>
              <span>Value so far: <span className="font-semibold text-[#111827]">{formatCurrency(valueSoFar)}</span></span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#EA2C00] rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / totalMetrics) * 100}%` }}
              />
            </div>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-[#6B7280] text-sm mb-2">
              <span className="capitalize">{currentMetric.categoryName}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#111827]" data-testid="text-metric-name">
              {currentMetric.name}
            </h1>
            <p className="text-base text-[#6B7280] mt-1">
              {currentMetric.description}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-8 mb-6">
            <div className="flex items-center justify-center gap-4 md:gap-8 mb-6">
              <div className="text-center flex-1">
                <label className="block text-sm font-medium text-[#6B7280] mb-2">Before</label>
                <div className="relative">
                  <input
                    type="number"
                    value={currentData.before ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                      updateMetricData(currentMetric.key, 'before', val);
                    }}
                    placeholder="--"
                    step="any"
                    className="w-full h-16 text-2xl md:text-3xl font-bold text-center border-2 border-slate-200 rounded-xl focus:border-[#EA2C00] focus:ring-0 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    data-testid="input-before"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">
                    {currentMetric.unit}
                  </span>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <ArrowRight className="w-6 h-6 text-[#9CA3AF]" />
              </div>
              
              <div className="text-center flex-1">
                <label className="block text-sm font-medium text-[#6B7280] mb-2">After</label>
                <div className="relative">
                  <input
                    type="number"
                    value={currentData.after ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseFloat(e.target.value);
                      updateMetricData(currentMetric.key, 'after', val);
                    }}
                    placeholder="--"
                    step="any"
                    className="w-full h-16 text-2xl md:text-3xl font-bold text-center border-2 border-slate-200 rounded-xl focus:border-[#EA2C00] focus:ring-0 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    data-testid="input-after"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#6B7280]">
                    {currentMetric.unit}
                  </span>
                </div>
              </div>
            </div>

            {hasValidData && liftDisplay !== null && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 text-center">
                <p className="text-sm font-medium text-emerald-700 mb-1">YOUR IMPACT</p>
                <p className="text-2xl md:text-3xl font-bold text-emerald-800">
                  {liftDisplay >= 0 ? '+' : ''}{liftDisplay.toFixed(2)} {currentMetric.unit}
                </p>
                {liftPercent !== null && (
                  <p className="text-lg font-medium text-emerald-600">
                    {Math.abs(liftPercent).toFixed(0)}% {currentMetric.category === 'operational' && currentMetric.key !== 'utilizationRate' ? 'reduction' : 'lift'}
                  </p>
                )}
                {currentResult?.isStrong && (
                  <p className="text-sm text-emerald-600 mt-2 flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Strong result
                  </p>
                )}
              </div>
            )}
          </div>

          {hasValidData && benchmarkStatus && (
            <div className="bg-slate-100 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-[#374151] mb-1">BENCHMARK</p>
              <p className="text-sm text-[#6B7280]">{currentMetric.benchmarkLabel}</p>
              <p className={`text-sm font-medium mt-1 ${benchmarkStatus.isStrong ? 'text-emerald-600' : 'text-slate-600'}`}>
                You're at {Math.abs(liftPercent || 0).toFixed(0)}% — {benchmarkStatus.label}
              </p>
            </div>
          )}

          {hasValidData && currentResult && currentResult.value > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-2">
                <p className="text-sm font-medium text-[#374151] mb-2">CALCULATED VALUE</p>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-[#9CA3AF]" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">Based on your deployment data and conservative attribution factors.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-[#111827]">
                {formatCurrency(currentResult.value)} <span className="text-base font-normal text-[#6B7280]">annual value</span>
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 sm:flex-none sm:w-auto h-12 text-base font-medium"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 bg-[#EA2C00] hover:bg-[#d12700] text-white h-12 text-base font-semibold"
              data-testid="button-next"
            >
              {currentIndex < totalMetrics - 1 ? 'Next Metric' : 'Continue'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </main>
      </PageTransition>
    </div>
  );
}
