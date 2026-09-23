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
          description="What the value could be, from your own figures, before any data pull."
          onClick={onSelectExplore}
          index={1}
          testId="financial-card-explore"
          delay={0.15}
        />
        <HubRow
          tagline="From a data pull"
          title="ROI Calculator"
          description="An impact-analysis pull turned into dollars, plus the headroom if adoption grows."
          onClick={onSelectRoiCalculator}
          index={2}
          testId="financial-card-roi-calculator"
          delay={0.22}
        />
        <HubRow
          tagline="Enterprise adoption"
          title="Proforma"
          description="A full deployment: care settings, volumes, pricing, and a proposal to share."
          onClick={onSelectNewDeal}
          index={3}
          testId="financial-card-new-deal"
          delay={0.29}
        />
        <HubRow
          tagline="Consolidation"
          title="App Rationalization"
          description="Their current tool stack, and how much of it Abridge can take on."
          onClick={onSelectAppRationalization}
          index={4}
          testId="financial-card-app-rationalization"
          delay={0.36}
        />
      </HubList>
    </HubPage>
  );
}
