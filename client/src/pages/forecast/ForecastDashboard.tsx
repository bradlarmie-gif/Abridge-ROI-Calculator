import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { UnifiedHeader, UnifiedHeaderSpacer } from "@/components/UnifiedHeader";
import { Button } from "@/components/ui/button";
import type { ForecastState } from "./types";

interface ForecastDashboardProps {
  state: ForecastState;
  onBack: () => void;
  onHome: () => void;
}

export default function ForecastDashboard({
  state,
  onBack,
  onHome,
}: ForecastDashboardProps) {
  return (
    <div className="min-h-screen bg-white">
      <UnifiedHeader
        pathType="forecast"
        currentStep={3}
        totalSteps={3}
        stepName="Dashboard"
        onBack={onBack}
        onHome={onHome}
      />
      <UnifiedHeaderSpacer />

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p
            className="text-[11px] uppercase font-medium text-[#EA2C00] mb-3"
            style={{ letterSpacing: "2.5px" }}
          >
            Forecast dashboard
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold text-[#1A1A1A] font-abridge uppercase mb-4"
            style={{ letterSpacing: "0.02em" }}
          >
            {state.partnerName || "Untitled forecast"}
          </h1>
          <p className="text-base text-[#666666] max-w-2xl leading-relaxed mb-10">
            Charts, P&amp;L, and scenario comparison views land in Phase 2 / 3.
          </p>

          <div className="bg-[#F5F0EB] rounded-xl p-8 md:p-12 text-center">
            <p
              className="text-[11px] uppercase text-[#999999] font-medium mb-3"
              style={{ letterSpacing: "2px" }}
            >
              Phase 2 / 3 placeholder
            </p>
            <p className="text-sm text-[#666666] max-w-md mx-auto">
              Stacked area chart, 3-year P&amp;L, scenario comparison table, and
              PDF export will be wired here.
            </p>
          </div>

          <div className="mt-10">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-neutral-600"
              data-testid="button-forecast-dashboard-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to scenarios
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
