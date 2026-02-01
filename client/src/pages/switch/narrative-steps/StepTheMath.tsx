import { useState, useMemo } from "react";
import { ArrowRight, ArrowLeft, Calculator, BarChart3, Clock, DollarSign, TrendingUp, ChevronDown, ChevronUp, AlertCircle, Edit3, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface EditableAssumptions {
  hourlyRate: number;
  utilizationConversion: number;
  efficiencyConversion: number;
  wrvuDollarValue: number;
  wrvuAttribution: number;
}

interface GapAccordionProps {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  value: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function GapAccordion({
  id,
  icon: Icon,
  title,
  subtitle,
  value,
  isOpen,
  onToggle,
  children,
}: GapAccordionProps) {
  return (
    <div className={`rounded-xl border overflow-hidden transition-all border-slate-200 ${isOpen ? 'shadow-sm' : ''}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-all"
        data-testid={`accordion-${id}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#EA2C00]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-black">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-[#EA2C00]">{formatCurrency(value)}</span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="p-4 bg-white border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

interface InlineEditProps {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  width?: string;
  testId: string;
}

function InlineEdit({ value, onChange, prefix = "", suffix = "", step = 1, width = "w-16", testId }: InlineEditProps) {
  return (
    <span className="inline-flex items-center gap-0.5 bg-[#FFF5F2] border border-[#EA2C00]/20 rounded px-1 py-0.5">
      {prefix && <span className="text-[#EA2C00]">{prefix}</span>}
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`${width} bg-transparent text-[#EA2C00] font-bold text-center focus:outline-none focus:bg-white rounded`}
        data-testid={testId}
      />
      {suffix && <span className="text-[#EA2C00]">{suffix}</span>}
    </span>
  );
}

export default function StepTheMath({
  inputs,
  updateInput,
  calculations,
  onNext,
  onBack,
}: StepTheMathProps) {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  
  const [assumptions, setAssumptions] = useState<EditableAssumptions>({
    hourlyRate: VALUE_ASSUMPTIONS.hourlyRate,
    utilizationConversion: VALUE_ASSUMPTIONS.utilizationTimeConversionRate * 100,
    efficiencyConversion: VALUE_ASSUMPTIONS.efficiencyTimeConversionRate * 100,
    wrvuDollarValue: VALUE_ASSUMPTIONS.wrvuDollarValue,
    wrvuAttribution: VALUE_ASSUMPTIONS.wrvuAttribution * 100,
  });

  const updateAssumption = <K extends keyof EditableAssumptions>(key: K, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  const eligibleEncounters = Math.round(inputs.annualEncounters * ABRIDGE_BENCHMARKS.utilization / 100);

  const recalculatedValues = useMemo(() => {
    const utilizationGapPercent = Math.max(0, ABRIDGE_BENCHMARKS.utilization - inputs.utilization);
    const additionalEncounters = Math.round(inputs.annualEncounters * utilizationGapPercent / 100);
    const utilizationPotentialTimeSavedHours = (additionalEncounters * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60;
    const utilizationGapValue = Math.round(utilizationPotentialTimeSavedHours * assumptions.hourlyRate * (assumptions.utilizationConversion / 100));

    const efficiencyGapMin = Math.max(0, ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter);
    const efficiencyGapHours = Math.round((eligibleEncounters * efficiencyGapMin) / 60);
    const efficiencyGapValue = Math.round(efficiencyGapHours * assumptions.hourlyRate * (assumptions.efficiencyConversion / 100));

    const wrvuGapPercent = Math.max(0, ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift);
    const wrvuGapPerEncounter = VALUE_ASSUMPTIONS.avgWRVUPerEncounter * (wrvuGapPercent / 100);
    const wrvuGapValue = Math.round(wrvuGapPerEncounter * eligibleEncounters * assumptions.wrvuDollarValue * (assumptions.wrvuAttribution / 100));

    const annualGap = utilizationGapValue + efficiencyGapValue + wrvuGapValue;
    const switchNowValue = annualGap * 3;
    const wait6MonthsValue = annualGap * 2.5;
    const wait12MonthsValue = annualGap * 2;

    return {
      utilizationGapValue,
      efficiencyGapValue,
      wrvuGapValue,
      annualGap,
      switchNowValue,
      wait6MonthsValue,
      wait12MonthsValue,
      wait6MonthsLoss: switchNowValue - wait6MonthsValue,
      wait12MonthsLoss: switchNowValue - wait12MonthsValue,
    };
  }, [inputs, assumptions, eligibleEncounters]);

  const chartData = calculations.currentTrajectory.map((point, i) => ({
    month: point.month,
    current: point.value,
    potential: calculations.abridgeTrajectory[i]?.value || 0,
    gap: [point.value, calculations.abridgeTrajectory[i]?.value || 0],
  }));

  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

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
          fill={isTop ? "#EA2C00" : "#94a3b8"}
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
        <p className="text-sm font-semibold text-[#EA2C00] uppercase tracking-widest mb-2">Financial Analysis</p>
        <h1 className="font-abridge uppercase text-3xl md:text-4xl font-bold text-black mb-3" data-testid="text-page-title">
          The Math
        </h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
          Every number is transparent. Every assumption is yours to challenge.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <h2 className="text-lg font-bold text-black">Your Annual Value Gap</h2>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            Click to expand & edit
          </p>
        </div>

        <div className="space-y-3">
          <GapAccordion
            id="utilization"
            icon={BarChart3}
            title="Utilization Gap"
            subtitle={`${inputs.utilization}% → ${ABRIDGE_BENCHMARKS.utilization}%`}
            value={recalculatedValues.utilizationGapValue}
            isOpen={openAccordion === 'utilization'}
            onToggle={() => toggleAccordion('utilization')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Your Current Utilization</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={inputs.utilization}
                      onChange={(e) => updateInput('utilization', parseFloat(e.target.value) || 0)}
                      className="h-9"
                      data-testid="input-utilization"
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Benchmark Target</label>
                  <div className="h-9 flex items-center px-3 bg-slate-50 rounded-md border text-sm text-black font-medium">
                    {ABRIDGE_BENCHMARKS.utilization}%
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                <p className="font-medium text-black mb-2 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  How we calculate this (click values to edit):
                </p>
                <div className="space-y-1.5 font-mono">
                  <p>Gap: ({ABRIDGE_BENCHMARKS.utilization}% - {inputs.utilization}%) = {ABRIDGE_BENCHMARKS.utilization - inputs.utilization}%</p>
                  <p>Additional encounters: {inputs.annualEncounters.toLocaleString()} × {ABRIDGE_BENCHMARKS.utilization - inputs.utilization}% = {Math.round(inputs.annualEncounters * (ABRIDGE_BENCHMARKS.utilization - inputs.utilization) / 100).toLocaleString()}</p>
                  <p className="flex items-center flex-wrap gap-1">
                    Time value: × {ABRIDGE_BENCHMARKS.timeSavedAvg} min × 
                    <InlineEdit
                      value={assumptions.hourlyRate}
                      onChange={(v) => updateAssumption('hourlyRate', v)}
                      prefix="$"
                      suffix="/hr"
                      width="w-12"
                      testId="edit-hourly-rate-util"
                    />
                    ×
                    <InlineEdit
                      value={assumptions.utilizationConversion}
                      onChange={(v) => updateAssumption('utilizationConversion', v)}
                      suffix="%"
                      width="w-10"
                      testId="edit-util-conversion"
                    />
                    conversion
                  </p>
                  <p className="font-bold text-[#EA2C00] pt-1">= {formatCurrency(recalculatedValues.utilizationGapValue)}/year</p>
                </div>
              </div>
            </div>
          </GapAccordion>

          <GapAccordion
            id="efficiency"
            icon={Clock}
            title="Efficiency Gap"
            subtitle={`${inputs.timeSavedPerEncounter} min → ${ABRIDGE_BENCHMARKS.timeSavedAvg} min saved`}
            value={recalculatedValues.efficiencyGapValue}
            isOpen={openAccordion === 'efficiency'}
            onToggle={() => toggleAccordion('efficiency')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Current Time Saved/Encounter</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={inputs.timeSavedPerEncounter}
                      onChange={(e) => updateInput('timeSavedPerEncounter', parseFloat(e.target.value) || 0)}
                      className="h-9"
                      data-testid="input-time-saved"
                    />
                    <span className="text-sm text-slate-500">min</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Benchmark Target</label>
                  <div className="h-9 flex items-center px-3 bg-slate-50 rounded-md border text-sm text-black font-medium">
                    {ABRIDGE_BENCHMARKS.timeSavedAvg} min
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                <p className="font-medium text-black mb-2 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  How we calculate this (click values to edit):
                </p>
                <div className="space-y-1.5 font-mono">
                  <p>Time gap: ({ABRIDGE_BENCHMARKS.timeSavedAvg} - {inputs.timeSavedPerEncounter}) = {(ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter).toFixed(1)} min/encounter</p>
                  <p>Eligible encounters: {eligibleEncounters.toLocaleString()} (at {ABRIDGE_BENCHMARKS.utilization}% utilization)</p>
                  <p>Hours saved: {((ABRIDGE_BENCHMARKS.timeSavedAvg - inputs.timeSavedPerEncounter) * eligibleEncounters / 60).toFixed(0)} hours/year</p>
                  <p className="flex items-center flex-wrap gap-1">
                    Value: ×
                    <InlineEdit
                      value={assumptions.hourlyRate}
                      onChange={(v) => updateAssumption('hourlyRate', v)}
                      prefix="$"
                      suffix="/hr"
                      width="w-12"
                      testId="edit-hourly-rate-eff"
                    />
                    ×
                    <InlineEdit
                      value={assumptions.efficiencyConversion}
                      onChange={(v) => updateAssumption('efficiencyConversion', v)}
                      suffix="%"
                      width="w-10"
                      testId="edit-eff-conversion"
                    />
                    conversion
                  </p>
                  <p className="font-bold text-[#EA2C00] pt-1">= {formatCurrency(recalculatedValues.efficiencyGapValue)}/year</p>
                </div>
              </div>
            </div>
          </GapAccordion>

          <GapAccordion
            id="quality"
            icon={DollarSign}
            title="Quality Gap (wRVU)"
            subtitle={`+${inputs.wrvuLift}% → +${ABRIDGE_BENCHMARKS.wrvuLift}% lift`}
            value={recalculatedValues.wrvuGapValue}
            isOpen={openAccordion === 'quality'}
            onToggle={() => toggleAccordion('quality')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Current wRVU Lift</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={inputs.wrvuLift}
                      onChange={(e) => updateInput('wrvuLift', parseFloat(e.target.value) || 0)}
                      className="h-9"
                      data-testid="input-wrvu-lift"
                    />
                    <span className="text-sm text-slate-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Benchmark Target</label>
                  <div className="h-9 flex items-center px-3 bg-slate-50 rounded-md border text-sm text-black font-medium">
                    +{ABRIDGE_BENCHMARKS.wrvuLift}%
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
                <p className="font-medium text-black mb-2 flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  How we calculate this (click values to edit):
                </p>
                <div className="space-y-1.5 font-mono">
                  <p>wRVU gap: ({ABRIDGE_BENCHMARKS.wrvuLift}% - {inputs.wrvuLift}%) = {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}%</p>
                  <p>Base wRVU: {VALUE_ASSUMPTIONS.avgWRVUPerEncounter} wRVU/encounter × {eligibleEncounters.toLocaleString()} encounters</p>
                  <p>Additional wRVU: × {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}%</p>
                  <p className="flex items-center flex-wrap gap-1">
                    Value: ×
                    <InlineEdit
                      value={assumptions.wrvuDollarValue}
                      onChange={(v) => updateAssumption('wrvuDollarValue', v)}
                      prefix="$"
                      suffix="/wRVU"
                      width="w-10"
                      testId="edit-wrvu-value"
                    />
                    ×
                    <InlineEdit
                      value={assumptions.wrvuAttribution}
                      onChange={(v) => updateAssumption('wrvuAttribution', v)}
                      suffix="%"
                      width="w-10"
                      testId="edit-wrvu-attribution"
                    />
                    attribution
                  </p>
                  <p className="font-bold text-[#EA2C00] pt-1">= {formatCurrency(recalculatedValues.wrvuGapValue)}/year</p>
                </div>
              </div>
              
              <div className="p-3 bg-[#FFF5F2] rounded-lg border border-[#EA2C00]/10 text-xs text-slate-700">
                <p className="font-semibold text-black">Note on wRVU lift:</p>
                <p className="mt-1">Higher lift often indicates room for improvement in prior documentation. Lower lift with already-strong documentation is equally healthy.</p>
              </div>
            </div>
          </GapAccordion>
        </div>

        <div className="mt-5 bg-black rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/60 uppercase tracking-widest">Total Annual Gap</p>
              <p className="font-semibold text-white">Unrealized value per year</p>
            </div>
          </div>
          <span className="text-3xl font-bold text-white">{formatCurrency(recalculatedValues.annualGap)}</span>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600">
            That's <span className="font-semibold text-black">{formatCurrency(recalculatedValues.annualGap)}</span> in unrealized value — every year.
            <br />
            <span className="text-slate-500">Here's what that looks like over time, and why timing matters.</span>
          </p>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-6">
        <div className="mb-4">
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-1">3-Year Projection</p>
          <h2 className="text-xl font-bold text-black mb-1">The Compounding Effect</h2>
          <p className="text-sm text-slate-600">
            The shaded area is value left on the table. Every month of delay shifts your starting point — and shrinks what you capture.
          </p>
        </div>
        
        <div className="relative">
          <div className="h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 30, right: 20, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EA2C00" stopOpacity={0.20} />
                    <stop offset="100%" stopColor="#EA2C00" stopOpacity={0.05} />
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
                    if (name === 'gap') return [null, null];
                    const displayValue = Array.isArray(value) ? value[0] : value;
                    return [
                      formatCurrency(displayValue),
                      name === 'current' ? 'Continue as-is' : 'Optimized'
                    ];
                  }}
                  filterNull={true}
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
                  stroke="#EA2C00" 
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
            <span className="text-xs text-slate-500">Continue as-is</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#EA2C00]" />
            <span className="text-xs text-slate-500">Optimized</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-400" style={{ borderStyle: 'dashed' }} />
            <span className="text-xs text-slate-500">Delay cost</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="relative bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border-2 border-emerald-500/30">
            <div className="absolute -top-2.5 left-4">
              <span className="bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Start Now
              </span>
            </div>
            <div className="mt-2">
              <p className="text-2xl md:text-3xl font-bold text-emerald-600">{formatCurrency(recalculatedValues.switchNowValue)}</p>
              <p className="text-xs text-emerald-700 mt-1">3-year value captured</p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mb-1">Wait 6 Months</p>
            <p className="text-xl md:text-2xl font-bold text-amber-600">{formatCurrency(recalculatedValues.wait6MonthsValue)}</p>
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className="text-xs text-red-600 font-medium">-{formatCurrency(recalculatedValues.wait6MonthsLoss)}</p>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="text-[10px] text-red-600 font-semibold uppercase tracking-wide mb-1">Wait 12 Months</p>
            <p className="text-xl md:text-2xl font-bold text-red-600">{formatCurrency(recalculatedValues.wait12MonthsValue)}</p>
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 text-red-500" />
              <p className="text-xs text-red-600 font-medium">-{formatCurrency(recalculatedValues.wait12MonthsLoss)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-600">
            Every 6 months of delay costs approximately <span className="font-semibold text-[#EA2C00]">{formatCurrency(recalculatedValues.wait6MonthsLoss)}</span> in unrealized value.
          </p>
        </div>
      </section>

      <button
        onClick={() => setShowMethodology(!showMethodology)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
      >
        <span className="font-semibold text-black">Methodology & Assumptions</span>
        {showMethodology ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      
      {showMethodology && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-black mb-2">Your Current Assumptions</h4>
            <ul className="space-y-1 text-slate-600">
              <li>• Provider hourly rate: <span className="font-medium text-black">${assumptions.hourlyRate}/hour</span></li>
              <li>• Time-to-value conversion (utilization): <span className="font-medium text-black">{assumptions.utilizationConversion}%</span></li>
              <li>• Time-to-value conversion (efficiency): <span className="font-medium text-black">{assumptions.efficiencyConversion}%</span></li>
              <li>• wRVU value: <span className="font-medium text-black">${assumptions.wrvuDollarValue}/wRVU</span></li>
              <li>• wRVU attribution: <span className="font-medium text-black">{assumptions.wrvuAttribution}%</span></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-black mb-2">Benchmark Sources</h4>
            <p className="text-slate-600">
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
          className="bg-black hover:bg-black/90 text-white gap-2 rounded-full px-6"
          data-testid="button-next"
        >
          See Full Analysis
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
