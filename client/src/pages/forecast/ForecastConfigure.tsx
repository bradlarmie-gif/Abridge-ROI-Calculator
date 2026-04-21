import { motion } from "framer-motion";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { Button } from "@/components/ui/button";
import type { ForecastState } from "./types";

interface ForecastConfigureProps {
  state: ForecastState;
  updateState: (updates: Partial<ForecastState>) => void;
  onNext: () => void;
  onBack: () => void;
  onHome: () => void;
}

const FORECAST_STEP_LABELS = ["Start", "Configure", "Build scenarios"];

export default function ForecastConfigure({
  state,
  onNext,
  onBack,
  onHome,
}: ForecastConfigureProps) {
  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="forecast"
        currentStep={2}
        totalSteps={3}
        stepName="Configure"
        onBack={onBack}
        onHome={onHome}
        stepLabels={FORECAST_STEP_LABELS}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p
            className="text-[11px] uppercase font-medium text-[#EA2C00] mb-3"
            style={{ letterSpacing: "2.5px" }}
          >
            Step 2 · Configure
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-[#1A1A1A] font-abridge uppercase mb-4"
            style={{ letterSpacing: "0.02em" }}
          >
            Pricing &amp; care settings
          </h1>
          <p className="text-base text-[#666666] max-w-2xl leading-relaxed mb-10">
            {state.partnerName ? `${state.partnerName} · ` : ""}This screen will let
            you set the contract term, pricing model, and care setting mix for the
            base forecast. Coming in Phase 2.
          </p>

          <div className="bg-[#F5F0EB] rounded-xl p-8 md:p-12 text-center">
            <p
              className="text-[11px] uppercase text-[#999999] font-medium mb-3"
              style={{ letterSpacing: "2px" }}
            >
              Phase 2 placeholder
            </p>
            <p className="text-sm text-[#666666] max-w-md mx-auto">
              Pricing model selector (per provider / per encounter / annual fixed),
              contract term (1–5 years), care setting picker, and adoption /
              utilization curves will live here.
            </p>
          </div>

          <div className="mt-10 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-neutral-600"
              data-testid="button-forecast-configure-back"
            >
              Back
            </Button>
            <Button
              onClick={onNext}
              className="bg-[#EA2C00] text-white hover:bg-[#C22000]"
              data-testid="button-forecast-configure-next"
            >
              Continue to scenarios
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
