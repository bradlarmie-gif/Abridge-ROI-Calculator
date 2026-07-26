import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";

/**
 * THROWAWAY prototype (?planpreview=1). NOT wired to the engine.
 *
 * The PLAN chapter, reframed as a pseudo project-plan told like a value
 * architect: (1) who's on it, (2) restate the outcomes from Align, (3) the
 * metrics we measure -- starting with the documentation signals Abridge can move,
 * measured directly from Epic (time in note, work outside of work, same-day note
 * closure), then the outcome metrics those open up.
 *
 * Causal, defensible: signals are measured directly from Epic; the outcomes are
 * worked toward. No claim Abridge "causes" the outcome. No calendar-date promises.
 */

const fmt$ = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);
const LBL = "text-[10px] font-bold uppercase tracking-[2px] text-[#8C8C8C]";
const NUMFIELD =
  "w-24 bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-1 font-abridge text-xl text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:font-sans placeholder:text-[15px] placeholder:text-[#C4BCB0]";
const TEXTFIELD =
  "bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-1 text-[15px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:text-[#C4BCB0]";

// carried in from Align
const CARRIED = {
  valueInPlay: 667_000,
  specialties: ["primary care", "cardiology"],
  outcomes: ["Work down the referral backlog", "Shorten the wait for a new appointment"],
};

type MetricDef = { id: string; name: string; measure: string; source: string; unit: string; today: string; target: string; dir: string };

// the documentation signals ambient scribing moves, measured directly from Epic
const ABRIDGE_SIGNALS: MetricDef[] = [
  { id: "tin", name: "Time in note", measure: "Minutes spent documenting per encounter.", source: "Epic Signal", unit: "min", today: "9.5", target: "5.5", dir: "down" },
  { id: "wow", name: "Work outside of work", measure: "After-hours time in the EHR per day, the \"pajama time\" providers feel.", source: "Epic Signal", unit: "min/day", today: "48", target: "25", dir: "down" },
  { id: "sdc", name: "Same-day note closure", measure: "Share of visits with the note closed the same day, not carried home.", source: "Epic Signal", unit: "%", today: "62", target: "88", dir: "up" },
];

// the outcome metrics those signals open up, grouped under the Align outcome they ladder to
const OUTCOME_GROUPS: { outcome: string; metrics: MetricDef[] }[] = [
  {
    outcome: "Work down the referral backlog",
    metrics: [
      { id: "backlog", name: "Referral backlog", measure: "Referred patients still waiting to be scheduled.", source: "Reporting Workbench", unit: "patients", today: "1,900", target: "600", dir: "down" },
    ],
  },
  {
    outcome: "Shorten the wait for a new appointment",
    metrics: [
      { id: "tna", name: "Third-next-available", measure: "Days to the third open new-patient slot, the standard access measure.", source: "Epic Cadence", unit: "days", today: "14", target: "7", dir: "down" },
      { id: "wait", name: "New-patient wait", measure: "Average days from referral to first appointment.", source: "Epic Cadence", unit: "days", today: "31", target: "18", dir: "down" },
    ],
  },
];

const ALL_METRICS = [...ABRIDGE_SIGNALS, ...OUTCOME_GROUPS.flatMap((g) => g.metrics)];

// where a metric's number is pulled from (defines the query our data team writes).
// named the way an Epic shop names these; complete across capacity/wellness/revenue.
const SOURCES = ["Epic Signal", "Epic Cadence", "Reporting Workbench", "Billing / claims", "Provider survey", "Data warehouse (SQL)", "Abridge platform"];

function SectionHead({ n, kicker, title }: { n: number; kicker: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#EA2C00] mb-1.5">Step {n} · {kicker}</p>
      <h2 className="font-abridge text-[26px] md:text-[30px] text-[#1A1A1A] leading-tight">{title}</h2>
    </div>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span className={`mt-0.5 flex-shrink-0 grid place-items-center w-[18px] h-[18px] rounded-full border-[1.5px] ${on ? "border-[#EA2C00]" : "border-[#CFC6B8] bg-white group-hover:border-[#B4A896]"}`}>
      {on && <span className="w-[9px] h-[9px] rounded-full bg-[#EA2C00]" />}
    </span>
  );
}

type MState = { today: string; target: string; source: string };

function MetricCard({ m, st, onPatch }: { m: MetricDef; st: MState; onPatch: (k: keyof MState, v: string) => void }) {
  return (
    <div className="rounded-2xl border border-[#E8E2DA] p-5">
      <h3 className="font-abridge text-[19px] text-[#1A1A1A] mb-1">{m.name}</h3>
      <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-4 max-w-[560px]"><span className="font-medium text-[#3A3A3A]">We measure:</span> {m.measure}</p>
      <div className="grid grid-cols-[160px_20px_160px_minmax(0,1fr)] items-end gap-x-4 gap-y-4">
        <div>
          <p className={`${LBL} mb-1.5`}>Today</p>
          <div className="flex items-baseline gap-1.5">
            <input value={st.today} onChange={(e) => onPatch("today", e.target.value)} placeholder="—" className={NUMFIELD} />
            <span className="text-[13px] text-[#8C8C8C] whitespace-nowrap">{m.unit}</span>
          </div>
        </div>
        <span className="pb-2 text-[#C4BCB0] text-lg">&rarr;</span>
        <div>
          <p className={`${LBL} mb-1.5`}>Target</p>
          <div className="flex items-baseline gap-1.5">
            <input value={st.target} onChange={(e) => onPatch("target", e.target.value)} placeholder="—" className={NUMFIELD} />
            <span className="text-[13px] text-[#8C8C8C] whitespace-nowrap">{m.unit}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className={`${LBL} mb-1.5`}>Measured from</p>
          <div className="relative">
            <select value={st.source} onChange={(e) => onPatch("source", e.target.value)} className={`${TEXTFIELD} w-full appearance-none pr-6 cursor-pointer`}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              {!SOURCES.includes(st.source) && <option value={st.source}>{st.source}</option>}
            </select>
            <ChevronDown className="w-4 h-4 text-[#B4A896] absolute right-0 bottom-1.5 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

type Person = { name: string; role: string };
const CADENCES = [
  ["monthly", "Monthly", "Tighter loop while the signals first move."],
  ["quarterly", "Quarterly", "The standard business-review rhythm."],
] as const;

export default function AttainPlanPreview() {
  const [metrics, setMetrics] = useState<Record<string, MState>>(
    Object.fromEntries(ALL_METRICS.map((m) => [m.id, { today: m.today, target: m.target, source: m.source }]))
  );
  const patch = (id: string, k: keyof MState, v: string) => setMetrics((s) => ({ ...s, [id]: { ...s[id], [k]: v } }));

  const [people, setPeople] = useState<Person[]>([{ name: "", role: "" }]);
  const setPerson = (i: number, k: keyof Person, v: string) => setPeople((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const addPerson = () => setPeople((p) => (p.length < 3 ? [...p, { name: "", role: "" }] : p));
  const removePerson = (i: number) => setPeople((p) => p.filter((_, j) => j !== i));

  type Custom = { id: string; name: string; measure: string; unit: string; today: string; target: string; source: string };
  const [customs, setCustoms] = useState<Custom[]>([]);
  const addCustom = () => setCustoms((c) => [...c, { id: `c${Date.now()}`, name: "", measure: "", unit: "", today: "", target: "", source: "Epic Signal" }]);
  const patchCustom = (id: string, k: keyof Custom, v: string) => setCustoms((c) => c.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  const removeCustom = (id: string) => setCustoms((c) => c.filter((x) => x.id !== id));

  const [cadence, setCadence] = useState<"monthly" | "quarterly">("quarterly");
  const cadenceWord = cadence === "monthly" ? "monthly" : "quarterly";
  const named = people.filter((p) => p.name.trim()).map((p) => p.name.trim() + (p.role.trim() ? ` (${p.role.trim()})` : ""));

  return (
    <div className="min-h-screen bg-[#FDFCFA] px-8 py-12">
      <div className="max-w-[760px] mx-auto">
        <p className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest mb-1">Prototype · the Plan chapter</p>
        <h1 className="font-abridge text-3xl text-[#1A1A1A] mb-3">Who's on it, the outcomes, and how we measure them</h1>
        <p className="text-[14px] text-[#6B6B6B] mb-2 max-w-[640px] leading-relaxed">
          Align set what's worth working toward. Here's how it comes together: start with who's involved, confirm the
          outcomes from Align, then set the signals we'll measure. We begin with the documentation signals Abridge can move
          in Epic, since those are measured directly, then the outcomes they help open up.
        </p>
        <div className="h-px bg-[#E7E0D6] my-10" />

        {/* Step 1 — who's on it (locked first) */}
        <SectionHead n={1} kicker="Who's on it" title="The people on it" />
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-5 max-w-[600px]">Before the numbers, name who'll own them with you and join each review. Up to three.</p>
        <div className="space-y-4 mb-4">
          {people.map((p, i) => (
            <div key={i} className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <div className="flex-1 min-w-[200px]">
                <p className={`${LBL} mb-1.5`}>Name</p>
                <input value={p.name} onChange={(e) => setPerson(i, "name", e.target.value)} placeholder="e.g., Dana Ruiz" className={`${TEXTFIELD} w-full font-abridge text-lg`} />
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className={`${LBL} mb-1.5`}>Role</p>
                <input value={p.role} onChange={(e) => setPerson(i, "role", e.target.value)} placeholder="e.g., Ambulatory Access Director" className={`${TEXTFIELD} w-full`} />
              </div>
              {people.length > 1 && (
                <button type="button" onClick={() => removePerson(i)} className="pb-1 text-[#B4A896] hover:text-[#EA2C00] transition-colors" aria-label="Remove">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {people.length < 3 ? (
          <button type="button" onClick={addPerson} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#EA2C00] hover:underline mb-14">
            <Plus className="w-4 h-4" /> Add someone
          </button>
        ) : <div className="mb-14" />}

        {/* Step 2 — the outcomes we're chasing (from Align) */}
        <SectionHead n={2} kicker="The outcomes" title="The outcomes from Align" />
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-5 max-w-[600px]">The value in play and the outcomes you named. Everything we measure below connects back to these.</p>
        <div className="rounded-2xl border border-[#E8E2DA] p-5 mb-14">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5 mb-4 pb-4 border-b border-[#E8E2DA]">
            <span className="text-[13px] text-[#3A3A3A]">Value in play <span className="font-abridge text-[20px] text-[#EA2C00]">{fmt$(CARRIED.valueInPlay)}/yr</span></span>
            <span className="text-[13px] text-[#8C8C8C]">across {CARRIED.specialties.join(" + ")}</span>
          </div>
          <div className="space-y-2.5">
            {CARRIED.outcomes.map((o) => (
              <div key={o} className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA2C00] flex-shrink-0" />
                <span className="text-[15px] text-[#1A1A1A]">{o}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3 — the metrics: what Abridge moves, then the outcomes it opens up */}
        <SectionHead n={3} kicker="The metrics" title="What we measure, and where it comes from" />
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6 max-w-[600px]">Two layers. First the documentation signals we pull from Epic, measured directly. Then the outcome metrics they open up. The definition and source are what our team would query; today and the target are yours to confirm.</p>

        <div className="flex items-center gap-3 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00]">What Abridge can enable</p>
          <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#8C8C8C] border border-[#E0D9CE] rounded-full px-2 py-0.5">measured directly from Epic Signal</span>
        </div>
        <div className="space-y-5 mb-10">
          {ABRIDGE_SIGNALS.map((m) => (
            <MetricCard key={m.id} m={m} st={metrics[m.id]} onPatch={(k, v) => patch(m.id, k, v)} />
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-[#C4BCB0]">&darr;</span>
          <p className="text-[13px] text-[#6B6B6B] italic">When those move, the freed capacity is what makes these outcomes reachable.</p>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#1A1A1A] mb-4">The outcomes they open up</p>
        <div className="space-y-8 mb-14">
          {OUTCOME_GROUPS.map((g) => (
            <div key={g.outcome}>
              <p className="text-[14px] font-semibold text-[#1A1A1A] mb-3">{g.outcome}</p>
              <div className="space-y-5">
                {g.metrics.map((m) => (
                  <MetricCard key={m.id} m={m} st={metrics[m.id]} onPatch={(k, v) => patch(m.id, k, v)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Anything else they want to track (custom metrics) */}
        <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#1A1A1A] mb-1">Anything else you want to track</p>
        <p className="text-[13px] text-[#8C8C8C] leading-relaxed mb-4 max-w-[560px]">Add your own metric if there's something specific your team watches. We'll track it alongside the rest.</p>
        <div className="space-y-5 mb-4">
          {customs.map((c) => (
            <div key={c.id} className="rounded-2xl border border-dashed border-[#D8CFC0] p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <input value={c.name} onChange={(e) => patchCustom(c.id, "name", e.target.value)} placeholder="Metric name, e.g., No-show rate" className={`${TEXTFIELD} flex-1 font-abridge text-[19px]`} />
                <button type="button" onClick={() => removeCustom(c.id)} className="mt-1 text-[#B4A896] hover:text-[#EA2C00] transition-colors" aria-label="Remove"><X className="w-4 h-4" /></button>
              </div>
              <input value={c.measure} onChange={(e) => patchCustom(c.id, "measure", e.target.value)} placeholder="What we measure, in a line" className={`${TEXTFIELD} w-full text-[13px] mb-4`} />
              <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
                <div>
                  <p className={`${LBL} mb-1.5`}>Today</p>
                  <input value={c.today} onChange={(e) => patchCustom(c.id, "today", e.target.value)} placeholder="—" className={NUMFIELD} />
                </div>
                <span className="pb-2 text-[#C4BCB0] text-lg">&rarr;</span>
                <div>
                  <p className={`${LBL} mb-1.5`}>Target</p>
                  <input value={c.target} onChange={(e) => patchCustom(c.id, "target", e.target.value)} placeholder="—" className={NUMFIELD} />
                </div>
                <div className="w-24">
                  <p className={`${LBL} mb-1.5`}>Unit</p>
                  <input value={c.unit} onChange={(e) => patchCustom(c.id, "unit", e.target.value)} placeholder="e.g., %" className={`${TEXTFIELD} w-full`} />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className={`${LBL} mb-1.5`}>Measured from</p>
                  <div className="relative">
                    <select value={c.source} onChange={(e) => patchCustom(c.id, "source", e.target.value)} className={`${TEXTFIELD} w-full appearance-none pr-6 cursor-pointer`}>
                      {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#B4A896] absolute right-0 bottom-1.5 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addCustom} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#EA2C00] hover:underline mb-14">
          <Plus className="w-4 h-4" /> Add a metric
        </button>

        {/* Cadence */}
        <p className={`${LBL} mb-3`}>How often we review</p>
        <div className="grid sm:grid-cols-2 gap-3 mb-14">
          {CADENCES.map(([id, t, d]) => (
            <button key={id} type="button" onClick={() => setCadence(id)} className={`group text-left flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors ${cadence === id ? "border-[#EA2C00] bg-[#FAF7F2]" : "border-[#E0D9CE] hover:border-[#B4A896]"}`}>
              <Radio on={cadence === id} />
              <div>
                <p className={`text-[15px] leading-snug ${cadence === id ? "font-semibold text-[#EA2C00]" : "font-medium text-[#1A1A1A]"}`}>{t}</p>
                <p className="text-[12px] text-[#8C8C8C] leading-snug mt-1">{d}</p>
              </div>
            </button>
          ))}
        </div>

        {/* The plan, assembled in plain English */}
        <div className="sticky bottom-6">
          <div className="rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A] p-6 md:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-3">The plan</p>
            <p className="text-[15px] text-white/90 leading-relaxed">
              {named.length ? <><span className="text-[#EA2C00] font-semibold">{named.join(", ")}</span> own these numbers with us. </> : <>Your named owners own these numbers with us. </>}
              We pull <span className="text-white font-semibold">time in note, work outside of work, and same-day note closure</span> from Epic to show the documentation load coming down, then watch your <span className="text-white font-semibold">backlog and wait</span> follow, reviewed <span className="text-white font-semibold">{cadenceWord}</span> against the baselines you set.
            </p>
            <p className="text-[12px] text-white/45 mt-3 leading-relaxed">Measured directly: the signals. Worked toward together: the outcomes.</p>
          </div>
        </div>
        <div className="h-24" />
      </div>
    </div>
  );
}
