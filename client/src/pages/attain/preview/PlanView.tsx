import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import { SOURCES, type PlanContent, type MetricDef } from "./attainContent";
import { AttainNumberInput } from "./AttainNumberInput";

/** THROWAWAY. The Plan chapter, rendered from PlanContent (setting x category). */

const fmt$ = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);
const LBL = "text-[10px] font-bold uppercase tracking-[2px] text-[#8C8C8C]";
const NUMFIELD =
  "w-24 bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-1 font-abridge text-xl text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:font-sans placeholder:text-[15px] placeholder:text-[#C4BCB0]";
const TEXTFIELD =
  "bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-1 text-[15px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00] placeholder:text-[#C4BCB0]";

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

function SourceSelect({ value, onChange, sources }: { value: string; onChange: (v: string) => void; sources: readonly string[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${TEXTFIELD} w-full appearance-none pr-6 cursor-pointer`}>
        {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        {!sources.includes(value) && <option value={value}>{value}</option>}
      </select>
      <ChevronDown className="w-4 h-4 text-[#B4A896] absolute right-0 bottom-1.5 pointer-events-none" />
    </div>
  );
}

function MetricCard({ m, st, onPatch, sources }: { m: MetricDef; st: MState; onPatch: (k: keyof MState, v: string) => void; sources: readonly string[] }) {
  return (
    <div className="rounded-2xl border border-[#E8E2DA] p-5">
      <h3 className="font-abridge text-[19px] text-[#1A1A1A] mb-1">{m.name}</h3>
      <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-4 max-w-[560px]"><span className="font-medium text-[#3A3A3A]">We measure:</span> {m.measure}</p>
      <div className="grid grid-cols-[176px_20px_176px_minmax(0,1fr)] items-end gap-x-4 gap-y-4">
        <div>
          <p className={`${LBL} mb-1.5`}>Today</p>
          <div className="flex items-baseline gap-1.5">
            <AttainNumberInput value={st.today} onChange={(raw) => onPatch("today", raw)} placeholder="—" className={NUMFIELD} />
            <span className="text-[13px] text-[#8C8C8C] whitespace-nowrap">{m.unit}</span>
          </div>
        </div>
        <span className="pb-2 text-[#C4BCB0] text-lg">&rarr;</span>
        <div>
          <p className={`${LBL} mb-1.5`}>Target</p>
          <div className="flex items-baseline gap-1.5">
            <AttainNumberInput value={st.target} onChange={(raw) => onPatch("target", raw)} placeholder="—" className={NUMFIELD} />
            <span className="text-[13px] text-[#8C8C8C] whitespace-nowrap">{m.unit}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className={`${LBL} mb-1.5`}>Measured from</p>
          <SourceSelect value={st.source} onChange={(v) => onPatch("source", v)} sources={sources} />
        </div>
      </div>
    </div>
  );
}

type Person = { name: string; role: string };
type Custom = { id: string; name: string; measure: string; unit: string; today: string; target: string; source: string };
const CADENCES = [
  ["monthly", "Monthly", "Tighter loop while the signals first move."],
  ["quarterly", "Quarterly", "The standard business-review rhythm."],
] as const;

export default function PlanView({ c, settingLabel, categoryLabel, committed = [], metrics: metricsProp, onPatchMetric, liveValue, segmentsSummary, people: peopleProp, onPeople, customs: customsProp, onCustoms, cadence: cadenceProp, onCadence }: { c: PlanContent; settingLabel: string; categoryLabel: string; committed?: { title: string; chosen: string[] }[]; metrics?: Record<string, MState>; onPatchMetric?: (id: string, k: keyof MState, v: string) => void; liveValue?: number; segmentsSummary?: string; people?: Person[]; onPeople?: (p: Person[]) => void; customs?: Custom[]; onCustoms?: (c: Custom[]) => void; cadence?: string; onCadence?: (c: string) => void }) {
  // setting-appropriate source options: don't offer "Provider survey" on nursing, or "Nurse survey" elsewhere
  const sourceOptions = SOURCES.filter((s) => (settingLabel === "Nursing" ? s !== "Provider survey" : s !== "Nurse survey"));
  const valueInPlay = liveValue ?? c.valueInPlay; // the LIVE engine number (falls back to static only for throwaway previews)
  const segSummary = segmentsSummary ?? c.segmentsSummary; // the specialties they actually picked
  const allMetrics = [...c.abridgeSignals, ...c.outcomeGroups.flatMap((g) => g.metrics)];
  // today/target start BLANK (the partner sets them here — no fake pre-fills); source is the measurement definition, kept.
  const blank = () => Object.fromEntries(allMetrics.map((m) => [m.id, { today: "", target: "", source: m.source }]));
  const [localMetrics, setLocalMetrics] = useState<Record<string, MState>>(blank);
  const metrics = metricsProp ?? localMetrics;
  const patch = (id: string, k: keyof MState, v: string) =>
    onPatchMetric ? onPatchMetric(id, k, v) : setLocalMetrics((s) => ({ ...s, [id]: { ...(s[id] ?? { today: "", target: "", source: "" }), [k]: v } }));
  const mState = (id: string): MState => metrics[id] ?? { today: "", target: "", source: "" };

  const [localPeople, setLocalPeople] = useState<Person[]>([{ name: "", role: "" }]);
  const people = peopleProp ?? localPeople;
  const setPeople = (upd: Person[] | ((p: Person[]) => Person[])) => {
    const next = typeof upd === "function" ? (upd as (p: Person[]) => Person[])(people) : upd;
    onPeople ? onPeople(next) : setLocalPeople(next);
  };
  const setPerson = (i: number, k: keyof Person, v: string) => setPeople((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const addPerson = () => setPeople((p) => (p.length < 3 ? [...p, { name: "", role: "" }] : p));
  const removePerson = (i: number) => setPeople((p) => p.filter((_, j) => j !== i));

  const [localCustoms, setLocalCustoms] = useState<Custom[]>([]);
  const customs = customsProp ?? localCustoms;
  const setCustoms = (upd: Custom[] | ((x: Custom[]) => Custom[])) => {
    const next = typeof upd === "function" ? (upd as (x: Custom[]) => Custom[])(customs) : upd;
    onCustoms ? onCustoms(next) : setLocalCustoms(next);
  };
  // unique id even if two are added in the same millisecond (persisted, so collisions would clobber)
  const newCustomId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const addCustom = () => setCustoms((x) => [...x, { id: newCustomId(), name: "", measure: "", unit: "", today: "", target: "", source: "Epic Signal" }]);
  const patchCustom = (id: string, k: keyof Custom, v: string) => setCustoms((x) => x.map((c) => (c.id === id ? { ...c, [k]: v } : c)));
  const removeCustom = (id: string) => setCustoms((x) => x.filter((c) => c.id !== id));

  const [localCadence, setLocalCadence] = useState<string>("quarterly");
  const cadence = cadenceProp ?? localCadence;
  const setCadence = (v: string) => (onCadence ? onCadence(v) : setLocalCadence(v));
  const cadenceWord = cadence === "monthly" ? "monthly" : "quarterly";
  const named = people.filter((p) => p.name.trim()).map((p) => p.name.trim() + (p.role.trim() ? ` (${p.role.trim()})` : ""));

  return (
    <div className="max-w-[760px] mx-auto">
      {/* Step 1 — who's on it (scoped to this category) */}
      <SectionHead n={1} kicker="Who's on it" title={`Who owns ${categoryLabel}?`} />
      <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-5 max-w-[600px]">The person who owns these numbers with you and joins the reviews for {categoryLabel.toLowerCase()}. Up to three.</p>
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
              <button type="button" onClick={() => removePerson(i)} className="pb-1 text-[#B4A896] hover:text-[#EA2C00] transition-colors" aria-label="Remove"><X className="w-4 h-4" /></button>
            )}
          </div>
        ))}
      </div>
      {people.length < 3 ? (
        <button type="button" onClick={addPerson} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#EA2C00] hover:underline mb-14"><Plus className="w-4 h-4" /> Add someone</button>
      ) : <div className="mb-14" />}

      {/* Step 2 — outcomes from Align */}
      <SectionHead n={2} kicker="The outcomes" title="The outcomes from Align" />
      <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-5 max-w-[600px]">The value in play and the outcomes you named. Everything we measure below connects back to these.</p>
      <div className="rounded-2xl border border-[#E8E2DA] p-5 mb-14">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 mb-4 pb-4 border-b border-[#E8E2DA]">
          <span className="text-[13px] text-[#8C8C8C]">Value in play</span>
          <span className="font-abridge text-[22px] text-[#EA2C00] leading-none">{fmt$(valueInPlay)}<span className="text-[13px] text-[#8C8C8C]">/yr</span></span>
          {segSummary && <span className="text-[13px] text-[#8C8C8C] ml-1">across {segSummary}</span>}
        </div>
        <div className="space-y-2.5">
          {c.outcomes.map((o) => (
            <div key={o} className="flex items-center gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA2C00] flex-shrink-0" />
              <span className="text-[15px] text-[#1A1A1A]">{o}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The plays carried from Align — what the owners actually run */}
      {committed.length > 0 && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#1A1A1A] mb-1">The plays you're running</p>
          <p className="text-[13px] text-[#8C8C8C] leading-relaxed mb-4 max-w-[560px]">Carried from Align. These are what your named owners put into motion; the metrics below tell you if they're working.</p>
          <div className="space-y-4 mb-14">
            {committed.map((cm) => (
              <div key={cm.title}>
                <p className="text-[14px] font-semibold text-[#1A1A1A] mb-2">{cm.title}</p>
                {cm.chosen.length ? (
                  <div className="flex flex-wrap gap-2">
                    {cm.chosen.map((pl) => (
                      <span key={pl} className="text-[12.5px] rounded-full px-3 py-1.5 border border-[#F0C4B8] bg-[#FBE7E1] text-[#EA2C00] font-medium">{pl}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-[#B4A896] italic">No play picked yet. Choose one back in Align.</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Step 3 — the metrics */}
      <SectionHead n={3} kicker="The metrics" title="What we measure, and where it comes from" />
      <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6 max-w-[600px]">It comes in two parts. First, the documentation signals we pull straight from Epic. Then the outcomes they open up. The definition and source are what our team would pull; today and the target are yours to confirm.</p>

      <div className="flex items-center gap-3 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#EA2C00]">{c.signalsGroupLabel}</p>
        <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#8C8C8C] border border-[#E0D9CE] rounded-full px-2 py-0.5">{c.signalsTag}</span>
      </div>
      <div className="space-y-5 mb-10">
        {c.abridgeSignals.map((m) => (
          <MetricCard key={m.id} m={m} st={mState(m.id)} onPatch={(k, v) => patch(m.id, k, v)} sources={sourceOptions} />
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-[#C4BCB0]">&darr;</span>
        <p className="text-[13px] text-[#6B6B6B] italic">{c.connector}</p>
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#1A1A1A] mb-4">The outcomes they open up</p>
      <div className="space-y-8 mb-14">
        {c.outcomeGroups.map((g) => (
          <div key={g.outcome}>
            <p className="text-[14px] font-semibold text-[#1A1A1A] mb-3">{g.outcome}</p>
            <div className="space-y-5">
              {g.metrics.map((m) => <MetricCard key={m.id} m={m} st={mState(m.id)} onPatch={(k, v) => patch(m.id, k, v)} sources={sourceOptions} />)}
            </div>
          </div>
        ))}
      </div>

      {/* custom metrics */}
      <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#1A1A1A] mb-1">Anything else you want to track</p>
      <p className="text-[13px] text-[#8C8C8C] leading-relaxed mb-4 max-w-[560px]">Add your own metric if there's something specific your team watches. We'll track it alongside the rest.</p>
      <div className="space-y-5 mb-4">
        {customs.map((c2) => (
          <div key={c2.id} className="rounded-2xl border border-dashed border-[#D8CFC0] p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <input value={c2.name} onChange={(e) => patchCustom(c2.id, "name", e.target.value)} placeholder="Metric name, e.g., No-show rate" className={`${TEXTFIELD} flex-1 font-abridge text-[19px]`} />
              <button type="button" onClick={() => removeCustom(c2.id)} className="mt-1 text-[#B4A896] hover:text-[#EA2C00] transition-colors" aria-label="Remove"><X className="w-4 h-4" /></button>
            </div>
            <input value={c2.measure} onChange={(e) => patchCustom(c2.id, "measure", e.target.value)} placeholder="What we measure, in a line" className={`${TEXTFIELD} w-full text-[13px] mb-4`} />
            <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
              <div><p className={`${LBL} mb-1.5`}>Today</p><AttainNumberInput value={c2.today} onChange={(raw) => patchCustom(c2.id, "today", raw)} placeholder="—" className={NUMFIELD} /></div>
              <span className="pb-2 text-[#C4BCB0] text-lg">&rarr;</span>
              <div><p className={`${LBL} mb-1.5`}>Target</p><AttainNumberInput value={c2.target} onChange={(raw) => patchCustom(c2.id, "target", raw)} placeholder="—" className={NUMFIELD} /></div>
              <div className="w-24"><p className={`${LBL} mb-1.5`}>Unit</p><input value={c2.unit} onChange={(e) => patchCustom(c2.id, "unit", e.target.value)} placeholder="e.g., %" className={`${TEXTFIELD} w-full`} /></div>
              <div className="flex-1 min-w-[180px]"><p className={`${LBL} mb-1.5`}>Measured from</p><SourceSelect value={c2.source} onChange={(v) => patchCustom(c2.id, "source", v)} sources={sourceOptions} /></div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addCustom} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#EA2C00] hover:underline mb-14"><Plus className="w-4 h-4" /> Add a metric</button>

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

      {/* The plan — static at the end of the content (never floats over the form) */}
      <div>
        <div className="rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A] p-6 md:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-3">The plan</p>
          <p className="text-[15px] text-white/90 leading-relaxed">
            {named.length ? <><span className="text-[#EA2C00] font-semibold">{named.join(", ")}</span> own these numbers with us. </> : <>Your named owners own these numbers with us. </>}
            We pull <span className="text-white font-semibold">{c.signalsShortList}</span> from Epic to show the documentation load coming down, then watch your <span className="text-white font-semibold">{c.outcomesShortList}</span> follow, reviewed <span className="text-white font-semibold">{cadenceWord}</span> against the baselines you set.
          </p>
          <p className="text-[12px] text-white/45 mt-3 leading-relaxed">Measured directly: the signals. Worked toward together: the outcomes.</p>
        </div>
      </div>
      <div className="h-16" />
    </div>
  );
}
