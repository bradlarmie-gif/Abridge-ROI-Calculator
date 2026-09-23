import { HubPage, HubHeader, HubList, HubRow } from "./hubKit";

interface PlanningHubProps {
  // One door. "Build the plan" runs the whole walk — the discovery interview
  // and then the plan — rather than resuming a strategy built elsewhere.
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
          description="Start with discovery: trace each outcome back to what has to be true. Then turn it into an owned, step-by-step plan with owners, plays, and a review cadence."
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
