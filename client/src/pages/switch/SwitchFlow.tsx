import { useState } from "react";
import SwitchSolutionSelection from "./SwitchSolutionSelection";
import SwitchScribesFlow from "./SwitchScribesFlow";
import SwitchAmbientFlow from "./SwitchAmbientFlow";

type SolutionType = "ambient-ai" | "human-scribes";

interface SwitchFlowProps {
  onBackToJourney?: () => void;
}

export interface SwitchState {
  solution: SolutionType | null;
}

export function SwitchFlow({ onBackToJourney }: SwitchFlowProps) {
  const [selectedFlow, setSelectedFlow] = useState<SolutionType | null>(null);
  
  const [switchState, setSwitchState] = useState<SwitchState>({
    solution: null,
  });

  const goBackToJourney = () => onBackToJourney?.();
  
  const handleBack = () => {
    setSelectedFlow(null);
    setSwitchState({ solution: null });
  };

  const handleNext = () => {
    if (switchState.solution) {
      setSelectedFlow(switchState.solution);
    }
  };

  const updateSwitchState = (updates: Partial<SwitchState>) => {
    setSwitchState((prev) => ({ ...prev, ...updates }));
  };

  if (selectedFlow === "human-scribes") {
    return (
      <SwitchScribesFlow 
        onBack={handleBack}
        onBackToJourney={goBackToJourney}
      />
    );
  }

  if (selectedFlow === "ambient-ai") {
    return (
      <SwitchAmbientFlow 
        onBack={handleBack}
        onBackToJourney={goBackToJourney}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <SwitchSolutionSelection
        currentStep={1}
        switchState={switchState}
        onUpdate={updateSwitchState}
        onNext={handleNext}
        onBack={goBackToJourney}
      />
    </div>
  );
}
