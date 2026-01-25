import { ArrowRight, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedHeader, UnifiedHeaderSpacer } from '@/components/UnifiedHeader';
import { AmbientInputs, AmbientBenchmarks } from './SwitchAmbientFlow';

interface ComparisonItem {
  id: string;
  name: string;
  description: string;
  current: string;
  benchmark: string;
  gap: string;
  percentOfBenchmark: number;
  direction: 'up' | 'down';
  impact: string;
}

interface SwitchAdvancedComparisonProps {
  inputs: AmbientInputs;
  benchmarks: AmbientBenchmarks;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

export default function SwitchAdvancedComparison({
  inputs,
  benchmarks,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onBackToJourney
}: SwitchAdvancedComparisonProps) {
  
  const providers = inputs.providers;
  const totalEncounters = inputs.totalEncounters;
  const abridgeEncounters = Math.round(totalEncounters * (benchmarks.utilization / 100));
  
  const comparisons: ComparisonItem[] = [];
  
  if (inputs.selectedMetrics?.includes('timeSavings') && inputs.metricValues?.timeSavings !== undefined) {
    const current = inputs.metricValues.timeSavings;
    const benchmark = 4;
    const gap = benchmark - current;
    const percentOfBenchmark = Math.round((current / benchmark) * 100);
    const additionalHours = Math.round((gap * abridgeEncounters) / 60);
    
    comparisons.push({
      id: 'timeSavings',
      name: 'Time Savings',
      description: 'Minutes saved per encounter',
      current: `${current} min`,
      benchmark: `${benchmark} min`,
      gap: `+${gap.toFixed(1)} min`,
      percentOfBenchmark,
      direction: 'up',
      impact: `+${formatNumber(additionalHours)} hours/year`
    });
  }
  
  if (inputs.selectedMetrics?.includes('workOutsideWork') && inputs.metricValues?.workOutsideWork !== undefined) {
    const current = inputs.metricValues.workOutsideWork;
    const benchmark = 2;
    const gap = current - benchmark;
    const percentOfBenchmark = current > 0 ? Math.round((benchmark / current) * 100) : 100;
    const annualHoursSaved = gap * providers * 48;
    
    comparisons.push({
      id: 'workOutsideWork',
      name: 'Work Outside of Work',
      description: 'Hours worked after scheduled time',
      current: `${current} hrs/week`,
      benchmark: `${benchmark} hrs/week`,
      gap: `-${gap.toFixed(1)} hrs/week`,
      percentOfBenchmark,
      direction: 'down',
      impact: `-${formatNumber(Math.round(annualHoursSaved))} hours/year`
    });
  }
  
  if (inputs.selectedMetrics?.includes('wrvuLift') && inputs.metricValues?.wrvuLift !== undefined) {
    const current = inputs.metricValues.wrvuLift;
    const benchmark = 5;
    const gap = benchmark - current;
    const percentOfBenchmark = Math.round((current / benchmark) * 100);
    const baseWrvuPerEncounter = 1.5;
    const baselineWrvus = abridgeEncounters * baseWrvuPerEncounter;
    const additionalWrvus = Math.round(baselineWrvus * (gap / 100));
    
    comparisons.push({
      id: 'wrvuLift',
      name: 'wRVU Capture',
      description: '% improvement in wRVU capture',
      current: `${current}% lift`,
      benchmark: `${benchmark}% lift`,
      gap: `+${gap}pp`,
      percentOfBenchmark,
      direction: 'up',
      impact: `+${formatNumber(additionalWrvus)} wRVUs/year`
    });
  }
  
  if (inputs.selectedMetrics?.includes('chartClosure24h') && inputs.metricValues?.chartClosure24h !== undefined) {
    const current = inputs.metricValues.chartClosure24h;
    const benchmark = 78;
    const gap = benchmark - current;
    const percentOfBenchmark = Math.round((current / benchmark) * 100);
    
    comparisons.push({
      id: 'chartClosure24h',
      name: 'Chart Closure (24h)',
      description: '% of charts closed within 24 hours',
      current: `${current}%`,
      benchmark: `${benchmark}%`,
      gap: `+${gap}pp`,
      percentOfBenchmark,
      direction: 'up',
      impact: 'Faster billing cycles'
    });
  }
  
  const avgCaptureRate = comparisons.length > 0
    ? Math.round(comparisons.reduce((sum, c) => sum + c.percentOfBenchmark, 0) / comparisons.length)
    : 0;
  
  const getBadgeStyle = (percent: number) => {
    if (percent >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Near benchmark' };
    if (percent >= 50) return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Room to improve' };
    return { bg: 'bg-red-50', text: 'text-red-700', label: 'Significant gap' };
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <UnifiedHeader 
        pathType="switch"
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepName="Comparison"
        onBack={onBack}
      />
      <UnifiedHeaderSpacer />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 md:px-10 py-6 md:py-8 pb-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">
            How you compare
          </h1>
          <p className="text-base text-slate-500">
            Your current metrics vs. Abridge customer benchmarks
          </p>
        </div>
        
        <section className="bg-white rounded-2xl border border-slate-200 p-10 text-center mb-10">
          <span className="text-xs font-semibold text-slate-400 tracking-wide">OVERALL BENCHMARK ACHIEVEMENT</span>
          
          <div className="relative mt-6 mb-4 mx-auto max-w-md">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${avgCaptureRate}%`,
                  background: 'linear-gradient(90deg, #dc2626 0%, #f97316 50%, #059669 100%)'
                }}
              />
            </div>
            <div 
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${Math.min(avgCaptureRate, 95)}%` }}
            >
              <div className="w-1 h-6 bg-slate-800 rounded" />
            </div>
          </div>
          
          <div className="flex justify-between text-xs text-slate-400 max-w-md mx-auto mb-4">
            <span>0%</span>
            <span>Abridge Benchmark</span>
            <span>100%</span>
          </div>
          
          <p className="text-base text-slate-600">
            Across the metrics you selected, you're achieving <strong className="text-slate-900">{avgCaptureRate}%</strong> of Abridge customer benchmarks.
          </p>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">METRIC-BY-METRIC COMPARISON</h2>
          
          {comparisons.length === 0 && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500 mb-2">No metrics selected for comparison.</p>
              <p className="text-sm text-slate-400">Go back to select specific metrics to see detailed comparisons.</p>
            </div>
          )}
          
          <div className="space-y-4">
            {comparisons.map((comparison) => {
              const badge = getBadgeStyle(comparison.percentOfBenchmark);
              
              return (
                <div key={comparison.id} className="bg-white rounded-2xl border border-slate-200 p-8" data-testid={`comparison-card-${comparison.id}`}>
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{comparison.name}</h3>
                      <p className="text-sm text-slate-500">{comparison.description}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 mb-5">
                    <div className="flex-1 text-center">
                      <span className="block text-xs font-semibold text-slate-400 tracking-wide mb-1">YOUR CURRENT</span>
                      <span className="block text-2xl font-bold text-slate-700">{comparison.current}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-4">
                      <div className="w-12 h-0.5 bg-slate-200" />
                      <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${comparison.direction === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {comparison.direction === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span className="text-sm font-semibold">{comparison.gap}</span>
                      </div>
                      <div className="w-12 h-0.5 bg-slate-200" />
                    </div>
                    
                    <div className="flex-1 text-center">
                      <span className="flex items-center justify-center gap-1 text-xs font-semibold text-emerald-600 tracking-wide mb-1">
                        <Sparkles className="w-3 h-3" />
                        ABRIDGE BENCHMARK
                      </span>
                      <span className="block text-2xl font-bold text-emerald-600">{comparison.benchmark}</span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${comparison.percentOfBenchmark}%` }}
                      />
                    </div>
                    <span className="block text-xs text-slate-500 mt-1.5">
                      {comparison.percentOfBenchmark}% of benchmark
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm text-slate-500">Closing this gap means:</span>
                    <span className="text-sm font-semibold text-emerald-600">{comparison.impact}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        
        <section className="bg-slate-50 border border-slate-200 rounded-2xl p-8 mb-10">
          <p className="text-sm text-slate-600 mb-3">
            These gaps represent <strong className="text-slate-900">unrealized value</strong> — not because your current solution 
            is bad, but because small differences across multiple dimensions compound into significant overall impact.
          </p>
          <p className="text-sm text-slate-600">
            Let's quantify what this means in dollars.
          </p>
        </section>
      </main>
      
      <footer className="sticky bottom-0 bg-white border-t border-slate-200 px-6 md:px-10 py-4">
        <div className="max-w-5xl mx-auto">
          <Button
            onClick={onNext}
            className="w-full bg-[#EA2C00] hover:bg-[#d12700] text-white py-6 text-base font-medium"
            data-testid="button-continue"
          >
            See the value breakdown
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </footer>
    </div>
  );
}
