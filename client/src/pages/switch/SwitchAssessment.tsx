import { useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Mic, Users, FileText, BarChart3, Clock, DollarSign, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { 
  calculateSwitchGap, 
  formatCurrency,
  ABRIDGE_BENCHMARKS, 
  type SwitchInputs, 
  type SolutionType 
} from "@/lib/switchGapCalculator";

interface SwitchAssessmentProps {
  inputs: SwitchInputs;
  setInputs: (inputs: SwitchInputs) => void;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function SwitchAssessment({
  inputs,
  setInputs,
  onNext,
  onBack,
  onBackToJourney,
}: SwitchAssessmentProps) {
  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    setInputs({ ...inputs, [key]: value });
  };

  const calculations = useMemo(() => {
    return calculateSwitchGap({
      ...inputs,
      providers: inputs.providers || 75,
      annualEncounters: inputs.annualEncounters || 150000,
      currentCostPerProvider: inputs.currentCostPerProvider || 200,
    });
  }, [inputs]);

  const canProceed = 
    inputs.solution && 
    inputs.providers && inputs.providers > 0 && 
    inputs.annualEncounters && inputs.annualEncounters > 0 &&
    inputs.utilization > 0;

  // Circular gauge calculations
  const circumference = 2 * Math.PI * 45;
  const scoreOffset = circumference - (calculations.realizationScore / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <GlobalHeader 
        pageName="Value Assessment" 
        currentStep={1} 
        totalSteps={2} 
        onLogoClick={onBackToJourney} 
      />

      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-[88px] pb-12 md:pb-16">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-500 flex items-center gap-1 mb-8 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-2 md:mb-3" data-testid="text-page-title">
            Value Realization Assessment
          </h1>
          <p className="text-base md:text-lg text-[#6B7280]">
            See where you stand on the ambient AI value spectrum — and what reaching your potential could mean.
          </p>
        </div>

        <div className="space-y-10">
          <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-8">
            <h2 className="text-lg md:text-xl font-bold text-[#111827] mb-4 md:mb-6">Your Current Situation</h2>
            
            <div className="space-y-5 md:space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-3">
                  What solution are you using today?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                  <button
                    onClick={() => updateInput("solution", "ambient-ai")}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      inputs.solution === "ambient-ai"
                        ? "border-[#EA2C00] bg-[#EA2C00]/5"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    data-testid="button-solution-ambient"
                  >
                    <Mic className={`w-6 h-6 mb-2 ${inputs.solution === "ambient-ai" ? "text-[#EA2C00]" : "text-slate-400"}`} />
                    <div className="font-semibold text-[#111827] text-sm">Ambient AI</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">DAX, Ambience, Suki, etc.</div>
                  </button>

                  <button
                    onClick={() => updateInput("solution", "human-scribes")}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      inputs.solution === "human-scribes"
                        ? "border-[#EA2C00] bg-[#EA2C00]/5"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    data-testid="button-solution-scribes"
                  >
                    <Users className={`w-6 h-6 mb-2 ${inputs.solution === "human-scribes" ? "text-[#EA2C00]" : "text-slate-400"}`} />
                    <div className="font-semibold text-[#111827] text-sm">Human Scribes</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">In-person or virtual</div>
                  </button>

                  <button
                    className="p-4 rounded-lg border-2 border-slate-200 bg-white transition-all text-left opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <FileText className="w-6 h-6 mb-2 text-slate-400" />
                    <div className="font-semibold text-[#111827] text-sm">Self-documentation</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">No assistance</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Providers using this solution
                  </label>
                  <FormattedNumberInput
                    value={inputs.providers}
                    onChange={(v) => updateInput("providers", v || 0)}
                    placeholder="75"
                    className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
                    data-testid="input-providers"
                  />
                  <span className="text-xs text-[#6B7280] mt-1">providers</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Annual encounters
                  </label>
                  <FormattedNumberInput
                    value={inputs.annualEncounters}
                    onChange={(v) => updateInput("annualEncounters", v || 0)}
                    placeholder="150,000"
                    className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
                    data-testid="input-encounters"
                  />
                  <span className="text-xs text-[#6B7280] mt-1">encounters/year</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-8">
            <h2 className="text-lg md:text-xl font-bold text-[#111827] mb-2">Your Results</h2>
            <p className="text-[#6B7280] mb-6 md:mb-8 text-sm md:text-base">
              How do your metrics compare to Abridge benchmarks?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <DimensionCard
                icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-100"
                title="Utilization"
                description="% of encounters documented"
                value={inputs.utilization}
                benchmark={ABRIDGE_BENCHMARKS.utilization}
                unit="%"
                maxValue={90}
                minValue={10}
                step={1}
                score={calculations.utilizationScore}
                onChange={(v) => updateInput("utilization", v)}
                testId="slider-utilization"
              />

              <DimensionCard
                icon={<Clock className="w-5 h-5 text-purple-600" />}
                iconBg="bg-purple-100"
                title="Efficiency"
                description="Time saved per encounter"
                value={inputs.timeSavedPerEncounter}
                benchmark={ABRIDGE_BENCHMARKS.timeSavedAvg}
                unit=" min"
                maxValue={5}
                minValue={0}
                step={0.5}
                score={calculations.efficiencyScore}
                onChange={(v) => updateInput("timeSavedPerEncounter", v)}
                testId="slider-efficiency"
              />

              <DimensionCard
                icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
                iconBg="bg-emerald-100"
                title="Quality"
                description="wRVU lift from documentation"
                value={inputs.wrvuLift}
                benchmark={ABRIDGE_BENCHMARKS.wrvuLift}
                unit="%"
                prefix="+"
                maxValue={8}
                minValue={0}
                step={0.5}
                score={calculations.qualityScore}
                onChange={(v) => updateInput("wrvuLift", v)}
                testId="slider-wrvu"
              />

              <DimensionCard
                icon={<Smile className="w-5 h-5 text-amber-600" />}
                iconBg="bg-amber-100"
                title="Satisfaction"
                description="Would providers recommend?"
                value={inputs.satisfaction}
                benchmark={ABRIDGE_BENCHMARKS.satisfaction}
                unit="%"
                maxValue={100}
                minValue={20}
                step={5}
                score={calculations.satisfactionScore}
                onChange={(v) => updateInput("satisfaction", v)}
                testId="slider-satisfaction"
              />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-8">
            <div className="text-center mb-4 md:mb-6">
              <h3 className="text-lg md:text-xl font-bold text-[#111827] mb-2">Your Value Realization Score</h3>
              <p className="text-sm md:text-base text-[#6B7280]">How much of ambient AI's potential value are you capturing?</p>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-center gap-6 md:gap-8 mb-6 md:mb-8">
              <div className="relative w-36 h-36 md:w-48 md:h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke="#E5E7EB" 
                    strokeWidth="8" 
                  />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke="#10B981" 
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={scoreOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-[#111827]" data-testid="text-realization-score">
                    {calculations.realizationScore}%
                  </span>
                  <span className="text-sm text-[#6B7280]">realized</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="text-[#6B7280]">Utilization</span>
                  <span className="text-lg font-bold text-[#111827]">{calculations.utilizationScore}%</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="text-[#6B7280]">Efficiency</span>
                  <span className="text-lg font-bold text-[#111827]">{calculations.efficiencyScore}%</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="text-[#6B7280]">Quality</span>
                  <span className="text-lg font-bold text-[#111827]">{calculations.qualityScore}%</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="text-[#6B7280]">Satisfaction</span>
                  <span className="text-lg font-bold text-[#111827]">{calculations.satisfactionScore}%</span>
                </div>
                <div className="border-t border-slate-200 my-2"></div>
                <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="font-semibold text-[#111827]">Average Score</span>
                  <span className="font-bold text-emerald-600 text-lg">{calculations.realizationScore}%</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="relative h-8 rounded-lg overflow-hidden bg-gradient-to-r from-red-100 via-yellow-100 via-green-100 to-emerald-200">
                <div className="absolute inset-0 flex">
                  <div className="flex-1 border-r border-white/50 flex flex-col justify-center px-2" style={{ flex: '0 0 40%' }}>
                    <span className="text-[10px] font-medium text-slate-600">Under 40%</span>
                    <span className="text-[9px] text-slate-500">Early Stage</span>
                  </div>
                  <div className="flex-1 border-r border-white/50 flex flex-col justify-center px-2" style={{ flex: '0 0 20%' }}>
                    <span className="text-[10px] font-medium text-slate-600">40-60%</span>
                    <span className="text-[9px] text-slate-500">Developing</span>
                  </div>
                  <div className="flex-1 border-r border-white/50 flex flex-col justify-center px-2" style={{ flex: '0 0 20%' }}>
                    <span className="text-[10px] font-medium text-slate-600">60-80%</span>
                    <span className="text-[9px] text-slate-500">Optimized</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center px-2" style={{ flex: '0 0 20%' }}>
                    <span className="text-[10px] font-medium text-slate-600">80%+</span>
                    <span className="text-[9px] text-slate-500">Transformed</span>
                  </div>
                </div>
                <div 
                  className="absolute top-0 bottom-0 w-1 bg-[#111827] rounded-full shadow-md transition-all duration-500"
                  style={{ left: `${Math.min(99, calculations.realizationScore)}%` }}
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#111827] text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                    You: {calculations.realizationScore}%
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-[#6B7280]">
              At <strong className="text-[#111827]">{calculations.realizationScore}%</strong> realization, you're in the <strong className="text-[#111827]">{calculations.maturityLevel}</strong> stage.
              {calculations.realizationScore < 40 && " Most organizations plateau here without focused optimization."}
              {calculations.realizationScore >= 40 && calculations.realizationScore < 80 && " You're making progress but there's significant room to grow."}
              {calculations.realizationScore >= 80 && " You're among top performers in ambient AI value realization."}
            </p>
          </section>

          <section className="bg-white rounded-xl border-2 border-slate-200 p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#111827]">Your Annual Gap</h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700">LIVE</span>
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-[#111827]" data-testid="text-annual-gap">
                {formatCurrency(calculations.annualGap)}
                <span className="text-xl text-[#6B7280] font-normal">/year in unrealized value</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {calculations.utilizationGapValue > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <div>
                      <span className="font-medium text-[#111827] text-sm">Utilization gap</span>
                      <span className="text-xs text-[#6B7280] ml-2">+{calculations.encounterGap.toLocaleString()} encounters</span>
                    </div>
                  </div>
                  <div className="font-semibold text-[#111827]">{formatCurrency(calculations.utilizationGapValue)}</div>
                </div>
              )}
              {calculations.efficiencyGapValue > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <span className="font-medium text-[#111827] text-sm">Efficiency gap</span>
                      <span className="text-xs text-[#6B7280] ml-2">+{calculations.efficiencyGapHours.toLocaleString()} hours</span>
                    </div>
                  </div>
                  <div className="font-semibold text-[#111827]">{formatCurrency(calculations.efficiencyGapValue)}</div>
                </div>
              )}
              {calculations.wrvuGapValue > 0 && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="font-medium text-[#111827] text-sm">Quality gap</span>
                      <span className="text-xs text-[#6B7280] ml-2">+{(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% wRVU</span>
                    </div>
                  </div>
                  <div className="font-semibold text-[#111827]">{formatCurrency(calculations.wrvuGapValue)}</div>
                </div>
              )}
            </div>

            <Button
              onClick={onNext}
              disabled={!canProceed}
              className="w-full bg-[#EA2C00] hover:bg-[#d12700] text-white h-12 text-base"
              data-testid="button-see-analysis"
            >
              See full analysis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}

interface DimensionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  value: number;
  benchmark: number;
  unit: string;
  prefix?: string;
  maxValue: number;
  minValue: number;
  step: number;
  score: number;
  onChange: (value: number) => void;
  testId: string;
}

function DimensionCard({
  icon,
  iconBg,
  title,
  description,
  value,
  benchmark,
  unit,
  prefix = "",
  maxValue,
  minValue,
  step,
  score,
  onChange,
  testId,
}: DimensionCardProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);
  
  const fillWidth = Math.min(100, (value / maxValue) * 100);
  const benchmarkPosition = (benchmark / maxValue) * 100;

  // Sync local value when external value changes (e.g., from slider)
  if (!isFocused && localValue !== String(value)) {
    setLocalValue(String(value));
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setLocalValue(inputValue);
    
    // Only update parent if we have a valid number
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      onChange(Math.min(maxValue, Math.max(minValue, parsed)));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // On blur, ensure we have a valid value
    const parsed = parseFloat(localValue);
    if (isNaN(parsed) || localValue === '') {
      setLocalValue(String(minValue));
      onChange(minValue);
    } else {
      const clamped = Math.min(maxValue, Math.max(minValue, parsed));
      setLocalValue(String(clamped));
      onChange(clamped);
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-[#111827] text-sm">{title}</h3>
            <p className="text-xs text-[#6B7280]">{description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            autoComplete="off"
            data-lpignore="true"
            data-form-type="other"
            className="w-16 px-2 py-1.5 text-center text-base font-semibold border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
            data-testid={`${testId}-input`}
          />
          <span className="text-xs text-[#6B7280]">{unit.trim()}</span>
        </div>
      </div>

      <div className="relative h-8 bg-slate-200 rounded-lg overflow-hidden mb-2">
        <div 
          className="absolute top-0 left-0 h-full bg-slate-500 transition-all flex items-center px-2"
          style={{ width: `${fillWidth}%` }}
        >
          <span className="text-sm font-semibold text-white truncate">
            {prefix}{value}{unit}
          </span>
        </div>
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-[#EA2C00]"
          style={{ left: `${benchmarkPosition}%` }}
        />
        <div 
          className="absolute top-1/2 -translate-y-1/2 text-xs font-semibold text-[#EA2C00] bg-white/90 px-1 rounded"
          style={{ left: `${benchmarkPosition + 1}%` }}
        >
          {prefix}{benchmark}{unit}
        </div>
      </div>

      <input
        type="range"
        min={minValue}
        max={maxValue}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
        data-testid={testId}
      />

      <div className="mt-3 flex items-center gap-2">
        <span className="text-lg font-bold text-[#111827]">{score}%</span>
        <span className="text-xs text-[#6B7280]">of Abridge benchmark</span>
      </div>
    </div>
  );
}
