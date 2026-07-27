import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { arrToSet, recArrToSet, setToArr, recSetToArr, type AttainSnapshot } from "../attainStorage";
import { ChevronLeft, Check, ArrowRight } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { ATTAIN_MATRIX } from "./attainCells";
import { engineValueInPlay } from "./attainEngineAdapter";
import { econModel, assumptionDefaults } from "./attainEconomics";
import { AttainNumberInput } from "./AttainNumberInput";
import type { AttainCell } from "./attainContent";
import type { AttainBaseline } from "@/lib/attain/attainLevers";
import AlignView, { emptyAlignAnswers, type AlignAnswers } from "./AlignView";
import PlanView from "./PlanView";

/**
 * THROWAWAY mock (?multipreview=1). Shows how the four chapters hold MULTIPLE
 * value categories for one care setting (Outpatient: Access + Retention + Revenue).
 *
 * Nav model: the app's standard header on top (mocked here), then the four chapter
 * tabs. Inside Align + Plan, a category sub-nav (you work one category at a time).
 * Strategy + Progress roll all the chosen categories into one combined view.
 */

const fmt$ = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);
const LBL = "text-[10px] font-bold uppercase tracking-[2px] text-[#8C8C8C]";

// The mock defaults to Outpatient; ?setting=ED / ?setting=Inpatient / ?setting=Nursing
// let us exercise the same experience for another setting's cell set during review.
const mockSetting = () => {
  if (typeof window === "undefined") return "Outpatient";
  const s = new URLSearchParams(window.location.search).get("setting");
  return s && ATTAIN_MATRIX.some((c) => c.setting === s) ? s : "Outpatient";
};
const CURFIELD = "w-16 bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-0.5 text-center font-abridge text-[16px] outline-none transition-colors focus:border-[#EA2C00] placeholder:font-sans placeholder:text-[14px] placeholder:text-[#C4BCB0]";
const pnum = (s: string) => { const n = parseFloat((s || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : NaN; };
const pavg = (arr: (number | null)[]) => { const v = arr.filter((x): x is number => x !== null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

/** The reusable editorial Attain experience: four chapters, multi-category, for one
 * setting. The app's real header wraps this; here it renders its own chapter nav. */
export type ExperienceSlice = Pick<AttainSnapshot, "pickedByCat" | "playsByCat" | "answersByCat" | "inputsByCat" | "metricsByCat" | "readingsByCat" | "peopleByCat" | "customsByCat" | "cadenceByCat" | "alignDone" | "planDone" | "chapter" | "catIdx" | "reviewLog">;

export function AttainExperience({ setting, cells, baseline, initial, onPersist }: { setting: string; cells: AttainCell[]; baseline?: AttainBaseline; initial?: AttainSnapshot | null; onPersist?: (slice: ExperienceSlice) => void }) {
  const SETTING = setting;
  const CELLS = cells;
  const snap = initial ?? undefined; // hydrate per-category state from a saved plan when present
  // the partner's real Starting Point count for the category being aligned (blank if they didn't enter one)
  const scopeCountFor = (c: AttainCell): number | undefined => {
    if (SETTING === "Nursing") return c.category === "Quality & Safety" ? baseline?.staffedBeds : baseline?.nursingFtes;
    return baseline?.providers;
  };
  const [chapter, setChapter] = useState<"align" | "plan" | "strategy" | "progress">(() => (snap?.chapter as "align" | "plan" | "strategy" | "progress") ?? "align");
  const [catIdx, setCatIdx] = useState(() => (typeof snap?.catIdx === "number" && snap.catIdx < CELLS.length ? snap.catIdx : 0));
  const [alignDone, setAlignDone] = useState<Set<string>>(() => arrToSet(snap?.alignDone));
  const [planDone, setPlanDone] = useState<Set<string>>(() => arrToSet(snap?.planDone));
  const cell = CELLS[catIdx];
  // display heading (nurses aren't "providers"); the stable `category` stays the lookup/storage key
  const catLabel = (c: AttainCell) => c.categoryLabel ?? c.category;

  // Jump to the top whenever the view changes (locking a category in, switching category, or
  // changing chapter). Without this the next view opened wherever the last one was scrolled —
  // usually the bottom, right where the lock-in button sits. The app shell scrolls in a div,
  // not the window, so reset both the window and any scrollable ancestor.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    let p: HTMLElement | null = rootRef.current?.parentElement ?? null;
    while (p) {
      const oy = getComputedStyle(p).overflowY;
      if (oy === "auto" || oy === "scroll") p.scrollTop = 0;
      p = p.parentElement;
    }
  }, [chapter, catIdx]);

  // the lock-in state for whichever chapter you're in (Align vs Plan each track their own)
  const doneSet = chapter === "plan" ? planDone : alignDone;
  const setDoneSet = chapter === "plan" ? setPlanDone : setAlignDone;
  const allDone = CELLS.every((c) => doneSet.has(c.category));

  const lockIn = (cat: string) => {
    const next = new Set(doneSet); next.add(cat); setDoneSet(next);
    const remaining = CELLS.findIndex((c) => !next.has(c.category));
    if (remaining >= 0) setCatIdx(remaining);
  };
  const goChapter = (ch: typeof chapter) => { setChapter(ch); setCatIdx(0); };

  // per-category Align state so switching category sub-tabs keeps answers
  const [pickedByCat, setPickedByCat] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(CELLS.map((c) => [c.category, arrToSet(snap?.pickedByCat?.[c.category])])));
  const [playsByCat, setPlaysByCat] = useState<Record<string, Record<string, Set<string>>>>(() =>
    Object.fromEntries(CELLS.map((c) => [c.category, recArrToSet(snap?.playsByCat?.[c.category])])));
  const setPickedFor = (cat: string) => (upd: React.SetStateAction<Set<string>>) =>
    setPickedByCat((m) => ({ ...m, [cat]: typeof upd === "function" ? (upd as (p: Set<string>) => Set<string>)(m[cat]) : upd }));
  const setPlaysFor = (cat: string) => (upd: React.SetStateAction<Record<string, Set<string>>>) =>
    setPlaysByCat((m) => ({ ...m, [cat]: typeof upd === "function" ? (upd as (p: Record<string, Set<string>>) => Record<string, Set<string>>)(m[cat]) : upd }));

  // Align answers (digs/segments/choices/proof/unlock) lifted per category so jumping chapters keeps them
  const [alignAnswersByCat, setAlignAnswersByCat] = useState<Record<string, AlignAnswers>>(() =>
    Object.fromEntries(CELLS.map((c) => {
      const s = snap?.answersByCat?.[c.category];
      return [c.category, s ? { segs: arrToSet(s.segs), choices: recArrToSet(s.choices), proof: arrToSet(s.proof), unlock: arrToSet(s.unlock) } : emptyAlignAnswers(c.align)];
    })));
  const setAnswersFor = (cat: string) => (upd: React.SetStateAction<AlignAnswers>) =>
    setAlignAnswersByCat((m) => ({ ...m, [cat]: typeof upd === "function" ? (upd as (p: AlignAnswers) => AlignAnswers)(m[cat]) : upd }));

  // Plan: today/target/source per metric, per category — the SINGLE source of truth Progress reads.
  // today/target start blank (partner sets them on Plan); source carries the content default.
  type MState = { today: string; target: string; source: string };
  const [metricsByCat, setMetricsByCat] = useState<Record<string, Record<string, MState>>>(() =>
    Object.fromEntries(CELLS.map((c) => {
      const ms = [...c.plan.abridgeSignals, ...c.plan.outcomeGroups.flatMap((g) => g.metrics)];
      const s = snap?.metricsByCat?.[c.category];
      return [c.category, Object.fromEntries(ms.map((m) => [m.id, s?.[m.id] ?? { today: "", target: "", source: m.source }]))];
    })));
  const patchMetric = (cat: string) => (id: string, k: keyof MState, v: string) =>
    setMetricsByCat((m) => {
      const cur = m[cat]?.[id] ?? { today: "", target: "", source: "" };
      const next: MState = { ...cur, [k]: v };
      // Time in note is the proof of the minutes-saved assumption. When they enter Today and Target
      // is still blank, suggest Today − (minutes saved) so the metric we track equals the assumption
      // the dollar is built on. Only fires where a minSaved assumption exists (outpatient access);
      // it is a suggestion — they can overwrite it, and we never touch a target they already set.
      if (id === "tin" && k === "today" && !cur.target) {
        const minSaved = pnum(alignInputsByCat[cat]?.econ?.minSaved ?? "");
        const today = pnum(v);
        if (Number.isFinite(minSaved) && minSaved > 0 && Number.isFinite(today) && today > minSaved) {
          next.target = String(Math.round((today - minSaved) * 10) / 10);
        }
      }
      return { ...m, [cat]: { ...m[cat], [id]: next } };
    });

  // Progress: this review's readings per category, and the combined review log
  const [readingsByCat, setReadingsByCat] = useState<Record<string, Record<string, string>>>(() => Object.fromEntries(CELLS.map((c) => [c.category, snap?.readingsByCat?.[c.category] ?? {}])));
  const setReading = (cat: string, id: string, v: string) => setReadingsByCat((m) => ({ ...m, [cat]: { ...m[cat], [id]: v } }));
  const [reviewLog, setReviewLog] = useState<{ label: string; attain: number }[]>(() => snap?.reviewLog ?? []);

  // owners per category (lifted out of PlanView so they persist and reach the PDF)
  const [peopleByCat, setPeopleByCat] = useState<Record<string, { name: string; role: string }[]>>(() =>
    Object.fromEntries(CELLS.map((c) => [c.category, snap?.peopleByCat?.[c.category] ?? [{ name: "", role: "" }]])));
  const setPeopleFor = (cat: string) => (people: { name: string; role: string }[]) =>
    setPeopleByCat((m) => ({ ...m, [cat]: people }));

  // custom metrics + review cadence per category (lifted out of PlanView so they persist + reach the PDF)
  type Custom = { id: string; name: string; measure: string; unit: string; today: string; target: string; source: string };
  const [customsByCat, setCustomsByCat] = useState<Record<string, Custom[]>>(() =>
    Object.fromEntries(CELLS.map((c) => [c.category, snap?.customsByCat?.[c.category] ?? []])));
  const setCustomsFor = (cat: string) => (customs: Custom[]) => setCustomsByCat((m) => ({ ...m, [cat]: customs }));
  const [cadenceByCat, setCadenceByCat] = useState<Record<string, string>>(() =>
    Object.fromEntries(CELLS.map((c) => [c.category, snap?.cadenceByCat?.[c.category] ?? "quarterly"])));
  const setCadenceFor = (cat: string) => (cadence: string) => setCadenceByCat((m) => ({ ...m, [cat]: cadence }));

  // Align value-inputs, LIFTED per category so they persist across category switches and feed
  // the ONE engine-computed number that shows in Align, the stepper, Strategy, and Progress.
  type AInputs = { scope: string; econ: Record<string, string>; stance: number | null; custom: string };
  const [alignInputsByCat, setAlignInputsByCat] = useState<Record<string, AInputs>>(() =>
    // scope starts BLANK (no pre-populated number); the "of X / Use all X" reference beside the
    // field reads the live Starting Point count, so they enter a slice or click to use all of it.
    Object.fromEntries(CELLS.map((c) => [c.category, snap?.inputsByCat?.[c.category] ?? { scope: "", econ: assumptionDefaults(SETTING, c.category), stance: null, custom: "" }])));
  const setAlignInput = (cat: string) => (patch: Partial<AInputs>) =>
    setAlignInputsByCat((m) => ({ ...m, [cat]: { ...m[cat], ...patch } }));

  // autosave the experience state so the plan survives refresh + accumulates across reviews
  useEffect(() => {
    onPersist?.({
      pickedByCat: Object.fromEntries(Object.entries(pickedByCat).map(([k, v]) => [k, setToArr(v)])),
      playsByCat: Object.fromEntries(Object.entries(playsByCat).map(([k, v]) => [k, recSetToArr(v)])),
      answersByCat: Object.fromEntries(Object.entries(alignAnswersByCat).map(([k, a]) => [k, { segs: setToArr(a.segs), choices: recSetToArr(a.choices), proof: setToArr(a.proof), unlock: setToArr(a.unlock) }])),
      inputsByCat: alignInputsByCat,
      metricsByCat, readingsByCat, peopleByCat, customsByCat, cadenceByCat, reviewLog,
      alignDone: setToArr(alignDone), planDone: setToArr(planDone), chapter, catIdx,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedByCat, playsByCat, alignAnswersByCat, alignInputsByCat, metricsByCat, readingsByCat, peopleByCat, customsByCat, cadenceByCat, alignDone, planDone, chapter, catIdx, reviewLog]);
  // Which levers are live for a multi-lever category. A lever turns on when its payerOptionIds
  // intersect the cell's FRAME answer (the stage:"frame" choice — payer mix for Outpatient, a
  // mechanism picker for ED / Inpatient) OR its outcomeIds intersect the picked goals. Reading the
  // frame by stage rather than the hardcoded "book" generalizes activation while keeping Outpatient
  // identical (its frame id is still "book"). Null when the category has no levers.
  const activeLeversFor = (c: (typeof CELLS)[number]) => {
    const model = econModel(SETTING, c.category);
    if (!model?.levers) return null;
    const frameId = c.align.choices?.find((q) => q.stage === "frame")?.id;
    const frame = (frameId ? alignAnswersByCat[c.category]?.choices?.[frameId] : undefined) ?? new Set<string>();
    const pickedOutcomes = pickedByCat[c.category] ?? new Set<string>();
    return model.levers.filter((l) => (l.payerOptionIds?.some((id) => frame.has(id)) ?? false) || (l.outcomeIds?.some((id) => pickedOutcomes.has(id)) ?? false));
  };
  const cellInputs = (c: (typeof CELLS)[number]) => {
    const a = alignInputsByCat[c.category];
    const cap = econModel(SETTING, c.category)?.stanceCap ?? 75;
    const stancePct = a.stance === -1 ? Math.min(cap, pnum(a.custom) || 0) : (a.stance ?? 0);
    const econ: Record<string, number> = {};
    for (const [k, v] of Object.entries(a.econ)) { const n = pnum(v); if (Number.isFinite(n)) econ[k] = n; }
    const scope = pnum(a.scope) || 0;
    // real Starting Point volume so the SIZE of the number is theirs, not a per-head constant.
    // Nursing Quality scopes by beds, so its staffed-beds IS the scope; the rest use the baseline.
    const isNursingQuality = SETTING === "Nursing" && c.category === "Quality & Safety";
    // multi-lever categories: the driver keys the live levers sum, from the payer answer
    const active = activeLeversFor(c);
    const activeDriverKeys = active ? Array.from(new Set(active.flatMap((l) => l.driverKeys))) : undefined;
    return {
      scope, stancePct, econ, activeDriverKeys,
      totalProviders: baseline?.providers,
      annualEncounters: baseline?.annualEncounters,
      util: baseline?.utilizationPct,
      adoption: baseline?.adoptionPct,
      staffedBeds: isNursingQuality ? scope : baseline?.staffedBeds,
    };
  };
  // the engine number per category, computed once per input change (valueByCat is read many times a render)
  const valueMap = useMemo(
    () => new Map(CELLS.map((c) => [c.category, engineValueInPlay(SETTING, c.category, cellInputs(c))])),
    // pickedByCat is a dep because goal-driven levers (ED / Inpatient) activate off the picked goals
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alignInputsByCat, alignAnswersByCat, pickedByCat, baseline, SETTING],
  );
  const valueByCat = (c: (typeof CELLS)[number]) => valueMap.get(c.category) ?? 0;
  // one number's build line, straight from that category's economics model (blank until it's real).
  // Multi-lever categories pass their live lever ids so the through-line names only the payers in play.
  const mathFor = (c: (typeof CELLS)[number]) => {
    if (valueByCat(c) <= 0) return "";
    const model = econModel(SETTING, c.category);
    if (!model) return "";
    const active = activeLeversFor(c);
    return active ? model.math(cellInputs(c), active.map((l) => l.id)) : model.math(cellInputs(c));
  };
  const totalValue = CELLS.reduce((s, c) => s + valueByCat(c), 0);
  // the specialties they actually picked in Align, for the Plan header (no hardcoded remnant)
  const segSummaryFor = (c: (typeof CELLS)[number]) => {
    const seg = c.align.segments;
    const chosen = seg ? Array.from(alignAnswersByCat[c.category]?.segs ?? []) : [];
    if (!seg || !chosen.length) return "";
    // when every line is picked, collapse to a clean phrase instead of enumerating each specialty
    if (chosen.length === seg.options.length) return seg.allSummary ?? "all lines";
    return chosen.map((id) => seg.nameMap[id] ?? id).join(" + ");
  };
  const committedFor = (c: (typeof CELLS)[number]) =>
    c.align.outcomes.filter((o) => pickedByCat[c.category].has(o.id) && o.plays).map((o) => ({ title: o.title, chosen: Array.from(playsByCat[c.category][o.id] ?? []) }));

  const chapterTab = (ch: typeof chapter) =>
    `text-[13px] rounded-[9px] px-4 py-1.5 capitalize transition-colors ${chapter === ch ? "bg-white shadow-sm font-semibold text-[#1A1A1A]" : "text-[#8C8C8C]"}`;

  // guard: never white-screen if the setting's goals ever outrun the cell matrix
  if (!CELLS.length || !cell) {
    return <div className="max-w-[760px] mx-auto px-8 py-20 text-center text-[15px] text-[#8C8C8C]">No categories selected for this setting yet.</div>;
  }

  return (
    <div ref={rootRef}>
      {/* chapter nav — FIXED just below the app header so it never scrolls away (sticky
          fights an overflow:auto ancestor in the app shell; fixed is immune to that) */}
      <div className="fixed top-14 sm:top-16 left-0 right-0 z-30 bg-[#FDFCFA]/95 backdrop-blur border-b border-[#E8E2DA] px-8 py-3">
        <div className="max-w-[820px] mx-auto flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#8C8C8C]">Attain · {SETTING}</span>
          <div className="flex items-center gap-1 bg-[#F2EDE5] rounded-[12px] p-1">
            {(["align", "plan", "strategy", "progress"] as const).map((ch) => (
              <button key={ch} onClick={() => setChapter(ch)} className={chapterTab(ch)}>{ch}</button>
            ))}
          </div>
        </div>
      </div>
      {/* clears the fixed chapter nav above */}
      <div className="h-[52px]" />

      <AnimatePresence mode="wait">
      <motion.div key={chapter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="px-8 py-10">
        {/* Align / Plan: editorial category stepper, work one at a time */}
        {(chapter === "align" || chapter === "plan") && <CategoryStepper />}

        {chapter === "align" && (
          <>
            <AlignView key={cell.category} c={cell.align} settingLabel={SETTING} categoryLabel={catLabel(cell)} categoryKey={cell.category}
              picked={pickedByCat[cell.category]} setPicked={setPickedFor(cell.category)}
              plays={playsByCat[cell.category]} setPlays={setPlaysFor(cell.category)}
              scopeCount={scopeCountFor(cell)}
              inputs={alignInputsByCat[cell.category]} onInput={setAlignInput(cell.category)}
              liveValue={valueByCat(cell)} liveMath={mathFor(cell)}
              answers={alignAnswersByCat[cell.category]} setAnswers={setAnswersFor(cell.category)} />
            <Completion />
          </>
        )}
        {chapter === "plan" && (
          <>
            <PlanView key={cell.category} c={cell.plan} settingLabel={SETTING} categoryLabel={catLabel(cell)} committed={committedFor(cell)} activeLevers={activeLeversFor(cell)?.map((l) => l.id)}
              metrics={metricsByCat[cell.category]} onPatchMetric={patchMetric(cell.category)}
              people={peopleByCat[cell.category]} onPeople={setPeopleFor(cell.category)}
              customs={customsByCat[cell.category]} onCustoms={setCustomsFor(cell.category)}
              cadence={cadenceByCat[cell.category]} onCadence={setCadenceFor(cell.category)}
              liveValue={valueByCat(cell)} segmentsSummary={segSummaryFor(cell)} />
            <Completion />
          </>
        )}

        {chapter === "strategy" && <StrategyRollup />}
        {chapter === "progress" && <ProgressRollup />}
      </motion.div>
      </AnimatePresence>
    </div>
  );

  // ---- editorial category stepper (replaces pills), chapter-aware ----
  function CategoryStepper() {
    const verb = chapter === "plan" ? "Planned" : "Aligned";
    return (
      <div className="max-w-[760px] mx-auto mb-10">
        <p className={`${LBL} mb-3`}>Your categories · work through each</p>
        <div className="grid border-t border-b border-[#E8E2DA] divide-x divide-[#E8E2DA]" style={{ gridTemplateColumns: `repeat(${CELLS.length}, minmax(0,1fr))` }}>
          {CELLS.map((c, i) => {
            const done = doneSet.has(c.category);
            const active = catIdx === i;
            return (
              <button key={c.category} onClick={() => setCatIdx(i)} className="relative text-left px-4 py-3.5 hover:bg-[#F2EDE5] transition-colors">
                {active && <span className="absolute left-0 right-0 top-0 h-[3px] bg-[#EA2C00]" />}
                <span className={`grid place-items-center w-6 h-6 rounded-full mb-2 text-[12px] font-abridge ${done ? "bg-[#EA2C00] text-white" : active ? "border-2 border-[#EA2C00] text-[#EA2C00]" : "border border-[#D8CFC0] text-[#8C8C8C]"}`}>
                  {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                </span>
                <p className={`text-[14px] font-semibold leading-snug ${active ? "text-[#EA2C00]" : done ? "text-[#1A1A1A]" : "text-[#8C8C8C]"}`}>{catLabel(c)}</p>
                <p className="text-[12px] text-[#8C8C8C] mt-0.5">{done ? (chapter === "plan" || valueByCat(c) <= 0 ? verb : `${verb} · ${fmt$(valueByCat(c))}`) : active ? "In progress" : "Not started"}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- the feedback loop: lock a category in, advance, then on to the next chapter ----
  function Completion() {
    const isPlan = chapter === "plan";
    const done = doneSet.has(cell.category);
    const nextChapter = isPlan ? "strategy" : "plan";
    const lockLabel = isPlan || valueByCat(cell) <= 0 ? `Lock in ${catLabel(cell)}${isPlan ? "'s plan" : ""}` : `Lock in ${catLabel(cell)} · ${fmt$(valueByCat(cell))}`;
    const doneLabel = isPlan ? "planned" : "aligned";
    return (
      <div className="max-w-[760px] mx-auto -mt-12 mb-16">
        {allDone ? (
          <div className="rounded-2xl border border-[#E8E2DA] bg-[#FAF7F2] p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-semibold text-[#1A1A1A]">All {CELLS.length} categories {doneLabel}.</p>
              <p className="text-[13px] text-[#8C8C8C] mt-1">{isPlan ? "Each has an owner and its metrics set." : `${fmt$(totalValue)}/yr in play across the set.`}</p>
            </div>
            <button onClick={() => goChapter(nextChapter)} className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] text-white text-[14px] font-semibold px-5 py-2.5 hover:bg-black transition-colors">Continue to {isPlan ? "Strategy" : "Plan"} <ArrowRight className="w-4 h-4" /></button>
          </div>
        ) : done ? (
          <p className="text-[13px] text-[#8C8C8C]"><span className="text-[#EA2C00] font-semibold">{catLabel(cell)} is {doneLabel}.</span> Pick the next category above to keep going.</p>
        ) : (
          <button onClick={() => lockIn(cell.category)} className="inline-flex items-center gap-2 rounded-xl bg-[#EA2C00] text-white text-[14px] font-semibold px-5 py-2.5 hover:bg-[#d12800] transition-colors">{lockLabel} <ArrowRight className="w-4 h-4" /></button>
        )}
      </div>
    );
  }

  // ---- Strategy: one combined case across all chosen categories ----
  function StrategyRollup() {
    return (
      <div className="max-w-[760px] mx-auto">
        <p className={`${LBL} mb-2`}>Strategy · {SETTING} · {CELLS.length} categories</p>
        <h2 className="font-abridge text-[30px] md:text-4xl text-[#1A1A1A] leading-tight mb-3">The whole picture, on one page</h2>
        <p className="text-[15px] text-[#3A3A3A] leading-relaxed max-w-[640px] mb-10">Everything you set across {CELLS.map((c) => catLabel(c).toLowerCase()).join(", ")}, rolled into one case and one scoreboard.</p>

        <div className="rounded-2xl border border-[#E8E2DA] p-6 mb-12">
          <p className={`${LBL} mb-1`}>The value in play, all categories</p>
          <p className="font-abridge text-5xl text-[#EA2C00] leading-none mb-5"><AnimatedNumber value={totalValue} format={fmt$} /><span className="text-lg text-[#8C8C8C]"> / yr</span></p>
          <div className="space-y-3">
            {CELLS.map((c) => {
              const v = valueByCat(c);
              return (
                <div key={c.category}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[14px] text-[#1A1A1A]">{catLabel(c)}</span>
                    {v > 0
                      ? <span className="font-abridge text-[16px] text-[#1A1A1A]">{fmt$(v)}<span className="text-[12px] text-[#8C8C8C]">/yr</span></span>
                      : <span className="text-[12px] text-[#B4A896] italic">not entered yet</span>}
                  </div>
                  <div className="h-2 rounded-full bg-[#E8E2DA] overflow-hidden"><div className="h-full bg-[#EA2C00]" style={{ width: `${totalValue > 0 ? Math.round((v / totalValue) * 100) : 0}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <p className={`${LBL} mb-1`}>How it all happens</p>
        <h3 className="font-abridge text-[22px] text-[#1A1A1A] mb-4">{CELLS.length > 1 ? "One chain, feeding every category" : "The chain behind the number"}</h3>
        <div className="rounded-2xl border border-[#E8E2DA] p-5 mb-12">
          <p className="text-[14px] text-[#3A3A3A] leading-relaxed">A lighter documentation load is the shared lever. Each category runs its own chain from the Epic signals we pull to the outcome it opens{CELLS.length > 1 ? <>: <span className="font-medium">{CELLS.map((c) => catLabel(c).toLowerCase()).join(", ")}</span>.</> : <> for <span className="font-medium">{CELLS[0] ? catLabel(CELLS[0]).toLowerCase() : ""}</span>.</>}</p>
        </div>

        <div className="rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A] p-6 md:p-7 mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-3">The scoreboard</p>
          <p className="text-[15px] text-white/90 leading-relaxed">From here we track attainment across all {CELLS.length} categories: the share of {fmt$(totalValue)} you realize. Each category has its own line on the Progress page, and they roll up to one number.</p>
        </div>
      </div>
    );
  }

  // ---- Progress: combined roll-up + per-category reading entry ----
  function ProgressRollup() {
    const tgt = (cat: string, id: string) => metricsByCat[cat]?.[id] ?? { today: "", target: "", source: "" };
    const progOf = (cat: string, m: { id: string }) => {
      const t = tgt(cat, m.id);
      const c = pnum(readingsByCat[cat]?.[m.id] ?? ""), a = pnum(t.today), b = pnum(t.target);
      if (!Number.isFinite(c) || !Number.isFinite(a) || !Number.isFinite(b) || a === b) return null;
      return (c - a) / (b - a);
    };
    const statsFor = (cell: (typeof CELLS)[number]) => {
      const sig = cell.plan.abridgeSignals;
      const out = cell.plan.outcomeGroups.flatMap((g) => g.metrics).filter((m) => { const t = tgt(cell.category, m.id); return Number.isFinite(pnum(t.today)) && Number.isFinite(pnum(t.target)); });
      const sigAvg = pavg(sig.map((m) => progOf(cell.category, m)));
      const outAvg = pavg(out.map((m) => progOf(cell.category, m)));
      const attain = outAvg !== null ? Math.max(0, Math.min(1, outAvg)) : 0;
      const leak = sigAvg !== null && outAvg !== null && sigAvg - outAvg > 0.12;
      const entered = sigAvg !== null || outAvg !== null;
      return { sig, out, sigAvg, outAvg, attain, leak, entered };
    };
    const realizedByCat = (cell: (typeof CELLS)[number]) => valueByCat(cell) * statsFor(cell).attain;
    const totalRealized = Math.round(CELLS.reduce((s, c) => s + realizedByCat(c), 0));
    const overall = totalValue > 0 ? Math.round((totalRealized / totalValue) * 100) : 0;
    const anyEntered = CELLS.some((c) => statsFor(c).entered);
    const active = statsFor(cell);
    const laggard = [...CELLS].filter((c) => statsFor(c).entered).sort((a, z) => statsFor(a).attain - statsFor(z).attain)[0];

    // climb from combined log (+ preview of current)
    const pts = reviewLog.length ? [0, ...reviewLog.map((r) => r.attain)] : [0, overall];
    const labels = reviewLog.length ? ["Kickoff", ...reviewLog.map((r) => r.label)] : ["Kickoff", "This review"];
    const W = 640, H = 150, padX = 44, top = 20, bottom = 124;
    const xAt = (i: number) => padX + (i * (W - padX - 24)) / (pts.length - 1);
    const yAt = (v: number) => bottom - (v / 100) * (bottom - top);

    const entryRow = (m: { id: string; name: string; unit: string }, accent: string) => {
      const pr = progOf(cell.category, m);
      const t = tgt(cell.category, m.id);
      return (
        <div key={m.id}>
          <div className="flex items-baseline gap-3 mb-1.5">
            <span className="text-[13px] text-[#3A3A3A] flex-1 min-w-0 truncate">{m.name}</span>
            {/* fixed column grid so today / now / target / unit align down every row */}
            <span className="grid items-baseline gap-x-2 text-[12px] text-[#8C8C8C] shrink-0" style={{ gridTemplateColumns: "2.5rem 0.75rem 4rem 0.75rem 2.5rem 3.5rem" }}>
              <span className="text-right tabular-nums">{t.today || "—"}</span>
              <span className="text-center text-[#C4BCB0]">&rarr;</span>
              <AttainNumberInput value={readingsByCat[cell.category]?.[m.id] ?? ""} onChange={(raw) => setReading(cell.category, m.id, raw)} placeholder="now" className={CURFIELD} style={{ color: accent }} />
              <span className="text-center text-[#C4BCB0]">&rarr;</span>
              <span className="text-right tabular-nums">{t.target || "—"}</span>
              <span className="text-left whitespace-nowrap">{m.unit}</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[#E8E2DA] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pr === null ? 0 : Math.max(0, Math.min(1, pr)) * 100}%`, backgroundColor: accent }} /></div>
        </div>
      );
    };

    return (
      <div className="max-w-[760px] mx-auto">
        <p className={`${LBL} mb-2`}>Progress · {SETTING} · {CELLS.length} categories</p>
        <h2 className="font-abridge text-[30px] md:text-4xl text-[#1A1A1A] leading-tight mb-3">The promise, measured</h2>
        <p className="text-[15px] text-[#3A3A3A] leading-relaxed max-w-[640px] mb-10">Walk each category and drop in this review's readings. One combined number up top, the per-category lines below, and the gap shown on purpose.</p>

        {/* combined headline */}
        <div className="rounded-2xl border border-[#E8E2DA] p-6 md:p-7 mb-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <p className={`${LBL} mb-2`}>Attainment, all categories</p>
              <p className="font-abridge text-6xl text-[#EA2C00] leading-none"><AnimatedNumber value={overall} format={(n) => `${Math.round(n)}`} /><span className="text-3xl">%</span></p>
              <p className="text-[13px] text-[#8C8C8C] mt-2">of the {fmt$(totalValue)}/yr promise</p>
            </div>
            <div className="text-right">
              <p className="text-[14px] text-[#1A1A1A]"><span className="font-abridge text-[22px]">{fmt$(totalRealized)}</span> realized</p>
              <p className="text-[14px] text-[#8C8C8C] mt-1"><span className="font-abridge text-[22px] text-[#1A1A1A]">{fmt$(totalValue - totalRealized)}</span> still on the table</p>
            </div>
          </div>
          <div className="h-3 rounded-full bg-[#E8E2DA] overflow-hidden"><div className="h-full bg-[#EA2C00] transition-all" style={{ width: `${overall}%` }} /></div>
          {/* the climb only charts once there's real history to plot — a single flat line reads as broken */}
          {reviewLog.length > 0 && (
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-5">
              <line x1={padX} y1={top} x2={W - 24} y2={top} stroke="#E0D9CE" strokeWidth="1" strokeDasharray="2 3" />
              <text x={W - 24} y={top - 5} textAnchor="end" fontSize="9" fill="#B4A896" className="uppercase tracking-widest">full promise</text>
              <polyline points={pts.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ")} fill="none" stroke="#EA2C00" strokeWidth="2.5" />
              {pts.map((v, i) => (<g key={i}><circle cx={xAt(i)} cy={yAt(v)} r="4" fill="#EA2C00" /><text x={xAt(i)} y={bottom + 16} textAnchor="middle" fontSize="10" fill="#8C8C8C">{labels[i]}</text></g>))}
            </svg>
          )}
        </div>

        {/* per-category entry via the stepper */}
        <p className={`${LBL} mb-3`}>Enter this review, category by category</p>
        <div className="grid border-t border-b border-[#E8E2DA] divide-x divide-[#E8E2DA] mb-8" style={{ gridTemplateColumns: `repeat(${CELLS.length}, minmax(0,1fr))` }}>
          {CELLS.map((c, i) => {
            const st = statsFor(c); const activeI = catIdx === i;
            return (
              <button key={c.category} onClick={() => setCatIdx(i)} className="relative text-left px-4 py-3 hover:bg-[#F2EDE5] transition-colors">
                {activeI && <span className="absolute left-0 right-0 top-0 h-[3px] bg-[#EA2C00]" />}
                <p className={`text-[14px] font-semibold leading-snug ${activeI ? "text-[#EA2C00]" : "text-[#1A1A1A]"}`}>{catLabel(c)}</p>
                <p className="text-[12px] mt-0.5" style={{ color: st.leak ? "#EA2C00" : "#8C8C8C" }}>{st.leak ? "Behind the signals" : st.entered ? `${Math.round(st.attain * 100)}% so far` : "Enter readings"}</p>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-[#E8E2DA] p-5 mb-4">
          <p className="text-[13px] font-semibold text-[#1A1A1A] mb-4">{catLabel(cell)} · this review's readings</p>
          <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#8C8C8C] mb-3">What Abridge can enable</p>
          <div className="space-y-3.5 mb-6">{active.sig.map((m) => entryRow(m, "#8C8C8C"))}</div>
          <p className="text-[11px] font-bold uppercase tracking-[1.5px] mb-3" style={{ color: active.leak ? "#EA2C00" : "#1A1A1A" }}>The outcomes {active.leak ? "· behind the signals" : ""}</p>
          <div className="space-y-3.5">{active.out.map((m) => entryRow(m, active.leak ? "#EA2C00" : "#1A1A1A"))}</div>
        </div>

        {/* per-category roll-up lines */}
        <p className={`${LBL} mb-3 mt-10`}>Where every category stands</p>
        <div className="space-y-3 mb-8">
          {CELLS.map((c) => {
            const st = statsFor(c); const a = Math.round(st.attain * 100);
            return (
              <div key={c.category} className={`rounded-xl border p-4 ${st.leak ? "border-[#F0C4B8] bg-[#FDF6F3]" : "border-[#E8E2DA]"}`}>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <p className="text-[14px] font-semibold text-[#1A1A1A]">{catLabel(c)}</p>
                  <span className="text-[11px] font-bold uppercase tracking-[1.5px] rounded-full px-2.5 py-0.5" style={{ color: st.leak ? "#EA2C00" : "#6B6B6B", backgroundColor: st.leak ? "#FBE7E1" : "#F2EDE5" }}>{st.leak ? "Behind" : st.entered ? `${a}% attained` : "Not entered"}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#E8E2DA] overflow-hidden"><div className="h-full" style={{ width: `${a}%`, backgroundColor: st.leak ? "#EA2C00" : "#1A1A1A" }} /></div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-12">
          <button type="button" onClick={() => setReviewLog((l) => [...l, { label: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), attain: overall }])} disabled={!anyEntered} className="rounded-xl bg-[#EA2C00] text-white text-[14px] font-semibold px-5 py-2.5 hover:bg-[#d12800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Log this review</button>
          <span className="text-[13px] text-[#8C8C8C]">{reviewLog.length ? `${reviewLog.length} logged. Snapshots all ${CELLS.length} categories as one point.` : "Snapshots all categories at once and drops a point on the climb."}</span>
        </div>

        <div className="rounded-2xl border-2 border-[#1A1A1A] bg-[#1A1A1A] p-6 md:p-7 mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/50 mb-3">The read</p>
          {anyEntered ? (
            <p className="text-[15px] text-white/90 leading-relaxed">You're at {overall}% across the set. {laggard ? <>The category to push on is <span className="text-[#EA2C00] font-semibold">{catLabel(laggard)}</span>{statsFor(laggard).leak ? ": the signals are moving but the outcome hasn't followed yet." : ", furthest from its target."}</> : ""}</p>
          ) : (
            <p className="text-[15px] text-white/70 leading-relaxed">Enter this review's readings above and the combined score, the per-category lines, and the read all fill in from your real numbers.</p>
          )}
        </div>
      </div>
    );
  }
}

/** THROWAWAY mock wrapper (?multipreview=1): fakes the app header, then renders the
 * reusable AttainExperience for the outpatient sample set. */
export default function MultiCategoryPreview() {
  const setting = mockSetting();
  const cells = ATTAIN_MATRIX.filter((c) => c.setting === setting);
  return (
    <div className="min-h-screen bg-[#FDFCFA]">
      <div className="sticky top-0 z-30 h-14 bg-white border-b border-[#E8E2DA] flex items-center px-6">
        <button className="flex items-center gap-1 text-[13px] text-[#6B6B6B]"><ChevronLeft className="w-4 h-4" /> Back</button>
        <span className="mx-auto font-abridge text-[15px] tracking-wide text-[#1A1A1A]">ROI Calculator · Attain</span>
        <span className="font-abridge text-[15px] font-semibold text-[#EA2C00]">abridge</span>
      </div>
      <AttainExperience setting={setting} cells={cells} />
    </div>
  );
}
