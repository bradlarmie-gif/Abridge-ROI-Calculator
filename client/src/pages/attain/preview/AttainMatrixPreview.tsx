import { useEffect, useMemo, useState } from "react";
import { ATTAIN_MATRIX } from "./attainCells";
import type { AttainCell } from "./attainContent";
import AlignView from "./AlignView";
import PlanView from "./PlanView";
import StrategyView from "./StrategyView";
import ProgressView from "./ProgressView";

/**
 * THROWAWAY prototype (?attainpreview=1). NOT wired to the engine.
 *
 * Unified Attain preview across setting x category, four chapters. Everything is
 * scoped to a PARTNER (in the URL), so one CSM can run several partners, even in
 * two tabs at once, without the saved work colliding. Each partner+cell is its own
 * saved session (localStorage), so refresh keeps the readings and the review log.
 */

export type ReviewEntry = { label: string; attain: number };
export type SessionState = { picked: Set<string>; plays: Record<string, Set<string>>; readings: Record<string, string>; reviewLog: ReviewEntry[] };

const KEY = (partner: string, cell: AttainCell) => `attain:v1:${partner}:${cell.setting}:${cell.category}`;

function loadSession(storageKey: string, cell: AttainCell): SessionState {
  const fallback = (): SessionState => ({ picked: new Set<string>(), plays: {}, readings: {}, reviewLog: [] });
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (!raw) return fallback();
    const s = JSON.parse(raw);
    return {
      picked: new Set<string>(s.picked ?? []),
      plays: Object.fromEntries(Object.entries(s.plays ?? {}).map(([k, v]) => [k, new Set(v as string[])])),
      readings: s.readings ?? {},
      reviewLog: s.reviewLog ?? [],
    };
  } catch {
    return fallback();
  }
}

export default function AttainMatrixPreview() {
  const settings = useMemo(() => Array.from(new Set(ATTAIN_MATRIX.map((c) => c.setting))), []);
  const [setting, setSetting] = useState(settings[0]);
  const categories = useMemo(() => ATTAIN_MATRIX.filter((c) => c.setting === setting), [setting]);
  const [categoryIdx, setCategoryIdx] = useState(0);
  const cell = categories[Math.min(categoryIdx, categories.length - 1)] ?? ATTAIN_MATRIX[0];
  const [chapter, setChapter] = useState<"align" | "plan" | "strategy" | "progress">("align");

  const [partner, setPartner] = useState(() => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("partner") || "Sample Health" : "Sample Health"));
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    u.searchParams.set("partner", partner);
    window.history.replaceState({}, "", u);
  }, [partner]);

  const storageKey = KEY(partner, cell);

  const pill = (active: boolean) =>
    `text-[13px] rounded-full px-3.5 py-1.5 border transition-colors ${active ? "border-[#EA2C00] bg-[#EA2C00] text-white font-semibold" : "border-[#E0D9CE] text-[#3A3A3A] hover:border-[#B4A896]"}`;

  return (
    <div className="min-h-screen bg-[#FDFCFA]">
      {/* switcher bar */}
      <div className="sticky top-0 z-20 bg-[#FDFCFA]/95 backdrop-blur border-b border-[#EFEAE1] px-8 py-4">
        <div className="max-w-[860px] mx-auto">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="text-xs font-semibold text-[#EA2C00] uppercase tracking-widest">Attain</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#8C8C8C]">Partner</span>
              <input value={partner} onChange={(e) => setPartner(e.target.value)} className="w-[150px] bg-transparent border-0 border-b-2 border-[#E0D9CE] rounded-none px-0 pb-0.5 font-abridge text-[16px] text-[#1A1A1A] outline-none transition-colors focus:border-[#EA2C00]" />
              <span className="text-[10px] text-[#B4A896] italic">autosaved</span>
            </div>
            <div className="ml-auto flex items-center gap-1 bg-[#F2EDE5] rounded-full p-1">
              {(["align", "plan", "strategy", "progress"] as const).map((ch) => (
                <button key={ch} type="button" onClick={() => setChapter(ch)} className={`text-[13px] rounded-full px-4 py-1.5 capitalize transition-colors ${chapter === ch ? "bg-white shadow-sm font-semibold text-[#1A1A1A]" : "text-[#8C8C8C]"}`}>{ch}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#8C8C8C]">Setting</span>
              {settings.map((s) => (
                <button key={s} type="button" onClick={() => { setSetting(s); setCategoryIdx(0); }} className={pill(setting === s)}>{s}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#8C8C8C]">Category</span>
              {categories.map((c, i) => (
                <button key={c.category} type="button" onClick={() => setCategoryIdx(i)} className={pill(cell.category === c.category)}>{c.category}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-12">
        {/* keyed by storageKey so switching partner or cell loads that saved session fresh */}
        <AttainSession key={storageKey} storageKey={storageKey} cell={cell} chapter={chapter} />
      </div>
    </div>
  );
}

function AttainSession({ storageKey, cell, chapter }: { storageKey: string; cell: AttainCell; chapter: "align" | "plan" | "strategy" | "progress" }) {
  const initial = useMemo(() => loadSession(storageKey, cell), [storageKey, cell]);
  const [picked, setPicked] = useState<Set<string>>(initial.picked);
  const [plays, setPlays] = useState<Record<string, Set<string>>>(initial.plays);
  const [readings, setReadings] = useState<Record<string, string>>(initial.readings);
  const [reviewLog, setReviewLog] = useState<ReviewEntry[]>(initial.reviewLog);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = {
      picked: Array.from(picked),
      plays: Object.fromEntries(Object.entries(plays).map(([k, v]) => [k, Array.from(v)])),
      readings,
      reviewLog,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(s));
  }, [storageKey, picked, plays, readings, reviewLog]);

  const committed = cell.align.outcomes
    .filter((o) => picked.has(o.id) && o.plays)
    .map((o) => ({ title: o.title, chosen: Array.from(plays[o.id] ?? []) }));

  const logReview = (attain: number) =>
    setReviewLog((l) => [...l, { label: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), attain }]);

  return (
    <>
      {chapter === "align" && <AlignView c={cell.align} settingLabel={cell.setting} categoryLabel={cell.category} picked={picked} setPicked={setPicked} plays={plays} setPlays={setPlays} />}
      {chapter === "plan" && <PlanView c={cell.plan} settingLabel={cell.setting} categoryLabel={cell.category} committed={committed} />}
      {chapter === "strategy" && <StrategyView cell={cell} committed={committed} />}
      {chapter === "progress" && <ProgressView cell={cell} committed={committed} readings={readings} setReadings={setReadings} reviewLog={reviewLog} onLogReview={logReview} />}
    </>
  );
}
