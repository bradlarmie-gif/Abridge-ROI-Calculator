import { useState } from "react";
import SwitchAssessment from "./SwitchAssessment";
import SwitchFullAnalysis from "./SwitchFullAnalysis";
import { type SwitchInputs, type SolutionType } from "@/lib/switchGapCalculator";

interface SwitchUnifiedFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
}

export default function SwitchUnifiedFlow({ onBack, onBackToJourney }: SwitchUnifiedFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  
  const [inputs, setInputs] = useState<SwitchInputs>({
    solution: "ambient-ai" as SolutionType,
    providers: 75,
    annualEncounters: 150000,
    currentCostPerProvider: 200,
    utilization: 45,
    timeSavedPerEncounter: 2,
    wrvuLift: 2, // Start at 2% lift
  });

  const goNext = () => {
    setCurrentStep(2);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      setCurrentStep(1);
      window.scrollTo(0, 0);
    }
  };

  if (currentStep === 2) {
    return (
      <SwitchFullAnalysis
        inputs={inputs}
        onBack={goBack}
        onBackToJourney={onBackToJourney}
      />
    );
  }

  return (
    <SwitchAssessment
      inputs={inputs}
      setInputs={setInputs}
      onNext={goNext}
      onBack={goBack}
      onBackToJourney={onBackToJourney}
    />
  );
}
