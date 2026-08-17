/**
 * THROWAWAY proof (?attainpdf=1). Page 1 of the Attain PDF — "the case."
 * Editorial Attain branding (cream / coral / abridge face), sized to US Letter at 96dpi
 * (816×1056). Built to feel COMPLETE: edge-to-edge, banded, footer pinned — no dead white.
 * Data-driven via props; renders sample Outpatient data on the route.
 */

import abridgeLogo from "@assets/abridge-logo-wordmark-red_1769020684647.png";
import { fmt$ as sharedFmt$ } from "@/lib/attain/attainFormat";

const CORAL = "#EA2C00";

export type Cat = { name: string; value: number; note?: string; opens?: string[]; entered: boolean; realized?: number; proofOnly?: boolean };
export type PdfData = {
  partner: string; setting: string; date: string; preparedWith: string;
  total: number; categories: Cat[];
  chain: { value: string; label: string }[]; // the worked build line
  chainCategory?: string; // the category the build chain describes (its largest line)
  // filled in at each review — the same page, come alive
  review?: { label: string; attainmentPct: number; realized: number; climb: { label: string; pct: number }[]; read: string };
};
export type PdfMode = "kickoff" | "review";

// One shared money formatter across screen + PDF (B/M/K ladder), so the same figure never renders
// at a different precision on the export than on the screen (it used to be toFixed(2) here).
export const fmtDollars = sharedFmt$;
const fmt$ = fmtDollars;

const SAMPLE: PdfData = {
  partner: "Deaconess Health System",
  setting: "Outpatient",
  date: "July 2026",
  preparedWith: "Dana Ruiz · Ambulatory Access Director",
  total: 549_000,
  categories: [
    { name: "Patient Access", value: 549_000, realized: 210_000, note: "Filling freed-time headroom at $220 a visit", opens: ["Take on a new contract or payer", "Keep a service line whole"], entered: true },
    { name: "Provider Retention", value: 0, proofOnly: true, note: "Tracked as proof: turnover, burnout, likelihood to stay. No dollar attached, on purpose.", opens: ["Protect a fragile service line", "Wind down agency spend"], entered: true },
    { name: "Revenue Capture", value: 0, note: "Keeping the documentation-driven coding lift", opens: ["Fund the documentation program", "Stop writing off preventable denials"], entered: false },
  ],
  chain: [
    { value: "140,000", label: "visits a year" },
    { value: "2 min", label: "saved per note" },
    { value: "25%", label: "of headroom filled" },
    { value: "$220", label: "margin a visit" },
  ],
  review: {
    label: "Review 4 · Jul 2026",
    attainmentPct: 38,
    realized: 210_000,
    climb: [{ label: "Kickoff", pct: 0 }, { label: "Oct", pct: 10 }, { label: "Jan", pct: 21 }, { label: "Apr", pct: 29 }, { label: "Now", pct: 34 }],
    read: "On pace on Patient Access. Provider Retention is behind its signals: the day is lighter, but the turnover hasn't followed yet.",
  },
};

function CategoryRow({ c, total, review }: { c: Cat; total: number; review?: boolean }) {
  if (!c.entered) {
    // "off" — kept on the page so the plan always shows what was and wasn't agreed to
    return (
      <div className="py-[10px] border-b border-[#EFEAE1] last:border-b-0">
        <div className="flex items-baseline justify-between mb-[7px]">
          <span className="font-abridge text-[17px] text-[#C0B7A8]">{c.name}</span>
          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#C0B7A8] border border-[#E7E0D6] rounded-full px-[9px] py-[2px]">Not in this plan</span>
        </div>
        <div className="h-[7px] rounded-full bg-[#F1ECE4] mb-[6px]" />
        <p className="text-[11.5px] text-[#C4BCB0] leading-snug">Available to turn on in a later review.</p>
      </div>
    );
  }
  if (c.proofOnly) {
    // Tracked as proof (retention): no dollar, no bar, no realized $. It's the
    // wellbeing layer — shown as signals, deliberately kept out of the number.
    return (
      <div className="py-[10px] border-b border-[#EFEAE1] last:border-b-0">
        <div className="flex items-baseline justify-between mb-[7px]">
          <span className="font-abridge text-[17px] text-[#1A1A1A]">{c.name}</span>
          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#8C8C8C] border border-[#E7E0D6] rounded-full px-[9px] py-[2px]">Tracked · no dollar</span>
        </div>
        <p className="text-[11.5px] text-[#8C8C8C] leading-snug">{c.note}</p>
      </div>
    );
  }
  if (review) {
    // realized within this category's own promise
    const attained = c.value > 0 ? Math.round(((c.realized ?? 0) / c.value) * 100) : 0;
    return (
      <div className="py-[10px] border-b border-[#EFEAE1] last:border-b-0">
        <div className="flex items-baseline justify-between mb-[7px]">
          <span className="font-abridge text-[17px] text-[#1A1A1A]">{c.name}</span>
          <span className="font-abridge text-[18px] text-[#1A1A1A]">{fmt$(c.realized ?? 0)}<span className="text-[11px] text-[#8C8C8C]"> realized</span></span>
        </div>
        <div className="h-[7px] rounded-full bg-[#EFEAE1] overflow-hidden mb-[6px]">
          <div className="h-full rounded-full" style={{ width: `${attained}%`, backgroundColor: CORAL }} />
        </div>
        <p className="text-[11.5px] text-[#8C8C8C] leading-snug">{attained}% of the {fmt$(c.value)}/yr promise</p>
      </div>
    );
  }
  const pct = total > 0 ? Math.round((c.value / total) * 100) : 0;
  return (
    <div className="py-[10px] border-b border-[#EFEAE1] last:border-b-0">
      <div className="flex items-baseline justify-between mb-[7px]">
        <span className="font-abridge text-[17px] text-[#1A1A1A]">{c.name}</span>
        <span className="font-abridge text-[18px] text-[#1A1A1A]">{fmt$(c.value)}<span className="text-[11px] text-[#8C8C8C]"> / yr</span></span>
      </div>
      <div className="h-[7px] rounded-full bg-[#EFEAE1] overflow-hidden mb-[6px]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CORAL }} />
      </div>
      <p className="text-[11.5px] text-[#8C8C8C] leading-snug">{c.note}</p>
    </div>
  );
}

// the climb: attainment over reviews, on the dark scoreboard band
function ClimbChart({ pts }: { pts: { label: string; pct: number }[] }) {
  const W = 300, H = 118, padX = 16, top = 12, bottom = 88;
  const xAt = (i: number) => padX + (i * (W - padX * 2)) / (pts.length - 1);
  const yAt = (v: number) => bottom - (v / 100) * (bottom - top);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-[300px]">
      <line x1={padX} y1={top} x2={W - padX} y2={top} stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="2 3" />
      <text x={W - padX} y={top - 3} textAnchor="end" fontSize="7.5" fill="rgba(255,255,255,0.4)" style={{ letterSpacing: "1px" }}>FULL PROMISE</text>
      <polyline points={pts.map((p, i) => `${xAt(i)},${yAt(p.pct)}`).join(" ")} fill="none" stroke={CORAL} strokeWidth="2" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(p.pct)} r={i === pts.length - 1 ? 3.5 : 2.5} fill={CORAL} />
          <text x={xAt(i)} y={bottom + 15} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.5)">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

export default function AttainPdfPage1({ data = SAMPLE, mode = "kickoff" }: { data?: PdfData; mode?: PdfMode }) {
  const enteredCount = data.categories.filter((c) => c.entered).length;
  const review = mode === "review" ? data.review : undefined;
  const onTable = data.total - (review?.realized ?? 0);
  return (
    <div className="pdf-page mx-auto bg-[#FFFFFF] text-[#1A1A1A]" style={{ width: 816, height: 1056, breakAfter: "page" }}>
      <style>{`@page { size: Letter; margin: 0; } @media print { body { margin: 0; } }`}</style>
      <div className="flex flex-col h-full px-[62px] pt-[52px] pb-[42px]">

        {/* Masthead */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-[16px]">
            <img src={abridgeLogo} alt="Abridge" className="h-[20px] w-auto" />
            <span className="h-[20px] w-px bg-[#D8CFC0]" />
            <span className="text-[10.5px] font-bold uppercase tracking-[2.5px] text-[#8C8C8C]">The case{review ? " · where it stands" : ""}</span>
          </div>
          <div className="text-right">
            <p className="font-abridge text-[15px] text-[#1A1A1A] leading-tight">{data.partner}</p>
            <p className="text-[11px] text-[#8C8C8C] mt-[3px]">{data.setting} · {data.date}</p>
          </div>
        </div>

        <div className="h-px bg-[#EFEAE1] mt-[18px] mb-[20px]" />

        {/* Hero — the number + the frame */}
        <div className="flex items-end justify-between gap-8">
          <div>
            {review ? (
              /* At a review, the pitch page (p2) already carried the promise; this
                 page pivots to where the partner stands against it. */
              <>
                <p className="text-[10.5px] font-bold uppercase tracking-[2.5px] text-[#8C8C8C] mb-[10px]">Realized so far · all categories</p>
                <p className="font-abridge leading-[0.9] text-[#1A1A1A]" style={{ fontSize: 84 }}>
                  <span style={{ color: CORAL }}>{fmt$(review.realized)}</span>
                  <span className="text-[24px] text-[#8C8C8C] font-normal"> of {fmt$(data.total)}/yr</span>
                </p>
                <p className="text-[13px] text-[#8C8C8C] mt-[10px]"><span className="font-abridge text-[16px] text-[#1A1A1A]">{fmt$(onTable)}</span> still on the table</p>
              </>
            ) : data.total > 0 ? (
              <>
                <p className="text-[10.5px] font-bold uppercase tracking-[2.5px] text-[#8C8C8C] mb-[10px]">The value in play, all categories</p>
                <p className="font-abridge leading-[0.9] text-[#1A1A1A]" style={{ fontSize: 84 }}>
                  <span style={{ color: CORAL }}>{fmt$(data.total)}</span>
                  <span className="text-[24px] text-[#8C8C8C] font-normal"> / year</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-[10.5px] font-bold uppercase tracking-[2.5px] text-[#8C8C8C] mb-[10px]">The value in play, all categories</p>
                <p className="font-abridge leading-[0.95] text-[#1A1A1A]" style={{ fontSize: 46 }}>Not yet sized</p>
                <p className="text-[13px] text-[#8C8C8C] mt-[8px] max-w-[430px]">Enter the economics for each category and the number sizes itself here.</p>
              </>
            )}
          </div>
          <div className="text-right pb-[6px] shrink-0">
            {review ? (
              <>
                <p className="font-abridge text-[26px] text-[#1A1A1A] leading-none">{review.label.split(" · ")[0]}</p>
                <p className="text-[10px] uppercase tracking-[1.5px] text-[#8C8C8C] mt-[3px] mb-[13px]">{data.date}</p>
                <p className="font-abridge text-[26px] text-[#1A1A1A] leading-none">Quarterly</p>
                <p className="text-[10px] uppercase tracking-[1.5px] text-[#8C8C8C] mt-[3px]">review cadence</p>
              </>
            ) : (
              <>
                <p className="font-abridge text-[26px] text-[#1A1A1A] leading-none">{enteredCount}<span className="text-[15px] text-[#8C8C8C]"> of {data.categories.length}</span></p>
                <p className="text-[10px] uppercase tracking-[1.5px] text-[#8C8C8C] mt-[3px] mb-[13px]">categories in play</p>
                <p className="font-abridge text-[26px] text-[#1A1A1A] leading-none">Quarterly</p>
                <p className="text-[10px] uppercase tracking-[1.5px] text-[#8C8C8C] mt-[3px]">review cadence</p>
              </>
            )}
          </div>
        </div>
        <p className="text-[13px] text-[#3A3A3A] leading-relaxed max-w-[560px] mt-[14px]">
          Built entirely from your own volume, your economics, and the realization you set with us. Not a benchmark, and not a list price.
        </p>

        <div className="h-px bg-[#EFEAE1] mt-[18px] mb-[18px]" />

        {/* Two columns: the breakdown + how it's built */}
        <div className="grid grid-cols-[1.15fr_1fr] gap-[42px]">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[2.5px] text-[#8C8C8C] mb-[8px]">Across your categories</p>
            <div>
              {data.categories.map((c) => <CategoryRow key={c.name} c={c} total={data.total} review={!!review} />)}
            </div>
          </div>
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[2.5px] text-[#8C8C8C] mb-[12px]">How the number is built</p>
            <p className="text-[12.5px] text-[#3A3A3A] leading-relaxed mb-[14px]">A lighter documentation load is the shared lever. {data.chainCategory ?? "Patient Access"}, your largest line, runs this chain:</p>
            <div className="space-y-[9px]">
              {data.chain.map((s, i) => (
                <div key={i} className="flex items-baseline gap-[12px]">
                  <span className="font-abridge text-[22px] text-[#1A1A1A] w-[92px] shrink-0" style={i === 0 ? undefined : {}}>{s.value}</span>
                  <span className="text-[12px] text-[#8C8C8C] leading-snug">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="h-px bg-[#EFEAE1] my-[16px]" />
            <p className="text-[11.5px] text-[#8C8C8C] leading-relaxed">Minutes saved is seeded conservatively, then measured on Progress. Every other number here is yours.</p>
          </div>
        </div>

        {/* "What this opens" lives in full on the per-category pages; keeping only a
           preview here duplicated them and overran the page, so it is not repeated. */}

        {/* Scoreboard band — kickoff: the promise-to-come. review: the live scoreboard + climb. */}
        {review ? (
          <div className="mt-auto rounded-[14px] p-[24px]" style={{ backgroundColor: "#1A1A1A" }}>
            <div className="flex items-start justify-between gap-[36px]">
              <div className="pt-[2px]">
                <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-white/45 mb-[8px]">The climb · attainment over reviews</p>
                <p className="font-abridge leading-none" style={{ fontSize: 46, color: CORAL }}>{review.attainmentPct}%<span className="text-[15px] text-white/50 font-normal"> of the {fmt$(data.total)}/yr promise</span></p>
                <p className="text-[13px] text-white/80 mt-[12px] max-w-[300px] leading-relaxed">Each review moves the realized number toward the full promise. The gap is the work still ahead.</p>
              </div>
              <div className="shrink-0">
                <ClimbChart pts={review.climb} />
              </div>
            </div>
            <div className="h-px bg-white/10 my-[14px]" />
            <p className="text-[12.5px] text-white/70 leading-relaxed"><span className="text-white/45 font-bold uppercase tracking-[1.5px] text-[10px] mr-[8px]">The read</span>{review.read}</p>
          </div>
        ) : (
          <div className="mt-auto rounded-[14px] p-[26px]" style={{ backgroundColor: "#1A1A1A" }}>
            <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-white/45 mb-[10px]">From here, the scoreboard</p>
            <div className="flex items-end justify-between gap-8">
              <p className="text-[14.5px] text-white/85 leading-relaxed max-w-[430px]">
                Measurement begins at go-live. Every quarterly review fills this page with what you've realized against the promise, and shows the gap in full.
              </p>
              <div className="text-right shrink-0">
                <p className="font-abridge text-[40px] leading-none" style={{ color: CORAL }}>0%</p>
                <p className="text-[10.5px] uppercase tracking-[1.5px] text-white/45 mt-[4px]">realized to date</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-[18px]">
          <p className="text-[10.5px] text-[#8C8C8C] leading-snug max-w-[520px]">Counted once, valued at margin, never charges. We only count what more time and earlier documentation can realistically move.</p>
          <p className="text-[10px] uppercase tracking-[1.5px] text-[#B4A896]">Abridge · Page 1</p>
        </div>
      </div>
    </div>
  );
}
