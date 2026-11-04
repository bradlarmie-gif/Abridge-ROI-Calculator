import { HubPage, HubDisclaimer, HubTile, HubTileGrid } from "./hubKit";
import { CaseArt, NumbersArt, PlanArt } from "./hubArt";

interface ValueAttainmentHubProps {
  onSelectStrategy: () => void;
  onSelectFinancial: () => void;
  onSelectPlanning: () => void;
}

export default function ValueAttainmentHub({ onSelectStrategy, onSelectFinancial, onSelectPlanning }: ValueAttainmentHubProps) {
  const sections = [
    { index: 1, tagline: "Start with the why", title: "The Case", contents: ["Ambient Documentation", "Care Signals", "Decision Support", "Pre-Bill"], onClick: onSelectStrategy, testId: "hub-card-strategy", art: <CaseArt /> },
    { index: 2, tagline: "Put it in dollars", title: "The Numbers", contents: ["Size the ROI", "Model the Value", "Build the Deal", "Offset the Cost"], onClick: onSelectFinancial, testId: "hub-card-financial", art: <NumbersArt /> },
    { index: 3, tagline: "Make it happen", title: "The Plan", contents: ["Build the Plan"], soon: "Metrics", onClick: onSelectPlanning, testId: "hub-card-planning", art: <PlanArt /> },
  ];

  return (
      <HubPage pageName="Value Attainment" showBack={false} centered wide footer={<HubDisclaimer />} header={<Hero />}>
        <HubTileGrid>
          {sections.map((s, i) => (
            <HubTile key={s.index} size="lg" {...s} delay={0.15 + i * 0.07} />
          ))}
        </HubTileGrid>
      </HubPage>
  );
}

function Hero() {
  return (
    <h1
      className="text-3xl sm:text-4xl md:text-5xl font-bold text-black font-abridge uppercase"
      style={{ letterSpacing: "0.025em" }}
    >
      The value of
      <span className="block mt-3 md:mt-4 text-[#EA2C00]" style={{ letterSpacing: "0.025em" }}>
        Abridge
      </span>
    </h1>
  );
}
