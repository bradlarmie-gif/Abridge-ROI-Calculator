import { HubPage, HubHeader, HubTile, HubTileGrid } from "./hubKit";
import { BuildPlanArt, MetricsArt } from "./hubArt";

interface PlanningHubProps {
  // One door. "Build the plan" runs the whole walk — the discovery interview
  // and then the plan — rather than resuming a strategy built elsewhere.
  onOpenPlanning: () => void;
  onHome?: () => void;
}

export default function PlanningHub({ onOpenPlanning, onHome }: PlanningHubProps) {
  return (
    <HubPage wide centered pageName="The Plan" onHome={onHome} header={<HubHeader eyebrow="The Plan" title="Make it happen" />}>
      <HubTileGrid>
        <HubTile
          index={1}
          tagline="The owners"
          title="Build the Plan"
          description="Discovery first, then an owned plan with owners, plays, and a review cadence."
          onClick={onOpenPlanning}
          testId="planning-card-build"
          size="lg"
          cta="Start the plan"
          art={<BuildPlanArt />}
          delay={0.15}
        />
        <HubTile
          index={2}
          tagline="Prove it"
          title="Metrics"
          description="The signals that prove each outcome, and exactly where to find them."
          testId="planning-card-metrics"
          size="lg"
          cta="Start the plan"
          art={<MetricsArt />}
          delay={0.22}
          comingSoon
        />
      </HubTileGrid>
    </HubPage>
  );
}
