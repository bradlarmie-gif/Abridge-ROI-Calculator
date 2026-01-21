import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AmbientInputs, AmbientCalculations, AmbientBenchmarks } from './SwitchAmbientFlow';

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
        providers: range.midpoint
      });
    }
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
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
            Let's see where you stand
          </h1>
        </div>
        
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
