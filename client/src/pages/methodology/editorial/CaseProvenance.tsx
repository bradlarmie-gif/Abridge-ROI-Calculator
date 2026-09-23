import type { ReactNode } from "react";

/**
 * The moat beat, shared by every story in The Case.
 *
 * Each story used to run truth, root cause, reframe, and then stop. A reader
 * finished agreeing the problem was real with no reason it should be Abridge
 * that closes it. This is the fourth beat.
 *
 * It is deliberately a statement of PROVENANCE, not a comparison. The claim is
 * only ever "here is what this is read from", because the spine of the whole
 * section is that the record is the asset and everything else is a claim on it.
 * Naming a competitor, or asserting a better model, would make it an argument
 * the reader can push back on. A dependency is not arguable.
 *
 * Sits directly under the hero rather than at the end, so it colours everything
 * that follows instead of arriving once the reader has already decided.
 */
export function CaseProvenance({ children }: { children: ReactNode }) {
  return (
    <div className="mt-7 border-l-2 border-[#EA2C00] pl-5 max-w-[620px]">
      <p className="text-[14.5px] leading-[1.6] text-[#443A32]">{children}</p>
    </div>
  );
}
