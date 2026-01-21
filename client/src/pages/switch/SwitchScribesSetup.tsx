import { ArrowLeft, ArrowRight, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScribeData, ScribeCalculations } from './SwitchScribesFlow';

interface SwitchScribesSetupProps {
  data: ScribeData;
  setData: (data: ScribeData) => void;
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

export default function SwitchScribesSetup({
  data,
  setData,
  calculations,
  currentStep,
  totalSteps,
  onNext,
  onBack
}: SwitchScribesSetupProps) {
  
  const encountersPerProvider = data.totalProviders && data.annualEncounters
    ? Math.round(data.annualEncounters / data.totalProviders)
    : null;
  
  // Classify encounters per provider as low/typical/high
  const getEncounterClassification = (epp: number): { label: string; color: string; bgColor: string } => {
    if (epp < 1500) {
      return { label: 'low for outpatient', color: 'text-amber-700', bgColor: 'bg-amber-50' };
    } else if (epp <= 2500) {
      return { label: 'typical for outpatient', color: 'text-emerald-700', bgColor: 'bg-emerald-50' };
    } else {
      return { label: 'high for outpatient', color: 'text-blue-700', bgColor: 'bg-blue-50' };
    }
  };
  
  const encounterClassification = encountersPerProvider 
    ? getEncounterClassification(encountersPerProvider)
    : null;
  
  const canContinue = data.totalProviders && data.annualEncounters && 
                      data.providersWithScribes !== null && 
                      data.hourlyRate && data.hoursPerWeek;
  
  const handleNumberInput = (field: keyof ScribeData, value: string) => {
    const numValue = value.replace(/,/g, '');
    const parsed = numValue ? Number(numValue) : null;
    setData({ ...data, [field]: parsed });
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
            <div className="w-8 h-8 bg-gradient-to-br from-[#EA2C00] to-[#D94E32] rounded-lg flex items-center justify-center text-white font-bold text-sm">
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
                    ? 'w-6 bg-[#EA2C00]' 
                    : i < currentStep 
                      ? 'w-2 bg-[#EA2C00]' 
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
            Your scribe program
          </h1>
        </div>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">YOUR ORGANIZATION</h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-lg text-slate-700">You have</span>
              <input
                type="text"
                inputMode="numeric"
                value={data.totalProviders?.toLocaleString() ?? ''}
                onChange={(e) => handleNumberInput('totalProviders', e.target.value)}
                placeholder="50"
                className="w-20 px-4 py-3 border border-slate-200 rounded-lg text-xl font-semibold text-center text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
                data-testid="input-total-providers"
              />
              <span className="text-lg text-slate-700">providers</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg text-slate-700">handling roughly</span>
              <input
                type="text"
                inputMode="numeric"
                value={data.annualEncounters?.toLocaleString() ?? ''}
                onChange={(e) => handleNumberInput('annualEncounters', e.target.value)}
                placeholder="100,000"
                className="w-32 px-4 py-3 border border-slate-200 rounded-lg text-xl font-semibold text-center text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
                data-testid="input-annual-encounters"
              />
              <span className="text-lg text-slate-700">encounters/year</span>
            </div>
            
            {encountersPerProvider && encounterClassification && (
              <div className={`mt-4 flex items-center gap-2 p-3 ${encounterClassification.bgColor} rounded-lg`}>
                <Lightbulb className={`w-4 h-4 ${encounterClassification.color} flex-shrink-0`} />
                <span className={`text-sm ${encounterClassification.color}`}>
                  That's ~{formatNumber(encountersPerProvider)} per provider ({encounterClassification.label})
                </span>
              </div>
            )}
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">YOUR SCRIBE COVERAGE</h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              How many providers currently have scribe support?
            </label>
            
            <div className="flex items-center gap-3 mb-5">
              <input
                type="text"
                inputMode="numeric"
                value={data.providersWithScribes?.toString() ?? ''}
                onChange={(e) => handleNumberInput('providersWithScribes', e.target.value)}
                placeholder="15"
                className="w-20 px-4 py-3 border border-slate-200 rounded-lg text-2xl font-semibold text-center text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
                data-testid="input-providers-with-scribes"
              />
              <span className="text-base text-slate-500">of {data.totalProviders ?? '—'} providers</span>
            </div>
            
            {data.totalProviders && data.providersWithScribes !== null && (
              <>
                <input
                  type="range"
                  min={0}
                  max={data.totalProviders}
                  value={data.providersWithScribes ?? 0}
                  onChange={(e) => setData({ ...data, providersWithScribes: Number(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#EA2C00] mb-2"
                  data-testid="slider-scribe-coverage"
                />
                <div className="flex justify-between text-xs text-slate-400 mb-5">
                  <span>0</span>
                  <span>{data.totalProviders}</span>
                </div>
              </>
            )}
            
            {calculations.coveragePercent >= 0 && data.providersWithScribes !== null && (
              <div className="flex gap-6 pt-4 border-t border-slate-100">
                <div>
                  <span className="block text-3xl font-bold text-[#EA2C00]" data-testid="text-coverage-percent">
                    {calculations.coveragePercent}%
                  </span>
                  <span className="text-sm text-slate-500">with scribes</span>
                </div>
                <div>
                  <span className="block text-3xl font-bold text-slate-400" data-testid="text-self-documenting-percent">
                    {100 - calculations.coveragePercent}%
                  </span>
                  <span className="text-sm text-slate-500">self-documenting</span>
                </div>
              </div>
            )}
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">SCRIBE COSTS</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Average hourly cost per scribe
              </label>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg text-slate-500">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.hourlyRate?.toString() ?? ''}
                  onChange={(e) => handleNumberInput('hourlyRate', e.target.value)}
                  placeholder="22"
                  className="w-20 px-4 py-3 border border-slate-200 rounded-lg text-xl font-semibold text-center text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
                  data-testid="input-hourly-rate"
                />
                <span className="text-base text-slate-500">/hour</span>
              </div>
              <span className="text-xs text-slate-400">Reference: $18-25/hr in-person, $15-20/hr virtual</span>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Hours each scribe works per week
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.hoursPerWeek?.toString() ?? ''}
                  onChange={(e) => handleNumberInput('hoursPerWeek', e.target.value)}
                  placeholder="32"
                  className="w-20 px-4 py-3 border border-slate-200 rounded-lg text-xl font-semibold text-center text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#EA2C00] focus:border-transparent"
                  data-testid="input-hours-per-week"
                />
                <span className="text-base text-slate-500">hours/week</span>
              </div>
              <span className="text-xs text-slate-400">Reference: 32-40 hrs full-time, 20-24 part-time</span>
            </div>
          </div>
        </section>
        
        {calculations.annualScribePayroll > 0 && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden mb-10">
            <div className="px-6 py-3 bg-slate-100 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-500 tracking-wide">CALCULATED SPEND</span>
            </div>
            <div className="p-6">
              <span className="block text-sm text-slate-500 mb-1">Your annual scribe spend:</span>
              <span className="block text-3xl font-bold text-slate-900" data-testid="text-annual-spend">
                ${formatNumber(calculations.annualScribePayroll)}/year
              </span>
              <span className="text-sm text-slate-400">
                {data.providersWithScribes} scribes × ${data.hourlyRate}/hr × {data.hoursPerWeek} hrs/week × 50 weeks
              </span>
            </div>
          </div>
        )}
        
        <div className="flex justify-center">
          <Button
            onClick={onNext}
            disabled={!canContinue}
            className={`px-8 py-3 rounded-lg font-medium flex items-center gap-2 ${
              canContinue
                ? "bg-[#EA2C00] text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
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
