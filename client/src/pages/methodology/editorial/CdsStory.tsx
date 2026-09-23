import { MethodologyHeader } from "./MethodologyHeader";
import { CaseProvenance } from "./CaseProvenance";

interface Props {
  onBack: () => void;
  onHome: () => void;
}

/**
 * The Case · Clinical Decision Support.
 *
 * Third chapter of the same argument: two records of the same thing, side by
 * side, and the gap between them. Ambient is the visit against the note.
 * Pre-Bill is the documented stay against the coded claim. Here it is the same
 * clinical question answered without the patient and answered with them.
 *
 * COPY RULES, tighter here than anywhere else in The Case, because decision
 * support is a regulated category and this page will be read as a claim:
 *  - Every capability sentence is drawn from Abridge's own published CDS page.
 *    Nothing on this page is a capability I inferred.
 *  - Verbs are observational — surfaces, connects, cites, shapes. Never
 *    diagnoses, recommends, decides, or advises.
 *  - No dollars, and no adoption statistics. The Case argues why the problem is
 *    real, not how many people already bought it.
 */

/** The same question, answered two ways. Left has no patient behind it. */
const ANSWER_ROWS_GENERIC = [88, 96, 72, 90, 64, 84];
const ANSWER_ROWS_CONTEXT = [92, 78, 96, 70, 88, 60];

/**
 * The three, per the product's own definition: "CDS draws on three types of
 * information at once: the live conversation, the patient's chart, and cited
 * medical evidence." Was four ad-hoc chips of my own; this is the real shape,
 * and it is the thing that is hard to assemble from outside the room.
 */
const CONTEXT_CHIPS = ["The live conversation", "The patient's chart", "Cited medical evidence"];

/** A real example from the internal FAQ, so the graphic shows an actual question. */
const EXAMPLE_QUESTION =
  "What is recommended for managing this patient's hypertension given their current medications?";

const WHAT_IT_DOES: { label: string; dot: string; desc: string }[] = [
  {
    label: "In context",
    dot: "#EA2C00",
    desc: "Any clinical question in natural language, or a query of the chart. The patient history is the context that shapes the answer.",
  },
  {
    label: "The patient's story",
    dot: "#F0704E",
    desc: "Information shaped by what is already known about the patient's journey, surfaced when it is needed.",
  },
  {
    label: "Cited evidence",
    dot: "#F4A48C",
    desc: "Every insight connects back to trusted clinical literature. Cited and traceable.",
  },
  {
    label: "Decide and act",
    dot: "#B4A896",
    desc: "What information matters, what goes in the note, and what happens next.",
  },
];

/**
 * Guardrails, in the product's own words.
 *
 * The last one is a governance fact, and it belongs here rather than in a
 * marketing beat: where a tool runs is a guardrail question. It is stated only
 * as what IS true of this deployment. The internal framing of what clinicians
 * would otherwise do, and where patient information would otherwise travel, is
 * left off — that is enablement language, and the positioning lands as subtext
 * without it.
 */
const GUARDRAILS = [
  "Surfaces relevant medical information for clinician review at the point of care",
  "The clinician decides what information matters, what goes in the note, and what happens next",
  "Every insight connects back to trusted clinical literature, cited and traceable",
];

/**
 * A few of the published sources, not the whole list.
 *
 * The list moves: specialty sources are added on a rolling basis, and the
 * internal and public lists already disagree. Naming all of them makes this page
 * wrong the week one changes, so it names the heavyweights and says openly that
 * there are more. The AHA footnote is theirs and is reproduced exactly:
 * dropping it would misstate the relationship.
 */
const SOURCES = [
  "NEJM",
  "JAMA",
  "American Heart Association*",
  "American Diabetes Association",
  "American Family Physician",
  "Journal of Clinical Oncology",
];

export default function CdsStory({ onBack, onHome }: Props) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#5E534A] antialiased">
      <MethodologyHeader activeLabel="CDS" railLabel="Clinical Decision Support" onBack={onBack} onHome={onHome} />

      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* hero */}
        <div className="pt-12 sm:pt-16 pb-8 sm:pb-10">
          {/* Was "The answer comes back generic." Next to Abridge branding that
              reads at a glance as though Abridge is the one answering generically.
              The subject is now the literature, which is unarguable and cannot be
              misread as a claim about this product. */}
          <div className="text-[11.5px] font-extrabold tracking-[0.15em] uppercase text-[#EA2C00]">The evidence</div>
          <h1 className="font-abridge text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.06] text-[#1A1A1A] mt-4 max-w-[860px]">
            Guidelines are written for <span className="text-[#EA2C00]">populations</span>.
          </h1>
          <p className="mt-5 text-[15px] sm:text-[17px] leading-[1.55] text-[#5E534A] max-w-[640px]">
            The patient in front of you is one person, with their own medications, labs, and history. Closing that
            distance is left to the clinician, mid-visit.
          </p>
          <CaseProvenance>
            Three things answer the question at once: the live conversation, the patient's chart, and cited medical
            evidence. Two of those are not retrieved. They are already there, because Abridge is in the room while the
            encounter happens.
          </CaseProvenance>
        </div>

        {/* the same question, answered two ways */}
        <div className="border border-[#E8E2DA] rounded-[18px] bg-[#FDFBF8] px-6 sm:px-7 py-5 mb-4">
          <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#8C8073] mb-2">A question, mid-visit</div>
          <p className="font-abridge text-[19px] sm:text-[22px] leading-[1.25] text-[#1A1A1A]">&ldquo;{EXAMPLE_QUESTION}&rdquo;</p>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-0">
          <div className="border border-[#E8E2DA] rounded-[18px] bg-[#FDFBF8] px-6 sm:px-7 py-6 sm:py-7">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#8C8073] mb-1">The question, alone</div>
            <div className="text-[12.5px] text-[#8C8073] mb-5">The same answer for every patient</div>
            {/* nothing above the answer: no context was available to shape it */}
            <div className="min-h-[26px] mb-5" />
            {ANSWER_ROWS_GENERIC.map((w, i) => (
              <div key={i} className="h-[10px] rounded-[5px] mb-3.5 bg-[#CFC6B9]" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="flex items-center justify-center px-2 sm:px-4 text-[#B4A896] text-[22px]">&rarr;</div>
          <div className="border border-[#F1C9BC] rounded-[18px] bg-[#FFF9F6] px-6 sm:px-7 py-6 sm:py-7">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#EA2C00] mb-1">The question, in context</div>
            <div className="text-[12.5px] text-[#8C8073] mb-5">Shaped by what was already there</div>
            <div className="flex flex-wrap gap-1.5 mb-5 min-h-[26px]">
              {CONTEXT_CHIPS.map((c) => (
                <span key={c} className="text-[10.5px] font-semibold text-[#EA2C00] bg-[#FFEDE7] rounded-full px-2.5 py-1">
                  {c}
                </span>
              ))}
            </div>
            {ANSWER_ROWS_CONTEXT.map((w, i) => (
              <div
                key={i}
                className={`h-[10px] rounded-[5px] mb-3.5 ${i % 2 === 0 ? "bg-[#EA2C00]" : "bg-[#F2B7A6]"}`}
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
        <p className="text-[13px] text-[#8C8073] mt-4 text-center">
          The same question, answered two ways.{" "}
          <b className="text-[#1A1A1A] font-bold">Everything here comes from the context already being in the room.</b>
        </p>

        {/* what it does */}
        <div className="mt-16 sm:mt-[66px]">
          <div className="text-[11.5px] font-extrabold tracking-[0.14em] uppercase text-[#443A32]">What it does</div>
          <p className="mt-2 text-[14px] leading-[1.5] text-[#8C8073] max-w-[640px]">
            Clinicians ask in natural language, view insights tailored to the encounter and the patient, explore the
            source material, and review the evidence without leaving their workflow.
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
              The clinician decides. <span className="text-[#EA2C00]">Always</span>.
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

        {/* where the evidence comes from — a logo wall, not a row of pills.
            Small bordered chips made these read like tags rather than the
            institutions they are. Set as wordmarks in one band, evenly spaced and
            desaturated, which is how a real source wall reads. Swap in the actual
            SVGs when they exist: same grid, replace the <span> with an <img>. */}
        <div className="mt-16 sm:mt-[66px] mb-16 sm:mb-24">
          <div className="text-[11.5px] font-extrabold tracking-[0.14em] uppercase text-[#443A32]">Where the evidence comes from</div>
          <p className="mt-2 text-[14px] leading-[1.5] text-[#8C8073] max-w-[640px]">
            Every insight connects back to the literature behind it, so a clinician can follow it to the source.
          </p>
          <div className="mt-6 border border-[#E8E2DA] rounded-[18px] bg-[#FDFBF8] px-6 sm:px-10 py-9">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-8 items-center">
              {SOURCES.map((src) => (
                <div key={src} className="flex items-center justify-center text-center">
                  <span className="font-abridge text-[17px] sm:text-[19px] leading-[1.2] text-[#8C8073]">{src}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-[#EFE9E0] flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <span className="text-[13.5px] text-[#5E534A]">and further specialty sources, added on a rolling basis</span>
              <span className="text-[12px] text-[#B4A896]">*American Heart Association licenses selected scientific content to Abridge.</span>
            </div>
          </div>

          {/* the commercial close, and the one that actually moves a CIO */}
          <div className="mt-7 border-l-2 border-[#EA2C00] pl-5 max-w-[620px]">
            <p className="text-[14.5px] leading-[1.6] text-[#443A32]">
              It runs inside the contract, security review, and BAA the organization already holds. Nothing new to
              procure, integrate, or govern.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
