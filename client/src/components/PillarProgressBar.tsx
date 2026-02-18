interface Step {
  id: number;
  name: string;
  shortName?: string;
}

interface PillarProgressBarProps {
  currentStep: number;
  completedSteps: number[];
  totalSteps: number;
  steps: Step[];
}

const PILLARS = [
  { stepId: 5, letter: "C", name: "Capacity", testId: "capacity" },
  { stepId: 6, letter: "Y", name: "Yield", testId: "yield" },
  { stepId: 7, letter: "W", name: "Workforce", testId: "workforce" },
  { stepId: 8, letter: "R", name: "Risk", testId: "risk" },
];

function Phase1Progress({ currentStep, steps }: { currentStep: number; steps: Step[] }) {
  const phaseSteps = [2, 3];
  const idx = phaseSteps.indexOf(currentStep);
  const progress = idx === 0 ? 50 : 100;
  const stepLabel = steps.find((s) => s.id === currentStep)?.name || "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#666666]">
          Step {idx + 1} of {phaseSteps.length}
        </span>
        <span className="text-xs text-[#999999]">{stepLabel}</span>
      </div>
      <div className="h-1 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#EA2C00] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function Phase2Progress({
  currentStep,
  completedSteps,
}: {
  currentStep: number;
  completedSteps: number[];
}) {
  const completedSet = new Set(completedSteps);

  return (
    <div className="flex items-start justify-center gap-0">
      {PILLARS.map((pillar, index) => {
        const isActive = currentStep === pillar.stepId;
        const isCompleted = completedSet.has(pillar.stepId);

        const prevCompleted = index > 0 && (completedSet.has(PILLARS[index - 1].stepId) || currentStep > PILLARS[index - 1].stepId);

        return (
          <div key={pillar.stepId} className="flex items-start">
            {index > 0 && (
              <div className="flex items-center pt-[14px]">
                <div className="w-8 md:w-12 h-0.5 rounded-full transition-all duration-500">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      prevCompleted ? "bg-[#EA2C00]" : "bg-[#E5E7EB]"
                    }`}
                  />
                </div>
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div
                data-testid={`pillar-icon-${pillar.testId}`}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-[#EA2C00] text-white ring-2 ring-[#EA2C00]/30 ring-offset-1"
                    : isCompleted
                      ? "bg-[#EA2C00]/15 text-[#EA2C00] border border-[#EA2C00]/30"
                      : "bg-[#E5E7EB] text-[#999999]"
                }`}
              >
                {pillar.letter}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors duration-300 ${
                  isActive
                    ? "text-[#EA2C00]"
                    : isCompleted
                      ? "text-[#1A1A1A]"
                      : "text-[#999999]"
                }`}
              >
                {pillar.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Phase3Progress({ currentStep, steps }: { currentStep: number; steps: Step[] }) {
  const phaseStart = 9;
  const phaseEnd = 10;
  const phaseTotal = phaseEnd - phaseStart + 1;
  const phasePosition = currentStep - phaseStart;
  const progress = ((phasePosition) / (phaseTotal - 1 || 1)) * 100;
  const stepLabel = steps.find((s) => s.id === currentStep)?.name || "";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#1A1A1A]">{stepLabel}</span>
        <span className="text-xs text-[#999999]">
          {phasePosition + 1} of {phaseTotal}
        </span>
      </div>
      <div className="h-1 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#EA2C00] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function PillarProgressBar({
  currentStep,
  completedSteps,
  steps,
}: PillarProgressBarProps) {
  return (
    <div data-testid="pillar-progress-bar" className="mb-6 md:mb-8">
      {currentStep >= 2 && currentStep <= 3 && (
        <Phase1Progress currentStep={currentStep} steps={steps} />
      )}
      {currentStep >= 4 && currentStep <= 8 && (
        <Phase2Progress currentStep={currentStep} completedSteps={completedSteps} />
      )}
      {currentStep >= 9 && currentStep <= 10 && (
        <Phase3Progress currentStep={currentStep} steps={steps} />
      )}
    </div>
  );
}
