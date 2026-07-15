import { motion } from "framer-motion";
import { Layers, BarChart3, TrendingUp, Boxes, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalHeader } from "@/components/GlobalHeader";

interface ForecastModeSelectorProps {
  onSelectNewDeal: () => void;
  onSelectPricingComparison: () => void;
  onSelectPartnerModel: () => void;
  onSelectAppRationalization: () => void;
  onHome: () => void;
}

export default function ForecastModeSelector({
  onSelectNewDeal,
  onSelectPricingComparison,
  onSelectPartnerModel,
  onSelectAppRationalization,
  onHome,
}: ForecastModeSelectorProps) {
  const handleCardKey = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler();
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <GlobalHeader pageName="Forecast" />
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-[88px] md:pt-[96px] pb-8 relative z-10">

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-12 md:mb-16"
        >
          <p className="text-xs uppercase text-[#999999] font-medium mb-3" style={{ letterSpacing: "3px" }}>
            Forecast
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-black font-abridge uppercase" style={{ letterSpacing: "0.025em" }}>
            What are you modeling?
          </h1>
        </motion.section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -4 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => handleCardKey(e, onSelectNewDeal)}
            className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out rounded-xl p-8 min-h-[300px] bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
            onClick={onSelectNewDeal}
            data-testid="card-forecast-new-deal"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
              <Layers className="w-6 h-6 text-[#EA2C00]" />
            </div>
            <p className="text-[13px] text-[#EA2C00] font-medium mb-1.5">New partnership</p>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2.5">New Deal Proforma</h3>
            <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-6">
              Model the ROI of a new deployment. Add care settings, configure volumes and pricing, and share a financial proposal.
            </p>
            <Button
              className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
              size="lg"
              onClick={(e) => { e.stopPropagation(); onSelectNewDeal(); }}
              data-testid="card-forecast-new-deal-button"
            >
              Open Proforma
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -4 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => handleCardKey(e, onSelectPartnerModel)}
            className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out rounded-xl p-8 min-h-[300px] bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
            onClick={onSelectPartnerModel}
            data-testid="card-forecast-partner"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
              <TrendingUp className="w-6 h-6 text-[#EA2C00]" />
            </div>
            <p className="text-[13px] text-[#EA2C00] font-medium mb-1.5">Existing partner</p>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2.5">Partner ROI Model</h3>
            <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-6">
              Enter an existing partner's live data across care settings and model their realized and projected ROI.
            </p>
            <Button
              className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
              size="lg"
              onClick={(e) => { e.stopPropagation(); onSelectPartnerModel(); }}
              data-testid="card-forecast-partner-button"
            >
              Start Modeling
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -4 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => handleCardKey(e, onSelectAppRationalization)}
            className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out rounded-xl p-8 min-h-[300px] bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
            onClick={onSelectAppRationalization}
            data-testid="card-forecast-app-rationalization"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
              <Boxes className="w-6 h-6 text-[#EA2C00]" />
            </div>
            <p className="text-[13px] text-[#EA2C00] font-medium mb-1.5">Consolidation</p>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2.5">App Rationalization</h3>
            <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-6">
              Show their current tool stack and how much of it Abridge can take on, by capability, so the consolidation is clear.
            </p>
            <Button
              className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
              size="lg"
              onClick={(e) => { e.stopPropagation(); onSelectAppRationalization(); }}
              data-testid="card-forecast-app-rationalization-button"
            >
              Build the case
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            whileHover={{ y: -4 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => handleCardKey(e, onSelectPricingComparison)}
            className="group relative flex flex-col cursor-pointer transition-all duration-300 ease-out rounded-xl p-8 min-h-[300px] bg-[#F5F0EB] hover:bg-[#EDE7E0] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2C00] focus-visible:ring-offset-2"
            onClick={onSelectPricingComparison}
            data-testid="card-forecast-pricing"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-5">
              <BarChart3 className="w-6 h-6 text-[#EA2C00]" />
            </div>
            <p className="text-[13px] text-[#EA2C00] font-medium mb-1.5">Deal desk</p>
            <h3 className="text-2xl font-bold text-[#1A1A1A] mb-2.5">Compare Pricing</h3>
            <p className="text-sm text-[#666666] leading-relaxed flex-1 mb-6">
              Total cost of ownership for two or three deal structures, side by side. Optionally layer in a value estimate to flip to ROI view.
            </p>
            <Button
              className="w-full bg-[#EA2C00] text-white border-[#EA2C00]"
              size="lg"
              onClick={(e) => { e.stopPropagation(); onSelectPricingComparison(); }}
              data-testid="card-forecast-pricing-button"
            >
              Compare Options
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
