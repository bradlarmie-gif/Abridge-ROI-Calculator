import { useState, useMemo } from "react";
import { ArrowRight, ArrowLeft, TrendingUp, Info, Sparkles, Target, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
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
  const progressPercent = ((currentIndex + 1) / totalMetrics) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Premium background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-100/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent pointer-events-none" />
      
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
        <main className="relative z-10 max-w-xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Progress Section */}
          <motion.div 
            className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-4 shadow-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between text-sm mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EA2C00]/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-[#EA2C00]" />
                </div>
                <span className="font-semibold text-slate-700">Metric {currentIndex + 1} of {totalMetrics}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Value so far</span>
                <span className="ml-2 font-bold text-emerald-600">{formatCurrency(valueSoFar)}</span>
              </div>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-[#EA2C00] to-[#ff6b4a] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            {/* Metric dots */}
            <div className="flex justify-between mt-2 px-1">
              {selectedMetrics.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx < currentIndex ? 'bg-emerald-500' : 
                    idx === currentIndex ? 'bg-[#EA2C00]' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* Metric Header */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentMetric.key}
              className="text-center mb-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                {currentMetric.categoryName}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight" data-testid="text-metric-name">
                {currentMetric.name}
              </h1>
              <p className="text-base text-slate-500 mt-2 max-w-md mx-auto">
                {currentMetric.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Input Card */}
          <motion.div 
            className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 md:p-8 mb-6 shadow-lg shadow-slate-200/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex items-stretch justify-center gap-3 md:gap-6">
              {/* Before Input */}
              <div className="text-center flex-1 max-w-[180px]">
                <label className="block text-sm font-semibold text-slate-600 mb-3">Before</label>
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
                    className="w-full h-20 text-2xl md:text-3xl font-bold text-center border-2 border-slate-200 rounded-2xl focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 outline-none transition-all bg-slate-50 hover:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    data-testid="input-before"
                  />
                  <span className="absolute right-3 bottom-2 text-xs text-slate-400 font-medium">
                    {currentMetric.unit}
                  </span>
                </div>
              </div>
              
              {/* Arrow */}
              <div className="flex items-center justify-center pt-6">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              
              {/* After Input */}
              <div className="text-center flex-1 max-w-[180px]">
                <label className="block text-sm font-semibold text-slate-600 mb-3">After</label>
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
                    className="w-full h-20 text-2xl md:text-3xl font-bold text-center border-2 border-slate-200 rounded-2xl focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 outline-none transition-all bg-slate-50 hover:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    data-testid="input-after"
                  />
                  <span className="absolute right-3 bottom-2 text-xs text-slate-400 font-medium">
                    {currentMetric.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Impact Display */}
            <AnimatePresence>
              {hasValidData && liftDisplay !== null && (
                <motion.div 
                  className="mt-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-xl p-5 text-center"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">YOUR IMPACT</p>
                  <p className="text-3xl md:text-4xl font-bold text-emerald-700">
                    {liftDisplay >= 0 ? '+' : ''}{liftDisplay.toFixed(2)} {currentMetric.unit}
                  </p>
                  {liftPercent !== null && (
                    <p className="text-lg font-semibold text-emerald-600 mt-1">
                      {Math.abs(liftPercent).toFixed(0)}% {currentMetric.category === 'operational' && currentMetric.key !== 'utilizationRate' ? 'reduction' : 'lift'}
                    </p>
                  )}
                  {currentResult?.isStrong && (
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-sm font-medium text-emerald-700">
                      <CheckCircle className="w-4 h-4" />
                      Strong result
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Benchmark Status */}
          <AnimatePresence>
            {hasValidData && benchmarkStatus && (
              <motion.div 
                className="bg-slate-100/80 backdrop-blur-sm rounded-xl p-4 mb-4 border border-slate-200/50"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">BENCHMARK</p>
                <p className="text-sm text-slate-600">{currentMetric.benchmarkLabel}</p>
                <p className={`text-sm font-semibold mt-1.5 ${benchmarkStatus.isStrong ? 'text-emerald-600' : 'text-slate-600'}`}>
                  You're at {Math.abs(liftPercent || 0).toFixed(0)}% — {benchmarkStatus.label}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Calculated Value */}
          <AnimatePresence>
            {hasValidData && currentResult && currentResult.value > 0 && (
              <motion.div 
                className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 mb-6 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">CALCULATED VALUE</p>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Based on your deployment data and conservative attribution factors.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(currentResult.value)} 
                  <span className="text-base font-normal text-slate-500 ml-2">annual value</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 sm:flex-none sm:w-auto h-12 text-base font-medium border-2 hover:bg-slate-50"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-[#EA2C00] to-[#d12700] hover:from-[#d12700] hover:to-[#b82300] text-white h-12 text-base font-semibold shadow-lg shadow-[#EA2C00]/20"
              data-testid="button-next"
            >
              {currentIndex < totalMetrics - 1 ? 'Next Metric' : 'Continue'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </main>
      </PageTransition>
    </div>
  );
}
