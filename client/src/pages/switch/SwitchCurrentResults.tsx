import { useMemo } from "react";
import { ArrowRight, ArrowLeft, BarChart3, Clock, DollarSign, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { ABRIDGE_BENCHMARKS, calculateSwitchGap, type SwitchInputs } from "@/lib/switchGapCalculator";

interface SwitchCurrentResultsProps {
  inputs: SwitchInputs;
  setInputs: (inputs: SwitchInputs) => void;
  onNext: () => void;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function SwitchCurrentResults({
  inputs,
  setInputs,
  onNext,
  onBack,
  onBackToJourney,
}: SwitchCurrentResultsProps) {
  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    setInputs({ ...inputs, [key]: value });
  };

  const calculations = useMemo(() => {
    return calculateSwitchGap({
      ...inputs,
      providers: inputs.providers || 50,
      annualEncounters: inputs.annualEncounters || 100000,
      currentCostPerProvider: inputs.currentCostPerProvider || 200,
    });
  }, [inputs]);

  const utilizationGap = ABRIDGE_BENCHMARKS.utilization - inputs.utilization;
  const efficiencyGap = ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter;

  const canProceed = inputs.utilization > 0 && inputs.timeSavedPerEncounter >= 0;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <GlobalHeader 
        pageName="Your Current Results" 
        currentStep={2} 
        totalSteps={3} 
        onLogoClick={onBackToJourney} 
      />

      <main className="max-w-4xl mx-auto px-6 pt-[96px] pb-10">
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

        <div className="mb-10">
          <h1 className="text-2xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            How is your current solution performing?
          </h1>
          <p className="text-[#6B7280]">
            Enter what you're seeing — we'll compare to Abridge benchmarks
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <p className="text-sm text-[#6B7280] mb-4">
              Select the metrics you can provide (more = better analysis)
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm">
                <input type="checkbox" checked disabled className="accent-[#EA2C00]" />
                <span className="text-xs font-medium text-[#EA2C00] bg-[#EA2C00]/10 px-1.5 py-0.5 rounded">Required</span>
                <span className="text-[#374151]">Utilization</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm">
                <input type="checkbox" checked disabled className="accent-[#EA2C00]" />
                <span className="text-xs font-medium text-[#EA2C00] bg-[#EA2C00]/10 px-1.5 py-0.5 rounded">Required</span>
                <span className="text-[#374151]">Time Savings</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm">
                <input 
                  type="checkbox" 
                  checked={inputs.hasWRVU}
                  onChange={(e) => updateInput("hasWRVU", e.target.checked)}
                  className="accent-[#EA2C00]"
                  data-testid="checkbox-wrvu"
                />
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Optional</span>
                <span className="text-[#374151]">wRVU / Revenue</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm">
                <input 
                  type="checkbox" 
                  checked={inputs.hasSatisfaction}
                  onChange={(e) => updateInput("hasSatisfaction", e.target.checked)}
                  className="accent-[#EA2C00]"
                  data-testid="checkbox-satisfaction"
                />
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">Optional</span>
                <span className="text-[#374151]">Satisfaction</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-[#111827]">Utilization</h4>
                <p className="text-sm text-[#6B7280]">
                  What % of encounters are documented with your current solution?
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold text-[#111827]">{inputs.utilization}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={inputs.utilization}
                onChange={(e) => updateInput("utilization", parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                data-testid="slider-utilization"
              />
              <div className="flex justify-between text-xs text-[#6B7280] mt-1">
                <span>10%</span>
                <span>90%</span>
              </div>
            </div>

            <div className="relative h-12 bg-slate-100 rounded-lg mt-6">
              <div 
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: `${inputs.utilization}%`, transform: "translateX(-50%)" }}
              >
                <div className="w-3 h-3 rounded-full bg-slate-600 border-2 border-white shadow" />
                <span className="text-xs text-slate-600 mt-1 whitespace-nowrap font-medium">
                  You: {inputs.utilization}%
                </span>
              </div>
              <div 
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: `${ABRIDGE_BENCHMARKS.utilization}%`, transform: "translateX(-50%)" }}
              >
                <div className="w-3 h-3 rounded-full bg-[#EA2C00] border-2 border-white shadow" />
                <span className="text-xs text-[#EA2C00] mt-1 whitespace-nowrap font-medium">
                  Abridge avg: {ABRIDGE_BENCHMARKS.utilization}%
                </span>
              </div>
            </div>

            {utilizationGap > 0 ? (
              <div className="mt-4 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                Gap: {utilizationGap}pp below Abridge average
              </div>
            ) : (
              <div className="mt-4 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                You're at or above Abridge average
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-[#111827]">Time Savings</h4>
                <p className="text-sm text-[#6B7280]">
                  How much time does your solution save per encounter?
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold text-[#111827]">{inputs.timeSavedPerEncounter} min</span>
              </div>
              <input
                type="range"
                min="0"
                max="6"
                step="0.5"
                value={inputs.timeSavedPerEncounter}
                onChange={(e) => updateInput("timeSavedPerEncounter", parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                data-testid="slider-time-savings"
              />
              <div className="flex justify-between text-xs text-[#6B7280] mt-1">
                <span>0 min</span>
                <span>6 min</span>
              </div>
            </div>

            <div className="relative h-12 bg-slate-100 rounded-lg mt-6">
              <div 
                className="absolute top-0 h-full flex flex-col items-center"
                style={{ left: `${(inputs.timeSavedPerEncounter / 6) * 100}%`, transform: "translateX(-50%)" }}
              >
                <div className="w-3 h-3 rounded-full bg-slate-600 border-2 border-white shadow" />
                <span className="text-xs text-slate-600 mt-1 whitespace-nowrap font-medium">
                  You: {inputs.timeSavedPerEncounter} min
                </span>
              </div>
              <div 
                className="absolute h-full flex items-start"
                style={{ left: `${(ABRIDGE_BENCHMARKS.timeSavedMin / 6) * 100}%`, width: `${((ABRIDGE_BENCHMARKS.timeSavedMax - ABRIDGE_BENCHMARKS.timeSavedMin) / 6) * 100}%` }}
              >
                <div className="w-full h-3 rounded-full bg-[#EA2C00]/30 mt-0" />
                <span className="absolute text-xs text-[#EA2C00] whitespace-nowrap font-medium" style={{ top: "16px", left: "50%", transform: "translateX(-50%)" }}>
                  Abridge: {ABRIDGE_BENCHMARKS.timeSavedMin}-{ABRIDGE_BENCHMARKS.timeSavedMax} min
                </span>
              </div>
            </div>
          </div>

          {inputs.hasWRVU && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#111827]">wRVU Capture</h4>
                  <p className="text-sm text-[#6B7280]">
                    Have you seen any change in wRVU per encounter?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-sm text-[#6B7280] mb-2">Before your current solution</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={inputs.wrvuBefore || ""}
                      onChange={(e) => updateInput("wrvuBefore", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="1.80"
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
                      data-testid="input-wrvu-before"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280]">wRVU/enc</span>
                  </div>
                </div>
                <div className="text-center text-2xl text-[#6B7280]">→</div>
                <div>
                  <label className="block text-sm text-[#6B7280] mb-2">Current</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={inputs.wrvuAfter || ""}
                      onChange={(e) => updateInput("wrvuAfter", e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="1.85"
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:border-[#EA2C00] focus:ring-1 focus:ring-[#EA2C00] outline-none"
                      data-testid="input-wrvu-after"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B7280]">wRVU/enc</span>
                  </div>
                </div>
              </div>

              {inputs.wrvuBefore && inputs.wrvuAfter && (
                <div className="mt-4">
                  {(() => {
                    const change = inputs.wrvuAfter - inputs.wrvuBefore;
                    const changePercent = ((change / inputs.wrvuBefore) * 100).toFixed(1);
                    return (
                      <span className={`text-sm font-medium ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {change >= 0 ? "+" : ""}{change.toFixed(2)} ({changePercent}%)
                      </span>
                    );
                  })()}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-sm text-[#6B7280] bg-slate-50 px-3 py-2 rounded-lg">
                <BarChart3 className="w-4 h-4" />
                <span>Abridge customers typically see {ABRIDGE_BENCHMARKS.wrvuLiftMin}-{ABRIDGE_BENCHMARKS.wrvuLiftMax}% wRVU lift</span>
              </div>
            </div>
          )}

          {inputs.hasSatisfaction && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Smile className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#111827]">Clinician Satisfaction</h4>
                  <p className="text-sm text-[#6B7280]">
                    What's your provider satisfaction with the current solution?
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold text-[#111827]">{inputs.satisfactionScore || 0}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={inputs.satisfactionScore || 0}
                  onChange={(e) => updateInput("satisfactionScore", parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#EA2C00]"
                  data-testid="slider-satisfaction"
                />
                <div className="flex justify-between text-xs text-[#6B7280] mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-xl p-6 text-white">
            <h4 className="text-sm font-semibold text-slate-400 mb-4">THE GAP (Live Preview)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-2">YOU</div>
                <div className="text-2xl font-bold">{calculations.yourEncountersDocumented.toLocaleString()}</div>
                <div className="text-xs text-slate-400">encounters documented</div>
                <div className="text-xl font-bold mt-3">{calculations.yourHoursReturned.toLocaleString()}</div>
                <div className="text-xs text-slate-400">hours returned</div>
              </div>
              <div className="flex flex-col items-center justify-center text-emerald-400">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-semibold">+{calculations.encounterGap.toLocaleString()}</span>
                  <span>→</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-lg font-semibold">+{calculations.hoursGap.toLocaleString()}</span>
                  <span>→</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[#EA2C00] mb-2 flex items-center justify-center gap-1">
                  <span className="w-4 h-4 rounded bg-[#EA2C00] text-white text-[10px] flex items-center justify-center font-bold">A</span>
                  ABRIDGE
                </div>
                <div className="text-2xl font-bold">{calculations.abridgeEncountersDocumented.toLocaleString()}</div>
                <div className="text-xs text-slate-400">encounters documented</div>
                <div className="text-xl font-bold mt-3">{calculations.abridgeHoursReturned.toLocaleString()}</div>
                <div className="text-xs text-slate-400">hours returned</div>
              </div>
            </div>
            <div className="text-center text-xs text-slate-500 mt-4">
              Based on {inputs.providers || 50} providers at ~{Math.round((inputs.annualEncounters || 100000) / (inputs.providers || 50)).toLocaleString()} encounters/provider/year
            </div>
          </div>
        </div>

        <div className="mt-12 flex justify-end">
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className="bg-[#EA2C00] hover:bg-[#d12700] text-white px-8 h-11"
            data-testid="button-continue"
          >
            See Your Gap Analysis
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}
