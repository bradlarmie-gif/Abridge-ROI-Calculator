import { useMemo, useState } from "react";
import { ArrowLeft, Download, Share2, Calendar, BarChart3, Clock, DollarSign, Smile, ChevronRight, ChevronDown, Info } from "lucide-react";
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
            {inputs.providers || 75} providers · {(inputs.annualEncounters || 150000).toLocaleString()} encounters · {solutionLabel}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center" data-testid="card-annual-gap">
            <div className="text-xs font-semibold text-[#6B7280] mb-2">ANNUAL GAP</div>
            <div className="text-3xl font-bold text-[#111827]">{formatCurrency(calculations.annualGap)}</div>
            <div className="text-xs text-[#6B7280] mt-1">unrealized value</div>
          </div>

          <div className="bg-[#EA2C00] rounded-xl p-6 text-center text-white" data-testid="card-realization-score">
            <div className="text-xs font-semibold text-white/80 mb-2">REALIZATION SCORE</div>
            <div className="text-3xl font-bold">{calculations.realizationScore}%</div>
            <div className="text-xs text-white/80 mt-1">of potential</div>
            <div className="w-full h-2 bg-white/30 rounded-full mt-3">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${calculations.realizationScore}%` }}
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
            Cumulative value if you stay at current performance vs. reach Abridge benchmarks
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
                  name="Reach Abridge benchmarks"
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
              <UtilizationGapCard 
                utilization={inputs.utilization}
                encounters={inputs.annualEncounters || 150000}
                gapEncounters={calculations.encounterGap}
                gapValue={calculations.utilizationGapValue}
              />
            )}

            {calculations.efficiencyGapValue > 0 && (
              <EfficiencyGapCard 
                efficiency={inputs.timeSavedPerEncounter}
                encountersAtBenchmark={encountersAtBenchmark}
                gapHours={calculations.efficiencyGapHours}
                gapValue={calculations.efficiencyGapValue}
              />
            )}

            {calculations.wrvuGapValue > 0 && (
              <QualityGapCard 
                wrvuLift={inputs.wrvuLift}
                encountersAtBenchmark={encountersAtBenchmark}
                gapValue={calculations.wrvuGapValue}
              />
            )}
          </div>
        </section>

        <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-8 text-white mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-xl">💡</span> How Your Score is Calculated
          </h3>
          
          <p className="text-slate-300 mb-4">
            Each dimension contributes to your overall value realization score based on strategic importance:
          </p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-2">
              <span className="text-slate-300">Utilization</span>
              <div className="flex items-center gap-3">
                <span className="font-bold">{calculations.utilizationScore}%</span>
                <span className="text-slate-400">× 30%</span>
                <span className="text-emerald-400 font-semibold">= {Math.round(calculations.utilizationScore * 0.30)}pts</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-2">
              <span className="text-slate-300">Efficiency</span>
              <div className="flex items-center gap-3">
                <span className="font-bold">{calculations.efficiencyScore}%</span>
                <span className="text-slate-400">× 30%</span>
                <span className="text-emerald-400 font-semibold">= {Math.round(calculations.efficiencyScore * 0.30)}pts</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-2">
              <span className="text-slate-300">Quality</span>
              <div className="flex items-center gap-3">
                <span className="font-bold">{calculations.qualityScore}%</span>
                <span className="text-slate-400">× 25%</span>
                <span className="text-emerald-400 font-semibold">= {Math.round(calculations.qualityScore * 0.25)}pts</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-2">
              <span className="text-slate-300">Satisfaction</span>
              <div className="flex items-center gap-3">
                <span className="font-bold">{calculations.satisfactionScore}%</span>
                <span className="text-slate-400">× 15%</span>
                <span className="text-emerald-400 font-semibold">= {Math.round(calculations.satisfactionScore * 0.15)}pts</span>
              </div>
            </div>
            <div className="flex items-center justify-between bg-emerald-600/30 border border-emerald-500/50 rounded-lg px-4 py-2">
              <span className="font-semibold">Total Score</span>
              <span className="text-xl font-bold text-emerald-400">{calculations.realizationScore}%</span>
            </div>
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
              <span><strong className="text-[#111827]">Quality benchmark: +{ABRIDGE_BENCHMARKS.wrvuLift}% wRVU lift</strong> — Abridge average revenue improvement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span><strong className="text-[#111827]">Satisfaction benchmark: {ABRIDGE_BENCHMARKS.satisfaction}%</strong> — Abridge average provider recommendation rate</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span>Utilization gap valued at <strong className="text-[#111827]">${VALUE_ASSUMPTIONS.encounterValue}/encounter</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span>Efficiency gap valued at <strong className="text-[#111827]">${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.timeConversionRate * 100}%</strong> conversion (conservative)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-slate-400">•</span>
              <span>Quality gap valued at <strong className="text-[#111827]">${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}%</strong> attribution</span>
            </li>
          </ul>

          <p className="mt-4 text-xs text-slate-500 italic">
            Conservative estimates based on aggregate data from 200+ health system partners.
          </p>
        </section>

        <section className="bg-white rounded-xl border-2 border-[#EA2C00] p-8">
          <div className="flex flex-wrap gap-4 justify-center">
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

function CalcStep({ number, label, math, note, isResult = false }: {
  number: string | number;
  label: string;
  math: React.ReactNode;
  note?: string;
  isResult?: boolean;
}) {
  return (
    <div className={`flex gap-3 ${isResult ? 'mt-3 pt-3 border-t border-slate-200' : ''}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
        isResult ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
      }`}>
        {number}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-[#6B7280]">{label}</span>
        <span className={`font-mono ${isResult ? 'text-base font-semibold' : 'text-sm'} text-[#111827]`}>
          {math}
        </span>
        {note && <span className="text-xs text-slate-400 italic">{note}</span>}
      </div>
    </div>
  );
}

function UtilizationGapCard({ utilization, encounters, gapEncounters, gapValue }: {
  utilization: number;
  encounters: number;
  gapEncounters: number;
  gapValue: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const benchmark = ABRIDGE_BENCHMARKS.utilization;
  const gapPP = benchmark - utilization;

  return (
    <div className="border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-[#111827]">Utilization Gap</span>
        </div>
        <span className="text-xl font-bold text-[#111827]">
          {formatCurrency(gapValue)}
        </span>
      </div>
      
      <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden mb-3">
        <div 
          className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-2"
          style={{ width: `${(utilization / benchmark) * 100}%` }}
        >
          <span className="text-xs font-semibold text-white truncate">You: {utilization}%</span>
        </div>
        <div 
          className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
          style={{ 
            left: `${(utilization / benchmark) * 100}%`,
            width: `${Math.max(0, 100 - (utilization / benchmark) * 100)}%`
          }}
        >
          <span className="text-xs font-semibold text-slate-600">Gap</span>
        </div>
        <div className="absolute top-0 right-0 h-full flex items-center px-2">
          <span className="text-xs font-semibold text-[#EA2C00]">Abridge: {benchmark}%</span>
        </div>
      </div>
      
      <div className="text-xs text-[#6B7280] font-mono bg-slate-50 p-2 rounded mb-2">
        {utilization}% → {benchmark}% = +{gapPP}pp = +{gapEncounters.toLocaleString()} enc × ${VALUE_ASSUMPTIONS.encounterValue}/enc
      </div>

      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EA2C00] transition-colors"
        data-testid="button-expand-utilization"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>{expanded ? 'Hide calculation' : 'How we calculated this'}</span>
      </button>

      {expanded && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
          <CalcStep 
            number={1}
            label="Your utilization gap"
            math={<>{benchmark}% - {utilization}% = <strong className="text-[#EA2C00]">{gapPP}pp</strong></>}
            note="pp = percentage points"
          />
          <CalcStep 
            number={2}
            label="Encounters not being documented"
            math={<>{encounters.toLocaleString()} total × {gapPP}% = <strong className="text-[#EA2C00]">{gapEncounters.toLocaleString()} encounters</strong></>}
          />
          <CalcStep 
            number={3}
            label="Value per undocumented encounter"
            math={<strong className="text-[#EA2C00]">${VALUE_ASSUMPTIONS.encounterValue}/encounter</strong>}
            note="Based on time cost + documentation quality value"
          />
          <CalcStep 
            number="✓"
            label="Annual utilization gap"
            math={<>{gapEncounters.toLocaleString()} enc × ${VALUE_ASSUMPTIONS.encounterValue} = <strong className="text-[#EA2C00]">${gapValue.toLocaleString()}</strong></>}
            isResult
          />
        </div>
      )}
    </div>
  );
}

function EfficiencyGapCard({ efficiency, encountersAtBenchmark, gapHours, gapValue }: {
  efficiency: number;
  encountersAtBenchmark: number;
  gapHours: number;
  gapValue: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const benchmark = ABRIDGE_BENCHMARKS.timeSavedAvg;
  const gapMin = benchmark - efficiency;

  return (
    <div className="border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-[#111827]">Efficiency Gap</span>
        </div>
        <span className="text-xl font-bold text-[#111827]">
          {formatCurrency(gapValue)}
        </span>
      </div>
      
      <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden mb-3">
        <div 
          className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-2"
          style={{ width: `${(efficiency / benchmark) * 100}%` }}
        >
          <span className="text-xs font-semibold text-white truncate">You: {efficiency} min</span>
        </div>
        <div 
          className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
          style={{ 
            left: `${(efficiency / benchmark) * 100}%`,
            width: `${Math.max(0, 100 - (efficiency / benchmark) * 100)}%`
          }}
        >
          <span className="text-xs font-semibold text-slate-600">Gap</span>
        </div>
        <div className="absolute top-0 right-0 h-full flex items-center px-2">
          <span className="text-xs font-semibold text-[#EA2C00]">Abridge: {benchmark} min</span>
        </div>
      </div>
      
      <div className="text-xs text-[#6B7280] font-mono bg-slate-50 p-2 rounded mb-2">
        {efficiency} min → {benchmark} min = +{gapMin.toFixed(1)} min × {encountersAtBenchmark.toLocaleString()} enc ÷ 60 × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.timeConversionRate * 100}%
      </div>

      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EA2C00] transition-colors"
        data-testid="button-expand-efficiency"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>{expanded ? 'Hide calculation' : 'How we calculated this'}</span>
      </button>

      {expanded && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
          <CalcStep 
            number={1}
            label="Your efficiency gap"
            math={<>{benchmark} min - {efficiency} min = <strong className="text-[#EA2C00]">{gapMin.toFixed(1)} min/encounter</strong></>}
          />
          <CalcStep 
            number={2}
            label="Encounters at Abridge utilization"
            math={<strong className="text-[#EA2C00]">{encountersAtBenchmark.toLocaleString()} encounters</strong>}
            note="Using 75% utilization benchmark"
          />
          <CalcStep 
            number={3}
            label="Total time gap"
            math={<>{gapMin.toFixed(1)} min × {encountersAtBenchmark.toLocaleString()} enc ÷ 60 = <strong className="text-[#EA2C00]">{gapHours.toLocaleString()} hours/year</strong></>}
          />
          <CalcStep 
            number={4}
            label="Value of provider time"
            math={<strong className="text-[#EA2C00]">${VALUE_ASSUMPTIONS.hourlyRate}/hour</strong>}
            note="Fully-loaded provider cost"
          />
          <CalcStep 
            number={5}
            label="Conversion rate"
            math={<strong className="text-[#EA2C00]">{VALUE_ASSUMPTIONS.timeConversionRate * 100}%</strong>}
            note="Conservative estimate — not all saved time converts to value"
          />
          <CalcStep 
            number="✓"
            label="Annual efficiency gap"
            math={<>{gapHours.toLocaleString()} hrs × ${VALUE_ASSUMPTIONS.hourlyRate} × {VALUE_ASSUMPTIONS.timeConversionRate * 100}% = <strong className="text-[#EA2C00]">${gapValue.toLocaleString()}</strong></>}
            isResult
          />
        </div>
      )}
    </div>
  );
}

function QualityGapCard({ wrvuLift, encountersAtBenchmark, gapValue }: {
  wrvuLift: number;
  encountersAtBenchmark: number;
  gapValue: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const benchmark = ABRIDGE_BENCHMARKS.wrvuLift;
  const gapPercent = benchmark - wrvuLift;

  return (
    <div className="border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-[#111827]">Quality Gap</span>
        </div>
        <span className="text-xl font-bold text-[#111827]">
          {formatCurrency(gapValue)}
        </span>
      </div>
      
      <div className="relative h-8 bg-slate-100 rounded-lg overflow-hidden mb-3">
        <div 
          className="absolute top-0 left-0 h-full bg-slate-500 flex items-center px-2"
          style={{ width: `${(wrvuLift / benchmark) * 100}%` }}
        >
          <span className="text-xs font-semibold text-white truncate">You: +{wrvuLift}%</span>
        </div>
        <div 
          className="absolute top-0 h-full bg-slate-300/50 flex items-center justify-center"
          style={{ 
            left: `${(wrvuLift / benchmark) * 100}%`,
            width: `${Math.max(0, 100 - (wrvuLift / benchmark) * 100)}%`
          }}
        >
          <span className="text-xs font-semibold text-slate-600">Gap</span>
        </div>
        <div className="absolute top-0 right-0 h-full flex items-center px-2">
          <span className="text-xs font-semibold text-[#EA2C00]">Abridge: +{benchmark}%</span>
        </div>
      </div>
      
      <div className="text-xs text-[#6B7280] font-mono bg-slate-50 p-2 rounded mb-2">
        +{wrvuLift}% → +{benchmark}% = +{gapPercent.toFixed(1)}% gap × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {encountersAtBenchmark.toLocaleString()} enc × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}%
      </div>

      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#EA2C00] transition-colors"
        data-testid="button-expand-quality"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span>{expanded ? 'Hide calculation' : 'How we calculated this'}</span>
      </button>

      {expanded && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
          <CalcStep 
            number={1}
            label="Your wRVU lift gap"
            math={<>+{benchmark}% - +{wrvuLift}% = <strong className="text-[#EA2C00]">+{gapPercent.toFixed(1)}% gap</strong></>}
          />
          <CalcStep 
            number={2}
            label="Value per wRVU"
            math={<strong className="text-[#EA2C00]">${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU</strong>}
            note="Medicare blended conversion factor"
          />
          <CalcStep 
            number={3}
            label="Encounters at Abridge utilization"
            math={<strong className="text-[#EA2C00]">{encountersAtBenchmark.toLocaleString()} encounters</strong>}
          />
          <CalcStep 
            number={4}
            label="Attribution rate"
            math={<strong className="text-[#EA2C00]">{VALUE_ASSUMPTIONS.wrvuAttribution * 100}%</strong>}
            note="Conservative — other factors affect wRVU"
          />
          <CalcStep 
            number="✓"
            label="Annual quality gap"
            math={<>{gapPercent.toFixed(1)}% × ${VALUE_ASSUMPTIONS.wrvuDollarValue} × {encountersAtBenchmark.toLocaleString()} enc × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% = <strong className="text-[#EA2C00]">${gapValue.toLocaleString()}</strong></>}
            isResult
          />
        </div>
      )}
    </div>
  );
}
