import { MethodologyHeader } from "./MethodologyHeader";
import { CaseProvenance } from "./CaseProvenance";

interface Props {
  onBack: () => void;
  onHome: () => void;
}

/**
 * The Case · Pre-Bill.
 *
 * Deliberately the same argument shape as the Ambient Documentation story: two
 * records of the same thing, side by side, and the gap between them. There it is
 * the visit versus the note. Here it is the documented stay versus the coded
 * claim.
 *
 * COPY RULES, because this page is read by people who will hold us to it:
 *  - Verbs are observational — compares, surfaces, shows, routes. Never finds,
 *    corrects, recovers, captures, or increases.
 *  - Every capability line and every guardrail line is lifted verbatim from the
 *    cleared Pre-Bill deck. Nothing here is a new product claim.
 *  - No dollars. This is The Case; the money lives in The Numbers.
 */

/** Rows of the record. `onClaim: false` = documented in the stay, absent from the claim. */
const RECORD_ROWS: { w: number; onClaim: boolean }[] = [
  { w: 92, onClaim: true },
  { w: 74, onClaim: true },
  { w: 88, onClaim: false },
  { w: 60, onClaim: true },
  { w: 81, onClaim: false },
  { w: 52, onClaim: true },
  { w: 78, onClaim: false },
  { w: 46, onClaim: true },
];

const WHAT_IT_DOES: { label: string; dot: string; desc: string }[] = [
  {
    label: "A working DRG",
    dot: "#EA2C00",
    desc: "A provisional DRG computed from documentation, updated as new notes come in.",
  },
  {
    label: "Differences",
    dot: "#F0704E",
    desc: "Potential differences between the coded case and the documented stay, surfaced.",
  },
  {
    label: "The evidence",
    dot: "#F4A48C",
    desc: "The clinical evidence behind each finding, shown alongside it.",
  },
  {
    label: "A decision",
    dot: "#B4A896",
    desc: "The case routed to CDI and coding for a decision before submission.",
  },
];

const GUARDRAILS = [
  "Evaluates coding support and accuracy",
  "CDI and coding retain final decision authority",
  "Does not autonomously code, change, or submit a claim",
];

/** Where the checkpoint sits. `here` marks Pre-Bill's moment in the stay. */
const TIMELINE: { label: string; sub: string; here?: boolean }[] = [
  { label: "Admission", sub: "The stay begins" },
  { label: "Notes accumulate", sub: "The record builds day by day" },
  { label: "Discharge", sub: "The summary is written" },
  { label: "Coding", sub: "The record becomes a claim" },
  { label: "Pre-Bill", sub: "The coded case meets the documented stay", here: true },
  { label: "Submission", sub: "The claim leaves" },
];

export default function PreBillStory({ onBack, onHome }: Props) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#5E534A] antialiased">
      <MethodologyHeader activeLabel="Pre-Bill" railLabel="Pre-Bill" onBack={onBack} onHome={onHome} />

      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-14">
        {/* hero */}
        <div className="pt-12 sm:pt-16 pb-8 sm:pb-10">
          <div className="text-[11.5px] font-extrabold tracking-[0.15em] uppercase text-[#EA2C00]">The claim</div>
          <h1 className="font-abridge text-[34px] sm:text-[44px] lg:text-[52px] leading-[1.06] text-[#1A1A1A] mt-4 max-w-[860px]">
            The claim goes out on a <span className="text-[#EA2C00]">summary</span>.
          </h1>
          <p className="mt-5 text-[15px] sm:text-[17px] leading-[1.55] text-[#5E534A] max-w-[640px]">
            Abridge captures and documents how the clinical story develops from admission through discharge. After
            discharge, coding translates the completed record into the diagnoses, procedures, and DRG on the claim. The
            stay often documented more than the summary carries. Pre-Bill compares the coded case with the documented
            stay, helping CDI and coding confirm that the claim is accurate and supported before submission.
          </p>
          <CaseProvenance>
            Every finding points back to a note captured at the bedside. The comparison is not reconstructed from the
            claim. It is read from the record that produced it.
          </CaseProvenance>
        </div>

        {/* the two-record graphic: the claim is a subset of the stay */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-0">
          <div className="border border-[#E8E2DA] rounded-[18px] bg-[#FDFBF8] px-6 sm:px-7 py-6 sm:py-7">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#8C8073] mb-1">What the claim carries</div>
            <div className="text-[12.5px] text-[#8C8073] mb-5">Coded from the final summary</div>
            {RECORD_ROWS.map((r, i) =>
              r.onClaim ? (
                <div key={i} className="h-[10px] rounded-[5px] mb-3.5 bg-[#CFC6B9]" style={{ width: `${r.w}%` }} />
              ) : (
                // documented, but not on the claim: an outline, not a bar
                <div
                  key={i}
                  className="h-[10px] rounded-[5px] mb-3.5 border border-dashed border-[#DCD3C6]"
                  style={{ width: `${r.w}%` }}
                />
              ),
            )}
          </div>
          <div className="flex items-center justify-center px-2 sm:px-4 text-[#B4A896] text-[22px]">&rarr;</div>
          <div className="border border-[#F1C9BC] rounded-[18px] bg-[#FFF9F6] px-6 sm:px-7 py-6 sm:py-7">
            <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-[#EA2C00] mb-1">What the stay documented</div>
            <div className="text-[12.5px] text-[#8C8073] mb-5">Across every signed note</div>
            {RECORD_ROWS.map((r, i) => (
              <div
                key={i}
                className={`h-[10px] rounded-[5px] mb-3.5 ${r.onClaim ? "bg-[#F2B7A6]" : "bg-[#EA2C00]"}`}
                style={{ width: `${r.w}%` }}
              />
            ))}
          </div>
        </div>
        <p className="text-[13px] text-[#8C8073] mt-4 text-center">
          The same stay, recorded two ways.{" "}
          <b className="text-[#1A1A1A] font-bold">Everything Pre-Bill does comes from comparing them before submission.</b>
        </p>

        {/* what it is */}
        <div className="mt-16 sm:mt-[66px]">
          <div className="text-[11.5px] font-extrabold tracking-[0.14em] uppercase text-[#443A32]">What Pre-Bill does</div>
          <p className="mt-2 text-[14px] leading-[1.5] text-[#8C8073] max-w-[640px]">
            It runs underneath the stay rather than after it, so the comparison is ready while a change can still reach
            the outgoing claim.
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
          <div className="flex justify-end mt-3.5">
            <span className="text-[12.5px] italic text-[#B4A896]">a review, not a rewrite</span>
          </div>
        </div>

        {/* guardrails — the load-bearing section, so it gets the widest slot */}
        <div className="mt-16 sm:mt-[66px]">
          <div className="text-[11.5px] font-extrabold tracking-[0.14em] uppercase text-[#443A32]">Guardrails</div>
          <div className="mt-6 border border-[#E8E2DA] rounded-[18px] bg-[#FDFBF8] px-6 sm:px-[30px] py-7 flex flex-wrap items-start gap-x-[30px] gap-y-5">
            <div className="font-abridge text-[24px] sm:text-[26px] leading-[1.15] text-[#1A1A1A] max-w-[320px]">
              CDI and coding decide. <span className="text-[#EA2C00]">Always</span>.
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

        {/* where the checkpoint sits */}
        <div className="mt-16 sm:mt-[66px] mb-16 sm:mb-24">
          <div className="text-[11.5px] font-extrabold tracking-[0.14em] uppercase text-[#443A32]">Where it sits in the stay</div>
          <p className="mt-2 text-[14px] leading-[1.5] text-[#8C8073] max-w-[640px]">
            Late enough that the record is complete, early enough that a change still reaches the claim.
          </p>
          <ol className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {TIMELINE.map((t, i) => (
              <li
                key={t.label}
                className={`relative rounded-[14px] px-4 py-4 border ${
                  t.here ? "border-[#F1C9BC] bg-[#FFF9F6]" : "border-[#E8E2DA] bg-[#FDFBF8]"
                }`}
              >
                <div className={`font-abridge text-[12px] tracking-[0.06em] ${t.here ? "text-[#EA2C00]" : "text-[#CFC5B7]"}`}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className={`text-[14px] font-semibold mt-1.5 leading-[1.2] ${t.here ? "text-[#1A1A1A]" : "text-[#5E534A]"}`}>
                  {t.label}
                </div>
                <div className="text-[12px] leading-[1.45] text-[#8C8073] mt-1.5">{t.sub}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
