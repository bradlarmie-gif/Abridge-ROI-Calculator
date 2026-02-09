import { useState, useMemo } from "react";
import { ArrowRight, ArrowLeft, Calculator, BarChart3, Clock, DollarSign, TrendingUp, ChevronDown, ChevronUp, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  formatCurrency,
  ABRIDGE_BENCHMARKS,
  VALUE_ASSUMPTIONS,
  type SwitchInputs,
  type SwitchCalculations
} from "@/lib/switchGapCalculator";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface StepTheMathProps {
  inputs: SwitchInputs;
  updateInput: <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => void;
  calculations: SwitchCalculations;
  onNext: () => void;
  onBack: () => void;
}

interface EditableAssumptions {
  hourlyRate: number;
  timeConversion: number;
  wrvuDollarValue: number;
  wrvuRealization: number;
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
    <div className={`rounded-xl border overflow-hidden transition-all ${isOpen ? 'border-[#EA2C00]/30' : 'border-[#E5E7EB]'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-[#F5F0EB]/50 transition-all"
        data-testid={`accordion-${id}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#EA2C00]" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-[#1A1A1A] text-sm">{title}</h3>
            <p className="text-xs text-[#999999]">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-[#EA2C00]">{formatCurrency(value)}</span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-[#999999]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#999999]" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="p-4 bg-[#F5F0EB]/30 border-t border-[#E5E7EB]">
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
  width?: string;
  testId: string;
}

function InlineEdit({ value, onChange, prefix = "", suffix = "", width = "w-16", testId }: InlineEditProps) {
  return (
    <span className="inline-flex items-center gap-0.5 bg-[#FFF5F2] border border-[#EA2C00]/20 rounded px-1 py-0.5">
      {prefix && <span className="text-[#EA2C00]">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`${width} bg-transparent text-[#EA2C00] font-bold text-center focus:outline-none focus:bg-white rounded [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
  
  const [assumptions, setAssumptions] = useState<EditableAssumptions>({
    hourlyRate: VALUE_ASSUMPTIONS.hourlyRate,
    timeConversion: VALUE_ASSUMPTIONS.timeConversionRate * 100,
    wrvuDollarValue: VALUE_ASSUMPTIONS.wrvuDollarValue,
    wrvuRealization: VALUE_ASSUMPTIONS.wrvuRealization * 100,
  });

  const updateAssumption = <K extends keyof EditableAssumptions>(key: K, value: number) => {
    setAssumptions(prev => ({ ...prev, [key]: value }));
  };

  const effectiveEncounters = inputs.annualEncounters || 150000;
  const effectiveProviders = inputs.providers || 75;
  
  const encountersWithAI = Math.round(effectiveEncounters * inputs.utilization / 100);
  const utilizationGapPP = Math.max(0, ABRIDGE_BENCHMARKS.utilization - inputs.utilization);
  const encountersWithoutAI = Math.round(effectiveEncounters * utilizationGapPP / 100);

  const currentNetImpact = inputs.timeSavedPerEncounter - (inputs.editTimePerEncounter || 0);
  const benchmarkNetImpact = ABRIDGE_BENCHMARKS.timeSavedAvg - ABRIDGE_BENCHMARKS.editTime;
  const netImpactGap = benchmarkNetImpact - currentNetImpact;

  const recalculatedValues = useMemo(() => {
    const utilizationTimeSavedHours = (encountersWithoutAI * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60;
    const utilizationGapValue = Math.round(utilizationTimeSavedHours * assumptions.hourlyRate * (assumptions.timeConversion / 100));

    const netEfficiencyGapHours = Math.round((netImpactGap * encountersWithAI) / 60);
    const netEfficiencyGapValue = Math.round(
      Math.max(0, netEfficiencyGapHours) * assumptions.hourlyRate * (assumptions.timeConversion / 100)
    );

    const wrvuGapPercent = Math.max(0, ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift);
    const baseWRVUs = VALUE_ASSUMPTIONS.avgWRVUPerEncounter * encountersWithAI;
    const missingWRVUs = baseWRVUs * (wrvuGapPercent / 100);
    const wrvuGapValue = Math.round(missingWRVUs * assumptions.wrvuDollarValue * (assumptions.wrvuRealization / 100));

    const annualGap = utilizationGapValue + netEfficiencyGapValue + wrvuGapValue;
    
    const optimizedYear1 = Math.round(annualGap * 0.87);
    const optimizedYear2 = Math.round(optimizedYear1 + (annualGap * 1.10));
    const optimizedYear3 = Math.round(optimizedYear2 + (annualGap * 1.15));
    const currentYear1 = Math.round(annualGap * 0.10);
    const currentYear2 = Math.round(currentYear1 + (annualGap * 0.11));
    const currentYear3 = Math.round(currentYear2 + (annualGap * 0.12));

    const switchNowValue = optimizedYear3;
    const wait6MonthsValue = Math.round(optimizedYear3 - (annualGap * 0.5));
    const wait12MonthsValue = Math.round(optimizedYear3 - annualGap);

    return {
      utilizationGapValue,
      netEfficiencyGapValue,
      netEfficiencyGapHours,
      wrvuGapValue,
      baseWRVUs: Math.round(baseWRVUs),
      missingWRVUs: Math.round(missingWRVUs),
      annualGap,
      optimizedYear1,
      optimizedYear2,
      optimizedYear3,
      currentYear1,
      currentYear2,
      currentYear3,
      switchNowValue,
      wait6MonthsValue,
      wait12MonthsValue,
      wait6MonthsLoss: switchNowValue - wait6MonthsValue,
      wait12MonthsLoss: switchNowValue - wait12MonthsValue,
      monthlyGap: Math.round(annualGap / 12),
    };
  }, [inputs, assumptions, encountersWithAI, encountersWithoutAI, netImpactGap]);

  const chartData = [
    { month: 0, current: 0, potential: 0 },
    { month: 12, current: recalculatedValues.currentYear1, potential: recalculatedValues.optimizedYear1 },
    { month: 24, current: recalculatedValues.currentYear2, potential: recalculatedValues.optimizedYear2 },
    { month: 36, current: recalculatedValues.currentYear3, potential: recalculatedValues.optimizedYear3 },
  ];

  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  const CustomDot = (props: any) => {
    const { cx, cy, dataKey } = props;
    if (cx === undefined || cy === undefined) return null;
    const isOptimized = dataKey === 'potential';
    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={isOptimized ? 6 : 5} 
        fill={isOptimized ? "#EA2C00" : "#999999"}
        stroke="white" 
        strokeWidth={2}
      />
    );
  };

  const formatNetVal = (v: number) => {
    const sign = v > 0 ? "+" : "";
    return `${sign}${v.toFixed(1)} min`;
  };

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 font-abridge uppercase tracking-tight" data-testid="text-page-title">
          The Math
        </h1>
        <p className="text-base text-[#666666]">
          Every number is transparent. Every assumption is editable. Challenge anything.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 md:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[#EA2C00]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px]">Value Breakdown</p>
              <h2 className="text-lg font-bold text-[#1A1A1A]">Your Annual Value Gap</h2>
            </div>
          </div>
          <p className="text-xs text-[#999999]">Click to expand</p>
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
              <div className="p-3 bg-[#F5F5F5] rounded-lg text-xs text-[#333333]">
                <p className="font-medium text-[#1A1A1A] mb-3">How we calculate this:</p>
                <div className="space-y-2 font-mono">
                  <p>Encounters not getting AI benefit:</p>
                  <p className="pl-3">{effectiveEncounters.toLocaleString()} encounters x ({ABRIDGE_BENCHMARKS.utilization}% - {inputs.utilization}%) = {encountersWithoutAI.toLocaleString()} encounters</p>
                  <p className="mt-2">Time cost of manual documentation:</p>
                  <p className="pl-3">{encountersWithoutAI.toLocaleString()} encounters x {ABRIDGE_BENCHMARKS.timeSavedAvg} min = {Math.round((encountersWithoutAI * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60).toLocaleString()} hours/year</p>
                  <p className="mt-2 flex items-center flex-wrap gap-1">
                    Value: {Math.round((encountersWithoutAI * ABRIDGE_BENCHMARKS.timeSavedAvg) / 60).toLocaleString()} hours x
                    <InlineEdit
                      value={assumptions.hourlyRate}
                      onChange={(v) => updateAssumption('hourlyRate', v)}
                      prefix="$"
                      suffix="/hr"
                      width="w-12"
                      testId="edit-hourly-rate-util"
                    />
                    x
                    <InlineEdit
                      value={assumptions.timeConversion}
                      onChange={(v) => updateAssumption('timeConversion', v)}
                      suffix="%"
                      width="w-10"
                      testId="edit-conversion-util"
                    />
                    conversion
                  </p>
                  <p className="font-bold text-[#EA2C00] pt-2 text-sm">= {formatCurrency(recalculatedValues.utilizationGapValue)}/year</p>
                </div>
              </div>
              
              <div className="p-3 bg-[#F5F0EB] rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-[#666666] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#666666]">
                  <span className="font-semibold">Why {assumptions.timeConversion}% conversion?</span> Not all time saved becomes dollars. Some is absorbed into workflow, some goes to work-life balance. We use a conservative conversion rate. Adjust based on your capacity situation.
                </p>
              </div>
            </div>
          </GapAccordion>

          <GapAccordion
            id="net-efficiency"
            icon={Clock}
            title="Net Efficiency Gap"
            subtitle={`${inputs.timeSavedPerEncounter} min saved - ${inputs.editTimePerEncounter || 0} min editing → ${ABRIDGE_BENCHMARKS.timeSavedAvg} min saved - ${ABRIDGE_BENCHMARKS.editTime} min editing`}
            value={recalculatedValues.netEfficiencyGapValue}
            isOpen={openAccordion === 'net-efficiency'}
            onToggle={() => toggleAccordion('net-efficiency')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
                  <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-3">Your Net Time Impact</p>
                  <div className="space-y-1.5 text-sm text-[#333333]">
                    <div className="flex justify-between">
                      <span>Time Saved</span>
                      <span>{inputs.timeSavedPerEncounter} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>- Edit Time</span>
                      <span>{inputs.editTimePerEncounter || 0} min</span>
                    </div>
                    <div className="h-px bg-[#E5E7EB]" />
                    <div className="flex justify-between font-medium">
                      <span>= Net</span>
                      <span className={currentNetImpact < 0 ? 'text-[#EA2C00] font-bold' : 'text-[#1A1A1A] font-bold'}>
                        {formatNetVal(currentNetImpact)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-[#F5F5F5] rounded-lg">
                  <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-3">Benchmark Net Time Impact</p>
                  <div className="space-y-1.5 text-sm text-[#333333]">
                    <div className="flex justify-between">
                      <span>Time Saved</span>
                      <span>{ABRIDGE_BENCHMARKS.timeSavedAvg} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>- Edit Time</span>
                      <span>{ABRIDGE_BENCHMARKS.editTime} min</span>
                    </div>
                    <div className="h-px bg-[#E0E0E0]" />
                    <div className="flex justify-between font-medium">
                      <span>= Net</span>
                      <span className="text-[#1A1A1A] font-bold">{formatNetVal(benchmarkNetImpact)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#F5F5F5] rounded-lg text-xs text-[#333333]">
                <p className="font-medium text-[#1A1A1A] mb-3">How we calculate this:</p>
                <div className="space-y-2 font-mono">
                  <p>Net time gap per encounter:</p>
                  <p className="pl-3">{formatNetVal(benchmarkNetImpact)} (benchmark) - ({formatNetVal(currentNetImpact)}) (current) = {netImpactGap.toFixed(1)} min/encounter</p>
                  <p className="mt-2">Encounters with AI (at your utilization):</p>
                  <p className="pl-3">{effectiveEncounters.toLocaleString()} x {inputs.utilization}% = {encountersWithAI.toLocaleString()} encounters</p>
                  <p className="mt-2">Total time gap:</p>
                  <p className="pl-3">{encountersWithAI.toLocaleString()} x {netImpactGap.toFixed(1)} min = {recalculatedValues.netEfficiencyGapHours.toLocaleString()} hours/year</p>
                  <p className="mt-2 flex items-center flex-wrap gap-1">
                    Value: {recalculatedValues.netEfficiencyGapHours.toLocaleString()} hours x
                    <InlineEdit
                      value={assumptions.hourlyRate}
                      onChange={(v) => updateAssumption('hourlyRate', v)}
                      prefix="$"
                      suffix="/hr"
                      width="w-12"
                      testId="edit-hourly-rate-eff"
                    />
                    x
                    <InlineEdit
                      value={assumptions.timeConversion}
                      onChange={(v) => updateAssumption('timeConversion', v)}
                      suffix="%"
                      width="w-10"
                      testId="edit-conversion-eff"
                    />
                    conversion
                  </p>
                  <p className="font-bold text-[#EA2C00] pt-2 text-sm">= {formatCurrency(recalculatedValues.netEfficiencyGapValue)}/year</p>
                </div>
              </div>

              <div className="p-3 bg-[#F5F0EB] rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-[#666666] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#666666]">
                  <span className="font-semibold">Why does edit time matter?</span> Net time impact includes both time saved and time spent editing — a more complete picture of actual efficiency.
                </p>
              </div>

              {currentNetImpact < 0 && (
                <div className="p-3 bg-[#FFEBE6] rounded-lg flex items-start gap-2" data-testid="math-net-loss-warning">
                  <AlertTriangle className="w-4 h-4 text-[#EA2C00] flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-[#EA2C00]">
                    <span className="font-semibold">Your current net time impact is negative.</span> Each AI-documented encounter adds approximately {Math.round(Math.abs(currentNetImpact) * 60)} seconds of work. This is worth understanding as part of the overall picture.
                  </p>
                </div>
              )}
            </div>
          </GapAccordion>

          <GapAccordion
            id="quality"
            icon={DollarSign}
            title="Coding Impact Gap"
            subtitle={`Your +${inputs.wrvuLift}% vs. benchmark +${ABRIDGE_BENCHMARKS.wrvuLift}%`}
            value={recalculatedValues.wrvuGapValue}
            isOpen={openAccordion === 'quality'}
            onToggle={() => toggleAccordion('quality')}
          >
            <div className="space-y-4">
              <div className="p-3 bg-[#F5F5F5] rounded-lg text-xs text-[#333333]">
                <p className="font-medium text-[#1A1A1A] mb-3">How we calculate this:</p>
                <div className="space-y-2 font-mono">
                  <p>wRVU lift gap:</p>
                  <p className="pl-3">{ABRIDGE_BENCHMARKS.wrvuLift}% (benchmark) - {inputs.wrvuLift}% (current) = {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}%</p>
                  <p className="mt-2">Base wRVU volume:</p>
                  <p className="pl-3">{VALUE_ASSUMPTIONS.avgWRVUPerEncounter} wRVU/encounter x {encountersWithAI.toLocaleString()} encounters = {recalculatedValues.baseWRVUs.toLocaleString()} base wRVUs</p>
                  <p className="pl-3 text-[#999999]">(using your current utilization)</p>
                  <p className="mt-2">Missing wRVU lift:</p>
                  <p className="pl-3">{recalculatedValues.baseWRVUs.toLocaleString()} wRVUs x {(ABRIDGE_BENCHMARKS.wrvuLift - inputs.wrvuLift).toFixed(1)}% = {recalculatedValues.missingWRVUs.toLocaleString()} wRVUs</p>
                  <p className="mt-2 flex items-center flex-wrap gap-1">
                    Value: {recalculatedValues.missingWRVUs.toLocaleString()} wRVUs x
                    <InlineEdit
                      value={assumptions.wrvuDollarValue}
                      onChange={(v) => updateAssumption('wrvuDollarValue', v)}
                      prefix="$"
                      suffix="/wRVU"
                      width="w-10"
                      testId="edit-wrvu-value"
                    />
                    x
                    <InlineEdit
                      value={assumptions.wrvuRealization}
                      onChange={(v) => updateAssumption('wrvuRealization', v)}
                      suffix="%"
                      width="w-10"
                      testId="edit-wrvu-realization"
                    />
                    realization
                  </p>
                  <p className="font-bold text-[#EA2C00] pt-2 text-sm">= {formatCurrency(recalculatedValues.wrvuGapValue)}/year</p>
                </div>
              </div>
              
              <div className="p-3 bg-[#F5F0EB] rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-[#666666] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#666666]">
                  <span className="font-semibold">Why {assumptions.wrvuRealization}% realization?</span> Not every wRVU uplift translates to payment. We apply {assumptions.wrvuRealization}% realization to account for payer mix, denials, and other factors.
                </p>
              </div>
            </div>
          </GapAccordion>
        </div>

        <div className="mt-5 bg-[#F5F0EB] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#EA2C00]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px]">Total Annual Gap</p>
                <p className="text-sm text-[#666666]">Unrealized value per year</p>
              </div>
            </div>
            <span className="text-3xl md:text-4xl font-bold text-[#EA2C00]" data-testid="text-total-annual-gap">{formatCurrency(recalculatedValues.annualGap)}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-[#E0E0E0] space-y-1 text-xs text-[#666666]">
            <div className="flex justify-between">
              <span>Utilization Gap</span>
              <span className="font-medium text-[#1A1A1A]">{formatCurrency(recalculatedValues.utilizationGapValue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Net Efficiency Gap</span>
              <span className="font-medium text-[#1A1A1A]">{formatCurrency(recalculatedValues.netEfficiencyGapValue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Coding Impact Gap</span>
              <span className="font-medium text-[#1A1A1A]">{formatCurrency(recalculatedValues.wrvuGapValue)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-[#E5E7EB] p-5 md:p-6">
        <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-1">3-Year Projection</p>
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">The Compounding Effect</h2>
        <p className="text-sm text-[#666666] mb-6">
          The shaded area represents potential value over time. Earlier action captures more of it.
        </p>
        
        <div className="h-64 md:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="gapGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EA2C00" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#EA2C00" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#999999' }}
                tickFormatter={(value) => `Year ${value / 12}`}
                ticks={[0, 12, 24, 36]}
                axisLine={{ stroke: '#E5E7EB' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#999999' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  return [
                    formatCurrency(value),
                    name === 'current' ? 'Current (staying course)' : 'Optimized (with Abridge)'
                  ];
                }}
                labelFormatter={(label) => `Year ${label / 12}`}
                contentStyle={{ 
                  borderRadius: '8px', 
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="potential" 
                stroke="#EA2C00" 
                strokeWidth={2}
                fill="url(#gapGradient)"
                name="potential"
                dot={<CustomDot dataKey="potential" />}
              />
              <Area 
                type="monotone" 
                dataKey="current" 
                stroke="#999999" 
                strokeWidth={2}
                fill="none"
                name="current"
                strokeDasharray="5 5"
                dot={<CustomDot dataKey="current" />}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-[#EA2C00]" />
            <span className="text-[#666666]">Optimized (with Abridge)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 border-t-2 border-dashed border-[#999999]" />
            <span className="text-[#666666]">Current (staying course)</span>
          </div>
        </div>

        <div className="mt-6 border-t border-[#E5E7EB] pt-4">
          <p className="text-xs font-medium text-[#666666] uppercase tracking-[1.5px] mb-3">Year-by-Year:</p>
          <div className="space-y-1.5 text-xs text-[#666666]">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#1A1A1A] w-14">Year 1:</span>
              <span>{formatCurrency(recalculatedValues.optimizedYear1)} optimized vs {formatCurrency(recalculatedValues.currentYear1)} current</span>
              <span className="text-[#EA2C00] font-medium">(gap: {formatCurrency(recalculatedValues.optimizedYear1 - recalculatedValues.currentYear1)})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#1A1A1A] w-14">Year 2:</span>
              <span>{formatCurrency(recalculatedValues.optimizedYear2)} cumulative vs {formatCurrency(recalculatedValues.currentYear2)} current</span>
              <span className="text-[#EA2C00] font-medium">(gap: {formatCurrency(recalculatedValues.optimizedYear2 - recalculatedValues.currentYear2)})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#1A1A1A] w-14">Year 3:</span>
              <span>{formatCurrency(recalculatedValues.optimizedYear3)} cumulative vs {formatCurrency(recalculatedValues.currentYear3)} current</span>
              <span className="text-[#EA2C00] font-medium">(gap: {formatCurrency(recalculatedValues.optimizedYear3 - recalculatedValues.currentYear3)})</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#1A1A1A] rounded-xl p-6 md:p-8">
        <p className="text-xs font-medium text-[#999999] uppercase tracking-[1.5px] mb-4">
          The Cost of Waiting
        </p>
        <p className="text-sm text-[#999999] mb-6">
          Every month of delay has a measurable cost. Here's what the math suggests:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#333333] rounded-lg p-4 text-center">
            <p className="text-[10px] text-[#999999] uppercase tracking-[1.5px] mb-2">Act Now</p>
            <p className="text-2xl md:text-3xl font-bold text-white">{formatCurrency(recalculatedValues.switchNowValue)}</p>
            <p className="text-xs text-[#999999] mt-1">3-year cumulative value</p>
          </div>
          <div className="bg-[#333333] rounded-lg p-4 text-center">
            <p className="text-[10px] text-[#999999] uppercase tracking-[1.5px] mb-2">Wait 6 Months</p>
            <p className="text-2xl md:text-3xl font-bold text-[#EA2C00]">{formatCurrency(recalculatedValues.wait6MonthsValue)}</p>
            <p className="text-xs text-[#EA2C00] mt-1">-{formatCurrency(recalculatedValues.wait6MonthsLoss)} opportunity cost</p>
          </div>
          <div className="bg-[#333333] rounded-lg p-4 text-center">
            <p className="text-[10px] text-[#999999] uppercase tracking-[1.5px] mb-2">Wait 12 Months</p>
            <p className="text-2xl md:text-3xl font-bold text-[#EA2C00]">{formatCurrency(recalculatedValues.wait12MonthsValue)}</p>
            <p className="text-xs text-[#EA2C00] mt-1">-{formatCurrency(recalculatedValues.wait12MonthsLoss)} opportunity cost</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-[#333333]">
          <p className="text-sm text-[#CCCCCC]">
            That's approximately <span className="text-white font-bold">{formatCurrency(recalculatedValues.monthlyGap)}/month</span> in unrealized value at current performance levels.
          </p>
        </div>
      </section>

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
          className="bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white gap-2 rounded-full px-6 h-11"
          data-testid="button-next"
        >
          What It Takes
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
