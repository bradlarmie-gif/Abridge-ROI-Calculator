import { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
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

  const hasBasicInfo = inputs.scribeCount > 0 && inputs.totalProviders > 0;
  const hasCostInfo = inputs.scribeCostPerHour > 0 && inputs.scribeHoursPerWeek > 0;
  const hasFullInfo = hasBasicInfo && hasCostInfo && inputs.providersWithScribes > 0 && inputs.annualEncounters > 0;

  return (
    <div className="min-h-screen bg-white">
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
        {/* Header - smaller, wayfinding label */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-8"
        >
          <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px]">
            Scribe Program Analysis
          </p>
        </motion.div>

        {/* Section 2 & 3: Your Program (Inputs) + Your Program Today (Summary) */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mb-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Card - Warm Beige */}
            <div className="lg:col-span-2 bg-[#F5F0EB] rounded-xl p-6 md:p-8">
              <h2 className="text-lg font-semibold text-black mb-6">Your Scribe Program</h2>

              {/* All Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Number of scribes"
                  value={inputs.scribeCount}
                  onChange={(v) => updateInput("scribeCount", v)}
                  testId="input-scribe-count"
                />
                <InputField
                  label="Cost per scribe ($/hour)"
                  value={inputs.scribeCostPerHour}
                  onChange={(v) => updateInput("scribeCostPerHour", v)}
                  testId="input-scribe-cost"
                />
                <InputField
                  label="Providers with scribes"
                  value={inputs.providersWithScribes}
                  onChange={(v) => updateInput("providersWithScribes", v)}
                  testId="input-providers-with-scribes"
                />
                <InputField
                  label="Total providers"
                  value={inputs.totalProviders}
                  onChange={(v) => updateInput("totalProviders", v)}
                  testId="input-total-providers"
                />
                <InputField
                  label="Hours per scribe per week"
                  value={inputs.scribeHoursPerWeek}
                  onChange={(v) => updateInput("scribeHoursPerWeek", v)}
                  testId="input-scribe-hours"
                />
                <InputField
                  label="Annual encounters"
                  value={inputs.annualEncounters}
                  onChange={(v) => updateInput("annualEncounters", v)}
                  testId="input-annual-encounters"
                />
                <InputField
                  label="Doc time per encounter (min)"
                  value={inputs.minutesPerEncounter}
                  onChange={(v) => updateInput("minutesPerEncounter", v)}
                  testId="input-minutes-per-encounter"
                />
                <InputField
                  label="Scribe turnover rate (%)"
                  value={inputs.turnoverRate}
                  onChange={(v) => updateInput("turnoverRate", v)}
                  testId="input-turnover-rate"
                />
              </div>
            </div>

            {/* Your Program Today - White with red-orange left borders */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 lg:sticky lg:top-24 border border-[#E5E7EB]">
                <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-6">
                  Your Program Today
                </p>
                
                <AnimatePresence mode="wait">
                  {hasBasicInfo ? (
                    <motion.div 
                      key="filled"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
                        <div className="text-5xl font-bold text-black">{inputs.scribeCount}</div>
                        <div className="text-sm text-[#888888]">scribes employed</div>
                      </div>
                      
                      {hasCostInfo && (
                        <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
                          <div className="text-4xl font-bold text-black">{formatCurrency(calculations.totalScribeCost)}</div>
                          <div className="text-sm text-[#888888]">annual investment</div>
                        </div>
                      )}
                      
                      {inputs.providersWithScribes > 0 && (
                        <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
                          <div className="text-4xl font-bold text-black">{calculations.coveragePercent}%</div>
                          <div className="text-sm text-[#888888]">provider coverage</div>
                          <div className="text-xs text-[#888888] italic mt-1">
                            {inputs.providersWithScribes} of {inputs.totalProviders} providers
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
                      className="text-center py-8"
                    >
                      <p className="text-sm text-[#888888]">
                        Enter your scribe program details to see your current state
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Section 4: The Coverage Gap */}
        <AnimatePresence>
          {hasBasicInfo && inputs.providersWithScribes > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white rounded-xl p-6 md:p-8 mb-8 border border-[#E5E7EB]"
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                The Coverage Gap
              </p>
              <p className="text-sm text-[#6B7280] mb-6">
                Your program covers {inputs.providersWithScribes} providers. {calculations.providersWithoutSupport} are documenting on their own.
              </p>

              {/* Horizontal Bar Visualization */}
              <div className="relative h-12 rounded-lg overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(calculations.coveragePercent, 5)}%` }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="absolute top-0 left-0 h-full bg-black flex items-center justify-center"
                >
                  {calculations.coveragePercent >= 12 && (
                    <span className="text-xs font-medium text-white">
                      {inputs.providersWithScribes} with scribes
                    </span>
                  )}
                </motion.div>
                <div
                  className="absolute top-0 h-full bg-[#F5F0EB] flex items-center justify-center"
                  style={{
                    left: `${calculations.coveragePercent}%`,
                    width: `${100 - calculations.coveragePercent}%`,
                  }}
                >
                  <span className="text-xs font-medium text-[#6B7280]">
                    {calculations.providersWithoutSupport} without support
                  </span>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Section 5: The Documentation Burden */}
        <AnimatePresence>
          {hasBasicInfo && inputs.providersWithScribes > 0 && inputs.annualEncounters > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-[#F5F0EB] rounded-xl p-6 md:p-8 mb-8"
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                The Documentation Burden
              </p>
              <p className="text-sm text-[#6B7280] mb-6">
                {calculations.providersWithoutSupport} providers. No documentation support. Here's what that costs them.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
                  <div className="text-4xl font-bold text-black">
                    {calculations.unsupportedDocTimeHours.toLocaleString()}
                  </div>
                  <div className="text-xs font-medium text-[#888888] uppercase tracking-wide mt-1">
                    Hours/year documenting
                  </div>
                  <div className="text-xs text-[#888888] italic mt-1">
                    {Math.round(calculations.unsupportedDocTimeHours / 2080)} FTEs worth of time
                  </div>
                </div>

                <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
                  <div className="text-4xl font-bold text-black">
                    {calculations.pajamaTimeHours.toLocaleString()}
                  </div>
                  <div className="text-xs font-medium text-[#888888] uppercase tracking-wide mt-1">
                    Hours/year after hours
                  </div>
                  <div className="text-xs text-[#888888] italic mt-1">
                    Work taken home
                  </div>
                </div>

                <div className="border-l-[3px] border-l-[#EA2C00] pl-4">
                  <div className="text-4xl font-bold text-black">
                    {calculations.docTimePerUnsupportedProvider}
                  </div>
                  <div className="text-xs font-medium text-[#888888] uppercase tracking-wide mt-1">
                    Hours/year per provider
                  </div>
                  <div className="text-xs text-[#888888] italic mt-1">
                    {Math.round(calculations.docTimePerUnsupportedProvider / 40)} {Math.round(calculations.docTimePerUnsupportedProvider / 40) === 1 ? 'week' : 'weeks'} of their year
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Section 6: Scaling to Full Coverage */}
        <AnimatePresence>
          {hasFullInfo && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white rounded-xl p-6 md:p-8 mb-8 border border-[#E5E7EB]"
            >
              <p className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-2">
                Scaling to Full Coverage
              </p>
              <p className="text-sm text-[#6B7280] mb-6">
                What it would cost to cover every provider with scribes.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Today Card - White */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
                  <p className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-3">Today</p>
                  <div className="text-3xl font-bold text-black mb-1">{formatCurrency(calculations.totalScribeCost)}/year</div>
                  <div className="text-sm text-[#888888]">
                    {inputs.scribeCount} scribes · {calculations.coveragePercent}% coverage
                  </div>
                </div>

                {/* Full Coverage Card - Warm Beige */}
                <div className="bg-[#F5F0EB] rounded-xl p-5">
                  <p className="text-xs font-medium text-[#888888] uppercase tracking-wide mb-3">Full Coverage</p>
                  <div className="text-3xl font-bold text-black mb-1">{formatCurrency(calculations.fullScribeCost)}/year</div>
                  <div className="text-sm text-[#888888]">
                    {calculations.scribesNeededForFullCoverage} scribes · 100% coverage
                  </div>
                  <div className="text-sm font-semibold text-[#EA2C00] mt-2">
                    +{formatCurrency(calculations.costToScale)} additional
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Section 7: Transition CTA */}
        <AnimatePresence>
          {hasFullInfo && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-white rounded-xl p-8 md:p-12 text-center border border-[#E5E7EB]"
            >
              <p className="text-[#6B7280] text-base mb-2">
                Scaling your scribe program to full coverage would require an additional
              </p>
              <p className="text-3xl md:text-4xl font-bold text-black mb-4">
                {formatCurrency(calculations.costToScale)}/year
              </p>
              <p className="text-lg font-medium text-black mb-6">
                There's another way.
              </p>
              
              <Button
                onClick={onNext}
                className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full"
                data-testid="button-see-full-analysis"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.section>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

// Simple Input Field Component with comma formatting
function InputField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  testId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cursorRef = useRef<number>(0);

  const formatDisplay = (num: number): string => {
    if (num === 0) return "";
    return num.toLocaleString("en-US");
  };

  const parseFormatted = (str: string): number => {
    const cleaned = str.replace(/,/g, "").replace(/[^\d.-]/g, "");
    if (!cleaned) return 0;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatAsYouType = (input: string): string => {
    const cleaned = input.replace(/[^\d.]/g, "");
    const parts = cleaned.split(".");
    const integerPart = parts[0] || "";
    const decimalPart = parts[1];
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (decimalPart !== undefined) return `${formattedInteger}.${decimalPart}`;
    return formattedInteger;
  };

  const [displayValue, setDisplayValue] = useState(() => formatDisplay(value));

  useEffect(() => {
    const currentParsed = parseFormatted(displayValue);
    if (currentParsed !== value) {
      setDisplayValue(formatDisplay(value));
    }
  }, [value]);

  useEffect(() => {
    if (inputRef.current && document.activeElement === inputRef.current) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
    }
  }, [displayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawValue = input.value;
    const cursorPos = input.selectionStart || 0;
    const formatted = formatAsYouType(rawValue);
    const digitsBeforeCursor = rawValue.slice(0, cursorPos).replace(/[^\d.]/g, "").length;
    let newCursorPos = 0;
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ",") digitCount++;
      if (digitCount === digitsBeforeCursor) { newCursorPos = i + 1; break; }
    }
    if (digitCount < digitsBeforeCursor) newCursorPos = formatted.length;
    cursorRef.current = newCursorPos;
    setDisplayValue(formatted);
    onChange(parseFormatted(formatted));
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
      <label className="block text-xs text-[#888888] mb-2">{label}</label>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={(e) => setTimeout(() => e.target.select(), 0)}
        onBlur={() => setDisplayValue(formatDisplay(parseFormatted(displayValue)))}
        className="w-full text-right text-lg font-semibold text-black bg-transparent border-none focus:outline-none focus:ring-0"
        placeholder="0"
        data-testid={testId}
      />
    </div>
  );
}
