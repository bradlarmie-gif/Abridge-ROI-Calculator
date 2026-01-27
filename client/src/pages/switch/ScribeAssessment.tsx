import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Users, DollarSign, Clock, Building2, UserCheck, Calendar, AlertTriangle, Timer, Moon, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  type ScribeInputs,
  calculateScribeGap,
  formatCurrency,
} from "@/lib/scribeGapCalculator";

interface ScribeAssessmentProps {
  inputs: ScribeInputs;
  setInputs: React.Dispatch<React.SetStateAction<ScribeInputs>>;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function ScribeAssessment({
  inputs,
  setInputs,
  onNext,
  onBack,
  onBackToJourney,
}: ScribeAssessmentProps) {
  const calculations = useMemo(() => calculateScribeGap(inputs), [inputs]);

  const updateInput = <K extends keyof ScribeInputs>(key: K, value: ScribeInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <UnifiedHeader 
        pathType="switch"
        currentStep={1} 
        totalSteps={2}
        stepName="Scribe Analysis"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="py-6 md:py-8 pb-8 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-8 md:mb-10"
        >
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#111827] mb-2">
            Scribe Program Analysis
          </h1>
          <p className="text-sm md:text-base text-[#6B7280]">
            Let's understand your current documentation support
          </p>
        </motion.div>

        {/* SECTION 1: Your Scribe Program - Inputs + Live Summary */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-6 lg:p-8 mb-6 shadow-sm"
        >
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-1">Your Scribe Program</h2>
          <p className="text-sm text-[#6B7280] mb-5">Tell us about your current setup</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inputs - 2 columns on left */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputCard
                icon={<Users className="w-4 h-4 text-violet-600" />}
                iconBg="bg-violet-50"
                label="Number of scribes"
                value={inputs.scribeCount}
                onChange={(v) => updateInput("scribeCount", v)}
                unit="scribes"
                testId="input-scribe-count"
              />

              <InputCard
                icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
                iconBg="bg-emerald-50"
                label="Cost per scribe"
                value={inputs.scribeCostPerHour}
                onChange={(v) => updateInput("scribeCostPerHour", v)}
                unit="$/hour"
                testId="input-scribe-cost"
              />

              <InputCard
                icon={<Clock className="w-4 h-4 text-sky-600" />}
                iconBg="bg-sky-50"
                label="Hours per week"
                value={inputs.scribeHoursPerWeek}
                onChange={(v) => updateInput("scribeHoursPerWeek", v)}
                unit="hrs/week"
                testId="input-scribe-hours"
              />

              <InputCard
                icon={<UserCheck className="w-4 h-4 text-amber-600" />}
                iconBg="bg-amber-50"
                label="Providers with scribes"
                value={inputs.providersWithScribes}
                onChange={(v) => updateInput("providersWithScribes", v)}
                unit="providers"
                testId="input-providers-with-scribes"
              />

              <InputCard
                icon={<Building2 className="w-4 h-4 text-rose-600" />}
                iconBg="bg-rose-50"
                label="Total providers"
                value={inputs.totalProviders}
                onChange={(v) => updateInput("totalProviders", v)}
                unit="providers"
                testId="input-total-providers"
              />

              <InputCard
                icon={<Calendar className="w-4 h-4 text-indigo-600" />}
                iconBg="bg-indigo-50"
                label="Annual encounters"
                value={inputs.annualEncounters}
                onChange={(v) => updateInput("annualEncounters", v)}
                unit="per year"
                testId="input-annual-encounters"
              />
            </div>

            {/* Live Summary - sticky sidebar on right */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] border border-[#E2E8F0] rounded-xl p-5 lg:sticky lg:top-24">
                <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-4">
                  Your Current State
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-3xl font-bold text-[#111827]">{inputs.scribeCount}</div>
                    <div className="text-sm text-[#6B7280]">scribes employed</div>
                  </div>
                  
                  <div className="border-t border-[#E2E8F0] pt-4">
                    <div className="text-2xl font-bold text-[#111827]">{formatCurrency(calculations.totalScribeCost)}</div>
                    <div className="text-sm text-[#6B7280]">annual investment</div>
                  </div>
                  
                  <div className="border-t border-[#E2E8F0] pt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#111827]">{calculations.coveragePercent}%</span>
                      <span className="text-sm text-[#6B7280]">coverage</span>
                    </div>
                    <div className="text-xs text-[#9CA3AF] mt-1">
                      {inputs.providersWithScribes} of {inputs.totalProviders} providers supported
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* SECTION 2: The Gap & Its Burden */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-6 lg:p-8 mb-6 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-base md:text-lg font-bold text-[#111827]">The Coverage Gap</h2>
            {calculations.providersWithoutSupport > 0 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                {calculations.providersWithoutSupport} providers without support
              </span>
            )}
          </div>
          <p className="text-sm text-[#6B7280] mb-6">Where your documentation support falls short</p>

          {/* Coverage Gap Visualization */}
          <div className="mb-6">
            <div className="relative h-14 bg-[#F1F5F9] rounded-xl overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(calculations.coveragePercent, 2)}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute top-0 left-0 h-full bg-emerald-500 flex items-center"
              />
              {calculations.coveragePercent >= 15 && (
                <span className="absolute top-1/2 -translate-y-1/2 left-4 text-sm font-semibold text-white z-10">
                  {inputs.providersWithScribes} with scribes
                </span>
              )}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.8 }}
                className="absolute top-0 h-full bg-slate-200 flex items-center justify-center"
                style={{
                  left: `${calculations.coveragePercent}%`,
                  width: `${100 - calculations.coveragePercent}%`,
                }}
              >
                <span className="text-sm font-semibold text-slate-600">
                  {calculations.providersWithoutSupport} without support
                </span>
              </motion.div>
            </div>
          </div>

          {/* The Burden - Immediate Consequence */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <div className="font-semibold text-[#111827] mb-1">The documentation burden</div>
                <p className="text-sm text-[#6B7280]">
                  {calculations.providersWithoutSupport} providers handling all documentation themselves
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Timer className="w-5 h-5 text-[#EA2C00]" />
                </div>
                <div className="text-2xl font-bold text-[#111827]">
                  {calculations.unsupportedDocTimeHours.toLocaleString()}
                </div>
                <div className="text-xs text-[#6B7280]">hours/year documenting</div>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Moon className="w-5 h-5 text-[#EA2C00]" />
                </div>
                <div className="text-2xl font-bold text-[#111827]">
                  {calculations.pajamaTimeHours.toLocaleString()}
                </div>
                <div className="text-xs text-[#6B7280]">hours/year after hours</div>
              </div>

              <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 text-center">
                <div className="flex justify-center mb-2">
                  <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
                </div>
                <div className="text-2xl font-bold text-[#111827]">
                  {calculations.docTimePerUnsupportedProvider}
                </div>
                <div className="text-xs text-[#6B7280]">hrs/year per provider</div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* SECTION 3: The Cost to Scale */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-6 lg:p-8 mb-6 shadow-sm"
        >
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-1">What Would It Take?</h2>
          <p className="text-sm text-[#6B7280] mb-6">The cost to give every provider scribe support</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Current State */}
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today</span>
              </div>
              
              <div className="mb-4">
                <div className="text-3xl font-bold text-[#111827]">{formatCurrency(calculations.totalScribeCost)}</div>
                <div className="text-sm text-[#6B7280]">annual scribe investment</div>
              </div>

              <div className="space-y-2 text-sm border-t border-[#E5E7EB] pt-4">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribes</span>
                  <span className="font-semibold text-[#111827]">{inputs.scribeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Coverage</span>
                  <span className="font-semibold text-[#111827]">{calculations.coveragePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Ratio</span>
                  <span className="font-semibold text-[#111827]">1:{calculations.scribeRatio}</span>
                </div>
              </div>
            </div>

            {/* Full Coverage */}
            <div className="bg-[#FEF7F5] border border-[#FECDC4] rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#FEE4DE] rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-[#EA2C00]" />
                  <span className="text-xs font-semibold text-[#EA2C00] uppercase tracking-wide">Full Coverage</span>
                </div>
                
                <div className="mb-4">
                  <div className="text-3xl font-bold text-[#111827]">{formatCurrency(calculations.fullScribeCost)}</div>
                  <div className="text-sm text-[#6B7280]">annual investment required</div>
                </div>

                <div className="space-y-2 text-sm border-t border-[#FECDC4] pt-4">
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Scribes needed</span>
                    <span className="font-semibold text-[#111827]">{calculations.scribesNeededForFullCoverage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Coverage</span>
                    <span className="font-semibold text-emerald-600">100%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Additional cost</span>
                    <span className="font-semibold text-[#EA2C00]">+{formatCurrency(calculations.costToScale)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex justify-center"
        >
          <Button
            onClick={onNext}
            className="h-12 px-8 bg-[#EA2C00] hover:bg-[#d12700] text-white font-semibold shadow-sm"
            data-testid="button-see-full-analysis"
          >
            See Full Analysis
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </main>
    </div>
  );
}

interface InputCardProps {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  testId: string;
}

function InputCard({ icon, iconBg = "bg-slate-100", label, value, onChange, unit, testId }: InputCardProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = isFocused ? localValue : value.toLocaleString();

  if (!isFocused && localValue !== String(value)) {
    setLocalValue(String(value));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/,/g, "");
    setLocalValue(inputValue);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localValue.replace(/,/g, ""));
    if (isNaN(parsed) || localValue === "" || parsed < 0) {
      setLocalValue("0");
      onChange(0);
    } else {
      setLocalValue(String(parsed));
      onChange(parsed);
    }
  };

  return (
    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 transition-all duration-200 hover:border-[#D1D5DB] hover:shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <label className="text-sm font-medium text-[#111827]">{label}</label>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          className="flex-1 px-3 py-2 text-base font-semibold border border-[#E5E7EB] rounded-lg focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 outline-none bg-white transition-all duration-200"
          data-testid={testId}
        />
        <span className="text-xs text-[#9CA3AF] font-medium whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );
}
