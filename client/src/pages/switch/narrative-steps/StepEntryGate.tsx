import { useState } from "react";
import { ArrowRight } from "lucide-react";
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

const CHOICES: { value: Exclude<GateChoice, null>; label: string; response: string }[] = [
  {
    value: "number",
    label: "I know the number",
    response: "Good. Let\u2019s validate it.",
  },
  {
    value: "estimate",
    label: "I have a rough sense",
    response: "Let\u2019s sharpen it.",
  },
  {
    value: "never",
    label: "I\u2019ve never calculated it",
    response: "Most CMOs haven\u2019t. That\u2019s exactly why this exists.",
  },
];

export default function StepEntryGate({ onNext }: StepEntryGateProps) {
  const [selected, setSelected] = useState<GateChoice>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [showEstimateInput, setShowEstimateInput] = useState(false);
  const [estimateValue, setEstimateValue] = useState("");
  const { dispatch } = useAssessment();

  const handleSelect = (choice: Exclude<GateChoice, null>) => {
    if (selected) return;
    setSelected(choice);

    const mapping = DATA_MODE_MAP[choice];
    dispatch(assessmentActions.updateInput("dataMode", mapping.dataMode));
    dispatch(assessmentActions.updateInput("confidenceBaseline", mapping.confidence));

    setTimeout(() => setShowResponse(true), 400);
    setTimeout(() => {
      setShowCTA(true);
      if (choice === "number") {
        setShowEstimateInput(true);
      }
    }, 1200);
  };

  const handleBegin = () => {
    if (estimateValue) {
      const parsed = parseInt(estimateValue.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(parsed) && parsed > 0) {
        dispatch(assessmentActions.updateInput("entryEstimate", parsed));
      }
    }
    onNext();
  };

  const formatEstimateInput = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (!digits) return "";
    return Number(digits).toLocaleString();
  };

  const selectedChoice = CHOICES.find((c) => c.value === selected);

  return (
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center px-6">
      <div className="max-w-[640px] w-full text-center">
        <p
          className="text-[11px] font-medium text-[#9B9B9B] uppercase tracking-[2px] mb-8"
          data-testid="text-label-before"
        >
          Before We Begin
        </p>

        <h1
          className="text-[32px] sm:text-[40px] md:text-[48px] font-bold text-[#1A1A1A] leading-[1.15] mb-6"
          style={{ fontFamily: "Manrope, sans-serif" }}
          data-testid="text-entry-headline"
        >
          What is ambient documentation
          <br />
          actually worth to your organization?
        </h1>

        <p
          className="text-[17px] md:text-[18px] text-[#4B4B4B] leading-[1.7] mb-8"
          style={{ fontFamily: "Manrope, sans-serif" }}
          data-testid="text-entry-subtext"
        >
          Not what you paid for it.
          <br />
          What it is actually returning.
        </p>

        <div className="w-[60px] h-px bg-[#E0E0E0] mx-auto mb-10" />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8">
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
                className={`px-6 py-3.5 rounded-full text-[15px] font-medium transition-all duration-300 w-full sm:w-auto ${
                  isSelected
                    ? "bg-[#1A1A1A] text-white"
                    : isDimmed
                      ? "bg-[#F7F6F4] text-[#CCC] border border-[#E8E0D8] cursor-default"
                      : "bg-[#F7F6F4] text-[#4B4B4B] border border-[#E8E0D8] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                }`}
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                {choice.label}
              </button>
            );
          })}
        </div>

        <div
          className={`min-h-[48px] flex items-center justify-center transition-all duration-500 ${
            showResponse ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {selectedChoice && (
            <p
              className="text-[17px] text-[#4B4B4B] italic"
              style={{ fontFamily: "Manrope, sans-serif" }}
              data-testid="text-gate-response"
            >
              {selectedChoice.response}
            </p>
          )}
        </div>

        <div
          className={`transition-all duration-500 mt-6 ${
            showEstimateInput ? "opacity-100 translate-y-0 max-h-[80px]" : "opacity-0 translate-y-2 max-h-0 overflow-hidden"
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-[15px] text-[#9B9B9B]" style={{ fontFamily: "Manrope, sans-serif" }}>
              What's your estimate?
            </span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9B9B9B] text-[15px]">$</span>
              <input
                type="text"
                value={estimateValue}
                onChange={(e) => setEstimateValue(formatEstimateInput(e.target.value))}
                placeholder="annually"
                className="pl-7 pr-3 py-2.5 text-[15px] text-[#1A1A1A] border-2 border-[#E0E0E0] rounded-lg w-[180px] focus:outline-none focus:border-[#EA2C00] transition-colors"
                style={{ fontFamily: "Manrope, sans-serif" }}
                data-testid="input-entry-estimate"
              />
            </div>
            <span className="text-[13px] text-[#9B9B9B] italic" style={{ fontFamily: "Manrope, sans-serif" }}>
              (optional)
            </span>
          </div>
        </div>

        <div
          className={`transition-all duration-500 mt-8 ${
            showCTA ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <button
            onClick={handleBegin}
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#EA2C00] text-white text-[15px] font-semibold rounded-lg hover:bg-[#D42800] transition-colors"
            style={{ fontFamily: "Manrope, sans-serif" }}
            data-testid="button-begin-assessment"
          >
            Begin the Assessment
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
