import { Target, LineChart, ClipboardCheck } from "lucide-react";
import { HubPage, HubCard, HubDisclaimer } from "./hubKit";

interface ValueAttainmentHubProps {
  onSelectStrategy: () => void;
  onSelectFinancial: () => void;
  onSelectPlanning: () => void;
}

export default function ValueAttainmentHub({ onSelectStrategy, onSelectFinancial, onSelectPlanning }: ValueAttainmentHubProps) {
  return (
    <HubPage
      pageName="Home"
      header={
        <>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-black px-2 font-abridge uppercase"
            style={{ letterSpacing: "0.025em" }}
          >
            The value of
            <span className="block mt-3 md:mt-4 text-[#EA2C00]" style={{ letterSpacing: "0.025em" }}>
              Abridge
            </span>
          </h1>
          <p className="mt-8 md:mt-10 text-xs uppercase text-[#999999] font-medium" style={{ letterSpacing: "3px" }}>
            Where do you want to start?
          </p>
        </>
      }
      footer={<HubDisclaimer />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 max-w-5xl mx-auto">
        <HubCard
          icon={Target}
          tagline="Start with the why"
          title="Strategy"
          description="The value story and the value strategy: the outcomes you're chasing and why they matter."
          cta="Open Strategy"
          onClick={onSelectStrategy}
          testId="hub-card-strategy"
          delay={0.15}
        />
        <HubCard
          icon={LineChart}
          tagline="Run the numbers"
          title="Financial"
          description="ROI from a data pull, a new-deal proforma, app rationalization, or an exploration of the value in real numbers."
          cta="Open Financial"
          onClick={onSelectFinancial}
          testId="hub-card-financial"
          delay={0.22}
        />
        <HubCard
          icon={ClipboardCheck}
          tagline="Make it happen"
          title="Planning"
          description="Turn the strategy into an owned, step-by-step plan, then track attainment against it over time."
          cta="Open Planning"
          onClick={onSelectPlanning}
          testId="hub-card-planning"
          delay={0.29}
        />
      </div>
    </HubPage>
  );
}
