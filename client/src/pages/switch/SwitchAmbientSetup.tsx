import { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Settings, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AmbientInputs, AmbientCalculations, AmbientBenchmarks, AmbientMode, MetricValues } from './SwitchAmbientFlow';

interface SwitchAmbientSetupProps {
  inputs: AmbientInputs;
  setInputs: (inputs: AmbientInputs) => void;
  calculations: AmbientCalculations;
  benchmarks: AmbientBenchmarks;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

const providerRanges = [
  { id: '<25', label: '<25', midpoint: 15 },
  { id: '25-50', label: '25-50', midpoint: 37 },
  { id: '50-100', label: '50-100', midpoint: 75 },
  { id: '100-200', label: '100-200', midpoint: 150 },
  { id: '200+', label: '200+', midpoint: 250 }
];

interface AdvancedMetric {
  id: keyof MetricValues;
  name: string;
  description: string;
  unit: string;
  benchmark: string;
  benchmarkValue: number;
  recommended: boolean;
  min?: number;
  max?: number;
  step?: number;
}

const advancedMetrics: AdvancedMetric[] = [
  {
    id: 'timeSavings',
    name: 'Time Savings',
    description: 'Minutes saved per encounter',
    unit: 'min/encounter',
    benchmark: '3-5 min',
    benchmarkValue: 4,
    recommended: true,
    min: 0,
    max: 10,
    step: 0.5
  },
  {
    id: 'workOutsideWork',
    name: 'Work Outside of Work',
    description: 'Hours worked after scheduled time',
    unit: 'hrs/week',
    benchmark: '2 hrs/week',
    benchmarkValue: 2,
    recommended: true,
    min: 0,
    max: 10,
    step: 0.5
  },
  {
    id: 'levelOfService',
    name: 'Average Level of Service',
    description: 'Weighted E/M level (1-5 scale)',
    unit: 'avg level',
    benchmark: '4.1',
    benchmarkValue: 4.1,
    recommended: true,
    min: 1,
    max: 5,
    step: 0.1
  },
  {
    id: 'wrvuLift',
    name: 'wRVU Lift',
    description: '% improvement in wRVU capture',
    unit: '%',
    benchmark: '5%',
    benchmarkValue: 5,
    recommended: true,
    min: 0,
    max: 15,
    step: 0.5
  },
  {
    id: 'chartClosure24h',
    name: 'Chart Closure (24h)',
    description: '% of charts closed within 24 hours',
    unit: '%',
    benchmark: '78%',
    benchmarkValue: 78,
    recommended: false,
    min: 0,
    max: 100,
    step: 1
  },
  {
    id: 'satisfaction',
    name: 'Clinician Satisfaction',
    description: 'Provider satisfaction score (1-10)',
    unit: '/10',
    benchmark: '8.5/10',
    benchmarkValue: 8.5,
    recommended: false,
    min: 1,
    max: 10,
    step: 0.5
  }
];

export default function SwitchAmbientSetup({
  inputs,
  setInputs,
  calculations,
  benchmarks,
  currentStep,
  totalSteps,
  onNext,
  onBack
}: SwitchAmbientSetupProps) {
  
  const handleProviderRangeChange = (rangeId: string) => {
    const range = providerRanges.find(r => r.id === rangeId);
    if (range) {
      setInputs({
        ...inputs,
        providerRange: rangeId,
        providers: range.midpoint,
        totalEncounters: range.midpoint * inputs.encountersPerProvider
      });
    }
  };
  
  const handleModeChange = (mode: AmbientMode) => {
    setInputs({ ...inputs, mode });
  };
  
  const toggleMetric = (metricId: keyof MetricValues) => {
    const current = inputs.selectedMetrics;
    if (current.includes(metricId)) {
      setInputs({
        ...inputs,
        selectedMetrics: current.filter(m => m !== metricId)
      });
    } else {
      setInputs({
        ...inputs,
        selectedMetrics: [...current, metricId]
      });
    }
  };
  
  const updateMetricValue = (metricId: keyof MetricValues, value: number) => {
    setInputs({
      ...inputs,
      metricValues: {
        ...inputs.metricValues,
        [metricId]: value
      }
    });
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-500 flex items-center gap-1"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span className="text-xs font-semibold text-slate-400 tracking-wide">SWITCH</span>
          </div>
          
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === currentStep - 1 
                    ? 'w-6 bg-slate-800' 
                    : i < currentStep 
                      ? 'w-2 bg-slate-800' 
                      : 'w-2 bg-slate-200'
                }`}
                data-testid={`progress-dot-${i + 1}`}
              />
            ))}
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Let's see where you stand
          </h1>
        </div>
        
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => handleModeChange('quick')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                inputs.mode === 'quick'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid="button-mode-quick"
            >
              <Zap className="w-4 h-4" />
              Quick Estimate
            </button>
            <button
              onClick={() => handleModeChange('advanced')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                inputs.mode === 'advanced'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              data-testid="button-mode-advanced"
            >
              <Settings className="w-4 h-4" />
              Advanced
            </button>
          </div>
        </div>
        
        <p className="text-center text-sm text-slate-500 mb-8">
          {inputs.mode === 'quick'
            ? "High-level comparison based on utilization and efficiency"
            : "Detailed metric-by-metric comparison for more accurate analysis"
          }
        </p>
        
        {inputs.mode === 'quick' && (
          <>
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">YOUR SETUP</h2>
              
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <label className="block text-sm font-medium text-slate-700 mb-4">
                  Providers using your current solution
                </label>
                <div className="flex flex-wrap gap-2">
                  {providerRanges.map(range => (
                    <button
                      key={range.id}
                      onClick={() => handleProviderRangeChange(range.id)}
                      className={`px-5 py-3 rounded-xl border text-sm font-medium transition-all ${
                        inputs.providerRange === range.id
                          ? 'bg-slate-800 border-slate-800 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                      data-testid={`button-range-${range.id}`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <section className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-slate-400 tracking-wide">UTILIZATION</h3>
                  <p className="text-sm text-slate-500 mt-1">What % of encounters use the tool?</p>
                </div>
                
                <div className="text-center mb-4">
                  <span className="text-xs font-semibold text-slate-400 tracking-wide">YOUR ESTIMATE</span>
                  <span className="block text-4xl font-bold text-slate-900 mt-1" data-testid="text-utilization-value">
                    {inputs.utilization}%
                  </span>
                </div>
                
                <div className="relative mb-4">
                  <input
                    type="range"
                    min={20}
                    max={90}
                    value={inputs.utilization}
                    onChange={(e) => setInputs({ ...inputs, utilization: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                    data-testid="slider-utilization"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>20%</span>
                    <span>90%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 rounded-lg">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">
                    Abridge avg: <strong>{benchmarks.utilization}%</strong>
                  </span>
                </div>
              </section>
              
              <section className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="mb-5">
                  <h3 className="text-xs font-semibold text-slate-400 tracking-wide">EFFICIENCY</h3>
                  <p className="text-sm text-slate-500 mt-1">Time saved per encounter?</p>
                </div>
                
                <div className="text-center mb-4">
                  <span className="text-xs font-semibold text-slate-400 tracking-wide">YOUR ESTIMATE</span>
                  <span className="block text-4xl font-bold text-slate-900 mt-1" data-testid="text-efficiency-value">
                    {inputs.efficiency} min
                  </span>
                </div>
                
                <div className="relative mb-4">
                  <input
                    type="range"
                    min={0.5}
                    max={5}
                    step={0.5}
                    value={inputs.efficiency}
                    onChange={(e) => setInputs({ ...inputs, efficiency: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                    data-testid="slider-efficiency"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>0.5 min</span>
                    <span>5 min</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 rounded-lg">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">
                    Abridge avg: <strong>3-5 min</strong>
                  </span>
                </div>
              </section>
            </div>
            
            <section className="bg-white rounded-2xl border border-slate-200 p-6 mb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-semibold text-slate-400 tracking-wide">THE GAP</h2>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">LIVE</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="text-center">
                  <span className="block text-xs font-semibold text-slate-400 tracking-wide mb-4">YOU</span>
                  
                  <div className="bg-slate-50 rounded-xl p-4 mb-3">
                    <span className="block text-2xl font-bold text-slate-900" data-testid="text-your-encounters">
                      {formatNumber(calculations.currentDocumentedEncounters)}
                    </span>
                    <span className="text-xs text-slate-500">encounters documented</span>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4">
                    <span className="block text-2xl font-bold text-slate-900" data-testid="text-your-hours">
                      {formatNumber(calculations.currentHoursReturned)}
                    </span>
                    <span className="text-xs text-slate-500">hours returned</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-8 py-8">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-slate-200" />
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded whitespace-nowrap" data-testid="text-gap-encounters">
                      +{formatNumber(calculations.additionalEncounters)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-slate-200" />
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded whitespace-nowrap" data-testid="text-gap-hours">
                      +{formatNumber(calculations.additionalHours)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded flex items-center justify-center text-white font-bold text-xs">
                      A
                    </div>
                    <span className="text-xs font-semibold text-slate-400 tracking-wide">ABRIDGE</span>
                  </div>
                  
                  <div className="bg-emerald-50 rounded-xl p-4 mb-3">
                    <span className="block text-2xl font-bold text-emerald-600" data-testid="text-abridge-encounters">
                      {formatNumber(calculations.abridgeDocumentedEncounters)}
                    </span>
                    <span className="text-xs text-emerald-700">encounters documented</span>
                  </div>
                  
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <span className="block text-2xl font-bold text-emerald-600" data-testid="text-abridge-hours">
                      {formatNumber(calculations.abridgeHoursReturned)}
                    </span>
                    <span className="text-xs text-emerald-700">hours returned</span>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-sm text-slate-400 mt-6 pt-4 border-t border-slate-100">
                Based on {inputs.providers} providers at ~{formatNumber(inputs.encountersPerProvider)} encounters/provider/year
              </div>
            </section>
          </>
        )}
        
        {inputs.mode === 'advanced' && (
          <>
            <section className="mb-8">
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">DEPLOYMENT BASICS</h2>
              
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Providers using current solution
                    </label>
                    <Input
                      type="number"
                      value={inputs.providers}
                      onChange={(e) => {
                        const providers = Number(e.target.value) || 0;
                        setInputs({
                          ...inputs,
                          providers,
                          totalEncounters: providers * inputs.encountersPerProvider
                        });
                      }}
                      placeholder="e.g., 75"
                      className="w-full"
                      data-testid="input-providers"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Total annual encounters
                    </label>
                    <Input
                      type="number"
                      value={inputs.totalEncounters}
                      onChange={(e) => setInputs({ ...inputs, totalEncounters: Number(e.target.value) || 0 })}
                      placeholder="e.g., 150,000"
                      className="w-full"
                      data-testid="input-encounters"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current utilization
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={inputs.utilization}
                        onChange={(e) => setInputs({ ...inputs, utilization: Number(e.target.value) || 0 })}
                        placeholder="e.g., 50"
                        className="w-full pr-8"
                        data-testid="input-utilization"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            
            <section className="mb-10">
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-2">COMPARE YOUR METRICS</h2>
              <p className="text-sm text-slate-500 mb-4">
                Select the metrics you can compare. Enter your current performance and we'll show the gap to Abridge benchmarks.
              </p>
              
              <div className="space-y-3">
                {advancedMetrics.map(metric => {
                  const isSelected = inputs.selectedMetrics.includes(metric.id);
                  const currentValue = inputs.metricValues[metric.id];
                  const hasGap = currentValue !== undefined && 
                    (metric.id === 'workOutsideWork' 
                      ? currentValue > metric.benchmarkValue 
                      : currentValue < metric.benchmarkValue);
                  
                  return (
                    <div 
                      key={metric.id}
                      className={`bg-white rounded-xl border transition-all ${
                        isSelected ? 'border-slate-800' : 'border-slate-200'
                      }`}
                    >
                      <button
                        onClick={() => toggleMetric(metric.id)}
                        className="w-full flex items-center gap-4 p-4 text-left"
                        data-testid={`button-metric-${metric.id}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'bg-slate-800 border-slate-800' 
                            : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{metric.name}</span>
                            {metric.recommended && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                RECOMMENDED
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-slate-500">{metric.description}</span>
                        </div>
                      </button>
                      
                      {isSelected && (
                        <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                          <div className="pt-4 grid grid-cols-3 gap-4 items-center">
                            <div>
                              <span className="block text-xs font-semibold text-slate-400 mb-2">YOUR CURRENT</span>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={currentValue ?? ''}
                                  onChange={(e) => updateMetricValue(metric.id, Number(e.target.value))}
                                  placeholder="—"
                                  min={metric.min}
                                  max={metric.max}
                                  step={metric.step}
                                  className="w-24"
                                  data-testid={`input-metric-${metric.id}`}
                                />
                                <span className="text-sm text-slate-500">{metric.unit}</span>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <ArrowRight className="w-5 h-5 text-slate-300 mx-auto" />
                            </div>
                            
                            <div>
                              <span className="block text-xs font-semibold text-slate-400 mb-2">ABRIDGE BENCHMARK</span>
                              <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                                <Sparkles className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-semibold text-emerald-700">{metric.benchmark}</span>
                              </div>
                            </div>
                          </div>
                          
                          {currentValue !== undefined && hasGap && (
                            <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                              <span className="text-xs font-semibold text-slate-400">GAP</span>
                              <span className="block text-lg font-bold text-emerald-600">
                                {metric.id === 'workOutsideWork' 
                                  ? `-${(currentValue - metric.benchmarkValue).toFixed(1)} ${metric.unit}`
                                  : `+${(metric.benchmarkValue - currentValue).toFixed(1)}${metric.unit.includes('%') ? ' pp' : ` ${metric.unit}`}`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
        
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={onNext}
            className="bg-[#E85D3F] text-white"
            data-testid="button-see-analysis"
          >
            See full analysis
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
