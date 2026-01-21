import { ArrowLeft, ArrowRight, Clock, Users, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScribeData, ScribeCalculations } from './SwitchScribesFlow';

interface SwitchScribesCoverageProps {
  data: ScribeData;
  calculations: ScribeCalculations;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString();
}

export default function SwitchScribesCoverage({
  data,
  calculations,
  currentStep,
  totalSteps,
  onNext,
  onBack
}: SwitchScribesCoverageProps) {
  
  const additionalCostForFullCoverage = Math.max(0, calculations.fullCoverageCost - calculations.annualScribePayroll);
  
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
            <div className="w-8 h-8 bg-gradient-to-br from-[#E85D3F] to-[#D94E32] rounded-lg flex items-center justify-center text-white font-bold text-sm">
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
                    ? 'w-6 bg-orange-500' 
                    : i < currentStep 
                      ? 'w-2 bg-orange-500' 
                      : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">
            The coverage reality
          </h1>
          <p className="text-base text-slate-500">
            Scribes scale linearly. Adding coverage means adding cost.
          </p>
        </div>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">YOUR CURRENT COVERAGE</h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex h-12 rounded-lg overflow-hidden mb-4" data-testid="coverage-bar">
              <div 
                className="bg-[#E85D3F] flex items-center justify-center px-4 min-w-fit"
                style={{ width: `${Math.max(calculations.coveragePercent, 20)}%` }}
              >
                <span className="text-sm font-semibold text-white whitespace-nowrap">
                  {data.providersWithScribes} with scribes
                </span>
              </div>
              <div 
                className="bg-slate-100 flex items-center justify-center px-4 flex-1"
              >
                <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
                  {calculations.providersWithoutScribes} self-documenting
                </span>
              </div>
            </div>
            
            <div className="flex gap-8">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-[#E85D3F]" data-testid="text-coverage-percent">
                  {calculations.coveragePercent}%
                </span>
                <span className="text-sm text-slate-500">covered</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-400" data-testid="text-uncovered-percent">
                  {100 - calculations.coveragePercent}%
                </span>
                <span className="text-sm text-slate-500">self-documenting</span>
              </div>
            </div>
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">WHAT FULL COVERAGE WOULD COST</h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="h-12 bg-gradient-to-r from-[#E85D3F] to-[#F07B5F] rounded-lg flex items-center justify-center mb-5" data-testid="full-coverage-bar">
              <span className="text-sm font-semibold text-white">
                {data.totalProviders} providers with scribes
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Current:</span>
                <span className="font-semibold text-slate-900">${formatNumber(calculations.annualScribePayroll)}/year</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Full coverage:</span>
                <span className="font-semibold text-lg text-red-600" data-testid="text-full-coverage-cost">
                  ${formatNumber(calculations.fullCoverageCost)}/year
                </span>
              </div>
              <div className="pt-3 mt-3 border-t border-slate-100">
                <span className="text-sm text-slate-400">
                  +${formatNumber(additionalCostForFullCoverage)} to cover remaining {calculations.providersWithoutScribes} providers
                </span>
              </div>
            </div>
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">
            THE {calculations.providersWithoutScribes} PROVIDERS WITHOUT SCRIBES
          </h2>
          
          <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
            <p className="text-sm font-medium text-red-900 mb-4">These providers are currently:</p>
            <ul className="space-y-3">
              <li className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-800">Self-documenting after hours</span>
              </li>
              <li className="flex items-center gap-3">
                <Users className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-800">Spending less time with patients</span>
              </li>
              <li className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-800">Carrying higher administrative burden</span>
              </li>
              <li className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-800">At higher risk of burnout</span>
              </li>
            </ul>
          </div>
        </section>
        
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">WITH ABRIDGE</h2>
          
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
            <div className="h-12 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg flex items-center justify-center mb-5">
              <span className="text-sm font-semibold text-white">
                All {data.totalProviders} providers have access
              </span>
            </div>
            
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600" />
                No per-provider cost barrier to scale
              </li>
              <li className="flex items-center gap-2 text-sm text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600" />
                Average utilization: 65% based on Abridge benchmarks
              </li>
              <li className="flex items-center gap-2 text-sm text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600" />
                Available 24/7 — nights, weekends, every location
              </li>
            </ul>
          </div>
        </section>
        
        <div className="flex justify-center">
          <Button
            onClick={onNext}
            className="px-8 py-3 rounded-lg font-medium bg-[#E85D3F] text-white flex items-center gap-2"
            data-testid="button-continue"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
