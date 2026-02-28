import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface ProgressDotsProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  stepLabels?: string[];
}

function ProgressDots({ currentStep, totalSteps, onStepClick, stepLabels }: ProgressDotsProps) {
  return (
    <div className="flex gap-1.5 sm:gap-2 items-center">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isClickable = onStepClick && stepNum < currentStep;
        const label = stepLabels?.[i];
        return isClickable ? (
          <button
            key={i}
            onClick={() => onStepClick(stepNum)}
            title={label || `Step ${stepNum}`}
            className={`h-1.5 sm:h-2 rounded-full transition-all cursor-pointer hover:opacity-60 ${
              'w-1.5 sm:w-2 bg-slate-800'
            }`}
            data-testid={`progress-dot-${stepNum}`}
          />
        ) : (
          <span
            key={i}
            title={label}
            className={`h-1.5 sm:h-2 rounded-full transition-all ${
              i === currentStep - 1
                ? 'w-4 sm:w-6 bg-[#EA2C00]'
                : i < currentStep
                  ? 'w-1.5 sm:w-2 bg-slate-800'
                  : 'w-1.5 sm:w-2 bg-slate-200'
            }`}
            data-testid={`progress-dot-${stepNum}`}
          />
        );
      })}
    </div>
  );
}

export type PathType = "explore" | "switch" | "expand" | "measure";

interface UnifiedHeaderProps {
  pathType: PathType;
  currentStep: number;
  totalSteps: number;
  stepName?: string;
  onBack?: () => void;
  showBack?: boolean;
  onHome?: () => void;
  onStepClick?: (step: number) => void;
  stepLabels?: string[];
}

const PATH_LABELS: Record<PathType, string> = {
  explore: "Explore",
  switch: "Assess",
  expand: "Expand",
  measure: "Measure",
};

export function UnifiedHeader({ 
  pathType, 
  currentStep, 
  totalSteps, 
  stepName,
  onBack,
  showBack = true,
  onHome,
  onStepClick,
  stepLabels,
}: UnifiedHeaderProps) {
  const [, setLocation] = useLocation();
  
  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onHome) {
      onHome();
    } else {
      // Force navigation to home
      window.location.href = "/";
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const pathLabel = PATH_LABELS[pathType];

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 h-14 sm:h-16">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 md:px-12 h-full flex items-center justify-between gap-2">
        {/* Left: Logo + Back */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
          <a 
            href="/" 
            onClick={handleLogoClick}
            className="flex items-center transition-opacity hover:opacity-70 cursor-pointer flex-shrink-0"
            data-testid="link-logo-home"
          >
            <img 
              src={abridgeLogo} 
              alt="Abridge" 
              className="h-5 sm:h-6"
            />
          </a>
          
          {showBack && (
            <>
              <div className="w-px h-5 bg-slate-200 hidden sm:block" />
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 transition-colors p-1.5 -ml-1 rounded-md hover:bg-slate-100"
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm font-medium hidden sm:inline">Back</span>
              </button>
            </>
          )}
        </div>

        {/* Center: Path + Step */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 justify-center">
          <span className="text-xs sm:text-sm text-slate-500 font-medium flex-shrink-0">{pathLabel}</span>
          <span className="text-slate-300 flex-shrink-0">·</span>
          {stepName ? (
            <span className="text-xs sm:text-sm text-slate-900 font-semibold truncate">{stepName}</span>
          ) : (
            <span className="text-xs sm:text-sm text-slate-600 flex-shrink-0">
              Step {currentStep} of {totalSteps}
            </span>
          )}
        </div>

        {/* Right: Progress Dots */}
        <div className="flex items-center flex-shrink-0">
          <ProgressDots currentStep={currentStep} totalSteps={totalSteps} onStepClick={onStepClick} stepLabels={stepLabels} />
        </div>
      </div>
    </header>
  );
}

export function UnifiedHeaderSpacer() {
  return <div className="h-14 sm:h-16" />;
}
