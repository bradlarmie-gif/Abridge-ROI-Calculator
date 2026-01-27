import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Users, DollarSign, Clock, Building2, UserCheck, Calendar, AlertTriangle, Timer, Moon, BarChart3 } from "lucide-react";
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

      <main className="py-6 md:py-8 pb-8 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-6 md:mb-8"
        >
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#111827] mb-2">
            Scribe Program Analysis
          </h1>
          <p className="text-sm md:text-base text-[#6B7280]">
            Understand your scribe program economics
          </p>
        </motion.div>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-6 lg:p-8 mb-6 md:mb-8 shadow-sm"
        >
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-4 md:mb-6">Scribe Program Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <InputCard
              icon={<Users className="w-4 h-4 text-[#6B7280]" />}
              label="How many scribes do you have?"
              value={inputs.scribeCount}
              onChange={(v) => updateInput("scribeCount", v)}
              unit="scribes"
              testId="input-scribe-count"
            />

            <InputCard
              icon={<DollarSign className="w-4 h-4 text-[#6B7280]" />}
              label="Average cost per scribe"
              value={inputs.scribeCostPerHour}
              onChange={(v) => updateInput("scribeCostPerHour", v)}
              unit="$/hour"
              hint="Include benefits, overhead if known"
              testId="input-scribe-cost"
            />

            <InputCard
              icon={<Clock className="w-4 h-4 text-[#6B7280]" />}
              label="Hours per week (per scribe)"
              value={inputs.scribeHoursPerWeek}
              onChange={(v) => updateInput("scribeHoursPerWeek", v)}
              unit="hrs/week"
              testId="input-scribe-hours"
            />

            <InputCard
              icon={<UserCheck className="w-4 h-4 text-[#6B7280]" />}
              label="Providers supported by scribes"
              value={inputs.providersWithScribes}
              onChange={(v) => updateInput("providersWithScribes", v)}
              unit="providers"
              hint="How many providers have scribe support?"
              testId="input-providers-with-scribes"
            />

            <InputCard
              icon={<Building2 className="w-4 h-4 text-[#6B7280]" />}
              label="Total providers in your organization"
              value={inputs.totalProviders}
              onChange={(v) => updateInput("totalProviders", v)}
              unit="providers"
              testId="input-total-providers"
            />

            <InputCard
              icon={<Calendar className="w-4 h-4 text-[#6B7280]" />}
              label="Annual encounters (all providers)"
              value={inputs.annualEncounters}
              onChange={(v) => updateInput("annualEncounters", v)}
              unit="encounters/year"
              testId="input-annual-encounters"
            />
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-6 lg:p-8 mb-6 md:mb-8 shadow-sm"
        >
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-4 md:mb-6">Your Coverage Gap</h2>

          <div className="mb-6">
            <div className="relative h-14 bg-[#F3F4F6] rounded-xl overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-emerald-500 flex items-center px-4 transition-all duration-500 ease-out"
                style={{ width: `${Math.max(calculations.coveragePercent, 2)}%`, minWidth: calculations.coveragePercent > 0 ? '8px' : '0' }}
              />
              {calculations.coveragePercent >= 22 ? (
                <span 
                  className="absolute top-1/2 -translate-y-1/2 left-4 text-sm font-semibold text-white drop-shadow-sm"
                >
                  {inputs.providersWithScribes} supported
                </span>
              ) : (
                <span 
                  className="absolute top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-700"
                  style={{ left: `${Math.max(calculations.coveragePercent, 2) + 2}%` }}
                >
                  {inputs.providersWithScribes} supported
                </span>
              )}
              <div
                className="absolute top-0 h-full bg-orange-100 flex items-center justify-center transition-all duration-500 ease-out"
                style={{
                  left: `${calculations.coveragePercent}%`,
                  width: `${100 - calculations.coveragePercent}%`,
                }}
              >
                {calculations.coveragePercent < 55 && (
                  <span className="text-sm font-semibold text-orange-700">
                    {calculations.providersWithoutSupport} without support
                  </span>
                )}
              </div>
              {calculations.coveragePercent >= 55 && (
                <span 
                  className="absolute top-1/2 -translate-y-1/2 right-4 text-sm font-semibold text-orange-700"
                >
                  {calculations.providersWithoutSupport} without support
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">{calculations.coveragePercent}%</div>
              <div className="text-xs text-emerald-600 font-medium">have scribe support</div>
            </div>
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {100 - calculations.coveragePercent}%
              </div>
              <div className="text-xs text-orange-500 font-medium">documenting alone</div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800">
              <strong>{calculations.providersWithoutSupport} providers</strong> have no documentation
              support. They're spending 10-15+ minutes per encounter on notes, contributing to burnout
              and after-hours work.
            </p>
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-6 lg:p-8 mb-6 md:mb-8 shadow-sm"
        >
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-2">What Full Scribe Coverage Would Cost</h2>
          <p className="text-xs md:text-sm text-[#6B7280] mb-4 md:mb-6">
            If you wanted to give every provider scribe support
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5">
              <div className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">
                Current State
              </div>
              <div className="text-base font-semibold text-[#111827] mb-4">Your Scribe Program</div>

              <div className="space-y-2.5 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribes</span>
                  <span className="font-semibold text-[#111827]">{inputs.scribeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Providers covered</span>
                  <span className="font-semibold text-[#111827]">{inputs.providersWithScribes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Coverage</span>
                  <span className="font-semibold text-[#111827]">{calculations.coveragePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribe:Provider ratio</span>
                  <span className="font-semibold text-[#111827]">1:{calculations.scribeRatio}</span>
                </div>
              </div>

              <div className="border-t border-[#E5E7EB] pt-4">
                <div className="text-xs text-[#6B7280]">Annual cost</div>
                <div className="text-2xl font-bold text-[#111827]">
                  {formatCurrency(calculations.totalScribeCost)}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] border border-orange-200 rounded-xl p-5">
              <div className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">
                Full Coverage
              </div>
              <div className="text-base font-semibold text-[#111827] mb-4">If Everyone Had a Scribe</div>

              <div className="space-y-2.5 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribes needed</span>
                  <span className="font-semibold text-[#111827]">{calculations.scribesNeededForFullCoverage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Providers covered</span>
                  <span className="font-semibold text-[#111827]">{inputs.totalProviders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Coverage</span>
                  <span className="font-semibold text-[#111827]">100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribe:Provider ratio</span>
                  <span className="font-semibold text-[#111827]">1:{calculations.scribeRatio}</span>
                </div>
              </div>

              <div className="border-t border-orange-200 pt-4">
                <div className="text-xs text-[#6B7280]">Annual cost</div>
                <div className="text-2xl font-bold text-[#111827]">
                  {formatCurrency(calculations.fullScribeCost)}
                </div>
                <div className="text-sm text-orange-600 font-semibold mt-1">
                  +{formatCurrency(calculations.costToScale)} to scale
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-6 lg:p-8 mb-6 md:mb-8 shadow-sm"
        >
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-2">
            The Burden on Unsupported Providers
          </h2>
          <p className="text-xs md:text-sm text-[#6B7280] mb-4 md:mb-6">
            Your {calculations.providersWithoutSupport} providers without scribe support are handling documentation alone
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                  <Timer className="w-5 h-5 text-[#6B7280]" />
                </div>
              </div>
              <div className="text-xl font-bold text-[#111827]">
                {calculations.unsupportedDocTimeHours.toLocaleString()}
              </div>
              <div className="text-xs text-[#6B7280] font-medium">hours/year on docs</div>
            </div>

            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                  <Moon className="w-5 h-5 text-[#6B7280]" />
                </div>
              </div>
              <div className="text-xl font-bold text-[#111827]">
                {calculations.pajamaTimeHours.toLocaleString()}
              </div>
              <div className="text-xs text-[#6B7280] font-medium">hours/year after clinic</div>
            </div>

            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-5 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-[#6B7280]" />
                </div>
              </div>
              <div className="text-xl font-bold text-[#111827]">
                {calculations.docTimePerUnsupportedProvider}
              </div>
              <div className="text-xs text-[#6B7280] font-medium">hrs/year per provider</div>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-[#9CA3AF] italic text-center">
            Based on industry research: ~25% of documentation occurs outside clinic hours
          </div>
        </motion.section>

        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
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
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  hint?: string;
  testId: string;
}

function InputCard({ icon, label, value, onChange, unit, hint, testId }: InputCardProps) {
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
    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 transition-all duration-200 hover:border-[#D1D5DB] hover:shadow-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <label className="text-sm font-medium text-[#111827]">{label}</label>
      </div>
      <div className="flex items-center gap-3">
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
          className="flex-1 px-3 py-2.5 text-base font-semibold border border-[#E5E7EB] rounded-lg focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 outline-none bg-white transition-all duration-200"
          data-testid={testId}
        />
        <span className="text-sm text-[#6B7280] font-medium whitespace-nowrap">{unit}</span>
      </div>
      {hint && <p className="text-[11px] text-[#9CA3AF] mt-2">{hint}</p>}
    </div>
  );
}
