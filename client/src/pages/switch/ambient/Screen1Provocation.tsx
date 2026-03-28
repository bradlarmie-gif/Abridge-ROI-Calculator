import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import abridgeLogo from '@assets/abridge-logo-wordmark-red_1769020684647.png';

interface Screen1Props {
  onNext: () => void;
  onHome?: () => void;
}

export default function Screen1Provocation({ onNext, onHome }: Screen1Props) {
  const [ctaReady, setCtaReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setCtaReady(true), 800);
    return () => clearTimeout(timer);
  }, []);
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
            <Button
              onClick={onNext}
              disabled={!ctaReady}
              className="bg-[#EA2C00] text-white border-[#EA2C00] rounded-full px-6 font-medium gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              data-testid="button-begin-assessment"
            >
              Begin
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
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
