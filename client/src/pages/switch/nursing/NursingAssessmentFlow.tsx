import { useState, useCallback } from "react";
import { PageTransition } from "@/components/PageTransition";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import type { NursingInputs } from "./nursingTypes";
import { DEFAULT_NURSING_INPUTS } from "./nursingTypes";
import NursingScreen1Program from "./NursingScreen1Program";
import NursingScreen2Burden from "./NursingScreen2Burden";
import NursingScreen3Pathways from "./NursingScreen3Pathways";
import NursingScreen4Summary from "./NursingScreen4Summary";
import NursingScreen5NextStep from "./NursingScreen5NextStep";

interface NursingAssessmentFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
}

const TOTAL_SCREENS = 5;

const STEP_NAMES = [
  "Your Program",
  "Documentation Burden",
  "Value Pathways",
  "Summary",
  "Next Steps",
];

export default function NursingAssessmentFlow({ onBack, onBackToJourney }: NursingAssessmentFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [inputs, setInputs] = useState<NursingInputs>({ ...DEFAULT_NURSING_INPUTS });

  const updateInput = useCallback(<K extends keyof NursingInputs>(key: K, value: NursingInputs[K]) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);

  const canProceedFromProgram = inputs.staffedBeds > 0 && inputs.nurseFTEs > 0;

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_SCREENS) return;
    if (step > currentStep && currentStep === 1 && !canProceedFromProgram) return;
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    if (currentStep === 1 && !canProceedFromProgram) return;
    goToStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      goToStep(currentStep - 1);
    }
  };

  const handleHome = () => {
    if (onBackToJourney) onBackToJourney();
    else window.location.href = "/";
  };

  const renderScreen = () => {
    switch (currentStep) {
      case 1:
        return <NursingScreen1Program inputs={inputs} updateInput={updateInput} onNext={handleNext} onBack={handleBack} />;
      case 2:
        return <NursingScreen2Burden inputs={inputs} updateInput={updateInput} onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <NursingScreen3Pathways inputs={inputs} updateInput={updateInput} onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <NursingScreen4Summary inputs={inputs} onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <NursingScreen5NextStep inputs={inputs} onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="switch"
        currentStep={currentStep}
        totalSteps={TOTAL_SCREENS}
        stepName={STEP_NAMES[currentStep - 1]}
        onBack={handleBack}
        showBack={currentStep > 0}
        onHome={handleHome}
      />
      <UnifiedHeaderSpacer />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <PageTransition pageKey={`nursing-screen-${currentStep}`}>
          {renderScreen()}
        </PageTransition>
      </main>
    </div>
  );
}
