import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureState } from "@/lib/measureCalculator";

interface MeasureOutputProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureOutput({ state, updateState, onNext, onBack, onHome }: MeasureOutputProps) {
  void state;
  void updateState;
  void onNext;
  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={7}
        totalSteps={7}
        stepName="Outcome Summary"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">Outcome Summary</p>
          <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight">Your Outcomes</h1>
          <p className="text-base md:text-lg text-[#666666] max-w-2xl mx-auto px-2 mb-8">
            Maturity assessment, value summary, and PDF export land here in the final sprint.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full"
              data-testid="button-measure-export"
            >
              Download Evidence Doc
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="h-12 px-8 rounded-full border-[#E5DCD0] text-[#1A1A1A] hover:bg-[#F5F0EB]"
              data-testid="button-measure-edit"
            >
              Edit
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
