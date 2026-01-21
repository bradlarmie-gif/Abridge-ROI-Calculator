import { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, Settings, Zap, Check, Clock, Moon, DollarSign, FileCheck, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlobalHeader } from '@/components/GlobalHeader';
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
  source: string;
  unit: string;
  benchmark: string;
  benchmarkValue: number;
  recommended: boolean;
  icon: typeof Clock;
  min?: number;
  max?: number;
  step?: number;
}

const advancedMetrics: AdvancedMetric[] = [
  {
    id: 'timeSavings',
    name: 'Time Savings',
    description: 'Time in notes per appointment',
    source: 'Clarity data',
    unit: 'min/encounter',
    benchmark: '3-5 min',
    benchmarkValue: 4,
    recommended: true,
    icon: Clock,
    min: 0,
    max: 10,
    step: 0.5
  },
  {
    id: 'workOutsideWork',
    name: 'Work Outside of Work',
    description: 'Hours worked outside scheduled time',
    source: 'Clarity data',
    unit: 'hrs/week',
    benchmark: '2 hrs/week',
    benchmarkValue: 2,
    recommended: true,
    icon: Moon,
    min: 0,
    max: 10,
    step: 0.5
  },
  {
    id: 'wrvuLift',
    name: 'wRVU Capture',
    description: 'wRVUs per encounter',
    source: 'Clarity data',
    unit: '%',
    benchmark: '5%',
    benchmarkValue: 5,
    recommended: true,
    icon: DollarSign,
    min: 0,
    max: 15,
    step: 0.5
  },
  {
    id: 'chartClosure24h',
    name: 'Chart Closure Time',
    description: '% of charts closed within 24 hours',
    source: 'Clarity data',
    unit: '%',
    benchmark: '78%',
    benchmarkValue: 78,
    recommended: false,
    icon: FileCheck,
    min: 0,
    max: 100,
    step: 1
  },
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
    if (mode === 'advanced') {
      // Clear deployment basics when switching to Advanced mode for fresh start
      setInputs({ 
        ...inputs, 
        mode,
        providers: 0,
        totalEncounters: 0,
        utilization: 0
      });
    } else {
      // Restore Quick mode defaults
      const range = providerRanges.find(r => r.id === inputs.providerRange);
      setInputs({ 
        ...inputs, 
        mode,
        providers: range?.midpoint ?? 75,
        totalEncounters: (range?.midpoint ?? 75) * inputs.encountersPerProvider,
        utilization: 50
      });
    }
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
      <GlobalHeader pageName="Switch" currentStep={currentStep} totalSteps={totalSteps} />
      
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 md:px-10 pt-[96px] pb-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-500 flex items-center gap-1 mb-8 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
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
              
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <section className="bg-white rounded-2xl border border-slate-200 p-8">
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
              
              <section className="bg-white rounded-2xl border border-slate-200 p-8">
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
            <section className="mb-10">
              <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-4">
                DEPLOYMENT BASICS
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6B7280]">Providers using current solution</label>
                  <input
                    type="number"
                    placeholder="e.g., 150"
                    value={inputs.providers > 0 ? inputs.providers : ''}
                    onChange={(e) => {
                      const providers = e.target.value ? Number(e.target.value) : 0;
                      setInputs({
                        ...inputs,
                        providers,
                        totalEncounters: providers * inputs.encountersPerProvider
                      });
                    }}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                    data-testid="input-providers"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6B7280]">Total annual encounters</label>
                  <input
                    type="number"
                    placeholder="e.g., 195000"
                    value={inputs.totalEncounters > 0 ? inputs.totalEncounters : ''}
                    onChange={(e) => setInputs({ ...inputs, totalEncounters: e.target.value ? Number(e.target.value) : 0 })}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                    data-testid="input-encounters"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6B7280]">Current utilization</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="e.g., 72"
                      value={inputs.utilization > 0 ? inputs.utilization : ''}
                      onChange={(e) => setInputs({ ...inputs, utilization: e.target.value ? Number(e.target.value) : 0 })}
                      className="w-full px-4 py-3 border border-neutral-200 rounded-lg text-lg font-semibold text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent pr-10"
                      data-testid="input-utilization"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280]">%</span>
                  </div>
                </div>
              </div>
            </section>
            
            <section className="mb-10">
              <h2 className="text-xs font-semibold text-[#6B7280] tracking-wider uppercase mb-2">
                WHAT DO YOU WANT TO MEASURE?
              </h2>
              <p className="text-sm text-[#6B7280] mb-4">
                Select the metrics you have data for
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {advancedMetrics.map(metric => {
                  const isSelected = inputs.selectedMetrics.includes(metric.id);
                  const IconComponent = metric.icon;
                  
                  return (
                    <button
                      key={metric.id}
                      onClick={() => toggleMetric(metric.id)}
                      className={`flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                        isSelected 
                          ? 'bg-[#f0fdf4] border-emerald-200' 
                          : 'bg-white border-neutral-200 hover:border-neutral-300'
                      }`}
                      data-testid={`button-metric-${metric.id}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                        isSelected 
                          ? 'bg-slate-800 border-slate-800' 
                          : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      
                      <div className="w-10 h-10 rounded-lg bg-[#f1f5f9] flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-[#6B7280]" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#111827]">{metric.name}</span>
                          {metric.recommended && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                              Recommended
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#6B7280]">{metric.description}</p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">Source: {metric.source}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-2 mt-6 text-sm text-[#6B7280]">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Select at least one metric to continue. More metrics = more complete picture.</span>
              </div>
            </section>
          </>
        )}
        
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={onNext}
            className="bg-[#EA2C00] text-white"
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
