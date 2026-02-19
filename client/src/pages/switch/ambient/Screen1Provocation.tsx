import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DS } from "./designTokens";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import type { DataMode } from "@/lib/switchGapCalculator";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";
import { Button } from "@/components/ui/button";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface Screen1Props {
  onNext: () => void;
}

type PillChoice = "knows" | "estimates" | "never" | null;

const PILLS: { id: PillChoice; label: string; dataMode: DataMode }[] = [
  { id: "knows", label: "I know the number", dataMode: "measured" },
  { id: "estimates", label: "I have a rough sense", dataMode: "estimated" },
  { id: "never", label: "I\u2019ve never calculated it", dataMode: "benchmark" },
];

const RESPONSES: Record<string, string> = {
  knows: "Good. Let\u2019s validate it.",
  estimates: "Let\u2019s sharpen it.",
  never: "Most haven\u2019t. That\u2019s exactly why this exists.",
};

export default function Screen1Provocation({ onNext }: Screen1Props) {
  const { dispatch } = useAssessment();
  const [selected, setSelected] = useState<PillChoice>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [entryEstimate, setEntryEstimate] = useState<number>(0);

  const handleSelect = (pill: typeof PILLS[0]) => {
    setSelected(pill.id);
    setShowResponse(false);
    setShowInput(false);
    setShowCTA(false);

    dispatch(assessmentActions.updateInput("dataMode", pill.dataMode));

    setTimeout(() => setShowResponse(true), 400);
    if (pill.id === "knows") {
      setTimeout(() => setShowInput(true), 700);
    }
    setTimeout(() => setShowCTA(true), 1200);
  };

  const handleBegin = () => {
    if (selected === "knows" && entryEstimate > 0) {
      dispatch(assessmentActions.updateInput("entryEstimate", entryEstimate));
    }
    onNext();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F6F4] px-5 md:px-10 font-['Manrope',sans-serif]">
      <a
        href="/"
        className="fixed top-0 left-0 z-50 flex items-center p-6"
        data-testid="link-logo-home-screen1"
      >
        <img src={abridgeLogo} alt="Abridge" className="h-5" />
      </a>

      <div className="w-full max-w-lg text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
        >
          <p
            className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] mb-8"
            data-testid="text-screen1-label"
          >
            Before We Begin
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <h1
            className="hidden md:block font-['Manrope',sans-serif] font-bold text-[44px] leading-[1.15] text-[#1A1A1A] max-w-[480px] mx-auto mb-4"
            data-testid="text-screen1-headline"
          >
            What is ambient documentation actually returning to your organization?
          </h1>
          <h1
            className="block md:hidden font-['Manrope',sans-serif] font-bold text-[34px] leading-[1.15] text-[#1A1A1A] max-w-[480px] mx-auto mb-4"
            data-testid="text-screen1-headline-mobile"
          >
            What is ambient documentation actually returning to your organization?
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <p
            className="font-['Manrope',sans-serif] text-[15px] leading-relaxed text-[#4B4B4B] text-center mb-12"
            data-testid="text-screen1-body"
          >
            Not what you paid for it.<br />
            What it is actually returning.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="mx-auto w-14 h-px bg-[#E5E7EB] mb-12" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => handleSelect(pill)}
                className={`font-['Manrope',sans-serif] text-sm px-6 py-3 rounded-full bg-white border transition-all duration-150 min-w-[180px] cursor-pointer ${
                  selected === pill.id
                    ? "border-[#1A1A1A] font-bold text-[#1A1A1A]"
                    : "border-[#E8E0D8] font-medium text-[#4B4B4B]"
                }`}
                data-testid={`pill-entry-${pill.id}`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {showResponse && selected && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3 }}
            >
              <p
                className="font-['Manrope',sans-serif] font-normal text-[17px] text-[#4B4B4B] leading-[1.75] italic mb-6"
                data-testid="text-screen1-response"
              >
                {RESPONSES[selected]}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selected === "knows" && showInput && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3 }}
              className="max-w-[280px] mx-auto mb-6"
            >
              <p className="font-abridge text-[11px] font-semibold uppercase tracking-[2px] text-[#9B9B9B] text-left mb-2.5">
                Your Estimate
              </p>
              <div className="flex items-center gap-2">
                <span className="text-lg text-[#9B9B9B] font-['Manrope',sans-serif]">$</span>
                <FormattedNumberInput
                  value={entryEstimate}
                  onChange={setEntryEstimate}
                  className="flex-1"
                  placeholder="annually"
                  data-testid="input-entry-estimate"
                />
                <span className="text-[13px] text-[#9B9B9B] font-['Manrope',sans-serif]">/ year</span>
              </div>
              <p className="text-left mt-2 font-normal text-[13px] text-[#9B9B9B] font-['Manrope',sans-serif]">
                Optional — we'll reference this in your results.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCTA && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={handleBegin}
                className="bg-[#EA2C00] hover:bg-[#D12600] text-white border-[#EA2C00] rounded-full px-6 font-medium gap-2"
                data-testid="button-begin-assessment"
              >
                Begin the Assessment
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
