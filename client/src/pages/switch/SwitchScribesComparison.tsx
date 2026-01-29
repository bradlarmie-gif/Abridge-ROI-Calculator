import { Phone, Link2, Edit3, Check, X, Users, Clock, TrendingUp, DollarSign, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedHeader, UnifiedHeaderSpacer } from '@/components/UnifiedHeader';
import { ScribeData, ScribeCalculations } from './SwitchScribesFlow';

interface SwitchScribesComparisonProps {
  data: ScribeData;
  calculations: ScribeCalculations;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onBackToJourney: () => void;
}

function formatNumber(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return Number(value).toLocaleString();
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${formatNumber(value)}`;
}

export default function SwitchScribesComparison({
  data,
  calculations,
  currentStep,
  totalSteps,
  onBack,
  onBackToJourney
}: SwitchScribesComparisonProps) {
  
  const abridgeCostPerProvider = 3600;
  const abridgeAnnualCost = (data.totalProviders ?? 0) * abridgeCostPerProvider;
  const annualSavings = Math.max(0, calculations.totalInvestment - abridgeAnnualCost);
  const threeYearScribeCost = calculations.threeYearInvestment;
  const threeYearAbridgeCost = abridgeAnnualCost * 3;
  const threeYearSavings = Math.max(0, threeYearScribeCost - threeYearAbridgeCost);
  
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <UnifiedHeader 
        pathType="switch"
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepName="Comparison"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />
      
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-6 md:py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">
            The comparison
          </h1>
          <p className="text-base text-slate-500">
            Human scribes vs. Abridge over 3 years
          </p>
        </div>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">3-YEAR COST COMPARISON</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-slate-600" />
                </div>
                <span className="font-semibold text-slate-900">Human Scribes</span>
              </div>
              
              <div className="text-center py-4">
                <span className="text-2xl sm:text-4xl font-bold text-slate-900" data-testid="text-scribe-3yr-cost">
                  {formatCurrency(threeYearScribeCost)}
                </span>
                <span className="block text-sm text-slate-500 mt-1">over 3 years</span>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-slate-100 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>{calculations.coveragePercent}% provider coverage</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>Limited to business hours</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span>~{data.turnoverRate}% annual turnover</span>
                </div>
              </div>
            </div>
            
            <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-500 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[#EA2C00] to-[#D94E32] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  A
                </div>
                <span className="font-semibold text-emerald-900">Abridge</span>
              </div>
              
              <div className="text-center py-4">
                <span className="text-2xl sm:text-4xl font-bold text-emerald-600" data-testid="text-abridge-3yr-cost">
                  {formatCurrency(threeYearAbridgeCost)}
                </span>
                <span className="block text-sm text-emerald-700 mt-1">over 3 years</span>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-emerald-200 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>100% provider access</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Available 24/7</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>No turnover or training</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {threeYearSavings > 0 && (
          <section className="mb-8">
            <div className="bg-emerald-600 rounded-2xl p-4 md:p-6 text-center text-white">
              <span className="text-xs sm:text-sm font-medium opacity-90">POTENTIAL 3-YEAR SAVINGS</span>
              <span className="block text-2xl sm:text-4xl font-bold mt-2" data-testid="text-three-year-savings">
                {formatCurrency(threeYearSavings)}
              </span>
              <span className="block text-xs sm:text-sm opacity-80 mt-2">
                While expanding from {calculations.coveragePercent}% to 100% provider coverage
              </span>
            </div>
          </section>
        )}
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">WHAT CHANGES</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-900">Coverage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-400">{calculations.coveragePercent}%</span>
                <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180" />
                <span className="text-2xl font-bold text-emerald-600">100%</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                All {data.totalProviders} providers get documentation support
              </p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-900">Availability</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-400">Business hrs</span>
                <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180" />
                <span className="text-lg font-bold text-emerald-600">24/7</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Nights, weekends, telehealth — always there
              </p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-900">Management</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-400">{data.managementHoursPerWeek} hrs/week</span>
                <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180" />
                <span className="text-lg font-bold text-emerald-600">0 hrs</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                No scheduling, training, or QA required
              </p>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-slate-900">Annual Savings</span>
              </div>
              <span className="text-2xl font-bold text-emerald-600" data-testid="text-annual-savings">
                {formatCurrency(annualSavings)}
              </span>
              <p className="text-sm text-slate-500 mt-2">
                Redirect to patient care or other initiatives
              </p>
            </div>
          </div>
        </section>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">THE QUESTION</h2>
          
          <div className="bg-slate-100 rounded-2xl p-6">
            <p className="text-lg text-slate-700 leading-relaxed text-center">
              Is your scribe program delivering <strong>${formatNumber(calculations.costPerCoveredProvider)}/provider/year</strong> worth of value while leaving <strong>{calculations.providersWithoutScribes} providers</strong> without support?
            </p>
          </div>
        </section>
        
        <div className="flex flex-col items-center gap-4">
          <Button
            className="px-8 py-3 rounded-lg font-medium bg-[#EA2C00] text-white flex items-center gap-2"
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
