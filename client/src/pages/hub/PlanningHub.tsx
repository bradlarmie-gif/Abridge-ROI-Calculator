import { HubPage, HubHeader, HubList, HubRow } from "./hubKit";

interface PlanningHubProps {
  // Phase 1: both open the existing Attain flow. Phase 2 splits Build the Plan
  // into a strategy recap + Plan/Progress, and Metrics into a dedicated
  // signals-definition surface, both seeded from the saved strategy.
  onOpenPlanning: () => void;
  onOpenMetrics: () => void;
  onHome?: () => void;
}

export default function PlanningHub({ onOpenPlanning, onOpenMetrics, onHome }: PlanningHubProps) {
  return (
    <HubPage pageName="The Plan" onHome={onHome} header={<HubHeader eyebrow="The Plan" title="Make it happen" />}>
      <HubList wide>
        <HubRow
          tagline="The plan"
          title="Build the Plan"
          description="Turn your value attainment strategy into an owned, step-by-step plan with owners, plays, and a review cadence."
          onClick={onOpenPlanning}
          index={1}
          testId="planning-card-build"
          delay={0.15}
        />
        <HubRow
          tagline="Prove it"
          title="Metrics"
          description="A library of the signals that prove each outcome, the Abridge and EHR metrics you'll track and exactly where to find them."
          onClick={onOpenMetrics}
          index={2}
          testId="planning-card-metrics"
          delay={0.22}
          comingSoon
        />
      </HubList>
    </HubPage>
  );
}
