import { useState, useMemo } from 'react';
import SwitchAmbientSetup from './SwitchAmbientSetup';
import SwitchAmbientAnalysis from './SwitchAmbientAnalysis';
import SwitchAmbientConclusion from './SwitchAmbientConclusion';

export interface AmbientInputs {
  providerRange: string;
  utilization: number;
  efficiency: number;
  providers: number;
  encountersPerProvider: number;
}

export interface AmbientBenchmarks {
  utilization: number;
  efficiency: number;
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
}

interface SwitchAmbientFlowProps {
  onBack: () => void;
  onBackToJourney: () => void;
}

export default function SwitchAmbientFlow({ onBack, onBackToJourney }: SwitchAmbientFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  const [inputs, setInputs] = useState<AmbientInputs>({
    providerRange: '50-100',
    utilization: 50,
    efficiency: 1.5,
    providers: 75,
    encountersPerProvider: 2000
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
    const totalEncounters = providers * inputs.encountersPerProvider;
    
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
    
    const utilizationValue = Math.round(additionalEncounters * valuePerEncounter);
    const efficiencyValue = Math.round(additionalHours * valuePerHour);
    const totalAnnualGap = utilizationValue + efficiencyValue;
    
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
      totalEncounters
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
