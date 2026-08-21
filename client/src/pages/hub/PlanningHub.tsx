import { ClipboardCheck, Activity } from "lucide-react";
import { HubPage, HubHeader, HubCard } from "./hubKit";

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
    <HubPage pageName="Planning" onHome={onHome} header={<HubHeader eyebrow="Planning" title="Make it happen" />}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-3xl mx-auto">
        <HubCard
          icon={ClipboardCheck}
          tagline="The plan"
          title="Build the Plan"
          description="Turn your value attainment strategy into an owned, step-by-step plan with owners, plays, and a review cadence."
          cta="Start building"
          onClick={onOpenPlanning}
          testId="planning-card-build"
          delay={0.15}
        />
        <HubCard
          icon={Activity}
          tagline="Prove it"
          title="Metrics"
          description="A library of the signals that prove each outcome, the Abridge and EHR metrics you'll track and exactly where to find them."
          cta="Open the Library"
          onClick={onOpenMetrics}
          testId="planning-card-metrics"
          delay={0.22}
          comingSoon
        />
      </div>
    </HubPage>
  );
}
