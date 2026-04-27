import { Check } from "lucide-react";

interface ExploreProgressBarProps {
  currentStep: number;
  totalSteps?: number;
}

const STEP_LABELS = [
  "Care Setting",
  "Practice",
  "Time Savings",
  "Capacity",
  "Workforce",
  "Revenue",
  "Quality",
  "Investment",
  "Model"
];

export function ExploreProgressBar({ currentStep, totalSteps = 9 }: ExploreProgressBarProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-600">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-xs text-slate-500">
          {STEP_LABELS[currentStep - 1] || ""}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          
          return (
            <div
              key={stepNum}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                isCompleted
                  ? "bg-emerald-500"
                  : isCurrent
                  ? "bg-[#EA2C00]"
                  : "bg-slate-200"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ExploreProgressDots({ currentStep, totalSteps = 6 }: ExploreProgressBarProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const stepNum = index + 1;
        const isCompleted = stepNum < currentStep;
        const isCurrent = stepNum === currentStep;
        
        return (
          <div
            key={stepNum}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isCompleted
                ? "bg-emerald-500"
                : isCurrent
                ? "bg-[#EA2C00] w-6"
                : "bg-slate-300"
            }`}
          />
        );
      })}
    </div>
  );
}
