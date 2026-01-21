import { ArrowLeft, ArrowRight, Users, Settings, Clock, MapPin, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScribeData, ScribeCalculations } from './SwitchScribesFlow';

interface SwitchScribesHiddenCostsProps {
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

export default function SwitchScribesHiddenCosts({
  data,
  setData,
  calculations,
  currentStep,
  totalSteps,
  onNext,
  onBack
}: SwitchScribesHiddenCostsProps) {
  
  const replacementsPerYear = Math.round((data.providersWithScribes ?? 0) * (data.turnoverRate / 100));
  
  const handleNumberInput = (field: keyof ScribeData, value: string) => {
    const numValue = value.replace(/,/g, '');
    const parsed = numValue ? Number(numValue) : 0;
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
            The costs beyond payroll
          </h1>
          <p className="text-base text-slate-500">
            Scribe programs come with operational overhead.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <Users className="w-5 h-5 text-[#E85D3F]" />
              <h3 className="font-semibold text-slate-900">Turnover & Training</h3>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-slate-500 mb-2">Annual turnover rate:</label>
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.turnoverRate?.toString() ?? ''}
                  onChange={(e) => handleNumberInput('turnoverRate', e.target.value)}
                  placeholder="35"
                  className="w-16 px-3 py-2 border border-slate-200 rounded-lg text-lg font-semibold text-center text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  data-testid="input-turnover-rate"
                />
                <span className="text-slate-500">%</span>
              </div>
              <span className="text-xs text-slate-400">(typical: 30-50%)</span>
            </div>
            
            <div className="p-3 bg-slate-50 rounded-lg mb-4 text-sm text-slate-600 space-y-1">
              <p>Your {data.providersWithScribes} scribes × {data.turnoverRate}%</p>
              <p>= ~{replacementsPerYear} replacements/year</p>
              <p>× ${formatNumber(data.recruitmentCostPerScribe)} to recruit + train</p>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <span className="text-sm text-slate-500">Annual cost:</span>
              <span className="text-xl font-bold text-[#E85D3F]" data-testid="text-turnover-cost">
                ${formatNumber(calculations.turnoverCost)}
              </span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <Settings className="w-5 h-5 text-[#E85D3F]" />
              <h3 className="font-semibold text-slate-900">Management Overhead</h3>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-slate-500 mb-2">Hours/week managing scribes:</label>
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={data.managementHoursPerWeek?.toString() ?? ''}
                  onChange={(e) => handleNumberInput('managementHoursPerWeek', e.target.value)}
                  placeholder="6"
                  className="w-16 px-3 py-2 border border-slate-200 rounded-lg text-lg font-semibold text-center text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  data-testid="input-management-hours"
                />
                <span className="text-slate-500">hrs</span>
              </div>
              <span className="text-xs text-slate-400">(scheduling, training, QA)</span>
            </div>
            
            <div className="p-3 bg-slate-50 rounded-lg mb-4 text-sm text-slate-600 space-y-1">
              <p>{data.managementHoursPerWeek} hrs/week × ${data.managementHourlyRate}/hr</p>
              <p>× 50 weeks/year</p>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
              <span className="text-sm text-slate-500">Annual cost:</span>
              <span className="text-xl font-bold text-[#E85D3F]" data-testid="text-management-cost">
                ${formatNumber(calculations.managementCost)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-100 rounded-xl border border-slate-200 p-5 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-500">Total hidden costs:</span>
            <span className="text-2xl font-bold text-slate-900" data-testid="text-total-hidden-costs">
              ${formatNumber(calculations.totalHiddenCosts)}
            </span>
          </div>
        </div>
        
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">ALSO CONSIDER</h2>
          
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-900">Variable availability</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                Scribes call in sick, take vacations, and need breaks. Providers can be left without support unexpectedly.
              </p>
              <p className="text-sm text-emerald-600 font-medium mt-2">
                <Check className="w-4 h-4 inline mr-1" />
                Abridge is available for every encounter, every time.
              </p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-900">Location constraints</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                In-person scribes can only be in one place. Telehealth, multi-site, and after-hours visits often go undocumented.
              </p>
              <p className="text-sm text-emerald-600 font-medium mt-2">
                <Check className="w-4 h-4 inline mr-1" />
                Abridge works anywhere — telehealth, bedside, or on the go.
              </p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-900">Ramp-up time</span>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                New scribes take 2-4 weeks to become effective. During turnover, productivity suffers.
              </p>
              <p className="text-sm text-emerald-600 font-medium mt-2">
                <Check className="w-4 h-4 inline mr-1" />
                Abridge is fully capable from day one — no training required.
              </p>
            </div>
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
