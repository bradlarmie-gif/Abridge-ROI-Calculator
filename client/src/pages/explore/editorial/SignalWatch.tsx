import { useState } from "react";
import type { WatchDomain } from "@/lib/exploreWatchSignals";

/**
 * "What you can watch": the editorial signal block shown under a value driver.
 * A quiet, scannable list of measures a leader can track; each row expands
 * ("Trace it") into a documentation-first throughline: what changes in the
 * note → the measurable signal → why it matters, phrased as capability and
 * observation, never a causal claim.
 */
export function SignalWatch({ domain, title = "What you can watch" }: { domain: WatchDomain; title?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="mt-9">
      <div className="flex items-baseline gap-2.5 mb-2 flex-wrap">
        <span className="text-[11px] font-extrabold tracking-[0.09em] uppercase text-[#2E2822]">{title}</span>
        <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase text-[#786C5E] bg-[#F1EBE3] rounded-full px-[9px] py-[3px]">
          signals · not counted
        </span>
        <span className="ml-auto text-[12px] text-[#786C5E]">the dollar: {domain.dollar}</span>
      </div>
      <p className="text-[12.5px] text-[#5E534A] leading-[1.5] mb-3.5 max-w-[660px]">
        Every measure here starts with the documentation. They are the numbers that move first, so the value is
        something you confirm on your own dashboards, not something we ask you to take on faith.
      </p>

      <div className="border-t border-[#EDE5D8]">
        {domain.signals.map((s, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="border-b border-[#EDE5D8]">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-baseline gap-4 py-[14px] text-left group"
                data-testid={`signal-trace-${i}`}
              >
                <span className="text-[15px] font-bold text-[#1A1A1A]">{s.name}</span>
                <span className="text-[13px] text-[#786C5E] flex-1 hidden sm:block">{s.what}</span>
                <span className="text-[11.5px] font-bold text-[#B02200] whitespace-nowrap flex items-center gap-[5px]">
                  {isOpen ? "Close" : "Trace it"}
                  <span className={`inline-block transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>↓</span>
                </span>
              </button>
              {isOpen && (
                <div className="pb-[18px] pl-[18px] ml-[2px] border-l-2 border-[#F2C9BC] flex flex-col gap-[13px]">
                  <Beat label="In the note" text={s.inNote} />
                  <Beat label="The signal" text={s.signal} />
                  <Beat label="Why it matters" text={s.matters} matters />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Beat({ label, text, matters }: { label: string; text: string; matters?: boolean }) {
  return (
    <div>
      <div
        className={`text-[9.5px] font-extrabold tracking-[0.09em] uppercase mb-1 ${
          matters ? "text-[#B02200]" : "text-[#786C5E]"
        }`}
      >
        {label}
      </div>
      <div className="text-[13.5px] text-[#574C41] leading-[1.55] max-w-[660px] [&_b]:text-[#1A1A1A] [&_b]:font-bold">
        {text}
      </div>
    </div>
  );
}
