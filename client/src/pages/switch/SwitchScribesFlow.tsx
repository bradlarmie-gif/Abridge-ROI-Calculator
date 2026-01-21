import { useState } from 'react';
import SwitchScribesSetup from './SwitchScribesSetup';
import SwitchScribesCoverage from './SwitchScribesCoverage';
import SwitchScribesHiddenCosts from './SwitchScribesHiddenCosts';
import SwitchScribesFullPicture from './SwitchScribesFullPicture';
import SwitchScribesComparison from './SwitchScribesComparison';

export interface ScribeData {
  totalProviders: number | null;
  annualEncounters: number | null;
  providersWithScribes: number | null;
  hourlyRate: number;
  hoursPerWeek: number;
  turnoverRate: number;
  managementHoursPerWeek: number;
  managementHourlyRate: number;
  recruitmentCostPerScribe: number;
}

export interface ScribeCalculations {
  coveragePercent: number;
  providersWithoutScribes: number;
  annualScribePayroll: number;
  turnoverCost: number;
  managementCost: number;
  totalHiddenCosts: number;
  totalInvestment: number;
  costPerCoveredProvider: number;
  monthlySpend: number;
  fullCoverageCost: number;
  threeYearInvestment: number;
  abridgeCost: number;
  threeYearSavings: number;
}

interface SwitchScribesFlowProps {
  onBack: () => void;
  onBackToJourney: () => void;
}

export default function SwitchScribesFlow({ onBack, onBackToJourney }: SwitchScribesFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [scribeData, setScribeData] = useState<ScribeData>({
    totalProviders: null,
    annualEncounters: null,
    providersWithScribes: null,
    hourlyRate: 22,
    hoursPerWeek: 32,
    turnoverRate: 35,
    managementHoursPerWeek: 6,
    managementHourlyRate: 60,
    recruitmentCostPerScribe: 4000
  });
  
  const totalSteps = 5;
  
  const goNext = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const goBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const calculateScribeMetrics = (): ScribeCalculations => {
    const { totalProviders, providersWithScribes, hourlyRate, hoursPerWeek, turnoverRate, managementHoursPerWeek, managementHourlyRate, recruitmentCostPerScribe } = scribeData;
    
    const coveragePercent = totalProviders && providersWithScribes !== null
      ? Math.round((providersWithScribes / totalProviders) * 100)
      : 0;
    
    const providersWithoutScribes = totalProviders && providersWithScribes !== null
      ? totalProviders - providersWithScribes
      : 0;
    
    const annualScribePayroll = providersWithScribes && hourlyRate && hoursPerWeek
      ? providersWithScribes * hourlyRate * hoursPerWeek * 50
      : 0;
    
    const turnoverCost = providersWithScribes && turnoverRate && recruitmentCostPerScribe
      ? Math.round(providersWithScribes * (turnoverRate / 100)) * recruitmentCostPerScribe
      : 0;
    
    const managementCost = managementHoursPerWeek && managementHourlyRate
      ? managementHoursPerWeek * managementHourlyRate * 50
      : 0;
    
    const totalHiddenCosts = turnoverCost + managementCost;
    const totalInvestment = annualScribePayroll + totalHiddenCosts;
    
    const costPerCoveredProvider = providersWithScribes
      ? Math.round(totalInvestment / providersWithScribes)
      : 0;
    
    const monthlySpend = Math.round(totalInvestment / 12);
    
    const costPerScribe = hourlyRate * hoursPerWeek * 50;
    const fullCoverageCost = totalProviders
      ? totalProviders * costPerScribe
      : 0;
    
    const threeYearInvestment = totalInvestment * 3;
    
    const abridgeCostPerProvider = 3600;
    const abridgeCost = totalProviders ? totalProviders * abridgeCostPerProvider : 0;
    const threeYearSavings = Math.max(0, threeYearInvestment - (abridgeCost * 3));
    
    return {
      coveragePercent,
      providersWithoutScribes,
      annualScribePayroll,
      turnoverCost,
      managementCost,
      totalHiddenCosts,
      totalInvestment,
      costPerCoveredProvider,
      monthlySpend,
      fullCoverageCost,
      threeYearInvestment,
      abridgeCost,
      threeYearSavings
    };
  };
  
  const calculations = calculateScribeMetrics();
  
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {currentStep === 1 && (
        <SwitchScribesSetup
          data={scribeData}
          setData={setScribeData}
          calculations={calculations}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 2 && (
        <SwitchScribesCoverage
          data={scribeData}
          calculations={calculations}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 3 && (
        <SwitchScribesHiddenCosts
          data={scribeData}
          setData={setScribeData}
          calculations={calculations}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 4 && (
        <SwitchScribesFullPicture
          data={scribeData}
          calculations={calculations}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 5 && (
        <SwitchScribesComparison
          data={scribeData}
          calculations={calculations}
          currentStep={currentStep}
          totalSteps={totalSteps}
          onBack={goBack}
          onBackToJourney={onBackToJourney}
        />
      )}
    </div>
  );
}
