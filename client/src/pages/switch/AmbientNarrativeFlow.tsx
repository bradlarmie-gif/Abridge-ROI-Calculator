import { useCallback } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { CinematicTransition } from "@/components/CinematicTransition";
import PillarProgressBar from "@/components/PillarProgressBar";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import StepHiddenOperatingSystem from "./narrative-steps/StepHiddenOperatingSystem";
import StepYourOrganization from "./narrative-steps/StepYourOrganization";
import StepMeasurementReality from "./narrative-steps/StepMeasurementReality";
import StepEnterprisePressureMap from "./narrative-steps/StepEnterprisePressureMap";
import StepPillarCapacity from "./narrative-steps/StepPillarCapacity";
import StepPillarYield from "./narrative-steps/StepPillarYield";
import StepPillarWorkforce from "./narrative-steps/StepPillarWorkforce";
import StepPillarRisk from "./narrative-steps/StepPillarRisk";
import StepEnterpriseValueSynthesis from "./narrative-steps/StepEnterpriseValueSynthesis";
import StepTheMath from "./narrative-steps/StepTheMath";
import StepTheInvitation from "./narrative-steps/StepTheInvitation";

interface AmbientNarrativeFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const TOTAL_STEPS = 11;

const STEPS = [
  { id: 1, name: "The Hidden Operating System", shortName: "Thesis" },
  { id: 2, name: "Your Organization", shortName: "Org" },
  { id: 3, name: "Uncertainty Calibration", shortName: "Calibrate" },
  { id: 4, name: "Enterprise Focus", shortName: "Focus" },
  { id: 5, name: "Capacity Engine", shortName: "Capacity" },
  { id: 6, name: "Revenue & Yield", shortName: "Yield" },
  { id: 7, name: "Workforce Stability", shortName: "Workforce" },
  { id: 8, name: "Enterprise Risk", shortName: "Risk" },
  { id: 9, name: "Enterprise Value Synthesis", shortName: "Synthesis" },
  { id: 10, name: "The Compounding Effect", shortName: "Compound" },
  { id: 11, name: "Enterprise Summary", shortName: "Summary" },
];

export default function AmbientNarrativeFlow({
  onBack,
  onBackToJourney,
  onNavigateToExplore,
}: AmbientNarrativeFlowProps) {
  const { state, dispatch, calculations } = useAssessment();
  const { inputs } = state;
  const { currentStep, completedSteps, showLoadingOverlay } = state.navigation;

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const canProceedFromStep2 = 
    inputs.providers > 0 && 
    inputs.annualEncounters > 0;

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_STEPS) return;
    if (step > currentStep && !canProceedFromStep2 && currentStep === 2) return;
    
    dispatch(assessmentActions.setStep(step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentStep === 2 && !canProceedFromStep2) return;
    
    if (currentStep === 10) {
      dispatch(assessmentActions.showLoading(true));
    } else {
      dispatch(assessmentActions.completeStep(currentStep));
      goToStep(currentStep + 1);
    }
  };

  const handleTransitionMidpoint = useCallback(() => {
    dispatch(assessmentActions.completeStep(10));
    dispatch(assessmentActions.setStep(11));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dispatch]);

  const handleTransitionComplete = useCallback(() => {
    dispatch(assessmentActions.showLoading(false));
  }, [dispatch]);

  const handleBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      goToStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    const commonProps = {
      inputs,
      updateInput,
      calculations,
      onNext: handleNext,
      onBack: handleBack,
    };

    switch (currentStep) {
      case 1:
        return (
          <StepHiddenOperatingSystem
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <StepYourOrganization 
            {...commonProps} 
            canProceed={canProceedFromStep2}
          />
        );
      case 3:
        return (
          <StepMeasurementReality
            inputs={inputs}
            updateInput={updateInput}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <StepEnterprisePressureMap
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <StepPillarCapacity
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        return (
          <StepPillarYield
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 7:
        return (
          <StepPillarWorkforce
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 8:
        return (
          <StepPillarRisk
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 9:
        return (
          <StepEnterpriseValueSynthesis
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 10:
        return <StepTheMath {...commonProps} />;
      case 11:
        return (
          <StepTheInvitation 
            {...commonProps} 
            onBackToJourney={onBackToJourney}
          />
        );
      default:
        return null;
    }
  };

  const containerWidth = (() => {
    if (currentStep === 1) return "max-w-2xl";
    if (currentStep <= 3 || (currentStep >= 5 && currentStep <= 8)) return "max-w-6xl";
    if (currentStep === 9) return "max-w-4xl";
    return "max-w-3xl";
  })();

  return (
    <>
      <CinematicTransition 
        isVisible={showLoadingOverlay} 
        onMidpoint={handleTransitionMidpoint}
        onComplete={handleTransitionComplete}
      />
      <div className="min-h-screen bg-white">
        <UnifiedHeader 
          pathType="switch"
          currentStep={currentStep} 
          totalSteps={TOTAL_STEPS}
          stepName={STEPS[currentStep - 1]?.name || ""}
          onBack={handleBack}
          onHome={onBackToJourney}
        />
        <UnifiedHeaderSpacer />

        <main className={`mx-auto px-4 md:px-6 py-6 md:py-8 pb-12 md:pb-16 ${containerWidth}`}>
          <PillarProgressBar
            currentStep={currentStep}
            completedSteps={completedSteps}
            totalSteps={TOTAL_STEPS}
            steps={STEPS}
          />
          <PageTransition pageKey={`narrative-step-${currentStep}`}>
            {renderStep()}
          </PageTransition>
        </main>
      </div>
    </>
  );
}
