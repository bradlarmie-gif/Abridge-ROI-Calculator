import { HubPage, HubHeader, HubList, HubRow } from "./hubKit";

interface StrategyHubProps {
  onSelectValueStory: () => void;
  onSelectPreBill: () => void;
  onSelectCds: () => void;
  onHome?: () => void;
}

/**
 * The Case: one value story per product.
 *
 * Was a two-entry section holding the value story plus the discovery interview.
 * Discovery moved into The Plan, where it belongs — it is the first half of the
 * planning walk, not a separate thing you do beforehand. What is left here grows
 * the other way: a story per product, of which the clinical-notes one (the
 * original "Value Story") is the first. Named for the product, not the artifact:
 * the content never once says "clinical notes", and every number in it traces
 * back to ambient capture.
 */
export default function StrategyHub({ onSelectValueStory, onSelectPreBill, onSelectCds, onHome }: StrategyHubProps) {
  return (
    <HubPage pageName="The Case" onHome={onHome} header={<HubHeader eyebrow="The Case" title="Start with the why" lead="The record is the asset. Each story here is a different claim on it: how it gets created, and what becomes possible once it exists." />}>
      <HubList wide>
        <HubRow
          index={1}
          tagline="The narrative"
          title="Ambient Documentation"
          description="How ambient documentation creates value, with every assumption, formula, and limitation laid out."
          onClick={onSelectValueStory}
          testId="strategy-card-value-story"
          delay={0.15}
        />
        <HubRow
          index={2}
          tagline="The narrative"
          title="Pre-Bill"
          description="Where documentation and coding meet: how the coded case is compared with the documented stay before the claim is submitted."
          onClick={onSelectPreBill}
          testId="strategy-card-prebill"
          delay={0.22}
        />
        <HubRow
          index={3}
          tagline="The narrative"
          title="Clinical Decision Support"
          description="Context-aware support in the room: how the patient's own record shapes the answer, and where the evidence behind it comes from."
          onClick={onSelectCds}
          testId="strategy-card-cds"
          delay={0.29}
        />
      </HubList>
    </HubPage>
  );
}
