import { useState } from 'react';
import { ArrowLeft, ArrowRight, Users, ClipboardList, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { AmbientInputs, AmbientCalculations, AmbientBenchmarks } from './SwitchAmbientFlow';

interface SwitchAmbientAnalysisProps {
  inputs: AmbientInputs;
  calculations: AmbientCalculations;
  benchmarks: AmbientBenchmarks;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
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

export default function SwitchAmbientAnalysis({
  inputs,
  calculations,
  benchmarks,
  currentStep,
  totalSteps,
  onNext,
  onBack
}: SwitchAmbientAnalysisProps) {
  
  const [activeTab, setActiveTab] = useState<'breakdown' | 'overtime'>('breakdown');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  
  const chartData = [
    { period: 'Today', value: 0 },
    { period: '3 mo', value: Math.round(calculations.year1Value * 0.25) },
    { period: '6 mo', value: Math.round(calculations.year1Value * 0.5) },
    { period: 'Year 1', value: calculations.year1Value },
    { period: 'Year 2', value: calculations.year1Value + calculations.year2Value },
    { period: 'Year 3', value: calculations.threeYearTotal }
  ];
  
  const drivers = [
    {
      id: 'patient-access',
      name: 'Patient Access',
      description: 'More documented encounters = better access tracking',
      value: calculations.patientAccessValue,
      icon: <Users className="w-5 h-5" />,
      details: {
        formula: `${formatNumber(calculations.additionalEncounters)} additional encounters × access value`,
        explanation: 'When more encounters are documented, organizations have better visibility into access patterns, wait times, and capacity utilization.'
      }
    },
    {
      id: 'level-of-service',
      name: 'Level of Service Accuracy',
      description: 'Better documentation captures clinical complexity',
      value: calculations.levelOfServiceValue,
      icon: <ClipboardList className="w-5 h-5" />,
      details: {
        formula: 'Higher utilization + efficiency = more complete notes = better wRVU capture',
        explanation: 'When providers use the tool consistently and it saves significant time, documentation is more complete and captures the true complexity of visits.'
      }
    },
    {
      id: 'denials',
      name: 'Documentation-Related Denials',
      description: 'Complete notes reduce claim rejections',
      value: calculations.denialsValue,
      icon: <Shield className="w-5 h-5" />,
      details: {
        formula: 'Better documentation = fewer denials = retained revenue',
        explanation: 'Documentation gaps are a leading cause of claim denials. More complete, consistent documentation reduces rejection rates.'
      }
    }
  ];
  
  const toggleDriver = (driverId: string) => {
    setExpandedDriver(expandedDriver === driverId ? null : driverId);
  };
  
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
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight mb-3">
            The gap analysis
          </h1>
          <p className="text-base text-slate-500">
            Based on your inputs, here's the estimated difference between your current state and Abridge benchmarks.
          </p>
        </div>
        
        <section className="bg-white rounded-2xl border border-slate-200 p-8 text-center mb-8">
          <span className="text-xs font-semibold text-slate-400 tracking-wide">ESTIMATED ANNUAL GAP</span>
          <span className="block text-5xl font-bold text-slate-900 mt-3 mb-4 tracking-tight" data-testid="text-annual-gap">
            ${formatNumber(calculations.totalAnnualGap)}
          </span>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
            <span data-testid="text-monthly-gap">${formatNumber(calculations.monthlyGap)}/month</span>
            <span className="text-slate-200">·</span>
            <span data-testid="text-daily-gap">${formatNumber(calculations.dailyGap)}/day</span>
            <span className="text-slate-200">·</span>
            <span data-testid="text-hourly-gap">${formatNumber(calculations.hourlyGap)}/hour</span>
          </div>
        </section>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'breakdown'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
            data-testid="tab-breakdown"
          >
            Value Breakdown
          </button>
          <button
            onClick={() => setActiveTab('overtime')}
            className={`flex-1 py-3 px-6 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'overtime'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
            data-testid="tab-overtime"
          >
            Over Time
          </button>
        </div>
        
        {activeTab === 'breakdown' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">THE GAPS WE IDENTIFIED</h2>
              
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">Utilization</span>
                  <span className="text-sm text-slate-500">
                    {inputs.utilization}% → {benchmarks.utilization}% = +{formatNumber(calculations.additionalEncounters)} enc
                  </span>
                </div>
                <div className="relative h-3 bg-slate-100 rounded-full">
                  <div 
                    className="absolute top-0 left-0 h-full bg-slate-400 rounded-l-full"
                    style={{ width: `${inputs.utilization}%` }}
                  />
                  <div 
                    className="absolute top-0 h-full bg-emerald-500 rounded-r-full"
                    style={{ 
                      left: `${inputs.utilization}%`,
                      width: `${benchmarks.utilization - inputs.utilization}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-slate-400" style={{ marginLeft: `${inputs.utilization - 3}%` }}>YOU</span>
                  <span className="text-emerald-600" style={{ marginRight: `${100 - benchmarks.utilization - 5}%` }}>ABRIDGE</span>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">Efficiency</span>
                  <span className="text-sm text-slate-500">
                    {inputs.efficiency}m → {benchmarks.efficiency}m = +{formatNumber(calculations.additionalHours)} hours
                  </span>
                </div>
                <div className="relative h-3 bg-slate-100 rounded-full">
                  <div 
                    className="absolute top-0 left-0 h-full bg-slate-400 rounded-l-full"
                    style={{ width: `${(inputs.efficiency / 5) * 100}%` }}
                  />
                  <div 
                    className="absolute top-0 h-full bg-emerald-500 rounded-r-full"
                    style={{ 
                      left: `${(inputs.efficiency / 5) * 100}%`,
                      width: `${((benchmarks.efficiency - inputs.efficiency) / 5) * 100}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-slate-400" style={{ marginLeft: `${(inputs.efficiency / 5) * 100 - 3}%` }}>YOU</span>
                  <span className="text-emerald-600" style={{ marginRight: `${100 - (benchmarks.efficiency / 5) * 100 - 5}%` }}>ABRIDGE</span>
                </div>
              </div>
            </section>
            
            <section>
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">WHERE THAT VALUE SHOWS UP</h2>
              
              <div className="space-y-3">
                {drivers.map(driver => (
                  <div
                    key={driver.id}
                    className={`bg-white rounded-xl border transition-all ${
                      expandedDriver === driver.id ? 'border-slate-800' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => toggleDriver(driver.id)}
                      className="w-full flex items-center gap-4 p-5"
                      data-testid={`button-driver-${driver.id}`}
                    >
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                        {driver.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="block text-sm font-semibold text-slate-900">{driver.name}</span>
                        <span className="block text-xs text-slate-500">{driver.description}</span>
                      </div>
                      <span className="text-base font-bold text-emerald-600" data-testid={`text-driver-value-${driver.id}`}>
                        +${formatNumber(driver.value)}/yr
                      </span>
                      {expandedDriver === driver.id ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    
                    {expandedDriver === driver.id && (
                      <div className="px-5 pb-5 pt-0 border-t border-slate-100 bg-slate-50">
                        <div className="pt-4">
                          <span className="block text-xs font-semibold text-slate-400 mb-1">CALCULATION</span>
                          <span className="block text-sm text-slate-600 font-mono">{driver.details.formula}</span>
                        </div>
                        <div className="mt-4">
                          <span className="block text-xs font-semibold text-slate-400 mb-1">WHY THIS MATTERS</span>
                          <p className="text-sm text-slate-600 leading-relaxed">{driver.details.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl mt-4">
                <span className="text-sm font-semibold text-slate-600">TOTAL ANNUAL GAP</span>
                <span className="text-xl font-bold text-slate-900" data-testid="text-total-annual-gap">
                  ${formatNumber(calculations.totalAnnualGap)}/year
                </span>
              </div>
            </section>
          </div>
        )}
        
        {activeTab === 'overtime' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">3-YEAR CUMULATIVE VALUE GAP</h2>
              
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="period" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#94a3b8' }}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`$${formatNumber(value)}`, 'Value']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#059669" 
                        strokeWidth={3}
                        fill="url(#colorValue)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-6 h-1 bg-emerald-600 rounded" />
                    Switch to Abridge
                  </div>
                </div>
              </div>
            </section>
            
            <section>
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">HOW IT ADDS UP</h2>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="text-sm text-slate-700 mb-4">
                  Abridge customers typically see value ramp over time:
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-semibold">Quick wins (0-3 mo):</span>
                    Utilization jumps as providers adopt
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-semibold">Optimization (3-12 mo):</span>
                    Efficiency gains compound
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-semibold">Full ramp (Year 2+):</span>
                    Organization-wide benefits realized
                  </li>
                </ul>
              </div>
            </section>
            
            <section>
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">COST OF WAITING</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                  <span className="block text-xs font-semibold text-slate-500 tracking-wide">SWITCH NOW</span>
                  <span className="block text-xs text-slate-400 mt-1">3-year value</span>
                  <span className="block text-2xl font-bold text-emerald-600 mt-2" data-testid="text-3yr-value">
                    {formatCurrency(calculations.threeYearTotal)}
                  </span>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
                  <span className="block text-xs font-semibold text-slate-500 tracking-wide">WAIT 6 MONTHS</span>
                  <span className="block text-xs text-slate-400 mt-1">3-year value</span>
                  <span className="block text-2xl font-bold text-slate-900 mt-2" data-testid="text-3yr-if-wait">
                    {formatCurrency(calculations.threeYearIfWait)}
                  </span>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                <span className="block text-sm text-red-800">Cost of waiting 6 months</span>
                <span className="block text-3xl font-bold text-red-600 mt-2" data-testid="text-wait-cost">
                  {formatCurrency(calculations.wait6MonthsLoss)}
                </span>
                <p className="text-sm text-red-700 mt-2">
                  That's value you'll never recover
                </p>
              </div>
            </section>
          </div>
        )}
        
        <div className="flex justify-center mt-10">
          <Button
            size="lg"
            onClick={onNext}
            className="bg-[#E85D3F] text-white"
            data-testid="button-what-means"
          >
            What this means
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
