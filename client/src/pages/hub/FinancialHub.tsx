import { HubPage, HubHeader, HubList, HubRow } from "./hubKit";

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
    <HubPage pageName="The Numbers" onHome={onHome} header={<HubHeader eyebrow="The Numbers" title="Put it in dollars" />}>
      <HubList wide>
        <HubRow
          tagline="Before a data pull"
          title="Value Model"
          description="Model what ambient documentation could unlock, in real numbers, care setting by care setting, from your own figures before any data pull."
          onClick={onSelectExplore}
          index={1}
          testId="financial-card-explore"
          delay={0.15}
        />
        <HubRow
          tagline="From a data pull"
          title="ROI Calculator"
          description="Turn an impact-analysis pull into dollars for a partner, then show the headroom if they expand adoption and use."
          onClick={onSelectRoiCalculator}
          index={2}
          testId="financial-card-roi-calculator"
          delay={0.22}
        />
        <HubRow
          tagline="Enterprise adoption"
          title="Proforma"
          description="Model the ROI of a full deployment. Add care settings, configure volumes and pricing, and share a financial proposal."
          onClick={onSelectNewDeal}
          index={3}
          testId="financial-card-new-deal"
          delay={0.29}
        />
        <HubRow
          tagline="Consolidation"
          title="App Rationalization"
          description="Show their current tool stack and how much of it Abridge can take on, by capability, so the consolidation is clear."
          onClick={onSelectAppRationalization}
          index={4}
          testId="financial-card-app-rationalization"
          delay={0.36}
        />
      </HubList>
    </HubPage>
  );
}
