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
 * ALPHABETICAL, not curated. A library ordered by importance has to be re-argued
 * every time something is added, and it quietly ranks the products for anyone
 * reading it. Alphabetical also means the two unbuilt stories sit among the live
 * ones rather than being swept to the bottom, which is the honest picture.
 *
 * The tagline carries each story's own page eyebrow — The record, The claim, The
 * evidence — so the row and the page it opens name the same thing. Every row said
 * "The narrative" before, which at three rows was dull and at five is wallpaper.
 */
export default function StrategyHub({ onSelectValueStory, onSelectPreBill, onSelectCds, onHome }: StrategyHubProps) {
  return (
    <HubPage
      pageName="The Case"
      onHome={onHome}
      header={
        <HubHeader
          eyebrow="The Case"
          title="Start with the why"
          lead="The record is the asset. Each story here is a different claim on it: how it gets created, and what becomes possible once it exists."
        />
      }
    >
      <HubList wide>
        <HubRow
          index={1}
          tagline="The record"
          title="Ambient Documentation"
          description="Every assumption, formula, and limitation behind the value, laid out."
          onClick={onSelectValueStory}
          testId="strategy-card-value-story"
          delay={0.15}
        />
        {/* Risk adjustment. Eyebrow is a placeholder until the story is written —
            it pre-commits nothing beyond the subject the product concerns. */}
        <HubRow
          index={2}
          tagline="The risk picture"
          title="Care Signals"
          onClick={() => {}}
          testId="strategy-card-care-signals"
          delay={0.22}
          comingSoon
        />
        <HubRow
          index={3}
          tagline="The evidence"
          title="Clinical Decision Support"
          description="How the patient's own record shapes the answer, and where the evidence comes from."
          onClick={onSelectCds}
          testId="strategy-card-cds"
          delay={0.29}
        />
        <HubRow
          index={4}
          tagline="The dictated note"
          title="Dictation"
          onClick={() => {}}
          testId="strategy-card-dictation"
          delay={0.36}
          comingSoon
        />
        <HubRow
          index={5}
          tagline="The claim"
          title="Pre-Bill"
          description="How the coded case is compared with the documented stay, before the claim goes."
          onClick={onSelectPreBill}
          testId="strategy-card-prebill"
          delay={0.43}
        />
      </HubList>
    </HubPage>
  );
}
