import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import type { DataMode } from "@/lib/switchGapCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

interface StepEntryGateProps {
  onNext: () => void;
}

type PillChoice = "number" | "estimate" | "never" | null;

const PILL_OPTIONS: { id: PillChoice; label: string; dataMode: DataMode; confidence: number }[] = [
  { id: "number", label: "I know the number", dataMode: "measured", confidence: 0.88 },
  { id: "estimate", label: "I have a rough sense", dataMode: "estimated", confidence: 0.72 },
  { id: "never", label: "I've never calculated it", dataMode: "benchmark", confidence: 0.55 },
];

const RESPONSES: Record<string, string> = {
  number: "Good. Let\u2019s validate it.",
  estimate: "Let\u2019s sharpen it.",
  never: "Most haven\u2019t. That\u2019s exactly why this exists.",
};

export default function StepEntryGate({ onNext }: StepEntryGateProps) {
  const { dispatch } = useAssessment();
  const [selected, setSelected] = useState<PillChoice>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [entryEstimate, setEntryEstimate] = useState<number>(0);

  const handleSelect = (pill: typeof PILL_OPTIONS[0]) => {
    setSelected(pill.id);
    setShowResponse(false);
    setShowCTA(false);

    dispatch(assessmentActions.updateInput("dataMode", pill.dataMode));
    dispatch(assessmentActions.updateInput("confidenceBaseline", pill.confidence));

    setTimeout(() => setShowResponse(true), 400);
    setTimeout(() => setShowCTA(true), 1200);
  };

  const handleBegin = () => {
    if (selected === "number" && entryEstimate > 0) {
      dispatch(assessmentActions.updateInput("entryEstimate", entryEstimate));
    }
    onNext();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex items-center justify-center px-6"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="w-full max-w-[520px] text-center">
        <p
          className="text-[11px] font-semibold text-[#9B9B9B] uppercase tracking-[2px] mb-7"
          data-testid="text-gate-eyebrow"
        >
          Before We Begin
        </p>

        <h1
          className="text-[36px] md:text-[48px] font-bold text-[#1A1A1A] leading-[1.15] mb-5"
          data-testid="text-gate-headline"
        >
          What is ambient documentation
          <br className="hidden sm:block" />
          actually returning to your organization?
        </h1>

        <p
          className="text-[17px] text-[#4B4B4B] leading-[1.75] mb-10"
          data-testid="text-gate-body"
        >
          Not what you paid for it.
          <br />
          What it is actually returning.
        </p>

        <div className="w-12 h-px bg-[#E8E8E8] mx-auto mb-10" />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          {PILL_OPTIONS.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => handleSelect(pill)}
              className={`px-5 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-150 ${
                selected === pill.id
                  ? "bg-white border-[1.5px] border-[#1A1A1A] text-[#1A1A1A] font-semibold"
                  : "bg-[#F7F6F4] border-[1.5px] border-[#E8E8E8] text-[#4B4B4B] hover:border-[#CCCCCC]"
              }`}
              data-testid={`pill-gate-${pill.id}`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div
          className={`transition-all duration-300 ${
            showResponse ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          {selected && (
            <p
              className="text-[17px] text-[#4B4B4B] italic leading-[1.75] mb-6"
              data-testid="text-gate-response"
            >
              {RESPONSES[selected]}
            </p>
          )}
        </div>

        {selected === "number" && showResponse && (
          <div
            className={`max-w-[300px] mx-auto mb-6 transition-all duration-300 ${
              showResponse ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
          >
            <label className="block text-[13px] text-[#9B9B9B] text-left mb-1.5">
              Your estimate
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[17px] text-[#9B9B9B]">$</span>
              <FormattedNumberInput
                value={entryEstimate}
                onChange={setEntryEstimate}
                className="w-full bg-white border-[1.5px] border-[#E8E8E8] rounded-lg pl-8 pr-4 py-3 text-[17px] text-[#1A1A1A] focus:outline-none focus:border-[#EA2C00] transition-colors"
                placeholder="annually"
                data-testid="input-entry-estimate"
              />
            </div>
            <p className="text-[13px] text-[#9B9B9B] mt-1.5 text-left">
              Optional — we'll reference this in your results.
            </p>
          </div>
        )}

        <div
          className={`flex justify-center sm:justify-end transition-all duration-300 ${
            showCTA ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <button
            onClick={handleBegin}
            className="inline-flex items-center gap-1.5 px-8 py-3.5 bg-[#EA2C00] text-white text-[15px] font-semibold rounded-[10px] hover:bg-[#C72300] transition-colors"
            data-testid="button-begin-assessment"
          >
            Begin the Assessment
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
