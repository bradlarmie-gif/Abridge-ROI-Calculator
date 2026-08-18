import { Calculator, Layers, Boxes, Compass } from "lucide-react";
import { HubPage, HubHeader, HubCard } from "./hubKit";

interface FinancialHubProps {
  onSelectRoiCalculator: () => void;
  onSelectNewDeal: () => void;
  onSelectAppRationalization: () => void;
  onSelectExplore: () => void;
  onHome?: () => void;
}

export default function FinancialHub({
  onSelectRoiCalculator,
  onSelectNewDeal,
  onSelectAppRationalization,
  onSelectExplore,
  onHome,
}: FinancialHubProps) {
  return (
    <HubPage pageName="Financial" onHome={onHome} header={<HubHeader eyebrow="Financial" title="Run the numbers" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mx-auto">
        <HubCard
          icon={Compass}
          tagline="Before a data pull"
          title="Value Model"
          description="Model what ambient documentation could unlock, in real numbers, care setting by care setting, from your own figures before any data pull."
          cta="Model the value"
          onClick={onSelectExplore}
          testId="financial-card-explore"
          delay={0.15}
        />
        <HubCard
          icon={Calculator}
          tagline="From a data pull"
          title="ROI Calculator"
          description="Turn an impact-analysis pull into dollars for a partner, then show the headroom if they expand adoption and use."
          cta="Calculate ROI"
          onClick={onSelectRoiCalculator}
          testId="financial-card-roi-calculator"
          delay={0.22}
        />
        <HubCard
          icon={Layers}
          tagline="Enterprise adoption"
          title="Proforma"
          description="Model the ROI of a full deployment. Add care settings, configure volumes and pricing, and share a financial proposal."
          cta="Open Proforma"
          onClick={onSelectNewDeal}
          testId="financial-card-new-deal"
          delay={0.29}
        />
        <HubCard
          icon={Boxes}
          tagline="Consolidation"
          title="App Rationalization"
          description="Show their current tool stack and how much of it Abridge can take on, by capability, so the consolidation is clear."
          cta="Build the case"
          onClick={onSelectAppRationalization}
          testId="financial-card-app-rationalization"
          delay={0.36}
        />
      </div>
    </HubPage>
  );
}
