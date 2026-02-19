import { useCallback } from "react";
import { PageTransition } from "@/components/PageTransition";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';
import StepEntryGate from "./narrative-steps/StepEntryGate";
import StepYourOrganization from "./narrative-steps/StepYourOrganization";
import StepCurrentPerformance from "./narrative-steps/StepCurrentPerformance";
import StepUtilizationReality from "./narrative-steps/StepUtilizationReality";
import StepEfficiencyReality from "./narrative-steps/StepEfficiencyReality";
import StepBenchmarkMirror from "./narrative-steps/StepBenchmarkMirror";
import StepTheInvitation from "./narrative-steps/StepTheInvitation";

interface AmbientNarrativeFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const TOTAL_STEPS = 8;

export default function AmbientNarrativeFlow({
  onBack,
  onBackToJourney,
}: AmbientNarrativeFlowProps) {
  const { state, dispatch, calculations } = useAssessment();
  const { inputs } = state;
  const { currentStep } = state.navigation;

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const canProceedFromStep2 =
    inputs.providers > 0 &&
    inputs.annualEncounters > 0;

  const MAX_BUILT_STEP = 6;

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_STEPS) return;
    if (step > MAX_BUILT_STEP) return;
    if (step > currentStep && !canProceedFromStep2 && currentStep === 2) return;

    dispatch(assessmentActions.setStep(step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentStep === 2 && !canProceedFromStep2) return;
    if (currentStep >= MAX_BUILT_STEP) return;
    dispatch(assessmentActions.completeStep(currentStep));
    goToStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 1) {
      onBack();
    } else {
      goToStep(currentStep - 1);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBackToJourney) {
      onBackToJourney();
    } else {
      window.location.href = "/";
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
        return <StepEntryGate onNext={handleNext} />;
      case 2:
        return (
          <StepYourOrganization
            {...commonProps}
            canProceed={canProceedFromStep2}
          />
        );
      case 3:
        return (
          <StepCurrentPerformance
            inputs={inputs}
            updateInput={updateInput}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <StepUtilizationReality
            inputs={inputs}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return (
          <StepEfficiencyReality
            inputs={inputs}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 6:
        return (
          <StepBenchmarkMirror
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 7:
        return null;
      case 8:
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

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Manrope, sans-serif" }}>
      {!isEntryGate && (
        <header className="fixed top-0 left-0 right-0 bg-white border-b border-[#E8E8E8] z-50 h-14">
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-full flex items-center justify-between">
            <a
              href="/"
              onClick={handleLogoClick}
              className="flex items-center transition-opacity hover:opacity-70 cursor-pointer"
              data-testid="link-logo-home"
            >
              <img src={abridgeLogo} alt="Abridge" className="h-5" />
            </a>

            <div className="flex gap-1.5 items-center" data-testid="progress-dots">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;

                return (
                  <span
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      isActive
                        ? "w-5 h-2 bg-[#EA2C00]"
                        : isCompleted
                          ? "w-1.5 h-1.5 bg-[#1A1A1A]"
                          : "w-1.5 h-1.5 bg-[#E8E8E8]"
                    }`}
                    data-testid={`progress-dot-${stepNum}`}
                  />
                );
              })}
            </div>
          </div>
        </header>
      )}

      {!isEntryGate && <div className="h-14" />}

      <main className={`mx-auto px-6 md:px-10 ${isEntryGate ? "" : ""} max-w-[1200px]`}>
        <PageTransition pageKey={`narrative-step-${currentStep}`}>
          {renderStep()}
        </PageTransition>
      </main>
    </div>
  );
}
