import { useState } from "react";
import SwitchAssessment from "./SwitchAssessment";
import SwitchFullAnalysis from "./SwitchFullAnalysis";
import ScribeAssessment from "./ScribeAssessment";
import ScribeFullAnalysis from "./ScribeFullAnalysis";
import { type SwitchInputs, type SolutionType } from "@/lib/switchGapCalculator";
import { type ScribeInputs } from "@/lib/scribeGapCalculator";

interface SwitchUnifiedFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onExploreAmbientAI?: (providers: number, encounters: number) => void;
}

export default function SwitchUnifiedFlow({ onBack, onBackToJourney, onExploreAmbientAI }: SwitchUnifiedFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [solutionType, setSolutionType] = useState<SolutionType>("ambient-ai");
  
  const [ambientInputs, setAmbientInputs] = useState<SwitchInputs>({
    solution: "ambient-ai" as SolutionType,
    providers: 75,
    annualEncounters: 150000,
    currentCostPerProvider: 200,
    utilization: 45,
    timeSavedPerEncounter: 2,
    wrvuLift: 2,
    satisfaction: 65,
  });

  const [scribeInputs, setScribeInputs] = useState<ScribeInputs>({
    scribeCount: 10,
    scribeCostPerHour: 25,
    scribeHoursPerWeek: 40,
    providersWithScribes: 15,
    totalProviders: 200,
    annualEncounters: 400000,
  });

  const handleAmbientInputsChange = (newInputs: React.SetStateAction<SwitchInputs>) => {
    setAmbientInputs(prev => {
      const updated = typeof newInputs === 'function' ? newInputs(prev) : newInputs;
      if (updated.solution !== solutionType) {
        setSolutionType(updated.solution);
      }
      return updated;
    });
  };

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

  if (solutionType === "human-scribes") {
    if (currentStep === 2) {
      return (
        <ScribeFullAnalysis
          inputs={scribeInputs}
          onBack={goBack}
          onBackToJourney={onBackToJourney}
          onExploreAmbientAI={onExploreAmbientAI}
        />
      );
    }

    return (
      <ScribeAssessment
        inputs={scribeInputs}
        setInputs={setScribeInputs}
        onNext={goNext}
        onBack={goBack}
        onBackToJourney={onBackToJourney}
      />
    );
  }

  if (currentStep === 2) {
    return (
      <SwitchFullAnalysis
        inputs={ambientInputs}
        onBack={goBack}
        onBackToJourney={onBackToJourney}
      />
    );
  }

  return (
    <SwitchAssessment
      inputs={ambientInputs}
      setInputs={handleAmbientInputsChange}
      onNext={goNext}
      onBack={goBack}
      onBackToJourney={onBackToJourney}
    />
  );
}
