import { HubPage, HubHeader, HubTile, HubTileGrid } from "./hubKit";
import { BuildDealArt, ModelValueArt, OffsetCostArt, SizeRoiArt } from "./hubArt";

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
    <HubPage wide centered pageName="The Numbers" onHome={onHome} header={<HubHeader eyebrow="The Numbers" title="Put it in dollars" />}>
      <HubTileGrid>
        <HubTile
          index={1}
          tagline="The fast read"
          title="Size the ROI"
          description="A few figures from the impact analysis, turned straight into dollars."
          onClick={onSelectRoiCalculator}
          testId="financial-card-roi-calculator"
          cta="Open the tool"
          art={<SizeRoiArt />}
          delay={0.15}
        />
        <HubTile
          index={2}
          tagline="The full build"
          title="Model the Value"
          description="How the value is built, driver by driver, from your own figures before any data pull."
          onClick={onSelectExplore}
          testId="financial-card-explore"
          cta="Open the tool"
          art={<ModelValueArt />}
          delay={0.22}
        />
        <HubTile
          index={3}
          tagline="The three-year case"
          title="Build the Deal"
          description="A full deployment: care settings, volumes, pricing, and a proposal to share."
          onClick={onSelectNewDeal}
          testId="financial-card-new-deal"
          cta="Open the tool"
          art={<BuildDealArt />}
          delay={0.29}
        />
        <HubTile
          index={4}
          tagline="The current stack"
          title="Offset the Cost"
          description="The tool stack already being paid for, and how much of it Abridge can take on."
          onClick={onSelectAppRationalization}
          testId="financial-card-app-rationalization"
          cta="Open the tool"
          art={<OffsetCostArt />}
          delay={0.36}
        />
      </HubTileGrid>
    </HubPage>
  );
}
