import { ArrowRight, ArrowLeft, Users, Calendar, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import type { DeploymentData } from "@/lib/measureCalculator";

interface MeasureDeploymentProps {
  deployment: DeploymentData;
  updateDeployment: <K extends keyof DeploymentData>(key: K, value: DeploymentData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureDeployment({ 
  deployment, 
  updateDeployment, 
  onNext, 
  onBack,
  onHome 
}: MeasureDeploymentProps) {
  const canProceed = 
    deployment.providers > 0 && 
    deployment.annualEncounters > 0 && 
    deployment.utilizationRate > 0 && 
    deployment.monthsOnAbridge > 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <UnifiedHeader 
        pathType="measure"
        currentStep={1} 
        totalSteps={5}
        stepName="Deployment"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <PageTransition pageKey="measure-deployment">
        <main className="max-w-xl mx-auto px-4 md:px-6 py-6 md:py-12">
          <div className="text-center mb-8 md:mb-10">
            <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-deployment-title">
              Tell Us About Your Deployment
            </h1>
            <p className="text-base md:text-lg text-[#6B7280]">
              We'll use this to calculate your value per provider and compare to benchmarks.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-8 space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#374151] mb-2">
                <Users className="w-4 h-4 text-[#6B7280]" />
                Providers using Abridge
                <span className="text-[#EA2C00]">*</span>
              </label>
              <FormattedNumberInput
                value={deployment.providers}
                onChange={(v) => updateDeployment("providers", v || 0)}
                placeholder="e.g. 80"
                className={`w-full h-12 px-4 border rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none transition-colors text-lg ${
                  deployment.providers > 0 ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'
                }`}
                data-testid="input-providers"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#374151] mb-2">
                <Activity className="w-4 h-4 text-[#6B7280]" />
                Total annual encounters
                <span className="text-[#EA2C00]">*</span>
              </label>
              <FormattedNumberInput
                value={deployment.annualEncounters}
                onChange={(v) => updateDeployment("annualEncounters", v || 0)}
                placeholder="e.g. 130,000"
                className={`w-full h-12 px-4 border rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none transition-colors text-lg ${
                  deployment.annualEncounters > 0 ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'
                }`}
                data-testid="input-encounters"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#374151] mb-2">
                <Activity className="w-4 h-4 text-[#6B7280]" />
                Utilization rate
                <span className="text-[#EA2C00]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={deployment.utilizationRate || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateDeployment("utilizationRate", isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                  }}
                  placeholder="e.g. 70"
                  min={0}
                  max={100}
                  className={`w-full h-12 px-4 pr-12 border rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none transition-colors text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    deployment.utilizationRate > 0 ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'
                  }`}
                  data-testid="input-utilization"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] font-medium">%</span>
              </div>
              <p className="text-xs text-[#6B7280] mt-1.5">% of encounters using Abridge</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#374151] mb-2">
                <Clock className="w-4 h-4 text-[#6B7280]" />
                Months on Abridge
                <span className="text-[#EA2C00]">*</span>
              </label>
              <input
                type="number"
                value={deployment.monthsOnAbridge || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  updateDeployment("monthsOnAbridge", isNaN(val) ? 0 : Math.max(0, val));
                }}
                placeholder="e.g. 6"
                min={0}
                className={`w-full h-12 px-4 border rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none transition-colors text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  deployment.monthsOnAbridge > 0 ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'
                }`}
                data-testid="input-months"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 sm:flex-none sm:w-auto h-12 text-base font-medium"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={onNext}
              disabled={!canProceed}
              className="flex-1 bg-[#EA2C00] hover:bg-[#d12700] text-white h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-continue"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </main>
      </PageTransition>
    </div>
  );
}
