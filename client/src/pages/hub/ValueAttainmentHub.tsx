import { HubPage, HubList, HubRow, HubDisclaimer } from "./hubKit";

interface ValueAttainmentHubProps {
  onSelectStrategy: () => void;
  onSelectFinancial: () => void;
  onSelectPlanning: () => void;
}

export default function ValueAttainmentHub({ onSelectStrategy, onSelectFinancial, onSelectPlanning }: ValueAttainmentHubProps) {
  return (
    <HubPage
      pageName="Value Attainment"
      showBack={false}
      centered
      header={
        <>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-black font-abridge uppercase"
            style={{ letterSpacing: "0.025em" }}
          >
            The value of
            <span className="block mt-3 md:mt-4 text-[#EA2C00]" style={{ letterSpacing: "0.025em" }}>
              Abridge
            </span>
          </h1>
          {/* Was an all-caps "WHERE DO YOU WANT TO START?" eyebrow. A left-aligned
              list already reads as a set of choices, so the label was scaffolding;
              this says the one thing the eyebrow did not — that you can enter
              anywhere, rather than at the top. */}
          <p className="mt-6 md:mt-7 text-[15px] leading-relaxed text-[#666666] max-w-[430px]">
            Three ways in. Start wherever the conversation is.
          </p>
        </>
      }
      footer={<HubDisclaimer />}
    >
      {/* No descriptions here. The coral line over each name already says what it
          is, and a paragraph under it repeated the same thing at greater length. */}
      <HubList>
        <HubRow
          index={1}
          tagline="Start with the why"
          title="The Case"
          onClick={onSelectStrategy}
          testId="hub-card-strategy"
          delay={0.15}
        />
        <HubRow
          index={2}
          tagline="Put it in dollars"
          title="The Numbers"
          onClick={onSelectFinancial}
          testId="hub-card-financial"
          delay={0.22}
        />
        <HubRow
          index={3}
          tagline="Make it happen"
          title="The Plan"
          onClick={onSelectPlanning}
          testId="hub-card-planning"
          delay={0.29}
        />
      </HubList>
    </HubPage>
  );
}
