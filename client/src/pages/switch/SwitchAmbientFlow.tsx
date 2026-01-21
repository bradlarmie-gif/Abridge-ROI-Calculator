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

export interface MetricBreakdownItem {
  metric: string;
  gap: string;
  impact: string;
  value: number;
  calculation: string;
  explanation: string;
  isSpeculative?: boolean;
  isSupporting?: boolean;
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
    selectedMetrics: ['timeSavings', 'workOutsideWork', 'levelOfService', 'wrvuLift'],
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
      
      // 1. UTILIZATION — Show as context, minimal direct value
      if (inputs.utilization < benchmarks.utilization) {
        const addlEncounters = Math.round(totalEncounters * ((benchmarks.utilization - inputs.utilization) / 100));
        const vpEncounter = 0.50; // Very conservative: $0.50/encounter for documentation completeness
        metricBreakdown.push({
          metric: 'Utilization',
          gap: `${inputs.utilization}% → ${benchmarks.utilization}%`,
          impact: `+${formatNum(addlEncounters)} encounters documented`,
          value: Math.round(addlEncounters * vpEncounter),
          calculation: `${formatNum(addlEncounters)} encounters × $${vpEncounter}/encounter`,
          explanation: 'More encounters with complete documentation. Primary value flows through other metrics.'
        });
      }
      
      // 2. TIME SAVINGS — Conservative conversion
      const timeSavingsValue = inputs.metricValues.timeSavings;
      const abridgeTimeSavings = 4;
      if (selected.includes('timeSavings') && timeSavingsValue !== undefined && timeSavingsValue < abridgeTimeSavings) {
        const additionalMinutes = (abridgeTimeSavings - timeSavingsValue) * abridgeEncounters;
        const additionalHrs = Math.round(additionalMinutes / 60);
        const hourlyValue = 37.50; // Conservative rate
        const conversionRate = 0.50;
        metricBreakdown.push({
          metric: 'Time Savings',
          gap: `${timeSavingsValue} min → ${abridgeTimeSavings} min/encounter`,
          impact: `+${formatNum(additionalHrs)} hours/year`,
          value: Math.round(additionalHrs * hourlyValue * conversionRate),
          calculation: `${formatNum(additionalHrs)} hours × $${hourlyValue}/hr × ${conversionRate * 100}% conversion`,
          explanation: 'Time returned to providers. 50% conversion accounts for time going to quality of life vs. realized value.'
        });
      }
      
      // 3. WORK OUTSIDE OF WORK — Speculative retention value, capped
      const wowValue = inputs.metricValues.workOutsideWork;
      const abridgeWow = 2;
      if (selected.includes('workOutsideWork') && wowValue !== undefined && wowValue > abridgeWow) {
        const hoursSavedPerWeek = wowValue - abridgeWow;
        const annualHoursSaved = hoursSavedPerWeek * providers * 48;
        // Speculative retention: 75 providers × 18% turnover × 10% reduction × $400K × 10% attribution
        const speculativeRetentionValue = Math.round(providers * 0.18 * 0.10 * 400000 * 0.10);
        const value = Math.min(speculativeRetentionValue, 25000); // Capped at $25,000
        metricBreakdown.push({
          metric: 'Work Outside of Work',
          gap: `${wowValue} hrs/week → ${abridgeWow} hrs/week`,
          impact: `-${hoursSavedPerWeek} hrs/week per provider (${formatNum(annualHoursSaved)} hrs/year total)`,
          value: value,
          calculation: 'Estimated retention impact (speculative)',
          explanation: 'Reduced after-hours work correlates with lower burnout. Direct financial impact is through retention over 12-18 months.',
          isSpeculative: true
        });
      }
      
      // 4. wRVU CAPTURE — This is the primary financial driver
      const wrvuValue = inputs.metricValues.wrvuLift;
      const abridgeWrvuLift = 5;
      if (selected.includes('wrvuLift') && wrvuValue !== undefined && wrvuValue < abridgeWrvuLift) {
        const liftDelta = abridgeWrvuLift - wrvuValue;
        const baseWrvuPerEncounter = 1.5;
        const baselineWrvus = abridgeEncounters * baseWrvuPerEncounter;
        const additionalWrvus = Math.round(baselineWrvus * (liftDelta / 100));
        const conversionFactor = 33; // Medicare conversion factor
        metricBreakdown.push({
          metric: 'wRVU Capture',
          gap: `${wrvuValue}% lift → ${abridgeWrvuLift}% lift`,
          impact: `+${formatNum(additionalWrvus)} wRVUs/year`,
          value: Math.round(additionalWrvus * conversionFactor),
          calculation: `${formatNum(additionalWrvus)} wRVUs × $${conversionFactor}/wRVU (Medicare)`,
          explanation: 'Better documentation captures clinical complexity that supports accurate coding.'
        });
      }
      
      // 5. LEVEL OF SERVICE — Supporting metric, value captured in wRVU
      const losValue = inputs.metricValues.levelOfService;
      const abridgeLos = 4.1;
      if (selected.includes('levelOfService') && losValue !== undefined && losValue < abridgeLos) {
        const levelDelta = (abridgeLos - losValue).toFixed(1);
        metricBreakdown.push({
          metric: 'Level of Service',
          gap: `${losValue} avg → ${abridgeLos} avg`,
          impact: `+${levelDelta} average level`,
          value: 0, // Explicitly zero - captured in wRVU
          calculation: 'Value captured in wRVU Capture above',
          explanation: 'Higher average E/M level from more complete documentation. Financial impact reflected in wRVU improvement.',
          isSupporting: true
        });
      }
      
      // 6. CHART CLOSURE (24h) — Optional metric
      const chartClosureValue = inputs.metricValues.chartClosure24h;
      if (selected.includes('chartClosure24h') && chartClosureValue !== undefined && chartClosureValue < 78) {
        const closureDelta = 78 - chartClosureValue;
        metricBreakdown.push({
          metric: 'Chart Closure (24h)',
          gap: `${chartClosureValue}% → 78%`,
          impact: `+${closureDelta.toFixed(0)}pp improvement`,
          value: Math.round(closureDelta * providers * 50),
          calculation: `${closureDelta.toFixed(0)}pp × ${providers} providers × $50/provider quality bonus`,
          explanation: 'Faster chart closure improves billing cycles and quality metrics.'
        });
      }
      
      // 7. CLINICIAN SATISFACTION — Optional speculative metric
      const satisfactionValue = inputs.metricValues.satisfaction;
      if (selected.includes('satisfaction') && satisfactionValue !== undefined && satisfactionValue < 8.5) {
        const satDelta = 8.5 - satisfactionValue;
        const speculativeValue = Math.round(satDelta * providers * 1000); // More conservative
        metricBreakdown.push({
          metric: 'Clinician Satisfaction',
          gap: `${satisfactionValue}/10 → 8.5/10`,
          impact: `+${satDelta.toFixed(1)} pts improvement`,
          value: Math.min(speculativeValue, 20000), // Capped
          calculation: 'Estimated retention/engagement impact (speculative)',
          explanation: 'Higher satisfaction correlates with reduced turnover and recruitment costs.',
          isSpeculative: true
        });
      }
    }
    
    // Total only sums non-supporting items
    const advancedTotalGap = metricBreakdown.filter(item => !item.isSupporting).reduce((sum, item) => sum + item.value, 0);
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
