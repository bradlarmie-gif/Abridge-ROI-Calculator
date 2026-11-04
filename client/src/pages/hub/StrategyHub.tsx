import { HubPage, HubHeader, HubTile, HubTileGrid } from "./hubKit";
import { AmbientArt, CareSignalsArt, CdsArt, DictationArt, PreBillArt } from "./hubArt";

interface StrategyHubProps {
  onSelectValueStory: () => void;
  onSelectPreBill: () => void;
  onSelectCds: () => void;
  onSelectCareSignals: () => void;
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
export default function StrategyHub({ onSelectValueStory, onSelectPreBill, onSelectCds, onSelectCareSignals, onHome }: StrategyHubProps) {
  return (
    <HubPage
      wide
      centered
      pageName="The Case"
      onHome={onHome}
      header={
        <HubHeader
          eyebrow="The Case"
          title="Start with the why"
          lead="How each one works, and why it matters."
        />
      }
    >
      <HubTileGrid>
        <HubTile
          index={1}
          tagline="The record"
          title="Ambient Documentation"
          description="How the conversation becomes the note, and what that note is worth."
          onClick={onSelectValueStory}
          testId="strategy-card-value-story"
          cta="Open the story"
          art={<AmbientArt />}
          delay={0.15}
        />
        <HubTile
          index={2}
          tagline="The risk gap"
          title="Care Signals"
          description="How a flagged condition gets addressed and evidenced in the room."
          onClick={onSelectCareSignals}
          testId="strategy-card-care-signals"
          cta="Open the story"
          art={<CareSignalsArt />}
          delay={0.22}
        />
        <HubTile
          index={3}
          tagline="The evidence"
          title="Clinical Decision Support"
          description="How the patient's own record shapes the answer, and where the evidence comes from."
          onClick={onSelectCds}
          testId="strategy-card-cds"
          cta="Open the story"
          art={<CdsArt />}
          delay={0.29}
        />
        <HubTile
          index={4}
          tagline="The spoken note"
          title="Dictation"
          description="The dictated note, and where it sits alongside ambient."
          testId="strategy-card-dictation"
          cta="Open the story"
          art={<DictationArt />}
          delay={0.36}
          comingSoon
        />
        <HubTile
          index={5}
          tagline="The claim"
          title="Pre-Bill"
          description="How the coded case is compared with the documented stay, before the claim goes."
          onClick={onSelectPreBill}
          testId="strategy-card-prebill"
          cta="Open the story"
          art={<PreBillArt />}
          delay={0.43}
        />
      </HubTileGrid>
    </HubPage>
  );
}
