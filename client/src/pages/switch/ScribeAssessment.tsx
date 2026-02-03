import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Users, DollarSign, Clock, Building2, UserCheck, Calendar, AlertTriangle, Timer, Moon, TrendingUp, Lightbulb, Info, FileEdit, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  const hasBasicInfo = inputs.scribeCount > 0 && inputs.totalProviders > 0;
  const hasCostInfo = inputs.scribeCostPerHour > 0 && inputs.scribeHoursPerWeek > 0;
  const hasFullInfo = hasBasicInfo && hasCostInfo && inputs.providersWithScribes > 0 && inputs.annualEncounters > 0;

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

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-6 lg:p-8 mb-6 shadow-sm"
        >
          <h2 className="text-base md:text-lg font-bold text-[#111827] mb-1">Your Scribe Program</h2>
          <p className="text-sm text-[#6B7280] mb-5">Tell us about your current setup</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputCard
                icon={<Users className="w-4 h-4 text-[#EA2C00]" />}
                iconBg="bg-[#FFF5F2]"
                label="Number of scribes"
                value={inputs.scribeCount}
                onChange={(v) => updateInput("scribeCount", v)}
                unit="scribes"
                placeholder="e.g. 5-50"
                hint="Typical: 5-100 scribes"
                testId="input-scribe-count"
              />

              <InputCard
                icon={<DollarSign className="w-4 h-4 text-[#EA2C00]" />}
                iconBg="bg-[#FFF5F2]"
                label="Cost per scribe"
                value={inputs.scribeCostPerHour}
                onChange={(v) => updateInput("scribeCostPerHour", v)}
                unit="$/hour"
                placeholder="e.g. 18-35"
                hint="Range: $15-$45/hr"
                testId="input-scribe-cost"
              />

              <InputCard
                icon={<Clock className="w-4 h-4 text-[#EA2C00]" />}
                iconBg="bg-[#FFF5F2]"
                label="Hours per week"
                value={inputs.scribeHoursPerWeek}
                onChange={(v) => updateInput("scribeHoursPerWeek", v)}
                unit="hrs/week"
                placeholder="e.g. 40"
                hint="Full-time: 40 hrs"
                testId="input-scribe-hours"
              />

              <InputCard
                icon={<UserCheck className="w-4 h-4 text-[#EA2C00]" />}
                iconBg="bg-[#FFF5F2]"
                label="Providers with scribes"
                value={inputs.providersWithScribes}
                onChange={(v) => updateInput("providersWithScribes", v)}
                unit="providers"
                placeholder="e.g. 10-30"
                hint="Currently supported"
                testId="input-providers-with-scribes"
              />

              <InputCard
                icon={<Building2 className="w-4 h-4 text-[#EA2C00]" />}
                iconBg="bg-[#FFF5F2]"
                label="Total providers"
                value={inputs.totalProviders}
                onChange={(v) => updateInput("totalProviders", v)}
                unit="providers"
                placeholder="e.g. 50-500"
                hint="All physicians & APPs"
                testId="input-total-providers"
              />

              <InputCard
                icon={<Calendar className="w-4 h-4 text-[#EA2C00]" />}
                iconBg="bg-[#FFF5F2]"
                label="Annual encounters"
                value={inputs.annualEncounters}
                onChange={(v) => updateInput("annualEncounters", v)}
                unit="per year"
                placeholder="e.g. 100K-1M"
                hint="Org-wide volume"
                testId="input-annual-encounters"
              />

              <InputCard
                icon={<FileEdit className="w-4 h-4 text-[#EA2C00]" />}
                iconBg="bg-[#FFF5F2]"
                label="Doc time per encounter"
                value={inputs.minutesPerEncounter}
                onChange={(v) => updateInput("minutesPerEncounter", v)}
                unit="minutes"
                placeholder="e.g. 8-15"
                hint="Without scribe support"
                testId="input-minutes-per-encounter"
              />

              <InputCard
                icon={<RefreshCw className="w-4 h-4 text-[#EA2C00]" />}
                iconBg="bg-[#FFF5F2]"
                label="Scribe turnover rate"
                value={inputs.turnoverRate}
                onChange={(v) => updateInput("turnoverRate", v)}
                unit="%/year"
                placeholder="e.g. 30-50"
                hint="Annual replacement rate"
                testId="input-turnover-rate"
              />

                          </div>

            <div className="lg:col-span-1">
              <div className="bg-[#FFF5F2] border border-[#EA2C00]/10 rounded-xl p-5 lg:sticky lg:top-24">
                <div className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-4">
                  Your Current State
                </div>
                
                <AnimatePresence mode="wait">
                  {hasBasicInfo ? (
                    <motion.div 
                      key="filled"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <div className="text-3xl font-bold text-[#111827]">{inputs.scribeCount}</div>
                        <div className="text-sm text-[#6B7280]">scribes employed</div>
                      </div>
                      
                      {hasCostInfo && (
                        <div className="border-t border-[#E2E8F0] pt-4">
                          <div className="text-2xl font-bold text-[#111827]">{formatCurrency(calculations.totalScribeCost)}</div>
                          <div className="text-sm text-[#6B7280]">annual investment</div>
                        </div>
                      )}
                      
                      {inputs.providersWithScribes > 0 && (
                        <div className="border-t border-[#E2E8F0] pt-4">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-[#111827]">{calculations.coveragePercent}%</span>
                            <span className="text-sm text-[#6B7280]">coverage</span>
                          </div>
                          <div className="text-xs text-[#9CA3AF] mt-1">
                            {inputs.providersWithScribes} of {inputs.totalProviders} providers supported
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-6"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center mx-auto mb-3">
                        <Lightbulb className="w-5 h-5 text-[#EA2C00]/50" />
                      </div>
                      <p className="text-sm text-[#9CA3AF]">
                        Enter your scribe program details to see your current state
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.section>

        <AnimatePresence>
          {hasBasicInfo && inputs.providersWithScribes > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-6 lg:p-8 mb-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-base md:text-lg font-bold text-[#111827]">The Coverage Gap</h2>
                {calculations.providersWithoutSupport > 0 && (
                  <span className="px-2 py-0.5 bg-[#FFF5F2] text-[#EA2C00] text-xs font-semibold rounded-full">
                    {calculations.providersWithoutSupport} providers without support
                  </span>
                )}
              </div>
              <p className="text-sm text-[#6B7280] mb-6">Where your documentation support falls short</p>

              <div className="mb-6">
                <div className="relative h-14 bg-[#F1F5F9] rounded-xl overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(calculations.coveragePercent, 2)}%` }}
                    transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="absolute top-0 left-0 h-full bg-black flex items-center"
                  />
                  {calculations.coveragePercent >= 15 && (
                    <span className="absolute top-1/2 -translate-y-1/2 left-4 text-sm font-semibold text-white z-10">
                      {inputs.providersWithScribes} with scribes
                    </span>
                  )}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
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

              {inputs.annualEncounters > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF5F2] flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-[#EA2C00]" />
                    </div>
                    <div>
                      <div className="font-semibold text-[#111827] mb-1">The documentation burden</div>
                      <p className="text-sm text-[#6B7280]">
                        {calculations.providersWithoutSupport} providers handling all documentation themselves
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 text-center cursor-help relative group">
                          <Info className="w-3.5 h-3.5 text-[#9CA3AF] absolute top-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                          <div className="flex justify-center mb-2">
                            <Timer className="w-5 h-5 text-[#EA2C00]" />
                          </div>
                          <div className="text-2xl font-bold text-[#111827]">
                            {calculations.unsupportedDocTimeHours.toLocaleString()}
                          </div>
                          <div className="text-xs text-[#6B7280] mb-1">hours/year documenting</div>
                          <div className="text-xs font-medium text-[#EA2C00]">
                            {Math.round(calculations.unsupportedDocTimeHours / 2080)} FTEs worth of time
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs p-3">
                        <div className="text-sm space-y-2">
                          <p className="font-semibold">How we calculate this:</p>
                          <p>{calculations.providersWithoutSupport} unsupported providers × {calculations.encountersPerProvider} encounters each × {inputs.minutesPerEncounter} min per encounter ÷ 60</p>
                          <p className="text-xs text-muted-foreground">Based on {inputs.minutesPerEncounter} minutes of documentation time per patient encounter without scribe support.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 text-center cursor-help relative group">
                          <Info className="w-3.5 h-3.5 text-[#9CA3AF] absolute top-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                          <div className="flex justify-center mb-2">
                            <Moon className="w-5 h-5 text-[#EA2C00]" />
                          </div>
                          <div className="text-2xl font-bold text-[#111827]">
                            {calculations.pajamaTimeHours.toLocaleString()}
                          </div>
                          <div className="text-xs text-[#6B7280] mb-1">hours/year after hours</div>
                          <div className="text-xs font-medium text-[#EA2C00]">
                            Work taken home
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs p-3">
                        <div className="text-sm space-y-2">
                          <p className="font-semibold">How we calculate this:</p>
                          <p>{calculations.unsupportedDocTimeHours.toLocaleString()} total doc hours × 25% = {calculations.pajamaTimeHours.toLocaleString()} hours</p>
                          <p className="text-xs text-muted-foreground">Research shows ~25% of documentation work happens outside clinic hours ("pajama time").</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 text-center cursor-help relative group">
                          <Info className="w-3.5 h-3.5 text-[#9CA3AF] absolute top-2 right-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                          <div className="flex justify-center mb-2">
                            <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
                          </div>
                          <div className="text-2xl font-bold text-[#111827]">
                            {calculations.docTimePerUnsupportedProvider}
                          </div>
                          <div className="text-xs text-[#6B7280] mb-1">hrs/year per provider</div>
                          <div className="text-xs font-medium text-[#EA2C00]">
                            {Math.round(calculations.docTimePerUnsupportedProvider / 40)} weeks of their year
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs p-3">
                        <div className="text-sm space-y-2">
                          <p className="font-semibold">How we calculate this:</p>
                          <p>{calculations.unsupportedDocTimeHours.toLocaleString()} total hours ÷ {calculations.providersWithoutSupport} providers = {calculations.docTimePerUnsupportedProvider} hours each</p>
                          <p className="text-xs text-muted-foreground">That's {Math.round(calculations.docTimePerUnsupportedProvider / 40)} full work weeks spent on documentation annually.</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hasFullInfo && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white rounded-xl border border-[#E5E7EB] p-4 md:p-6 lg:p-8 mb-6 shadow-sm"
            >
              <h2 className="text-base md:text-lg font-bold text-[#111827] mb-1">What Would It Take?</h2>
              <p className="text-sm text-[#6B7280] mb-6">The cost to give every provider scribe support</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
          )}
        </AnimatePresence>

        <AnimatePresence>
          {hasFullInfo && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-black rounded-xl p-6 md:p-8 mb-6 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-4 left-8 w-32 h-32 rounded-full border border-white" />
                <div className="absolute bottom-4 right-12 w-24 h-24 rounded-full border border-white" />
              </div>
              
              <div className="relative">
                <p className="text-slate-300 text-sm md:text-base mb-3">
                  Scaling your scribe program to full coverage would cost an additional
                </p>
                <div className="text-3xl md:text-4xl font-bold text-white mb-3">
                  {formatCurrency(calculations.costToScale)}/year
                </div>
                <p className="text-slate-400 text-sm md:text-base mb-6 max-w-lg mx-auto">
                  But what if you could give every provider documentation support—without adding {calculations.scribesNeededForFullCoverage - inputs.scribeCount} more scribes?
                </p>
                
                <Button
                  onClick={onNext}
                  className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full"
                  data-testid="button-see-full-analysis"
                >
                  See How
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {!hasFullInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#FFF5F2] border border-[#EA2C00]/10 rounded-xl p-6 text-center"
          >
            <div className="w-10 h-10 rounded-full bg-[#FFF5F2] flex items-center justify-center mx-auto mb-3">
              <Lightbulb className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <p className="text-[#6B7280] text-sm">
              Complete the inputs above to see your full analysis
            </p>
            <p className="text-[#9CA3AF] text-xs mt-1">
              We'll show your coverage gap, documentation burden, and scaling costs
            </p>
          </motion.div>
        )}
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
  placeholder?: string;
  hint?: string;
  testId: string;
}

function InputCard({ icon, iconBg = "bg-slate-100", label, value, onChange, unit, placeholder, hint, testId }: InputCardProps) {
  const [localValue, setLocalValue] = useState(value > 0 ? String(value) : "");
  const [isFocused, setIsFocused] = useState(false);

  const isEmpty = value === 0 && localValue === "";
  const displayValue = isFocused ? localValue : (value > 0 ? value.toLocaleString() : "");

  if (!isFocused && value > 0 && localValue !== String(value)) {
    setLocalValue(String(value));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/,/g, "");
    setLocalValue(inputValue);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else if (inputValue === "") {
      onChange(0);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localValue.replace(/,/g, ""));
    if (isNaN(parsed) || localValue === "" || parsed < 0) {
      setLocalValue("");
      onChange(0);
    } else {
      setLocalValue(String(parsed));
      onChange(parsed);
    }
  };

  return (
    <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 transition-all duration-200 hover:border-[#D1D5DB] hover:shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
          <label className="text-sm font-medium text-[#111827]">{label}</label>
        </div>
        {hint && isEmpty && (
          <span className="text-[10px] text-[#9CA3AF] font-medium">{hint}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          className="flex-1 px-3 py-2 text-base font-semibold border border-[#E5E7EB] rounded-lg focus:border-[#EA2C00] focus:ring-2 focus:ring-[#EA2C00]/10 outline-none bg-white transition-all duration-200 placeholder:text-[#C4C8CC] placeholder:font-normal"
          data-testid={testId}
        />
        <span className="text-xs text-[#9CA3AF] font-medium whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );
}
