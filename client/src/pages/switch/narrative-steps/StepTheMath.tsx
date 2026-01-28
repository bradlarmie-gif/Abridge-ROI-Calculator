import { useState } from "react";
import { ArrowRight, ArrowLeft, Calculator, Edit3, Check, X, BarChart3, Clock, DollarSign, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  formatCurrency,
  ABRIDGE_BENCHMARKS,
  VALUE_ASSUMPTIONS,
  type SwitchInputs,
  type SwitchCalculations
} from "@/lib/switchGapCalculator";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area } from "recharts";

interface StepTheMathProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
}

export default function StepTheMath({
  inputs,
  calculations,
  onNext,
  onBack,
}: StepTheMathProps) {
  const [showMethodology, setShowMethodology] = useState(false);

  const chartData = calculations.currentTrajectory.map((point, i) => ({
    month: point.month,
    current: point.value,
    potential: calculations.abridgeTrajectory[i]?.value || 0,
  }));

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          The Math
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          Every number is transparent. Every assumption is editable.
          <br className="hidden md:block" />
          You own this analysis.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="w-5 h-5 text-[#EA2C00]" />
          <h2 className="text-lg font-bold text-[#111827]">Value Breakdown</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-[#111827]">Utilization Gap</h3>
                  <p className="text-xs text-[#6B7280]">
                    {inputs.utilization}% → {ABRIDGE_BENCHMARKS.utilization}%
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(calculations.utilizationGapValue)}</span>
            </div>
            <div className="text-xs text-[#6B7280] bg-white/50 rounded p-2">
              <code>
                ({ABRIDGE_BENCHMARKS.utilization}% - {inputs.utilization}%) × {inputs.annualEncounters.toLocaleString()} encounters × {ABRIDGE_BENCHMARKS.timeSavedAvg} min × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% conversion
              </code>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="font-semibold text-[#111827]">Efficiency Gap</h3>
                  <p className="text-xs text-[#6B7280]">
                    {inputs.timeSavedPerEncounter} min → {ABRIDGE_BENCHMARKS.timeSavedAvg} min/encounter
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold text-purple-600">{formatCurrency(calculations.efficiencyGapValue)}</span>
            </div>
            <div className="text-xs text-[#6B7280] bg-white/50 rounded p-2">
              <code>
                ({ABRIDGE_BENCHMARKS.timeSavedAvg} - {inputs.timeSavedPerEncounter}) min × {Math.round(inputs.annualEncounters * ABRIDGE_BENCHMARKS.utilization / 100).toLocaleString()} encounters ÷ 60 × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% conversion
              </code>
            </div>
          </div>

          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-[#111827]">Quality Gap (wRVU)</h3>
                  <p className="text-xs text-[#6B7280]">
                    +{inputs.wrvuLift}% → +{ABRIDGE_BENCHMARKS.wrvuLift}% lift
                  </p>
                </div>
              </div>
              <span className="text-xl font-bold text-emerald-600">{formatCurrency(calculations.wrvuGapValue)}</span>
            </div>
            <div className="text-xs text-[#6B7280] bg-white/50 rounded p-2">
              <code>
                ({ABRIDGE_BENCHMARKS.wrvuLift} - {inputs.wrvuLift})% × {VALUE_ASSUMPTIONS.avgWRVUPerEncounter} wRVU/enc × {Math.round(inputs.annualEncounters * ABRIDGE_BENCHMARKS.utilization / 100).toLocaleString()} enc × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution
              </code>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold">Total Annual Gap</span>
            </div>
            <span className="text-2xl font-bold text-emerald-400">{formatCurrency(calculations.annualGap)}</span>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-8">
        <h2 className="text-lg font-bold text-[#111827] mb-6">Two Paths, Two Outcomes</h2>
        
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(value) => value % 12 === 0 ? `Y${value / 12}` : ''}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'current' ? 'Status Quo' : 'Full Potential'
                ]}
                labelFormatter={(label) => `Month ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke="#94a3b8" 
                strokeWidth={2}
                dot={false}
                name="current"
              />
              <Line 
                type="monotone" 
                dataKey="potential" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={false}
                name="potential"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <span className="text-sm text-[#6B7280]">Status Quo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-[#6B7280]">Full Potential</span>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-8">
        <h2 className="text-lg font-bold text-[#111827] mb-6">The Cost of Waiting</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 text-center">
            <p className="text-xs text-emerald-700 uppercase tracking-wide mb-2">Act Now</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(calculations.switchNowValue)}</p>
            <p className="text-xs text-[#6B7280] mt-1">3-year value captured</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 text-center">
            <p className="text-xs text-amber-700 uppercase tracking-wide mb-2">Wait 6 Months</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(calculations.wait6MonthsValue)}</p>
            <p className="text-xs text-red-600 font-medium mt-1">-{formatCurrency(calculations.wait6MonthsLoss)} lost</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200 text-center">
            <p className="text-xs text-red-700 uppercase tracking-wide mb-2">Wait 12 Months</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(calculations.wait12MonthsValue)}</p>
            <p className="text-xs text-red-600 font-medium mt-1">-{formatCurrency(calculations.wait12MonthsLoss)} lost</p>
          </div>
        </div>
      </section>

      <button
        onClick={() => setShowMethodology(!showMethodology)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
      >
        <span className="font-medium text-[#374151]">Methodology & Assumptions</span>
        {showMethodology ? <ChevronUp className="w-5 h-5 text-[#6B7280]" /> : <ChevronDown className="w-5 h-5 text-[#6B7280]" />}
      </button>
      
      {showMethodology && (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-[#111827] mb-2">Value Assumptions</h4>
            <ul className="space-y-1 text-[#6B7280]">
              <li>• Provider hourly rate: ${VALUE_ASSUMPTIONS.hourlyRate}/hour</li>
              <li>• Time-to-value conversion (utilization): {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}%</li>
              <li>• Time-to-value conversion (efficiency): {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}%</li>
              <li>• wRVU value: ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU</li>
              <li>• wRVU attribution: {VALUE_ASSUMPTIONS.wrvuAttribution * 100}%</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-[#111827] mb-2">Benchmark Sources</h4>
            <p className="text-[#6B7280]">
              Benchmarks are based on aggregate performance data from mature ambient AI implementations 
              across health systems ranging from 50 to 5,000+ providers.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        
        <Button
          onClick={onNext}
          className="bg-[#EA2C00] hover:bg-[#d12700] text-white gap-2"
          data-testid="button-next"
        >
          See Your Options
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
