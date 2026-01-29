import { ArrowRight, ArrowLeft, Users, Activity, Clock, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import type { DeploymentData } from "@/lib/measureCalculator";

interface MeasureDeploymentProps {
  deployment: DeploymentData;
  updateDeployment: <K extends keyof DeploymentData>(key: K, value: DeploymentData[K]) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
};

interface PremiumInputProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  onChange: (value: number) => void;
  placeholder: string;
  suffix?: string;
  hint?: string;
  isNumber?: boolean;
  max?: number;
  min?: number;
  isFilled: boolean;
  testId: string;
}

function PremiumInput({ 
  icon: Icon, 
  label, 
  value, 
  onChange, 
  placeholder, 
  suffix, 
  hint,
  isNumber = false,
  max,
  min = 0,
  isFilled,
  testId
}: PremiumInputProps) {
  return (
    <div className="group">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
          isFilled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-focus-within:bg-[#EA2C00]/10 group-focus-within:text-[#EA2C00]'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        {label}
        <span className="text-[#EA2C00]">*</span>
      </label>
      <div className="relative">
        {isNumber ? (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              const parsed = isNaN(val) ? 0 : max ? Math.min(max, Math.max(min, val)) : Math.max(min, val);
              onChange(parsed);
            }}
            placeholder={placeholder}
            min={min}
            max={max}
            className={`w-full h-14 px-4 ${suffix ? 'pr-12' : ''} border-2 rounded-xl focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 outline-none transition-all text-lg font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              isFilled 
                ? 'border-emerald-200 bg-emerald-50/50' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            data-testid={testId}
          />
        ) : (
          <FormattedNumberInput
            value={typeof value === 'number' ? value : 0}
            onChange={(v) => onChange(v || 0)}
            placeholder={placeholder}
            className={`w-full h-14 px-4 border-2 rounded-xl focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 outline-none transition-all text-lg font-medium ${
              isFilled 
                ? 'border-emerald-200 bg-emerald-50/50' 
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            data-testid={testId}
          />
        )}
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{suffix}</span>
        )}
      </div>
      {hint && (
        <p className="text-xs text-slate-500 mt-1.5 ml-10">{hint}</p>
      )}
    </div>
  );
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

  const filledCount = [
    deployment.providers > 0,
    deployment.annualEncounters > 0,
    deployment.utilizationRate > 0,
    deployment.monthsOnAbridge > 0
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 relative overflow-hidden">
      {/* Premium background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-100/20 via-transparent to-transparent pointer-events-none" />
      
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
        <main className="relative z-10 max-w-xl mx-auto px-4 md:px-6 py-6 md:py-12">
          <motion.div 
            className="text-center mb-8 md:mb-10"
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200/50 rounded-full text-sm text-blue-700 shadow-sm mb-4">
              <Building2 className="w-4 h-4" />
              <span className="font-semibold">Deployment Basics</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight" data-testid="text-deployment-title">
              Tell Us About Your Deployment
            </h1>
            <p className="text-base md:text-lg text-slate-500 max-w-md mx-auto">
              We'll use this to calculate your value per provider and compare to benchmarks.
            </p>
          </motion.div>

          <motion.div 
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 md:p-8 space-y-6 shadow-lg shadow-slate-200/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Progress indicator */}
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-500">{filledCount} of 4 fields completed</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={`w-8 h-1.5 rounded-full transition-colors ${
                      i < filledCount ? 'bg-emerald-500' : 'bg-slate-200'
                    }`} 
                  />
                ))}
              </div>
            </div>

            <PremiumInput
              icon={Users}
              label="Providers using Abridge"
              value={deployment.providers}
              onChange={(v) => updateDeployment("providers", v)}
              placeholder="e.g. 80"
              isFilled={deployment.providers > 0}
              testId="input-providers"
            />

            <PremiumInput
              icon={Activity}
              label="Total annual encounters"
              value={deployment.annualEncounters}
              onChange={(v) => updateDeployment("annualEncounters", v)}
              placeholder="e.g. 130,000"
              isFilled={deployment.annualEncounters > 0}
              testId="input-encounters"
            />

            <PremiumInput
              icon={Activity}
              label="Utilization rate"
              value={deployment.utilizationRate}
              onChange={(v) => updateDeployment("utilizationRate", v)}
              placeholder="e.g. 70"
              suffix="%"
              hint="% of encounters using Abridge"
              isNumber={true}
              max={100}
              isFilled={deployment.utilizationRate > 0}
              testId="input-utilization"
            />

            <PremiumInput
              icon={Clock}
              label="Months on Abridge"
              value={deployment.monthsOnAbridge}
              onChange={(v) => updateDeployment("monthsOnAbridge", v)}
              placeholder="e.g. 6"
              isNumber={true}
              isFilled={deployment.monthsOnAbridge > 0}
              testId="input-months"
            />
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row gap-3 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 sm:flex-none sm:w-auto h-12 text-base font-medium border-2 hover:bg-slate-50"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={onNext}
              disabled={!canProceed}
              className="flex-1 bg-gradient-to-r from-[#EA2C00] to-[#d12700] hover:from-[#d12700] hover:to-[#b82300] text-white h-12 text-base font-semibold shadow-lg shadow-[#EA2C00]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              data-testid="button-continue"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </main>
      </PageTransition>
    </div>
  );
}
