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
          {/* This line used to say "Three ways in. Start wherever the conversation
              is." — wayfinding, directly above a numbered 01/02/03 list that
              already says there are three and that you can start anywhere. The
              most valuable supporting position on the entry screen was spending
              itself restating the design.

              It now does the job the title cannot: correcting the reader's scope.
              If someone arrives thinking Abridge is the scribe, "The value of
              Abridge" reads as the value of the scribe — while this hub covers
              documentation, care gaps, decision support, the claim, and
              dictation. Leading with the debunk fixes that in four words, then
              names the asset (the record) and the payoff (what it is worth),
              which is also the shape of the three rows below. */}
          {/* text-balance: at phone width this wraps, and without balancing it
              left "worth." orphaned on a line of its own. */}
          <p className="mt-6 md:mt-7 text-[15px] leading-relaxed text-[#666666] max-w-[430px] text-balance">
            Not one product. The whole record, and what it is worth.
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
