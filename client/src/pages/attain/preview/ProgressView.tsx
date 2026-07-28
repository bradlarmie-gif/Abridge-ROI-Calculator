import type { AttainCell, MetricDef } from "./attainContent";

/**
 * THROWAWAY. The PROGRESS chapter (page 4), manual-entry version (#1).
 *
 * The honest scoreboard + leak detector. Someone enters each metric's CURRENT
 * reading (pulled from its "Measured from" source at the review); attainment, the
 * chain-live status, and the read all compute from those entries. The gap is shown
 * on purpose to keep the number un-rigged. Time-series (the multi-review climb) is
 * a later add; here the climb shows this review against the full promise.
 */

const fmt$ = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);
const LBL = "text-[10px] font-bold uppercase tracking-[2px] text-[#8C8C8C]";
const num = (s: string) => { const n = parseFloat((s || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : NaN; };
const CURFIELD = "w-16 bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-0.5 text-center font-abridge text-[16px] outline-none transition-colors focus:border-[#EA2C00] placeholder:font-sans placeholder:text-[14px] placeholder:text-[#C4BCB0]";

export default function ProgressView({ cell, committed = [], readings, setReadings, reviewLog = [], onLogReview }: {
  cell: AttainCell; committed?: { title: string; chosen: string[] }[];
  readings: Record<string, string>; setReadings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  reviewLog?: { label: string; attain: number }[]; onLogReview: (attain: number) => void;
}) {
  const { plan } = cell;
  const proofOnly = !!cell.proofOnly; // measured on its signals, never a realized dollar
  const chosenPlays = committed.flatMap((c) => c.chosen);

  const signals = plan.abridgeSignals;
  const outcomeMetrics = plan.outcomeGroups.flatMap((g) => g.metrics).filter((m) => Number.isFinite(num(m.today)) && Number.isFinite(num(m.target)));

  // progress of one metric from its baseline toward its target, from the entered reading
  const prog = (m: MetricDef): number | null => {
    const c = num(readings[m.id]), a = num(m.today), b = num(m.target);
    if (!Number.isFinite(c) || !Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
    return (c - a) / (b - a);
  };
  const avg = (arr: (number | null)[]) => { const v = arr.filter((x): x is number => x !== null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

  const sigAvg = avg(signals.map(prog));
  const outAvg = avg(outcomeMetrics.map(prog));
  const attain = outAvg !== null ? Math.max(0, Math.min(1, outAvg)) : 0;
  const attainPct = Math.round(attain * 100);
  const realized = Math.round(plan.valueInPlay * attain);
  const gap = plan.valueInPlay - realized;
  const hasAny = sigAvg !== null || outAvg !== null;
  const leak = sigAvg !== null && outAvg !== null && sigAvg - outAvg > 0.12;
  const signalsLagging = sigAvg !== null && outAvg !== null && outAvg - sigAvg > 0.12;

  // the climb (this review vs the full promise; more points appear as reviews are logged)
  const W = 640, H = 170, padX = 44, top = 22, bottom = 142;
  const pts = reviewLog.length ? [0, ...reviewLog.map((r) => r.attain)] : [0, attainPct];
  const labels = reviewLog.length ? ["Kickoff", ...reviewLog.map((r) => r.label)] : ["Kickoff", "This review"];
  const xAt = (i: number) => padX + (i * (W - padX - 24)) / (pts.length - 1);
  const yAt = (v: number) => bottom - (v / 100) * (bottom - top);

  const read = (() => {
    if (!hasAny) return null;
    if (signalsLagging) return { lead: "The signals haven't moved much yet.", body: "There's little freed time downstream to convert, so the outcomes can't follow. Start upstream: adoption and the documentation load. Nothing else moves until this does." };
    if (leak) return { lead: "The signals are moving and the plays are running, so the freed time is real.", body: "But the outcomes are lagging the signals, which means that freed time isn't fully turning into results yet. That's the leak, and it's the middle link, the part that's yours to run. Before the next review, push on the plays that convert freed time into outcomes." };
    if (attainPct >= 75) return { lead: `You're at ${attainPct}% of the promise, and moving together.`, body: "Signals and outcomes are climbing in step. Hold the plays, keep the readings coming, and protect the gains." };
    return { lead: `You're at ${attainPct}%, climbing in step.`, body: "Signals and outcomes are moving together, so the chain is flowing. Keep the plays running and log the next reading to hold the pace." };
  })();

  return (
    <div className="max-w-[760px] mx-auto">
      <p className={`${LBL} mb-2`}>Progress · {cell.setting} · {cell.category}</p>
      <h2 className="font-abridge text-[30px] md:text-4xl text-[#1A1A1A] leading-tight mb-3">The promise, measured</h2>
      <p className="text-[15px] text-[#3A3A3A] leading-relaxed max-w-[640px] mb-10">
        Enter this review's readings, each pulled from its source, and the score builds itself. One number: how much of the promise you've actually realized. We show the gap on purpose. It's what keeps the score honest.
      </p>

      {/* 1 — attainment headline */}
      <div className="rounded-2xl border border-[#E8E2DA] p-6 md:p-7 mb-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <p className={`${LBL} mb-2`}>{proofOnly ? "Signals moving" : "Attainment"}</p>
            <p className="font-abridge text-6xl text-[#EA2C00] leading-none">{attainPct}<span className="text-3xl">%</span></p>
            <p className="text-[13px] text-[#8C8C8C] mt-2">{proofOnly ? "of the way to the signal targets you set" : `of the ${fmt$(plan.valueInPlay)}/yr promise`}</p>
          </div>
          {proofOnly ? (
            <div className="text-right max-w-[240px]">
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">Tracked as proof, not a dollar. The burnout pulse, likelihood-to-stay, and turnover are the scoreboard here.</p>
            </div>
          ) : (
            <div className="text-right">
              <p className="text-[14px] text-[#1A1A1A]"><span className="font-abridge text-[22px]">{fmt$(realized)}</span> realized</p>
              <p className="text-[14px] text-[#8C8C8C] mt-1"><span className="font-abridge text-[22px] text-[#1A1A1A]">{fmt$(gap)}</span> still on the table</p>
            </div>
          )}
        </div>
        <div className="h-3 rounded-full bg-[#E8E2DA] overflow-hidden">
          <div className="h-full bg-[#EA2C00] transition-all" style={{ width: `${attainPct}%` }} />
        </div>
        <p className="text-[12px] text-[#8C8C8C] mt-3 leading-relaxed">{hasAny ? "The gap is the work still ahead, and it's what we hold both sides to." : "Enter the readings below and this fills in from your real numbers."}</p>
      </div>

      {/* 2 — the climb */}
      <p className={`${LBL} mb-1`}>The climb</p>
      <h3 className="font-abridge text-[24px] text-[#1A1A1A] mb-1">Attainment against the full promise</h3>
      <p className="text-[13px] text-[#8C8C8C] mb-5 max-w-[600px]">Each review you log adds a point here, so the trend builds over time.</p>
      <div className="rounded-2xl border border-[#E8E2DA] p-5 mb-14">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <line x1={padX} y1={top} x2={W - 24} y2={top} stroke="#E0D9CE" strokeWidth="1" strokeDasharray="2 3" />
          <text x={W - 24} y={top - 6} textAnchor="end" fontSize="10" fill="#B4A896" className="uppercase tracking-widest">the full promise</text>
          <polygon points={`${xAt(0)},${bottom} ${pts.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ")} ${xAt(pts.length - 1)},${bottom}`} fill="#EA2C00" opacity="0.08" />
          <polyline points={pts.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ")} fill="none" stroke="#EA2C00" strokeWidth="2.5" />
          {pts.map((v, i) => (
            <g key={i}>
              <circle cx={xAt(i)} cy={yAt(v)} r="4" fill="#EA2C00" />
              <text x={xAt(i)} y={bottom + 18} textAnchor="middle" fontSize="11" fill="#8C8C8C">{labels[i]}</text>
              {i === pts.length - 1 && <text x={xAt(i)} y={yAt(v) - 12} textAnchor="middle" fontSize="13" fill="#EA2C00" className="font-abridge">{v}%</text>}
            </g>
          ))}
        </svg>
      </div>

      {/* 3 — the chain, live (enter readings here) */}
      <p className={`${LBL} mb-1`}>Where it's flowing, and where it's leaking</p>
      <h3 className="font-abridge text-[24px] text-[#1A1A1A] mb-2">The chain, live</h3>
      <p className="text-[13px] text-[#8C8C8C] mb-6 max-w-[600px]">Drop in this review's reading for each. The status and the leak update as you type.</p>
      <div className="space-y-3 mb-14">
        <LiveLink title="What Abridge can enable" tone={signalsLagging ? "leak" : "on"} statusLabel={sigAvg === null ? "Awaiting readings" : signalsLagging ? "Barely moving" : `${Math.round(Math.max(0, sigAvg) * 100)}% of the way`}
          metrics={signals} readings={readings} setReadings={setReadings} prog={prog} />
        <LiveLink title="The plays your team runs" tone="on" statusLabel="Running"
          note={chosenPlays.length ? chosenPlays.join(" · ") : "Set your plays in Align."} />
        <LiveLink title="The outcomes" tone={leak ? "leak" : "on"} statusLabel={outAvg === null ? "Awaiting readings" : leak ? "Behind the signals" : `${Math.round(Math.max(0, outAvg) * 100)}% of the way`}
          metrics={outcomeMetrics} readings={readings} setReadings={setReadings} prog={prog} />
        <LiveLink title={proofOnly ? "The proof" : "The value"} tone="value" statusLabel={proofOnly ? `${attainPct}% of signals` : `${attainPct}% attained`}
          note={proofOnly ? "Tracked as proof, not a dollar. We hold ourselves to the signals moving." : `${fmt$(realized)} of ${fmt$(plan.valueInPlay)} realized so far.`} />
      </div>

      {/* log this review — snapshots the readings into the climb */}
      <div className="flex flex-wrap items-center gap-4 mb-14">
        <button type="button" onClick={() => onLogReview(attainPct)} disabled={!hasAny} className="rounded-xl bg-[#EA2C00] text-white text-[14px] font-semibold px-5 py-2.5 hover:bg-[#d12800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Log this review</button>
        <span className="text-[13px] text-[#8C8C8C]">{reviewLog.length ? `${reviewLog.length} review${reviewLog.length > 1 ? "s" : ""} logged. Logging again adds another point to the climb.` : "Snapshots these readings and drops a point on the climb above. Everything's saved to this partner automatically."}</span>
      </div>

      {/* 4 — the read */}
      <div className="rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A] p-6 md:p-7 mb-16">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-3">The read</p>
        {read ? (
          <>
            <p className="text-[15px] text-white/90 leading-relaxed">{read.lead} {read.body}</p>
            <p className="text-[12px] text-white/45 mt-3 leading-relaxed">This read updates every review, straight from the readings you enter.</p>
          </>
        ) : (
          <p className="text-[15px] text-white/70 leading-relaxed">Enter this review's readings above and the read writes itself here: what's flowing, what's leaking, and the move before the next review.</p>
        )}
      </div>
    </div>
  );
}

function LiveLink({ title, tone, statusLabel, metrics, readings, setReadings, prog, note }: {
  title: string; tone: "on" | "leak" | "value"; statusLabel: string;
  metrics?: MetricDef[]; readings?: Record<string, string>; setReadings?: React.Dispatch<React.SetStateAction<Record<string, string>>>; prog?: (m: MetricDef) => number | null; note?: string;
}) {
  const accent = tone === "leak" ? "#EA2C00" : tone === "value" ? "#1A1A1A" : "#8C8C8C";
  return (
    <div className={`rounded-2xl border p-5 ${tone === "leak" ? "border-[#F0C4B8] bg-[#FDF6F3]" : "border-[#E8E2DA]"}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[15px] font-semibold text-[#1A1A1A]">{title}</p>
        <span className="text-[11px] font-bold uppercase tracking-[1.5px] rounded-full px-2.5 py-1" style={{ color: tone === "leak" ? "#EA2C00" : "#6B6B6B", backgroundColor: tone === "leak" ? "#FBE7E1" : "#F2EDE5" }}>{statusLabel}</span>
      </div>
      {note && <p className="text-[13px] text-[#6B6B6B] leading-relaxed">{note}</p>}
      {metrics && readings && setReadings && prog && (
        <div className="space-y-3.5">
          {metrics.map((m) => {
            const p = prog(m);
            return (
              <div key={m.id}>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className="text-[13px] text-[#3A3A3A]">{m.name}</span>
                  <span className="flex items-baseline gap-1.5 text-[12px] text-[#8C8C8C]">
                    <span>{m.today}</span>
                    <span className="text-[#C4BCB0]">&rarr;</span>
                    <input value={readings[m.id] ?? ""} onChange={(e) => setReadings((r) => ({ ...r, [m.id]: e.target.value }))} placeholder="now" className={CURFIELD} style={{ color: accent }} />
                    <span className="text-[#C4BCB0]">&rarr;</span>
                    <span>{m.target} {m.unit}</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#E8E2DA] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${p === null ? 0 : Math.max(0, Math.min(1, p)) * 100}%`, backgroundColor: accent }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
