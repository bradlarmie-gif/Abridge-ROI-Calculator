import { useState, useMemo } from 'react';
import SwitchAmbientSetup from './SwitchAmbientSetup';
import SwitchAmbientAnalysis from './SwitchAmbientAnalysis';
import SwitchAmbientConclusion from './SwitchAmbientConclusion';

export type AmbientMode = 'quick' | 'advanced';

export interface MetricValues {
  timeSavings?: number;
  workOutsideWork?: number;
  levelOfService?: number;
  wrvuLift?: number;
  chartClosure24h?: number;
  satisfaction?: number;
}

export interface AmbientInputs {
  mode: AmbientMode;
  providerRange: string;
  utilization: number;
  efficiency: number;
  providers: number;
  encountersPerProvider: number;
  totalEncounters: number;
  selectedMetrics: string[];
  metricValues: MetricValues;
}

export interface AmbientBenchmarks {
  utilization: number;
  efficiency: number;
}

export type MetricTier = 'primary' | 'operational' | 'longterm';

export interface MetricBreakdownItem {
  metric: string;
  gap: string;
  impact: string;
  value: number;
  calculation: string;
  explanation: string;
  tier: MetricTier;
  icon?: string;
  change?: string;
  insight?: string;
  lowEstimate?: number;
  highEstimate?: number;
  timeframe?: string;
}

export interface AmbientCalculations {
  currentDocumentedEncounters: number;
  currentHoursReturned: number;
  abridgeDocumentedEncounters: number;
  abridgeHoursReturned: number;
  utilizationGap: number;
  efficiencyGap: number;
  additionalEncounters: number;
  additionalHours: number;
  utilizationValue: number;
  efficiencyValue: number;
  totalAnnualGap: number;
  patientAccessValue: number;
  levelOfServiceValue: number;
  denialsValue: number;
  monthlyGap: number;
  dailyGap: number;
  hourlyGap: number;
  year1Value: number;
  year2Value: number;
  year3Value: number;
  threeYearTotal: number;
  wait6MonthsLoss: number;
  threeYearIfWait: number;
  providers: number;
  totalEncounters: number;
  metricBreakdown: MetricBreakdownItem[];
}

interface SwitchAmbientFlowProps {
  onBack: () => void;
  onBackToJourney: () => void;
}

export default function SwitchAmbientFlow({ onBack, onBackToJourney }: SwitchAmbientFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  const [inputs, setInputs] = useState<AmbientInputs>({
    mode: 'quick',
    providerRange: '50-100',
    utilization: 50,
    efficiency: 1.5,
    providers: 75,
    encountersPerProvider: 2000,
    totalEncounters: 150000,
    selectedMetrics: ['timeSavings', 'workOutsideWork', 'wrvuLift'],
    metricValues: {}
  });
  
  const totalSteps = 3;
  
  const goNext = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const goBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const benchmarks: AmbientBenchmarks = {
    utilization: 65,
    efficiency: 3
  };
  
  const calculations = useMemo((): AmbientCalculations => {
    const providers = inputs.providers;
    const totalEncounters = inputs.mode === 'advanced' 
      ? inputs.totalEncounters 
      : providers * inputs.encountersPerProvider;
    
    const currentDocumentedEncounters = Math.round(totalEncounters * (inputs.utilization / 100));
    const currentHoursReturned = Math.round((inputs.efficiency * currentDocumentedEncounters) / 60);
    
    const abridgeDocumentedEncounters = Math.round(totalEncounters * (benchmarks.utilization / 100));
    const abridgeHoursReturned = Math.round((benchmarks.efficiency * abridgeDocumentedEncounters) / 60);
    
    const utilizationGap = benchmarks.utilization - inputs.utilization;
    const efficiencyGap = benchmarks.efficiency - inputs.efficiency;
    const additionalEncounters = Math.max(0, abridgeDocumentedEncounters - currentDocumentedEncounters);
    const additionalHours = Math.max(0, abridgeHoursReturned - currentHoursReturned);
    
    const valuePerEncounter = 2.60;
    const valuePerHour = 75;
    
    const formatNum = (val: number) => val.toLocaleString();
    
    const metricBreakdown: MetricBreakdownItem[] = [];
    const selected = inputs.selectedMetrics;
    
    if (inputs.mode === 'advanced') {
      const abridgeEncounters = Math.round(totalEncounters * (benchmarks.utilization / 100));
      
      // ========== TIER 1: PRIMARY VALUE DRIVERS ==========
      
      // 1. UTILIZATION — Primary driver
      if (inputs.utilization < benchmarks.utilization) {
        const addlEncounters = Math.round(totalEncounters * ((benchmarks.utilization - inputs.utilization) / 100));
        const vpEncounter = 0.50;
        metricBreakdown.push({
          metric: 'Utilization',
          gap: `${inputs.utilization}% → ${benchmarks.utilization}%`,
          impact: `+${formatNum(addlEncounters)} encounters documented`,
          value: Math.round(addlEncounters * vpEncounter),
          calculation: `${formatNum(addlEncounters)} encounters × $${vpEncounter}/encounter`,
          explanation: 'More encounters with complete documentation. Primary value flows through other metrics.',
          tier: 'primary',
          icon: 'BarChart3'
        });
      }
      
      // 2. TIME SAVINGS — Primary driver
      const timeSavingsValue = inputs.metricValues.timeSavings;
      const abridgeTimeSavings = 4;
      if (selected.includes('timeSavings') && timeSavingsValue !== undefined && timeSavingsValue < abridgeTimeSavings) {
        const additionalMinutes = (abridgeTimeSavings - timeSavingsValue) * abridgeEncounters;
        const additionalHrs = Math.round(additionalMinutes / 60);
        const hourlyValue = 37.50;
        const conversionRate = 0.50;
        metricBreakdown.push({
          metric: 'Time Savings',
          gap: `${timeSavingsValue} min → ${abridgeTimeSavings} min/encounter`,
          impact: `+${formatNum(additionalHrs)} hours/year`,
          value: Math.round(additionalHrs * hourlyValue * conversionRate),
          calculation: `${formatNum(additionalHrs)} hours × $${hourlyValue}/hr × ${conversionRate * 100}% conversion`,
          explanation: 'Time returned to providers. 50% conversion accounts for time going to quality of life vs. realized value.',
          tier: 'primary',
          icon: 'Clock'
        });
      }
      
      // 3. wRVU CAPTURE — Primary driver (core financial metric)
      const wrvuValue = inputs.metricValues.wrvuLift;
      const abridgeWrvuLift = 5;
      if (selected.includes('wrvuLift') && wrvuValue !== undefined && wrvuValue < abridgeWrvuLift) {
        const liftDelta = abridgeWrvuLift - wrvuValue;
        const baseWrvuPerEncounter = 1.5;
        const baselineWrvus = abridgeEncounters * baseWrvuPerEncounter;
        const additionalWrvus = Math.round(baselineWrvus * (liftDelta / 100));
        const conversionFactor = 33;
        metricBreakdown.push({
          metric: 'wRVU Capture',
          gap: `${wrvuValue}% lift → ${abridgeWrvuLift}% lift`,
          impact: `+${formatNum(additionalWrvus)} wRVUs/year`,
          value: Math.round(additionalWrvus * conversionFactor),
          calculation: `${formatNum(additionalWrvus)} wRVUs × $${conversionFactor}/wRVU (Medicare)`,
          explanation: 'Better documentation captures clinical complexity that supports accurate coding.',
          tier: 'primary',
          icon: 'DollarSign'
        });
      }
      
      // ========== TIER 2: OPERATIONAL IMPROVEMENTS (no dollar values) ==========
      
      // Work Outside of Work — Operational indicator
      const wowValue = inputs.metricValues.workOutsideWork;
      const abridgeWow = 2;
      if (selected.includes('workOutsideWork') && wowValue !== undefined && wowValue > abridgeWow) {
        const hoursSavedPerWeek = wowValue - abridgeWow;
        const annualHoursSaved = hoursSavedPerWeek * providers * 48;
        metricBreakdown.push({
          metric: 'Work Outside of Work',
          gap: `${wowValue} hrs/week → ${abridgeWow} hrs/week`,
          impact: `${formatNum(annualHoursSaved)} hours/year returned to providers`,
          value: 0, // No dollar value - operational indicator
          calculation: `${hoursSavedPerWeek} hrs/week × ${providers} providers × 48 weeks`,
          explanation: 'Reduced after-hours work correlates with lower burnout and better retention over time.',
          tier: 'operational',
          icon: 'Moon',
          change: `-${hoursSavedPerWeek} hrs/week per provider`,
          insight: 'Contributes to retention and provider well-being.'
        });
      }
      
      // Chart Closure — Operational indicator
      const chartClosureValue = inputs.metricValues.chartClosure24h;
      const abridgeChartClosure = 78;
      if (selected.includes('chartClosure24h') && chartClosureValue !== undefined && chartClosureValue < abridgeChartClosure) {
        const closureDelta = abridgeChartClosure - chartClosureValue;
        metricBreakdown.push({
          metric: 'Chart Closure (24h)',
          gap: `${chartClosureValue}% → ${abridgeChartClosure}%`,
          impact: `+${closureDelta.toFixed(0)}pp improvement`,
          value: 0, // No dollar value - operational indicator
          calculation: `${chartClosureValue}% current → ${abridgeChartClosure}% benchmark`,
          explanation: 'Charts closed within 24 hours can be billed immediately, improving cash flow and reducing A/R days.',
          tier: 'operational',
          icon: 'FileCheck',
          change: `+${closureDelta.toFixed(0)}pp improvement`,
          insight: 'Faster billing cycles, improved cash flow.'
        });
      }
      
      // ========== TIER 3: LONG-TERM VALUE (speculative) ==========
      
      // Clinician Retention — derived from WOW data (reduced after-hours work correlates with retention)
      // Show retention section whenever WOW is selected and has a value > abridgeWow (i.e., there's room for improvement)
      const hasRetentionPotential = selected.includes('workOutsideWork') && wowValue !== undefined && wowValue > abridgeWow;
      
      if (hasRetentionPotential) {
        // Very rough estimate: reduced WOW → reduced turnover → saved replacement costs
        const estimatedTurnoverReduction = 0.10; // 10% of turnover attributable to doc burden
        const avgTurnover = providers * 0.18;
        const preventedDepartures = avgTurnover * estimatedTurnoverReduction;
        const replacementCost = 400000;
        const lowEstimate = Math.round(preventedDepartures * replacementCost * 0.10);
        const highEstimate = Math.round(preventedDepartures * replacementCost * 0.25);
        
        metricBreakdown.push({
          metric: 'Clinician Retention',
          gap: 'Based on reduced after-hours documentation work',
          impact: `Potential: $${formatNum(lowEstimate)} - $${formatNum(highEstimate)}/year`,
          value: 0, // Not counted in primary total
          calculation: `${providers} providers × 18% turnover × 10% reduction × $${formatNum(replacementCost)} cost × 10-25% attribution`,
          explanation: 'Actual results depend on your specific turnover patterns and causes.',
          tier: 'longterm',
          icon: 'Heart',
          lowEstimate,
          highEstimate,
          timeframe: '12-18 months',
          insight: 'Typically measurable after 12-18 months'
        });
      }
    }
    
    // Total only sums primary tier items
    const advancedTotalGap = metricBreakdown.filter(item => item.tier === 'primary').reduce((sum, item) => sum + item.value, 0);
    const utilizationValue = Math.round(additionalEncounters * valuePerEncounter);
    const efficiencyValue = Math.round(additionalHours * valuePerHour);
    const quickTotalGap = utilizationValue + efficiencyValue;
    
    // In advanced mode, use advancedTotalGap if we have metrics; otherwise fall back to quickTotalGap
    const totalAnnualGap = inputs.mode === 'advanced' && advancedTotalGap > 0 ? advancedTotalGap : quickTotalGap;
    
    const patientAccessValue = Math.round(totalAnnualGap * 0.26);
    const levelOfServiceValue = Math.round(totalAnnualGap * 0.45);
    const denialsValue = Math.round(totalAnnualGap * 0.29);
    
    const monthlyGap = Math.round(totalAnnualGap / 12);
    const dailyGap = Math.round(totalAnnualGap / 365);
    const hourlyGap = Math.round(totalAnnualGap / (365 * 24));
    
    const year1Value = totalAnnualGap;
    const year2Value = Math.round(totalAnnualGap * 1.10);
    const year3Value = Math.round(totalAnnualGap * 1.18);
    const threeYearTotal = year1Value + year2Value + year3Value;
    
    const wait6MonthsLoss = Math.round(year1Value * 0.5);
    const threeYearIfWait = threeYearTotal - wait6MonthsLoss;
    
    return {
      currentDocumentedEncounters,
      currentHoursReturned,
      abridgeDocumentedEncounters,
      abridgeHoursReturned,
      utilizationGap,
      efficiencyGap,
      additionalEncounters,
      additionalHours,
      utilizationValue,
      efficiencyValue,
      totalAnnualGap,
      patientAccessValue,
      levelOfServiceValue,
      denialsValue,
      monthlyGap,
      dailyGap,
      hourlyGap,
      year1Value,
      year2Value,
      year3Value,
      threeYearTotal,
      wait6MonthsLoss,
      threeYearIfWait,
      providers,
      totalEncounters,
      metricBreakdown
    };
  }, [inputs, benchmarks.utilization, benchmarks.efficiency]);
  
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {currentStep === 1 && (
        <SwitchAmbientSetup
          inputs={inputs}
          setInputs={setInputs}
          calculations={calculations}
          benchmarks={benchmarks}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 2 && (
        <SwitchAmbientAnalysis
          inputs={inputs}
          calculations={calculations}
          benchmarks={benchmarks}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 3 && (
        <SwitchAmbientConclusion
          inputs={inputs}
          calculations={calculations}
          benchmarks={benchmarks}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onBack={goBack}
          onBackToJourney={onBackToJourney}
        />
      )}
    </div>
  );
}
