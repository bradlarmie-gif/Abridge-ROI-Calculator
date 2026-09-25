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

      ORDER: the fast read is 01. The list is a ladder of effort, so it opens
      with the lightest way in and deepens. Leading with the nine-step build put
      the biggest commitment in front of someone who may only want a number.
  */
  return (
    <HubPage pageName="The Numbers" onHome={onHome} header={<HubHeader eyebrow="The Numbers" title="Put it in dollars" />}>
      <HubList>
        <HubRow
          tagline="The fast read"
          title="Size the ROI"
          onClick={onSelectRoiCalculator}
          index={1}
          testId="financial-card-roi-calculator"
          delay={0.15}
        />
        <HubRow
          tagline="The full build"
          title="Model the Value"
          onClick={onSelectExplore}
          index={2}
          testId="financial-card-explore"
          delay={0.22}
        />
        <HubRow
          tagline="The three-year case"
          title="Build the Deal"
          onClick={onSelectNewDeal}
          index={3}
          testId="financial-card-new-deal"
          delay={0.29}
        />
        <HubRow
          tagline="The current stack"
          title="Offset the Cost"
          onClick={onSelectAppRationalization}
          index={4}
          testId="financial-card-app-rationalization"
          delay={0.36}
        />
      </HubList>
    </HubPage>
  );
}
