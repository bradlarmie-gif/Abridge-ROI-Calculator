import type { SwitchInputs } from "@/lib/switchGapCalculator";
import { useAssessment, assessmentActions } from "@/lib/assessment";
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

const TOTAL_SCREENS = 6;

const STEP_NAMES = [
  "Baseline",
  "Framework",
  "Domains",
  "Score",
  "Gap Analysis",
  "Summary",
];

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

  const canProceedFromBaseline = inputs.providers > 0 && inputs.annualEncounters > 0 && inputs.utilization > 0;

  const goToStep = (step: number) => {
    if (step < 1 || step > TOTAL_SCREENS) return;
    if (step > currentStep && currentStep === 1 && !canProceedFromBaseline) return;
    dispatch(assessmentActions.setStep(step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        return (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-[#1A1A1A] rounded-2xl p-10 md:p-14 max-w-[640px] w-full text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 font-abridge uppercase tracking-tight" data-testid="text-interstitial-heading">
                Most vendors measure one thing: time saved per encounter.
              </h1>
              <p className="text-lg text-white/70 mb-6" data-testid="text-interstitial-subheading">
                That's one dimension of a four-part value equation.
              </p>
              <p className="text-sm text-white/50 leading-relaxed mb-8" data-testid="text-interstitial-body">
                We're going to assess all four — because your actual ROI depends on what your organization does with that time across Capacity, Revenue, Workforce, and Risk.
              </p>
              <button
                type="button"
                onClick={handleNext}
                className="bg-[#EA2C00] text-white font-semibold px-8 py-3 rounded-lg text-sm hover:bg-[#D02800] transition-colors"
                data-testid="button-begin-assessment"
              >
                Begin Assessment →
              </button>
            </div>
          </div>
        );
      case 3:
        return <Screen3Domains onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <Screen4Score onNext={handleNext} onBack={handleBack} onNavigateToDomain={() => goToStep(3)} />;
      case 5:
        return <Screen5Gap onNext={handleNext} onBack={handleBack} onNavigateToBaseline={() => goToStep(1)} />;
      case 6:
        return <Screen6Invitation onBack={handleBack} onBackToJourney={onBackToJourney} />;
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
