import { ArrowLeft, Phone, Link2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AmbientInputs, AmbientCalculations, AmbientBenchmarks } from './SwitchAmbientFlow';

interface SwitchAmbientConclusionProps {
  inputs: AmbientInputs;
  calculations: AmbientCalculations;
  benchmarks: AmbientBenchmarks;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onBackToJourney: () => void;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${formatNumber(value)}`;
}

export default function SwitchAmbientConclusion({
  inputs,
  calculations,
  benchmarks,
  currentStep,
  totalSteps,
  onBack,
  onBackToJourney
}: SwitchAmbientConclusionProps) {
  
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
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">
            What this means
          </h1>
          <p className="text-base text-slate-500">
            Based on your inputs and Abridge benchmarks
          </p>
        </div>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">YOUR SITUATION</h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-50 border-b border-slate-200">
              <span className="text-sm text-slate-700">
                With {inputs.providers} providers using your current solution...
              </span>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Utilization</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{inputs.utilization}%</span>
                  <span className="text-xs text-slate-400">(Abridge: {benchmarks.utilization}%)</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Time saved/encounter</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{inputs.efficiency} min</span>
                  <span className="text-xs text-slate-400">(Abridge: {benchmarks.efficiency}-5 min)</span>
                </div>
              </div>
            </div>
            
            <div className="p-5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-700">Estimated annual gap</span>
              <span className="text-xl font-bold text-slate-900" data-testid="text-annual-gap">
                ${formatNumber(calculations.totalAnnualGap)}
              </span>
            </div>
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">THE QUESTION</h2>
          
          <div className="bg-slate-100 rounded-2xl p-8">
            <p className="text-xl text-slate-800 leading-relaxed text-center font-medium">
              Is your current solution delivering <span className="text-slate-900">${formatNumber(calculations.totalAnnualGap)}</span> less value than it could be?
            </p>
          </div>
        </section>
        
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">CONTEXT</h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              This analysis compares your estimated current state against Abridge benchmarks derived from our customer base. The actual gap depends on factors like:
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                Your specific specialty mix and care settings
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                Current documentation workflows and EHR integration
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                Provider adoption patterns and change management
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-400">•</span>
                Organization-specific revenue cycle processes
              </li>
            </ul>
            <p className="text-sm text-slate-600 leading-relaxed mt-4">
              A conversation with our team can help refine these estimates for your specific situation.
            </p>
          </div>
        </section>
        
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 text-center mb-10">
          <span className="text-xs font-semibold text-emerald-700 tracking-wide">POTENTIAL 3-YEAR VALUE</span>
          <span className="block text-4xl font-bold text-emerald-600 mt-3" data-testid="text-3yr-value">
            {formatCurrency(calculations.threeYearTotal)}
          </span>
          <p className="text-sm text-emerald-700 mt-3">
            Based on switching to Abridge now vs. maintaining current state
          </p>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="bg-[#E85D3F] text-white"
            data-testid="button-lets-talk"
          >
            <Phone className="w-4 h-4" />
            Let's Talk
          </Button>
          
          <div className="flex gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-slate-500 flex items-center gap-1"
              data-testid="button-copy-link"
            >
              <Link2 className="w-4 h-4" />
              Copy link
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToJourney}
              className="text-sm text-slate-500 flex items-center gap-1"
              data-testid="button-edit-inputs"
            >
              <Edit3 className="w-4 h-4" />
              Edit inputs
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
