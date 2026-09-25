import { HubPage, HubHeader, HubList, HubRow } from "./hubKit";

interface PlanningHubProps {
  // One door. "Build the plan" runs the whole walk — the discovery interview
  // and then the plan — rather than resuming a strategy built elsewhere.
  onOpenPlanning: () => void;
  onHome?: () => void;
}

export default function PlanningHub({ onOpenPlanning, onHome }: PlanningHubProps) {
  return (
    <HubPage pageName="The Plan" onHome={onHome} header={<HubHeader eyebrow="The Plan" title="Make it happen" />}>
      <HubList>
        <HubRow
          tagline="The owners"
          title="Build the Plan"
          onClick={onOpenPlanning}
          index={1}
          testId="planning-card-build"
          delay={0.15}
        />
        <HubRow
          tagline="Prove it"
          title="Metrics"
          index={2}
          testId="planning-card-metrics"
          delay={0.22}
          comingSoon
        />
      </HubList>
    </HubPage>
  );
}
