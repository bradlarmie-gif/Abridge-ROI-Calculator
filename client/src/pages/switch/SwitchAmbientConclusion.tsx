import { useState } from 'react';
import { ArrowLeft, Phone, Link2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  
  const [activeTab, setActiveTab] = useState<'summary' | 'trajectory'>('trajectory');
  
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
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-500 flex items-center gap-1"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span className="text-xs font-semibold text-slate-400 tracking-wide">SWITCH</span>
          </div>
          
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === currentStep - 1 
                    ? 'w-6 bg-slate-800' 
                    : i < currentStep 
                      ? 'w-2 bg-slate-800' 
                      : 'w-2 bg-slate-200'
                }`}
                data-testid={`progress-dot-${i + 1}`}
              />
            ))}
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">
            The cost of staying put
          </h1>
          <p className="text-base text-slate-500">
            Cumulative value over 3 years: your current trajectory vs. switching to Abridge
          </p>
        </div>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('trajectory')}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'trajectory'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
            data-testid="tab-trajectory"
          >
            3-Year Trajectory
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'summary'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
            data-testid="tab-summary"
          >
            Summary
          </button>
        </div>
        
        {activeTab === 'trajectory' && (
          <div className="space-y-6">
            {/* Chart Section */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6">
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
                <span className="text-2xl text-emerald-600">↕</span>
                <div>
                  <span className="text-2xl font-bold text-emerald-600">{formatCurrency(threeYearGap)}</span>
                  <span className="text-sm text-slate-500 ml-2">3-year gap</span>
                </div>
              </div>
            </section>
            
            {/* Understanding the Gap */}
            <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">💡</span>
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
            <section className="bg-white rounded-2xl border border-slate-200 p-6">
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
            <section className="bg-white rounded-2xl border border-slate-200 p-6">
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
            
            {/* Important to Know */}
            <section className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">IMPORTANT TO KNOW</h2>
              
              <p className="text-sm text-slate-600 mb-3">These estimates are based on:</p>
              <ul className="space-y-2 text-sm text-slate-600 mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  Your self-reported metrics (utilization, efficiency)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  Abridge benchmarks from similar deployments
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400">•</span>
                  Conservative assumptions about adoption and ramp
                </li>
              </ul>
              
              <p className="text-sm text-slate-600">
                A conversation with our team can help validate and refine these estimates for your specific situation.
              </p>
            </section>
          </div>
        )}
        
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">YOUR SITUATION</h2>
              
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-5 bg-slate-50 border-b border-slate-200">
                  <span className="text-sm text-slate-700">
                    With {inputs.providers} providers using your current solution...
                  </span>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Utilization</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">{inputs.utilization}%</span>
                      <span className="text-xs text-slate-400">(Abridge: {benchmarks.utilization}%)</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Time saved/encounter</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-slate-900">{inputs.efficiency} min</span>
                      <span className="text-xs text-slate-400">(Abridge: {benchmarks.efficiency}-5 min)</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-sm text-slate-700">Estimated annual gap</span>
                  <span className="text-xl font-bold text-slate-900" data-testid="text-annual-gap">
                    ${formatNumber(calculations.totalAnnualGap)}
                  </span>
                </div>
              </div>
            </section>
            
            <section>
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">THE QUESTION</h2>
              
              <div className="bg-slate-100 rounded-2xl p-8">
                <p className="text-xl text-slate-800 leading-relaxed text-center font-medium">
                  Is your current solution delivering <span className="text-slate-900">${formatNumber(calculations.totalAnnualGap)}</span> less value than it could be?
                </p>
              </div>
            </section>
            
            <section>
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">CONTEXT</h2>
              
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  This analysis compares your estimated current state against Abridge benchmarks derived from our customer base. The actual gap depends on factors like:
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    Your specific specialty mix and care settings
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    Current documentation workflows and EHR integration
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    Provider adoption patterns and change management
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-slate-400">•</span>
                    Organization-specific revenue cycle processes
                  </li>
                </ul>
                <p className="text-sm text-slate-600 leading-relaxed mt-4">
                  A conversation with our team can help refine these estimates for your specific situation.
                </p>
              </div>
            </section>
            
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 text-center">
              <span className="text-xs font-semibold text-emerald-700 tracking-wide">POTENTIAL 3-YEAR VALUE</span>
              <span className="block text-4xl font-bold text-emerald-600 mt-3">
                {formatCurrency(calculations.threeYearTotal)}
              </span>
              <p className="text-sm text-emerald-700 mt-3">
                Based on switching to Abridge now vs. maintaining current state
              </p>
            </div>
          </div>
        )}
        
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            className="bg-[#E85D3F] text-white"
            data-testid="button-lets-talk"
          >
            <Phone className="w-4 h-4" />
            Let's Talk
          </Button>
          
          <div className="flex gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-sm text-slate-500 flex items-center gap-1"
              data-testid="button-copy-link"
            >
              <Link2 className="w-4 h-4" />
              Copy link
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackToJourney}
              className="text-sm text-slate-500 flex items-center gap-1"
              data-testid="button-edit-inputs"
            >
              <Edit3 className="w-4 h-4" />
              Edit inputs
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
