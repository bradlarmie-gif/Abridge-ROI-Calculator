import { useState } from "react";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface MeasureWelcomeProps {
  onNext: () => void;
  onBack: () => void;
}

export default function MeasureWelcome({ onNext, onBack }: MeasureWelcomeProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleShowMe = () => {
    setIsLoading(true);
    setTimeout(() => {
      onNext();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="absolute top-4 left-4">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-900 transition-colors text-sm flex items-center gap-1"
          data-testid="button-back"
        >
          ← Back
        </button>
      </div>

      <div className="flex items-center justify-center min-h-screen px-4">
        <motion.div 
          className="text-center max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#EA2C00]/10 border border-[#EA2C00]/20 rounded-full text-sm text-[#EA2C00] mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-semibold tracking-wide">MEASURE</span>
          </motion.div>

          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 tracking-tight leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Let's look at what<br />
            <span className="bg-gradient-to-r from-[#EA2C00] to-[#F07B5F] bg-clip-text text-transparent">
              you built.
            </span>
          </motion.h1>

          <motion.p 
            className="text-lg md:text-xl text-slate-600 mb-4 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Your providers have been using Abridge.
            <br />
            The data tells a story.
          </motion.p>

          <motion.p 
            className="text-base text-slate-500 mb-12 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Let us show you what's happening—and help you understand what it means.
          </motion.p>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-3"
              >
                <Loader2 className="w-8 h-8 text-[#EA2C00] animate-spin" />
                <span className="text-slate-500 text-sm">Pulling your data...</span>
              </motion.div>
            ) : (
              <motion.div
                key="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Button
                  onClick={handleShowMe}
                  size="lg"
                  className="bg-[#EA2C00] hover:bg-[#d42800] text-white h-14 px-10 text-lg font-semibold shadow-xl shadow-[#EA2C00]/30 rounded-xl"
                  data-testid="button-show-me"
                >
                  Show Me
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
