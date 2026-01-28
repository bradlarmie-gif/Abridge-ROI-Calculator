import { useMemo, useState, useEffect } from "react";
import { ArrowRight, Mic, Users, FileText, BarChart3, Clock, DollarSign, Smile, TrendingUp, Sparkles, Target, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { motion, AnimatePresence } from "framer-motion";
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
  const [expandedDimension, setExpandedDimension] = useState<string | null>("utilization");
  
  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    setInputs({ ...inputs, [key]: value });
  };

  const handleSelfDocumentation = () => {
    if (onNavigateToExplore) {
      onNavigateToExplore(inputs.providers || 75, inputs.annualEncounters || 150000);
    }
  };

  const calculations = useMemo(() => {
    return calculateSwitchGap({
      ...inputs,
      providers: inputs.providers || 75,
      annualEncounters: inputs.annualEncounters || 150000,
      currentCostPerProvider: inputs.currentCostPerProvider || 200,
    });
  }, [inputs]);

  const hasAnyDimensionValue = 
    inputs.utilization > 0 || 
    inputs.timeSavedPerEncounter > 0 || 
    inputs.wrvuLift > 0 || 
    inputs.satisfaction > 0;
  
  const hasMinimumData = 
    inputs.providers > 0 && 
    inputs.annualEncounters > 0 && 
    hasAnyDimensionValue;

  const canProceed = Boolean(
    inputs.solution && 
    inputs.providers > 0 && 
    inputs.annualEncounters > 0 &&
    hasAnyDimensionValue
  );

  // Auto-expand next dimension when one is filled
  useEffect(() => {
    if (inputs.utilization > 0 && expandedDimension === "utilization") {
      setExpandedDimension("efficiency");
    } else if (inputs.timeSavedPerEncounter > 0 && expandedDimension === "efficiency") {
      setExpandedDimension("quality");
    } else if (inputs.wrvuLift > 0 && expandedDimension === "quality") {
      setExpandedDimension("satisfaction");
    }
  }, [inputs.utilization, inputs.timeSavedPerEncounter, inputs.wrvuLift, expandedDimension]);

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

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-72px)]">
        {/* Main Content - Left Side */}
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 pb-32 lg:pb-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            
            {/* Hero: Lead with Abridge benchmarks */}
            <div className="mb-8 md:mb-10">
              <div className="text-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
                  Here's what great looks like.
                </h1>
                <p className="text-base md:text-lg text-[#6B7280] max-w-xl mx-auto">
                  Abridge customers achieve these benchmarks. How close is your current solution?
                </p>
              </div>
              
              {/* Benchmark Cards - The Standard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <BenchmarkCard 
                  label="Utilization" 
                  value={`${ABRIDGE_BENCHMARKS.utilization}%`}
                  subtext="of encounters documented"
                  color="blue"
                />
                <BenchmarkCard 
                  label="Time Saved" 
                  value={`${ABRIDGE_BENCHMARKS.timeSavedAvg} min`}
                  subtext="per encounter"
                  color="purple"
                />
                <BenchmarkCard 
                  label="wRVU Lift" 
                  value={`+${ABRIDGE_BENCHMARKS.wrvuLift}%`}
                  subtext="from better capture"
                  color="emerald"
                />
                <BenchmarkCard 
                  label="Satisfaction" 
                  value={`${ABRIDGE_BENCHMARKS.satisfaction}%`}
                  subtext="would recommend"
                  color="amber"
                />
              </div>
              
              <p className="text-center text-sm text-[#6B7280]">
                These aren't aspirational. They're what actually happens when ambient AI works.
              </p>
            </div>

            {/* Setup Section */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 mb-6">
              <h2 className="text-lg font-bold text-[#111827] mb-4">Tell us about your current setup</h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-3">
                    What are you using today?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => updateInput("solution", "ambient-ai")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        inputs.solution === "ambient-ai"
                          ? "border-[#EA2C00] bg-[#EA2C00]/5"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                      data-testid="button-solution-ambient"
                    >
                      <Mic className={`w-5 h-5 mb-2 ${inputs.solution === "ambient-ai" ? "text-[#EA2C00]" : "text-slate-400"}`} />
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
                      <Users className={`w-5 h-5 mb-2 ${inputs.solution === "human-scribes" ? "text-[#EA2C00]" : "text-slate-400"}`} />
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
                      <FileText className={`w-5 h-5 mb-2 text-slate-400 ${onNavigateToExplore ? 'group-hover:text-emerald-600' : ''}`} />
                      <div className={`font-semibold text-[#111827] text-sm ${onNavigateToExplore ? 'group-hover:text-emerald-700' : ''}`}>Self-documentation</div>
                      <div className="text-xs text-[#6B7280] mt-0.5">No assistance</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-2">
                      Providers using this solution
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-2">
                      Annual encounters
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
                  </div>
                </div>
              </div>
            </section>

            {/* Dimension Cards - Conversational Style */}
            <section className="space-y-4 mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-[#EA2C00]" />
                <h2 className="text-lg font-bold text-[#111827]">How do your results compare?</h2>
              </div>
              <p className="text-sm text-[#6B7280] mb-4">
                Click each area to enter your current performance. Watch the opportunity grow.
              </p>

              <ConversationalDimensionCard
                id="utilization"
                icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-100"
                question="Are your providers actually using it?"
                benchmark={ABRIDGE_BENCHMARKS.utilization}
                benchmarkLabel="Abridge average"
                unit="%"
                value={inputs.utilization}
                onChange={(v) => updateInput("utilization", v)}
                score={calculations.utilizationScore}
                gapValue={calculations.utilizationGapValue}
                expanded={expandedDimension === "utilization"}
                onToggle={() => setExpandedDimension(expandedDimension === "utilization" ? null : "utilization")}
                insight="Every 10% below benchmark means encounters going undocumented—and value left on the table."
                testId="slider-utilization"
                minValue={10}
                maxValue={90}
                step={5}
              />

              <ConversationalDimensionCard
                id="efficiency"
                icon={<Clock className="w-5 h-5 text-purple-600" />}
                iconBg="bg-purple-100"
                question="How much time is it actually saving?"
                benchmark={ABRIDGE_BENCHMARKS.timeSavedAvg}
                benchmarkLabel="Abridge average"
                unit=" min"
                value={inputs.timeSavedPerEncounter}
                onChange={(v) => updateInput("timeSavedPerEncounter", v)}
                score={calculations.efficiencyScore}
                gapValue={calculations.efficiencyGapValue}
                expanded={expandedDimension === "efficiency"}
                onToggle={() => setExpandedDimension(expandedDimension === "efficiency" ? null : "efficiency")}
                insight="Time savings compound. 1 minute less per encounter = thousands of hours back annually."
                testId="slider-efficiency"
                minValue={0}
                maxValue={5}
                step={0.5}
              />

              <ConversationalDimensionCard
                id="quality"
                icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
                iconBg="bg-emerald-100"
                question="Is documentation quality driving revenue?"
                benchmark={ABRIDGE_BENCHMARKS.wrvuLift}
                benchmarkLabel="Abridge average"
                unit="%"
                prefix="+"
                value={inputs.wrvuLift}
                onChange={(v) => updateInput("wrvuLift", v)}
                score={calculations.qualityScore}
                gapValue={calculations.wrvuGapValue}
                expanded={expandedDimension === "quality"}
                onToggle={() => setExpandedDimension(expandedDimension === "quality" ? null : "quality")}
                insight="Better documentation = more accurate coding = higher reimbursement. This is where real money lives."
                testId="slider-wrvu"
                minValue={0}
                maxValue={8}
                step={0.5}
              />

              <ConversationalDimensionCard
                id="satisfaction"
                icon={<Smile className="w-5 h-5 text-amber-600" />}
                iconBg="bg-amber-100"
                question="Would your providers recommend it?"
                benchmark={ABRIDGE_BENCHMARKS.satisfaction}
                benchmarkLabel="Abridge average"
                unit="%"
                value={inputs.satisfaction}
                onChange={(v) => updateInput("satisfaction", v)}
                score={calculations.satisfactionScore}
                gapValue={0}
                expanded={expandedDimension === "satisfaction"}
                onToggle={() => setExpandedDimension(expandedDimension === "satisfaction" ? null : "satisfaction")}
                insight="Satisfied providers use the tool more, stay longer, and tell their colleagues. Satisfaction is the multiplier."
                testId="slider-satisfaction"
                minValue={20}
                maxValue={100}
                step={5}
              />
            </section>
          </div>
        </main>

        {/* Live Model Sidebar - Right Side */}
        <aside className="hidden lg:block w-80 xl:w-96 bg-white border-l border-slate-200 p-6 sticky top-[72px] h-[calc(100vh-72px)] overflow-y-auto">
          <LiveModelSidebar 
            calculations={calculations}
            inputs={inputs}
            hasMinimumData={hasMinimumData}
            hasAnyDimensionValue={hasAnyDimensionValue}
            canProceed={canProceed}
            onNext={onNext}
          />
        </aside>

        {/* Mobile Bottom Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              {hasMinimumData ? (
                <div>
                  <div className="text-xs text-[#6B7280]">Your opportunity</div>
                  <div className="text-xl font-bold text-[#111827]" data-testid="text-annual-gap-mobile">
                    {formatCurrency(calculations.annualGap)}<span className="text-sm font-normal text-[#6B7280]">/yr</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[#6B7280]">Enter your metrics to see the opportunity</div>
              )}
            </div>
            <Button
              onClick={onNext}
              disabled={!canProceed}
              className="bg-[#EA2C00] hover:bg-[#d12700] text-white px-6"
              data-testid="button-see-analysis"
            >
              See Full Analysis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Benchmark Card Component
function BenchmarkCard({ 
  label, 
  value, 
  subtext, 
  color 
}: { 
  label: string; 
  value: string; 
  subtext: string; 
  color: "blue" | "purple" | "emerald" | "amber"; 
}) {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    purple: "bg-purple-50 border-purple-100 text-purple-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
  };

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]} text-center`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-70 mt-0.5">{subtext}</div>
    </div>
  );
}

// Conversational Dimension Card
interface ConversationalDimensionCardProps {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  question: string;
  benchmark: number;
  benchmarkLabel: string;
  unit: string;
  prefix?: string;
  value: number;
  onChange: (value: number) => void;
  score: number;
  gapValue: number;
  expanded: boolean;
  onToggle: () => void;
  insight: string;
  testId: string;
  minValue: number;
  maxValue: number;
  step: number;
}

function ConversationalDimensionCard({
  id,
  icon,
  iconBg,
  question,
  benchmark,
  benchmarkLabel,
  unit,
  prefix = "",
  value,
  onChange,
  score,
  gapValue,
  expanded,
  onToggle,
  insight,
  testId,
  minValue,
  maxValue,
  step,
}: ConversationalDimensionCardProps) {
  const hasValue = value > 0;
  const progressToBenchmark = hasValue ? Math.min(100, (value / benchmark) * 100) : 0;
  
  const getStatusColor = () => {
    if (!hasValue) return { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200" };
    if (progressToBenchmark >= 95) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
    if (progressToBenchmark >= 70) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
    return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" };
  };
  
  const status = getStatusColor();

  return (
    <div className={`bg-white rounded-xl border transition-all duration-200 ${expanded ? 'border-[#EA2C00]/30 shadow-sm' : 'border-slate-200'}`}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between gap-4 text-left"
        data-testid={`button-expand-${id}`}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[#111827] text-sm md:text-base">{question}</div>
            <div className="text-xs text-[#6B7280] mt-0.5">
              {benchmarkLabel}: <span className="font-medium">{prefix}{benchmark}{unit}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {hasValue && (
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${status.bg} ${status.text}`}>
              {prefix}{value}{unit}
            </div>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[#6B7280]">Your current result</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={hasValue ? value : ""}
                      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                      placeholder="--"
                      min={minValue}
                      max={maxValue}
                      step={step}
                      className="w-20 px-3 py-2 text-center text-lg font-semibold border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
                      data-testid={`${testId}-input`}
                    />
                    <span className="text-sm text-[#6B7280]">{unit.trim()}</span>
                  </div>
                </div>
                
                <input
                  type="range"
                  min={minValue}
                  max={maxValue}
                  step={step}
                  value={hasValue ? value : minValue}
                  onChange={(e) => onChange(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                  data-testid={testId}
                />
                
                <div className="flex justify-between text-xs text-[#6B7280] mt-1">
                  <span>{prefix}{minValue}{unit}</span>
                  <span className="font-medium text-[#EA2C00]">{prefix}{benchmark}{unit} benchmark</span>
                  <span>{prefix}{maxValue}{unit}</span>
                </div>
              </div>

              {/* Visual Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-lg p-3 border ${hasValue ? status.border : 'border-slate-200'} ${hasValue ? status.bg : 'bg-slate-50'}`}>
                  <div className="text-xs text-[#6B7280] mb-1">You</div>
                  <div className={`text-xl font-bold ${hasValue ? status.text : 'text-slate-400'}`}>
                    {hasValue ? `${prefix}${value}${unit}` : '--'}
                  </div>
                </div>
                <div className="rounded-lg p-3 border border-emerald-200 bg-emerald-50">
                  <div className="text-xs text-[#6B7280] mb-1">Abridge</div>
                  <div className="text-xl font-bold text-emerald-700">
                    {prefix}{benchmark}{unit}
                  </div>
                </div>
              </div>

              {/* Gap Value */}
              {gapValue > 0 && hasValue && (
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
                  <span className="text-sm font-medium text-emerald-800">This gap alone is worth</span>
                  <span className="text-lg font-bold text-emerald-700">{formatCurrency(gapValue)}/year</span>
                </div>
              )}

              {/* Insight */}
              <p className="text-sm text-[#6B7280] italic border-l-2 border-slate-200 pl-3">
                {insight}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Live Model Sidebar
interface LiveModelSidebarProps {
  calculations: ReturnType<typeof calculateSwitchGap>;
  inputs: SwitchInputs;
  hasMinimumData: boolean;
  hasAnyDimensionValue: boolean;
  canProceed: boolean;
  onNext: () => void;
}

function LiveModelSidebar({ calculations, inputs, hasMinimumData, hasAnyDimensionValue, canProceed, onNext }: LiveModelSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#111827]">Your Opportunity</h3>
        {hasMinimumData ? (
          <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">LIVE</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1 bg-slate-100 rounded-full">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-xs font-medium text-slate-500">WAITING</span>
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="text-center py-6 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200">
        <div className="text-xs text-[#6B7280] uppercase tracking-wide mb-2">Annual Opportunity</div>
        <div className={`text-4xl font-bold transition-all duration-300 ${hasMinimumData ? 'text-[#111827]' : 'text-slate-300'}`} data-testid="text-annual-gap">
          {hasMinimumData ? formatCurrency(calculations.annualGap) : '$--'}
        </div>
        <div className="text-sm text-[#6B7280] mt-1">
          {hasMinimumData ? 'in additional annual value' : 'enter your metrics'}
        </div>
      </div>

      {/* Realization Score */}
      <div className="bg-slate-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[#111827]">Realization Score</span>
          <span className={`text-2xl font-bold ${hasAnyDimensionValue ? 'text-[#111827]' : 'text-slate-300'}`}>
            {hasAnyDimensionValue ? `${calculations.realizationScore}%` : '--%'}
          </span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: hasAnyDimensionValue ? `${calculations.realizationScore}%` : '0%' }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-xs text-[#6B7280] mt-2">
          <span>Early Stage</span>
          <span>Optimized</span>
          <span>Transformed</span>
        </div>
      </div>

      {/* Gap Breakdown */}
      {hasMinimumData && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">Gap Breakdown</div>
          
          {calculations.utilizationGapValue > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">Utilization</span>
              </div>
              <span className="font-semibold text-blue-700">{formatCurrency(calculations.utilizationGapValue)}</span>
            </motion.div>
          )}
          
          {calculations.efficiencyGapValue > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-3 bg-purple-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-800">Efficiency</span>
              </div>
              <span className="font-semibold text-purple-700">{formatCurrency(calculations.efficiencyGapValue)}</span>
            </motion.div>
          )}
          
          {calculations.wrvuGapValue > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-800">Quality (wRVU)</span>
              </div>
              <span className="font-semibold text-emerald-700">{formatCurrency(calculations.wrvuGapValue)}</span>
            </motion.div>
          )}
        </div>
      )}

      {/* 3-Year Projection */}
      {hasMinimumData && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white">
          <div className="text-xs opacity-70 uppercase tracking-wide mb-1">3-Year Opportunity</div>
          <div className="text-3xl font-bold">
            {formatCurrency(calculations.threeYearGap)}
          </div>
          <p className="text-xs opacity-60 mt-2">
            This is what waiting costs. Every month matters.
          </p>
        </div>
      )}

      {/* CTA */}
      <Button
        onClick={onNext}
        disabled={!canProceed}
        className="w-full bg-[#EA2C00] hover:bg-[#d12700] text-white h-12 text-base"
        data-testid="button-see-analysis-sidebar"
      >
        See Full Analysis
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      {!canProceed && (
        <p className="text-xs text-center text-[#6B7280]">
          {!inputs.providers || !inputs.annualEncounters 
            ? "Enter providers and encounters to continue"
            : "Adjust at least one metric to see your opportunity"
          }
        </p>
      )}
    </div>
  );
}
