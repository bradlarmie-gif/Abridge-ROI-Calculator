import { useState } from "react";
import type { SwitchInputs } from "@/lib/switchGapCalculator";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import type { Domain } from "./ambient/domainCalculations";
import { PageTransition } from "@/components/PageTransition";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";

import Screen2Baseline from "./ambient/Screen2Baseline";
import Screen3Domains from "./ambient/Screen4Domains";
import Screen4Score from "./ambient/Screen3Score";
import Screen5Gap from "./ambient/Screen5Gap";
import Screen6Invitation from "./ambient/Screen6Invitation";

interface AmbientNarrativeFlowProps {
  onBack: () => void;
  onBackToJourney?: () => void;
  onNavigateToExplore?: (providers: number, encounters: number) => void;
}

const TOTAL_SCREENS = 5;

const STEP_NAMES = [
  "Your Deployment",
  "Four Domains",
  "The Reveal",
  "Your Trajectory",
  "Your Roadmap",
];

export default function AmbientNarrativeFlow({
  onBack,
  onBackToJourney,
  onNavigateToExplore,
}: AmbientNarrativeFlowProps) {
  const [initialDomain, setInitialDomain] = useState<Domain>('capacity');
  const { state, dispatch } = useAssessment();
  const { inputs } = state;
  const currentStep = state.navigation.currentStep;

  const updateInput = <K extends keyof SwitchInputs>(key: K, value: SwitchInputs[K]) => {
    dispatch(assessmentActions.updateInput(key, value));
  };

  const canProceedFromBaseline = inputs.providers > 0 && inputs.annualEncounters > 0 && inputs.utilization > 0;

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_SCREENS) return;
    if (step > currentStep && currentStep === 1 && !canProceedFromBaseline) return;
    dispatch(assessmentActions.setStep(step));
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }, 50);
  };

  const handleNext = () => {
    if (currentStep === 1 && !canProceedFromBaseline) return;
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

  const handleHome = () => {
    if (onBackToJourney) onBackToJourney();
    else window.location.href = "/";
  };

  const renderScreen = () => {
    switch (currentStep) {
      case 1:
        return <Screen2Baseline inputs={inputs} updateInput={updateInput} onNext={handleNext} onBack={handleBack} />;
      case 2:
        return <Screen3Domains onNext={handleNext} onBack={handleBack} initialDomain={initialDomain} />;
      case 3:
        return <Screen4Score onNext={handleNext} onBack={handleBack} onNavigateToDomain={(domain) => { setInitialDomain(domain); goToStep(2); }} />;
      case 4:
        return <Screen5Gap onNext={handleNext} onBack={handleBack} onNavigateToBaseline={() => goToStep(1)} />;
      case 5:
        return <Screen6Invitation onBack={handleBack} onBackToJourney={onBackToJourney} onNavigateToExplore={onNavigateToExplore} />;
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
        <PageTransition pageKey={`ambient-screen-${currentStep}`}>
          {renderScreen()}
        </PageTransition>
      </main>
    </div>
  );
}
