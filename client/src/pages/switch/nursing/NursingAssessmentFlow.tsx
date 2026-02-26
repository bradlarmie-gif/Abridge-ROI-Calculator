import { useState, useCallback } from "react";
import { PageTransition } from "@/components/PageTransition";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import type { NursingDomain, NursingDomainState, NursingBaselineInputs } from "./nursingTypes";
import { DEFAULT_BASELINE, createEmptyDomainStates } from "./nursingTypes";
import { hasAnyDomainSelected } from "./nursingCalculations";
import NursingScreen1Program from "./NursingScreen1Program";
import NursingDomainScreen from "./NursingDomainScreen";
import NursingScoreScreen from "./NursingScoreScreen";
import NursingPrioritiesScreen from "./NursingPrioritiesScreen";
import NursingNextStepScreen from "./NursingNextStepScreen";

interface NursingAssessmentFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
}

const TOTAL_SCREENS = 5;

const STEP_NAMES = [
  "Your Program",
  "Pressure Points",
  "Assessment",
  "Priorities",
  "Next Steps",
];

export default function NursingAssessmentFlow({ onBack, onBackToJourney }: NursingAssessmentFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [baseline, setBaseline] = useState<NursingBaselineInputs>({ ...DEFAULT_BASELINE });
  const [domainStates, setDomainStates] = useState<Record<NursingDomain, NursingDomainState>>(createEmptyDomainStates);

  const updateBaseline = useCallback(<K extends keyof NursingBaselineInputs>(key: K, value: NursingBaselineInputs[K]) => {
    setBaseline(prev => ({ ...prev, [key]: value }));
  }, []);

  const canProceedFromProgram = baseline.staffedBeds > 0 && baseline.nurseFTEs > 0;
  const canProceedFromDomains = hasAnyDomainSelected(domainStates);

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_SCREENS) return;
    if (step > currentStep && currentStep === 1 && !canProceedFromProgram) return;
    if (step > 2 && !canProceedFromDomains) return;
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    if (currentStep === 1 && !canProceedFromProgram) return;
    if (currentStep === 2 && !canProceedFromDomains) return;
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
          <NursingDomainScreen
            baseline={baseline}
            domainStates={domainStates}
            setDomainStates={setDomainStates}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <NursingScoreScreen
            baseline={baseline}
            domainStates={domainStates}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <NursingPrioritiesScreen
            baseline={baseline}
            domainStates={domainStates}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <NursingNextStepScreen
            baseline={baseline}
            domainStates={domainStates}
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
