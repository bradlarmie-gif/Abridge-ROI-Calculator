import { useState } from "react";
import { Check } from "lucide-react";

/**
 * THROWAWAY prototype (?consultpreview=1). NOT wired to the engine.
 *
 * v4 — the ALIGN chapter only. Align is a branching, multi-select,
 * number-digging question path that feels like a live value-attainment
 * session. Pick more than one outcome and each pick opens its own short
 * drill-down that digs into a real number from the partner's own inputs; the
 * value forms live as they answer. No chain / milestone / commitment scaffolding
 * here; those live on the later pages (Plan, Strategy, Progress).
 */

const CORAL = "#EA2C00";
// Illustrative per-visit contribution margin by line (margin, not charges). A
// cardiology slot and a behavioral slot are not worth the same, so the live
// number re-weights to whichever lines they pick.
const SPEC_MARGIN: Record<string, number> = { primary: 150, cardiology: 280, ortho: 350, behavioral: 110, other: 180 };
const DEFAULT_MARGIN = 210;
import { fmt$ } from "@/lib/attain/attainFormat";
const fmtN = (n: number) => Math.round(n).toLocaleString();

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

/** An outcome option (multi-select). When chosen it grows a drill-down beneath
 * it that digs into that outcome's own number. */
function OutcomeRow({
  selected,
  onToggle,
  title,
  desc,
  children,
}: {
  selected: boolean;
  onToggle: () => void;
  title: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-[#E8E2DA]">
      <button type="button" onClick={onToggle} className="group relative w-full text-left flex items-start gap-3.5 pl-4 pr-3 py-4 hover:bg-[#F2EDE5] transition-colors">
        {selected && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" />}
        <Box on={selected} />
        <div>
          <p className={`text-[16px] leading-snug ${selected ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>{title}</p>
          <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[560px]">{desc}</p>
        </div>
      </button>
      {selected && children && (
        <div className="pl-[52px] pr-4 pb-6 pt-1">{children}</div>
      )}
    </div>
  );
}

/** A single "dig into the number" input inside a drill-down: a label, their own
 * number, and the live dollar it contributes. */
function DigInput({ label, unit, value, onChange, placeholder, contributes }: { label: string; unit: string; value: string; onChange: (v: string) => void; placeholder: string; contributes: number }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 py-3 border-t border-[#E8E2DA] first:border-t-0">
      <div>
        <p className={`${LBL} mb-1.5`}>{label}</p>
        <div className="flex items-baseline gap-1.5">
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={NUMFIELD} />
          <span className="text-[13px] text-[#8C8C8C]">{unit}</span>
        </div>
      </div>
      <p className="text-[13px] text-[#8C8C8C]">
        adds <span className="font-abridge text-[19px] text-[#EA2C00]">{contributes > 0 ? `${fmt$(contributes)} / yr` : "—"}</span>
      </p>
    </div>
  );
}

const num = (s: string) => { const n = parseFloat(s.replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; };

export default function AttainConsultPreview() {
  // an outcome and its proof signal are the same thing from opposite ends, so
  // picking an outcome carries its matching signal into the proof question
  const OUTCOME_PROOF: Record<string, string[]> = { backlog: ["backlog"], wait: ["wait", "tna"], noshow: ["visits"], grow: ["visits"] };
  const [picked, setPicked] = useState<Set<string>>(new Set(["wait"]));
  const toggle = (id: string) => {
    const adding = !picked.has(id);
    setPicked((p) => { const n = new Set(p); adding ? n.add(id) : n.delete(id); return n; });
    if (adding) setProof((pr) => { const s = new Set(pr); (OUTCOME_PROOF[id] ?? []).forEach((x) => s.add(x)); return s; });
  };
  const [backlog, setBacklog] = useState("");
  const [waitNew, setWaitNew] = useState("");
  const [noshow, setNoshow] = useState("");
  const [grow, setGrow] = useState("");
  // provider count carried in from Starting Point; that total is the ceiling
  const PROVIDER_CEILING = 60;
  const [providers, setProviders] = useState("40");
  const SPEC_IDS = ["primary", "cardiology", "ortho", "behavioral", "other"];
  const [lines, setLines] = useState<Set<string>>(new Set(["primary"]));
  const toggleLine = (id: string) => setLines((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allLines = SPEC_IDS.every((id) => lines.has(id));
  const setAllLines = () => setLines(allLines ? new Set() : new Set(SPEC_IDS));
  const [proof, setProof] = useState<Set<string>>(new Set(["wait", "tna"])); // seeded from the default "wait" outcome
  const toggleProof = (id: string) => setProof((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  // per-signal today -> target anchors (the before + goalpost that write the query)
  const [anchors, setAnchors] = useState<Record<string, { today: string; target: string }>>({});
  const setAnchor = (id: string, k: "today" | "target", v: string) =>
    setAnchors((a) => ({ ...a, [id]: { today: a[id]?.today ?? "", target: a[id]?.target ?? "", [k]: v } }));
  const [unlock, setUnlock] = useState<Set<string>>(new Set());
  const toggleUnlock = (id: string) => setUnlock((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // margin re-weighted to the lines they picked (mean of selected; default if none)
  const marginLines = Array.from(lines).filter((id) => id in SPEC_MARGIN);
  const margin = marginLines.length ? Math.round(marginLines.reduce((s, id) => s + SPEC_MARGIN[id], 0) / marginLines.length) : DEFAULT_MARGIN;
  const marginNames: Record<string, string> = { primary: "primary care", cardiology: "cardiology", ortho: "ortho", behavioral: "behavioral", other: "other" };
  const suggestedProof = new Set(Array.from(picked).flatMap((id) => OUTCOME_PROOF[id] ?? []));

  const vBacklog = picked.has("backlog") ? num(backlog) : 0;
  const vWait = picked.has("wait") ? num(waitNew) : 0;
  const vNoshow = picked.has("noshow") ? num(noshow) : 0;
  const vGrow = picked.has("grow") ? num(grow) : 0;
  const visits = vBacklog + vWait + vNoshow + vGrow;
  const dollars = visits * margin;
  const parts = [
    picked.has("backlog") && num(backlog) > 0 ? `${fmtN(num(backlog))} backlog` : null,
    picked.has("wait") && num(waitNew) > 0 ? `${fmtN(num(waitNew))} sooner` : null,
    picked.has("noshow") && num(noshow) > 0 ? `${fmtN(num(noshow))} recovered` : null,
    picked.has("grow") && num(grow) > 0 ? `${fmtN(num(grow))} new` : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#FFFFFF] px-8 py-12">
      <div className="max-w-[760px] mx-auto">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-1">Prototype · the Align chapter</p>
        <h1 className="font-abridge text-3xl text-[#1A1A1A] mb-3">A working session, not a form</h1>
        <p className="text-[14px] text-[#6B6B6B] mb-2 max-w-[640px] leading-relaxed">
          Five questions per goal, inside one care setting. Pick more than one outcome and each opens its own drill-down
          that digs a real number out of your own figures. We name the specialties (which re-weight the value), set what
          you'll watch, and name what it unlocks. The value forms live as you answer. Align only; who owns each move, the
          milestones, and the commitment live on the Plan page.
        </p>
        <div className="h-px bg-[#E7E0D6] my-10" />

        {/* Contribution margin is established upstream on Starting Point; Align receives it, the specialties only re-weight it */}
        <div className="rounded-xl border border-[#E8E2DA] bg-[#FAF7F2] px-5 py-4 mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#8C8C8C] mb-2">Per-visit contribution margin · carried in from your Starting Point</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            {Object.entries(SPEC_MARGIN).map(([id, m]) => (
              <span key={id} className="text-[13px] text-[#3A3A3A]">
                {marginNames[id]} <span className="font-abridge text-[16px] text-[#1A1A1A]">{fmt$(m)}</span>
              </span>
            ))}
          </div>
          <p className="text-[12px] text-[#8C8C8C] mt-2.5 leading-relaxed">Set before this page. The specialties you pick below only decide which of these the value is weighted to.</p>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#8C8C8C] mb-2">Align · Outpatient · Patient Access</p>
        <h2 className="font-abridge text-[30px] md:text-4xl text-[#1A1A1A] leading-tight mb-3">What are you trying to win here?</h2>
        <p className="text-[15px] text-[#3A3A3A] leading-relaxed max-w-[640px] mb-12">
          Most groups want more than one thing, and that's fine. Pick each outcome that matters. As you do, we'll dig
          into the number behind it with you, from your own figures, not a benchmark.
        </p>

        {/* Q1 — multi-select outcomes, each opening a number-digging drill-down */}
        <SectionHead n={1} kicker="The outcomes" title="Pick every outcome you're after" />
        <div className="border-t border-[#E8E2DA] mb-12">
          <OutcomeRow selected={picked.has("backlog")} onToggle={() => toggle("backlog")} title="Work down the referral backlog" desc="Patients already referred and waiting to be scheduled.">
            <DigInput label="How many are waiting right now?" unit="patients" value={backlog} onChange={setBacklog} placeholder="e.g., 1,900" contributes={vBacklog * margin} />
          </OutcomeRow>
          <OutcomeRow selected={picked.has("wait")} onToggle={() => toggle("wait")} title="Shorten the wait for a new appointment" desc="Get new patients in sooner, so the wait comes down.">
            <DigInput label="New patients a year you'd see sooner if the wait dropped" unit="visits / yr" value={waitNew} onChange={setWaitNew} placeholder="e.g., 1,200" contributes={vWait * margin} />
          </OutcomeRow>
          <OutcomeRow selected={picked.has("noshow")} onToggle={() => toggle("noshow")} title="Recover no-shows" desc="Refill slots that would otherwise go empty.">
            <DigInput label="No-shows a year you could refill from the waitlist" unit="visits / yr" value={noshow} onChange={setNoshow} placeholder="e.g., 800" contributes={vNoshow * margin} />
          </OutcomeRow>
          <OutcomeRow selected={picked.has("grow")} onToggle={() => toggle("grow")} title="Grow the panel" desc="Take on net-new patients over time.">
            <DigInput label="Net-new visits a year you're aiming to add" unit="visits / yr" value={grow} onChange={setGrow} placeholder="e.g., 2,000" contributes={vGrow * margin} />
          </OutcomeRow>
        </div>

        {/* Q2 — specialty / service line (the "where", restored) */}
        <SectionHead n={2} kicker="The specialties" title="Where is the access gap?" />
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-3 max-w-[600px]">Pick the lines this is really about. It scopes the plan and sharpens the margin per visit, since a cardiology slot and a behavioral-health slot aren't worth the same.</p>
        <div className="flex justify-end mb-1">
          <button type="button" onClick={setAllLines} className="text-[12px] font-semibold text-[#EA2C00] hover:underline">
            {allLines ? "Clear all" : "Across all lines"}
          </button>
        </div>
        <div className="border-t border-[#E8E2DA] mb-12">
          {[
            ["primary", "Primary care", "Highest volume, where the backlog and wait usually concentrate."],
            ["cardiology", "Cardiology", "Higher margin per visit; a shorter wait moves real revenue."],
            ["ortho", "Orthopedics & surgical", "Downstream procedures ride on the first visit."],
            ["behavioral", "Behavioral health", "Access is the whole battle; long waits, high no-shows."],
            ["other", "Other specialties", "We'll size it across the board and narrow later."],
          ].map(([id, t, d]) => (
            <button key={id} type="button" onClick={() => toggleLine(id)} className="group relative w-full text-left flex items-start gap-3.5 pl-4 pr-3 py-4 border-b border-[#E8E2DA] hover:bg-[#F2EDE5] transition-colors">
              {lines.has(id) && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" />}
              <Box on={lines.has(id)} />
              <div>
                <p className={`text-[16px] leading-snug ${lines.has(id) ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>{t}</p>
                <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[560px]">{d}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Q3 — scope; the Starting Point total is the ceiling, "all" fills it */}
        <SectionHead n={3} kicker="The scope" title="Across how many providers?" />
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2 mb-2">
          <input
            value={providers}
            onChange={(e) => { const v = Math.min(num(e.target.value), PROVIDER_CEILING); setProviders(e.target.value === "" ? "" : String(v)); }}
            className={NUMFIELD}
          />
          <span className="text-[14px] text-[#8C8C8C]">of {PROVIDER_CEILING} providers carried in from your Starting Point</span>
          <button type="button" onClick={() => setProviders(String(PROVIDER_CEILING))} className="text-[12px] font-semibold text-[#EA2C00] hover:underline">Use all {PROVIDER_CEILING}</button>
        </div>
        <p className="text-[12px] text-[#8C8C8C] mb-12">That total is the ceiling; scope to a slice of it or run the whole setting.</p>

        {/* Q4 — proof / signals, each anchored today -> target (this writes the query + the EBR scorecard) */}
        <SectionHead n={4} kicker="The proof" title="What would tell you it's working?" />
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-4 max-w-[600px]">Pick what you'd point to in a review, and where each sits today versus a win. That before-and-target pair is exactly what we'd measure. The first of these move before the visits do.</p>
        <div className="border-t border-[#E8E2DA] mb-14">
          {([
            ["tna", "Third-next-available falling", "The standard access measure, coming down against your baseline.", "days"],
            ["backlog", "Referral backlog shrinking", "The count of patients waiting to be scheduled going down.", "patients"],
            ["wait", "New-patient wait dropping", "Days to a first appointment trending down.", "days"],
            ["visits", "Visit volume up", "More visits actually landing on the schedule.", "visits / yr"],
            ["love", "Love Stories", "Patients and staff telling you access got better, in their words.", ""],
          ] as const).map(([id, t, d, unit]) => (
            <div key={id} className="border-b border-[#E8E2DA]">
              <button type="button" onClick={() => toggleProof(id)} className="group relative w-full text-left flex items-start gap-3.5 pl-4 pr-3 py-4 hover:bg-[#F2EDE5] transition-colors">
                {proof.has(id) && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" />}
                <Box on={proof.has(id)} />
                <div>
                  <div className="flex items-center gap-2.5">
                    <p className={`text-[16px] leading-snug ${proof.has(id) ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>{t}</p>
                    {suggestedProof.has(id) && <span className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#EA2C00] border border-[#F0C4B8] rounded-full px-2 py-0.5">Matches your outcome</span>}
                  </div>
                  <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[560px]">{d}</p>
                </div>
              </button>
              {proof.has(id) && unit && (
                <div className="pl-[52px] pr-4 pb-5 pt-1 flex flex-wrap items-end gap-x-8 gap-y-3">
                  <div>
                    <p className={`${LBL} mb-1.5`}>Today</p>
                    <div className="flex items-baseline gap-1.5">
                      <input value={anchors[id]?.today ?? ""} onChange={(e) => setAnchor(id, "today", e.target.value)} placeholder="—" className={NUMFIELD} />
                      <span className="text-[13px] text-[#8C8C8C]">{unit}</span>
                    </div>
                  </div>
                  <span className="pb-2 text-[#C4BCB0] text-lg">&rarr;</span>
                  <div>
                    <p className={`${LBL} mb-1.5`}>A win looks like</p>
                    <div className="flex items-baseline gap-1.5">
                      <input value={anchors[id]?.target ?? ""} onChange={(e) => setAnchor(id, "target", e.target.value)} placeholder="—" className={NUMFIELD} />
                      <span className="text-[13px] text-[#8C8C8C]">{unit}</span>
                    </div>
                  </div>
                </div>
              )}
              {proof.has(id) && !unit && (
                <p className="pl-[52px] pr-4 pb-5 pt-1 text-[13px] text-[#8C8C8C] max-w-[560px]">We'll collect these in your partners' own words along the way. No number to set.</p>
              )}
            </div>
          ))}
        </div>

        {/* Q5 — the strategic stake underneath the dollar (what Abridge puts its name on moving) */}
        <SectionHead n={5} kicker="What it unlocks" title="If this works, what does it let you do?" />
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-4 max-w-[600px]">The dollar is the hard part; this is the reason underneath it. Pick what hitting this actually opens up. This is what we'd stand behind alongside the number.</p>
        <div className="border-t border-[#E8E2DA] mb-14">
          {[
            ["contract", "Take on a new contract or payer", "Access headroom you can commit to in a deal you can't take today."],
            ["service", "Keep a service line whole", "Stop referrals leaking out to competitors for lack of a slot."],
            ["retain", "Hold on to the providers you have", "A lighter documentation load is a reason people stay."],
            ["site", "Open or fill a new site", "Grow into capacity instead of adding cost to create it."],
            ["standard", "Meet an access standard you're committed to", "A board or system promise on wait times you have to hit."],
          ].map(([id, t, d]) => (
            <button key={id} type="button" onClick={() => toggleUnlock(id)} className="group relative w-full text-left flex items-start gap-3.5 pl-4 pr-3 py-4 border-b border-[#E8E2DA] hover:bg-[#F2EDE5] transition-colors">
              {unlock.has(id) && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#EA2C00]" />}
              <Box on={unlock.has(id)} />
              <div>
                <p className={`text-[16px] leading-snug ${unlock.has(id) ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>{t}</p>
                <p className="text-[13px] text-[#8C8C8C] leading-snug mt-1 max-w-[560px]">{d}</p>
              </div>
            </button>
          ))}
        </div>

        {/* The live number, dug out of their own answers */}
        <div className="sticky bottom-6">
          <div className="rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A] p-6 md:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-2">The value in play, from your numbers</p>
            {visits > 0 ? (
              <>
                <p className="font-abridge text-4xl md:text-5xl text-[#EA2C00] leading-none">{fmt$(dollars)}<span className="text-base font-normal text-white/50"> / yr</span></p>
                <p className="text-[13px] text-white/70 mt-3 leading-relaxed">
                  {fmtN(visits)} visits ({parts.join(" + ")}) × {fmt$(margin)} contribution margin{marginLines.length ? `, weighted to ${marginLines.map((id) => marginNames[id]).join(" + ")}` : ""}. Counted once, valued at margin, never charges.
                </p>
                <p className="text-[12px] text-white/45 mt-2.5 leading-relaxed">This is what's on the table here. Your Plan sets how much of it is attributable and when it lands.</p>
              </>
            ) : (
              <p className="text-[14px] text-white/55 leading-relaxed">Pick your outcomes above and drop in your real counts. The number builds here as you answer.</p>
            )}
          </div>
        </div>
        <div className="h-24" />
      </div>
    </div>
  );
}
