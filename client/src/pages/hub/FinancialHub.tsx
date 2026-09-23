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
  /*
      Rows name the ACTION; the thing you land in keeps its noun.

      "Model the Value" opens the flow whose breadcrumb reads Value Model, the
      same way "Build the Deal" opens the proforma. That is deliberate, not a
      mismatch left half-finished: the verb tells you what you are about to do,
      the noun names the artefact you end up with, and the nouns are load-bearing
      elsewhere (Value Model is the breadcrumb and step eyebrow on all nine
      Explore steps, and the title of its PDF).

      The two renames that were not stylistic: "ROI Calculator" collided with the
      name of the whole app (the browser title is "Abridge ROI Calculator"), so a
      row inside it called ROI Calculator disambiguated nothing; and "App
      Rationalization" was enterprise-IT jargon on a CFO-facing screen, which its
      own description already said better in plain words.
  */
  return (
    <HubPage pageName="The Numbers" onHome={onHome} header={<HubHeader eyebrow="The Numbers" title="Put it in dollars" />}>
      <HubList wide>
        <HubRow
          tagline="The full build"
          title="Model the Value"
          description="How the value is built, driver by driver, from your own figures before any data pull."
          onClick={onSelectExplore}
          index={1}
          testId="financial-card-explore"
          delay={0.15}
        />
        <HubRow
          tagline="The fast read"
          title="Size the ROI"
          description="A few figures from the impact analysis, turned straight into dollars."
          onClick={onSelectRoiCalculator}
          index={2}
          testId="financial-card-roi-calculator"
          delay={0.22}
        />
        <HubRow
          tagline="The three-year case"
          title="Build the Deal"
          description="A full deployment: care settings, volumes, pricing, and a proposal to share."
          onClick={onSelectNewDeal}
          index={3}
          testId="financial-card-new-deal"
          delay={0.29}
        />
        <HubRow
          tagline="The current stack"
          title="Offset the Cost"
          description="The tool stack already being paid for, and how much of it Abridge can take on."
          onClick={onSelectAppRationalization}
          index={4}
          testId="financial-card-app-rationalization"
          delay={0.36}
        />
      </HubList>
    </HubPage>
  );
}
