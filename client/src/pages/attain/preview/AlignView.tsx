import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import type { AlignContent } from "./attainContent";
import { econModel, type EconField, type Assumption } from "./attainEconomics";
import { AttainNumberInput } from "./AttainNumberInput";

/** THROWAWAY. The Align chapter, rendered from AlignContent (setting x category). */

const fmt$ = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);
const fmtN = (n: number) => Math.round(n).toLocaleString();
const num = (s: string) => { const n = parseFloat((s || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; };

const LBL = "text-[10px] font-semibold uppercase tracking-[1.8px] text-[#8C8C8C]";
const NUMFIELD =
  "w-28 bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-1 font-abridge text-2xl text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:font-sans placeholder:text-[15px] placeholder:text-[#C4BCB0]";

function SectionHead({ n, kicker, title }: { n: number; kicker: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">Question {n} · {kicker}</p>
      <h2 className="font-abridge text-[26px] md:text-[30px] text-[#1A1A1A] leading-tight">{title}</h2>
    </div>
  );
}

function Box({ on }: { on: boolean }) {
  return (
    <span className={`mt-0.5 flex-shrink-0 grid place-items-center w-[18px] h-[18px] rounded-[5px] border-[1.5px] transition-colors ${on ? "bg-[#EA2C00] border-[#EA2C00]" : "border-[#CFC6B8] bg-white group-hover:border-[#B4A896]"}`}>
      {on && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
  );
}
function Radio({ on }: { on: boolean }) {
  return (
    <span className={`mt-0.5 flex-shrink-0 grid place-items-center w-[18px] h-[18px] rounded-full border-[1.5px] ${on ? "border-[#EA2C00]" : "border-[#CFC6B8] bg-white group-hover:border-[#B4A896]"}`}>
      {on && <span className="w-[9px] h-[9px] rounded-full bg-[#EA2C00]" />}
    </span>
  );
}

function OptionRow({ on, onToggle, title, desc, tag, radio }: { on: boolean; onToggle: () => void; title: string; desc: string; tag?: string; radio?: boolean }) {
  return (
    <button type="button" onClick={onToggle} className="group relative w-full text-left flex items-start gap-3.5 pl-4 pr-3 py-4 border-b border-[#E8E2DA] hover:bg-[#F2EDE5] transition-colors">
      {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" />}
      {radio ? <Radio on={on} /> : <Box on={on} />}
      <div>
        <div className="flex items-center gap-2.5">
          <p className={`text-[16px] leading-snug ${on ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>{title}</p>
          {tag && <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] border border-[#F0C4B8] rounded-full px-2 py-0.5">{tag}</span>}
        </div>
        <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[560px]">{desc}</p>
      </div>
    </button>
  );
}

export type AlignInputs = { scope: string; econ: Record<string, string>; stance: number | null; custom: string };

// The Align answers that used to be local (and got wiped on chapter switch) — now liftable.
export type AlignAnswers = { segs: Set<string>; choices: Record<string, Set<string>>; proof: Set<string>; unlock: Set<string> };
export const emptyAlignAnswers = (c: AlignContent): AlignAnswers => ({
  segs: new Set(), choices: Object.fromEntries((c.choices ?? []).map((q) => [q.id, new Set<string>()])), proof: new Set(), unlock: new Set(),
});

export default function AlignView({ c, settingLabel, categoryLabel, picked, setPicked, plays, setPlays, scopeCount, inputs: inputsProp, onInput: onInputProp, liveValue, liveMath, answers: answersProp, setAnswers: setAnswersProp }: {
  c: AlignContent; settingLabel: string; categoryLabel: string;
  picked: Set<string>; setPicked: React.Dispatch<React.SetStateAction<Set<string>>>;
  plays: Record<string, Set<string>>; setPlays: React.Dispatch<React.SetStateAction<Record<string, Set<string>>>>;
  scopeCount?: number; // real count from the partner's Starting Point (providers / nurses / beds)
  inputs?: AlignInputs; // value-affecting inputs, LIFTED so they persist + feed the whole app
  onInput?: (patch: Partial<AlignInputs>) => void;
  liveValue?: number; liveMath?: string; // the one engine-computed number, shared everywhere
  answers?: AlignAnswers; // digs/segs/choices/proof/unlock, LIFTED so chapter switches don't wipe them
  setAnswers?: React.Dispatch<React.SetStateAction<AlignAnswers>>;
}) {
  const [localInputs, setLocalInputs] = useState<AlignInputs>({ scope: scopeCount != null ? String(scopeCount) : "", econ: {}, stance: null, custom: "" });
  const inputs = inputsProp ?? localInputs;
  const onInput = onInputProp ?? ((patch: Partial<AlignInputs>) => setLocalInputs((s) => ({ ...s, ...patch })));
  const providers = inputs.scope;
  const setProviders = (v: string) => onInput({ scope: v });
  const setEcon = (key: string, v: string) => onInput({ econ: { ...inputs.econ, [key]: v } });

  // Align answers — LIFTED so switching chapters or categories never loses in-progress work.
  const [localAnswers, setLocalAnswers] = useState<AlignAnswers>(() => emptyAlignAnswers(c));
  const answers = answersProp ?? localAnswers;
  const setAns = setAnswersProp ?? setLocalAnswers;
  const { segs, choices, proof, unlock } = answers;
  const field = <K extends keyof AlignAnswers>(k: K) => (v: React.SetStateAction<AlignAnswers[K]>) =>
    setAns((a) => ({ ...a, [k]: typeof v === "function" ? (v as (p: AlignAnswers[K]) => AlignAnswers[K])(a[k]) : v }));
  const setSegs = field("segs"), setChoices = field("choices"), setProof = field("proof"), setUnlock = field("unlock");

  // the economics beat + realization stance for this category (if it has a model)
  const econ = econModel(settingLabel, categoryLabel);
  // Does this model gate on a payer frame? Payer-driven categories (Outpatient) ask a
  // frame question and hide goals until a payer is picked. Goal-driven categories
  // (ED / Inpatient) have no frame, so all their goals are always visible.
  const hasFrame = (c.choices ?? []).some((q) => q.stage === "frame");
  // Multi-lever categories: which levers are live. A lever turns on when its payer options
  // intersect the payer answer (choice id "book") OR its outcomeIds intersect the picked goals.
  // null = this model has no levers (render its flat fields exactly as before).
  const bookAns = choices["book"] ?? new Set<string>();
  const activeLevers = econ?.levers
    ? econ.levers.filter((l) => (l.payerOptionIds?.some((id) => bookAns.has(id)) ?? false) || (l.outcomeIds?.some((id) => picked.has(id)) ?? false))
    : null;
  const stance = inputs.stance; // one of the bands, or -1 for custom
  const [showAssumptions, setShowAssumptions] = useState(false);
  const togglePlay = (oid: string, label: string) => setPlays((p) => { const s = new Set(p[oid] ?? []); s.has(label) ? s.delete(label) : s.add(label); return { ...p, [oid]: s }; });
  const addPlay = (oid: string, label: string) => setPlays((p) => { const s = new Set(p[oid] ?? []); s.add(label); return { ...p, [oid]: s }; });
  const [playDraft, setPlayDraft] = useState<Record<string, string>>({});

  const single = c.outcomesMode === "single";
  const toggleOutcome = (id: string) => {
    const adding = !picked.has(id);
    setPicked((p) => {
      if (single) return new Set([id]);
      const n = new Set(p); adding ? n.add(id) : n.delete(id); return n;
    });
    if (adding || single) {
      const o = c.outcomes.find((x) => x.id === id);
      if (o?.proof) setProof((pr) => { const s = single ? new Set<string>() : new Set(pr); o.proof!.forEach((x) => s.add(x)); return s; });
    }
  };
  const toggleSeg = (id: string) => setSegs((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleChoice = (qid: string, oid: string, mode: "single" | "multi") =>
    setChoices((c2) => { const cur = new Set(c2[qid]); if (mode === "single") return { ...c2, [qid]: new Set([oid]) }; cur.has(oid) ? cur.delete(oid) : cur.add(oid); return { ...c2, [qid]: cur }; });
  const toggleProof = (id: string) => setProof((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleUnlock = (id: string) => setUnlock((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allSegs = c.segments ? c.segments.options.every((o) => segs.has(o.id)) : false;
  const setAllSegs = () => c.segments && setSegs(allSegs ? new Set() : new Set(c.segments.options.map((o) => o.id)));

  // The value + its math come from the parent (one engine-computed number, shared everywhere).
  // Categories with an economics beat light up; the rest stay blank until theirs is built.
  const showValue = liveValue ?? 0;
  const showMath = liveMath ?? "";

  const suggested = new Set(c.outcomes.filter((o) => picked.has(o.id)).flatMap((o) => o.proof ?? []));

  // one economics field (real-money lever, blank + required) — shared by the flat and lever layouts
  const renderEconField = (f: EconField) => (
    <div key={f.key} className="mb-8">
      <p className={`${LBL} mb-1.5`}>{f.label}</p>
      <div className="flex items-baseline gap-1">
        {f.prefix && <span className="font-abridge text-2xl text-[#8C8C8C]">{f.prefix}</span>}
        <AttainNumberInput value={inputs.econ[f.key] ?? ""} onChange={(raw) => setEcon(f.key, raw)} placeholder={f.placeholder} className={NUMFIELD} />
        {f.suffix && <span className="text-[15px] text-[#8C8C8C]">{f.suffix}</span>}
      </div>
      {f.hint && <p className="text-[12px] text-[#8C8C8C] mt-1.5">{f.hint}</p>}
    </div>
  );
  // one seeded assumption input (used inline under a lever, and inside the collapsible panel)
  const renderAssumptionInput = (a: Assumption) => (
    <div key={a.key}>
      <p className={`${LBL} mb-1`}>{a.label}</p>
      <div className="flex items-baseline gap-1">
        {a.prefix && <span className="text-[16px] text-[#8C8C8C]">{a.prefix}</span>}
        <AttainNumberInput value={inputs.econ[a.key] ?? ""} onChange={(raw) => setEcon(a.key, raw)} onBlur={() => { if (!(inputs.econ[a.key] ?? "").trim()) setEcon(a.key, a.default); }} className="w-24 bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-0.5 font-abridge text-[17px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00]" />
        {a.suffix && <span className="text-[13px] text-[#8C8C8C]">{a.suffix}</span>}
      </div>
    </div>
  );

  let qn = 0;

  return (
    <div className="max-w-[760px] mx-auto">
      <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#8C8C8C] mb-2">Align · {settingLabel} · {categoryLabel}</p>
      <h2 className="font-abridge text-[30px] md:text-4xl text-[#1A1A1A] leading-tight mb-3">What are you hoping to change?</h2>
      <p className="text-[15px] text-[#3A3A3A] leading-relaxed max-w-[640px] mb-12">{c.outcomesHelper}</p>

      {/* Q — frame choices (e.g. the payer mix): asked FIRST because they set which
          revenue lever the rest of the questions and the number should follow. */}
      {(c.choices ?? []).filter((q) => q.stage === "frame").map((q) => (
        <div key={q.id}>
          <SectionHead n={++qn} kicker={q.kicker} title={q.prompt} />
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-4 max-w-[600px]">{q.helper}</p>
          <div className="border-t border-[#E8E2DA] mb-12">
            {q.options.map((o) => <OptionRow key={o.id} on={(choices[q.id] ?? new Set()).has(o.id)} onToggle={() => toggleChoice(q.id, o.id, q.mode)} title={o.title} desc={o.desc} radio={q.mode === "single"} />)}
          </div>
        </div>
      ))}

      {/* Q — outcomes */}
      <SectionHead n={++qn} kicker="The outcomes" title={c.outcomesPrompt} />
      {hasFrame && activeLevers !== null && activeLevers.length === 0 ? (
        <p className="text-[14px] text-[#8C8C8C] leading-relaxed mb-12 max-w-[600px]">Pick your payers above, and the goals for each book will appear here.</p>
      ) : (
        <div className="border-t border-[#E8E2DA] mb-12">
          {c.outcomes.filter((o) => !hasFrame || activeLevers === null || !o.lever || activeLevers.some((l) => l.id === o.lever)).map((o) => (
            <div key={o.id} className="border-b border-[#E8E2DA]">
              <button type="button" onClick={() => toggleOutcome(o.id)} className="group relative w-full text-left flex items-start gap-3.5 pl-4 pr-3 py-4 hover:bg-[#F2EDE5] transition-colors">
                {picked.has(o.id) && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" />}
                {single ? <Radio on={picked.has(o.id)} /> : <Box on={picked.has(o.id)} />}
                <div>
                  <p className={`text-[16px] leading-snug ${picked.has(o.id) ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>{o.title}</p>
                  <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[560px]">{o.desc}</p>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Q — segments */}
      {c.segments && (
        <>
          <SectionHead n={++qn} kicker="The specialties" title={c.segments.prompt} />
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-3 max-w-[600px]">{c.segments.helper}</p>
          <div className="flex justify-end mb-1">
            <button type="button" onClick={setAllSegs} className="text-[12px] font-semibold text-[#EA2C00] hover:underline">{allSegs ? "Clear all" : c.segments.allLabel}</button>
          </div>
          <div className="border-t border-[#E8E2DA] mb-12">
            {c.segments.options.map((s) => <OptionRow key={s.id} on={segs.has(s.id)} onToggle={() => toggleSeg(s.id)} title={s.title} desc={s.desc} />)}
          </div>
        </>
      )}

      {/* Q — scope */}
      {c.scope && (
        <>
          <SectionHead n={++qn} kicker="The scope" title={c.scope.prompt} />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 mb-2">
            <AttainNumberInput value={providers} onChange={(raw) => { if (raw === "") { setProviders(""); return; } const v = scopeCount != null ? Math.min(num(raw), scopeCount) : num(raw); setProviders(String(v)); }} className={NUMFIELD} placeholder="0" />
            <span className="text-[14px] text-[#8C8C8C]">{scopeCount != null ? `of ${scopeCount} ` : ""}{c.scope.unitLabel}</span>
            {scopeCount != null && <button type="button" onClick={() => setProviders(String(scopeCount))} className="text-[12px] font-semibold text-[#EA2C00] hover:underline">Use all {scopeCount}</button>}
          </div>
          <p className="text-[12px] text-[#8C8C8C] mb-12">{scopeCount != null ? "That total came from your Starting Point; scope to a slice of it, or run the whole setting." : "How many this applies to."}</p>
        </>
      )}

      {/* Q — the remaining framing questions (e.g. the "why is it slipping" cause):
          asked after the leak is named, before we price it. */}
      {(c.choices ?? []).filter((q) => q.stage !== "frame").map((q) => (
        <div key={q.id}>
          <SectionHead n={++qn} kicker={q.kicker} title={q.prompt} />
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-4 max-w-[600px]">{q.helper}</p>
          <div className="border-t border-[#E8E2DA] mb-12">
            {q.options.map((o) => <OptionRow key={o.id} on={(choices[q.id] ?? new Set()).has(o.id)} onToggle={() => toggleChoice(q.id, o.id, q.mode)} title={o.title} desc={o.desc} radio={q.mode === "single"} />)}
          </div>
        </div>
      ))}

      {/* Q — the economics (their real money + the fill stance), asked after the leak and its cause. */}
      {econ && (
        <>
          <SectionHead n={++qn} kicker="The economics" title={econ.title} />
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6 max-w-[600px]">{econ.helper}</p>

          {/* Multi-lever: render only the levers the payer answer turned on, each as its own
              labeled sub-group (its fields + its seeded assumptions). Single-lever models render
              their flat fields exactly as before. */}
          {activeLevers ? (
            activeLevers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D8CFC0] bg-[#FAF7F2] p-5 mb-8">
                <p className="text-[14px] text-[#6B6B6B] leading-relaxed max-w-[520px]">{hasFrame ? "Pick the payers in the first question above to set which revenue lever we price. Fee-for-service prices the coding lift; risk contracts price the recapture; pick both and we size both." : "Pick a goal above to set which lever we price. Each goal you pick adds its own lever here, and the number sizes from your figures."}</p>
              </div>
            ) : (
              <div className="space-y-6 mb-8">
                {activeLevers.map((lever) => {
                  const lf = econ.fields.filter((f) => f.lever === lever.id);
                  const la = (econ.assumptions ?? []).filter((a) => a.lever === lever.id);
                  return (
                    <div key={lever.id} className="rounded-xl border border-[#E8E2DA] bg-[#FAF7F2] p-5">
                      <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#443A32] mb-4">{lever.label}</p>
                      {lf.map(renderEconField)}
                      {la.length > 0 && (
                        <>
                          <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#8C8C8C] mb-3">Assumptions · seeded and editable</p>
                          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">{la.map(renderAssumptionInput)}</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            econ.fields.map(renderEconField)
          )}

          {/* the shared realization stance — hidden only when a lever model has no lever live yet */}
          {(!activeLevers || activeLevers.length > 0) && (<>
          <p className={`${LBL} mb-2.5`}>{econ.stancePrompt}</p>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {econ.stanceBands.map((v) => (
              <button key={v} type="button" onClick={() => onInput({ stance: v })} className={`px-5 py-2.5 rounded-xl border text-[14px] font-semibold transition-colors ${stance === v ? "bg-[#EA2C00] border-[#EA2C00] text-white" : "border-[#E0D9CE] text-[#1A1A1A] hover:bg-[#F2EDE5]"}`}>{v}%</button>
            ))}
            <button type="button" onClick={() => onInput({ stance: -1 })} className={`px-5 py-2.5 rounded-xl border text-[14px] font-semibold transition-colors ${stance === -1 ? "bg-[#EA2C00] border-[#EA2C00] text-white" : "border-[#E0D9CE] text-[#1A1A1A] hover:bg-[#F2EDE5]"}`}>Custom</button>
            {stance === -1 && (
              <span className="flex items-baseline gap-1.5 ml-1">
                <AttainNumberInput value={inputs.custom} onChange={(raw) => { if (raw === "") { onInput({ custom: "" }); return; } onInput({ custom: String(Math.min(econ.stanceCap, num(raw))) }); }} placeholder={`up to ${econ.stanceCap}`} className="w-24 bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-0.5 font-abridge text-xl text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:font-sans placeholder:text-[13px] placeholder:text-[#C4BCB0]" />
                <span className="text-[14px] text-[#8C8C8C]">%</span>
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#8C8C8C] mb-5">{econ.capNote}</p>
          </>)}

          {/* Assumptions — seeded conservatively, shown, and editable. Nothing hidden.
              Lever models show their assumptions inline under each lever above, so this
              collapsible panel is only for single-lever categories. */}
          {!activeLevers && econ.assumptions && econ.assumptions.length > 0 && (
            <div className="mb-12">
              <button type="button" onClick={() => setShowAssumptions((s) => !s)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors">
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAssumptions ? "rotate-90" : ""}`} />
                Assumptions{showAssumptions ? "" : ` · ${econ.assumptions.length}`}
              </button>
              {showAssumptions && (
                <div className="mt-3 rounded-xl border border-[#E8E2DA] bg-[#FAF7F2] p-5">
                  <p className="text-[12px] text-[#8C8C8C] mb-4 max-w-[520px]">Seeded conservatively so you are not starting from blank. Every one is editable and nothing is hidden. Change any that do not match your reality.</p>
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                    {econ.assumptions.map(renderAssumptionInput)}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* framing choices now render above: frame-stage before outcomes, the rest before the economics */}

      {/* Q — the play (dynamic to the chosen outcomes), in the page's editorial row style */}
      {c.outcomes.some((o) => picked.has(o.id) && o.plays) && (
        <>
          <SectionHead n={++qn} kicker="The play" title="How will you actually do it?" />
          <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6 max-w-[600px]">For each outcome you picked, choose the moves that turn the freed time into the result. Add your own if we're missing one.</p>
          <div className="space-y-9 mb-14">
            {c.outcomes.filter((o) => picked.has(o.id) && o.plays).map((o) => {
              const sel = plays[o.id] ?? new Set<string>();
              const extras = Array.from(sel).filter((x) => !o.plays!.includes(x));
              const rows = [...o.plays!, ...extras];
              return (
                <div key={o.id}>
                  <p className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#8C8C8C] mb-1.5">{o.title}</p>
                  <div className="border-t border-[#E8E2DA]">
                    {rows.map((pl) => (
                      <button key={pl} type="button" onClick={() => togglePlay(o.id, pl)} className="group relative w-full text-left flex items-center gap-3.5 pl-4 pr-3 py-3.5 border-b border-[#E8E2DA] hover:bg-[#F2EDE5] transition-colors">
                        {sel.has(pl) && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" />}
                        <Box on={sel.has(pl)} />
                        <p className={`text-[15px] leading-snug ${sel.has(pl) ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>{pl}</p>
                      </button>
                    ))}
                  </div>
                  <input
                    value={playDraft[o.id] ?? ""}
                    onChange={(e) => setPlayDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter" && (playDraft[o.id] ?? "").trim()) { addPlay(o.id, (playDraft[o.id] ?? "").trim()); setPlayDraft((d) => ({ ...d, [o.id]: "" })); } }}
                    placeholder="Add your own play, then press Enter"
                    className="mt-3 ml-4 w-full max-w-[420px] bg-transparent border-0 border-b border-[#E7E0D6] rounded-none px-0 pb-1.5 text-[14px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:text-[#C4BCB0]"
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Q — proof */}
      <SectionHead n={++qn} kicker="The proof" title={c.proof.prompt} />
      <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-4 max-w-[600px]">{c.proof.helper}</p>
      <div className="border-t border-[#E8E2DA] mb-14">
        {c.proof.signals.map((s) => <OptionRow key={s.id} on={proof.has(s.id)} onToggle={() => toggleProof(s.id)} title={s.label} desc={s.desc} tag={suggested.has(s.id) ? "Matches your outcome" : undefined} />)}
      </div>

      {/* Q — unlock */}
      <SectionHead n={++qn} kicker="What it unlocks" title={c.unlock.prompt} />
      <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-4 max-w-[600px]">{c.unlock.helper}</p>
      <div className="border-t border-[#E8E2DA] mb-14">
        {c.unlock.options.map((u) => <OptionRow key={u.id} on={unlock.has(u.id)} onToggle={() => toggleUnlock(u.id)} title={u.title} desc={u.desc} />)}
      </div>

      {/* Live value — sits at the end of the content, not floating over it */}
      <div>
        <div className="rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A] p-6 md:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-2">{c.panelKicker}</p>
          {showValue > 0 ? (
            <>
              <p className="font-abridge text-4xl md:text-5xl text-[#EA2C00] leading-none">{fmt$(showValue)}<span className="text-base font-normal text-white/50"> / yr</span></p>
              <p className="text-[13px] text-white/70 mt-3 leading-relaxed">{showMath}</p>
            </>
          ) : (
            <p className="text-[14px] text-white/55 leading-relaxed">{econ ? "Set the scope, the economics, and a stance above. The number assembles here from your own inputs." : "This category's economics are coming next; the number will assemble here from your inputs."}</p>
          )}
        </div>
      </div>
      <div className="h-16" />
    </div>
  );
}
