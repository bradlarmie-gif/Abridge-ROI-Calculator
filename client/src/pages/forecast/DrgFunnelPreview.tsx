import { useState, useMemo } from "react";
import { FormattedNumberInput } from "@/components/FormattedNumberInput";

/**
 * THROWAWAY PROTOTYPE (?drgfunnelpreview=1) — the before→after DRG query funnel,
 * modeling Abridge's DELTA (the cases the CDI query process structurally misses),
 * not the CDI program's total. For Brad to react to; not wired to the engine.
 */

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtMoney = (n: number) => {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
};

const INK = "#1A1A1A";
const CORAL = "#EA2C00";
const MUTED = "#8C8073";
const FAINT = "#A69A88";
const HAIR = "#EAE3D9";

/** coral-underline editable number */
function Edit({ value, onChange, suffix, prefix, step = 1, w = 70 }: { value: number; onChange: (n: number) => void; suffix?: string; prefix?: string; step?: number; w?: number }) {
  return (
    <span className="inline-flex items-baseline justify-center gap-1 border-b-2 pb-0.5" style={{ borderColor: "#F3C9BC", width: w }}>
      {prefix && <span className="text-[13px]" style={{ color: FAINT }}>{prefix}</span>}
      <FormattedNumberInput value={value} onChange={onChange} step={step}
        className="h-auto border-0 rounded-none bg-transparent p-0 shadow-none text-center text-[16px] font-bold tabular-nums focus-visible:ring-0 focus-visible:ring-offset-0"
        style={{ color: CORAL, width: `${String(value).length + 2}ch` }} />
      {suffix && <span className="text-[13px]" style={{ color: FAINT }}>{suffix}</span>}
    </span>
  );
}

function Row({ step, rate, onRate, cases, bold, faintRate }: { step: string; rate?: React.ReactNode; onRate?: boolean; cases: string; bold?: boolean; faintRate?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_120px_120px] items-baseline py-[14px]" style={{ borderTop: `1px solid ${HAIR}` }}>
      <span className={`text-[16px] ${bold ? "font-bold" : ""}`} style={{ color: INK }}>{step}</span>
      <span className="text-[15px] text-right tabular-nums" style={{ color: faintRate ? FAINT : MUTED }}>{rate ?? "—"}</span>
      <span className={`text-right tabular-nums ${bold ? "font-abridge text-[20px]" : "text-[16px]"}`} style={{ color: bold ? CORAL : INK }}>{cases}</span>
    </div>
  );
}

export default function DrgFunnelPreview() {
  // Funnel inputs (a CDI director pulls every one of these).
  const [discharges, setDischarges] = useState(10000);
  const [reviewPct, setReviewPct] = useState(60);
  const [queryPct, setQueryPct] = useState(10);
  const [respondPct, setRespondPct] = useState(70);
  const [changePct, setChangePct] = useState(60);
  const [weightGain, setWeightGain] = useState(0.4);
  const [baseRate, setBaseRate] = useState(7000);
  // Abridge's lever + the one honest haircut.
  const [capturePct, setCapturePct] = useState(33); // durable share of the FLAGGED-BUT-LOST queries Abridge captures (up front AND holds up under audit)

  const m = useMemo(() => {
    const reviewed = discharges * (reviewPct / 100);
    const queried = reviewed * (queryPct / 100);
    const responded = queried * (respondPct / 100);
    const changed = responded * (changePct / 100);
    // CDI program (baseline) — NOT Abridge's.
    const cdiWeight = changed * weightGain;
    const cdiCmi = discharges > 0 ? cdiWeight / discharges : 0;
    const cdiRevenue = cdiWeight * baseRate;
    // The leak: discharges the query process never corrected.
    // Abridge's delta: the flagged-but-lost queries (a query is evidence of a real
    // gap), captured up front, netted for audit survival.
    const lost = Math.max(0, queried - changed);
    const abridgeCases = lost * (capturePct / 100);
    const abridgeWeight = abridgeCases * weightGain;
    const abridgeCmi = discharges > 0 ? abridgeWeight / discharges : 0;
    const abridgeRevenue = abridgeWeight * baseRate;
    return { reviewed, queried, responded, changed, cdiWeight, cdiCmi, cdiRevenue, lost, abridgeCases, abridgeWeight, abridgeCmi, abridgeRevenue };
  }, [discharges, reviewPct, queryPct, respondPct, changePct, weightGain, baseRate, capturePct]);

  return (
    <div className="min-h-screen antialiased" style={{ background: "#FFFFFF", color: MUTED, fontFamily: "Manrope, sans-serif" }}>
      <div className="max-w-[880px] mx-auto px-8 py-16">
        <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase" style={{ color: FAINT }}>Forecast · Inpatient · DRG accuracy</div>
        <h1 className="font-abridge text-[34px] sm:text-[42px] leading-[1.08] mt-4 max-w-[620px]" style={{ color: INK }}>
          How a complete note turns into DRG revenue.
        </h1>
        <p className="mt-5 text-[16px] leading-[1.6] max-w-[620px]" style={{ color: MUTED }}>
          DRG revenue moves through the CDI query funnel. Start with what that funnel catches today, then read Abridge as the flagged gaps your team loses. A query is proof the record had a gap. Every rate is yours to edit.
        </p>

        {/* ── The funnel (today) ── */}
        <div className="mt-12">
          <div className="flex items-baseline justify-between mb-1">
            <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase" style={{ color: FAINT }}>What the CDI funnel catches today</div>
            <div className="grid grid-cols-[120px_120px] gap-0 text-[10.5px] font-extrabold tracking-[0.1em] uppercase" style={{ color: FAINT }}>
              <span className="text-right">Rate</span><span className="text-right">Cases</span>
            </div>
          </div>
          <Row step="Annual discharges" rate={<Edit value={discharges} onChange={setDischarges} step={500} w={90} />} cases={fmtInt(discharges)} faintRate />
          <Row step="Reviewed by CDI" rate={<Edit value={reviewPct} onChange={setReviewPct} suffix="%" />} cases={fmtInt(m.reviewed)} />
          <Row step="Query issued" rate={<Edit value={queryPct} onChange={setQueryPct} suffix="%" />} cases={fmtInt(m.queried)} />
          <Row step="Physician responds" rate={<Edit value={respondPct} onChange={setRespondPct} suffix="%" />} cases={fmtInt(m.responded)} />
          <Row step="Response changes the DRG" rate={<Edit value={changePct} onChange={setChangePct} suffix="%" />} cases={fmtInt(m.changed)} bold />
          <div className="grid grid-cols-[1fr_120px_120px] items-baseline py-[14px]" style={{ borderTop: `1px solid ${HAIR}` }}>
            <span className="text-[13.5px] italic" style={{ color: MUTED }}>Each moves up ~<Edit value={weightGain} onChange={setWeightGain} step={0.05} w={54} /> in weight, at <Edit value={baseRate} onChange={setBaseRate} prefix="$" step={250} w={86} />/weight</span>
            <span />
            <span className="text-right text-[15px]" style={{ color: MUTED }}>= {fmtMoney(m.cdiRevenue)}</span>
          </div>
          <p className="mt-3 text-[13.5px] leading-[1.55]" style={{ color: MUTED }}>
            That <b style={{ color: INK }}>{fmtMoney(m.cdiRevenue)}</b> is your CDI program working as designed (CMI +{m.cdiCmi.toFixed(3)}). It is theirs, with or without Abridge. It is not the Abridge number.
          </p>
        </div>

        {/* ── The leak ── */}
        <div className="mt-12 rounded-2xl px-7 py-6" style={{ background: "#FBF3EE", border: `1px solid #F3DDD2` }}>
          <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase" style={{ color: CORAL }}>Where the opening is</div>
          <p className="mt-3 text-[17px] leading-[1.5]" style={{ color: INK }}>
            Of the <b>{fmtInt(m.queried)}</b> gaps your CDI team flags, only <b>{fmtInt(m.changed)}</b> get corrected. The other <b style={{ color: CORAL }}>{fmtInt(m.lost)}</b> die in the query process: no response, or a response that doesn&apos;t stick. A query is proof the record had a gap.
          </p>
          <p className="mt-3 text-[14px] leading-[1.55]" style={{ color: MUTED }}>
            Abridge doesn&apos;t chase the query. The acuity is already in the note at the point of care, so on these flagged gaps the DRG is right the first time, with no dependence on a physician answering weeks later.
          </p>
        </div>

        {/* ── Abridge's delta ── */}
        <div className="mt-12">
          <div className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase" style={{ color: FAINT }}>What Abridge adds, on top</div>
          <div className="mt-4 grid grid-cols-[1fr_120px_120px] items-baseline py-[14px]" style={{ borderTop: `1px solid ${HAIR}` }}>
            <span className="text-[16px]" style={{ color: INK }}>Flagged but lost queries</span>
            <span />
            <span className="text-right text-[16px] tabular-nums" style={{ color: INK }}>{fmtInt(m.lost)}</span>
          </div>
          <Row step="Captured by Abridge" rate={<Edit value={capturePct} onChange={setCapturePct} suffix="%" />} cases={fmtInt(m.abridgeCases)} />

          <div className="mt-8 flex items-baseline gap-3">
            <span className="text-[13px]" style={{ color: FAINT }}>Abridge DRG value</span>
          </div>
          <div className="font-abridge text-[56px] leading-[0.9] mt-1" style={{ color: CORAL }}>
            {fmtMoney(m.abridgeRevenue)}<span className="text-[22px] font-normal" style={{ color: FAINT }}> a year</span>
          </div>
          <p className="mt-4 text-[14px] leading-[1.6] max-w-[640px]" style={{ color: MUTED }}>
            <b style={{ color: INK }}>{fmtInt(m.lost)}</b> flagged-but-lost queries × <b style={{ color: INK }}>{capturePct}%</b> captured by Abridge (<b style={{ color: INK }}>{fmtInt(m.abridgeCases)}</b> cases) × <b style={{ color: INK }}>{weightGain}</b> weight × <b style={{ color: INK }}>{fmtMoney(baseRate)}</b>/weight. One durable-capture lever, folded (lands up front and holds up under audit). No stacked haircuts.
          </p>
        </div>

        <p className="mt-14 text-[12px] italic" style={{ color: FAINT }}>Prototype · ?drgfunnelpreview=1 · not wired to the engine</p>
      </div>
    </div>
  );
}
