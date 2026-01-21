import { useState } from "react";
import SwitchSolutionSelection from "./SwitchSolutionSelection";
import SwitchMetricAwareness from "./SwitchMetricAwareness";
import SwitchFramework from "./SwitchFramework";
import SwitchYourSituation from "./SwitchYourSituation";
import SwitchComparison from "./SwitchComparison";
import SwitchWhatThisMeans from "./SwitchWhatThisMeans";
import SwitchScribesFlow from "./SwitchScribesFlow";

type SolutionType = "ambient-ai" | "human-scribes";
type CareSetting = "outpatient" | "ed" | "inpatient" | "nursing";
type MetricKnowledge = "know" | "rough" | "dont-track";
type ScaleRange = "<25" | "25-50" | "50-100" | "100-200" | "200+";
type UtilizationRange = "not-sure" | "30-40" | "45-55" | "60+";
type EfficiencyRange = "not-sure" | "1-2" | "2-3" | "3+";

interface SwitchFlowProps {
  onBackToJourney?: () => void;
}

export interface SwitchState {
  solution: SolutionType | null;
  careSetting: CareSetting | null;
  metricAwareness: {
    utilization: MetricKnowledge | null;
    efficiency: MetricKnowledge | null;
    quality: MetricKnowledge | null;
  };
  situation: {
    scale: ScaleRange | null;
    utilization: UtilizationRange | null;
    efficiency: EfficiencyRange | null;
  };
}

export function SwitchFlow({ onBackToJourney }: SwitchFlowProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [showScribesFlow, setShowScribesFlow] = useState(false);
  
  const [switchState, setSwitchState] = useState<SwitchState>({
    solution: null,
    careSetting: null,
    metricAwareness: {
      utilization: null,
      efficiency: null,
      quality: null,
    },
    situation: {
      scale: null,
      utilization: null,
      efficiency: null,
    },
  });

  const goNext = () => {
    if (currentStep === 1 && switchState.solution === "human-scribes") {
      setShowScribesFlow(true);
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, 6) as 1 | 2 | 3 | 4 | 5 | 6);
    }
  };
  
  const goBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4 | 5 | 6);
  const goBackToJourney = () => onBackToJourney?.();
  
  const handleScribesBack = () => {
    setShowScribesFlow(false);
    setSwitchState((prev) => ({ ...prev, solution: null }));
  };

  const updateSwitchState = (updates: Partial<SwitchState>) => {
    setSwitchState((prev) => ({ ...prev, ...updates }));
  };

  if (showScribesFlow) {
    return (
      <SwitchScribesFlow 
        onBack={handleScribesBack}
        onBackToJourney={goBackToJourney}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {currentStep === 1 && (
        <SwitchSolutionSelection
          currentStep={currentStep}
          switchState={switchState}
          onUpdate={updateSwitchState}
          onNext={goNext}
          onBack={goBackToJourney}
        />
      )}
      {currentStep === 2 && (
        <SwitchMetricAwareness
          currentStep={currentStep}
          switchState={switchState}
          onUpdate={updateSwitchState}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 3 && (
        <SwitchFramework
          currentStep={currentStep}
          switchState={switchState}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 4 && (
        <SwitchYourSituation
          currentStep={currentStep}
          switchState={switchState}
          onUpdate={updateSwitchState}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 5 && (
        <SwitchComparison
          currentStep={currentStep}
          switchState={switchState}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === 6 && (
        <SwitchWhatThisMeans
          currentStep={currentStep}
          switchState={switchState}
          onBack={goBack}
          onBackToJourney={goBackToJourney}
        />
      )}
    </div>
  );
}
