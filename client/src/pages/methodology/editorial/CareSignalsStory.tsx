import { MethodologyHeader } from "./MethodologyHeader";
import { CaseProvenance } from "./CaseProvenance";

interface Props {
  onBack: () => void;
  onHome: () => void;
}

/**
 * The Case · Care Signals (risk adjustment).
 *
 * Fourth chapter, same argument shape. Ambient is the visit against the note.
 * Pre-Bill is the documented stay against the coded claim. CDS is the question
 * with and without the patient. Here it is a condition flagged but unaddressed,
 * against the same condition addressed and evidenced in the room.
 *
 * COPY RULES, as tight as CDS. Risk adjustment is audited, and an overclaim here
 * is the kind that ends up in front of a compliance officer:
 *  - Capability lines come from the Care Signals discovery deck. Guardrails come
 *    from the disclaimers already shipped in the product UI, which is the safest
 *    source there is: they are what a clinician already sees on screen.
 *  - Verbs are observational — surfaces, checks, flags, drafts, links, pushes.
 *    NEVER captures more, increases, optimises, maximises, or lifts RAF.
 *  - No dollars, no RAF or reimbursement figures, no adoption stats. The Case
 *    argues the problem is real; money lives in The Numbers.
 */

/** Real HCC examples from the deck, so the graphic shows actual conditions. */
const CONDITIONS = [
  "Type 2 Diabetes Mellitus without complications",
  "Atrial fibrillation, unspecified type",
  "Severe Obesity (BMI ≥ 40)",
];

const WHAT_IT_DOES: { label: string; dot: string; desc: string }[] = [
  {
    label: "Before the visit",
    dot: "#EA2C00",
    desc: "Risk gap data from payers, EHR history, and risk registries, mapped to the patient before the visit begins.",
  },
  {
    label: "In the room",
    dot: "#F0704E",
    desc: "As conditions are discussed, each is checked against MEAT criteria and new findings are flagged for clinician review.",
  },
  {
    label: "After the visit",
    dot: "#F4A48C",
    desc: "A note drafted from the conversation, each confirmed condition documented with the specificity coding needs.",
  },
  {
    label: "Into the EHR",
    dot: "#B4A896",
    desc: "The note and the updated Visit Diagnosis list push together, every code tied to the conversation that generated it.",
  },
];

/**
 * Verbatim from the disclaimers shipped in the product UI. These are already in
 * front of clinicians, which makes them the most defensible wording available.
 */
const GUARDRAILS = [
  "For clinician review. Not a diagnosis or billing instruction",
  "Suggests options to support documentation, and never deletes existing items",
  "The clinician reviews the chart and chooses the final diagnoses",
  "Not a medical device",
];

/** Straight from the deck's outcome lines. Operational, never financial. */
const OUTCOMES = [
  "Audit-ready documentation, linked to the clinical evidence from the conversation",
  "HCC documentation at the point of conversation, rather than a chart review weeks later",
  "Reduced CDI query volume, because the specificity is already in the note",
];

export default function CareSignalsStory({ onBack, onHome }: Props) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#5E534A] antialiased">
      <MethodologyHeader activeLabel="Care Signals" railLabel="Care Signals" onBack={onBack} onHome={onHome} />

      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* hero */}
        <div className="pt-12 sm:pt-16 pb-8 sm:pb-10">
          <div className="text-[11.5px] font-extrabold tracking-[0.15em] uppercase text-[#EA2C00]">The risk gap</div>
          <h1 className="font-abridge text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.06] text-[#1A1A1A] mt-4 max-w-[860px]">
            {/* nowrap: this is the only headline of the four long enough to wrap,
                and it was breaking the coral phrase across two lines. */}
            Risk capture happens in the{" "}
            <span className="text-[#EA2C00] whitespace-nowrap">back office</span>.
          </h1>
          <p className="mt-5 text-[15px] sm:text-[17px] leading-[1.55] text-[#5E534A] max-w-[640px]">
            Gaps are flagged before a visit and closed after it, in a chart review or a query. The conversation where
            the condition was actually addressed is the one place it does not get captured.
          </p>
          <CaseProvenance>
            Abridge is listening while the condition is discussed. The evidence behind a code is the conversation that
            produced it, not a reconstruction assembled from the chart weeks later.
          </CaseProvenance>
        </div>

        {/* the same conditions, two states */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-0">
          <div className="border border-[#E8E2DA] rounded-[18px] bg-[#FDFBF8] px-6 sm:px-7 py-6 sm:py-7">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#8C8073] mb-1">Flagged</div>
            <div className="text-[12.5px] text-[#8C8073] mb-5">A gap list, without the clinical context to act on it</div>
            {CONDITIONS.map((c) => (
              <div
                key={c}
                className="flex items-start gap-3 rounded-[11px] border border-dashed border-[#DCD3C6] px-3.5 py-3 mb-2.5"
              >
                <span aria-hidden="true" className="mt-[3px] w-[13px] h-[13px] rounded-full border border-[#DCD3C6] flex-none" />
                <span className="text-[13px] leading-[1.4] text-[#A79E92]">{c}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center px-2 sm:px-4 text-[#B4A896] text-[22px]">&rarr;</div>
          <div className="border border-[#F1C9BC] rounded-[18px] bg-[#FFF9F6] px-6 sm:px-7 py-6 sm:py-7">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#EA2C00] mb-1">Addressed in the room</div>
            <div className="text-[12.5px] text-[#8C8073] mb-5">Discussed, documented, and linked to what was said</div>
            {CONDITIONS.map((c) => (
              <div key={c} className="flex items-start gap-3 rounded-[11px] border border-[#F1C9BC] bg-white px-3.5 py-3 mb-2.5">
                <span
                  aria-hidden="true"
                  className="mt-[3px] w-[13px] h-[13px] rounded-full bg-[#EA2C00] flex-none flex items-center justify-center text-white text-[8px] leading-none"
                >
                  &#10003;
                </span>
                <span className="text-[13px] leading-[1.4] text-[#3A342E]">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[13px] text-[#8C8073] mt-4 text-center">
          The same conditions, before and after the conversation.{" "}
          <b className="text-[#1A1A1A] font-bold">Risk capture belongs in the room, not the back office.</b>
        </p>

        {/* what it does */}
        <div className="mt-16 sm:mt-[66px]">
          <div className="text-[11.5px] font-extrabold tracking-[0.14em] uppercase text-[#443A32]">What it does</div>
          <p className="mt-2 text-[14px] leading-[1.5] text-[#8C8073] max-w-[640px]">
            Chart prepping is manual and does not scale. This runs in the workflow the clinician already uses: no new
            tool, no separate portal, no extra steps.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-[22px]">
            {WHAT_IT_DOES.map((v) => (
              <div key={v.label} className="border border-[#E8E2DA] rounded-[16px] bg-[#FDFBF8] p-5">
                <div className="font-abridge text-[17px] text-[#1A1A1A] flex items-center">
                  <span className="w-[9px] h-[9px] rounded-full mr-2" style={{ background: v.dot }} />
                  {v.label}
                </div>
                <div className="text-[12.5px] leading-[1.5] text-[#8C8073] mt-2">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* guardrails */}
        <div className="mt-16 sm:mt-[66px]">
          <div className="text-[11.5px] font-extrabold tracking-[0.14em] uppercase text-[#443A32]">Guardrails</div>
          <div className="mt-6 border border-[#E8E2DA] rounded-[18px] bg-[#FDFBF8] px-6 sm:px-[30px] py-7 flex flex-wrap items-start gap-x-[30px] gap-y-5">
            <div className="font-abridge text-[24px] sm:text-[26px] leading-[1.15] text-[#1A1A1A] max-w-[320px]">
              You choose the final <span className="text-[#EA2C00]">diagnoses</span>.
            </div>
            <ul className="flex-1 min-w-[280px] space-y-2.5">
              {GUARDRAILS.map((g) => (
                <li key={g} className="flex gap-3 text-[14px] leading-[1.55] text-[#5E534A]">
                  <span aria-hidden="true" className="mt-[9px] w-[5px] h-[5px] rounded-full bg-[#EA2C00] flex-none" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* why it has to happen in the room — the commercial close */}
        <div className="mt-16 sm:mt-[66px] mb-16 sm:mb-24">
          <div className="text-[11.5px] font-extrabold tracking-[0.14em] uppercase text-[#443A32]">Why it has to happen in the room</div>
          <div className="mt-6 border border-[#E8E2DA] rounded-[18px] bg-[#FDFBF8] px-6 sm:px-[30px] py-7 flex flex-wrap items-center gap-x-[30px] gap-y-4">
            <div className="font-abridge text-[24px] sm:text-[26px] leading-[1.15] text-[#1A1A1A] max-w-[330px]">
              The retrospective safety net is <span className="text-[#EA2C00]">going away</span>.
            </div>
            <div className="text-[14px] leading-[1.55] text-[#5E534A] max-w-[420px]">
              Incomplete documentation draws audit scrutiny, and CMS is eliminating retrospective review. What is not
              captured in the encounter can no longer be recovered by a chart review after it.
            </div>
          </div>
          <ul className="mt-9 space-y-3 max-w-[720px]">
            {OUTCOMES.map((o) => (
              <li key={o} className="flex gap-3.5 text-[14.5px] leading-[1.6] text-[#443A32]">
                <span aria-hidden="true" className="text-[#EA2C00] flex-none">&rarr;</span>
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
