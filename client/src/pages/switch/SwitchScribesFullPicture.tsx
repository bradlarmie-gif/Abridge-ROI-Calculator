import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedHeader, UnifiedHeaderSpacer } from '@/components/UnifiedHeader';
import { ScribeData, ScribeCalculations } from './SwitchScribesFlow';

interface SwitchScribesFullPictureProps {
  data: ScribeData;
  calculations: ScribeCalculations;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
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

export default function SwitchScribesFullPicture({
  data,
  calculations,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onBackToJourney
}: SwitchScribesFullPictureProps) {
  
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <UnifiedHeader 
        pathType="switch"
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepName="Full Picture"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />
      
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-6 md:py-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">
            The full picture
          </h1>
          <p className="text-base text-slate-500">
            Your total scribe investment, including hidden costs.
          </p>
        </div>
        
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">TOTAL ANNUAL INVESTMENT</h2>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center mb-4">
            <span className="text-xs font-semibold text-slate-400 tracking-wide">YOUR SCRIBE PROGRAM COSTS</span>
            <div className="mt-3">
              <span className="text-5xl font-bold text-slate-900 tracking-tight" data-testid="text-total-investment">
                {formatCurrency(calculations.totalInvestment)}
              </span>
              <span className="block text-base text-slate-500 mt-1">/year</span>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Scribe payroll</span>
                <span className="font-semibold text-slate-900">${formatNumber(calculations.annualScribePayroll)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Turnover & training</span>
                <span className="font-semibold text-slate-900">${formatNumber(calculations.turnoverCost)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500">Management overhead</span>
                <span className="font-semibold text-slate-900">${formatNumber(calculations.managementCost)}</span>
              </div>
              <div className="h-px bg-slate-200 my-2" />
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-lg text-slate-900">${formatNumber(calculations.totalInvestment)}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-400">
              Coverage: {calculations.coveragePercent}% of providers ({data.providersWithScribes} of {data.totalProviders})
            </div>
          </div>
        </section>
        
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">PER-PROVIDER BREAKDOWN</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <span className="text-xs font-semibold text-slate-400 tracking-wide">MONTHLY SPEND</span>
              <span className="block text-2xl font-bold text-slate-900 mt-2" data-testid="text-monthly-spend">
                ${formatNumber(calculations.monthlySpend)}
              </span>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <span className="text-xs font-semibold text-slate-400 tracking-wide">COST/COVERED PROVIDER</span>
              <span className="block text-2xl font-bold text-slate-900 mt-2" data-testid="text-cost-per-provider">
                ${formatNumber(calculations.costPerCoveredProvider)}
              </span>
              <span className="block text-xs text-slate-400 mt-1">/year</span>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <span className="text-xs font-semibold text-slate-400 tracking-wide">3-YEAR INVESTMENT</span>
              <span className="block text-2xl font-bold text-slate-900 mt-2" data-testid="text-three-year-investment">
                {formatCurrency(calculations.threeYearInvestment)}
              </span>
            </div>
          </div>
        </section>
        
        <section className="mb-10">
          <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">THE TRADEOFF</h2>
          
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
            <p className="text-base text-amber-900 leading-relaxed mb-4">
              You're investing <strong>${formatNumber(calculations.totalInvestment)}/year</strong> to support <strong>{calculations.coveragePercent}%</strong> of your providers.
            </p>
            <p className="text-base text-amber-900 leading-relaxed">
              The remaining <strong>{calculations.providersWithoutScribes} providers</strong> are left to self-document, likely after hours and without support.
            </p>
          </div>
        </section>
        
        <div className="flex justify-center">
          <Button
            onClick={onNext}
            className="px-8 py-3 rounded-lg font-medium bg-[#EA2C00] text-white flex items-center gap-2"
            data-testid="button-see-comparison"
          >
            See the comparison
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
