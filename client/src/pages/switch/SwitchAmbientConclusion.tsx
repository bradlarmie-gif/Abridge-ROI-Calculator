import { Lightbulb, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedHeader, UnifiedHeaderSpacer } from '@/components/UnifiedHeader';
import { ComposedChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { AmbientInputs, AmbientCalculations, AmbientBenchmarks } from './SwitchAmbientFlow';

interface SwitchAmbientConclusionProps {
  inputs: AmbientInputs;
  calculations: AmbientCalculations;
  benchmarks: AmbientBenchmarks;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onBackToJourney: () => void;
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000)}K`;
  }
  return `$${formatNumber(value)}`;
}

export default function SwitchAmbientConclusion({
  inputs,
  calculations,
  benchmarks,
  currentStep,
  totalSteps,
  onBack,
  onBackToJourney
}: SwitchAmbientConclusionProps) {
  
  // Calculate trajectories for dual-line chart
  const currentUtilization = inputs.utilization || 50;
  const abridgeUtilization = benchmarks.utilization || 65;
  const utilizationRatio = currentUtilization / abridgeUtilization;
  
  const currentEfficiency = inputs.efficiency || 1.5;
  const abridgeEfficiency = benchmarks.efficiency || 4;
  const efficiencyRatio = currentEfficiency / abridgeEfficiency;
  
  const currentCaptureRate = Math.min((utilizationRatio + efficiencyRatio) / 2, 0.95);
  const currentAnnualValue = Math.round(calculations.totalAnnualGap * (currentCaptureRate / (1 - currentCaptureRate)));
  const abridgeAnnualValue = currentAnnualValue + calculations.totalAnnualGap;
  
  const year2Growth = 1.10;
  const year3Growth = 1.19;
  
  const chartData = [
    { period: 'Today', current: 0, abridge: 0 },
    { period: '3 mo', current: Math.round(currentAnnualValue * 0.25), abridge: Math.round(abridgeAnnualValue * 0.25 * 0.7) },
    { period: '6 mo', current: Math.round(currentAnnualValue * 0.5), abridge: Math.round(abridgeAnnualValue * 0.5 * 0.85) },
    { period: 'Year 1', current: currentAnnualValue, abridge: abridgeAnnualValue },
    { period: 'Year 2', current: currentAnnualValue * 2, abridge: abridgeAnnualValue + Math.round(abridgeAnnualValue * year2Growth) },
    { period: 'Year 3', current: currentAnnualValue * 3, abridge: abridgeAnnualValue + Math.round(abridgeAnnualValue * year2Growth) + Math.round(abridgeAnnualValue * year3Growth) }
  ];
  
  const threeYearGap = chartData[chartData.length - 1].abridge - chartData[chartData.length - 1].current;
  
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <UnifiedHeader 
        pathType="switch"
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepName="Summary"
        onBack={onBack}
      />
      <UnifiedHeaderSpacer />
      
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 md:px-10 py-6 md:py-8 pb-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-4">
            The cost of staying put
          </h1>
          <p className="text-base text-slate-500">
            Cumulative value over 3 years: your current trajectory vs. switching to Abridge
          </p>
        </div>
        
        <div className="space-y-8">
            {/* Chart Section */}
            <section className="bg-white rounded-2xl border border-slate-200 p-10">
              <div className="flex justify-center gap-8 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-6 h-1 bg-emerald-600 rounded" />
                  Switch to Abridge
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-6 h-0.5 bg-slate-400 border-t-2 border-dashed border-slate-400" />
                  Stay with current
                </div>
              </div>
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="abridgeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    
                    <XAxis 
                      dataKey="period" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      tickFormatter={(v) => formatCurrency(v)}
                      width={65}
                    />
                    
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `$${formatNumber(value)}`, 
                        name === 'current' ? 'Current Solution' : 'Abridge'
                      ]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    
                    <Area 
                      type="monotone" 
                      dataKey="current" 
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      fill="url(#currentGradient)"
                      dot={{ fill: '#94a3b8', strokeWidth: 0, r: 4 }}
                    />
                    
                    <Area 
                      type="monotone" 
                      dataKey="abridge" 
                      stroke="#059669" 
                      strokeWidth={3}
                      fill="url(#abridgeGradient)"
                      dot={{ fill: '#059669', strokeWidth: 0, r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-slate-100">
                <ArrowUpDown className="w-6 h-6 text-emerald-600" />
                <div>
                  <span className="text-2xl font-bold text-emerald-600">{formatCurrency(threeYearGap)}</span>
                  <span className="text-sm text-slate-500 ml-2">3-year gap</span>
                </div>
              </div>
            </section>
            
            {/* Understanding the Gap */}
            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <h2 className="text-xs font-semibold text-amber-800 tracking-wide">UNDERSTANDING THE GAP</h2>
              </div>
              
              <p className="text-sm text-slate-700 mb-4">
                The gap between these two lines represents unrealized value — not because your current solution is bad, but because ambient AI ROI is <strong>multiplicative</strong>:
              </p>
              
              <div className="bg-white rounded-xl p-4 mb-4 text-center">
                <span className="text-sm font-mono text-slate-800">
                  Utilization × Efficiency × Quality = <strong>Total Value</strong>
                </span>
                <p className="text-xs text-slate-500 mt-2">
                  Small gaps in each dimension compound into large gaps overall.
                </p>
              </div>
              
              <p className="text-sm text-slate-600">
                If your utilization is <strong>{Math.round(utilizationRatio * 100)}%</strong> of potential, and your efficiency is <strong>{Math.round(efficiencyRatio * 100)}%</strong> of potential, you're capturing roughly <strong>{Math.round(currentCaptureRate * 100)}%</strong> of the value you could be.
              </p>
            </section>
            
            {/* Your Key Gaps */}
            <section className="bg-white rounded-2xl border border-slate-200 p-10">
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">YOUR KEY GAPS</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-slate-200 rounded-xl p-5">
                  <span className="block text-xs font-semibold text-slate-400 tracking-wide mb-2">UTILIZATION</span>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-slate-900">{inputs.utilization}%</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-2xl font-bold text-emerald-600">{benchmarks.utilization}%</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    You're at <strong className="text-slate-700">{Math.round(utilizationRatio * 100)}%</strong> of Abridge benchmark
                  </p>
                </div>
                
                <div className="border border-slate-200 rounded-xl p-5">
                  <span className="block text-xs font-semibold text-slate-400 tracking-wide mb-2">EFFICIENCY</span>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-slate-900">{inputs.efficiency} min</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-2xl font-bold text-emerald-600">{benchmarks.efficiency} min</span>
                  </div>
                  <p className="text-sm text-slate-500">
                    You're at <strong className="text-slate-700">{Math.round(efficiencyRatio * 100)}%</strong> of Abridge benchmark
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-700">
                  <strong>Combined:</strong> You're capturing roughly <strong className="text-emerald-600">{Math.round(currentCaptureRate * 100)}%</strong> of potential ambient AI value.
                </p>
              </div>
            </section>
            
            {/* Cost of Waiting */}
            <section className="bg-white rounded-2xl border border-slate-200 p-10">
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">THE COST OF WAITING</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <span className="block text-xs font-semibold text-slate-500 tracking-wide">SWITCH NOW</span>
                  <span className="block text-xs text-slate-400 mt-1">3-year value</span>
                  <span className="block text-2xl font-bold text-emerald-600 mt-2" data-testid="text-3yr-value">
                    {formatCurrency(calculations.threeYearTotal)}
                  </span>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <span className="block text-xs font-semibold text-slate-500 tracking-wide">WAIT 6 MONTHS</span>
                  <span className="block text-xs text-slate-400 mt-1">3-year value</span>
                  <span className="block text-2xl font-bold text-slate-900 mt-2" data-testid="text-3yr-if-wait">
                    {formatCurrency(calculations.threeYearIfWait)}
                  </span>
                  <span className="block text-xs text-red-600 mt-1">Lost: {formatCurrency(calculations.wait6MonthsLoss)}</span>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-amber-600">⚠️</span>
                <p className="text-sm text-amber-800">
                  Every month at current state = <strong>~{formatCurrency(calculations.monthlyGap)}</strong> in unrealized value
                </p>
              </div>
            </section>
          </div>
      </main>
    </div>
  );
}
