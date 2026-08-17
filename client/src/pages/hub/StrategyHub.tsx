import { BookOpen, Target } from "lucide-react";
import { HubPage, HubHeader, HubCard } from "./hubKit";

interface StrategyHubProps {
  onSelectValueStory: () => void;
  onSelectValueStrategy: () => void;
}

export default function StrategyHub({ onSelectValueStory, onSelectValueStrategy }: StrategyHubProps) {
  return (
    <HubPage pageName="Strategy" header={<HubHeader eyebrow="Strategy" title="Start with the why" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-3xl mx-auto">
        <HubCard
          icon={BookOpen}
          tagline="The narrative"
          title="Value Story"
          description="How ambient documentation creates value, with every assumption, formula, and limitation laid out."
          cta="Understand the Value Story"
          onClick={onSelectValueStory}
          testId="strategy-card-value-story"
          delay={0.15}
        />
        <HubCard
          icon={Target}
          tagline="Your goals"
          title="Value Strategy"
          description="Pick the outcomes you're chasing and dig into the number behind each, from your own figures, not a benchmark."
          cta="Build the Strategy"
          onClick={onSelectValueStrategy}
          testId="strategy-card-value-strategy"
          delay={0.22}
        />
      </div>
    </HubPage>
  );
}
