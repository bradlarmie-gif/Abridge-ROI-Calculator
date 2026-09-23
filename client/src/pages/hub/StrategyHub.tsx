import { HubPage, HubHeader, HubList, HubRow } from "./hubKit";

interface StrategyHubProps {
  onSelectValueStory: () => void;
  onSelectValueStrategy: () => void;
  onHome?: () => void;
}

export default function StrategyHub({ onSelectValueStory, onSelectValueStrategy, onHome }: StrategyHubProps) {
  return (
    <HubPage pageName="The Case" onHome={onHome} header={<HubHeader eyebrow="The Case" title="Start with the why" />}>
      <HubList wide>
        <HubRow
          index={1}
          tagline="The narrative"
          title="Value Story"
          description="How ambient documentation creates value, with every assumption, formula, and limitation laid out."
          onClick={onSelectValueStory}
          testId="strategy-card-value-story"
          delay={0.15}
        />
        <HubRow
          index={2}
          tagline="Your goals"
          title="Value Attainment Strategy"
          description="Trace each outcome back to the operating conditions, decisions, and behaviors that have to be true to reach it, before you run a single number."
          onClick={onSelectValueStrategy}
          testId="strategy-card-value-strategy"
          delay={0.22}
        />
      </HubList>
    </HubPage>
  );
}
