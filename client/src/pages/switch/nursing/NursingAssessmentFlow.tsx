import { useState, useCallback } from "react";
import { PageTransition } from "@/components/PageTransition";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import type { NursingPriority, NursingBaselineInputs } from "./nursingTypes";
import { DEFAULT_BASELINE } from "./nursingTypes";
import NursingScreen1Program from "./NursingScreen1Program";
import NursingScreen2Priorities from "./NursingScreen2Priorities";
import NursingScreen3Connections from "./NursingScreen3Connections";
import NursingScreen4Alignment from "./NursingScreen4Alignment";
import NursingNextStepScreen from "./NursingNextStepScreen";

interface NursingAssessmentFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
}

const TOTAL_SCREENS = 5;

const STEP_NAMES = [
  "Your Program",
  "Priorities",
  "Where Ambient Fits",
  "Your Investment Case",
  "Next Steps",
];

export default function NursingAssessmentFlow({ onBack, onBackToJourney }: NursingAssessmentFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [baseline, setBaseline] = useState<NursingBaselineInputs>({ ...DEFAULT_BASELINE });
  const [selectedPriorities, setSelectedPriorities] = useState<NursingPriority[]>([]);

  const updateBaseline = useCallback(<K extends keyof NursingBaselineInputs>(key: K, value: NursingBaselineInputs[K]) => {
    setBaseline(prev => ({ ...prev, [key]: value }));
  }, []);

  const canProceedFromProgram = baseline.staffedBeds > 0 && baseline.nurseFTEs > 0;
  const canProceedFromPriorities = selectedPriorities.length > 0;

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_SCREENS) return;
    if (step > 1 && !canProceedFromProgram) return;
    if (step > 2 && !canProceedFromPriorities) return;
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    if (currentStep === 1 && !canProceedFromProgram) return;
    if (currentStep === 2 && !canProceedFromPriorities) return;
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
        return (
          <NursingScreen1Program
            baseline={baseline}
            updateBaseline={updateBaseline}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <NursingScreen2Priorities
            baseline={baseline}
            selectedPriorities={selectedPriorities}
            setSelectedPriorities={setSelectedPriorities}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <NursingScreen3Connections
            baseline={baseline}
            selectedPriorities={selectedPriorities}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <NursingScreen4Alignment
            baseline={baseline}
            selectedPriorities={selectedPriorities}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <NursingNextStepScreen
            baseline={baseline}
            selectedPriorities={selectedPriorities}
            onBack={handleBack}
          />
        );
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
