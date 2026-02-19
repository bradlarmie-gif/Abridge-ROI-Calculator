import { useCallback } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { CinematicTransition } from "@/components/CinematicTransition";
import PillarProgressBar from "@/components/PillarProgressBar";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import StepEntryGate from "./narrative-steps/StepEntryGate";
import StepHiddenOperatingSystem from "./narrative-steps/StepHiddenOperatingSystem";
import StepYourOrganization from "./narrative-steps/StepYourOrganization";
import StepMeasurementReality from "./narrative-steps/StepMeasurementReality";
import StepBenchmarkMirror from "./narrative-steps/StepBenchmarkMirror";
import StepEnterprisePressureMap from "./narrative-steps/StepEnterprisePressureMap";
import StepPillarCapacity from "./narrative-steps/StepPillarCapacity";
import StepPillarYield from "./narrative-steps/StepPillarYield";
import StepPillarWorkforce from "./narrative-steps/StepPillarWorkforce";
import StepPillarRisk from "./narrative-steps/StepPillarRisk";
import StepEnterpriseCaptureScore from "./narrative-steps/StepEnterpriseCaptureScore";
import StepEnterpriseValueSynthesis from "./narrative-steps/StepEnterpriseValueSynthesis";
import StepTheMath from "./narrative-steps/StepTheMath";
import StepTheInvitation from "./narrative-steps/StepTheInvitation";

interface AmbientNarrativeFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const TOTAL_STEPS = 14;

const STEPS = [
  { id: 1, name: "Entry", shortName: "Entry" },
  { id: 2, name: "The Hidden Operating System", shortName: "Thesis" },
  { id: 3, name: "Your Organization", shortName: "Org" },
  { id: 4, name: "Uncertainty Calibration", shortName: "Calibrate" },
  { id: 5, name: "Benchmark Mirror", shortName: "Benchmark" },
  { id: 6, name: "Enterprise Focus", shortName: "Focus" },
  { id: 7, name: "Capacity Creation", shortName: "Capacity" },
  { id: 8, name: "Revenue & Yield", shortName: "Yield" },
  { id: 9, name: "Workforce Stability", shortName: "Workforce" },
  { id: 10, name: "Enterprise Risk", shortName: "Risk" },
  { id: 11, name: "Enterprise Capture Score", shortName: "Score" },
  { id: 12, name: "Enterprise Value Synthesis", shortName: "Synthesis" },
  { id: 13, name: "The Cost of Inaction", shortName: "Inaction" },
  { id: 14, name: "Documentation Intelligence Gap", shortName: "Gap" },
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

  const canProceedFromStep3 = 
    inputs.providers > 0 && 
    inputs.annualEncounters > 0;

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_STEPS) return;
    if (step > currentStep && !canProceedFromStep3 && currentStep === 3) return;
    
    dispatch(assessmentActions.setStep(step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentStep === 3 && !canProceedFromStep3) return;
    
    if (currentStep === 13) {
      dispatch(assessmentActions.showLoading(true));
    } else {
      dispatch(assessmentActions.completeStep(currentStep));
      goToStep(currentStep + 1);
    }
  };

  const handleTransitionMidpoint = useCallback(() => {
    dispatch(assessmentActions.completeStep(13));
    dispatch(assessmentActions.setStep(14));
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
          <StepEntryGate
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <StepHiddenOperatingSystem
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <StepYourOrganization 
            {...commonProps} 
            canProceed={canProceedFromStep3}
          />
        );
      case 4:
        return (
          <StepMeasurementReality
            inputs={inputs}
            updateInput={updateInput}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <StepBenchmarkMirror
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        return (
          <StepEnterprisePressureMap
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 7:
        return (
          <StepPillarCapacity
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 8:
        return (
          <StepPillarYield
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 9:
        return (
          <StepPillarWorkforce
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 10:
        return (
          <StepPillarRisk
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 11:
        return (
          <StepEnterpriseCaptureScore
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 12:
        return (
          <StepEnterpriseValueSynthesis
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 13:
        return <StepTheMath {...commonProps} />;
      case 14:
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

  const isEntryGate = currentStep === 1;
  const isScoreReveal = currentStep === 11;

  const containerWidth = (() => {
    if (isEntryGate || isScoreReveal) return "max-w-2xl";
    if (currentStep === 2) return "max-w-2xl";
    if (currentStep <= 4 || (currentStep >= 7 && currentStep <= 10)) return "max-w-6xl";
    if (currentStep === 5) return "max-w-3xl";
    if (currentStep === 12) return "max-w-4xl";
    return "max-w-3xl";
  })();

  const showHeader = !isEntryGate;
  const showProgressBar = !isEntryGate && !isScoreReveal;

  return (
    <>
      <CinematicTransition 
        isVisible={showLoadingOverlay} 
        onMidpoint={handleTransitionMidpoint}
        onComplete={handleTransitionComplete}
      />
      <div className="min-h-screen bg-white">
        {showHeader && (
          <>
            <UnifiedHeader 
              pathType="switch"
              currentStep={currentStep} 
              totalSteps={TOTAL_STEPS}
              stepName={STEPS[currentStep - 1]?.name || ""}
              onBack={handleBack}
              onHome={onBackToJourney}
            />
            <UnifiedHeaderSpacer />
          </>
        )}

        <main className={`mx-auto px-4 md:px-6 ${isEntryGate ? "" : "py-6 md:py-8 pb-12 md:pb-16"} ${containerWidth}`}>
          {showProgressBar && (
            <PillarProgressBar
              currentStep={currentStep}
              completedSteps={completedSteps}
              totalSteps={TOTAL_STEPS}
              steps={STEPS}
            />
          )}
          <PageTransition pageKey={`narrative-step-${currentStep}`}>
            {renderStep()}
          </PageTransition>
        </main>
      </div>
    </>
  );
}
