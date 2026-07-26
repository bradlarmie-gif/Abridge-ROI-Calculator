import type { AttainCell } from "./attainContent";

/**
 * THROWAWAY. The STRATEGY chapter (page 3). Not a summary of Align + Plan; the
 * moment the promise becomes a scoreboard. It answers: is this real, how does it
 * actually happen (one causal spine, Align + Plan fused), and how we'll know we
 * got it (attainment = share of the promise realized, the handoff to Progress).
 */

const fmt$ = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);
const LBL = "text-[10px] font-bold uppercase tracking-[2px] text-[#8C8C8C]";

export default function StrategyView({ cell, committed = [] }: { cell: AttainCell; committed?: { title: string; chosen: string[] }[] }) {
  const { align, plan } = cell;
  const metrics = plan.outcomeGroups.flatMap((g) => g.metrics);
  const headline = metrics.filter((m) => m.today !== "—").slice(0, 3);
  const chosenPlays = committed.flatMap((c) => c.chosen);

  return (
    <div className="max-w-[760px] mx-auto">
      <p className={`${LBL} mb-2`}>Strategy · {cell.setting} · {cell.category}</p>
      <h2 className="font-abridge text-[30px] md:text-4xl text-[#1A1A1A] leading-tight mb-3">Here's what changes, and how you'll know</h2>
      <p className="text-[15px] text-[#3A3A3A] leading-relaxed max-w-[640px] mb-10">
        Everything you set in Align and Plan, on one page. This is the case you'd take to your board, and the scoreboard we'll hold ourselves to from here.
      </p>

      {/* 1 — the counterfactual + value in play */}
      <div className="rounded-2xl border border-[#E8E2DA] overflow-hidden mb-12">
        <div className="grid grid-cols-2 divide-x divide-[#E8E2DA]">
          <div className="p-5">
            <p className={`${LBL} mb-3`}>Today</p>
            <div className="space-y-3">
              {headline.map((m) => (
                <div key={m.id}>
                  <p className="font-abridge text-[22px] text-[#1A1A1A] leading-none">{m.today}<span className="text-[12px] font-normal text-[#8C8C8C]"> {m.unit}</span></p>
                  <p className="text-[12px] text-[#8C8C8C] mt-1 leading-snug">{m.name}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-5 bg-[#FAF7F2]">
            <p className={`${LBL} mb-3 text-[#EA2C00]`}>Where this takes you</p>
            <div className="space-y-3">
              {headline.map((m) => (
                <div key={m.id}>
                  <p className="font-abridge text-[22px] text-[#EA2C00] leading-none">{m.target}<span className="text-[12px] font-normal text-[#8C8C8C]"> {m.unit}</span></p>
                  <p className="text-[12px] text-[#8C8C8C] mt-1 leading-snug">{m.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-[#E8E2DA] px-5 py-5 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className={`${LBL} mb-1`}>The value in play</p>
            <p className="font-abridge text-4xl text-[#1A1A1A] leading-none">{fmt$(plan.valueInPlay)}<span className="text-base font-normal text-[#8C8C8C]"> / yr</span></p>
          </div>
          <p className="text-[12px] text-[#8C8C8C] max-w-[320px] leading-relaxed">{align.honestNote}</p>
        </div>
      </div>

      {/* 2 — the attainment chain (the causal spine) */}
      <p className={`${LBL} mb-1`}>How it actually happens</p>
      <h3 className="font-abridge text-[24px] text-[#1A1A1A] mb-6">The chain from what Abridge can enable to the value</h3>
      <div className="relative pl-8 mb-14">
        <span className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-[#F0C4B8]" />
        {/* node 1 — signals */}
        <ChainNode label="What Abridge can enable" sub="measured, from Epic and the Abridge platform">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {plan.abridgeSignals.map((s) => <span key={s.id} className="text-[13px] text-[#3A3A3A]">{s.name}</span>)}
          </div>
        </ChainNode>
        {/* node 2 — plays */}
        <ChainNode label="The plays your team runs" sub="what turns the freed time into the result">
          {chosenPlays.length ? (
            <div className="flex flex-wrap gap-2">
              {chosenPlays.map((p) => <span key={p} className="text-[12.5px] rounded-full px-3 py-1 border border-[#F0C4B8] bg-[#FBE7E1] text-[#EA2C00] font-medium">{p}</span>)}
            </div>
          ) : (
            <p className="text-[13px] text-[#B4A896] italic">Pick your plays back in Align and they show up here.</p>
          )}
        </ChainNode>
        {/* node 3 — outcomes */}
        <ChainNode label="The outcomes move" sub="the numbers you'll watch, against your baselines">
          <div className="space-y-1.5">
            {plan.outcomeGroups.map((g) => (
              <p key={g.outcome} className="text-[13px] text-[#3A3A3A]"><span className="font-medium text-[#1A1A1A]">{g.outcome}</span>: {g.metrics.map((m) => m.name).join(", ")}</p>
            ))}
          </div>
        </ChainNode>
        {/* node 4 — value */}
        <ChainNode label="The value lands" sub="the payoff, once the outcomes follow" last>
          <p className="font-abridge text-[26px] text-[#EA2C00] leading-none">{fmt$(plan.valueInPlay)}<span className="text-[13px] font-normal text-[#8C8C8C]"> / yr in play</span></p>
        </ChainNode>
      </div>

      {/* 3 — the scoreboard (the handoff to Progress) */}
      <div className="rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A] p-6 md:p-7 mb-12">
        <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-3">The scoreboard</p>
        <p className="text-[15px] text-white/90 leading-relaxed mb-5">
          From here we track <span className="text-white font-semibold">attainment</span>: the share of that {fmt$(plan.valueInPlay)} you actually realize. It starts at zero today and climbs as the signals move, the plays land, and the outcomes follow. Your named owners run the plays; we bring the numbers to every review, against the baselines you set.
        </p>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/40">Attained so far</span>
          <span className="font-abridge text-[15px] text-white/70">0%</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-[2%] bg-[#EA2C00]" />
        </div>
        <p className="text-[12px] text-white/45 mt-3 leading-relaxed">This is the number the Progress page tracks over time. It's what keeps both sides honest: the promise, measured.</p>
      </div>

      {/* 4 — beyond the number */}
      <p className={`${LBL} mb-3`}>Beyond the number</p>
      <p className="text-[14px] text-[#3A3A3A] leading-relaxed max-w-[620px] mb-5">The dollar is the hard part. Hitting it is also what lets you:</p>
      <div className="border-t border-[#E8E2DA] mb-16">
        {align.unlock.options.map((u) => (
          <div key={u.id} className="flex items-start gap-3.5 pl-1 py-4 border-b border-[#E8E2DA]">
            <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-[#EA2C00] flex-shrink-0" />
            <div>
              <p className="text-[16px] font-medium text-[#1A1A1A] leading-snug">{u.title}</p>
              <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[560px]">{u.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChainNode({ label, sub, children, last }: { label: string; sub: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`relative ${last ? "" : "pb-8"}`}>
      <span className="absolute -left-8 top-0.5 grid place-items-center w-[20px] h-[20px] rounded-full bg-[#EA2C00]">
        <span className="w-[7px] h-[7px] rounded-full bg-white" />
      </span>
      <p className="text-[15px] font-semibold text-[#1A1A1A] leading-snug">{label}</p>
      <p className="text-[12px] text-[#8C8C8C] mb-2.5">{sub}</p>
      {children}
    </div>
  );
}
