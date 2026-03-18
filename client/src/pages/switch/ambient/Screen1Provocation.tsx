import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessment, assessmentActions } from "@/lib/assessment";
import type { DataMode } from "@/lib/switchGapCalculator";
import { Button } from "@/components/ui/button";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface Screen1Props {
  onNext: () => void;
  onHome?: () => void;
}

type PillChoice = "estimates" | "never" | null;

const PILLS: { id: PillChoice; label: string; dataMode: DataMode }[] = [
  { id: "estimates", label: "I have a rough sense", dataMode: "estimated" },
  { id: "never", label: "I\u2019ve never calculated it", dataMode: "benchmark" },
];

const RESPONSES: Record<string, string> = {
  estimates: "Let\u2019s sharpen it.",
  never: "Most haven\u2019t. That\u2019s exactly why this exists.",
};

export default function Screen1Provocation({ onNext, onHome }: Screen1Props) {
  const { dispatch } = useAssessment();
  const [selected, setSelected] = useState<PillChoice>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  const handleSelect = (pill: typeof PILLS[0]) => {
    setSelected(pill.id);
    setShowResponse(false);
    setShowCTA(false);

    dispatch(assessmentActions.updateInput("dataMode", pill.dataMode));

    setTimeout(() => setShowResponse(true), 400);
    setTimeout(() => setShowCTA(true), 1200);
  };

  const handleBegin = () => {
    onNext();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-center py-5 px-6 border-b border-[#F0EFED]">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); if (onHome) onHome(); else window.location.href = "/"; }}
          className="flex items-center transition-opacity hover:opacity-70 cursor-pointer"
          data-testid="link-logo-home-screen1"
        >
          <img src={abridgeLogo} alt="Abridge" className="h-5" />
        </a>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-lg text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p
              className="text-xs font-medium text-[#888888] uppercase tracking-[1.5px] mb-6"
              data-testid="text-screen1-label"
            >
              Before We Begin
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h1
              className="text-2xl md:text-3xl font-bold text-black mb-5 font-abridge uppercase tracking-tight max-w-[480px] mx-auto"
              data-testid="text-screen1-headline"
            >
              What is ambient documentation actually returning to your organization?
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p
              className="text-base sm:text-lg text-[#525252] leading-relaxed mb-8 sm:mb-10 max-w-[400px] mx-auto"
              data-testid="text-screen1-body"
            >
              Not what you paid for it.<br />
              What it is actually returning.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8">
              {PILLS.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => handleSelect(pill)}
                  className={`text-sm px-4 sm:px-6 py-3 rounded-full border transition-all cursor-pointer ${
                    selected === pill.id
                      ? "border-2 border-[#EA2C00] bg-[#EA2C00]/5 font-bold text-black"
                      : "border border-[#E5E7EB] bg-white font-medium text-black/80 hover:border-[#D1D5DB]"
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
                  className="text-base text-[#525252] leading-relaxed italic mb-6"
                  data-testid="text-screen1-response"
                >
                  {RESPONSES[selected]}
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
                  className="bg-[#EA2C00] text-white border-[#EA2C00] rounded-full px-6 font-medium gap-2"
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

      <div className="py-4 px-6 text-center">
        <p className="text-xs text-[#AAAAAA]">
          All calculations are client-side. No data leaves your browser.
        </p>
      </div>
    </div>
  );
}
