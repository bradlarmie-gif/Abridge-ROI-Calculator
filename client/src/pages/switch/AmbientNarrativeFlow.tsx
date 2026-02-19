import { useCallback } from "react";
import { PageTransition } from "@/components/PageTransition";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import { DS } from "./ambient/designTokens";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

import Screen1Provocation from "./ambient/Screen1Provocation";
import Screen2Baseline from "./ambient/Screen2Baseline";
import Screen3Score from "./ambient/Screen3Score";
import Screen4Domains from "./ambient/Screen4Domains";
import Screen5Gap from "./ambient/Screen5Gap";
import Screen6Invitation from "./ambient/Screen6Invitation";

interface AmbientNarrativeFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const TOTAL_SCREENS = 6;

export default function AmbientNarrativeFlow({
  onBack,
  onBackToJourney,
}: AmbientNarrativeFlowProps) {
  const { state, dispatch } = useAssessment();
  const { inputs } = state;
  const currentStep = state.navigation.currentStep;

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const canProceedFromScreen2 = inputs.providers > 0 && inputs.annualEncounters > 0;

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_SCREENS) return;
    if (step > currentStep && currentStep === 2 && !canProceedFromScreen2) return;
    dispatch(assessmentActions.setStep(step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentStep === 2 && !canProceedFromScreen2) return;
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
    if (onBackToJourney) onBackToJourney();
    else window.location.href = "/";
  };

  const renderScreen = () => {
    switch (currentStep) {
      case 1:
        return <Screen1Provocation onNext={handleNext} />;
      case 2:
        return <Screen2Baseline inputs={inputs} updateInput={updateInput} onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <Screen3Score onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <Screen4Domains onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <Screen5Gap onNext={handleNext} onBack={handleBack} />;
      case 6:
        return <Screen6Invitation onBack={handleBack} onBackToJourney={onBackToJourney} />;
      default:
        return null;
    }
  };

  const isScreen1 = currentStep === 1;

  return (
    <div className="min-h-screen" style={{ backgroundColor: DS.bg, fontFamily: DS.font }}>
      {!isScreen1 && (
        <header
          className="fixed top-0 left-0 right-0 z-50"
          style={{ backgroundColor: DS.bg, borderBottom: `1px solid ${DS.border}`, height: 56 }}
        >
          <div className="max-w-[1200px] mx-auto px-6 md:px-12 h-full flex items-center justify-between">
            <a
              href="/"
              onClick={handleLogoClick}
              className="flex items-center transition-opacity hover:opacity-70 cursor-pointer"
              data-testid="link-logo-home"
            >
              <img src={abridgeLogo} alt="Abridge" className="h-5" />
            </a>

            <div className="flex items-center" style={{ gap: 6 }} data-testid="progress-dots">
              {Array.from({ length: TOTAL_SCREENS }, (_, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;

                return (
                  <span
                    key={i}
                    style={{
                      borderRadius: DS.radius.pill,
                      transition: 'all 200ms ease',
                      width: isActive ? 20 : 7,
                      height: isActive ? 8 : 7,
                      backgroundColor: isActive ? DS.red : isCompleted ? DS.black : DS.border,
                      display: 'inline-block',
                    }}
                    data-testid={`progress-dot-${stepNum}`}
                  />
                );
              })}
            </div>
          </div>
        </header>
      )}

      {!isScreen1 && <div style={{ height: 56 }} />}

      <main className="mx-auto px-6 md:px-12 max-w-[1200px]">
        <PageTransition pageKey={`ambient-screen-${currentStep}`}>
          {renderScreen()}
        </PageTransition>
      </main>
    </div>
  );
}
