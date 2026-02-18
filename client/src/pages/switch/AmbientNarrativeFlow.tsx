import { useCallback } from "react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { PageTransition } from "@/components/PageTransition";
import { CinematicTransition } from "@/components/CinematicTransition";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import StepYourOrganization from "./narrative-steps/StepYourOrganization";
import StepWhereYouAre from "./narrative-steps/StepWhereYouAre";
import StepTheGap from "./narrative-steps/StepTheGap";
import StepWhyThisHappens from "./narrative-steps/StepWhyThisHappens";
import StepWhatGoodLooksLike from "./narrative-steps/StepWhatGoodLooksLike";
import StepTheMath from "./narrative-steps/StepTheMath";
import StepTheInvitation from "./narrative-steps/StepTheInvitation";

interface AmbientNarrativeFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const STEPS = [
  { id: 1, name: "Your Organization", shortName: "Org" },
  { id: 2, name: "Where You Are", shortName: "Input" },
  { id: 3, name: "The Gap", shortName: "Gap" },
  { id: 4, name: "What Good Looks Like", shortName: "Proof" },
  { id: 5, name: "The Math", shortName: "Math" },
  { id: 6, name: "What It Takes", shortName: "How" },
  { id: 7, name: "The Opportunity", shortName: "Next" },
];

export default function AmbientNarrativeFlow({
  onBack,
  onBackToJourney,
  onNavigateToExplore,
}: AmbientNarrativeFlowProps) {
  const { state, dispatch, calculations } = useAssessment();
  const { inputs } = state;
  const { currentStep, completedSteps, showLoadingOverlay } = state.navigation;

  const completedSet = new Set(completedSteps);

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const canProceedFromStep1 = 
    inputs.providers > 0 && 
    inputs.annualEncounters > 0;

  const goToStep = (step: number) => {
    if (step < 1 || step > 7) return;
    if (step > currentStep && !canProceedFromStep1 && currentStep === 1) return;
    
    dispatch(assessmentActions.setStep(step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentStep === 1 && !canProceedFromStep1) return;
    
    if (currentStep === 6) {
      dispatch(assessmentActions.showLoading(true));
    } else {
      dispatch(assessmentActions.completeStep(currentStep));
      goToStep(currentStep + 1);
    }
  };

  const handleTransitionMidpoint = useCallback(() => {
    dispatch(assessmentActions.completeStep(6));
    dispatch(assessmentActions.setStep(7));
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

  const renderProgressIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6 md:mb-8">
      {STEPS.map((step) => {
        const isActive = step.id === currentStep;
        const isCompleted = completedSet.has(step.id);
        
        return (
          <button
            key={step.id}
            onClick={() => (isCompleted || step.id <= currentStep) && goToStep(step.id)}
            disabled={step.id > currentStep && !isCompleted}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isActive 
                ? "bg-[#EA2C00] scale-125" 
                : isCompleted 
                  ? "bg-[#EA2C00]/40 hover:bg-[#EA2C00]/60"
                  : "bg-[#D1D5DB] cursor-not-allowed"
            }`}
            data-testid={`step-indicator-${step.id}`}
            aria-label={`Step ${step.id}: ${step.name}`}
          />
        );
      })}
    </div>
  );

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
        return <StepWhereYouAre {...commonProps} />;
      case 3:
        return <StepTheGap {...commonProps} />;
      case 4:
        return <StepWhatGoodLooksLike {...commonProps} />;
      case 5:
        return <StepTheMath {...commonProps} />;
      case 6:
        return <StepWhyThisHappens {...commonProps} />;
      case 7:
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
          totalSteps={7}
          stepName={STEPS[currentStep - 1]?.name || ""}
          onBack={handleBack}
          onHome={onBackToJourney}
        />
        <UnifiedHeaderSpacer />

        <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-12 md:pb-16">
          <PageTransition pageKey={`narrative-step-${currentStep}`}>
            {renderStep()}
          </PageTransition>
        </main>
      </div>
    </>
  );
}
