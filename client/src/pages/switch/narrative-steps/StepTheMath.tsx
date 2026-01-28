import { useState } from "react";
import { ArrowRight, ArrowLeft, Calculator, BarChart3, Clock, DollarSign, TrendingUp, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  formatCurrency,
  ABRIDGE_BENCHMARKS,
  VALUE_ASSUMPTIONS,
  type SwitchInputs,
  type SwitchCalculations
} from "@/lib/switchGapCalculator";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

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
    gap: [point.value, calculations.abridgeTrajectory[i]?.value || 0],
  }));

  const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey } = props;
    if (payload.month % 12 === 0) {
      const isTop = dataKey === 'potential';
      return (
        <circle 
          key={`${dataKey}-${payload.month}`}
          cx={cx} 
          cy={cy} 
          r={isTop ? 6 : 5} 
          fill={isTop ? "#10b981" : "#94a3b8"}
          stroke="white" 
          strokeWidth={2}
        />
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-[#111827] mb-3" data-testid="text-page-title">
          The Math
        </h1>
        <p className="text-base md:text-lg text-[#6B7280] max-w-2xl mx-auto">
          Every number is transparent. Every assumption is yours to challenge.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <Calculator className="w-5 h-5 text-[#EA2C00]" />
          <h2 className="text-lg font-bold text-[#111827]">Your Annual Value Gap</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
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

          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className="font-semibold text-[#111827]">Efficiency Gap</h3>
                <p className="text-xs text-[#6B7280]">
                  {inputs.timeSavedPerEncounter} min → {ABRIDGE_BENCHMARKS.timeSavedAvg} min saved
                </p>
              </div>
            </div>
            <span className="text-xl font-bold text-purple-600">{formatCurrency(calculations.efficiencyGapValue)}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100">
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
        </div>

        <div className="mt-4 bg-slate-900 text-white rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">Total Annual Gap</span>
          </div>
          <span className="text-2xl font-bold text-emerald-400">{formatCurrency(calculations.annualGap)}</span>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-[#6B7280]">
            That's <span className="font-semibold text-[#111827]">{formatCurrency(calculations.annualGap)}</span> in unrealized value — every year.
            <br />
            <span className="text-[#9CA3AF]">Here's what that looks like over time, and why timing matters.</span>
          </p>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#111827] mb-1">The Compounding Effect</h2>
          <p className="text-sm text-[#6B7280]">
            The shaded area is value left on the table. Every month of delay shifts your starting point — and shrinks what you capture.
          </p>
        </div>
        
        <div className="relative">
          <div className="h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 30, right: 20, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(value) => value % 12 === 0 ? `Year ${value / 12}` : ''}
                  ticks={[0, 12, 24, 36]}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip 
                  formatter={(value: number | number[], name: string) => {
                    if (name === 'gap') return null;
                    const displayValue = Array.isArray(value) ? value[0] : value;
                    return [
                      formatCurrency(displayValue),
                      name === 'current' ? 'Continue as-is' : 'Optimized'
                    ];
                  }}
                  labelFormatter={(label) => label % 12 === 0 ? `Year ${label / 12}` : `Month ${label}`}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <ReferenceLine 
                  x={6} 
                  stroke="#f59e0b" 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                />
                <ReferenceLine 
                  x={12} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="gap" 
                  stroke="none"
                  fill="url(#gapGradient)"
                  name="gap"
                />
                <Area 
                  type="monotone" 
                  dataKey="potential" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fill="none"
                  name="potential"
                  dot={<CustomDot dataKey="potential" />}
                />
                <Area 
                  type="monotone" 
                  dataKey="current" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  fill="none"
                  name="current"
                  dot={<CustomDot dataKey="current" />}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="absolute top-8 left-[calc(16.67%-10px)] hidden md:block">
            <div className="bg-amber-100 border border-amber-300 rounded-lg px-2 py-1 text-xs font-medium text-amber-800 whitespace-nowrap shadow-sm">
              6 mo delay
            </div>
          </div>
          <div className="absolute top-8 left-[calc(33.33%-10px)] hidden md:block">
            <div className="bg-red-100 border border-red-300 rounded-lg px-2 py-1 text-xs font-medium text-red-800 whitespace-nowrap shadow-sm">
              12 mo delay
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <span className="text-xs text-[#6B7280]">Continue as-is</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-[#6B7280]">Optimized</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-400" style={{ borderStyle: 'dashed' }} />
            <span className="text-xs text-[#6B7280]">Delay cost</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="relative bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border-2 border-emerald-300">
            <div className="absolute -top-2.5 left-4">
              <span className="bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Start Now
              </span>
            </div>
            <div className="mt-2">
              <p className="text-2xl md:text-3xl font-bold text-emerald-600">{formatCurrency(calculations.switchNowValue)}</p>
              <p className="text-xs text-emerald-700 mt-1">3-year value captured</p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-1">Wait 6 Months</p>
            <p className="text-xl md:text-2xl font-bold text-amber-600">{formatCurrency(calculations.wait6MonthsValue)}</p>
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className="text-xs text-red-600 font-medium">-{formatCurrency(calculations.wait6MonthsLoss)}</p>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wide mb-1">Wait 12 Months</p>
            <p className="text-xl md:text-2xl font-bold text-red-600">{formatCurrency(calculations.wait12MonthsValue)}</p>
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className="text-xs text-red-600 font-medium">-{formatCurrency(calculations.wait12MonthsLoss)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-[#6B7280]">
            Every 6 months of delay costs approximately <span className="font-semibold text-red-600">{formatCurrency(calculations.wait6MonthsLoss)}</span> in unrealized value.
          </p>
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
            <h4 className="font-semibold text-[#111827] mb-2">How We Calculate Each Gap</h4>
            <div className="space-y-3 text-xs text-[#6B7280]">
              <div className="p-3 bg-white rounded border">
                <p className="font-medium text-blue-600 mb-1">Utilization Gap</p>
                <code className="text-[#374151]">
                  ({ABRIDGE_BENCHMARKS.utilization}% - {inputs.utilization}%) × {inputs.annualEncounters.toLocaleString()} encounters × {ABRIDGE_BENCHMARKS.timeSavedAvg} min × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100}% conversion
                </code>
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="font-medium text-purple-600 mb-1">Efficiency Gap</p>
                <code className="text-[#374151]">
                  ({ABRIDGE_BENCHMARKS.timeSavedAvg} - {inputs.timeSavedPerEncounter}) min × eligible encounters ÷ 60 × ${VALUE_ASSUMPTIONS.hourlyRate}/hr × {VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100}% conversion
                </code>
              </div>
              <div className="p-3 bg-white rounded border">
                <p className="font-medium text-emerald-600 mb-1">Quality Gap (wRVU)</p>
                <code className="text-[#374151]">
                  ({ABRIDGE_BENCHMARKS.wrvuLift} - {inputs.wrvuLift})% × {VALUE_ASSUMPTIONS.avgWRVUPerEncounter} wRVU/enc × eligible encounters × ${VALUE_ASSUMPTIONS.wrvuDollarValue}/wRVU × {VALUE_ASSUMPTIONS.wrvuAttribution * 100}% attribution
                </code>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-[#111827] mb-2">Key Assumptions</h4>
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
