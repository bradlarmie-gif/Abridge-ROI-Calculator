import { useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Users, DollarSign, Clock, Building2, UserCheck, Calendar, AlertTriangle, Timer, Moon, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import {
  type ScribeInputs,
  calculateScribeGap,
  formatCurrency,
  SCRIBE_ASSUMPTIONS,
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
    <div className="min-h-screen bg-slate-50">
      <GlobalHeader pageName="Scribe Program Analysis" currentStep={1} totalSteps={2} />

      <main className="pt-[88px] pb-8 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="-ml-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#111827] mb-2">
            Scribe Program Analysis
          </h1>
          <p className="text-sm md:text-base text-[#6B7280]">
            Understand your scribe program economics
          </p>
        </div>

        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-4 md:mb-6">Scribe Program Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <InputCard
              icon={<Users className="w-4 h-4 text-purple-600" />}
              iconBg="bg-purple-100"
              label="How many scribes do you have?"
              value={inputs.scribeCount}
              onChange={(v) => updateInput("scribeCount", v)}
              unit="scribes"
              testId="input-scribe-count"
            />

            <InputCard
              icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-100"
              label="Average cost per scribe"
              value={inputs.scribeCostPerHour}
              onChange={(v) => updateInput("scribeCostPerHour", v)}
              unit="$/hour"
              hint="Include benefits, overhead if known"
              testId="input-scribe-cost"
            />

            <InputCard
              icon={<Clock className="w-4 h-4 text-blue-600" />}
              iconBg="bg-blue-100"
              label="Hours per week (per scribe)"
              value={inputs.scribeHoursPerWeek}
              onChange={(v) => updateInput("scribeHoursPerWeek", v)}
              unit="hrs/week"
              testId="input-scribe-hours"
            />

            <InputCard
              icon={<UserCheck className="w-4 h-4 text-orange-600" />}
              iconBg="bg-orange-100"
              label="Providers supported by scribes"
              value={inputs.providersWithScribes}
              onChange={(v) => updateInput("providersWithScribes", v)}
              unit="providers"
              hint="How many providers have scribe support?"
              testId="input-providers-with-scribes"
            />

            <InputCard
              icon={<Building2 className="w-4 h-4 text-slate-600" />}
              iconBg="bg-slate-100"
              label="Total providers in your organization"
              value={inputs.totalProviders}
              onChange={(v) => updateInput("totalProviders", v)}
              unit="providers"
              testId="input-total-providers"
            />

            <InputCard
              icon={<Calendar className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-100"
              label="Annual encounters (all providers)"
              value={inputs.annualEncounters}
              onChange={(v) => updateInput("annualEncounters", v)}
              unit="encounters/year"
              testId="input-annual-encounters"
              large
            />
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-4 md:mb-6">Your Coverage Gap</h2>

          <div className="mb-6">
            <div className="relative h-12 bg-slate-100 rounded-lg overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-3 transition-all"
                style={{ width: `${Math.max(calculations.coveragePercent, 2)}%`, minWidth: calculations.coveragePercent > 0 ? '8px' : '0' }}
              />
              {calculations.coveragePercent >= 20 ? (
                <span 
                  className="absolute top-1/2 -translate-y-1/2 left-3 text-xs font-semibold text-white"
                  style={{ maxWidth: `${calculations.coveragePercent - 5}%` }}
                >
                  {inputs.providersWithScribes} with scribes
                </span>
              ) : (
                <span 
                  className="absolute top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-600"
                  style={{ left: `${Math.max(calculations.coveragePercent, 2) + 2}%` }}
                >
                  {inputs.providersWithScribes} with scribes
                </span>
              )}
              <div
                className="absolute top-0 h-full bg-amber-100 flex items-center justify-center transition-all"
                style={{
                  left: `${calculations.coveragePercent}%`,
                  width: `${100 - calculations.coveragePercent}%`,
                }}
              >
                {calculations.coveragePercent < 60 && (
                  <span className="text-xs font-semibold text-amber-700">
                    {calculations.providersWithoutSupport} without support
                  </span>
                )}
              </div>
              {calculations.coveragePercent >= 60 && (
                <span 
                  className="absolute top-1/2 -translate-y-1/2 right-3 text-xs font-semibold text-amber-700"
                >
                  {calculations.providersWithoutSupport} without support
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#111827]">{calculations.coveragePercent}%</div>
              <div className="text-xs text-[#6B7280]">have scribe support</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-700">
                {100 - calculations.coveragePercent}%
              </div>
              <div className="text-xs text-amber-600">documenting alone</div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              <strong>{calculations.providersWithoutSupport} providers</strong> have no documentation
              support. They're spending 10-15+ minutes per encounter on notes, contributing to burnout
              and after-hours work.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-2">What Full Scribe Coverage Would Cost</h2>
          <p className="text-xs md:text-sm text-[#6B7280] mb-4 md:mb-6">
            If you wanted to give every provider scribe support
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-5">
              <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
                Current State
              </div>
              <div className="text-base font-semibold text-[#111827] mb-4">Your Scribe Program</div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribes</span>
                  <span className="font-medium text-[#111827]">{inputs.scribeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Providers covered</span>
                  <span className="font-medium text-[#111827]">{inputs.providersWithScribes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Coverage</span>
                  <span className="font-medium text-[#111827]">{calculations.coveragePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribe:Provider ratio</span>
                  <span className="font-medium text-[#111827]">1:{calculations.scribeRatio}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="text-xs text-[#6B7280]">Annual cost</div>
                <div className="text-xl font-bold text-[#111827]">
                  {formatCurrency(calculations.totalScribeCost)}
                </div>
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl p-5">
              <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide mb-1">
                Full Coverage
              </div>
              <div className="text-base font-semibold text-[#111827] mb-4">If Everyone Had a Scribe</div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribes needed</span>
                  <span className="font-medium text-[#111827]">{calculations.scribesNeededForFullCoverage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Providers covered</span>
                  <span className="font-medium text-[#111827]">{inputs.totalProviders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Coverage</span>
                  <span className="font-medium text-[#111827]">100%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Scribe:Provider ratio</span>
                  <span className="font-medium text-[#111827]">1:{calculations.scribeRatio}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="text-xs text-[#6B7280]">Annual cost</div>
                <div className="text-xl font-bold text-[#111827]">
                  {formatCurrency(calculations.fullScribeCost)}
                </div>
                <div className="text-xs text-amber-600 font-medium mt-1">
                  +{formatCurrency(calculations.costToScale)} to scale
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-2">
            The Burden on Unsupported Providers
          </h2>
          <p className="text-xs md:text-sm text-[#6B7280] mb-4 md:mb-6">
            Your {calculations.providersWithoutSupport} providers without scribe support are handling documentation alone
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="bg-slate-50 rounded-lg p-5 text-center">
              <div className="flex justify-center mb-2">
                <Timer className="w-6 h-6 text-slate-500" />
              </div>
              <div className="text-xl font-bold text-[#111827]">
                {calculations.unsupportedDocTimeHours.toLocaleString()} hrs/year
              </div>
              <div className="text-xs text-[#6B7280] mb-2">on documentation</div>
              <div className="text-[10px] text-slate-400 font-mono">
                {calculations.providersWithoutSupport} providers x {calculations.encountersPerProvider.toLocaleString()} encounters x 12 min / 60
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-5 text-center">
              <div className="flex justify-center mb-2">
                <Moon className="w-6 h-6 text-slate-500" />
              </div>
              <div className="text-xl font-bold text-[#111827]">
                {calculations.pajamaTimeHours.toLocaleString()} hrs/year
              </div>
              <div className="text-xs text-[#6B7280] mb-2">after clinic hours</div>
              <div className="text-[10px] text-slate-400 font-mono">
                ~40% of documentation time occurs outside clinic hours*
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-5 text-center">
              <div className="flex justify-center mb-2">
                <BarChart3 className="w-6 h-6 text-slate-500" />
              </div>
              <div className="text-xl font-bold text-[#111827]">
                {calculations.docTimePerUnsupportedProvider} hrs/year
              </div>
              <div className="text-xs text-[#6B7280] mb-2">per unsupported provider</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Average documentation burden per provider
              </div>
            </div>
          </div>

          <div className="mt-4 text-[10px] text-slate-400 italic">
            * Based on industry research on physician documentation patterns
          </div>
        </section>

        <div className="flex justify-center">
          <Button
            onClick={onNext}
            className="h-12 px-8 bg-[#EA2C00] hover:bg-[#d12700] text-white font-semibold"
            data-testid="button-see-full-analysis"
          >
            See Full Analysis
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}

interface InputCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit: string;
  hint?: string;
  testId: string;
  large?: boolean;
}

function InputCard({ icon, iconBg, label, value, onChange, unit, hint, testId, large }: InputCardProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Format with commas when not focused
  const displayValue = isFocused ? localValue : value.toLocaleString();

  if (!isFocused && localValue !== String(value)) {
    setLocalValue(String(value));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove commas before parsing
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
    <div className={`bg-slate-50 rounded-lg p-4 ${large ? "md:col-span-2" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-md ${iconBg} flex items-center justify-center`}>{icon}</div>
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
          className="flex-1 px-3 py-2 text-base font-semibold border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none bg-white"
          data-testid={testId}
        />
        <span className="text-sm text-[#6B7280] whitespace-nowrap">{unit}</span>
      </div>
      {hint && <p className="text-[10px] text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}
