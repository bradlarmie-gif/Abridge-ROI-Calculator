import { HubPage, HubHeader, HubList, HubRow } from "./hubKit";

interface StrategyHubProps {
  onSelectValueStory: () => void;
  onSelectPreBill: () => void;
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
export default function StrategyHub({ onSelectValueStory, onSelectPreBill, onHome }: StrategyHubProps) {
  return (
    <HubPage pageName="The Case" onHome={onHome} header={<HubHeader eyebrow="The Case" title="Start with the why" />}>
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
        {/* Deliberately description-less until the real copy exists: a placeholder
            sentence here would be a product claim nobody has written or checked. */}
        <HubRow
          index={3}
          tagline="The narrative"
          title="CDS"
          onClick={() => {}}
          testId="strategy-card-cds"
          delay={0.29}
          comingSoon
        />
      </HubList>
    </HubPage>
  );
}
