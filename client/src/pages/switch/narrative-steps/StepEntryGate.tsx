import { useState } from "react";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import type { DataMode } from "@/lib/switchGapCalculator";

interface StepEntryGateProps {
  onNext: () => void;
}

type GateChoice = "number" | "estimate" | "never" | null;

const DATA_MODE_MAP: Record<Exclude<GateChoice, null>, { dataMode: DataMode; confidence: number }> = {
  number:   { dataMode: "measured",  confidence: 0.85 },
  estimate: { dataMode: "estimated", confidence: 0.70 },
  never:    { dataMode: "benchmark", confidence: 0.55 },
};

const CHOICES: { value: GateChoice; label: string; response: string }[] = [
  {
    value: "number",
    label: "I have a number",
    response: "Let's validate that number.",
  },
  {
    value: "estimate",
    label: "I have a rough estimate",
    response: "Let's sharpen it.",
  },
  {
    value: "never",
    label: "I've never calculated it",
    response: "Most don't. That's exactly why this exists.",
  },
];

export default function StepEntryGate({ onNext }: StepEntryGateProps) {
  const [selected, setSelected] = useState<GateChoice>(null);
  const [showResponse, setShowResponse] = useState(false);
  const { dispatch } = useAssessment();

  const handleSelect = (choice: GateChoice) => {
    if (selected || !choice) return;
    setSelected(choice);

    const mapping = DATA_MODE_MAP[choice];
    dispatch(assessmentActions.updateInput("dataMode", mapping.dataMode));
    dispatch(assessmentActions.updateInput("confidenceBaseline", mapping.confidence));

    setTimeout(() => setShowResponse(true), 400);
    setTimeout(() => onNext(), 2200);
  };

  const selectedChoice = CHOICES.find((c) => c.value === selected);

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center px-6">
      <div className="max-w-xl w-full text-center space-y-10">
        <h1
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] leading-tight font-abridge uppercase tracking-tight"
          data-testid="text-entry-headline"
        >
          What is documentation actually costing your organization annually?
        </h1>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          {CHOICES.map((choice) => {
            const isSelected = selected === choice.value;
            const isDimmed = selected !== null && !isSelected;
            return (
              <button
                key={choice.value}
                type="button"
                onClick={() => handleSelect(choice.value)}
                disabled={selected !== null}
                data-testid={`pill-gate-${choice.value}`}
                className={`px-5 py-3 rounded-full text-sm font-medium transition-all duration-300 w-full sm:w-auto ${
                  isSelected
                    ? "bg-[#1A1A1A] text-white scale-[1.02]"
                    : isDimmed
                      ? "bg-[#F5F0EB] text-[#CCC] border border-[#E8E0D8] cursor-default"
                      : "bg-[#F5F0EB] text-[#555] border border-[#E8E0D8] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                }`}
              >
                {choice.label}
              </button>
            );
          })}
        </div>

        <div
          className={`h-12 flex items-center justify-center transition-all duration-500 ${
            showResponse ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {selectedChoice && (
            <p
              className="text-base text-[#888] italic"
              data-testid="text-gate-response"
            >
              {selectedChoice.response}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
