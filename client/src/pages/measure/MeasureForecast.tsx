import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { type MeasureState } from "@/lib/measureCalculator";

interface MeasureForecastProps {
  state: MeasureState;
  updateState: (updates: Partial<MeasureState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

export default function MeasureForecast({ state, updateState, onNext, onBack, onHome }: MeasureForecastProps) {
  void state;
  void updateState;
  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="measure"
        currentStep={6}
        totalSteps={7}
        stepName="Forecast"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 md:py-12">
        <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-3">Project the Path Forward</p>
          <h1 className="text-2xl md:text-4xl font-bold text-black mb-3 font-abridge uppercase tracking-tight">Forecast</h1>
          <p className="text-base md:text-lg text-[#666666] max-w-2xl mx-auto px-2 mb-8">
            Multi-axis scenario modeling, care-setting expansion, and pricing comparison land here in upcoming sprints.
          </p>
          <Button
            onClick={onNext}
            className="h-12 px-8 bg-[#EA2C00] hover:bg-[#EA2C00]/90 text-white font-semibold rounded-full"
            data-testid="button-continue-measure-forecast"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
