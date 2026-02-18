import { useCallback } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { CinematicTransition } from "@/components/CinematicTransition";
import PillarProgressBar from "@/components/PillarProgressBar";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import StepYourOrganization from "./narrative-steps/StepYourOrganization";
import StepMeasurementReality from "./narrative-steps/StepMeasurementReality";
import StepEnterprisePressureMap from "./narrative-steps/StepEnterprisePressureMap";
import StepPillarCapacity from "./narrative-steps/StepPillarCapacity";
import StepPillarYield from "./narrative-steps/StepPillarYield";
import StepPillarWorkforce from "./narrative-steps/StepPillarWorkforce";
import StepPillarRisk from "./narrative-steps/StepPillarRisk";
import StepWhereYouAre from "./narrative-steps/StepWhereYouAre";
import StepEnterpriseValueMap from "./narrative-steps/StepEnterpriseValueMap";
import StepLeakageDrivers from "./narrative-steps/StepLeakageDrivers";
import StepWhyThisHappens from "./narrative-steps/StepWhyThisHappens";
import StepWhatGoodLooksLike from "./narrative-steps/StepWhatGoodLooksLike";
import StepTheMath from "./narrative-steps/StepTheMath";
import StepTheInvitation from "./narrative-steps/StepTheInvitation";

interface AmbientNarrativeFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const TOTAL_STEPS = 14;

const STEPS = [
  { id: 1, name: "Your Organization", shortName: "Org" },
  { id: 2, name: "Uncertainty Calibration", shortName: "Calibrate" },
  { id: 3, name: "Value Diagnostic", shortName: "Diagnostic" },
  { id: 4, name: "Capacity Engine", shortName: "Capacity" },
  { id: 5, name: "Revenue & Yield", shortName: "Yield" },
  { id: 6, name: "Workforce Stability", shortName: "Workforce" },
  { id: 7, name: "Enterprise Risk", shortName: "Risk" },
  { id: 8, name: "Where You Are", shortName: "Input" },
  { id: 9, name: "Value Map", shortName: "Value" },
  { id: 10, name: "Leakage Drivers", shortName: "Leakage" },
  { id: 11, name: "What Good Looks Like", shortName: "Proof" },
  { id: 12, name: "The Math", shortName: "Math" },
  { id: 13, name: "What It Takes", shortName: "How" },
  { id: 14, name: "The Opportunity", shortName: "Next" },
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

  const canProceedFromStep1 = 
    inputs.providers > 0 && 
    inputs.annualEncounters > 0;

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_STEPS) return;
    if (step > currentStep && !canProceedFromStep1 && currentStep === 1) return;
    
    dispatch(assessmentActions.setStep(step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentStep === 1 && !canProceedFromStep1) return;
    
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
          <StepYourOrganization 
            {...commonProps} 
            canProceed={canProceedFromStep1}
          />
        );
      case 2:
        return (
          <StepMeasurementReality
            inputs={inputs}
            updateInput={updateInput}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <StepEnterprisePressureMap
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <StepPillarCapacity
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <StepPillarYield
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        return (
          <StepPillarWorkforce
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 7:
        return (
          <StepPillarRisk
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 8:
        return <StepWhereYouAre {...commonProps} />;
      case 9:
        return (
          <StepEnterpriseValueMap
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 10:
        return (
          <StepLeakageDrivers
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 11:
        return <StepWhatGoodLooksLike {...commonProps} />;
      case 12:
        return <StepTheMath {...commonProps} />;
      case 13:
        return <StepWhyThisHappens {...commonProps} />;
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

        <main className={`mx-auto px-4 md:px-6 py-6 md:py-8 pb-12 md:pb-16 ${currentStep <= 2 ? "max-w-6xl" : "max-w-3xl"}`}>
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
