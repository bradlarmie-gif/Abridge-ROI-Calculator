// The calm beat under the consolidation waterfall: one reassuring read of how
// the stack phases in. Not a second performance. The message leads on the left;
// the phases sit quietly on the right, ending in the full run-rate you arrive at.
// Phases and run-rate derive from the same tool data the waterfall uses.
import { useMemo } from "react";
import { buildRollout, type AppRatItem } from "@/lib/appRationalizationCalc";

function fmtM(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${Math.round(a / 1_000)}K`;
  return `$${Math.round(a)}`;
}

// "reached this year" / "reached next year" / "reached in Year 3"
function reachedPhrase(year: number): string {
  if (year <= 1) return "reached this year";
  if (year === 2) return "reached next year";
  return `reached in Year ${year}`;
}

export default function RolloutBeat({
  items, termYears, abridgePrice,
}: { items: AppRatItem[]; termYears: number; abridgePrice: number }) {
  const rollout = useMemo(() => buildRollout(items, termYears, abridgePrice), [items, termYears, abridgePrice]);

  if (!rollout.hasRollout) return null;

  const { phases, runRate, reachedYear } = rollout;
  const staged = phases.length > 1;
  const hasSavings = runRate > 0;

  return (
    <div className="mt-6 pt-6 border-t border-[#E8E2DA]" data-testid="ar-rollout">
      <div className="font-abridge uppercase tracking-[0.17em] text-[10.5px] text-[#B4A99B] mb-4">How it rolls out</div>

      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 md:gap-14 items-start">
        {/* message leads */}
        <p className="ar-roll-stmt font-abridge text-[22px] leading-[1.38] tracking-[-0.006em] text-[#3A342E] max-w-[440px]" style={{ animationDelay: "0.05s" }}>
          {staged ? (
            <>Most of your stack can come off <b className="text-[#1A1A1A]">now</b>. The rest follows your existing <b className="text-[#1A1A1A]">contracts</b>, so this happens on <b className="text-[#1A1A1A]">your timeline</b>, not all at once.</>
          ) : (
            <>Your whole stack can come off together, <b className="text-[#1A1A1A]">{phases[0].label.toLowerCase()}</b>. On your timeline, nothing staged to manage.</>
          )}
        </p>

        {/* the phases sit quietly on the right, ending in the destination */}
        <div className="ar-roll-steps relative pl-[22px]">
          {phases.map((p, i) => (
            <div key={p.year} className="ar-rstep relative pb-[22px]" style={{ animationDelay: `${0.16 + i * 0.11}s` }}>
              <span className="ar-rdot" />
              <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#8C7E6E]">{p.label}</div>
              <div className="text-[14px] font-semibold text-[#1A1A1A] mt-1 leading-[1.4]">{p.tools.join(", ")}</div>
            </div>
          ))}

          {/* destination: the full run-rate, a filled coral marker (not a tool event) */}
          <div className="ar-rstep ar-goal relative" style={{ animationDelay: `${0.16 + phases.length * 0.11}s` }}>
            <span className="ar-rdot" />
            {hasSavings ? (
              <>
                <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#EA2C00]">Full run-rate</div>
                <div className="text-[14px] font-semibold text-[#1A1A1A] mt-1 leading-[1.4]">
                  <b className="font-extrabold tabular-nums">{fmtM(runRate)}/yr</b>{" "}
                  <span className="text-[12px] font-medium text-[#8C7E6E]">{reachedPhrase(reachedYear)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#EA2C00]">Fully consolidated</div>
                <div className="text-[14px] font-semibold text-[#1A1A1A] mt-1 leading-[1.4]">
                  <span className="text-[12px] font-medium text-[#8C7E6E]">{reachedPhrase(reachedYear)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .ar-roll-steps::before{ content:""; position:absolute; left:4.5px; top:9px; bottom:11px; width:2px; background:#E4DBCC; border-radius:2px; }
        .ar-roll-steps .ar-rstep:last-child{ padding-bottom:0; }
        .ar-rdot{ position:absolute; left:-22px; top:3px; width:11px; height:11px; border-radius:50%; background:#FAF8F5; border:2.5px solid #7E7263; box-shadow:0 0 0 3px #FAF8F5; }
        .ar-roll-steps .ar-goal .ar-rdot{ background:#EA2C00; border-color:#EA2C00; }
        @media (prefers-reduced-motion: no-preference){
          .ar-roll-stmt, .ar-roll-steps .ar-rstep{ opacity:0; transform:translateY(6px); animation:arRollRise .5s ease-out forwards; }
          @keyframes arRollRise{ to{ opacity:1; transform:none; } }
        }
      `}</style>
    </div>
  );
}
