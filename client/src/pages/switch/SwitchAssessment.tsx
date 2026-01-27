import { useMemo, useState } from "react";
import { ArrowRight, ArrowLeft, Mic, Users, FileText, BarChart3, Clock, DollarSign, Smile, Moon, Heart, Eye, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { 
  calculateSwitchGap, 
  formatCurrency,
  ABRIDGE_BENCHMARKS,
  VALUE_ASSUMPTIONS,
  type SwitchInputs, 
  type SolutionType 
} from "@/lib/switchGapCalculator";

interface SwitchAssessmentProps {
  inputs: SwitchInputs;
  setInputs: (inputs: SwitchInputs) => void;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

export default function SwitchAssessment({
  inputs,
  setInputs,
  onNext,
  onBack,
  onBackToJourney,
  onNavigateToExplore,
}: SwitchAssessmentProps) {
  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    setInputs({ ...inputs, [key]: value });
  };

  // Handle self-documentation selection - navigate directly to Explore
  const handleSelfDocumentation = () => {
    if (onNavigateToExplore) {
      onNavigateToExplore(inputs.providers || 75, inputs.annualEncounters || 150000);
    }
  };

  // Optional pajama time input (hours/week after-hours documentation)
  const [pajamaTimeHours, setPajamaTimeHours] = useState<number>(0);

  const calculations = useMemo(() => {
    return calculateSwitchGap({
      ...inputs,
      providers: inputs.providers || 75,
      annualEncounters: inputs.annualEncounters || 150000,
      currentCostPerProvider: inputs.currentCostPerProvider || 200,
    });
  }, [inputs]);

  // Human impact calculations - Uses pajama time input when provided
  const humanImpact = useMemo(() => {
    const providers = inputs.providers || 0;
    const encounters = inputs.annualEncounters || 0;
    const efficiency = inputs.timeSavedPerEncounter || 0;
    const utilizationRate = inputs.utilization || 0;
    const wrvuLift = inputs.wrvuLift || 0;

    const abridgeTimeSaved = ABRIDGE_BENCHMARKS.timeSavedAvg;
    
    // Calculate encounters documented at current vs benchmark utilization
    const documentsAtCurrent = Math.round(encounters * (utilizationRate / 100));
    const documentsAtBenchmark = Math.round(encounters * (ABRIDGE_BENCHMARKS.utilization / 100));
    
    // Hours calculation: Compare current time savings to benchmark potential
    // Current: encounters at current utilization * current efficiency
    // Benchmark: encounters at 75% utilization * 4 min efficiency
    const currentHoursSavedPerYear = Math.round((documentsAtCurrent * efficiency) / 60);
    const potentialHoursSavedPerYear = Math.round((documentsAtBenchmark * abridgeTimeSaved) / 60);
    const additionalHoursPerYear = Math.max(0, potentialHoursSavedPerYear - currentHoursSavedPerYear);
    const additionalHoursPerWeek = Math.round((additionalHoursPerYear / 52) * 10) / 10;
    const additionalHoursPerProvider = providers > 0 ? Math.round(additionalHoursPerYear / providers) : 0;
    
    // Work weeks reclaimed per year (based on 40-hour work week)
    const workWeeksReclaimed = Math.round(additionalHoursPerYear / 40);
    
    // Pajama time reduction: Use actual input if provided, otherwise estimate
    // If user reports pajama time, we estimate ~60% of time savings could reduce after-hours work
    const estimatedPajamaReduction = pajamaTimeHours > 0 
      ? Math.min(pajamaTimeHours, Math.round(additionalHoursPerWeek * 0.6 * 10) / 10)
      : Math.round(additionalHoursPerWeek * 0.6 * 10) / 10;
    
    // Evenings reclaimed: Use pajama time if available, otherwise estimate from additional hours
    // If user reports 10 hrs/week pajama time, and we can reduce ~60% of additional savings, that's X evenings
    const pajamaHoursReduced = pajamaTimeHours > 0 
      ? Math.min(pajamaTimeHours, estimatedPajamaReduction)
      : estimatedPajamaReduction;
    const eveningsReclaimedPerWeek = Math.round(pajamaHoursReduced / 2 * 10) / 10; // Assuming 2-hour evening sessions
    const eveningsReclaimedPerYear = Math.round(eveningsReclaimedPerWeek * 52);
    
    // wRVU to dollars calculation
    const wrvuGapPercent = Math.max(0, ABRIDGE_BENCHMARKS.wrvuLift - wrvuLift);
    const additionalWRVU = Math.round(documentsAtBenchmark * VALUE_ASSUMPTIONS.avgWRVUPerEncounter * (wrvuGapPercent / 100));
    const additionalRevenue = Math.round(additionalWRVU * VALUE_ASSUMPTIONS.wrvuDollarValue * VALUE_ASSUMPTIONS.wrvuAttribution);
    
    return {
      additionalHoursPerYear,
      additionalHoursPerWeek,
      additionalHoursPerProvider,
      workWeeksReclaimed,
      eveningsReclaimedPerYear,
      eveningsReclaimedPerWeek,
      estimatedPajamaReduction,
      pajamaHoursReduced,
      additionalRevenue,
      wrvuGapPercent,
      additionalWRVU,
      hasData: providers > 0 && encounters > 0 && (efficiency > 0 || utilizationRate > 0),
      usedPajamaInput: pajamaTimeHours > 0,
    };
  }, [inputs, pajamaTimeHours]);

  // Check if user has entered any dimension values
  const hasAnyDimensionValue = 
    inputs.utilization > 0 || 
    inputs.timeSavedPerEncounter > 0 || 
    inputs.wrvuLift > 0 || 
    inputs.satisfaction > 0;
  
  // Check if we have enough data to show meaningful results
  const hasMinimumData = 
    inputs.providers > 0 && 
    inputs.annualEncounters > 0 && 
    hasAnyDimensionValue;

  const canProceed = 
    inputs.solution && 
    inputs.providers && inputs.providers > 0 && 
    inputs.annualEncounters && inputs.annualEncounters > 0 &&
    hasAnyDimensionValue;

  // Circular gauge calculations
  const circumference = 2 * Math.PI * 45;
  const scoreOffset = hasMinimumData 
    ? circumference - (calculations.realizationScore / 100) * circumference 
    : circumference;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <UnifiedHeader 
        pathType="switch"
        currentStep={1} 
        totalSteps={2}
        stepName="Value Assessment"
        onBack={onBack}
        onHome={onBackToJourney}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-12 md:pb-16">
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
                    onClick={handleSelfDocumentation}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      onNavigateToExplore 
                        ? "border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer group" 
                        : "border-slate-200 bg-white opacity-50 cursor-not-allowed"
                    }`}
                    disabled={!onNavigateToExplore}
                    data-testid="button-solution-self-doc"
                  >
                    <FileText className={`w-6 h-6 mb-2 text-slate-400 ${onNavigateToExplore ? 'group-hover:text-emerald-600' : ''}`} />
                    <div className={`font-semibold text-[#111827] text-sm ${onNavigateToExplore ? 'group-hover:text-emerald-700' : ''}`}>Self-documentation</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">No assistance</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Providers using this solution <span className="text-[#EA2C00]">*</span>
                  </label>
                  <FormattedNumberInput
                    value={inputs.providers}
                    onChange={(v) => updateInput("providers", v || 0)}
                    placeholder="e.g. 75"
                    className={`w-full h-11 px-4 border rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none transition-colors ${
                      inputs.providers > 0 ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'
                    }`}
                    data-testid="input-providers"
                  />
                  <span className="text-xs text-[#6B7280] mt-1">providers</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-2">
                    Annual encounters <span className="text-[#EA2C00]">*</span>
                  </label>
                  <FormattedNumberInput
                    value={inputs.annualEncounters}
                    onChange={(v) => updateInput("annualEncounters", v || 0)}
                    placeholder="e.g. 150,000"
                    className={`w-full h-11 px-4 border rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none transition-colors ${
                      inputs.annualEncounters > 0 ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50'
                    }`}
                    data-testid="input-encounters"
                  />
                  <span className="text-xs text-[#6B7280] mt-1">encounters/year</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-8">
            <h2 className="text-lg md:text-xl font-bold text-[#111827] mb-2">Your Results</h2>
            <p className="text-[#6B7280] mb-4 text-sm md:text-base">
              How do your metrics compare to Abridge benchmarks?
            </p>

            {!hasAnyDimensionValue && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                <div className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">Adjust the sliders or enter values to see how you compare</p>
                  <p className="text-xs text-blue-600 mt-1">Each metric shows your current performance vs. what Abridge customers typically achieve.</p>
                </div>
              </div>
            )}

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
                dollarValue={humanImpact.additionalRevenue}
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

            {/* Optional: Pajama Time Context */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#111827] text-sm">After-Hours Documentation</h3>
                  <p className="text-xs text-[#6B7280]">Optional: How much are your providers documenting outside clinic hours?</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={pajamaTimeHours}
                  onChange={(e) => setPajamaTimeHours(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  data-testid="slider-pajama-time"
                />
                <div className="flex items-center gap-1 min-w-[80px]">
                  <span className={`text-lg font-semibold ${pajamaTimeHours > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {pajamaTimeHours > 0 ? pajamaTimeHours : '--'}
                  </span>
                  <span className="text-xs text-[#6B7280]">hrs/week</span>
                </div>
              </div>
              {pajamaTimeHours > 0 && (
                <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-sm text-indigo-800">
                    <span className="font-semibold">{pajamaTimeHours} hours/week</span> equals roughly <span className="font-semibold">{Math.round(pajamaTimeHours * 52)} hours/year</span> — 
                    or about <span className="font-semibold">{Math.round(pajamaTimeHours * 52 / 40)} full work weeks</span> spent documenting outside clinic hours.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Human Impact Section - What This Means For Your Providers */}
          {humanImpact.hasData && humanImpact.additionalHoursPerYear > 0 && (
            <section className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-5 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-100/50 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg md:text-xl font-bold text-[#111827]">What This Could Mean For Your Providers</h2>
                </div>
                <p className="text-sm text-[#6B7280] mb-4">
                  Based on your current metrics, here's what reaching Abridge benchmarks could look like:
                </p>
                <p className="text-xs text-[#9CA3AF] mb-6 flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Modeled from your inputs vs. Abridge benchmarks (75% utilization, 4 min/encounter, 5% wRVU lift)
                  {humanImpact.usedPajamaInput && <span className="text-indigo-500 font-medium ml-1">• Using your reported pajama time</span>}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Time Reclaimed */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Time Reclaimed</span>
                    </div>
                    <div className="text-2xl font-bold text-[#111827] mb-1">
                      {humanImpact.additionalHoursPerYear.toLocaleString()} hrs
                    </div>
                    <p className="text-xs text-[#6B7280]">
                      ~{humanImpact.workWeeksReclaimed} work weeks/year
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      ~{humanImpact.additionalHoursPerWeek} hrs/week across your team
                    </p>
                  </div>

                  {/* Evenings Back */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Moon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Less Pajama Time</span>
                    </div>
                    <div className="text-2xl font-bold text-[#111827] mb-1">
                      ~{humanImpact.eveningsReclaimedPerYear} evenings
                    </div>
                    <p className="text-xs text-[#6B7280]">
                      ~{humanImpact.eveningsReclaimedPerWeek} fewer late nights/week
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">
                      {humanImpact.usedPajamaInput 
                        ? `Based on your ${pajamaTimeHours} hrs/week reported` 
                        : 'Notes done before leaving clinic'}
                    </p>
                  </div>

                  {/* Revenue Opportunity */}
                  {humanImpact.additionalRevenue > 0 && (
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Revenue Potential</span>
                      </div>
                      <div className="text-2xl font-bold text-emerald-600 mb-1">
                        {formatCurrency(humanImpact.additionalRevenue)}
                      </div>
                      <p className="text-xs text-[#6B7280]">
                        +{humanImpact.wrvuGapPercent.toFixed(1)}% wRVU lift
                      </p>
                      <p className="text-xs text-[#6B7280] mt-1">
                        From better documentation capture
                      </p>
                    </div>
                  )}
                </div>

                {/* Burnout callout */}
                <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
                  <Heart className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Documentation is the #1 driver of physician burnout</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Every hour reclaimed is an hour back with patients, family, or simply breathing.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

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
                  <span className={`text-4xl font-bold ${hasAnyDimensionValue ? 'text-[#111827]' : 'text-slate-400'}`} data-testid="text-realization-score">
                    {hasAnyDimensionValue ? `${calculations.realizationScore}%` : '--'}
                  </span>
                  <span className="text-sm text-[#6B7280]">
                    {hasAnyDimensionValue ? 'realized' : 'enter metrics above'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="text-[#6B7280]">Utilization</span>
                  <span className={`text-lg font-bold ${inputs.utilization > 0 ? 'text-[#111827]' : 'text-slate-400'}`}>
                    {inputs.utilization > 0 ? `${calculations.utilizationScore}%` : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="text-[#6B7280]">Efficiency</span>
                  <span className={`text-lg font-bold ${inputs.timeSavedPerEncounter > 0 ? 'text-[#111827]' : 'text-slate-400'}`}>
                    {inputs.timeSavedPerEncounter > 0 ? `${calculations.efficiencyScore}%` : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="text-[#6B7280]">Quality</span>
                  <span className={`text-lg font-bold ${inputs.wrvuLift > 0 ? 'text-[#111827]' : 'text-slate-400'}`}>
                    {inputs.wrvuLift > 0 ? `${calculations.qualityScore}%` : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                  <span className="text-[#6B7280]">Satisfaction</span>
                  <span className={`text-lg font-bold ${inputs.satisfaction > 0 ? 'text-[#111827]' : 'text-slate-400'}`}>
                    {inputs.satisfaction > 0 ? `${calculations.satisfactionScore}%` : '--'}
                  </span>
                </div>
                <div className="border-t border-slate-200 my-2"></div>
                <div className={`flex items-center justify-between gap-4 px-3 py-2 rounded-lg border ${
                  hasAnyDimensionValue ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className="font-semibold text-[#111827]">Average Score</span>
                  <span className={`font-bold text-lg whitespace-nowrap ${hasAnyDimensionValue ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasAnyDimensionValue ? `${calculations.realizationScore}%` : '--'}
                  </span>
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
                {hasAnyDimensionValue && (
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-[#111827] rounded-full shadow-md transition-all duration-500"
                    style={{ left: `${Math.min(99, calculations.realizationScore)}%` }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#111827] text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                      You: {calculations.realizationScore}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-center text-[#6B7280]">
              {hasAnyDimensionValue ? (
                <>
                  At <strong className="text-[#111827]">{calculations.realizationScore}%</strong> realization, you're in the <strong className="text-[#111827]">{calculations.maturityLevel}</strong> stage.
                  {calculations.realizationScore < 40 && " Most organizations plateau here without focused optimization."}
                  {calculations.realizationScore >= 40 && calculations.realizationScore < 80 && " You're making progress but there's significant room to grow."}
                  {calculations.realizationScore >= 80 && " You're among top performers in ambient AI value realization."}
                </>
              ) : (
                <span className="text-slate-400 italic">
                  Enter your metrics above to see your realization score and maturity stage.
                </span>
              )}
            </p>
          </section>

          <section className={`rounded-xl border-2 p-8 transition-all duration-300 ${
            hasMinimumData ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#111827]">Your Opportunity</h3>
              {hasMinimumData ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-700">LIVE</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-xs font-medium text-slate-500">AWAITING DATA</span>
                </div>
              )}
            </div>

            <div className="text-center mb-6">
              {hasMinimumData ? (
                <div className="text-5xl font-bold text-[#111827]" data-testid="text-annual-gap">
                  {formatCurrency(calculations.annualGap)}
                  <span className="text-xl text-[#6B7280] font-normal">/year in additional potential</span>
                </div>
              ) : (
                <div className="py-4" data-testid="text-annual-gap">
                  <div className="text-5xl font-bold text-slate-300 mb-2">--</div>
                  <p className="text-sm text-slate-500">
                    {inputs.providers > 0 && inputs.annualEncounters > 0 
                      ? "Adjust the metrics above to see your opportunity"
                      : hasAnyDimensionValue
                        ? "Enter your provider count and annual encounters above"
                        : "Enter providers, encounters, and at least one metric to see your opportunity"
                    }
                  </p>
                </div>
              )}
            </div>

            {hasMinimumData && (
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
            )}

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
  dollarValue?: number;
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
  dollarValue,
}: DimensionCardProps) {
  // Track if user has entered a value (0 is our "empty" state)
  const hasValue = value > 0;
  const [localValue, setLocalValue] = useState(hasValue ? String(value) : "");
  const [isFocused, setIsFocused] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [lastScore, setLastScore] = useState(score);
  const [isPulsing, setIsPulsing] = useState(false);
  
  const fillWidth = hasValue ? Math.min(100, (value / maxValue) * 100) : 0;
  const benchmarkPosition = (benchmark / maxValue) * 100;
  
  // Calculate progress toward benchmark (0-100, can exceed 100)
  const progressToBenchmark = hasValue ? Math.min(100, (value / benchmark) * 100) : 0;
  
  // Dynamic color based on progress to benchmark
  const getProgressColor = () => {
    if (!hasValue) return { bg: 'bg-slate-300', text: 'text-slate-400', ring: 'ring-slate-200' };
    if (progressToBenchmark >= 95) return { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'ring-emerald-200' };
    if (progressToBenchmark >= 70) return { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-200' };
    if (progressToBenchmark >= 40) return { bg: 'bg-orange-500', text: 'text-orange-600', ring: 'ring-orange-200' };
    return { bg: 'bg-red-500', text: 'text-red-600', ring: 'ring-red-200' };
  };
  
  const colors = getProgressColor();

  // Sync local value when external value changes (e.g., from slider)
  const expectedLocalValue = hasValue ? String(value) : "";
  if (!isFocused && localValue !== expectedLocalValue && (hasValue || localValue === "")) {
    setLocalValue(expectedLocalValue);
  }
  
  // Trigger pulse animation when score changes
  if (score !== lastScore) {
    setLastScore(score);
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 300);
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
    <div className={`bg-slate-50 rounded-xl p-5 transition-all duration-200 ${
      isSliding ? `ring-2 ${colors.ring} shadow-sm` : ''
    }`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${
            isSliding ? 'scale-110' : ''
          }`}>
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
            className={`w-16 px-2 py-1.5 text-center text-base font-semibold border rounded-lg outline-none transition-all duration-200 ${
              isPulsing 
                ? `border-${colors.text.replace('text-', '')} ring-2 ${colors.ring} scale-105` 
                : 'border-slate-200'
            } focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00]`}
            data-testid={`${testId}-input`}
          />
          <span className="text-xs text-[#6B7280]">{unit.trim()}</span>
        </div>
      </div>

      <div className="relative h-8 bg-slate-200 rounded-lg overflow-hidden mb-2">
        {/* Empty state placeholder */}
        {/* Dynamic gradient fill bar */}
        <div 
          className={`absolute top-0 left-0 h-full ${colors.bg} transition-all duration-300 ease-out flex items-center px-2`}
          style={{ width: `${fillWidth}%` }}
        >
          {hasValue && (
            <span className="text-sm font-semibold text-white truncate">
              {prefix}{value}{unit}
            </span>
          )}
        </div>
        {/* Benchmark marker */}
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
        {/* At-benchmark indicator */}
        {hasValue && progressToBenchmark >= 95 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-white bg-emerald-600 px-1.5 py-0.5 rounded-full animate-pulse">
            Target
          </div>
        )}
      </div>

      <input
        type="range"
        min={minValue}
        max={maxValue}
        step={step}
        value={hasValue ? value : minValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onMouseDown={() => setIsSliding(true)}
        onMouseUp={() => setIsSliding(false)}
        onMouseLeave={() => setIsSliding(false)}
        onTouchStart={() => setIsSliding(true)}
        onTouchEnd={() => setIsSliding(false)}
        className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
        data-testid={testId}
      />

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className={`text-lg font-bold transition-all duration-200 ${
          !hasValue ? 'text-slate-400' : isPulsing ? `${colors.text} scale-110` : 'text-[#111827]'
        }`}>
          {hasValue ? `${score}%` : '--'}
        </span>
        <span className="text-xs text-[#6B7280]">of Abridge benchmark</span>
        {/* Dollar value indicator for quality card */}
        {dollarValue !== undefined && dollarValue > 0 && hasValue && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            +{formatCurrency(dollarValue)}
          </span>
        )}
        {/* Mini progress indicator */}
        <div className="ml-auto flex items-center gap-1">
          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${colors.bg} transition-all duration-300 rounded-full`}
              style={{ width: `${progressToBenchmark}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
