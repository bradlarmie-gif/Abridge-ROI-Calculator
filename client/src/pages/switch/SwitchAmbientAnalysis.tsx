import { useState, ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Users, ClipboardList, Shield, ChevronDown, ChevronUp, BarChart3, Clock, DollarSign, Moon, FileCheck, Heart, Lightbulb, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AmbientInputs, AmbientCalculations, AmbientBenchmarks, MetricTier } from './SwitchAmbientFlow';

interface DriverItem {
  id: string;
  name: string;
  description: string;
  value: number;
  icon: ReactNode;
  details: {
    formula: string;
    explanation: string;
  };
  impact?: string;
  tier?: MetricTier;
  change?: string;
  insight?: string;
  lowEstimate?: number;
  highEstimate?: number;
  timeframe?: string;
}

const getIconComponent = (iconName?: string): ReactNode => {
  switch (iconName) {
    case 'BarChart3': return <BarChart3 className="w-5 h-5" />;
    case 'Clock': return <Clock className="w-5 h-5" />;
    case 'DollarSign': return <DollarSign className="w-5 h-5" />;
    case 'Moon': return <Moon className="w-5 h-5" />;
    case 'FileCheck': return <FileCheck className="w-5 h-5" />;
    case 'Heart': return <Heart className="w-5 h-5" />;
    default: return <ClipboardList className="w-5 h-5" />;
  }
};

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

export default function SwitchAmbientAnalysis({
  inputs,
  calculations,
  benchmarks,
  currentStep,
  totalSteps,
  onNext,
  onBack
}: SwitchAmbientAnalysisProps) {
  
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);
  
  const quickDrivers: DriverItem[] = [
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
  
  const advancedDrivers: DriverItem[] = calculations.metricBreakdown.map((item, index) => ({
    id: `metric-${index}`,
    name: item.metric,
    description: item.gap,
    value: item.value,
    icon: getIconComponent(item.icon),
    details: {
      formula: item.calculation,
      explanation: item.explanation
    },
    impact: item.impact,
    tier: item.tier,
    change: item.change,
    insight: item.insight,
    lowEstimate: item.lowEstimate,
    highEstimate: item.highEstimate,
    timeframe: item.timeframe
  }));
  
  // Group drivers by tier
  const primaryDrivers = advancedDrivers.filter(d => d.tier === 'primary');
  const operationalMetrics = advancedDrivers.filter(d => d.tier === 'operational');
  const longtermMetrics = advancedDrivers.filter(d => d.tier === 'longterm');
  const primaryTotal = primaryDrivers.reduce((sum, d) => sum + d.value, 0);
  
  const drivers: DriverItem[] = inputs.mode === 'advanced' && advancedDrivers.length > 0 ? advancedDrivers : quickDrivers;
  
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
      
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
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
        
        {/* Quick Mode: Simplified gap-only view */}
        {inputs.mode === 'quick' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">THE GAPS WE IDENTIFIED</h2>
              
              <div className="bg-white rounded-xl border border-slate-200 p-5 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">Utilization</span>
                  <span className="text-sm text-slate-500">
                    {inputs.utilization}% → {benchmarks.utilization}% = +{formatNumber(calculations.additionalEncounters)} encounters
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
                  <span className="text-slate-400" style={{ marginLeft: `${Math.max(0, inputs.utilization - 3)}%` }}>YOU</span>
                  <span className="text-emerald-600" style={{ marginRight: `${Math.max(0, 100 - benchmarks.utilization - 5)}%` }}>ABRIDGE</span>
                </div>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">Efficiency</span>
                  <span className="text-sm text-slate-500">
                    {inputs.efficiency} min → {benchmarks.efficiency} min = +{formatNumber(calculations.additionalHours)} hours
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
                  <span className="text-slate-400" style={{ marginLeft: `${Math.max(0, (inputs.efficiency / 5) * 100 - 3)}%` }}>YOU</span>
                  <span className="text-emerald-600" style={{ marginRight: `${Math.max(0, 100 - (benchmarks.efficiency / 5) * 100 - 5)}%` }}>ABRIDGE</span>
                </div>
              </div>
            </section>
            
            <section>
              <h2 className="text-xs font-semibold text-slate-400 tracking-wide mb-4">HOW THIS TRANSLATES TO VALUE</h2>
              
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-sm text-slate-600 mb-5">
                  When utilization and efficiency improve together, the impact is <strong>multiplicative</strong>:
                </p>
                
                <div className="space-y-4 mb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-slate-900">More encounters documented</span>
                      <span className="block text-sm text-slate-500">+{formatNumber(calculations.additionalEncounters)} encounters/year with complete documentation</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-slate-900">More time returned</span>
                      <span className="block text-sm text-slate-500">+{formatNumber(calculations.additionalHours)} hours/year back to providers</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-slate-900">Better documentation quality</span>
                      <span className="block text-sm text-slate-500">More complete notes support accurate coding and reduce denials</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-600">
                    We estimate these improvements translate to approximately <strong className="text-emerald-600">${formatNumber(calculations.totalAnnualGap)}/year</strong> in combined value from wRVU capture, time savings, and operational efficiency.
                  </p>
                </div>
              </div>
            </section>
            
            <div className="bg-slate-100 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500">See what this looks like over 3 years →</p>
            </div>
          </div>
        )}
        
        {/* Advanced Mode: Tiered layout - no tabs, just driver breakdown */}
        {inputs.mode === 'advanced' && (
          <>
              <div className="space-y-6">
                
                {/* TIER 1: Primary Value Drivers */}
                {primaryDrivers.length > 0 && (
                  <section className="bg-white border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-baseline gap-3 mb-5">
                      <h2 className="text-xs font-semibold text-slate-800 tracking-wide">PRIMARY VALUE DRIVERS</h2>
                      <span className="text-xs text-slate-500">Concrete, measurable impact</span>
                    </div>
                    
                    <div className="space-y-3">
                      {primaryDrivers.map(driver => (
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
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-500">
                              {driver.icon}
                            </div>
                            <div className="flex-1 text-left">
                              <span className="block text-sm font-semibold text-slate-900">{driver.name}</span>
                              <span className="block text-xs text-slate-500">{driver.description}</span>
                              {driver.impact && (
                                <span className="block text-xs font-medium mt-1 text-emerald-600">{driver.impact}</span>
                              )}
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
                    
                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl mt-4">
                      <span className="text-xs font-semibold text-slate-500 tracking-wide">PRIMARY TOTAL</span>
                      <span className="text-xl font-bold text-emerald-600" data-testid="text-primary-total">
                        ${formatNumber(primaryTotal)}/year
                      </span>
                    </div>
                  </section>
                )}
                
                {/* TIER 2: Operational Improvements */}
                {operationalMetrics.length > 0 && (
                  <section className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                    <div className="flex items-baseline gap-3 mb-5">
                      <h2 className="text-xs font-semibold text-slate-800 tracking-wide">OPERATIONAL IMPROVEMENTS</h2>
                      <span className="text-xs text-slate-500">Important indicators, harder to dollarize</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {operationalMetrics.map(metric => (
                        <div key={metric.id} className="bg-white border border-slate-200 rounded-xl p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500">
                              {metric.icon}
                            </div>
                            <span className="text-sm font-semibold text-slate-900">{metric.name}</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">{metric.description}</span>
                            </div>
                            {metric.change && (
                              <span className="inline-block text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                {metric.change}
                              </span>
                            )}
                            <p className="text-lg font-bold text-slate-900">{metric.impact}</p>
                            {metric.insight && (
                              <p className="text-xs text-slate-500">{metric.insight}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-start gap-2 mt-4 p-3 bg-white rounded-lg border border-slate-100">
                      <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-600">
                        These improvements contribute to retention and operational efficiency but are difficult to assign direct dollar values.
                      </span>
                    </div>
                  </section>
                )}
                
                {/* TIER 3: Long-Term Value (Speculative) */}
                {longtermMetrics.length > 0 && (
                  <section className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-6">
                    <div className="flex items-baseline gap-3 mb-5">
                      <h2 className="text-xs font-semibold text-slate-800 tracking-wide">LONG-TERM VALUE POTENTIAL</h2>
                      <span className="text-xs text-slate-500">
                        Speculative — typically measurable after {longtermMetrics[0]?.timeframe || '12-18 months'}
                      </span>
                    </div>
                    
                    <div className="bg-white border border-amber-200 rounded-xl p-5">
                      <div className="flex items-start gap-2 mb-4 p-3 bg-amber-50 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-amber-800">
                          These values are estimates based on industry correlations. Actual results depend on your specific situation.
                        </span>
                      </div>
                      
                      {longtermMetrics.map(metric => (
                        <div key={metric.id} className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600">
                            {metric.icon}
                          </div>
                          <div className="flex-1">
                            <span className="block text-sm font-semibold text-slate-900">{metric.name}</span>
                            <span className="block text-xs text-slate-500">{metric.description}</span>
                            {metric.timeframe && (
                              <span className="block text-xs text-amber-600 mt-1">
                                Typically measurable after {metric.timeframe}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="block text-xs text-slate-500">Potential:</span>
                            <span className="block text-base font-bold text-amber-600">
                              ~${formatNumber(metric.lowEstimate || 0)} - ${formatNumber(metric.highEstimate || 0)}/yr
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                
                {/* Total for Advanced Mode */}
                <div className="flex items-center justify-between p-5 bg-slate-800 text-white rounded-xl">
                  <span className="text-sm font-semibold">ESTIMATED ANNUAL GAP</span>
                  <span className="text-xl font-bold" data-testid="text-total-annual-gap">
                    ${formatNumber(calculations.totalAnnualGap)}/year
                  </span>
                </div>
              </div>
          </>
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
