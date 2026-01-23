import { useMemo } from "react";
import { ArrowLeft, Download, Share2, Calendar, BarChart3, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, Legend } from "recharts";
import { 
  calculateSwitchGap, 
  formatCurrency, 
  ABRIDGE_BENCHMARKS, 
  VALUE_ASSUMPTIONS,
  type SwitchInputs 
} from "@/lib/switchGapCalculator";

interface SwitchFullAnalysisProps {
  inputs: SwitchInputs;
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function SwitchFullAnalysis({
  inputs,
  onBack,
  onBackToJourney,
}: SwitchFullAnalysisProps) {
  const calculations = useMemo(() => {
    return calculateSwitchGap({
      ...inputs,
      providers: inputs.providers || 75,
      annualEncounters: inputs.annualEncounters || 150000,
      currentCostPerProvider: inputs.currentCostPerProvider || 200,
    });
  }, [inputs]);

  const solutionLabel = inputs.solution === "ambient-ai" ? "Ambient AI" : "Human Scribes";

  const graphData = useMemo(() => {
    const points = [
      { month: "Today", current: 0, abridge: 0 },
      { month: "6 mo", current: calculations.yourAnnualValue / 2, abridge: calculations.abridgeAnnualValue * 0.4 },
      { month: "Year 1", current: calculations.yourAnnualValue, abridge: calculations.abridgeAnnualValue * 0.9 },
      { month: "Year 2", current: calculations.yourAnnualValue * 2, abridge: calculations.abridgeAnnualValue * 1.9 },
      { month: "Year 3", current: calculations.yourAnnualValue * 3, abridge: calculations.abridgeAnnualValue * 2.9 },
    ];
    return points;
  }, [calculations]);

  const utilizationGapEncounters = calculations.encounterGap;
  const encountersAtBenchmark = Math.round((inputs.annualEncounters || 150000) * (ABRIDGE_BENCHMARKS.utilization / 100));

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <GlobalHeader 
        pageName="Gap Analysis" 
        currentStep={2} 
        totalSteps={2} 
        onLogoClick={onBackToJourney} 
      />

      <main className="max-w-5xl mx-auto px-6 pt-[96px] pb-16">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-500 flex items-center gap-1 mb-6 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to assessment
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111827] mb-2" data-testid="text-page-title">
            Your Gap Analysis
          </h1>
          <p className="text-[#6B7280]">
            {inputs.providers || 75} providers · {(inputs.annualEncounters || 150000).toLocaleString()} encounters · Using {solutionLabel}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center" data-testid="card-annual-gap">
            <div className="text-xs font-semibold text-[#6B7280] mb-2">ANNUAL GAP</div>
            <div className="text-3xl font-bold text-[#111827]">{formatCurrency(calculations.annualGap)}</div>
            <div className="text-xs text-[#6B7280] mt-1">unrealized value</div>
          </div>

          <div className="bg-[#EA2C00] rounded-xl p-6 text-center text-white" data-testid="card-capture-rate">
            <div className="text-xs font-semibold text-white/80 mb-2">CAPTURE RATE</div>
            <div className="text-3xl font-bold">{calculations.combinedCapture}%</div>
            <div className="text-xs text-white/80 mt-1">of potential</div>
            <div className="w-full h-2 bg-white/30 rounded-full mt-3">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${calculations.combinedCapture}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center" data-testid="card-3year-gap">
            <div className="text-xs font-semibold text-[#6B7280] mb-2">3-YEAR GAP</div>
            <div className="text-3xl font-bold text-[#111827]">{formatCurrency(calculations.threeYearGap)}</div>
            <div className="text-xs text-[#6B7280] mt-1">cumulative</div>
          </div>
        </div>

        <section className="bg-white rounded-xl border border-slate-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-[#111827] mb-2">The Cost of the Gap Over Time</h2>
          <p className="text-[#6B7280] mb-6">
            Cumulative value if you stay at current performance vs. close the gap
          </p>

          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6B7280" }} />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)} 
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="abridge" 
                  stroke="none"
                  fill="#f1f5f9"
                  fillOpacity={1}
                  name="Gap (unrealized value)"
                />
                <Line 
                  type="monotone" 
                  dataKey="abridge" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                  name="Close the gap"
                />
                <Line 
                  type="monotone" 
                  dataKey="current" 
                  stroke="#6B7280" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "#6B7280", strokeWidth: 2, r: 4 }}
                  name="Stay at current performance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-2xl text-slate-400">↕</span>
            <span className="text-2xl font-bold text-[#111827]">{formatCurrency(calculations.threeYearGap)}</span>
            <span className="text-[#6B7280]">3-year gap</span>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-[#111827] mb-6">How the Gap Breaks Down</h2>

          <div className="space-y-6">
            {calculations.utilizationGapValue > 0 && (
              <div className="border border-slate-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-[#111827]">Utilization Gap</span>
                  </div>
                  <span className="text-xl font-bold text-[#111827]">
                    {formatCurrency(calculations.utilizationGapValue)}
                  </span>
                </div>
                
                <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden mb-3">
                  <div 
                    className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-2"
                    style={{ width: `${(inputs.utilization / ABRIDGE_BENCHMARKS.utilization) * 100}%` }}
                  >
                    <span className="text-xs font-semibold text-white truncate">You: {inputs.utilization}%</span>
                  </div>
                  <div 
                    className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
                    style={{ 
                      left: `${(inputs.utilization / ABRIDGE_BENCHMARKS.utilization) * 100}%`,
                      width: `${100 - (inputs.utilization / ABRIDGE_BENCHMARKS.utilization) * 100}%`
                    }}
                  >
                    <span className="text-xs font-semibold text-slate-600">Gap</span>
                  </div>
                  <div className="absolute top-0 right-0 h-full flex items-center px-2">
                    <span className="text-xs font-semibold text-[#EA2C00]">Abridge: {ABRIDGE_BENCHMARKS.utilization}%</span>
                  </div>
                </div>
                
                <div className="text-xs text-[#6B7280] font-mono bg-slate-50 p-2 rounded">
                  {inputs.utilization}% → {ABRIDGE_BENCHMARKS.utilization}% = +{ABRIDGE_BENCHMARKS.utilization - inputs.utilization}pp = +{utilizationGapEncounters.toLocaleString()} encounters × ${VALUE_ASSUMPTIONS.encounterValue}/enc
                </div>
              </div>
            )}

            {calculations.efficiencyGapValue > 0 && (
              <div className="border border-slate-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-[#111827]">Efficiency Gap</span>
                  </div>
                  <span className="text-xl font-bold text-[#111827]">
                    {formatCurrency(calculations.efficiencyGapValue)}
                  </span>
                </div>
                
                <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden mb-3">
                  <div 
                    className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-2"
                    style={{ width: `${(inputs.timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100}%` }}
                  >
                    <span className="text-xs font-semibold text-white truncate">You: {inputs.timeSavedPerEncounter} min</span>
                  </div>
                  <div 
                    className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
                    style={{ 
                      left: `${(inputs.timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100}%`,
                      width: `${100 - (inputs.timeSavedPerEncounter / ABRIDGE_BENCHMARKS.timeSavedAvg) * 100}%`
                    }}
                  >
                    <span className="text-xs font-semibold text-slate-600">Gap</span>
                  </div>
                  <div className="absolute top-0 right-0 h-full flex items-center px-2">
                    <span className="text-xs font-semibold text-[#EA2C00]">Abridge: {ABRIDGE_BENCHMARKS.timeSavedAvg} min</span>
                  </div>
                </div>
                
                <div className="text-xs text-[#6B7280] font-mono bg-slate-50 p-2 rounded">
                  {inputs.timeSavedPerEncounter} min → {ABRIDGE_BENCHMARKS.timeSavedAvg} min = +{(ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter).toFixed(1)} min × {encountersAtBenchmark.toLocaleString()} enc ÷ 60 × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.timeConversionRate * 100}%
                </div>
              </div>
            )}

            {calculations.wrvuGapValue > 0 && (
              <div className="border border-slate-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-[#111827]">Revenue Capture Gap</span>
                  </div>
                  <span className="text-xl font-bold text-[#111827]">
                    {formatCurrency(calculations.wrvuGapValue)}
                  </span>
                </div>
                
                <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden mb-3">
                  <div 
                    className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-2"
                    style={{ width: `${(inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100}%` }}
                  >
                    <span className="text-xs font-semibold text-white truncate">You: +{inputs.wrvuLift}%</span>
                  </div>
                  <div 
                    className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
                    style={{ 
                      left: `${(inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100}%`,
                      width: `${100 - (inputs.wrvuLift / ABRIDGE_BENCHMARKS.wrvuLift) * 100}%`
                    }}
                  >
                    <span className="text-xs font-semibold text-slate-600">Gap</span>
                  </div>
                  <div className="absolute top-0 right-0 h-full flex items-center px-2">
                    <span className="text-xs font-semibold text-[#EA2C00]">Abridge: +{ABRIDGE_BENCHMARKS.wrvuLift}%</span>
                  </div>
                </div>
                
                <div className="text-xs text-[#6B7280] font-mono bg-slate-50 p-2 rounded">
                  +{inputs.wrvuLift}% → +{ABRIDGE_BENCHMARKS.wrvuLift}% = {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% gap × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {encountersAtBenchmark.toLocaleString()} enc
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 text-white mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">💡</span> Why Small Gaps Compound
          </h3>
          
          <p className="text-slate-300 mb-4">
            Ambient AI value is <strong className="text-white">multiplicative</strong>. 
            Small differences in each dimension compound:
          </p>
          
          <div className="bg-slate-700/50 rounded-lg p-4 mb-4 text-center font-mono">
            Utilization × Efficiency × Revenue = Total Value
          </div>
          
          <div className="flex items-center justify-center gap-3 text-lg mb-4">
            <span className="font-bold">{calculations.utilizationCapture}%</span>
            <span className="text-slate-400">×</span>
            <span className="font-bold">{calculations.efficiencyCapture}%</span>
            <span className="text-slate-400">×</span>
            <span className="font-bold">{calculations.wrvuCapture}%</span>
            <span className="text-slate-400">=</span>
            <span className="font-bold text-[#EA2C00]">{calculations.combinedCapture}% captured</span>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-8 mb-8">
          <h2 className="text-xl font-bold text-[#111827] mb-2">The Cost of Waiting</h2>
          <p className="text-[#6B7280] mb-6">Every month at current performance = unrealized value</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border-2 border-emerald-500 rounded-xl p-6 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
                RECOMMENDED
              </div>
              <div className="text-sm font-medium text-[#6B7280] mb-2">Close the gap now</div>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(calculations.threeYearGap)}</div>
              <div className="text-xs text-[#6B7280] mt-1">3-year value captured</div>
            </div>

            <div className="border border-slate-200 rounded-xl p-6 text-center">
              <div className="text-sm font-medium text-[#6B7280] mb-2">Wait 6 months</div>
              <div className="text-2xl font-bold text-[#111827]">{formatCurrency(calculations.wait6MonthsValue)}</div>
              <div className="text-xs text-[#6B7280] mt-1">3-year value</div>
              <div className="text-xs text-slate-500 font-medium mt-2">Lost: {formatCurrency(calculations.wait6MonthsLoss)}</div>
            </div>

            <div className="border border-slate-200 rounded-xl p-6 text-center">
              <div className="text-sm font-medium text-[#6B7280] mb-2">Wait 12 months</div>
              <div className="text-2xl font-bold text-[#111827]">{formatCurrency(calculations.wait12MonthsValue)}</div>
              <div className="text-xs text-[#6B7280] mt-1">3-year value</div>
              <div className="text-xs text-slate-500 font-medium mt-2">Lost: {formatCurrency(calculations.wait12MonthsLoss)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-2xl">⏰</span>
            <span className="text-[#111827]">
              Every month at current state = <strong>{formatCurrency(calculations.monthlyGap)}</strong> in unrealized value
            </span>
          </div>
        </section>

        <section className="bg-slate-50 rounded-xl border border-slate-200 p-8 mb-8">
          <h3 className="text-lg font-semibold text-[#111827] mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Methodology
          </h3>

          <ul className="space-y-3 text-sm text-[#6B7280]">
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">Utilization benchmark: {ABRIDGE_BENCHMARKS.utilization}%</strong> — Abridge average across deployments</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">Efficiency benchmark: {ABRIDGE_BENCHMARKS.timeSavedAvg} min/encounter</strong> — Abridge average time saved</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">wRVU lift benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}%</strong> — Abridge average revenue lift</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">Utilization gap</strong> valued at ${VALUE_ASSUMPTIONS.encounterValue}/encounter</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">Efficiency gap</strong> valued at ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.timeConversionRate * 100}% conversion (conservative)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">wRVU gap</strong> valued at ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution</span>
            </li>
          </ul>

          <p className="mt-4 text-xs text-slate-500 italic">
            Conservative estimates. Actual value may vary based on specialty mix and payer contracts.
          </p>
        </section>

        <section className="bg-white rounded-xl border-2 border-[#EA2C00] p-8">
          <h3 className="text-xl font-bold text-[#111827] mb-6 text-center">Ready to close the gap?</h3>

          <div className="flex flex-wrap gap-4 justify-center">
            <Button className="bg-[#EA2C00] hover:bg-[#d12700] text-white h-12 px-6" data-testid="button-schedule-demo">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule a Demo
            </Button>
            <Button variant="outline" className="h-12 px-6" data-testid="button-export-pdf">
              <Download className="w-4 h-4 mr-2" />
              Export as PDF
            </Button>
            <Button variant="outline" className="h-12 px-6" data-testid="button-share">
              <Share2 className="w-4 h-4 mr-2" />
              Share with Team
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
